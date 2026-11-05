# Devansh's Page

devanshsah.com: portfolio, biodata, and DEVANSH.OS (the fitness + day planner) in one project.

| Part | Tech |
| --- | --- |
| Frontend | React 19, TanStack Router, Tailwind, shadcn/ui (your existing UI, unchanged) + the fitness planner (dark only) |
| Backend | Java 17, Spring Boot 3.3 |
| Database | PostgreSQL 16 (Flyway migrations) |
| Hosting | One Docker image + Postgres, started with `docker compose up` |

## Pages

| URL | What |
| --- | --- |
| `/` | Portfolio |
| `/biodata` | Biodata, unlocked after the view form; download as PDF |
| `/auth` | Admin sign-in (the first account you create becomes the admin; sign-ups close after that) |
| `/admin` | Who viewed or downloaded the biodata |
| `/assignment` | About page (hidden from search) |
| `/fit` | DEVANSH.OS planner (admin sign-in) |
| `fit.devanshsah.com/` | Same planner, at the root of the subdomain |

## Run it

You only need **Docker Desktop** and **npm**. Maven and Java are not needed on your machine: they run inside Docker during the build.

```bash
cp .env.example .env        # set DB_PASSWORD at minimum
npm start                   # same as: docker compose up -d --build
```

Open http://localhost:8080. The first build takes a few minutes (it downloads npm and Java packages inside Docker).

Then go to `/auth`, click **Create an admin account**, and sign up. That same account opens `/admin` and `/fit`.

| Command | Does |
| --- | --- |
| `npm start` | Build and start the site + database |
| `npm stop` | Stop everything (data is kept) |
| `npm run logs` | Follow the server logs |
| `npm run restart` | Rebuild and restart only the site after code changes |
| `npm run tunnel` | Start with the Cloudflare Tunnel too |
| `npm run backup > backup.sql` | Save a database backup |

## Put it on devanshsah.com with Cloudflare

Docker needs an always-on machine: a small VPS (any provider) or a home computer. Cloudflare Tunnel then connects it to your domain with HTTPS, without opening ports.

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** (type *Cloudflared*). Copy the token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
2. In the tunnel, add **Public hostnames**, each pointing to service `http://app:8080`:
   - `devanshsah.com`
   - `www.devanshsah.com`
   - `fit.devanshsah.com`
3. Your site currently runs as a Cloudflare Worker. Remove the Worker's custom domain / route for `devanshsah.com` first, otherwise it keeps answering instead of the tunnel.
4. Start everything, including the tunnel:
   ```bash
   docker compose --profile tunnel up -d --build
   ```

Phone notifications and "Add to Home Screen" need HTTPS, which the tunnel provides.

## Move your data from Supabase

Only the `downloads` table holds data. Accounts don't need moving: just create your admin again at `/auth`.

1. Supabase dashboard → **Table editor → downloads → Export → CSV**. Save it as `downloads.csv`.
2. Import it:
   ```bash
   docker compose exec -T db psql -U devansh -d devansh \
     -c "\copy downloads (id, name, email, phone, message, user_agent, created_at, action) FROM STDIN WITH CSV HEADER" \
     < downloads.csv
   ```
   If the CSV's column order differs, match the list in the command to its header row.

## DEVANSH.OS (fitness + day planner)

Your day as a departures board: tasks are BOARDING when it's their time, DEPARTED when ticked, DELAYED when you're 30+ minutes behind. Built for the phone: bottom tab bar, big tap targets, home-screen app.

**Add it to your iPhone:** open `https://fit.devanshsah.com` (or `/fit`) in Safari → Share → **Add to Home Screen**. It opens full-screen like an app.


- Opens on today's date and scrolls to what you should be doing now (India time).
- **Day plan:** walk, upskilling, gym (tap each set, log the kg), core, sleep.
- **Meals:** what to eat and when, how to make it, and timed prep (7:45 am cooking, 8:20 pm night prep, Sunday batch).
- **Progress:** add body-scan reports (photo or PDF); your Jun–Oct scans are pre-loaded.
- **Edit:** change meals, workouts and study topics; changes apply to every week.
- **Reminders:** in Edit → Notifications, tap **Turn on reminders**. You get a notification when each task starts and an off-track alert 30 minutes later if it isn't ticked. On iPhone, add the site to your Home Screen first and open it from there.

Everything (ticks, weights, edits, scans, reminders) is stored in PostgreSQL. Scan images are stored in the `uploads` volume.

Reminders are scheduled from the app: each time you open it, it sends the next 14 days of tasks to the server. Open it at least once every two weeks to keep them coming.

The plan runs Mon 26 Oct – Sun 27 Dec 2026. To extend it, change `START` and `WEEKS` in `frontend/src/fit/plan.js`.

## Database

| Table | Holds |
| --- | --- |
| `users` | Admin account (bcrypt password) |
| `downloads` | Biodata view/download form entries |
| `fit_ticks` | One row per ticked task or gym set, per day |
| `fit_lift_weights`, `fit_lift_log` | Latest kg per exercise, and its history |
| `fit_scans` | Body-scan numbers and the report file name |
| `fit_overrides` | Your plan edits (JSON) |
| `fit_reminders`, `fit_push_subs` | Scheduled notifications and subscribed devices |
| `app_secrets` | Auto-generated session and push keys |

Backup:
```bash
docker compose exec -T db pg_dump -U devansh devansh > backup.sql
```

## Develop locally (hot reload)

Two terminals, still no Maven or Java on your machine:

```bash
npm run dev:api     # database + Spring Boot API on :8080, run inside Docker
npm run dev:web     # React on http://localhost:5173, forwards /api to :8080
```

## What changed from the Lovable version

- TanStack Start (server rendering on Cloudflare Workers) became a client-side React app with the same routes and components. Page titles and social preview tags are set in `index.html` and per page.
- Supabase auth and the `downloads` table moved to Spring Boot + PostgreSQL. Sign-up only works until the admin account exists.
- Removed: Supabase client, Cloudflare Worker entry (`server.ts`, `wrangler.jsonc`), Lovable build config.
