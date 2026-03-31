# Secrets and configuration

- **Never commit** real database URLs, API keys, or passwords. Use environment variables only.
- **MongoDB:** Set `MONGODB_URI` in your host’s secret store (e.g. [Replit Secrets](https://docs.replit.com/programming-ide/storing-sensitive-information-environment-variables), GitHub Actions [secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions), `.env` locally and keep `.env` gitignored).
- **If a credential was ever committed:** rotate it in MongoDB Atlas (or your provider) and update the secret everywhere it is used. Historical commits may still contain old values.

The API reads `MONGODB_URI` from the environment at startup (`lib/db`).
