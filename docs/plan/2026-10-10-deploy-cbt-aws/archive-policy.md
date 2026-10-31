# AWS Source Archive Policy

This policy is authoritative for `scripts/prepare-aws-package.ps1`. `.dockerignore`
is a Docker build-context file and is not used to decide archive contents.

The archive is built from the workspace after pruning directories and excluding
matching file names. Only files surviving every rule are opened and copied.
Reparse points and symbolic links are excluded rather than followed.

Exclude:

- Every `.git` directory at any depth, including all repository history.
- Every path component or file name beginning with `.env`, including example and
  variant files.
- Names identifying credentials, secrets, tokens, passwords, private keys, or
  SSH private keys; key, certificate, keystore, and private-key file formats.
- Backup, database-dump, database, and SQLite files; backup/dump directories and
  SQL/SQL.GZ files outside `server/migrations`, plus dump/export/snapshot SQL
  filenames. Application migration SQL remains eligible.
- Installed dependencies: `node_modules`, `vendor`, `bower_components`, `Pods`,
  `.venv`, and `venv`.
- Generated/build output: `dist`, `build`, `out`, `target`, `coverage`, `.next`,
  `.nuxt`, `.svelte-kit`, and `.angular`.
- Caches: `.cache`, `.vite`, `.turbo`, `__pycache__`, `.pytest_cache`,
  `.mypy_cache`, and `.ruff_cache`.
- Logs, temporary files, editor swap files, generated certificates, TLS/PKI
  material, and ACME state.
- `backups`, `docs`, `.vscode`, and `.playwright-mcp`; these are not required to
  build or run the application, and excluding `docs` prevents evidence from being
  nested in the source archive.

After creation, extract the exact archive into a newly created empty TEMP
directory. Run Gitleaks against that extraction with `detect --no-git --redact=100`.
Only a zero exit status permits creation of the final archive manifest and checksum.
If any finding occurs, do not transfer the archive; revise the explicit policy,
rebuild a new archive, and rescan it.

The public hostname assumption is a free nip.io name mapping to the instance's
current public IPv4 address. No paid domain, DNS updater, or paid resource is
assumed; the hostname changes if AWS assigns a different public IPv4.