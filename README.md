# Research Desk — React + FastAPI frontend for the Multi-Agent Research System

Your `agent.py`, `pipeline.py`, `tools.py` stay **unchanged**. `server.py` wraps `run_research_pipeline()`
and streams its progress to the React app.

```
your-project/
├── agent.py  pipeline.py  tools.py  requirements.txt  .env     (yours, untouched)
├── server.py                 FastAPI backend (new)
├── requirements-web.txt      fastapi, uvicorn, fpdf2 (new)
├── Dockerfile  .dockerignore (optional, single-container deploy)
└── frontend/                 Vite + React + Tailwind (new)
```

## Run locally

Backend (project root, same venv as your agents):
```bash
pip install -r requirements.txt -r requirements-web.txt
uvicorn server:app --reload --port 8000
```

Frontend (second terminal):
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (/api is proxied to :8000)
```

## How it works
- `POST /api/research {topic}` starts the pipeline in a worker thread and returns a `job_id`.
- `GET /api/research/{job_id}/events` is a Server-Sent Events stream: step markers, live agent output,
  then the final result. It reconnects/resumes automatically.
- `POST /api/pdf` builds the PDF download.
- Safeguards: topic 5–200 chars, one active run per IP, `MAX_CONCURRENT_JOBS` (default 2) server-wide.

## Deploy (pick one when you decide)

**A) One container (simplest)** — FastAPI serves the built React app:
```bash
docker build -t research-desk .
docker run -p 8000:8000 --env-file .env research-desk      # http://localhost:8000
```
Works on Render / Railway / Fly.io / any VM: set your API keys as environment variables.

**B) Split hosting** — frontend on Vercel/Netlify, backend on Render/Railway:
1. Backend env: `CORS_ORIGINS=https://your-frontend.vercel.app`
2. Frontend env at build time: `VITE_API_URL=https://your-backend.onrender.com`

## Notes
- History is in-memory in the browser tab (cleared on refresh), as requested.
- The pipeline runs in a thread, so a long run keeps going if the user closes the tab.
- PDF uses built-in fonts: characters outside Latin-1 (e.g. emoji) become `?`.
