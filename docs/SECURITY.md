# Security Notice

## ⚠️ API Key Exposure Incident

**Date**: 2026-02-17
**Status**: Remediated

### What Happened

ElevenLabs API key was accidentally committed to git history in documentation files:
- `DEPLOY_VERCEL.md` (commit 5e5bd63)
- `QUICKSTART.md` (commit 5e5bd63)

### Immediate Actions Required

🔴 **CRITICAL: Regenerate your ElevenLabs API key immediately**

1. Go to [ElevenLabs Dashboard → API Keys](https://elevenlabs.io/app/settings/api-keys)
2. Delete the compromised key: `<OLD_ROTATED_KEY_REDACTED>` (ending in `...16e791`)
3. Generate a new API key
4. Update your environment variables:
   - Local: Update `.env` file
   - Netlify: Update in Site Settings → Environment Variables
   - Vercel: Update in Project Settings → Environment Variables
5. Redeploy your application

### Remediation Steps Taken

✅ Removed API keys from documentation files
✅ Moved sensitive docs to archive
✅ Created this security notice
⏳ **Still needed**: Regenerate API key (user action required)

### Prevention

Going forward:
- ✅ `.env` is in `.gitignore` (prevents local key exposure)
- ✅ Documentation uses placeholders instead of real keys
- ✅ All keys should be set via environment variables only
- 🔍 Run `git grep "sk_"` before committing to check for keys

### Git History Cleanup (Optional)

If you want to remove the key from git history entirely:

```bash
# WARNING: This rewrites git history and requires force push
# Only do this if the repo is private and you're the only contributor

# Install git-filter-repo
brew install git-filter-repo

# Remove the key from all history
git filter-repo --replace-text <(echo "<OLD_ROTATED_KEY_REDACTED>==>REDACTED_API_KEY")

# Force push (WARNING: destructive operation)
git push origin --force --all
```

**Note**: Since this is a private repo, the immediate risk is low, but the key should still be rotated as a best practice.

## Best Practices

### Never Commit:
- API keys
- Passwords
- Private keys
- Tokens
- Connection strings with credentials

### Always Use:
- Environment variables
- `.env` files (with `.gitignore`)
- Secret management services
- Placeholder text in documentation

### Before Committing:
```bash
# Check for potential secrets
git diff --cached | grep -i "key\|password\|token\|secret"

# Or use a tool like gitleaks
brew install gitleaks
gitleaks detect
```

---

**Last Updated**: 2026-02-17
