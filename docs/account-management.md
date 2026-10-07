# Account registration and user management

Implemented against main commit fafb69c. Work-order report generation remains implemented and pending validation; report files are unchanged.

## Setup

1. Install backend requirements and run `alembic upgrade head` from `backend`.
2. Keep Supabase public signup enabled and email confirmation enabled. Add the frontend's `/register` and `/accept-invitation` URLs to Supabase Auth's redirect allowlist.
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally `VITE_API_URL` in the frontend. Existing backend Supabase configuration stays in the backend.
4. Run the backend and frontend. Open `/register`. The user signs up through Supabase, confirms their email, and finishes registration. Non-password form data survives confirmation in the same tab. After returning in a different tab, re-enter the building details.
5. The authenticated registration request derives email and identity from Supabase; the server generates an `ACC-` UUID identifier and assigns the first Admin. Account, Admin and audit event commit together. No authentication identity can register twice.
6. Open Settings or `/users` as an Admin. Create an invitation and share the displayed link with the specified email recipient. This version does not send invitation emails automatically. The recipient signs up or signs in, confirms their email, and accepts at `/accept-invitation`.

## API

| Endpoint | Permission / result |
| --- | --- |
| POST /api/register (alias /api/building-accounts) | Verified Supabase identity without existing COMs membership; creates account and first Admin |
| GET /api/building-accounts | Admin; own account only |
| GET /api/users | Admin, Manager, President, Board Member; own account only |
| POST /api/users/invitations | Admin; email and role; returns token once, seven-day expiry |
| GET /api/users/invitations | Admin; own account; no token hashes or secrets returned |
| DELETE /api/users/invitations/{id} | Admin; revokes unused invitation |
| POST /api/users/invitations/accept | Verified invited email; token, user_name, first_name, last_name |
| PATCH /api/users/{id}/role | Admin; user_role |
| PATCH /api/users/{id}/status | Admin; status Active or Inactive |

Old nested `/api/building_account/api/building-accounts` routes and arbitrary `POST /api/users` identity creation are removed. Clients must use the new onboarding endpoints. Existing account/user records are preserved.

One Supabase identity belongs to one building, matching the existing unique `auth_user_id` model. Invitations do not create users until accepted. They are single-use, can be revoked, expire in seven days, and store only SHA-256 token hashes. The link puts the token in the URL fragment. No platform Super Admin can be assigned through these endpoints.

The last active Admin cannot be demoted or deactivated. Management writes serialize using the building-account row. Deactivation preserves records and historical references; COMs checks the live status on every subsequent authenticated request, including `/api/me`. Supabase login itself remains possible and access to other Supabase services is governed by their own policies. Existing requests already in progress may complete.

User and account operations write audit events in the same transaction as their database changes. Account management is restricted to the authenticated tenant. Report generation remains pending validation.

## Validation

Run `python -m pytest tests -q` from backend after installing pytest. Tests use an isolated database and override Supabase identity validation; they do not send real emails, access the production database, or validate live Supabase confirmation callbacks. Run `npm run build` from frontend. Live confirmation and invitation journeys still need a test on the configured Supabase project.

Known existing issue discovered during validation: `PurchaseOrder` has a malformed `ck_purchase_orders_status_valid` expression containing `status IN (, ...` in `models.py`. Fresh `Base.metadata.create_all()` fails on this unrelated table. This change leaves that constraint untouched and tests only onboarding and its referenced tables.
