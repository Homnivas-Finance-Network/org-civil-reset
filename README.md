# Homnivas Civil Reset

Cloudflare Workers (Hono + D1) backend + a Vite/TypeScript PWA frontend. No card
required anywhere in this stack, no Firebase, no R2.

Tested in this build: `npm install`, `tsc --noEmit`, the D1 migration, and the full
happy path (bootstrap agent → login → create lead → magic-link exchange → submit
application → Cloudinary signature issuance → status history) all ran clean against
a local `wrangler dev` + local D1. The frontend type-checks and produces a working
production build (`vite build` → 4.9 kB gzipped JS). Cloudinary's actual upload
calls and a live Cloudflare deploy need your real credentials/account to test —
everything up to that boundary is verified.

## Project layout

```
homnivas-card-pwa/
  setup.sh              <- guided backend setup (run this first)
  wrangler.toml
  migrations/0001_init.sql
  src/                   <- Worker backend (TypeScript, Hono, D1, Cloudinary)
  frontend/              <- the PWA (Vite + TypeScript, no framework)
```

---

## Part 1 — Backend (Cloudflare Worker)

### Option A — guided script

```
bash setup.sh
```

Walks you through login, D1 creation, migration, Cloudinary secrets, and deploy,
in order. You'll need your Cloudinary cloud name/API key/secret ready
(cloudinary.com dashboard, free tier, no card required).

### Option B — manual steps

```
npm install
npx wrangler login
npm run db:create                              # copy the database_id it prints
# paste that database_id into wrangler.toml under [[d1_databases]]
npm run db:migrate:remote
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
# edit wrangler.toml: CLOUDINARY_CLOUD_NAME and PUBLIC_APP_URL
npm run deploy
```

Either way, deploy prints your live API URL — something like
`https://homnivas-card-pwa.<your-subdomain>.workers.dev`. You'll need it for Part 2.

### Set up your first agent — no curl, no Postman

Once the frontend is deployed (Part 2 below), just open `https://<your-frontend-url>/admin`
in a browser. It automatically detects whether any agent exists yet:

- **No agents yet** → shows a one-time setup form (name, phone, PIN) → creates
  agent #1 and drops you at the login screen.
- **Agents already exist** → shows the login form directly.

After logging in, the dashboard lets you create a lead (name + phone), get a
ready-to-tap **WhatsApp Par Bhejein** button with the link pre-filled, and see/update
every lead's status from a dropdown — all from the browser, no API calls by hand.

**Once your real agents are set up, delete or comment out the `bootstrap-agent`
route in `src/routes/admin.ts`** (the `/exists` and `/login` routes are safe to
leave — they require real credentials or reveal nothing sensitive). The
bootstrap route deliberately has no auth — it's the only way to create agent #1
before any credentials exist — and it's the one thing in this
codebase that's an open door if left in.

---

## Part 2 — Frontend (the PWA)

```
cd frontend
npm install
cp .env.example .env
# edit .env — set VITE_API_BASE_URL to your deployed Worker URL from Part 1
npm run build
```

This produces `frontend/dist/` — a handful of static files (HTML/CSS/JS + PWA
manifest + service worker), 6.3 kB of JS gzipped, including the `/admin` panel.

### Deploying dist/ — this IS a real drag-and-drop zip upload

Unlike the backend, static output genuinely can go up as a zip through the
Cloudflare dashboard:

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Upload assets**
2. Drag in the contents of `frontend/dist/`
3. Done — you get a `*.pages.dev` URL immediately, or attach your own domain
   under Custom Domains

Every time you change the frontend: `npm run build`, then re-upload `dist/` the
same way (or connect Pages to a GitHub repo instead, so it redeploys on every push
— see "Going further" below).

### One thing to update before this is real

`src/routes/admin.ts` builds the WhatsApp link using `PUBLIC_APP_URL` from
`wrangler.toml` — set that to wherever you land your Pages deployment
(`https://your-app.pages.dev` or your custom domain), then redeploy the backend
so new leads get the right link.

---

## Going further — Git-connected auto-deploy

Once you're past manual testing, connecting both halves to GitHub means every
`git push` redeploys automatically — no more re-running `wrangler deploy` or
re-uploading `dist/` by hand:

- **Backend:** Cloudflare Dashboard → Workers & Pages → your Worker → Settings →
  Builds → connect your GitHub repo
- **Frontend:** Cloudflare Dashboard → Workers & Pages → Create → Pages →
  **Connect to Git** instead of Upload assets — point it at `frontend/`, build
  command `npm run build`, output directory `dist`

---

## What's deliberately NOT in this codebase yet

- **Signed Cloudinary delivery URLs.** Uploads use `type: authenticated` so
  nothing is publicly guessable, but generating a working signed URL to actually
  *view* a file later uses a different signing scheme than the upload signature in
  `src/lib/cloudinary.ts` (which IS the standard documented formula and is safe).
  Wire real delivery signing against Cloudinary's current docs before any agent
  needs to view an uploaded KYC document.
- **Real terms text.** `frontend/src/screens/agreement.ts` has a placeholder
  `TERMS_TEXT` clearly marked as such. Replace it with your actual,
  lawyer-reviewed terms before anyone signs against it — and bump
  `TERMS_VERSION` instead of editing the text in place once real customers have
  signed, since the exact text is hashed and permanently tied to their signature.
- **Real app icon.** `frontend/public/icons/icon.svg` is a plain placeholder.
- **Input validation.** Route handlers cast JSON bodies to a TypeScript type but
  don't verify shape at runtime. Add `zod` before this sees real traffic.
- **D1 backups.** Set up a scheduled export before you have agreements you can't
  afford to lose.
- **Rate limiting** on `/api/admin/login`.

## What's genuinely done

Full agent → WhatsApp handoff → magic-link → application form → camera KYC
capture → digital agreement (scroll-gated consent + signature pad) → live status
tracker, backend and frontend both, tested end to end where the sandbox allows it.
An `/admin` panel (setup → login → create-lead-with-WhatsApp-button → status
management) replaces raw API calls for everyday agent use — Postman/curl is only
ever needed if you're debugging, not for normal operation.
