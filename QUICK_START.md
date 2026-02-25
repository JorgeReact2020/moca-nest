# 🚀 Quick Start: GitHub Secrets Setup

## What Just Changed?

**Before** (Manual SSH Method):
```
You push code → GitHub Actions deploys → You SSH to EC2 → Manually edit .env.production
❌ Time consuming
❌ Error prone
❌ No audit trail
```

**Now** (Automated GitHub Secrets):
```
You push code → GitHub Actions deploys → Secrets auto-injected → Done! ✅
✅ No SSH needed
✅ Centralized management
✅ Full audit trail
```

## 🎯 Next Steps (5 minutes)

### 1. Add Secrets to GitHub (One Time Setup)

Go to: `https://github.com/JorgeReact2020/moca-nest/settings/secrets/actions`

Click **"New repository secret"** for each:

```
Secret Name: HUBSPOT_API_KEY
Value: [Your HubSpot Private App API key]

Secret Name: HUBSPOT_CLIENT_SECRET  
Value: [Your HubSpot Webhook Secret]

Secret Name: MOCA_API_KEY
Value: [Your Moca API key]

Secret Name: APP_ID
Value: [Your application ID]
```

### 2. Trigger Deployment

```bash
# Any push to main will now deploy with secrets
git commit --allow-empty -m "chore: Deploy with GitHub secrets"
git push
```

### 3. Watch It Work

1. Go to: `https://github.com/JorgeReact2020/moca-nest/actions`
2. Click on the latest workflow run
3. Watch the "deploy" step - you'll see:
   ```
   ✅ .env.production created successfully
   ```

### 4. Verify on EC2

```bash
ssh ubuntu@your-ec2-host
cd ~/moca-hubspot
docker ps  # Should show running containers
docker logs moca-container --tail 20
```

## 🔄 To Update a Secret Later

1. Go to GitHub repository → Settings → Secrets
2. Click the secret name
3. Click "Update secret"
4. Enter new value
5. Push any commit to trigger redeployment

**That's it!** No SSH needed.

## 📚 Full Documentation

- **Setup Guide**: [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)
- **Old Manual Method**: [SECRETS.md](./SECRETS.md) (deprecated)

## ⚡ Benefits

| Feature | Manual Method | GitHub Secrets |
|---------|--------------|----------------|
| Update secrets | SSH + edit file | Update in GitHub UI |
| Time to update | ~5 minutes | ~30 seconds |
| Audit trail | None | Full GitHub audit log |
| Risk of typos | High | Low (copy-paste) |
| Secret visibility | Visible on server | Masked in logs |
| Team access | Share SSH key 😱 | GitHub permissions |

---

**Questions?** See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for detailed instructions.
