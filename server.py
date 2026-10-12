"""
FastAPI backend for the Multi-Agent Research System.

Wraps pipeline.run_research_pipeline() WITHOUT modifying it:
  * the pipeline runs in a worker thread
  * its print() output is captured per-thread and streamed to the browser (SSE),
    including the "Step N - ........." markers used for the live progress UI

Run (dev):   uvicorn server:app --reload --port 8000
Run (prod):  uvicorn server:app --host 0.0.0.0 --port $PORT
"""
import asyncio
import json
import os
import re
import sys
import threading
import time
import traceback
import uuid
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF
from pydantic import BaseModel, Field

from pipeline import run_research_pipeline

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))  # runs at once, whole server
JOB_TTL = 60 * 60                                           # keep finished jobs 1h
LOG_CHUNK_CAP = 20_000
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

STEP_RE = re.compile(r"^Step\s+([1-4])\s+-\s+.*\.{5,}$")
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
URL_RE = re.compile(r"https?://[^\s)\]>\"'<,]+")


# ---------------------------------------------------------------------------
# Per-thread stdout capture (lets us read pipeline.py's prints without editing it)
# ---------------------------------------------------------------------------
class _StdoutRouter:
    def __init__(self, original):
        self._original = original
        self._local = threading.local()

    def write(self, s):
        sink = getattr(self._local, "sink", None)
        if sink is not None:
            try:
                sink(s)
            except Exception:
                pass
        return self._original.write(s)

    def flush(self):
        return self._original.flush()

    def set_sink(self, fn):
        self._local.sink = fn

    def clear_sink(self):
        self._local.sink = None

    def __getattr__(self, name):
        return getattr(self._original, name)


if isinstance(sys.stdout, _StdoutRouter):
    router = sys.stdout
else:
    router = _StdoutRouter(sys.stdout)
    sys.stdout = router


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
class Job:
    def __init__(self, topic: str, ip: str):
        self.id = uuid.uuid4().hex
        self.topic = topic
        self.ip = ip
        self.created = time.time()
        self.status = "running"
        self.events: List[dict] = []

    def emit(self, type_: str, **data):
        self.events.append({"type": type_, "elapsed": round(time.time() - self.created, 2), **data})


jobs = {}
jobs_lock = threading.Lock()


def _cleanup():
    now = time.time()
    for jid in [j.id for j in jobs.values() if j.status != "running" and now - j.created > JOB_TTL]:
        jobs.pop(jid, None)


def as_text(x) -> str:
    return x if isinstance(x, str) else getattr(x, "content", str(x))


def extract_sources(*texts) -> List[str]:
    seen, out = set(), []
    for text in texts:
        for u in URL_RE.findall(text or ""):
            u = u.rstrip(".,;:!?'\"")
            if u not in seen:
                seen.add(u)
                out.append(u)
    return out


def _run_job(job: Job):
    started, durations = {}, {}
    current = None

    def sink(chunk: str):
        nonlocal current
        clean = ANSI_RE.sub("", chunk)
        if not clean:
            return
        m = STEP_RE.match(clean.strip())
        if m:
            idx, now = int(m.group(1)) - 1, time.time()
            if current is not None and current not in durations:
                durations[current] = now - started[current]
            started[idx], current = now, idx
            job.emit("step", step=idx + 1)
        job.emit("log", text=clean[:LOG_CHUNK_CAP])

    router.set_sink(sink)
    try:
        res = run_research_pipeline(job.topic)
        end = time.time()
        if current is not None and current not in durations:
            durations[current] = end - started[current]

        search = as_text(res.get("search_results", ""))
        scraped = as_text(res.get("scraped_results", ""))
        job.emit(
            "result",
            data={
                "report": as_text(res.get("report", "")),
                "feedback": as_text(res.get("feedback", "")),
                "search": search,
                "scraped": scraped,
                "sources": extract_sources(search, scraped),
                "durations": [round(durations[i], 2) if i in durations else None for i in range(4)],
                "total": round(end - job.created, 2),
            },
        )
    except Exception as e:  # never leak internals to the client
        traceback.print_exc()
        job.emit("error", message=f"The research pipeline failed ({type(e).__name__}). Check the server logs.")
    finally:
        router.clear_sink()
        job.status = "finished"
        job.emit("done")


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------
def _clean(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    text = re.sub(r"[*_`]{1,3}", "", text)
    for k, v in {"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
                 "\u2013": "-", "\u2014": "-", "\u2022": "-", "\u2026": "..."}.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "replace").decode("latin-1")


class _PDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")
        self.set_text_color(0)


def build_pdf(topic: str, report: str, sources: List[str]) -> bytes:
    pdf = _PDF()
    pdf.set_auto_page_break(True, 18)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 20)
    pdf.multi_cell(0, 10, _clean(topic), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(110)
    pdf.cell(0, 6, f"Generated {time.strftime('%d %b %Y, %H:%M')}  |  Research Desk", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0)
    pdf.ln(4)

    for raw in report.splitlines():
        line = raw.rstrip()
        if not line.strip():
            pdf.ln(3)
            continue
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            size = {1: 16, 2: 14, 3: 12}.get(len(m.group(1)), 11)
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", size)
            pdf.multi_cell(0, 8, _clean(m.group(2)), new_x="LMARGIN", new_y="NEXT")
            continue
        pdf.set_font("Helvetica", "", 11)
        if re.match(r"^\s*[-*+]\s+", line):
            line = "-  " + re.sub(r"^\s*[-*+]\s+", "", line)
        pdf.multi_cell(0, 6, _clean(line), new_x="LMARGIN", new_y="NEXT")

    if sources:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Sources", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        for u in sources:
            pdf.multi_cell(0, 5, _clean(u), new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
app = FastAPI(title="Research Desk API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str = Field(..., max_length=500)


class PdfRequest(BaseModel):
    topic: str = Field(..., max_length=300)
    report: str = Field(..., max_length=200_000)
    sources: List[str] = Field(default_factory=list)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/research")
def create_job(body: ResearchRequest, request: Request):
    topic = body.topic.strip()
    if not (5 <= len(topic) <= 200):
        raise HTTPException(422, "Topic must be between 5 and 200 characters.")
    ip = _client_ip(request)

    with jobs_lock:
        _cleanup()
        running = [j for j in jobs.values() if j.status == "running"]
        if len(running) >= MAX_CONCURRENT:
            raise HTTPException(429, "The server is busy with other research runs. Please try again in a minute.")
        if any(j.ip == ip for j in running):
            raise HTTPException(429, "You already have a research run in progress.")
        job = Job(topic, ip)
        jobs[job.id] = job

    threading.Thread(target=_run_job, args=(job,), daemon=True).start()
    return {"job_id": job.id}


@app.get("/api/research/{job_id}/events")
async def job_events(job_id: str, request: Request):
    job: Optional[Job] = jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "Unknown or expired job.")

    last = request.headers.get("last-event-id", "")
    start_idx = int(last) + 1 if last.isdigit() else 0

    async def gen():
        idx = start_idx
        last_ping = time.time()
        while True:
            if await request.is_disconnected():
                return
            sent = 0
            while idx < len(job.events) and sent < 50:
                ev = job.events[idx]
                yield f"id: {idx}\ndata: {json.dumps(ev)}\n\n"
                idx += 1
                sent += 1
                if ev["type"] == "done":
                    return
            if sent:
                continue
            if time.time() - last_ping > 15:
                yield ": ping\n\n"
                last_ping = time.time()
            await asyncio.sleep(0.15)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.post("/api/pdf")
def make_pdf(body: PdfRequest):
    if len(body.sources) > 100:
        raise HTTPException(422, "Too many sources.")
    data = build_pdf(body.topic, body.report, body.sources)
    name = re.sub(r"\W+", "_", body.topic).strip("_").lower()[:60] or "report"
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}_report.pdf"'},
    )


# Serve the built React app when present (single-container deployment).
_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
if os.path.isdir(_DIST):
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="web")
