import { useState } from "react";
import { Icon, STEPS } from "../ui";

export function Hero() {
  return (
    <header>
      <span className="chip">
        <Icon name="sparkles" className="h-3.5 w-3.5 text-violet-300" />
        Multi-agent AI research
      </span>
      <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
        Ask once.
        <br />
        <span className="gradient-text">Four agents do the research.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
        A search agent finds sources, a reader digs into the best one, a writer drafts the report and a critic
        reviews it — all from a single question.
      </p>
    </header>
  );
}

export function HowItWorks() {
  return (
    <section className="mt-12">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">How it works</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={s.name} className="glass flex gap-4 p-5">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-200 ring-1 ring-white/10">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs text-slate-500">Step {i + 1}</div>
              <div className="font-semibold text-white">{s.name}</div>
              <div className="mt-0.5 text-sm leading-relaxed text-slate-400">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SearchBox({ onSubmit, busy }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    const t = value.trim();
    if (t.length < 5) return setErr("Please enter a more specific topic (at least 5 characters).");
    if (t.length > 200) return setErr("Please keep the topic under 200 characters.");
    setErr("");
    onSubmit(t);
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <div className="glass flex items-center gap-2 p-2 pl-4 transition focus-within:border-violet-400/50 focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.18)]">
        <Icon name="search" className="h-5 w-5 flex-none text-slate-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          maxLength={200}
          placeholder="What do you want to research?"
          aria-label="Research topic"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-white placeholder-slate-500 outline-none disabled:opacity-60"
        />
        <button type="submit" disabled={busy} className="btn-grad">
          {busy ? "Researching…" : "Research"}
        </button>
      </div>
      {err && <p className="mt-2 pl-2 text-sm text-rose-300">{err}</p>}
    </form>
  );
}

export function ErrorCard({ message, onDismiss }) {
  return (
    <div className="glass mt-8 flex items-start gap-3 border-rose-400/30 p-5">
      <Icon name="alert" className="mt-0.5 h-5 w-5 flex-none text-rose-300" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">Something went wrong</div>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
      </div>
      <button onClick={onDismiss} className="btn-ghost !px-3 !py-1.5">
        Dismiss
      </button>
    </div>
  );
}
