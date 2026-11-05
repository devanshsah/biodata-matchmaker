# Devansh's Page

devanshsah.com: portfolio, biodata, and DEVANSH.OS (the fitness + day planner) in one project.

| Part | Tech |
| --- | --- |
| Frontend | React 19, TanStack Router, Tailwind, shadcn/ui (your existing UI, unchanged) + the fitness planner (dark only) |
| Backend | Java 17, Spring Boot 3.3 |
| Database | PostgreSQL 16 (Flyway migrations) |
| Hosting | Free: Google Cloud Run + Neon Postgres, deployed by GitHub Actions. Locally: `docker compose up` |

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

## Host it for free (Google Cloud Run + Neon)

Built for one user at $0: the site scales to zero when you're not using it, and every piece stays inside a free tier.

| Piece | Service | Free allowance |
| --- | --- | --- |
| Site + API | Cloud Run, Singapore (`asia-southeast1`) | 2M requests, 360k GiB-s, 180k vCPU-s a month |
| Database | Neon Postgres, Singapore | 1 GB storage, 100 compute-hours a month (sleeps after 5 idle minutes) |
| Reminders | Cloud Scheduler pings the server every 2 minutes | 3 jobs per billing account |
| Images | Artifact Registry (keeps the 2 newest) | 0.5 GB |
| Deploys | GitHub Actions on every push to `main` | 2,000 minutes a month (private repo) |

**Trade-off:** after the site has been idle, the first visit takes about 5–15 seconds while Java starts. After that it's fast.

### One-time setup (about 20 minutes)

1. **Neon:** sign up at neon.tech → **New project** → region **AWS Asia Pacific (Singapore)**. Open **Connect**, copy the connection string (starts with `postgresql://`).
2. **Google Cloud:** create a project at console.cloud.google.com and turn on billing. A card is required even for the free tier. Note the **project ID**.
3. Open **Cloud Shell** (the `>_` icon at the top right), upload `deploy/gcp-setup.sh` (⋮ menu → Upload), and run:
   ```bash
   bash gcp-setup.sh YOUR_PROJECT_ID
   ```
   It prints the values for the next step.
4. **GitHub secrets** (repo → Settings → Secrets and variables → Actions → New repository secret):

   | Secret | Value |
   | --- | --- |
   | `GCP_PROJECT_ID` | from the script |
   | `GCP_SA_KEY` | the whole key file the script made |
   | `CRON_KEY` | from the script |
   | `DATABASE_URL` | the Neon connection string, pasted as is |
   | `VAPID_SUBJECT` | `mailto:` + your email |
   | `ANTHROPIC_API_KEY` | optional: lets the app read scan photos |

   `DATABASE_USER` and `DATABASE_PASSWORD` aren't needed when the Neon string includes them.
5. **Deploy:** GitHub → **Actions → Deploy to Cloud Run → Run workflow**. The summary shows your site's URL (`https://devanshs-page-….run.app`). After this, every push to `main` deploys automatically.
6. **Budget alert:** Billing → Budgets & alerts → create a budget of ₹100 (or $1) so any charge at all emails you.
7. Open the URL → `/auth` → create your admin account straight away.

### Use your domain

Cloud Run's domain mapping is free but marked "preview" by Google. It's fine for a personal site.

1. Verify the domain once: search.google.com/search-console → add `devanshsah.com` → follow the DNS TXT steps (add the TXT record in Cloudflare DNS).
2. In Cloud Shell:
   ```bash
   gcloud beta run domain-mappings create --service devanshs-page --domain fit.devanshsah.com --region asia-southeast1
   ```
   It lists the DNS records to add.
3. In Cloudflare **DNS**, add those records with the proxy **off** (grey cloud), so Google can issue the HTTPS certificate. It can take up to an hour.
4. When you're ready to move the whole site, do the same for `devanshsah.com`. First remove the custom domain from the old Cloudflare Worker and disconnect its Git builds (Workers & Pages → biodata-matchmaker → Settings).

### Other option: your own machine + Cloudflare Tunnel

If you'd rather run `docker compose` on a VPS or home PC: Cloudflare Zero Trust → Tunnels → create one, put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`, add public hostnames pointing to `http://app:8080`, then `npm run tunnel`.

## Move your data from Supabase

Only the `downloads` table holds data. Accounts don't need moving: just create your admin again at `/auth`.

1. Supabase dashboard → **Table editor → downloads → Export → CSV**. Save it as `downloads.csv`.
2. Import it into Neon (after the first deploy has created the tables). From Cloud Shell, which has `psql`, after uploading the CSV:
   ```bash
   psql "<your Neon connection string>" \
     -c "\copy downloads (id, name, email, phone, message, user_agent, created_at, action) FROM 'downloads.csv' WITH CSV HEADER"
   ```
   Locally, use `docker compose exec -T db psql -U devansh -d devansh -c "\copy ... FROM STDIN WITH CSV HEADER" < downloads.csv` instead.
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

Everything (ticks, weights, edits, scans and the scan report files) is stored in PostgreSQL.

Reminders are scheduled from the app: each time you open it, it sends the next 14 days of tasks to the server. Open it at least once every two weeks to keep them coming.

The plan runs Mon 26 Oct – Sun 27 Dec 2026. To extend it, change `START` and `WEEKS` in `frontend/src/fit/plan.js`.

## Database

| Table | Holds |
| --- | --- |
| `users` | Admin account (bcrypt password) |
| `downloads` | Biodata view/download form entries |
| `fit_ticks` | One row per ticked task or gym set, per day |
| `fit_lift_weights`, `fit_lift_log` | Latest kg per exercise, and its history |
| `fit_scans`, `fit_files` | Body-scan numbers, and the uploaded report files |
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
