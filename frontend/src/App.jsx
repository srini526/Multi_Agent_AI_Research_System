import { useCallback, useState } from "react";
import { useResearch } from "./useResearch";
import Stage from "./Stage";
import Report from "./Report";
import { AskBox, ErrorCard, Floaters, Header, Hero, Notebook, RunBanner } from "./Home";
import { RadioFeed } from "./ui";
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"

export default function App() {
  const { phase, run, error, history, current, currentId, start, select, newSession, clearHistory, dismissError } =
    useResearch();
  const [book, setBook] = useState(false);
  const [typed, setTyped] = useState(() => new Set()); // reports that already "typed themselves out"
  const markTyped = useCallback((id) => setTyped((s) => (s.has(id) ? s : new Set(s).add(id))), []);
  const running = phase === "running";

  
  return (
    <div className="app">
      <Floaters />
      <Header count={history.length} onOpen={() => setBook(true)} disabled={running} />

      <main className="wrap">
        {!running && !current && <Hero />}
        <AskBox onSubmit={start} busy={running} />
        {error && <ErrorCard message={error} onDismiss={dismissError} />}
        {running && run && <RunBanner run={run} />}

        <Stage run={running ? run : null} entry={!running ? current : null} />

        {running && run && <RadioFeed log={run.log} running />}
        {!running && current && (
          <Report key={current.id} entry={current} animate={!typed.has(current.id)} onTyped={markTyped} />
        )}
      </main>

      <footer className="foot">Made with ☕ and four very opinionated agents</footer>

      <Notebook
        open={book}
        onClose={() => setBook(false)}
        history={history}
        currentId={currentId}
        onSelect={(id) => {
          select(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onClear={() => {
          clearHistory();
          newSession();
        }}
      />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
