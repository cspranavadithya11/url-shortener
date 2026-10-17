# Club URL Shortener (Netlify)

Paste a long URL, get a short link that redirects to it. Runs on Netlify Functions, with data stored in Netlify Blobs (no database to set up).

## Features

| Requirement | How it's done |
|---|---|
| Shorten + redirect | `POST /api/shorten`, then visiting `/<code>` redirects (302) |
| Click counter | Every redirect increments `clicks` |
| Custom short URLs | Optional `custom_code` (3-32 chars: letters, numbers, `-`, `_`) |
| Expiration dates | Optional `expires_in_days` or `expires_at`; expired links return 410 |
| Database storage | Netlify Blobs (links, users, sessions) |
| User accounts | Register/login (scrypt-hashed passwords, 7-day session tokens), "My links" list |
| Cloud deployment | Netlify, auto-deploys from GitHub |

Accounts are optional: anyone can shorten a link, but signed-in users get a list of their links with click counts and expiry.

## API

| Method | Path | Body / notes |
|---|---|---|
| POST | `/api/shorten` | `{"url", "custom_code"?, "expires_in_days"? or "expires_at"?}`. Add header `Authorization: Bearer <token>` to save it to your account |
| GET | `/<code>` | 302 redirect, 404 if unknown, 410 if expired |
| GET | `/api/stats/<code>` | URL, clicks, created, expires |
| POST | `/api/register` | `{"username", "password"}` returns `{token}` |
| POST | `/api/login` | `{"username", "password"}` returns `{token}` |
| GET | `/api/my-links` | Needs Bearer token; your links with clicks |

Example:

```bash
curl -X POST https://YOURSITE.netlify.app/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/long/page","custom_code":"club","expires_in_days":7}'
```

## Deploy: GitHub then Netlify

1. Create an empty repo on github.com (no README), e.g. `url-shortener`.
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: URL shortener"
   git branch -M main
   git remote add origin https://github.com/<your-username>/url-shortener.git
   git push -u origin main
   ```
3. Go to app.netlify.com, **Add new site**, **Import an existing project**, choose GitHub, pick the repo.
4. Build settings are read from `netlify.toml`, so just click **Deploy**.
5. Optional: **Site configuration**, **Change site name** for an address like `yourclub.netlify.app`.

Every `git push` to `main` redeploys automatically.

## Run locally

```bash
npm install
npx netlify dev
```

Open http://localhost:8888.

## Notes and limits

- Click counts are not atomic, so two clicks at the exact same moment may count as one.
- There is no rate limiting on register/login/shorten. Fine for a club project; add limits before public launch.
- Expired links stay in storage (they just stop redirecting).
