// Same origin by default (Vite proxy in dev, FastAPI serving the build in prod).
// Set VITE_API_URL when the frontend is hosted separately from the backend.
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function startResearch(topic) {
  const r = await fetch(`${API}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!r.ok) {
    let msg = "Could not start the research run.";
    try {
      const j = await r.json();
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail)) msg = "Please check your topic and try again.";
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await r.json()).job_id;
}

// Server-Sent Events: EventSource reconnects automatically and resumes via Last-Event-ID.
export function streamJob(jobId, onEvent, onFail) {
  const es = new EventSource(`${API}/api/research/${jobId}/events`);
  es.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    onEvent(ev);
    if (ev.type === "done") es.close();
  };
  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) onFail(new Error("Connection to the server was lost."));
  };
  return () => es.close();
}

export async function downloadPdf({ topic, report, sources }) {
  const r = await fetch(`${API}/api/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, report, sources }),
  });
  if (!r.ok) throw new Error("Could not generate the PDF.");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = topic.replace(/\W+/g, "_").replace(/^_|_$/g, "").toLowerCase().slice(0, 60) || "report";
  a.href = url;
  a.download = `${slug}_report.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
