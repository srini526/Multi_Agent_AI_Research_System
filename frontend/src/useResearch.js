import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startResearch, streamJob } from "./api";

const LOG_CAP = 200000;
let seq = 0;

export function useResearch() {
  const [phase, setPhase] = useState("idle"); // idle | running | error
  const [run, setRun] = useState(null); // live run: { topic, starts[4], sync, log }
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // in-memory only (cleared on refresh)
  const [currentId, setCurrentId] = useState(null);

  const stopRef = useRef(null);
  const logRef = useRef("");
  const timerRef = useRef(null);
  const topicRef = useRef("");

  const cleanup = () => {
    stopRef.current?.();
    stopRef.current = null;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => cleanup, []);

  const fail = useCallback((e) => {
    cleanup();
    setError(e?.message || "Something went wrong.");
    setPhase("error");
    setRun(null);
  }, []);

  const handle = useCallback(
    (ev) => {
      const sync = { elapsed: ev.elapsed ?? 0, at: Date.now() };
      if (ev.type === "step") {
        setRun((r) => r && { ...r, starts: r.starts.map((s, i) => (i === ev.step - 1 ? ev.elapsed : s)), sync });
      } else if (ev.type === "log") {
        logRef.current = (logRef.current + ev.text).slice(-LOG_CAP);
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setRun((r) => r && { ...r, log: logRef.current });
          }, 120);
        }
      } else if (ev.type === "result") {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        const entry = {
          id: `${Date.now()}-${++seq}`,
          topic: topicRef.current,
          finishedAt: new Date(),
          log: logRef.current,
          ...ev.data,
        };
        setHistory((h) => [...h, entry]);
        setCurrentId(entry.id);
        setRun(null);
        setPhase("idle");
      } else if (ev.type === "error") {
        fail(new Error(ev.message));
      }
    },
    [fail]
  );

  const start = useCallback(
    async (topic) => {
      cleanup();
      logRef.current = "";
      topicRef.current = topic;
      setError("");
      setCurrentId(null);
      setPhase("running");
      setRun({ topic, starts: [null, null, null, null], sync: { elapsed: 0, at: Date.now() }, log: "" });
      try {
        const jobId = await startResearch(topic);
        stopRef.current = streamJob(jobId, handle, fail);
      } catch (e) {
        fail(e);
      }
    },
    [handle, fail]
  );

  const select = useCallback((id) => {
    setError("");
    setCurrentId(id);
  }, []);
  const newSession = useCallback(() => {
    setError("");
    setCurrentId(null);
  }, []);
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentId(null);
  }, []);
  const dismissError = useCallback(() => {
    setError("");
    setPhase("idle");
  }, []);

  const current = useMemo(() => history.find((e) => e.id === currentId) || null, [history, currentId]);

  return { phase, run, error, history, current, currentId, start, select, newSession, clearHistory, dismissError };
}
