# CBT IMBS AWS Deployment To-do

Plan ID: `2026-10-10-deploy-cbt-aws`  
Last updated: 2026-10-10  
Formal plan and acceptance criteria: [plan.yaml](plan.yaml)

Use `[x]` only when evidence has been checked. Do not put passwords, MFA codes, access keys, session tokens, or presigned URLs in this file, chat, or screenshots.

## Status

- Preparation and archive scan: **Done**
- Private transfer, EC2 checksum, and temporary S3 cleanup: **Done**
- SSH policy revision: **Approved in plan; AWS rules not changed**
- Independent review: **Blocked** pending current IP and complete attached-security-group evidence
- AWS deployment: **Not started**
- External HTTPS/runtime verification: **Not started**

## Completed

- [x] Create AWS-only Compose, Nginx, and Caddy configuration; preserve the school LAN stack.
- [x] Validate Compose: only Caddy publishes host ports 80 and 443; database, API, frontend, and Prometheus have no host-published ports.
- [x] Create the explicit source archive policy, scan a clean extraction with Gitleaks 8.30.1 (`--no-git`, `--redact=100`), and retain the zero-finding report, 61-file manifest, and archive SHA-256.
- [x] Transfer the exact archive through the private S3 presigned-URL route; EC2 `sha256sum -c` returned `OK` for SHA-256 `a15b85e077d3d1e09d91abcc6d5cedae2228981ec01e4803bb8e2c34b274f5d2`.
- [x] Delete the temporary S3 object and bucket, as confirmed by the user. Keep `/tmp/cbt-imbs-aws-source.zip` on EC2.
- [x] Revise the written SSH policy: allow TCP/22 only from the user's current IPv4 `/32` plus AWS's regional `com.amazonaws.ap-southeast-2.ec2-instance-connect` prefix list. Never allow SSH from `0.0.0.0/0`.
- [x] Independent reviewer accepted the revised SSH policy; the overall review is still blocked by the evidence items below.

## Gate 1: Network Evidence And Review

- [ ] Google sign-in is rejected in the integrated browser because Google reports that the browser does not support JavaScript. Use the regular browser where Google/Builder ID already works, open the AWS console through the same saved access portal, then share the authenticated console tab or send redacted screenshots. Do not share sign-in callback URLs or OAuth query parameters. The supplied `https://us-east-1.sso.signin.aws/` returned AWS 404; the observed callback host `us-east-1.signin.aws` is not itself a confirmed portal URL. Do not add speculative hosts to the allowlist.
- [x] Current IP evidence: the AWS Builder ID signed-in-device screenshot shows `103.28.113.201`, matching the security-group rule `103.28.113.201/32`. The screenshot also confirms Builder ID authentication uses Google.
- [ ] Reconfirm your public IPv4 immediately before deployment, from the same network used for SSH. On your Windows machine, run `Invoke-RestMethod https://checkip.amazonaws.com`; compare its result with the security-group SSH `/32`. IPs can change, and earlier evidence showed `103.28.131.201/32`.
- [ ] In EC2, open `cbt-imbs-test` -> **Security** and record every attached security-group ID. Send a screenshot of that attachment list.
- [ ] For every attached security group, capture the complete **Inbound rules** and **Outbound rules** tables. Include IPv4 and IPv6 rules; do not crop off sources, destinations, or rule rows.
- [ ] Confirm across all groups: SSH/TCP 22 sources are only the reconfirmed user `/32` and the regional EC2 Instance Connect prefix list; no IPv4/IPv6 public SSH rule exists; database/API/Prometheus ports 5432/3000/9090 are not public. HTTP/HTTPS (80/443) should be added only at the deployment step after runtime configuration is ready.
- [ ] Review the shown all-protocol/all-port egress rule to `0.0.0.0/0` on the complete set of groups. Document why it is needed for package/image downloads and certificate issuance, or narrow it only after confirming required DNS, HTTPS, and application flows.
- [ ] Re-run the independent security/architecture review against the exact current rules and confirm no critical/high blocker remains. Do not deploy before approval.

## Gate 2: EC2 And Cost Preflight

- [ ] In the AWS console, verify the instance is `running`, status checks are healthy, and identify its current public IPv4. Do not assume the prior address is still assigned.
- [ ] Verify root disk size, instance type, attached security groups, and current monthly budget/actual spend. Existing planning notes say `t3.small`, 20 GiB, and a `$30/month` budget with an 80% actual alert; re-check rather than assume.
- [ ] Form the free hostname from the current IPv4 using nip.io: `<current-ip>.nip.io`. Confirm it resolves to this instance before claiming an access URL. Do not purchase a domain, reserve a paid IP, or create other unapproved billable resources.
- [ ] Confirm the EC2 archive remains present and its SHA-256 still matches the recorded value. Do not re-transfer it or copy local `.env` files, backups, dumps, or school LAN data.

## Gate 3: Secure Runtime Configuration

Run the following in the EC2 Instance Connect shell after review approval. Replace placeholders only in the private EC2 shell; never send secret values in chat or screenshots.

1. Extract into an AWS-only directory and keep the LAN stack untouched:

   ```bash
   mkdir -p "$HOME/cbt-imbs-aws"
   unzip -q /tmp/cbt-imbs-aws-source.zip -d "$HOME/cbt-imbs-aws"
   cd "$HOME/cbt-imbs-aws"
   ```

2. Create an owner-only runtime configuration directory/file. Use the current IP from the EC2 console to form `<current-ip>.nip.io`. Choose and save admin/teacher bootstrap passwords in your own password manager; enter them silently in the EC2 shell. Each must be at least 24 characters and must not be `admin123` or `guru123`.

   ```bash
   install -d -m 700 "$HOME/.config/cbt-imbs-aws"
   umask 077
   read -r -p 'AWS hostname (<current-ip>.nip.io): ' AWS_HOSTNAME
   read -r -s -p 'New admin bootstrap password (24+ chars): ' SEED_ADMIN_PASSWORD; printf '\n'
   read -r -s -p 'New teacher bootstrap password (24+ chars): ' SEED_TEACHER_PASSWORD; printf '\n'
   {
     printf 'AWS_HOSTNAME=%s\n' "$AWS_HOSTNAME"
     printf 'PUBLIC_BASE_URL=https://%s\n' "$AWS_HOSTNAME"
     printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 32)"
     printf 'SESSION_SECRET=%s\n' "$(openssl rand -hex 48)"
     printf 'SEED_ADMIN_PASSWORD=%s\n' "$SEED_ADMIN_PASSWORD"
     printf 'SEED_TEACHER_PASSWORD=%s\n' "$SEED_TEACHER_PASSWORD"
   } > "$HOME/.config/cbt-imbs-aws/runtime.env"
   chmod 600 "$HOME/.config/cbt-imbs-aws/runtime.env"
   unset AWS_HOSTNAME SEED_ADMIN_PASSWORD SEED_TEACHER_PASSWORD
   ```

3. Verify file permissions without displaying contents, then validate Compose without starting containers:

   ```bash
   stat -c '%a %U %n' "$HOME/.config/cbt-imbs-aws/runtime.env"
   docker compose --env-file "$HOME/.config/cbt-imbs-aws/runtime.env" -f deploy/aws/compose.yaml config --quiet
   ```

   Expected permission is `600`, owned by the EC2 login user. Never run `cat`, `env`, or `docker compose config` without `--quiet` on the runtime env, because that could expose secret values.

## Gate 4: Deploy The Isolated Stack

- [ ] Only after Gate 1 is approved and the runtime file/config validation passes, add inbound TCP 80 and 443 for the public web edge. Keep SSH limited to the approved `/32` and EIC prefix list; do not open 5432/3000/9090.
- [ ] Start the AWS-only project from the extracted source directory:

  ```bash
  docker compose --env-file "$HOME/.config/cbt-imbs-aws/runtime.env" -f deploy/aws/compose.yaml up -d --build
  ```

- [ ] Check `docker compose ps`; wait for DB, API, frontend, and Caddy health/readiness. Inspect logs locally for errors, but redact them before sharing and check that no secret values appear.
- [ ] Confirm named volumes are the AWS-specific `cbt-imbs-aws-pgdata`, `cbt-imbs-aws-uploads`, `cbt-imbs-aws-caddy-data`, and `cbt-imbs-aws-caddy-config`. Confirm no LAN volume or backup was mounted/imported.
- [ ] Confirm the internal API health endpoint `/api/health` succeeds through the HTTPS edge; confirm admin/teacher demo passwords are rotated and frontend demo-account hints are disabled.
- [ ] From a non-EC2 network, verify nip.io DNS, HTTP-to-HTTPS redirect, trusted Caddy certificate, login page rendering, and same-origin API health. Do not enter credentials in shared browser tooling or claim login/exam workflows passed unless separately tested.
- [ ] Test persistence with a controlled container recreation/stop-start and verify database and uploads remain. Never run `docker compose down -v`; do not stop or alter the school LAN stack.
- [ ] Record deployment time, instance/address/hostname, disk, all security-group exposure, volume names, container health, HTTPS/API results, budget and current cost. Keep secrets out of notes.

## Gate 5: Rollback And Final Report

- [ ] If startup, health, or TLS checks fail, keep the URL unpublished. Stop the AWS Compose services if necessary, preserve named volumes for diagnosis, and remove public 80/443 ingress if the edge is not serving safely. Do not delete data volumes or modify the LAN deployment.
- [ ] Mark each check PASS, FAIL, or NOT RUN in this file and update matching task states in `plan.yaml`.
- [ ] Report the current URL only after external DNS, trusted TLS, and HTTPS app reachability pass. State cost/resource evidence and limitations: nip.io/IP dependency, no LAN data migration, and any untested authenticated or exam workflow.

## Current Blockers

1. The EC2 instance's complete attached-security-group list and every group's inbound/outbound rules are not yet evidenced.
2. Recheck the currently confirmed user `/32` immediately before deployment because public IPs can change.
3. The all-traffic IPv4 egress rule needs an explicit necessity assessment.
4. Google sign-in is rejected in the integrated browser as unsupported JavaScript; use the regular browser's authenticated AWS console session and share the console tab or redacted evidence. The supplied `us-east-1.sso.signin.aws` URL returned 404; do not reuse the OAuth callback URL as a portal link.
5. The independent review must approve the complete current network evidence before any deployment action.
