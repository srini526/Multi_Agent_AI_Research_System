import { ActivityFeed, Icon, STEPS, fmtSec, useTick } from "../ui";

function Indicator({ state, icon }) {
  if (state === "done") {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]">
        <Icon name="check" className="h-4 w-4" />
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-violet-500/25 text-violet-100 shadow-[0_0_26px_rgba(139,92,246,0.75)] ring-1 ring-violet-400/50">
        <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/30 motion-reduce:animate-none" />
        <Icon name={icon} className="relative h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-slate-500">
      <Icon name={icon} className="h-4 w-4" />
    </span>
  );
}

export default function Progress({ run }) {
  const now = useTick(250);
  const live = run.sync.elapsed + (now - run.sync.at) / 1000;

  const rows = STEPS.map((s, i) => {
    const st = run.starts[i];
    const next = run.starts[i + 1];
    if (st == null) return { ...s, state: "pending" };
    if (next != null) return { ...s, state: "done", time: next - st };
    return { ...s, state: "running", time: Math.max(0, live - st) };
  });
  const done = rows.filter((r) => r.state === "done").length;
  const running = rows.some((r) => r.state === "running");
  const pct = ((done + (running ? 0.5 : 0)) / STEPS.length) * 100;

  return (
    <section className="mt-10 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Researching</p>
        <h2 className="mt-1 text-2xl font-semibold leading-snug text-white">{run.topic}</h2>
        <p className="mt-1 text-sm text-slate-500">This usually takes one to three minutes · {fmtSec(live)} elapsed</p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(pct, 3)}%`, backgroundImage: "linear-gradient(90deg,#7c3aed,#06b6d4,#ec4899)" }}
        />
      </div>

      <div className="glass p-3 sm:p-4">
        {rows.map((r, i) => (
          <div key={r.name} className="relative flex items-center gap-4 px-2 py-3">
            {i < rows.length - 1 && (
              <span
                className={`absolute left-[26px] top-[52px] h-[calc(100%-28px)] w-px ${
                  r.state === "done" ? "bg-gradient-to-b from-violet-400/70 to-cyan-300/30" : "bg-white/10"
                }`}
              />
            )}
            <Indicator state={r.state} icon={r.icon} />
            <div className="min-w-0 flex-1">
              <div className={`font-medium ${r.state === "pending" ? "text-slate-500" : "text-white"}`}>{r.name}</div>
              <div className="text-sm text-slate-500">{r.desc}</div>
            </div>
            <div className="text-sm tabular-nums text-slate-400">{fmtSec(r.time)}</div>
          </div>
        ))}
      </div>

      <ActivityFeed log={run.log} running />
    </section>
  );
}
