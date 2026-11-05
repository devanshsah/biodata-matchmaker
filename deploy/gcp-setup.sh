#!/usr/bin/env bash
# One-time setup for Devansh's Page on Google Cloud (Singapore). Run it in Cloud Shell:
#
#   bash deploy/gcp-setup.sh <PROJECT_ID> "<NEON_CONNECTION_STRING>" <YOUR_EMAIL>
#
# What it does:
#   1. Turns on Cloud Run, Artifact Registry, Cloud Scheduler, Budgets
#   2. Creates the image registry (keeps only the 2 newest images, so it stays in the free 0.5 GB)
#   3. Creates a deploy account for GitHub Actions
#   4. Creates a budget alert (emails you at the first rupee/cent of spend)
#   5. Saves all deploy settings as GitHub secrets on the repo
# Safe to run again (e.g. to change the database string).
set -euo pipefail

PROJECT_ID="${1:?Usage: bash deploy/gcp-setup.sh <PROJECT_ID> \"<NEON_CONNECTION_STRING>\" <YOUR_EMAIL>}"
DATABASE_URL="${2:?Second argument: the Neon connection string, in quotes}"
EMAIL="${3:?Third argument: your email (for push notifications)}"
REPO_SLUG="${GITHUB_REPO:-devanshsah/biodata-matchmaker}"
REGION="asia-southeast1"     # Singapore: in the Cloud Run free tier, supports custom domains, next to Neon
AR_REPO="devanshs-page"
SA="github-deployer"
SA_EMAIL="${SA}@${PROJECT_ID}.iam.gserviceaccount.com"

step() { printf '\n\033[1;33m→ %s\033[0m\n' "$1"; }

case "$DATABASE_URL" in
  postgres://*|postgresql://*|jdbc:postgresql://*) ;;
  *) echo "The second argument should be the Neon connection string (starts with postgresql://)"; exit 1 ;;
esac

step "GitHub login (needed to save the secrets)"
if ! command -v gh >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y -qq gh
fi
gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol https --web

step "Project $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null
BILLING=$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)' 2>/dev/null | sed 's#billingAccounts/##')
if [ -z "$BILLING" ]; then
  echo "Billing isn't turned on for this project. Console → Billing → Link a billing account, then run this again."
  exit 1
fi

step "Turning on Cloud Run, Artifact Registry, Cloud Scheduler, Budgets"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com \
  iam.googleapis.com billingbudgets.googleapis.com

step "Image registry (Singapore, keeps the 2 newest images)"
if ! gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" --repository-format docker --location "$REGION" \
    --description "Devansh's Page images"
fi
cat > /tmp/cleanup.json <<'JSON'
[
  {"name": "keep-newest-2", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 2}},
  {"name": "delete-older", "action": {"type": "Delete"}, "condition": {"tagState": "any", "olderThan": "1d"}}
]
JSON
gcloud artifacts repositories set-cleanup-policies "$AR_REPO" --location "$REGION" --policy /tmp/cleanup.json --no-dry-run >/dev/null

step "Deploy account for GitHub Actions"
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA" --display-name "GitHub deploy"
  sleep 10   # new accounts take a moment to become usable
fi
for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SA_EMAIL}" --role "$ROLE" --condition None >/dev/null
done

step "Budget alert"
if gcloud billing budgets list --billing-account "$BILLING" --format='value(displayName)' 2>/dev/null | grep -qx "Devansh's Page"; then
  echo "Budget already exists."
else
  CUR=$(gcloud billing accounts describe "$BILLING" --format='value(currencyCode)' 2>/dev/null || true)
  if [ "$CUR" = "INR" ]; then AMOUNT="100INR"; else AMOUNT="1${CUR:-USD}"; fi
  gcloud billing budgets create --billing-account "$BILLING" --display-name "Devansh's Page" \
    --budget-amount "$AMOUNT" --filter-projects "projects/$PROJECT_ID" \
    --threshold-rule percent=0.01 --threshold-rule percent=0.5 --threshold-rule percent=1.0 >/dev/null \
    && echo "Budget of $AMOUNT created: billing admins get an email at the first charge." \
    || echo "Couldn't create the budget automatically. Add one in Console → Billing → Budgets & alerts."
fi

step "Saving GitHub secrets on $REPO_SLUG"
KEY_FILE="$(mktemp)"
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$SA_EMAIL" >/dev/null
CRON_KEY="$(openssl rand -hex 24)"
gh secret set GCP_PROJECT_ID --repo "$REPO_SLUG" --body "$PROJECT_ID"
gh secret set GCP_SA_KEY     --repo "$REPO_SLUG" < "$KEY_FILE"
gh secret set CRON_KEY       --repo "$REPO_SLUG" --body "$CRON_KEY"
gh secret set DATABASE_URL   --repo "$REPO_SLUG" --body "$DATABASE_URL"
gh secret set VAPID_SUBJECT  --repo "$REPO_SLUG" --body "mailto:$EMAIL"
rm -f "$KEY_FILE"

cat <<EOF

=====================================================================
All set. Next: merge the pull request on GitHub (or push to main).
GitHub Actions then builds and deploys the site to Cloud Run in Singapore.
Watch it here:  https://github.com/$REPO_SLUG/actions

Optional: to let the app read numbers off scan photos, add your Claude API key:
  gh secret set ANTHROPIC_API_KEY --repo $REPO_SLUG
=====================================================================
EOF
