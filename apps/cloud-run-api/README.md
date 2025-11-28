# Cloud Run API for Cloud SQL

A minimal Express API meant for Cloud Run that connects to the private IP Cloud SQL instance using the Cloud SQL Connector for Postgres. It is protected with an API key header and exposes health/db-ping/profile endpoints.

## Endpoints
- GET `/health` – basic health check.
- GET `/db-ping` – runs `SELECT current_user, now()` to verify DB connectivity.
- GET `/profile` – placeholder returning `current_user` (replace with your own queries).

## Required environment variables
- `API_KEY` – shared secret required in `X-API-Key` header.
- `INSTANCE_CONNECTION_NAME` – e.g. `cs-poc-kvjwpp97kjozemn894cmvvg:us-central1:accessible-software-db`.
- `DB_USER` (default: `appuser`)
- `DB_PASS` – database password.
- `DB_NAME` (default: `appdb`)
- `PORT` (default: `8080`)

## Local run
```bash
cd apps/cloud-run-api
npm install
API_KEY=dev-key \
INSTANCE_CONNECTION_NAME=your-instance-conn-name \
DB_PASS=your-password \
DB_USER=appuser \
DB_NAME=appdb \
node server.js
```

## Deploy (example)
```bash
# Build and deploy to Cloud Run
PROJECT=cs-poc-kvjwpp97kjozemn894cmvvg
REGION=us-central1
SERVICE=cloud-run-api
INSTANCE=cs-poc-kvjwpp97kjozemn894cmvvg:us-central1:accessible-software-db
API_KEY=choose-a-strong-key
DB_PASS=Ud62tCSV7PygbPuQyj9JFfS7

gcloud builds submit --tag gcr.io/$PROJECT/$SERVICE apps/cloud-run-api

gcloud run deploy $SERVICE \
  --image gcr.io/$PROJECT/$SERVICE \
  --region $REGION \
  --platform managed \
  --set-env-vars API_KEY=$API_KEY,INSTANCE_CONNECTION_NAME=$INSTANCE,DB_USER=appuser,DB_PASS=$DB_PASS,DB_NAME=appdb \
  --allow-unauthenticated \
  --vpc-connector=YOUR_SERVERLESS_VPC_CONNECTOR \
  --egress-settings=all-traffic
```
Adjust `--allow-unauthenticated` and use ingress controls (recommended: internal+clouddns or IAP) as needed. Ensure the service account for Cloud Run has `roles/cloudsql.client`.
