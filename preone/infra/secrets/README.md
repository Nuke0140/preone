# `infra/secrets/` — Secrets directory (gitignored)

This directory is intended for local-dev secret files that should **never** be committed.

Files placed here are automatically ignored by `.gitignore`:

```
secrets/
infra/secrets/
```

## Intended Use

Local-dev only. Place files such as:

- `jwt-private.pem` — RSA private key for JWT signing (see `apps/api/.env.example` for generation instructions)
- `jwt-public.pem` — RSA public key for JWT verification
- `service-account.json` — GCP service account credentials (if using GCP)
- `aws-credentials` — AWS credentials file (if using local AWS profile)

## Loading into the App

For local dev, reference these files from your `.env`:

```bash
# .env (gitignored)
JWT_ACCESS_PRIVATE_KEY=$(cat infra/secrets/jwt-private.pem)
JWT_ACCESS_PUBLIC_KEY=$(cat infra/secrets/jwt-public.pem)
```

Or paste the PEM contents directly into the env vars (with `\n` escapes).

## Production

**Never** copy production secrets into this directory. Production secrets must be
injected via the runtime environment:

- Kubernetes Secrets (mounted as env vars or files)
- AWS Secrets Manager / Parameter Store
- HashiCorp Vault

## Verification

Confirm a file is gitignored before placing it here:

```bash
git check-ignore -v infra/secrets/my-secret.pem
# Should print: .gitignore:77:infra/secrets/  infra/secrets/my-secret.pem
```
