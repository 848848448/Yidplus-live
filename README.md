# Web Analytics HQ

A private dashboard to track **all the websites you build** — real unique
visitors, real active minutes, per‑site status, a 14‑day trend, and which sites
you've handed off to client companies. Runs on **Cloudflare Pages + D1**.

The numbers are **real**: each site you add gets a one‑line tracking snippet you
paste into that site. It reports pageviews and active time to this dashboard —
no manual entry, no third‑party analytics account.

---

## What's here

```
index.html            The dashboard (login + UI)
tracker.js            The snippet your sites embed
functions/api/
  collect.js          Public beacon receiver (records hits)
  sites.js            Admin API: list/create/update/delete + live stats
  _lib.js             Shared helpers (auth, schema, CORS)
schema.sql            D1 tables (auto‑created; here for reference)
wrangler.toml         Cloudflare Pages + D1 binding
_headers              Security + caching
```

## Deploy (about 5 minutes)

You need a free [Cloudflare](https://dash.cloudflare.com) account.

**1. Create the database**
```bash
npx wrangler d1 create yidplus-analytics
```
Copy the `database_id` it prints into `wrangler.toml` (replace
`REPLACE_WITH_YOUR_D1_DATABASE_ID`).

**2. Set your dashboard password** (this is what you'll log in with)
```bash
npx wrangler pages secret put DASH_KEY
```
Enter a long, private phrase when prompted.

**3. Deploy**
```bash
npx wrangler pages deploy .
```
Wrangler prints your live URL, e.g. `https://yidplus-live.pages.dev`. That's your
dashboard.

> Prefer clicks over commands? In the Cloudflare dashboard: **Workers & Pages →
> Create → Pages → Connect to Git**, pick this repo, deploy. Then add the **D1
> binding** named `DB` and the **secret** `DASH_KEY` under the project's
> Settings → Variables & Bindings, and redeploy.

## Use it

1. Open your dashboard URL, enter your `DASH_KEY`.
2. **Add a site** (name, address, status, optional client).
3. Click **Install** on that site → copy the one‑line `<script>` → paste it into
   that website before `</body>`.
4. Visits start counting within seconds. Reopen the dashboard any time to see
   visitors, minutes, and the trend. Hand a site to a client by setting its
   **Client** field and marking it **Handed off**.

## Notes

- No cookies and no personal data are collected — just a random visitor id in
  the visitor's `localStorage` and active time on the page.
- The `DASH_KEY` guards every admin call; the public `/api/collect` endpoint only
  accepts hits for sites you've registered.
