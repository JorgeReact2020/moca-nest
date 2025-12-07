# GitHub Secrets Setup Guide

This guide shows you how to configure GitHub Actions secrets for automated secret management during deployment.

## 🎯 Benefits of This Approach

- ✅ **No manual SSH** to update secrets
- ✅ **Centralized management** in GitHub UI
- ✅ **Encrypted at rest** and in transit
- ✅ **Version controlled** deployment process
- ✅ **Audit trail** of who changed what
- ✅ **Easy rotation** - just update in GitHub UI
- ✅ **Free** - no additional AWS costs

## 📝 Setting Up GitHub Secrets

### 1. Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/JorgeReact2020/moca-nest`
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 2. Add Required Secrets

Add each of the following secrets by clicking "New repository secret":

#### HubSpot Configuration

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `HUBSPOT_API_KEY` | Your HubSpot Private App API Key | `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `HUBSPOT_CLIENT_SECRET` | Your HubSpot Webhook Client Secret | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

**How to get these values:**
- Go to HubSpot Settings → Integrations → Private Apps
- Create or select your private app
- Copy the "Access token" as `HUBSPOT_API_KEY`
- Go to Settings → Data Management → Webhooks
- Copy the "Client Secret" as `HUBSPOT_CLIENT_SECRET`

#### Database Configuration

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DB_HOST` | PostgreSQL hostname | `postgres` (for Docker) or `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `moca_user` |
| `DB_PASSWORD` | Database password | `your_secure_password_here` |
| `DB_DATABASE` | Database name | `moca_db` |

#### EC2 Configuration (Already Set Up)

These should already exist from your previous deployment:

| Secret Name | Description |
|------------|-------------|
| `EC2_HOST` | Your EC2 instance public IP or hostname |
| `EC2_USER` | SSH username (usually `ubuntu` or `ec2-user`) |
| `EC2_KEY` | Your EC2 private SSH key (entire contents) |

### 3. Verify Secrets Are Set

After adding all secrets, you should see them listed:

```
✓ HUBSPOT_API_KEY
✓ HUBSPOT_CLIENT_SECRET
✓ DB_HOST
✓ DB_PORT
✓ DB_USERNAME
✓ DB_PASSWORD
✓ DB_DATABASE
✓ EC2_HOST
✓ EC2_USER
✓ EC2_KEY
```

## 🚀 How It Works

### Deployment Flow

1. **You push code** to the `main` branch
2. **GitHub Actions runs**:
   - Runs lint and tests
   - SSH to your EC2 instance
   - **Creates `.env.production` with secrets** from GitHub
   - Pulls latest code
   - Rebuilds and restarts Docker containers
3. **Application starts** with the correct secrets

### What Happens Behind the Scenes

```yaml
# GitHub Actions workflow automatically:
- Retrieves secrets from GitHub Secrets
- SSH to EC2 with encrypted connection
- Creates .env.production file on EC2:

  HUBSPOT_API_KEY=<value from GitHub>
  HUBSPOT_CLIENT_SECRET=<value from GitHub>
  DB_PASSWORD=<value from GitHub>
  # ... etc

- Restarts application with new secrets
```

## 🔄 Updating Secrets

### To Change a Secret (e.g., rotating API keys):

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click on the secret you want to update
3. Click **Update secret**
4. Enter the new value
5. Click **Update secret**
6. **Trigger a new deployment**:
   ```bash
   git commit --allow-empty -m "chore: Rotate secrets"
   git push
   ```

The new secret will be deployed automatically! No SSH needed.

## 🔒 Security Best Practices

### ✅ DO:
- Use GitHub Secrets for all sensitive values
- Rotate secrets regularly (every 90 days)
- Use different secrets for dev/staging/production
- Review GitHub Actions logs (secrets are masked with ***)
- Enable two-factor authentication on GitHub

### ❌ DON'T:
- Never commit secrets to git (`.env.production` is now in `.gitignore`)
- Never echo secrets in scripts (GitHub Actions masks them automatically)
- Don't share secrets via chat or email
- Don't use the same password for database and other services

## 📊 Verifying Deployment

After setting up secrets and pushing code:

1. **Check GitHub Actions**:
   - Go to repository → Actions tab
   - Click on the latest workflow run
   - Verify "deploy" job shows: `✅ .env.production created successfully`

2. **Check EC2 Application**:
   ```bash
   ssh ubuntu@your-ec2-host
   cd ~/moca-hubspot

   # Verify .env.production exists (DON'T cat it - it contains secrets!)
   ls -la .env.production

   # Check if containers are running
   docker ps

   # Check application logs
   docker logs moca-container --tail 50
   ```

3. **Test the webhook endpoint**:
   ```bash
   curl -X POST http://your-ec2-host:3000/webhooks/hubspot \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

## 🆘 Troubleshooting

### Problem: Secrets not being applied

**Solution**: Check GitHub Actions logs for errors in the "deploy" step.

### Problem: Application fails to start after deployment

**Solution**:
```bash
ssh ubuntu@your-ec2-host
cd ~/moca-hubspot
docker logs moca-container
```

Look for environment variable errors.

### Problem: Database connection fails

**Solution**: Verify `DB_HOST` is set to `postgres` (the Docker service name) and not `localhost`.

## 🎉 Benefits Over Manual Secret Management

| Manual Approach | GitHub Secrets Approach |
|----------------|------------------------|
| SSH to server every time | Update in GitHub UI |
| Manual file editing | Automated during deployment |
| No audit trail | Full audit log in GitHub |
| Prone to typos | Copy-paste from GitHub |
| Secrets visible on server | Secrets never logged |
| Difficult to rotate | Update and push |

## 📚 Additional Resources

- [GitHub Actions Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [HubSpot Private Apps](https://developers.hubspot.com/docs/api/private-apps)
- [HubSpot Webhooks](https://developers.hubspot.com/docs/api/webhooks)

---

**Note**: After setting up secrets in GitHub, you can delete the old `.env.production` file from your EC2 server. It will be automatically recreated on the next deployment with the correct values from GitHub Secrets.
