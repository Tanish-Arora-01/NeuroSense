# Deployment Summary

Date: April 5, 2026

## Overall Status

Not ready for production deployment yet.

## What Was Reviewed

- backend/.env
- ml-service/.env
- docker-compose.prod.yml
- backend/Dockerfile
- ml-service/Dockerfile
- Runtime environment variable usage in backend and ml-service code

## Critical Blockers

1. Secrets are currently present in local env files (including database and OAuth credentials) and should be rotated before deployment.
2. There is no .dockerignore file in backend or ml-service, while both Dockerfiles copy the full build context. This can accidentally include .env files in image layers.
3. Production-required variables are not currently supplied from a root deploy environment file or CI/CD secret manager.
4. API-key coupling between backend and ml-service depends on matching values; this must be explicitly set and verified in production.

## High-Priority Gaps

1. backend/.env is set to development mode (NODE_ENV=development).
2. ml-service/.env has DEBUG=true.
3. CORS origins are localhost-only in both services.
4. Google OAuth client values are placeholders and not production credentials.
5. ml-service database is still local/default (empty DATABASE_URL and default localhost postgres settings).

## What Is Already Good

1. .env files are ignored by git at repository level.
2. ML model artifacts referenced by env exist:
   - trained_models/dementia_model.pkl
   - trained_models/vosk_model/
3. docker-compose.prod.yml correctly marks SESSION_SECRET and SECRET_KEY as required.

## Required Before Production Go-Live

- [ ] Rotate all secrets currently used in local env files.
- [ ] Provide deploy-time secrets via CI/CD or a secure secret manager.
- [ ] Set backend NODE_ENV to production.
- [ ] Set ml-service DEBUG to false.
- [ ] Set production CLIENT_URL and ALLOWED_ORIGINS.
- [ ] Set backend ML_SERVICE_API_KEY and ml-service SECRET_KEY to the same strong value.
- [ ] Set a real production database connection for ml-service.
- [ ] Add .dockerignore files for backend and ml-service.
- [ ] Verify OAuth callback URLs for the production domain.

## Suggested Production Env Mapping

- backend:
  - NODE_ENV=production
  - PORT=5000
  - CLIENT_URL=<your_frontend_domain>
  - SESSION_SECRET=<strong_random_secret>
  - MONGO_URI=<production_mongo_uri>
  - ML_PREDICT_URL=http://ml-service:8001/api/screening/predict
  - ML_SERVICE_API_KEY=<shared_strong_api_key>
  - GOOGLE_CLIENT_ID=<prod_google_client_id>
  - GOOGLE_CLIENT_SECRET=<prod_google_client_secret>
  - GITHUB_CLIENT_ID=<prod_github_client_id>
  - GITHUB_CLIENT_SECRET=<prod_github_client_secret>

- ml-service:
  - ML_SERVICE_PORT=8001
  - DEBUG=false
  - MODEL_PATH=./trained_models/dementia_model.pkl
  - VOSK_MODEL_PATH=./trained_models/vosk_model
  - ALLOWED_ORIGINS=<backend_and_frontend_origins>
  - SECRET_KEY=<shared_strong_api_key>
  - DATABASE_URL=<production_postgres_or_managed_db_url>

## Final Recommendation

Address all items in the Required Before Production Go-Live checklist, then run a full smoke test using docker-compose.prod.yml with real production secrets injected externally.
