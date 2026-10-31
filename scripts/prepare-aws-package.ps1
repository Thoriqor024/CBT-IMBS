param(
  [Parameter(Mandatory = $true)]
  [string]$GitleaksPath,
  [Parameter(Mandatory = $true)]
  [string]$GitleaksArchivePath,
  [Parameter(Mandatory = $true)]
  [string]$GitleaksChecksumPath,
  [Parameter(Mandatory = $true)]
  [string]$GitleaksVersion,
  [Parameter(Mandatory = $true)]
  [string]$OfficialReleaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$OfficialChecksumUrl
)

$ErrorActionPreference = 'Stop'
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$evidenceDirectory = Join-Path $workspace 'docs/plan/2026-10-10-deploy-cbt-aws'
$archiveName = 'cbt-imbs-aws-source-{0}.zip' -f (Get-Date -Format 'yyyyMMddTHHmmssfff')
$archivePath = Join-Path $env:TEMP $archiveName
$extractionPath = Join-Path $env:TEMP ($archiveName + '.extracted')
$reportPath = Join-Path $evidenceDirectory 'gitleaks-report-redacted.json'
$evidencePath = Join-Path $evidenceDirectory 'gitleaks-scan-evidence.txt'
$manifestPath = Join-Path $evidenceDirectory 'source-manifest.tsv'
$archiveChecksumPath = Join-Path $evidenceDirectory 'source-archive.sha256'

foreach ($path in @($archivePath, $extractionPath)) {
  if (Test-Path -LiteralPath $path) {
    throw "Refusing to overwrite existing artifact or evidence: $path"
  }
}

if (-not (Test-Path -LiteralPath $GitleaksPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $GitleaksArchivePath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $GitleaksChecksumPath -PathType Leaf)) {
  throw 'Gitleaks executable, release archive, and official checksum file must exist.'
}
if ($OfficialReleaseUrl -notmatch '^https://github\.com/gitleaks/gitleaks/releases/tag/v[0-9.]+$' -or
    $OfficialChecksumUrl -notmatch '^https://github\.com/gitleaks/gitleaks/releases/download/v[0-9.]+/gitleaks_[0-9.]+_checksums\.txt$') {
  throw 'Gitleaks release and checksum URLs must be the official GitHub release assets.'
}

$archiveItem = Get-Item -LiteralPath $GitleaksArchivePath
$checksumPattern = '^([0-9a-fA-F]{64})\s+\*?' + [regex]::Escape($archiveItem.Name) + '$'
$checksumEntry = Get-Content -LiteralPath $GitleaksChecksumPath | Where-Object {
  $_ -match $checksumPattern
} | Select-Object -First 1
if (-not $checksumEntry) {
  throw 'The official checksum file has no entry for the downloaded Gitleaks archive.'
}
$expectedScannerArchiveHash = ([regex]::Match($checksumEntry, '^[0-9a-fA-F]{64}')).Value.ToLowerInvariant()
$actualScannerArchiveHash = (Get-FileHash -LiteralPath $GitleaksArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualScannerArchiveHash -ne $expectedScannerArchiveHash) {
  throw 'Gitleaks archive SHA-256 does not match the official release checksum.'
}

$scannerDirectory = [System.IO.Path]::GetFullPath((Split-Path -Parent $GitleaksArchivePath))
if ([System.IO.Path]::GetFullPath((Split-Path -Parent $GitleaksPath)) -ne $scannerDirectory) {
  throw 'The scanner executable must be extracted beside its checksum-verified release archive.'
}
$scannerVersionOutput = (& $GitleaksPath version 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $scannerVersionOutput -ne $GitleaksVersion) {
  throw "Expected Gitleaks $GitleaksVersion; executable reported '$scannerVersionOutput'."
}
$scannerExecutableHash = (Get-FileHash -LiteralPath $GitleaksPath -Algorithm SHA256).Hash.ToLowerInvariant()

$blockedDirectories = @(
  '.git', 'backups', 'backup', 'db-dumps', 'database-dumps', 'dumps',
  'node_modules', 'vendor', 'bower_components', 'Pods', '.venv', 'venv',
  'dist', 'build', 'out', 'target', 'coverage', '.next', '.nuxt', '.svelte-kit', '.angular',
  '.cache', '.vite', '.turbo', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
  'logs', 'log', 'tmp', 'temp', 'cert', 'certs', 'certificates', 'ssl', 'acme', 'pki',
  'private', 'docs', '.vscode', '.playwright-mcp'
)
$blockedExtensions = @(
  '.dump', '.backup', '.bak', '.sqlite', '.sqlite3', '.db', '.db3',
  '.pem', '.key', '.p12', '.pfx', '.p7b', '.p7c', '.der', '.crt', '.cer', '.jks', '.keystore', '.pub',
  '.log', '.tmp', '.temp', '.swp', '.swo'
)
$sensitiveNamePattern = '(?i)(^|[._-])(credentials?|secrets?|tokens?|passwords?|passwd|private[-_.]?key|id[_-]?(rsa|ed25519|ecdsa))([._-]|$)'

function Test-ExcludedPath([string]$RelativePath, [bool]$IsDirectory) {
  $segments = $RelativePath -split '/'
  foreach ($segment in $segments) {
    if ($segment -match '(?i)^\.env' -or $blockedDirectories -contains $segment) {
      return $true
    }
  }
  if ($IsDirectory) {
    return $false
  }

  $fileName = [System.IO.Path]::GetFileName($RelativePath)
  $extension = [System.IO.Path]::GetExtension($fileName).ToLowerInvariant()
  if ($fileName -match '(?i)^\.env' -or $fileName -match $sensitiveNamePattern -or
      $blockedExtensions -contains $extension -or
      $fileName -match '(?i)\.sql(\.gz)?$' -and $RelativePath -notmatch '^server/migrations/' -or
      $fileName -match '(?i)\.(dump|backup|bak|sql|sqlite|sqlite3|db)(\.gz)?$' -and
        $fileName -match '(?i)(dump|backup|snapshot|export)') {
    return $true
  }
  if ($fileName -match '(?i)(\.log(\.[0-9]+)?|\.tmp|\.temp|\.swp|\.swo|~)$') {
    return $true
  }
  return $false
}

function Get-RelativePath([string]$BasePath, [string]$TargetPath) {
  $baseUri = [System.Uri]($BasePath.TrimEnd('\') + '\')
  $targetUri = [System.Uri]$TargetPath
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

$directoryStack = [System.Collections.Generic.Stack[string]]::new()
$directoryStack.Push($workspace)
$archiveFiles = [System.Collections.Generic.List[object]]::new()
while ($directoryStack.Count -gt 0) {
  $currentDirectory = $directoryStack.Pop()
  foreach ($entryPath in [System.IO.Directory]::EnumerateFileSystemEntries($currentDirectory)) {
    $entry = Get-Item -LiteralPath $entryPath -Force
    if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      continue
    }
    $relativePath = (Get-RelativePath -BasePath $workspace -TargetPath $entry.FullName).Replace('\', '/')
    if ($entry.PSIsContainer) {
      if (-not (Test-ExcludedPath -RelativePath $relativePath -IsDirectory $true)) {
        $directoryStack.Push($entry.FullName)
      }
    } elseif (-not (Test-ExcludedPath -RelativePath $relativePath -IsDirectory $false)) {
      $archiveFiles.Add([pscustomobject]@{ FullPath = $entry.FullName; RelativePath = $relativePath })
    }
  }
}
if ($archiveFiles.Count -eq 0) {
  throw 'Archive policy selected no files.'
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
try {
  $zip = [System.IO.Compression.ZipArchive]::new($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    foreach ($file in $archiveFiles) {
      $entry = $zip.CreateEntry($file.RelativePath, [System.IO.Compression.CompressionLevel]::Optimal)
      $inputStream = [System.IO.File]::OpenRead($file.FullPath)
      $outputStream = $entry.Open()
      try {
        $inputStream.CopyTo($outputStream)
      } finally {
        $outputStream.Dispose()
        $inputStream.Dispose()
      }
    }
  } finally {
    $zip.Dispose()
  }
} finally {
  $archiveStream.Dispose()
}

New-Item -ItemType Directory -Path $extractionPath | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $extractionPath
$invocation = 'gitleaks detect --source "{0}" --no-git --redact=100 --report-format json --report-path "{1}"' -f $extractionPath, $reportPath
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  & $GitleaksPath detect --source $extractionPath --no-git --redact=100 --report-format json --report-path $reportPath 2>&1 | Out-Null
  $scanExitStatus = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousErrorActionPreference
}
$evidenceLines = @(
  "Gitleaks version: $scannerVersionOutput",
  "Official release: $OfficialReleaseUrl",
  "Official checksum asset: $OfficialChecksumUrl",
  "Verified Gitleaks release archive SHA-256: $actualScannerArchiveHash",
  "Gitleaks executable SHA-256: $scannerExecutableHash",
  "Archive: $archivePath",
  "Clean extraction scanned: $extractionPath",
  "Invocation: $invocation",
  "Exit status: $scanExitStatus",
  'Redaction: 100 percent; report contains no secret values.',
  "Redacted report: $reportPath"
)
[System.IO.File]::WriteAllLines($evidencePath, $evidenceLines, [System.Text.UTF8Encoding]::new($false))
if ($scanExitStatus -ne 0) {
  throw "Gitleaks exited with status $scanExitStatus. Do not transfer; review the redacted report and rebuild/rescan after remediation."
}

$manifestRows = Get-ChildItem -LiteralPath $extractionPath -File -Recurse | ForEach-Object {
  $relativePath = (Get-RelativePath -BasePath $extractionPath -TargetPath $_.FullName).Replace('\', '/')
  $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [pscustomobject]@{ RelativePath = $relativePath; Line = "$hash`t$relativePath" }
} | Sort-Object -Property RelativePath -CaseSensitive
$manifestLines = @("sha256`tpath") + @($manifestRows | ForEach-Object { $_.Line })
[System.IO.File]::WriteAllLines($manifestPath, $manifestLines, [System.Text.UTF8Encoding]::new($false))
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText($archiveChecksumPath, "$archiveHash  $archiveName`n", [System.Text.UTF8Encoding]::new($false))
Add-Content -LiteralPath $evidencePath -Value @(
  "Archive SHA-256: $archiveHash",
  "Manifest: $manifestPath",
  "Archived file count: $($manifestRows.Count)"
) -Encoding utf8
Remove-Item -LiteralPath $extractionPath -Recurse -Force

"Archive: $archivePath"
"Gitleaks: $scannerVersionOutput; exit status $scanExitStatus"
"Manifest: $manifestPath"
"Archive SHA-256 file: $archiveChecksumPath"
"Redacted scan report: $reportPath"