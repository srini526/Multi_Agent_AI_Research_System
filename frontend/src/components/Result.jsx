import { useState } from "react";
import { downloadPdf } from "../api";
import { ActivityFeed, Icon, Md, STEPS, fmtSec } from "../ui";

async function copyText(t) {
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

const domainOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const pathOf = (u) => {
  try {
    const x = new URL(u);
    const p = (x.pathname + x.search).replace(/^\/+|\/+$/g, "");
    return p.length > 80 ? p.slice(0, 80) + "…" : p;
  } catch {
    return "";
  }
};

function Section({ icon, title, children }) {
  return (
    <details className="glass group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-medium text-slate-200 transition hover:bg-white/5 [&::-webkit-details-marker]:hidden">
        <Icon name={icon} className="h-4 w-4 text-violet-300" />
        {title}
        <Icon name="chevron" className="ml-auto h-4 w-4 text-slate-500 transition group-open:rotate-90" />
      </summary>
      <div className="border-t border-white/10 px-5 py-5">{children}</div>
    </details>
  );
}

function Sources({ urls }) {
  if (!urls.length) return <p className="text-sm text-slate-500">No URLs were found in the agent output.</p>;
  return (
    <div className="glass divide-y divide-white/5 overflow-hidden">
      {urls.map((u) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-violet-500/40 to-cyan-400/30 text-sm font-semibold uppercase text-white ring-1 ring-white/10">
            {domainOf(u).charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{domainOf(u)}</span>
            {pathOf(u) && <span className="block truncate text-xs text-slate-500">/{pathOf(u)}</span>}
          </span>
          <Icon name="link" className="h-4 w-4 flex-none text-slate-600 transition group-hover:text-cyan-300" />
        </a>
      ))}
    </div>
  );
}

export default function Result({ entry }) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState("");

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
    <article className="mt-10 space-y-8">
      <header>
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{entry.topic}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">
            <Icon name="clock" className="h-3.5 w-3.5" /> {when}
          </span>
          <span className="chip">{Math.round(entry.total)}s total</span>
          <span className="chip">{entry.sources.length} sources</span>
          <span className="chip">{words} words</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={onCopy} className="btn-ghost">
            <Icon name={copied ? "check" : "copy"} className={`h-4 w-4 ${copied ? "text-emerald-300" : ""}`} />
            {copied ? "Copied" : "Copy report"}
          </button>
          <button onClick={onPdf} disabled={pdfBusy} className="btn-grad">
            <Icon name="download" /> {pdfBusy ? "Preparing…" : "Download PDF"}
          </button>
          {pdfErr && <span className="text-sm text-rose-300">{pdfErr}</span>}
        </div>
      </header>

      <div className="glass p-6 sm:p-10">
        <Md>{entry.report}</Md>
      </div>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Sources</p>
        <Sources urls={entry.sources} />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</p>
        <Section icon="shield" title="Critic's review">
          <Md>{entry.feedback}</Md>
        </Section>
        <Section icon="clock" title="Run details">
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                <Icon name={s.icon} className="h-4 w-4 text-violet-300" />
                <span className="text-slate-200">{s.name}</span>
                <span className="ml-auto tabular-nums text-slate-400">{fmtSec(entry.durations?.[i])}</span>
              </div>
            ))}
          </div>
          <ActivityFeed log={entry.log} running={false} limit={400} maxH="max-h-96" />
        </Section>
        <Section icon="search" title="Search results">
          <Md>{entry.search}</Md>
        </Section>
        <Section icon="book" title="Scraped content">
          <Md>{entry.scraped}</Md>
        </Section>
        <Section icon="file" title="Raw markdown">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-4 text-[13px] text-slate-300">
            {entry.report}
          </pre>
        </Section>
      </section>
    </article>
  );
}
