import { useEffect, useRef, useState } from "react";
import { downloadPdf } from "./api";
import { CHARS } from "./Characters";
import { Md, RadioFeed, celebrate, copyText, domainOf, fmtSec, pathOf, useTypewriter, AGENTS } from "./ui";

const CARD_COLORS = ["#FFF3B0", "#FFD1E3", "#CDE6FF", "#D4F5D8", "#E7D6FF", "#FFE0B8"];
const TILTS = [-2.5, 1.8, -1.2, 2.6, -2, 1.2];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function SourceCard({ url, i, reset }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [lean, setLean] = useState(0);
  const start = useRef(null);
  const moved = useRef(false);

  useEffect(() => setPos({ x: 0, y: 0 }), [reset]);

  const open = () => window.open(url, "_blank", "noopener,noreferrer");
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    moved.current = false;
    setDrag(true);
  };
  const move = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.px;
    const dy = e.clientY - start.current.py;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved.current = true;
    setPos({ x: start.current.x + dx, y: start.current.y + dy });
    setLean(clamp(dx / 14, -14, 14));
  };
  const up = () => {
    start.current = null;
    setDrag(false);
    setLean(0);
    if (!moved.current) open();
  };

  const tilt = TILTS[i % TILTS.length];
  return (
    <div
      className={`src-card ${drag ? "drag" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`Open ${domainOf(url)}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(e) => e.key === "Enter" && open()}
      style={{
        background: CARD_COLORS[i % CARD_COLORS.length],
        transform: `translate(${pos.x}px, ${pos.y}px) rotate(${tilt + lean}deg) scale(${drag ? 1.06 : 1})`,
        transition: drag ? "none" : "transform .4s cubic-bezier(.2,1.4,.4,1)",
        zIndex: drag ? 50 : 1,
      }}
    >
      <span className="pin">📌</span>
      <div className="src-num">#{i + 1}</div>
      <div className="src-dom">{domainOf(url)}</div>
      {pathOf(url) && <div className="src-path">/{pathOf(url)}</div>}
      <div className="src-go">open ↗</div>
    </div>
  );
}

function Cork({ urls }) {
  const [reset, setReset] = useState(0);
  return (
    <section className="block">
      <div className="cork-head">
        <h3 className="display">📌 Sources board</h3>
        {urls.length > 0 && (
          <>
            <span className="hint">Drag the cards around · click one to open it</span>
            <button className="btn-pop white small" onClick={() => setReset((r) => r + 1)}>
              🧹 Tidy up
            </button>
          </>
        )}
      </div>
      <div className="cork">
        {urls.length === 0 && <p className="cork-empty">No links were found in the agent output.</p>}
        {urls.map((u, i) => (
          <SourceCard key={u} url={u} i={i} reset={reset} />
        ))}
      </div>
    </section>
  );
}

function Fold({ icon, title, color, children }) {
  return (
    <details className="fold" style={{ "--c": color }}>
      <summary>
        <span className="fold-ico">{icon}</span>
        {title}
        <i className="chev">▸</i>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

export default function Report({ entry, animate, onTyped }) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const tw = useTypewriter(entry.report, animate && !reduce);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState("");
  const Critic = CHARS[3];

  useEffect(() => {
    if (animate) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!tw.typing) onTyped?.(entry.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tw.typing]);

  const words = entry.report.trim().split(/\s+/).filter(Boolean).length;
  const when = entry.finishedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  async function onCopy() {
    if (await copyText(entry.report)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }
  async function onPdf() {
    setPdfErr("");
    setPdfBusy(true);
    try {
      await downloadPdf({ topic: entry.topic, report: entry.report, sources: entry.sources });
    } catch (e) {
      setPdfErr(e.message);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <article className="report">
      <div className="rep-head">
        <div className="kicker">🎉 Research complete</div>
        <h2 className="rep-title">
          <span className="mark">{entry.topic}</span>
        </h2>
        <div className="chips">
          <span className="chip-s">🕒 {when}</span>
          <span className="chip-s">⏱ {Math.round(entry.total)}s</span>
          <span className="chip-s">🔗 {entry.sources.length} sources</span>
          <span className="chip-s">📝 {words} words</span>
        </div>
        <div className="actions">
          <button className="btn-pop blue" onClick={onCopy}>
            {copied ? "✅ Copied!" : "📋 Copy report"}
          </button>
          <button className="btn-pop green" onClick={onPdf} disabled={pdfBusy}>
            {pdfBusy ? "Preparing…" : "⬇️ Download PDF"}
          </button>
          {!tw.typing && (
            <button className="btn-pop white" onClick={tw.replay}>
              ▶ Replay typing
            </button>
          )}
          {pdfErr && <span className="err-inline">{pdfErr}</span>}
        </div>
      </div>

      {tw.typing && (
        <div className="typing-tag sticker">
          <span className="pencil">✏️</span> Scribbles is typing the report…
          <button className="btn-pop white small" onClick={tw.skip}>
            Skip ⏭
          </button>
        </div>
      )}

      <div className="paper">
        <i className="tape t1" />
        <i className="tape t2" />
        {!tw.typing && <div className="approved">REVIEWED ✓</div>}
        <Md>{tw.shown}</Md>
        {tw.typing && <span className="caret" />}
      </div>

      <Cork urls={entry.sources} />

      <section className="block">
        <h3 className="display">🗂 Behind the scenes</h3>
        <div className="folds">
          <Fold icon="🧐" title="Prof. Red's review" color="#9B5DE5">
            <div className="critic-row">
              <div className="critic-av">
                <Critic state="done" />
              </div>
              <div className="critic-bubble">
                <Md>{entry.feedback}</Md>
              </div>
            </div>
          </Fold>
          <Fold icon="⏱" title="Run details" color="#FF9F43">
            <div className="durs">
              {AGENTS.map((a, i) => (
                <div key={a.key} className="dur" style={{ "--c": a.color }}>
                  <span>{a.emoji}</span> {a.name}
                  <b>{fmtSec(entry.durations?.[i])}</b>
                </div>
              ))}
            </div>
            <RadioFeed log={entry.log} running={false} limit={400} maxH="22rem" title="📻 Full radio log" />
          </Fold>
          <Fold icon="🔎" title="Scout's search results" color="#4D96FF">
            <Md>{entry.search}</Md>
          </Fold>
          <Fold icon="📖" title="Bookworm's scraped page" color="#6BCB77">
            <Md>{entry.scraped}</Md>
          </Fold>
          <Fold icon="📄" title="Raw markdown" color="#FF6B9D">
            <pre className="rawmd">{entry.report}</pre>
          </Fold>
        </div>
      </section>
    </article>
  );
}
