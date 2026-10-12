import { useState } from "react";
import { fmtSec, useTick } from "./ui";

const EXAMPLES = [
  "How do solid-state batteries work?",
  "Is the Great Barrier Reef recovering?",
  "What is quantum error correction?",
  "How are AI agents used in healthcare?",
];

export function Floaters() {
  const items = [
    ["🔬", "6%", "18%", "0s"],
    ["📝", "88%", "12%", "1.5s"],
    ["🔍", "8%", "62%", "3s"],
    ["✨", "92%", "55%", "2s"],
    ["📊", "4%", "88%", "4s"],
    ["🧪", "90%", "86%", "1s"],
  ];
  return (
    <div className="floaters" aria-hidden="true">
      {items.map(([e, l, t, d]) => (
        <span key={e} className="fl" style={{ left: l, top: t, animationDelay: d }}>
          {e}
        </span>
      ))}
    </div>
  );
}

export function Header({ count, onOpen, disabled }) {
  return (
    <header className="top">
      <div className="logo">
        <span className="logo-mark">🔬</span>
        <span className="logo-text">
          Research <span className="logo-lab">Lab</span>
        </span>
      </div>
      <button className="btn-pop white" onClick={onOpen} disabled={disabled}>
        📒 Notebook
        {count > 0 && <span className="count">{count}</span>}
      </button>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="kicker">🧑‍🔬 Four agents. One question. Zero boring.</div>
      <h1>
        What should the lab <span className="hl y">research</span> <span className="hl p">today?</span>
      </h1>
      <p>
        Scout finds the sources, Bookworm reads them, Scribbles writes the report and Prof. Red marks it up. Pick a
        topic and watch them work. (You can poke them, they like it.)
      </p>
    </section>
  );
}

export function AskBox({ onSubmit, busy }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");

  const go = (text) => {
    const t = text.trim();
    if (t.length < 5) return setErr("Give the lab a bit more to go on (at least 5 characters)!");
    setErr("");
    onSubmit(t);
  };

  return (
    <div>
      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <label className="ask-field sticker">
          <span className="ask-ico">🔭</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            maxLength={200}
            placeholder="What do you want researched?"
            aria-label="Research topic"
          />
        </label>
        <button type="submit" className="btn-pop pink big" disabled={busy}>
          {busy ? "Lab is busy…" : "Start research!"} <span>🚀</span>
        </button>
      </form>
      {err && <div className="ask-err">{err}</div>}
      {!busy && (
        <div className="examples">
          <span>Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="ex-chip"
              onClick={() => {
                setValue(ex);
                go(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RunBanner({ run }) {
  const now = useTick(500);
  const secs = run.sync.elapsed + (now - run.sync.at) / 1000;
  return (
    <div className="banner sticker">
      <span className="banner-ico">🧪</span>
      <div className="banner-text">
        Researching <b>“{run.topic}”</b>
      </div>
      <span className="banner-time">⏱ {fmtSec(secs)}</span>
    </div>
  );
}

export function ErrorCard({ message, onDismiss }) {
  return (
    <div className="oops sticker">
      <span className="oops-ico">💥</span>
      <div>
        <div className="display oops-title">Oops! The lab had a mishap</div>
        <p>{message}</p>
      </div>
      <button className="btn-pop white" onClick={onDismiss}>
        Okay
      </button>
    </div>
  );
}

const NOTE_COLORS = ["#FFF3B0", "#FFD1E3", "#CDE6FF", "#D4F5D8", "#E7D6FF", "#FFE0B8"];

export function Notebook({ open, onClose, history, currentId, onSelect, onClear }) {
  return (
    <>
      {open && <div className="nb-overlay" onClick={onClose} />}
      <aside className={`nb-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="nb-head">
          <h2 className="display">📒 Lab notebook</h2>
          <button className="btn-pop white small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="nb-list">
          {history.length === 0 && <p className="nb-empty">Nothing here yet. Your finished research shows up as sticky notes!</p>}
          {[...history].reverse().map((e, idx) => (
            <button
              key={e.id}
              className={`note ${e.id === currentId ? "active" : ""}`}
              style={{ background: NOTE_COLORS[idx % NOTE_COLORS.length], "--tilt": `${idx % 2 ? 1.2 : -1.2}deg` }}
              onClick={() => {
                onSelect(e.id);
                onClose();
              }}
            >
              <span className="note-pin">📌</span>
              <span className="note-title">{e.topic}</span>
              <span className="note-meta">
                {e.finishedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {e.sources.length} sources
              </span>
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <div className="nb-foot">
            <button className="btn-pop white small" onClick={onClear}>
              🗑 Clear notebook
            </button>
            <p>Notes live in this tab only and vanish on refresh.</p>
          </div>
        )}
      </aside>
    </>
  );
}
