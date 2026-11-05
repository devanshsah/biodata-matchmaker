#!/usr/bin/env bash
# One-time Google Cloud setup for Devansh's Page. Run it in Cloud Shell
# (console.cloud.google.com → the >_ icon at the top right):
#
#   bash gcp-setup.sh YOUR_PROJECT_ID
#
# It turns on the services, creates the image registry (keeps only the 2 newest images so it
# stays in the free 0.5 GB), creates a deploy account for GitHub, and prints the values to
# paste into GitHub secrets. Safe to run more than once.
set -euo pipefail

PROJECT_ID="${1:?Usage: bash gcp-setup.sh YOUR_PROJECT_ID}"
REGION="asia-southeast1"     # Singapore: in the Cloud Run free tier and supports custom domains
REPO="devanshs-page"
SA="github-deployer"
SA_EMAIL="${SA}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null

echo "→ Turning on Cloud Run, Artifact Registry, Cloud Scheduler"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com iam.googleapis.com

echo "→ Image registry"
if ! gcloud artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" --repository-format docker --location "$REGION" \
    --description "Devansh's Page images"
fi
cat > /tmp/cleanup.json <<'JSON'
[
  {"name": "keep-newest-2", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 2}},
  {"name": "delete-older", "action": {"type": "Delete"}, "condition": {"tagState": "any", "olderThan": "1d"}}
]
JSON
gcloud artifacts repositories set-cleanup-policies "$REPO" --location "$REGION" --policy /tmp/cleanup.json --no-dry-run

echo "→ Deploy account for GitHub Actions"
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA" --display-name "GitHub deploy"
fi
for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SA_EMAIL}" --role "$ROLE" --condition None >/dev/null
done

KEY_FILE="$HOME/github-deployer-key.json"
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$SA_EMAIL"
CRON_KEY="$(openssl rand -hex 24)"

cat <<EOF

=====================================================================
Done. Add these GitHub secrets (repo → Settings → Secrets and variables → Actions):

  GCP_PROJECT_ID   $PROJECT_ID
  CRON_KEY         $CRON_KEY
  GCP_SA_KEY       the whole contents of $KEY_FILE
                   (run:  cat $KEY_FILE   and copy everything, including the { })

Then delete the key file from Cloud Shell:  rm $KEY_FILE

Also add from Neon: DATABASE_URL, DATABASE_USER, DATABASE_PASSWORD
And: VAPID_SUBJECT = mailto:<your email>

Last step: set a budget alert so you hear about any charge at all:
  console.cloud.google.com/billing → Budgets & alerts → Create budget → amount ₹100 (or \$1)
=====================================================================
EOF
