# Research Lab — Multi-Agent AI Research System

A React + FastAPI web app for your multi-agent research pipeline. Four agents (search, read, write, critique)
work live on screen as animated characters, then hand you a report you can copy or download as a PDF.

Your `agent.py`, `pipeline.py` and `tools.py` are **not modified**. `server.py` wraps
`run_research_pipeline()` and streams its progress to the browser.

## Project structure

```
your-project/
├── agent.py  pipeline.py  tools.py  requirements.txt  .env     your original files (untouched)
├── server.py                 FastAPI backend: API + serves the built React app
├── requirements-web.txt      fastapi, uvicorn, fpdf2
├── Dockerfile                builds React, then runs FastAPI (one container)
├── .dockerignore             keeps .env / node_modules out of the image
├── .gcloudignore             keeps .env / node_modules out of the Cloud Run upload
├── deploy-cloudrun.sh        one-command deploy to Google Cloud Run
└── frontend/                 Vite + React + Tailwind
    └── src/
        ├── App.jsx           page layout and state wiring
        ├── Characters.jsx    four SVG agents with idle / waiting / working / done moods
        ├── Stage.jsx         desks, live speech bubbles, click-to-poke, handoff animation
        ├── Report.jsx        typed-out report, draggable source cards, details folds, confetti
        ├── Home.jsx          header, ask box, notebook (history) drawer, error card
        ├── ui.jsx            shared helpers (log parsing, markdown, typewriter, confetti)
        ├── useResearch.js    run state, live progress, in-session history
        ├── api.js            API client (start job, SSE stream, PDF download)
        └── index.css         all styling and animations
```

## Run locally

Requires Python 3.10+ and Node 18+.

**1. Backend** (project root, same virtual environment as your agents):
```bash
pip install -r requirements.txt -r requirements-web.txt
uvicorn server:app --reload --port 8000
```

**2. Frontend** (second terminal):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. In dev, Vite proxies `/api` to the backend on port 8000.

**Production-style check** (what the deployed app does):
```bash
cd frontend && npm run build && cd ..
uvicorn server:app --port 8000        # now serves the UI at http://localhost:8000
```

## How it works

1. The browser calls `POST /api/research` with a topic and gets a `job_id`.
2. The server runs your pipeline in a worker thread and captures its `print()` output, including the
   `Step N - ...........` markers.
3. The browser opens `GET /api/research/{job_id}/events` (Server-Sent Events) and receives step changes,
   live agent output, and finally the result. The stream reconnects and resumes automatically.
4. `POST /api/pdf` builds the PDF download.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/research` | Start a run, returns `{ "job_id": ... }` |
| `GET /api/research/{job_id}/events` | Live event stream (SSE) |
| `POST /api/pdf` | Generate the report PDF |

## Configuration (environment variables)

| Variable | Where | Default | Purpose |
|---|---|---|---|
| your API keys | backend | — | Whatever `agent.py` reads (kept in `.env` locally) |
| `MAX_CONCURRENT_JOBS` | backend | `2` | Research runs allowed at once, server-wide |
| `CORS_ORIGINS` | backend | `http://localhost:5173` | Comma-separated allowed origins (only needed if the frontend is hosted separately) |
| `PORT` | backend | `8000` | Set automatically by hosts such as Cloud Run |
| `VITE_API_URL` | frontend build | empty | Backend URL when frontend and backend are on different hosts |

Built-in safeguards: topic length 5–200 characters, one active run per IP, a server-wide concurrency cap,
and generic error messages to the client (details stay in the server logs).

## Deploy for free on Google Cloud Run

Cloud Run's free monthly allowance is enough for a hobby project (a card is needed to enable billing; set a
budget alert so you notice any spend).

1. **Test locally first** (see "Production-style check" above).
2. **Create a Google Cloud project** at console.cloud.google.com, note the **Project ID**, link a billing
   account, and add a $1 budget alert (Billing → Budgets & alerts).
3. **Install the gcloud CLI** (cloud.google.com/sdk/docs/install), then:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```
4. **Deploy** from the project root:
   ```bash
   chmod +x deploy-cloudrun.sh
   ./deploy-cloudrun.sh YOUR_PROJECT_ID
   ```
   The script converts your `.env` into Cloud Run environment variables and deploys with: 1 instance max,
   1 vCPU, 1 GiB memory, 15-minute timeout, public access. The first build takes several minutes. The
   **Service URL** is printed at the end.
   (Windows PowerShell without Git Bash: create `env.yaml` with lines like `KEY: "value"` and run
   `gcloud run deploy research-desk --source . --region us-central1 --allow-unauthenticated --max-instances 1 --cpu 1 --memory 1Gi --timeout 900 --env-vars-file env.yaml`, then delete `env.yaml`.)
5. **Test**: open the URL, run a topic, and check `YOUR_URL/api/health`.
6. **Update later**: re-run `./deploy-cloudrun.sh YOUR_PROJECT_ID`.

Logs:
```bash
gcloud run services logs read research-desk --region us-central1 --limit 50
```

Tear down: `gcloud run services delete research-desk --region us-central1` (or delete the project).

### Important deployment notes
- **Keep `--max-instances 1`.** Run state is held in memory, so a second instance would not find a run that
  started on the first.
- **The service is public.** Anyone with the URL can start runs that use your API keys. Set spending limits
  with your LLM and search providers.
- **Cold starts:** the first visit after an idle period is slower while the container starts.
- **Restarts** can cut off a run that is in progress.
- **Old builds** accumulate in Artifact Registry (`cloud-run-source-deploy`); delete old images occasionally.

### Other hosting options
- **Render (free web service):** push the project to GitHub (without `.env`), create a Web Service with the
  Docker runtime and the Free instance type, and add your env vars. Limits: 512 MB RAM, spins down after 15
  minutes idle, and takes about a minute to wake.
- **Split hosting** (frontend on Vercel/Netlify, backend elsewhere): set `VITE_API_URL` at frontend build time
  and `CORS_ORIGINS` on the backend.
- **Any Docker host:** `docker build -t research-lab .` then
  `docker run -p 8000:8000 --env-file .env research-lab`.

## Troubleshooting

| Problem | Likely fix |
|---|---|
| Build fails during `pip install` | A package is missing from `requirements.txt`, or your local Python version differs from the `python:3.11-slim` in the `Dockerfile` |
| "Container failed to start" | Check the logs; usually an import error or a missing environment variable |
| Run stops with a memory error | Redeploy with `--memory 2Gi` |
| "The server is busy" (429) | Another run is active; wait, or raise `MAX_CONCURRENT_JOBS` |
| "You already have a run in progress" | One active run per IP is allowed; wait for it to finish |
| Blank page in dev | Run `npm install` in `frontend/` and make sure the backend is running on port 8000 |
| Live progress doesn't update in dev | Restart `npm run dev`; the `/api` proxy is configured in `vite.config.js` |

## Notes
- Run history lives in the browser tab only and clears on refresh.
- A run keeps going on the server if the user closes the tab, but the result is lost with it.
- The PDF uses built-in fonts, so characters outside Latin-1 (for example emoji) appear as `?`.
- The report cannot stream word by word because the pipeline only produces it at the end; the typing
  animation plays once the result arrives.