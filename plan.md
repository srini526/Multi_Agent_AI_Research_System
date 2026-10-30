# Multi-Agent AI Research System — Development Plan

This roadmap proposes improvements to the existing React + FastAPI research application. The current implementation already includes Tavily-backed source discovery, a search agent, a tool-restricted reader, a report writer, a critic, Python-controlled source records, SSE progress, a PDF endpoint, and a bounded in-memory job manager.

## Product direction

Make research runs more reproducible, source-auditable, resilient to tool/model failures, and easier to evaluate while retaining a clear multi-agent workflow.

## Phase 1 — Pipeline correctness and test coverage

- [ ] Add unit tests for parsing Tavily result records, URL validation, source deduplication, and retrieval-status assignment.
- [ ] Test that only URLs returned in actual Tavily tool output are eligible for scraping and citation.
- [ ] Test successful, inaccessible, non-HTML, timed-out, and malformed source responses.
- [ ] Add pipeline tests with mocked LLMs and search/scrape tools so CI does not require live API credentials.
- [ ] Test reader-agent constraints: it must use supplied evidence only and cannot call tools.
- [ ] Test writer output cleanup and trusted source-section construction.
- [ ] Test critic behavior for unknown source IDs, unsupported claims, and incomplete evidence.
- [ ] Add API tests for topic validation, concurrency limits, same-IP duplicate jobs, unknown job IDs, and PDF validation.
- [ ] Add frontend tests for job start, SSE reconnect/resume, error handling, report display, and export.

**Exit criteria:** the core pipeline and API have deterministic regression tests and do not depend on live providers in CI.

## Phase 2 — Source provenance and research quality

- [ ] Store structured metadata for every source: search query, title, returned URL, snippet, retrieval timestamp, HTTP status, page title, and retrieval outcome.
- [ ] Preserve the exact tool-returned URL as the source identity; never reconstruct links from LLM output.
- [ ] Distinguish snippet-only sources from successfully retrieved page content in the UI and report.
- [ ] Add source quality signals such as primary-source preference, publication date, domain, and duplicate/cross-source detection.
- [ ] Support a configurable source count and safe scraping budget instead of hard-coding the current maximum of three pages.
- [ ] Add claim-to-source checks that identify claims without evidence and citations whose cited source does not support the claim.
- [ ] Add a research evaluation set with representative topics and human-reviewed expected sources/facts.
- [ ] Track source coverage, citation precision, unsupported-claim rate, and report completeness.

**Exit criteria:** users can inspect what was searched, what was retrieved, and which sources support each report section.

## Phase 3 — Agent orchestration and reviewer quality

- [ ] Define explicit typed contracts for search records, reader notes, writer sections, and critic findings.
- [ ] Replace brittle print-marker progress parsing with structured pipeline events or LangGraph streaming.
- [ ] Add bounded retries and backoff for rate limits, transient provider errors, and page retrieval failures.
- [ ] Make each agent's task and allowed evidence/tools explicit and testable.
- [ ] Evaluate whether an independent evidence-synthesis step improves report accuracy before writing.
- [ ] Let critic findings be structured by severity, affected claim, source ID, and recommended correction.
- [ ] Add a bounded revision loop with a clear stop condition if report generation is revised in the future.
- [ ] Keep model-generated suggestions separate from verified tool and retrieval metadata.

**Exit criteria:** workflow state is typed, agent boundaries are enforced, and failures are recoverable without inventing research evidence.

## Phase 4 — Job lifecycle and scalability

- [ ] Persist job state and events so runs survive application restarts.
- [ ] Add a durable job queue before increasing deployment to multiple API instances.
- [ ] Introduce job cancellation and explicit queued/running/succeeded/failed/cancelled states.
- [ ] Add expiration cleanup for result payloads and event logs.
- [ ] Add per-user authentication or access control before exposing private or costly research runs publicly.
- [ ] Add per-user and global quotas, request size limits, and provider-spend safeguards.
- [ ] Make SSE reconnection behavior reliable across server restarts when jobs are persisted.
- [ ] Add idempotency keys to reduce duplicate jobs from repeated requests.

**Exit criteria:** research state is not limited to one process's memory and scaling behavior is deliberate.

## Phase 5 — User experience and export

- [ ] Add source inspection with title, domain, date, retrieval status, and relevant extracted excerpts.
- [ ] Improve report navigation with a table of contents and section-level source references.
- [ ] Add copy/export options for Markdown and structured JSON alongside PDF.
- [ ] Add saved research history backed by an API/database rather than only frontend session state.
- [ ] Add report regeneration or targeted section refinement with a visible audit trail.
- [ ] Improve PDF typography, Unicode handling, long-link wrapping, and bibliography layout.
- [ ] Make accessibility, keyboard controls, reduced motion, and mobile rendering part of UI regression tests.

**Exit criteria:** users can review, save, reopen, and export a research run with its source evidence intact.

## Phase 6 — Deployment and operations

- [ ] Create a documented `.env.example` that matches the actual provider integrations.
- [ ] Add CI for frontend build/lint and backend tests.
- [ ] Pin or constrain dependencies and review compatibility as LangChain providers change.
- [ ] Add structured logs, request IDs, model latency, source retrieval latency, token usage, and error counters.
- [ ] Add provider health diagnostics and actionable configuration errors.
- [ ] Restrict CORS, enable HTTPS, configure secrets through the host, and add usage/budget alerts.
- [ ] Review SSRF, redirect handling, private IP resolution, DNS rebinding, and HTML scraping limits.
- [ ] Add deployment documentation for the currently supported container or hosting path and avoid stale provider-specific steps.

**Exit criteria:** a repeatable deployment can be monitored, configured securely, and diagnosed without exposing secrets or private research content.

## Suggested order

1. Phase 1 — Tests and deterministic pipeline behavior
2. Phase 2 — Source provenance and research quality
3. Phase 3 — Typed agent workflow and recovery
4. Phase 4 — Durable jobs and access control
5. Phase 5 — Saved research and export experience
6. Phase 6 — Production operations and deployment hardening

Build the test harness and source-provenance evaluation before expanding the number of agents or adding more model providers.
