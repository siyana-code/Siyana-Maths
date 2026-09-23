# Domain Setup — `siyanamaths.dev`

**Status:** Domain registered; DNS and application deployment not yet configured
**Registrar:** Name.com
**Last checked:** 2026-09-24

## Current state

- `siyanamaths.dev` is registered through Name.com.
- The domain is intended to be the production website address.
- DNS changes must wait until the Vercel frontend project exists and Vercel displays the authoritative records.
- The API will use a separate subdomain such as `api.siyanamaths.dev`; do not point the API subdomain at Vercel.

## Important `.dev` requirement

`.dev` domains require HTTPS. Do not publish the site with an HTTP-only configuration. Vercel and Render must provide valid TLS certificates before the domain is considered live.

## Target records

The exact records must be confirmed against the Vercel and Render dashboards. The usual target is:

| Host | Type | Target |
|---|---|---|
| `@` | A | Vercel's displayed apex address, commonly `76.76.21.21` |
| `www` | CNAME | Vercel's displayed target, commonly `cname.vercel-dns.com` |
| `api` | CNAME | The exact Render custom-domain target shown by Render |

Do not copy the example targets blindly if Vercel or Render displays a different value. Remove conflicting parking, forwarding, A, AAAA, or CNAME records for the same host before adding the production records.

## Name.com DNS procedure

1. Sign in to the Name.com account that owns `siyanamaths.dev`.
2. Open **Domain List** → `siyanamaths.dev` → **Advanced DNS**.
3. Keep the current Name.com nameservers unless Vercel explicitly asks you to change them.
4. Add the Vercel apex record for `@`.
5. Add the Vercel `www` CNAME record.
6. Remove Name.com parking or URL-forwarding records that conflict.
7. Save the records and wait for DNS propagation.
8. Add the Render-provided CNAME for `api.siyanamaths.dev` only after the Render service exists.
9. Verify each hostname with DNS tools and HTTPS in a browser.

## Vercel procedure

1. Create/import the Next.js project after `apps/web` exists.
2. Add `siyanamaths.dev` under **Domains**.
3. Add `www.siyanamaths.dev` and choose the preferred redirect behavior.
4. Let Vercel verify ownership and display the required DNS records.
5. Add those exact records in Name.com.
6. Confirm the production deployment, TLS certificate, canonical URL, and redirect behavior.

## Render procedure

1. Create the FastAPI Web Service and verify its default Render hostname.
2. Add `api.siyanamaths.dev` under the service's **Custom Domains**.
3. Copy the exact CNAME target Render provides.
4. Add that CNAME in Name.com.
5. Wait for Render's certificate validation.
6. Test `https://api.siyanamaths.dev/health` after the API exists.

## Supabase Auth URLs

After the frontend domain is live, configure these allowed redirect URLs in Supabase:

```text
https://siyanamaths.dev
https://www.siyanamaths.dev
https://siyanamaths.dev/**
https://www.siyanamaths.dev/**
```

Use exact callback paths in the application rather than broad wildcards where Supabase supports them. Add preview/staging origins only when those environments exist.

## Renewal and ownership

- Confirm which Name.com account and registrant email own the domain.
- Enable two-factor authentication on the registrar account.
- Enable or review auto-renewal. A student offer may be free only for the promotional period; renewal terms must be checked before launch.
- Keep domain registrant and DNS access separate from deployment secrets.
- Never place Name.com passwords or API tokens in GitHub, `.env` files committed to Git, or `.agent/`.

## Verification checklist

- [ ] `siyanamaths.dev` resolves to the Vercel project.
- [ ] `www.siyanamaths.dev` resolves and redirects according to the chosen canonical policy.
- [ ] HTTPS works for the apex and `www`.
- [ ] `api.siyanamaths.dev` has a valid certificate and `/health` responds.
- [ ] Supabase Auth redirects work from the production domain.
- [ ] No conflicting parking or forwarding records remain.
- [ ] Domain auto-renewal and registrant recovery details are recorded securely.
- [ ] The domain is added to the launch/rollback documentation.

## Rollback

If deployment verification fails, do not delete the domain. Revert the DNS records to the last known-good Vercel/Render targets, preserve the deployment logs, and contact Name.com or Vercel/Render support if ownership or certificate validation is uncertain.
