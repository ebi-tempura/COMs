# COMs changelog

User-visible changes are recorded here. Git commits retain the detailed implementation history.

## Unreleased

Add new changes under Added, Changed, Fixed, or Removed as work is completed.
Record schema changes and required configuration separately under Deployment notes.

## 0.1.0-beta.1 — Draft

Proposed first versioned deployment baseline. No release tag or published release has been created by this document.

### Included in the baseline

- Work orders, including normal and emergency workflows and completion reviews.
- Supplier and purchase-order approval workflows.
- Private attachments, audit history, and tenant-based access controls.
- Supabase authentication, account registration, and invitations.
- In-app notifications and an email delivery worker.

These are existing project capabilities, not claims that every workflow was retested on the public deployment.

### Deployment milestone — 2026-11-03

- Installed Ubuntu alongside macOS on the hosting computer.
- Configured the FastAPI API, email worker, Nginx, and Cloudflare Tunnel as background services.
- Served the React production build through the public HTTPS domain.
- Confirmed public login and account loading from a phone.

### Fix to reconcile before tagging

The hosting checkout received an AuthContext.jsx fix for an initial signed-out session being ignored:
`if (sameUser && sameToken)` became
`if (currentSession !== undefined && sameUser && sameToken)`.
Bring this fix into the development branch and verify it before making the first release tag.
This documentation PR does not apply that code fix.

### Validation still required before release

- Public work-order creation, approval, completion, and notification delivery.
- Supplier and purchase-order checks, including attachment upload and download.
- Tenant isolation and role restrictions on the deployed version.
- Invitation, confirmation, and password-reset links using production URLs.
- Automatic startup and public access after reboot.
- Review the npm audit findings reported during deployment; do not use a forced dependency upgrade without review.
- Confirm a recoverable database backup process before accepting real building data.

### Deployment notes

- The frontend requires its own environment configuration and a production build.
- The backend environment file must be configured separately and kept out of Git.
- The tunnel origin uses HTTP on loopback; the public website uses HTTPS.
- Source control does not back up the database, uploaded files, or environment secrets.
