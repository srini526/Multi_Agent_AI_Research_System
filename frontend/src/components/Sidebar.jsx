import { Icon } from "../ui";

export default function Sidebar({ history, currentId, onSelect, onNew, onClear, open, onClose, disabled }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#0a0a14]/85 backdrop-blur-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_8px_24px_-6px_rgba(124,58,237,0.8)]">
            <Icon name="sparkles" className="h-4.5 w-4.5 text-white" />
          </span>
          <div className="font-semibold leading-tight text-white">
            Research Desk
            <div className="text-[11px] font-normal text-slate-500">Multi-agent AI</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <div className="px-4">
          <button
            className="btn-grad w-full"
            disabled={disabled}
            onClick={() => {
              onNew();
              onClose();
            }}
          >
            <Icon name="plus" /> New research
          </button>
        </div>

        <div className="mt-6 px-5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">History</div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {history.length === 0 && (
            <p className="px-2 py-1 text-sm leading-relaxed text-slate-500">
              Your research from this session will show up here.
            </p>
          )}
          {[...history].reverse().map((e) => {
            const active = e.id === currentId;
            return (
              <button
                key={e.id}
                disabled={disabled}
                onClick={() => {
                  onSelect(e.id);
                  onClose();
                }}
                title={e.topic}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                  active
                    ? "bg-gradient-to-r from-violet-500/25 to-cyan-400/10 text-white ring-1 ring-white/10"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon name="file" className={`h-4 w-4 flex-none ${active ? "text-violet-300" : "text-slate-500"}`} />
                <span className="truncate">{e.topic}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          {history.length > 0 && (
            <button onClick={onClear} disabled={disabled} className="mb-2 text-sm text-slate-400 hover:text-white disabled:opacity-50">
              Clear history
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-slate-600">History is kept in this tab only and clears on refresh.</p>
        </div>
      </aside>
    </>
  );
}
