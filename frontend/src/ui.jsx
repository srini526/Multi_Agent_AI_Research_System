import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import confetti from "canvas-confetti";

/* ------------------------------------------------------------------ */
/* The four lab members                                                */
/* ------------------------------------------------------------------ */
export const AGENTS = [
  { key: "search", name: "Scout", role: "Search agent", color: "#4D96FF", emoji: "🗺️" },
  { key: "reader", name: "Bookworm", role: "Reader agent", color: "#6BCB77", emoji: "📚" },
  { key: "writer", name: "Scribbles", role: "Writer", color: "#FF6B9D", emoji: "🗒️" },
  { key: "critic", name: "Prof. Red", role: "Critic", color: "#9B5DE5", emoji: "☕" },
];

export const IDLE = [
  "Give us a topic and watch me go! 🔎",
  "I read the best page, cover to cover 📖",
  "I turn it all into a report ✍️",
  "I review it. Gently. Maybe. 🧐",
];
export const WAITING = [
  ["Warming up…"],
  ["Waiting for my turn… 💤", "Wake me when the links arrive!"],
  ["Sharpening my pencil… ✏️", "Zzz… save me a page"],
  ["Saving my red pen 🖍️", "Wake me for the draft!"],
];
export const WORKING = [
  ["Scanning the web… 🌐", "So many tabs open!", "Ooh, that looks promising!", "Hunting for fresh sources…"],
  ["Reading every word… 👓", "Highlighting the good bits", "This page is juicy!", "Skimming with style…"],
  ["Drafting furiously ✍️", "Finding just the right words…", "Adding a snappy intro", "Almost a masterpiece…"],
  ["Red pen at the ready! 🖍️", "Hmm, let me check that…", "Fact-checking everything", "Nitpicking (lovingly)"],
];
export const POKE = [
  ["Hey, I'm browsing here! 😆", "Tickles!", "Got a topic yet?"],
  ["Shhh, I'm reading! 🤫", "Oops, lost my page!", "Careful with the glasses!"],
  ["Don't smudge the ink! ✏️", "Ha! Plot twist!", "I need a coffee ☕"],
  ["Mind the red pen! 🖍️", "Hoo-hoo! Who poked me?", "Ten out of ten. Poke."],
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
export const fmtSec = (s) => (s == null ? "" : `${s.toFixed(1)}s`);

export const URL_RE = /https?:\/\/[^\s)\]>"'<,]+/g;
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const STEP_DOTS = /^Step\s+([1-4])\s+-\s+(.*?)\.{5,}$/;

export const domainOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
export const pathOf = (u) => {
  try {
    const x = new URL(u);
    const p = (x.pathname + x.search).replace(/^\/+|\/+$/g, "");
    return p.length > 60 ? p.slice(0, 60) + "…" : p;
  } catch {
    return "";
  }
};

/** Split the captured pipeline output into one bucket per agent (by the "Step N" markers). */
export function agentStats(log) {
  const segs = [[], [], [], []];
  let cur = -1;
  for (const raw of (log || "").replace(ANSI, "").split(/\r?\n/)) {
    const s = raw.trim();
    const m = s.match(STEP_DOTS);
    if (m) {
      cur = Number(m[1]) - 1;
      continue;
    }
    if (cur < 0 || !s || /^=+$/.test(s)) continue;
    segs[cur].push(s);
  }
  return segs.map((lines) => {
    const text = lines.join("\n");
    const urls = [...new Set((text.match(URL_RE) || []).map((u) => u.replace(/[.,;:!?'")\]]+$/, "")))];
    return {
      last: lines[lines.length - 1] || "",
      urls,
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      chars: text.length,
    };
  });
}

function tailLines(log, limit) {
  const out = [];
  for (const raw of (log || "").replace(ANSI, "").split(/\r?\n/)) {
    const s = raw.trim();
    if (!s || /^=+$/.test(s)) continue;
    const m = s.match(STEP_DOTS);
    if (m) out.push({ type: "step", n: Number(m[1]), text: m[2] });
    else out.push({ type: "text", text: raw.length > 300 ? raw.slice(0, 300) + "…" : raw });
  }
  return out.slice(-limit);
}

export async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const a = document.createElement("textarea");
    a.value = t;
    document.body.appendChild(a);
    a.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* ignore */
    }
    a.remove();
    return ok;
  }
}

export function celebrate() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#FFD23F", "#FF6B9D", "#4D96FF", "#6BCB77", "#9B5DE5", "#FF9F43"];
  const end = Date.now() + 1000;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.75 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 140, spread: 110, startVelocity: 38, origin: { y: 0.5 }, colors, scalar: 1.1 });
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
export function useTick(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Reveals `text` progressively, like the Writer typing it out. */
export function useTypewriter(text, auto) {
  const [n, setN] = useState(auto ? 0 : text.length);
  const [typing, setTyping] = useState(!!auto);
  const timer = useRef(null);

  const run = useCallback(() => {
    clearTimeout(timer.current);
    setN(0);
    setTyping(true);
    const step = Math.max(4, Math.ceil(text.length / 150)); // ~7s total
    let cur = 0;
    const tick = () => {
      cur = Math.min(text.length, cur + step);
      setN(cur);
      if (cur >= text.length) {
        setTyping(false);
        return;
      }
      timer.current = setTimeout(tick, 45);
    };
    timer.current = setTimeout(tick, 250);
  }, [text]);

  useEffect(() => {
    if (auto) run();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = useCallback(() => {
    clearTimeout(timer.current);
    setN(text.length);
    setTyping(false);
  }, [text]);

  let end = n;
  const c = text.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end += 1; // don't cut an emoji in half
  return { shown: text.slice(0, end), typing, skip, replay: run };
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */
export function Md({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}

/** The "lab radio": raw agent output, chat-ticker style. */
export function RadioFeed({ log, running, limit = 10, maxH = "14rem", title = "📻 Lab radio" }) {
  const ref = useRef(null);
  const lines = useMemo(() => tailLines(log, limit), [log, limit]);
  useEffect(() => {
    if (running && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines, running]);

  return (
    <div className="radio">
      <div className="radio-head">
        <span className={`dot ${running ? "on" : ""}`} />
        {title}
      </div>
      <div className="radio-body" ref={ref} style={{ maxHeight: maxH }}>
        {lines.length === 0 && <div className="r-line">…static… waiting for the agents to start talking…</div>}
        {lines.map((l, i) =>
          l.type === "step" ? (
            <div key={i} className="r-step">
              {AGENTS[l.n - 1].emoji} {AGENTS[l.n - 1].name}: {l.text}
            </div>
          ) : (
            <div key={i} className="r-line">
              {l.text}
            </div>
          )
        )}
      </div>
    </div>
  );
}
