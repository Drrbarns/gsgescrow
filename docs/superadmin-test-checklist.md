# Superadmin Control Plane QA Checklist

## Access and Roles
- [ ] User with `superadmin` role can open `/admin`.
- [ ] User with `admin` role can open `/admin` but cannot start impersonation.
- [ ] Non-admin roles are denied on `/admin` pages and sensitive APIs.

## User Directory
- [ ] `/admin/users` lists buyers, sellers, admins, and superadmins.
- [ ] Search by full name and phone works.
- [ ] Role filter works (`buyer`, `seller`, `admin`, `superadmin`).
- [ ] User detail dialog loads aggregates and linked entities.

## Secure Impersonation
- [ ] Superadmin can start impersonation with required reason.
- [ ] Impersonation token is stored and injected in API requests.
- [ ] Header banner appears with active impersonation context.
- [ ] `Return to Superadmin` ends impersonation and restores session context.
- [ ] Attempt to impersonate another superadmin is blocked.

## Global Visibility
- [ ] Superadmin/admin can list all transactions across accounts.
- [ ] Superadmin/admin can list all disputes and payouts.
- [ ] Review moderation endpoints are accessible to privileged roles.
- [ ] Admin dashboard KPI data loads without role-scoped restrictions.

## Ops and Analytics
- [ ] Saved views can be created and loaded in transactions page.
- [ ] Bulk actions execute on selected transactions.
- [ ] Alert rules list and toggle correctly.
- [ ] Alert events list and acknowledgment work.
- [ ] Export jobs can be created and listed.
- [ ] Analytics overview returns GMV, escrow-held, dispute and payout failure metrics.

## Security and Audit
- [ ] Sensitive endpoints are rate-limited.
- [ ] Starting/stopping impersonation writes audit logs.
- [ ] Role changes write audit logs with before/after state.
- [ ] Fraud score overrides and case notes are audit logged.
