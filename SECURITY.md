# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in FoodRescue Intelligence, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send details to the project maintainer (see repository contact info).
2. **Include**:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgement**: Within 48 hours of your report.
- **Assessment**: We will investigate and assess severity within 1 week.
- **Fix & Disclosure**: A patch will be released, and you will be credited (if desired) in the release notes.

## Security Best Practices for Contributors

1. **Never commit secrets** — API keys, passwords, database URLs, or tokens must never appear in code or git history. Use `.env` files (which are gitignored).
2. **Use environment variables** — All sensitive configuration must be read from environment variables.
3. **Keep dependencies updated** — Regularly check for known vulnerabilities in Python and Node.js packages.
4. **Follow least privilege** — API endpoints should enforce authentication and role-based access control.

## Scope

This policy applies to the FoodRescue Intelligence codebase hosted on GitHub. Third-party services (Supabase, Vercel, etc.) have their own security policies.
