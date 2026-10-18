# Security Policy

ChipKili is a private personal project. It is not a public service with a security team, so reports are handled directly by the repository owner.

## Reporting a vulnerability

Report suspected issues privately through GitHub private vulnerability reporting on this repository (Security tab, then "Report a vulnerability"). Do not open a public issue, pull request, or post for a security problem.

## Secrets

Secrets live only in server environment files on the hosts that run the site. They are never committed to git, never pasted into issues or pull requests, and never printed in logs. The example file lists variable names only.

## Dependencies

Dependencies are checked in two places. The CI workflow runs npm audit against production dependencies and fails on high or critical findings. Dependabot opens update pull requests for npm packages and GitHub Actions on a weekly schedule.
