# FlashBack Scripts

Utility scripts for FlashBack deployment and maintenance.

## generate-secrets.sh

Generates cryptographically secure passwords and secrets for production deployment.

### Usage

```bash
./scripts/generate-secrets.sh
```

Or via Makefile:
```bash
make generate-secrets
```

### What it generates

- **PostgreSQL Password** (32 characters) - For database authentication
- **JWT Secret** (64 characters) - For JWT token signing

### Output

The script offers to save credentials to `.env.secrets` file or display them on screen.

### Security Notes

- Uses `/dev/urandom` for cryptographically secure random data
- Generates alphanumeric characters only (A-Z, a-z, 0-9) for compatibility
- `.env.secrets` is automatically excluded from git via `.gitignore`
- Never commit generated secrets to version control

### Example Output

```
=== FlashBack Secrets Generator ===

Generated secure credentials:

----------------------------------------
PostgreSQL Password: aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW7xY9zA
JWT Secret:          aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW7xY9zAbC3dE7fG9hJ2kL4mN6pQ8rS1tU5vW7xY
----------------------------------------

Save to .env.secrets? (y/n)
```

### Integration

After generating secrets:

1. **For Local Database Mode:**
   ```env
   # In .env
   POSTGRES_PASSWORD=<generated_password>
   JWT_SECRET=<generated_secret>
   ```

2. **For External Database Mode:**
   ```env
   # In .env
   EXTERNAL_DB_PASSWORD=<generated_password>
   JWT_SECRET=<generated_secret>
   ```

3. **In Docker Compose:**
   The docker-compose files automatically read these from `.env`

### Production Requirements

The backend enforces these requirements in production mode:

- Database password: minimum 16 characters
- JWT secret: minimum 32 characters
- No default/common passwords allowed

Failing to meet these requirements will prevent the backend from starting.