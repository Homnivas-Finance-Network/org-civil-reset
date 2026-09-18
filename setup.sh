#!/usr/bin/env bash
# Guided setup for the Homnivas Card PWA backend.
# Run this from the homnivas-card-pwa/ folder: bash setup.sh
#
# This does NOT remove the need for a Cloudflare account or Node.js —
# nothing can. What it does is chain every command you'd otherwise run
# by hand, in the right order, with the placeholders swapped in for you.

set -euo pipefail

echo "== Homnivas Card PWA — backend setup =="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org (LTS version) and re-run this script."
  exit 1
fi

echo "1/6 — Installing dependencies..."
npm install

echo
echo "2/6 — Logging into Cloudflare (a browser window will open)..."
npx wrangler login

echo
echo "3/6 — Creating your D1 database..."
CREATE_OUTPUT=$(npx wrangler d1 create homnivas_card)
echo "$CREATE_OUTPUT"

DB_ID=$(echo "$CREATE_OUTPUT" | grep -oE '"?database_id"?[[:space:]]*[:=][[:space:]]*"[a-f0-9-]{36}"' | grep -oE '[a-f0-9-]{36}' || true)

if [ -z "$DB_ID" ]; then
  echo
  echo "Could not auto-detect the database_id from the output above."
  echo "Copy it manually into wrangler.toml under [[d1_databases]] -> database_id, then re-run this script."
  exit 1
fi

sed -i.bak "s/REPLACE_AFTER_RUNNING_npm_run_db:create/${DB_ID}/" wrangler.toml
rm -f wrangler.toml.bak
echo "wrangler.toml updated with database_id: $DB_ID"

echo
echo "4/6 — Running the schema migration (remote)..."
npx wrangler d1 execute homnivas_card --remote --file=./migrations/0001_init.sql

echo
echo "5/6 — Cloudinary credentials."
read -rp "Cloudinary cloud name: " CLOUD_NAME
sed -i.bak "s/replace_with_your_cloud_name/${CLOUD_NAME}/" wrangler.toml
rm -f wrangler.toml.bak

echo "Now paste your Cloudinary API key when prompted (from cloudinary.com dashboard):"
npx wrangler secret put CLOUDINARY_API_KEY
echo "Now paste your Cloudinary API secret when prompted:"
npx wrangler secret put CLOUDINARY_API_SECRET

echo
read -rp "6/6 — Public URL where your FRONTEND will be hosted (e.g. https://apply.homnivas.com): " PUBLIC_URL
ESCAPED_URL=$(printf '%s\n' "$PUBLIC_URL" | sed 's/[&/\]/\\&/g')
sed -i.bak "s#https://apply.homnivas.com#${ESCAPED_URL}#" wrangler.toml
rm -f wrangler.toml.bak

echo
echo "Deploying the Worker..."
npx wrangler deploy

echo
echo "== Done =="
echo "Your API is live. Copy the workers.dev URL printed above into"
echo "frontend/.env as VITE_API_BASE_URL, then build and deploy the frontend"
echo "(see README.md section 'Frontend deployment')."
echo
echo "Reminder: bootstrap your first agent, then delete/comment out the"
echo "bootstrap-agent route in src/routes/admin.ts — see README.md step 7."
