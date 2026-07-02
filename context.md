# NeuroSense — Project Context & Architecture

> **Last updated:** 2026-04-05  
> **Status:** Local Development / Demo Ready

NeuroSense is an AI-powered dementia screening system. It uses a multi-service architecture comprising a React frontend, a Node.js/Express backend gateway, and a Python FastAPI Machine Learning microservice. The goal of this document is to track architectural choices, design patterns, and deployment strategies for the whole project.

---

## 🏗️ High-Level Architecture Overview

NeuroSense splits its operations across distinct service domains to decouple heavy machine learning tasks (audio processing, inference) from general web server responsibilities (authentication, PDF generation, database CRUD operations).

| Service | Technology Stack | Port | Purpose |
|---------|-----------------|------|---------|
| **Frontend** | React 19, Vite, Tailwind CSS 4, Recharts | `5173` | UI, Client Application, Web Dashboards |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), Passport.js | `5000` | API Gateway, User Auth, History persistence, PDF reporting |
| **ML-Service** | Python, FastAPI, Vosk (STT), Scikit-Learn | `8001` | ML Inference, Acoustic extraction, Model serving |

### Service Communications Flow

1. **Client to Backend**: The web frontend communicates strictly with the Node.js backend. User sessions are tracked via secure HTTP-only cookies managed by Express sessions and Passport.js.
2. **Backend to ML-Service**: When a screening test is requested, the Node.js backend acts as a **Proxy Gateway**. It forwards the audio or cognitive metadata to the FastAPI service via a synchronous HTTP `POST` over the internal Docker network. 
3. **Data Persistence**: 
   - The **Node.js backend** holds the master data in **MongoDB** (User accounts, Screening Histories `PredictionResult`, Audit Logs).
   - The **ML-Service** has a fallback **SQLite** database, but primarily computes statistically and operates statelessly for inference.
4. **Security**: The Proxy communication to the ML-Service is secured using an `x-api-key` header (configured via `.env` files where Backend `ML_SERVICE_API_KEY` must match ML-Service `SECRET_KEY`).

---

## 💻 Tech Stack & Architectural Choices

### 1. Frontend (Client)
- **Framework**: Vite + React 19. Chosen for rapid local development and hot module replacement.
- **Styling**: Tailwind CSS v4. Enables utility-first design systems and rapid prototyping of the dashboard pages (`Dashboard.jsx`, `LandingPage.jsx`, etc).
- **Icons & Charts**: `lucide-react` for clean SVG iconography, `recharts` for charting user cognitive scoring trends locally.
- **Authentication State**: Relies on a global `AuthContext` wrapper providing `isLoggedIn` states propagated to all ProtectedRoutes.
- **Routing**: Client-side rendering driven by `react-router-dom` v7.

### 2. Node Backend (Gateway & Proxy)
- **Framework & DB**: Express.js mapped to MongoDB (hosted locally in a Docker `mongo:7` container).
- **Authentication Engine**: Passport.js handling multiple distinct strategies:
  - Local authentication (username/password with `bcryptjs`).
  - Google OAuth / Github OAuth mapping remote users into identical Mongo `User` records.
  - Windows Hello Biometric face login stub functionality (depending on client needs).
- **Core Modules**:
  - `Screening Proxy`: Routes frontend ML requests to `ml-service:8001`, awaits prediction, saves the result to `PredictionResult`, and creates an `AuditLog`.
  - `PDF Reporting`: Utilizes `pdfkit` to generate downloadable clinical patient reports containing ML confidence scores and cognitive context factors.
  - `Recommendations Engine`: Leverages the Google Places API to recommend local geriatrics / neurologists based on geolocation logic.

### 3. ML-Service (Inference Engine)
- **Framework**: FastAPI (uvicorn). Lightweight, async-friendly, inherently self-documenting via Swagger (`/docs`).
- **Machine Learning Model**: Currently deploying a Random Forest Classifier (`dementia_model.pkl`) that can operate `predict_proba` for risk scoring. The model is trained on both classic cognitive data and acoustic sound features.
- **Speech-to-Text Setup (Offline)**: Uses `Vosk` (Offline transcription) rather than cloud APIs, which ensures HIPAA capability and privacy for patient voice data. `librosa`, `soundfile`, and `pydub` interact to extract diagnostic acoustic markers (Speech Rate, number of pauses, pitch variation).
- **Fallback Configurations**: If the `dementia_model.pkl` is absent, the system gracefully falls back to deterministic dummy calculations, allowing UI iterations without breaking the screening pipeline.

---

## 🗂️ Data Storage Details

### MongoDB Schema Layout
1. **User**: Stores application users. Includes roles like `"doctor"`.
2. **PredictionResult**: Central nexus of results bridging human context with AI scores.
   - `patientId`, `riskScore`, `confidence`, `modelVersion`
   - `cognitiveTests` (MMSE, CDR, MoCA, Physical Activity).
3. **ScreeningAuditLog**: Tracks latency, payload bodies, and failure traces for all ML proxy calls regardless of resolution success, ensuring observability.

---

## 🚀 Environment & Deployment Strategy

Currently, the deployment is tailored for **Local Development & Demonstrations** only. Production is paused due to the presence of developer-friendly placeholders (empty API keys, `.env` data, etc).

### Local Docker Network (`docker-compose.yml`)
The orchestration binds via `.env` file contexts (no inline vars).
- `mongodb` service bound to host `27017` via a named volume `mongodb_data`.
- `backend` building `Dockerfile.node`, binding to port `5000`.
- `ml-service` building `Dockerfile.python`, port `8001`, volume mounting the `./ml-service/trained_models` directory to avoid re-bundling models on every python code change.

### Steps toward Production Readiness
Before any cloud deployment (AWS/Heroku/Vercel/Render):
1. Complete `.dockerignore` enforcement for all secrets.
2. Centralize runtime Secrets (OAuth keys, secure session strings, strict CORS constraints).
3. Switch `.env` profiles securely. `DEBUG=false` in FastAPI and `NODE_ENV=production` in Node backend.
4. Establish SSL certificates handling (HTTPS bounds).

---

## 🛡️ Testing & Observability

To maintain integration health:
1. **Node Backend**: Tests orchestrated via `Jest` and `Supertest`. Specifically covering `recommendations.test.js` (Google Places API mock resolution) and `screening.test.js` covering timeout/failure modes of the proxy tunnel.
2. **ML Backend**: Orchestrated heavily via `Pytest`. Testing module endpoints with mocked SQLite states, testing Voice extraction methods ensuring WAV generation resolves valid output arrays without crashing `numpy`.
