import { useEffect, useMemo, useRef, useState } from "react";
import { CHARS } from "./Characters";
import { AGENTS, IDLE, POKE, URL_RE, WAITING, WORKING, agentStats, domainOf, fmtSec, useTick } from "./ui";

const pick = (arr, now, i) => arr[(Math.floor(now / 3200) + i) % arr.length];
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const kfmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function doneLine(i, st) {
  if (i === 0) return st.urls.length ? `Found ${plural(st.urls.length, "source")}! 🎉` : "Search complete! 🎉";
  if (i === 1) return st.chars > 400 ? `Devoured ${kfmt(st.chars)} characters! 📖` : "Page read! 📖";
  if (i === 2) return st.words ? `Drafted ${st.words} words! ✍️` : "Draft ready! ✍️";
  return "Review done. Looks good! 👍";
}

function counterChip(i, st) {
  if (i === 0 && st.urls.length) return `🔗 ${plural(st.urls.length, "link")}`;
  if (i === 1 && st.chars) return `📄 ${kfmt(st.chars)} chars`;
  if (i === 2 && st.words) return `📝 ${st.words} words`;
  return null;
}

function Station({ i, row, st, now }) {
  const a = AGENTS[i];
  const Char = CHARS[i];
  const [poke, setPoke] = useState(null);
  const [jump, setJump] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function onPoke() {
    const q = POKE[i][Math.floor(Math.random() * POKE[i].length)];
    setPoke(q);
    setJump((j) => j + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoke(null), 2400);
  }

  let b;
  if (poke) b = { text: poke };
  else if (row.state === "idle") b = { text: IDLE[i] };
  else if (row.state === "waiting") b = { text: pick(WAITING[i], now, i) };
  else if (row.state === "working") {
    let text = pick(WORKING[i], now, i);
    const found = i === 0 ? (st.last.match(URL_RE) || [])[0] : null;
    if (found) text = `Ooh, found ${domainOf(found)}! 👀`;
    b = { text, live: st.last ? clip(st.last, 64) : "" };
  } else b = { text: doneLine(i, st) };

  const stampText = { idle: "READY", waiting: "ZZZ", working: "WORKING!", done: "DONE ✓" }[row.state];
  const chip = row.state === "working" || row.state === "done" ? counterChip(i, st) : null;

  return (
    <div className={`station ${row.state}`} style={{ "--c": a.color }}>
      <div className="bubble">
        <div className="btext" key={b.text}>
          {b.text}
        </div>
        {b.live && <div className="blive">{b.live}</div>}
      </div>
      <div className="spot" />
      <button className="char" onClick={onPoke} aria-label={`Poke ${a.name}`}>
        <div key={jump} className={jump ? "cwrap jump" : "cwrap"}>
          <Char state={row.state} />
        </div>
      </button>
      <div className="desk">
        <div className="desk-top">
          <span className="badge">{i + 1}</span>
          <div>
            <div className="aname">{a.name}</div>
            <div className="arole">{a.role}</div>
          </div>
          <span className="demoji" aria-hidden="true">
            {a.emoji}
          </span>
        </div>
        <div className="desk-bottom">
          <span className={`stamp ${row.state}`} key={row.state}>
            {stampText}
          </span>
          {row.time != null && <span className="time">{fmtSec(row.time)}</span>}
        </div>
        {chip && <div className="chipc">{chip}</div>}
      </div>
    </div>
  );
}

/** run = live run (while researching) · entry = a finished run · neither = idle lab */
export default function Stage({ run, entry }) {
  const now = useTick(250);
  const log = run ? run.log : entry ? entry.log : "";
  const stats = useMemo(() => agentStats(log), [log]);
  const live = run ? run.sync.elapsed + (now - run.sync.at) / 1000 : 0;

  const rows = AGENTS.map((_, i) => {
    if (run) {
      const st = run.starts[i];
      const next = run.starts[i + 1];
      if (st == null) {
        return i === 0 && run.starts.every((s) => s == null) ? { state: "working", time: null } : { state: "waiting" };
      }
      if (next != null) return { state: "done", time: next - st };
      return { state: "working", time: Math.max(0, live - st) };
    }
    if (entry) return { state: "done", time: entry.durations?.[i] ?? null };
    return { state: "idle" };
  });

  return (
    <div className="stage">
      {AGENTS.map((a, i) => (
        <div className="cell" key={a.key}>
          <Station i={i} row={rows[i]} st={stats[i]} now={now} />
          {i < AGENTS.length - 1 && (
            <div className={`hand ${rows[i].state === "done" && rows[i + 1].state === "working" ? "on" : ""}`} aria-hidden="true">
              📄
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
