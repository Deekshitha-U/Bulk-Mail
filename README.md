# PulsePost — MERN Bulk Mail Studio

React + Vite · Express · MongoDB · JWT · Nodemailer

## What's in this version

**A real website, not just a dashboard**
- **Home page** (`/`) – hero with an animated *live delivery* card, a **live activity ticker** (clearly labelled sample feed), how-it-works, features, **subscription plans** (Free / Starter / Business, monthly–yearly toggle), FAQ and a **footer**.
- **Sign up → email confirmation → log in** – animated verify screen, resend with cooldown, and a development shortcut link so you are never blocked while testing.
- **After login**: a *"Getting things ready…"* loader, then a **name pop-up** (first / last name with animated toggles), then the **Add a mobile number** pop-up.
- **Dashboard** – icon sidebar that shows each item's **name on hover**; click your **avatar → Log out**; **Usage and plan** pop-over (emails used today vs. plan limit); notifications bell; help pop-over; getting-started checklist; **Campaigns hub**.
- Daily sending limit per plan (Free 300 · Starter 1,000 · Business 5,000). *Payments are not connected – every account is on Free.*

**Sending**
- **No CORS errors** – the browser talks to its own origin and Vite proxies `/api` to Express (see [CORS](#cors-how-its-solved)).
- **Excel / CSV import** – columns detected by header: **email**, **name**, **mobile / phone**.
- **Mobile numbers** on contacts and your profile (country picker, India rules). Merge fields `{{name}}`, `{{email}}`, `{{mobile}}`.
- **Live sending** with progress, per-recipient status and one-click **retry**; **delete** campaigns, drafts and contacts.
- Optional "sign my emails with my name" (Settings).
- Animations respect the OS "reduce motion" setting.

> A successful SMTP response means your provider *accepted* the message. It does not guarantee inbox placement.
> **Mobile numbers are stored and available as `{{mobile}}`; this app sends email only — it does not send SMS.**

## Requirements

- Node.js 20+
- MongoDB (local, or free MongoDB Atlas)
- SMTP login (e.g. Gmail with an App Password)

## Quick start

```bash
# terminal 1 – API
cd server
npm install
cp .env.example .env      # then edit .env (see below)
npm run seed:admin        # creates your admin login
npm run dev               # http://localhost:5000

# terminal 2 – website
cd client
npm install               # installs the new "xlsx" package too
npm run dev               # http://localhost:5173
```

Open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

**Upgrading from the previous zip?** Keep your existing `server/.env`, run `npm install` in `client`, and make sure `client/.env` says `VITE_API_URL=/api`.

## Getting the values for `server/.env`

### `MONGODB_URI`
*Local MongoDB:* install MongoDB Community Server, start it, then use
`mongodb://127.0.0.1:27017/pulsepost`

*MongoDB Atlas (cloud, free):*
1. Sign up at <https://www.mongodb.com/atlas> and create a free **M0** cluster.
2. **Database Access** → Add Database User → choose a username and password.
3. **Network Access** → Add IP Address → your IP (or `0.0.0.0/0` for development only).
4. **Database** → Connect → **Drivers** → copy the string and put your database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/pulsepost?retryWrites=true&w=majority`
   (URL-encode special characters in the password, e.g. `@` → `%40`.)

### `SMTP_USER` / `SMTP_PASS` (Gmail)
1. Google Account → **Security** → turn on **2-Step Verification**.
2. Open <https://myaccount.google.com/apppasswords>, create an app password, copy the 16 characters (no spaces).
3. `SMTP_USER=you@gmail.com`, `SMTP_PASS=<the 16 characters>`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`.
Gmail allows roughly 500 messages a day on a personal account.

### `JWT_SECRET`
Any long random string, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## CORS: how it's solved

Two layers, so it can't bite you:

1. **Same-origin in development.** `client/.env` has `VITE_API_URL=/api`. The browser calls `http://localhost:5173/api/...`; `client/vite.config.js` forwards that to `http://localhost:5000`. A same-origin request has no CORS at all. (If your API runs on another port: `VITE_PROXY_TARGET=http://localhost:4000 npm run dev`.)
2. **A forgiving server allow-list.** In `server/src/app.js`, outside production the API accepts any `localhost`, `127.0.0.1`, `[::1]` and private-LAN origin on any port, plus everything listed in `CLIENT_URL`. Preflight (`OPTIONS`) requests are answered before auth and rate-limiting, and error responses still carry CORS headers. A blocked origin prints a one-line hint in the server console.

**Deploying?** Build the client with `VITE_API_URL=https://api.yourdomain.com/api`, set `NODE_ENV=production` on the server, and set `CLIENT_URL=https://yourdomain.com` (comma-separate several origins).

Still seeing "blocked by CORS policy"? Check, in order: the API is running (Settings → *Test API connection*); `client/.env` is `/api` and you **restarted** `npm run dev` after editing it; the server console for a `[CORS] Blocked origin` line.

## Spreadsheet format

| name | email | mobile |
|---|---|---|
| Asha Rao | asha@example.com | +919876543210 |
| Ravi Kumar | ravi@example.com | 9123456780 |

- Only `email` is required. Header names like *E-mail*, *Full Name*, *Phone No*, *WhatsApp* are recognised.
- Rows without a valid email are skipped; unusable mobile numbers are ignored (the email is kept).
- Duplicates are merged. Limit: 500 recipients per campaign, 5,000 contacts per import.
- In the studio you can also type: `asha@example.com +91 98765 43210, ravi@example.com`.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account (emails a confirmation link) |
| POST | `/api/auth/verify` · `/resend` | Confirm email · send a new link |
| POST | `/api/auth/login` | Login (403 `unverified` until confirmed) |
| GET | `/api/auth/me` | Current admin |
| PUT | `/api/auth/profile` | Update first/last name, mobile, preferences |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/dashboard` · `/usage` | Metrics + 7-day series · today's usage vs. plan |
| GET/POST | `/api/contacts` | List (`?q=`) / create |
| POST | `/api/contacts/bulk` | Import many (upsert by email) |
| PUT/DELETE | `/api/contacts/:id` | Edit / delete |
| POST | `/api/campaigns/send` | Start a campaign (returns `202`; sends in background) |
| GET | `/api/campaigns` · `/:id` | History · details (poll for live progress) |
| POST | `/api/campaigns/:id/retry` | Retry failed recipients |
| GET/POST/DELETE | `/api/drafts` | Drafts |
| GET | `/api/health` | Health check |

All except `register`, `verify`, `resend`, `login` and `health` need `Authorization: Bearer <token>`.

## Notes before real use

- Sending is sequential with a small delay (`SEND_DELAY_MS`, default 150 ms) to respect SMTP limits. For very large lists use a queue and a transactional provider.
- If the server restarts mid-send, that campaign is marked *partial* — open it and press **Retry**.
- Send only to people who opted in, identify yourself clearly and honour unsubscribes.
- Never commit `server/.env`. This project's `.gitignore` already excludes it.

## Email confirmation

New accounts must confirm their email (`REQUIRE_EMAIL_VERIFICATION=true`, the default). The link is sent through your SMTP settings and points to `CLIENT_URL/verify?token=…`. If SMTP is not configured yet, the sign-up still works and (outside production) the page shows a **"confirm now"** shortcut. Set `REQUIRE_EMAIL_VERIFICATION=false` to skip it entirely. Accounts created before this version (and the `npm run seed:admin` admin) are treated as confirmed.

On **Vercel**, `client/vercel.json` rewrites every path to `index.html` so `/login`, `/verify` and `/app/...` work on refresh. Set `CLIENT_URL` on the API to your Vercel URL so the confirmation link points to the right place.
