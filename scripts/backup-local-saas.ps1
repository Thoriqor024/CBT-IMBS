$ErrorActionPreference = 'Stop'

$apiContainer = 'cbt-imbs-api'
$dbContainer = 'cbt-imbs-db'
$backupRoot = Join-Path $env:LOCALAPPDATA 'CBT-IMBS\recovery'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupName = "${stamp}_local_saas"
$stagingPath = Join-Path $backupRoot "$backupName.inprogress"
$finalPath = Join-Path $backupRoot $backupName
$apiWasRunning = $false
$apiStopped = $false

function Invoke-Docker([string[]]$Arguments) {
  $output = & docker @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')`n$($output -join "`n")"
  }
  return ($output -join "`n").Trim()
}

function Invoke-Psql([string]$Database, [string]$Sql) {
  Invoke-Docker @('exec', $dbContainer, 'psql', '-U', 'cbt', '-d', $Database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', $Sql)
}

if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is not available.' }
if ((Test-Path $stagingPath) -or (Test-Path $finalPath)) { throw 'The unique recovery destination already exists; refusing to overwrite it.' }
if ((Invoke-Docker @('inspect', '--format', '{{.State.Health.Status}}', $dbContainer)) -ne 'healthy') {
  throw 'PostgreSQL container is not healthy.'
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingPath | Out-Null
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $stagingPath '/inheritance:r' '/grant:r' "${currentUser}:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict recovery folder permissions.' }

try {
  $apiWasRunning = (Invoke-Docker @('inspect', '--format', '{{.State.Status}}', $apiContainer)) -eq 'running'
  if ($apiWasRunning) {
    Invoke-Docker @('stop', '--time', '30', $apiContainer) | Out-Null
    $apiStopped = $true
  }

  $tenantOutput = Invoke-Psql 'cbt_control_plane' 'SELECT database_name FROM control_plane.tenants ORDER BY database_name'
  $tenantDatabases = @($tenantOutput -split "`r?`n" | Where-Object { $_ })
  foreach ($database in $tenantDatabases) {
    if ($database -notmatch '^cbt_t_[0-9a-f]{32}$') { throw 'Control-plane contains an unexpected tenant database identifier; refusing backup.' }
  }

  $databases = @('cbt_imbs', 'cbt_control_plane') + $tenantDatabases
  $databaseManifest = @()
  $index = 0
  foreach ($database in $databases) {
    $index++
    $dumpName = 'database-{0:D2}.dump' -f $index
    $containerDump = "/tmp/$backupName-$dumpName"
    Invoke-Docker @('exec', $dbContainer, 'pg_dump', '-U', 'cbt', '-Fc', '-f', $containerDump, $database) | Out-Null
    Invoke-Docker @('exec', $dbContainer, 'pg_restore', '--list', $containerDump) | Out-Null
    Invoke-Docker @('cp', "${dbContainer}:$containerDump", (Join-Path $stagingPath $dumpName)) | Out-Null
    Invoke-Docker @('exec', $dbContainer, 'rm', '-f', $containerDump) | Out-Null

    $tableOutput = Invoke-Psql $database "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    $tables = @($tableOutput -split "`r?`n" | Where-Object { $_ })
    $tableCounts = [ordered]@{}
    foreach ($table in $tables) {
      if ($table -notmatch '^[a-zA-Z_][a-zA-Z0-9_]*$') { throw 'Unexpected public table identifier; refusing backup manifest.' }
      $count = Invoke-Psql $database "SELECT count(*) FROM public.`"$table`""
      $tableCounts[$table] = [long]$count
    }
    $databaseManifest += [ordered]@{ name = $database; dump = $dumpName; tableCounts = $tableCounts }
  }

  $globalsName = 'postgres-globals.sql'
  $containerGlobals = "/tmp/$backupName-$globalsName"
  Invoke-Docker @('exec', $dbContainer, 'pg_dumpall', '-U', 'cbt', '--globals-only', '-f', $containerGlobals) | Out-Null
  Invoke-Docker @('cp', "${dbContainer}:$containerGlobals", (Join-Path $stagingPath $globalsName)) | Out-Null
  Invoke-Docker @('exec', $dbContainer, 'rm', '-f', $containerGlobals) | Out-Null

  $mediaPath = Join-Path $stagingPath 'question-media'
  New-Item -ItemType Directory -Path $mediaPath | Out-Null
  Invoke-Docker @('cp', "${apiContainer}:/app/uploads/question-media/.", $mediaPath) | Out-Null
  Invoke-Docker @('cp', "${apiContainer}:/run/secrets/tenant_master.key", (Join-Path $stagingPath 'tenant_master.key')) | Out-Null
  if ((Get-Item (Join-Path $stagingPath 'tenant_master.key')).Length -ne 32) {
    throw 'Tenant master key backup is not exactly 32 bytes.'
  }

  $mediaFiles = @(Get-ChildItem -File -Recurse $mediaPath)
  $fileManifest = @(Get-ChildItem -File -Recurse $stagingPath | Sort-Object FullName | ForEach-Object {
    [ordered]@{
      path = $_.FullName.Substring($stagingPath.Length).TrimStart('\')
      length = $_.Length
      sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    }
  })
  $manifest = [ordered]@{
    formatVersion = 1
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    postgresVersion = Invoke-Psql 'postgres' 'SHOW server_version'
    databases = $databaseManifest
    globals = $globalsName
    mediaFiles = $mediaFiles.Count
    mediaBytes = [long](($mediaFiles | Measure-Object -Property Length -Sum).Sum)
    files = $fileManifest
  }
  $manifest | ConvertTo-Json -Depth 12 | Set-Content -Path (Join-Path $stagingPath 'manifest.json') -Encoding UTF8
  Move-Item -LiteralPath $stagingPath -Destination $finalPath
} finally {
  if ($apiStopped) {
    Invoke-Docker @('start', $apiContainer) | Out-Null
  }
}

Write-Output "Verified local SaaS recovery point created: $finalPath"
Write-Output "Databases: $($databaseManifest.Count); media files: $($manifest.mediaFiles); media bytes: $($manifest.mediaBytes)"