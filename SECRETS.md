# Secrets Management

> **⚠️ DEPRECATED**: This manual approach is no longer recommended.
>
> **Use GitHub Secrets instead!** See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for the automated approach.

## Why GitHub Secrets Are Better

The manual SSH approach described below has been replaced with **GitHub Actions Secret Management**:

- ✅ No manual SSH needed to update secrets
- ✅ Secrets managed centrally in GitHub UI
- ✅ Automatic deployment with secret injection
- ✅ Full audit trail
- ✅ Easy secret rotation

**For the new automated approach, see:** [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)

---

## Legacy Manual Approach (Not Recommended)

<details>
<summary>Click to expand old manual instructions</summary>

# Setting Up Production Secrets (Old Manual Method)

## ⚠️ IMPORTANT: Never commit real secrets to git!

### Local Development

1. Copy the example file:
   ```bash
   cp .env.production.example .env.production
   ```

2. Edit `.env.production` and add your real credentials:
   - `HUBSPOT_API_KEY`: Your HubSpot private app API key
   - `HUBSPOT_WEBHOOK_SECRET`: Your HubSpot webhook secret
   - `DB_PASSWORD`: Your production database password

### Production (EC2)

On your EC2 instance, create `.env.production` manually with real credentials:

```bash
cd ~/moca-hubspot
nano .env.production
# Paste your real credentials
```

The file `.env.production` is in `.gitignore` and will never be committed to git.

## Getting HubSpot Credentials

1. Go to HubSpot Settings → Integrations → Private Apps
2. Create a new private app with required scopes
3. Copy the API key to `HUBSPOT_API_KEY`
4. Go to Settings → Integrations → Webhooks
5. Create webhook subscription
6. Copy the webhook secret to `HUBSPOT_WEBHOOK_SECRET`

</details>
