# Supabase Auth Manual Steps: Access Token Hook, Rate Limits, and Signups

This guide documents the manual configuration needed in the Supabase Dashboard to complete the auth setup.

## Prerequisites
- Schema migration applied from `supabase_auth_schema_migration.sql`.
  - Access token hook function created as: `public.custom_access_token_hook(event jsonb) RETURNS jsonb`.
  - Grants included:
    - `GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;`
    - `GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;`
    - RLS policy: "Allow auth admin to read user roles" on `public.user_roles`.

## 1) Register the Access Token Hook
1. In the Supabase Dashboard, go to: Authentication → Hooks.
2. Enable "Access token hook".
3. Choose "SQL function" and set the function to: `public.custom_access_token_hook`.
4. Save.

Expected behavior:
- On token issue/refresh, the hook sets claims:
  - `user_role`: one of the roles found; currently `admin`.
  - `is_admin`: `true` when the user has an active `admin` role, otherwise `false`.

Function reference (from migration):
- Name: `public.custom_access_token_hook(event jsonb) RETURNS jsonb`
- Reads role from `public.user_roles` and injects claims `user_role` and `is_admin`.

## 2) Configure Auth Rate Limits (baseline recommendations)
Adjust to your environment and security posture.
- Sign-in (per IP): 10 per minute (baseline to deter brute force).
- OTP / Magic Link sends (per email): 5 per hour.
- Token refresh (per user): 60 per minute.
- Password reset (per email): 3 per hour.

Where to configure:
- Authentication → Settings → Rate Limits.

Notes:
- If you experience 429s during development, temporarily relax limits and restore before production cutover.

## 3) Disable Public Signups (required)
We disallow open registration per acceptance criteria.
1. Authentication → Providers → Email.
2. Uncheck/disable "Enable new user signups" (or equivalent toggle).
3. Save.

## 4) Verify Claims and Role Flow
- Create/ensure an initial admin role for your admin user (via `initial_admin_setup.sql` or `public.assign_admin_role(uuid)` after logging in as an admin).
- Sign in as that user and retrieve the access token. Options:
  - In the app: `await supabase.auth.getSession()` then decode `session.access_token` on jwt.io to verify `user_role` and `is_admin: true`.
- SQL sanity checks (run in SQL Editor):
  - `SELECT * FROM public.user_roles WHERE user_id = '...';`
  - `SELECT * FROM public.admin_profiles WHERE user_id = '...';`

Troubleshooting:
- If `user_role`/`is_admin` claims are missing:
  - Re-check that the hook is enabled and points to `public.custom_access_token_hook`.
  - Ensure the policy "Allow auth admin to read user roles" exists on `public.user_roles`.
  - Verify grants: `supabase_auth_admin` can `EXECUTE` the hook and `SELECT` from `public.user_roles`.
  - Confirm the function signature exactly matches `public.custom_access_token_hook(event jsonb)`.

## References
- Migration file: `supabase_auth_schema_migration.sql`
- Hook function: `public.custom_access_token_hook(event jsonb)`
- Helper: `public.is_admin()` returns a boolean from JWT claims.
