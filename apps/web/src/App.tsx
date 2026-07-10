import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Check,
  CheckCircle2,
  Download,
  Languages,
  ListFilter,
  Moon,
  Search,
  Sun,
  X
} from "lucide-react";
import type { AuditRun, FindingStatus } from "@audit-canvas/schema";
import { IconButton, SeverityBadge, StatusBadge, cx } from "@audit-canvas/ui";
import { repeatedEvidence, sampleRun } from "./sampleRun.js";

type ViewMode = "workbench" | "trace" | "diff" | "findings";
type Locale = "en" | "zh";

interface ReviewState {
  statusByFinding: Record<string, FindingStatus>;
  commentsByFinding: Record<string, string>;
}

const statusOptions: FindingStatus[] = ["pending", "accepted", "rejected", "resolved", "ignored-with-reason"];

const labels = {
  en: {
    title: "AuditCanvas",
    subtitle: "Evidence-preserving Review Canvas",
    search: "Search",
    coverage: "Coverage",
    evidence: "Evidence Compare",
    source: "Source Viewer",
    findings: "Findings",
    trace: "Trace Matrix",
    diff: "Git Diff",
    accepted: "Accept",
    rejected: "Reject",
    resolved: "Resolve",
    comment: "Reviewer comment",
    allStatus: "All statuses"
  },
  zh: {
    title: "AuditCanvas",
    subtitle: "保留完整证据的审计工作台",
    search: "搜索",
    coverage: "覆盖率",
    evidence: "证据对比",
    source: "原文视图",
    findings: "问题",
    trace: "追踪矩阵",
    diff: "Git 差异",
    accepted: "接受",
    rejected: "拒绝",
    resolved: "解决",
    comment: "人工批注",
    allStatus: "全部状态"
  }
} as const;

export function App({ run = sampleRun }: { run?: AuditRun }): ReactElement {
  const [selectedFindingId, setSelectedFindingId] = useState(run.findings[0]?.findingId ?? "");
  const [selectedArtifactId, setSelectedArtifactId] = useState(run.artifacts[0]?.artifactId ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "all">("all");
  const [view, setView] = useState<ViewMode>("workbench");
  const [locale, setLocale] = useState<Locale>("en");
  const [dark, setDark] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>(() => loadReviewState(run.auditRunId));
  const text = labels[locale];

  useEffect(() => {
    localStorage.setItem(`audit-canvas:${run.auditRunId}:reviews`, JSON.stringify(reviewState));
  }, [reviewState, run.auditRunId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFinding(1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFinding(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const selectedFinding = run.findings.find((finding) => finding.findingId === selectedFindingId) ?? run.findings[0];
  const selectedArtifact = run.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? run.artifacts[0];
  const selectedEvidenceIds = new Set(selectedFinding?.sourceBlockIds ?? []);

  const filteredFindings = useMemo(() => {
    const lowered = query.toLowerCase();
    return run.findings.filter((finding) => {
      const persistedStatus = reviewState.statusByFinding[finding.findingId] ?? finding.status;
      const statusMatch = statusFilter === "all" || persistedStatus === statusFilter;
      const queryMatch =
        lowered.length === 0 ||
        finding.title.toLowerCase().includes(lowered) ||
        finding.category.toLowerCase().includes(lowered) ||
        finding.evidence.some((evidence) => evidence.fullText.toLowerCase().includes(lowered));
      return statusMatch && queryMatch;
    });
  }, [query, reviewState.statusByFinding, run.findings, statusFilter]);

  function moveFinding(delta: number): void {
    const index = run.findings.findIndex((finding) => finding.findingId === selectedFindingId);
    const next = run.findings[(index + delta + run.findings.length) % run.findings.length];
    if (next) {
      setSelectedFindingId(next.findingId);
      setSelectedArtifactId(next.evidence[0]?.artifactId ?? selectedArtifactId);
    }
  }

  function setFindingStatus(status: FindingStatus): void {
    if (!selectedFinding) return;
    setReviewState((current) => ({
      ...current,
      statusByFinding: { ...current.statusByFinding, [selectedFinding.findingId]: status }
    }));
  }

  function setComment(value: string): void {
    if (!selectedFinding) return;
    setReviewState((current) => ({
      ...current,
      commentsByFinding: { ...current.commentsByFinding, [selectedFinding.findingId]: value }
    }));
  }

  return (
    <div className={cx("app-shell", dark && "theme-dark")}>
      <header className="topbar">
        <div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <nav className="tabs" aria-label="Views">
          {(["workbench", "trace", "diff", "findings"] as ViewMode[]).map((mode) => (
            <button key={mode} className={cx(view === mode && "active")} onClick={() => setView(mode)}>
              {mode === "workbench" ? "Workbench" : mode === "trace" ? text.trace : mode === "diff" ? text.diff : text.findings}
            </button>
          ))}
        </nav>
        <div className="toolbar">
          <IconButton icon={<Download size={16} />} label="JSON" onClick={() => download("json", run)} />
          <IconButton icon={<Download size={16} />} label="Markdown" onClick={() => download("markdown", run)} />
          <IconButton icon={<Download size={16} />} label="HTML" onClick={() => download("html", run)} />
          <IconButton
            icon={<Languages size={16} />}
            label={locale === "en" ? "中文" : "English"}
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
          />
          <IconButton
            icon={dark ? <Sun size={16} /> : <Moon size={16} />}
            label={dark ? "Light" : "Dark"}
            onClick={() => setDark(!dark)}
          />
        </div>
      </header>

      <section className="summary-strip" aria-label="Audit coverage">
        <span>{run.auditRunId}</span>
        <span>{run.targetCommit}</span>
        <span>
          {text.coverage}: {run.coveredBlockCount}/{run.sourceBlockCount}
        </span>
        <span>Provider: {run.provider}</span>
      </section>

      {view === "workbench" && (
        <main className="review-grid">
          <aside className="panel navigator" aria-label="Artifact Navigator">
            <div className="panel-heading">
              <h2>Artifact Navigator</h2>
              <ListFilter size={16} />
            </div>
            <label className="search-box">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FindingStatus | "all")}>
              <option value="all">{text.allStatus}</option>
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
            <div className="artifact-list">
              {run.artifacts.map((artifact) => {
                const count = run.findings.filter((finding) =>
                  finding.evidence.some((evidence) => evidence.artifactId === artifact.artifactId)
                ).length;
                return (
                  <button
                    className={cx("artifact-row", selectedArtifactId === artifact.artifactId && "active")}
                    key={artifact.artifactId}
                    onClick={() => setSelectedArtifactId(artifact.artifactId)}
                  >
                    <span>{artifact.sourcePath}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="panel source-viewer" aria-label={text.source}>
            <div className="panel-heading">
              <h2>{text.source}</h2>
              <span>{selectedArtifact?.fileHash}</span>
            </div>
            <div className="source-meta">
              <span>{selectedArtifact?.sourcePath}</span>
              <span>{selectedArtifact?.gitCommit}</span>
            </div>
            <div className="source-blocks">
              {run.sourceBlocks
                .filter((block) => block.artifactId === selectedArtifact?.artifactId)
                .map((block) => (
                  <article
                    className={cx("source-block", selectedEvidenceIds.has(block.blockId) && "highlight")}
                    key={block.blockId}
                  >
                    <div className="line-range">
                      {block.startLine}-{block.endLine}
                    </div>
                    <pre>{block.fullText}</pre>
                  </article>
                ))}
            </div>
          </section>

          <aside className="panel finding-panel" aria-label="Finding Panel">
            <div className="panel-heading">
              <h2>{text.findings}</h2>
              <span>{filteredFindings.length}</span>
            </div>
            <div className="finding-list">
              {filteredFindings.map((finding) => {
                const persistedStatus = reviewState.statusByFinding[finding.findingId] ?? finding.status;
                return (
                  <button
                    className={cx("finding-row", selectedFindingId === finding.findingId && "active")}
                    key={finding.findingId}
                    onClick={() => {
                      setSelectedFindingId(finding.findingId);
                      setSelectedArtifactId(finding.evidence[0]?.artifactId ?? selectedArtifactId);
                    }}
                  >
                    <strong>{finding.title}</strong>
                    <span>{finding.category}</span>
                    <StatusBadge status={persistedStatus} />
                  </button>
                );
              })}
            </div>
            {selectedFinding && (
              <div className="finding-detail">
                <h3>{selectedFinding.title}</h3>
                <div className="badge-row">
                  <SeverityBadge severity={selectedFinding.severity} />
                  <StatusBadge status={reviewState.statusByFinding[selectedFinding.findingId] ?? selectedFinding.status} />
                  <span>{Math.round(selectedFinding.confidence * 100)}%</span>
                </div>
                <p>{selectedFinding.explanation}</p>
                <div className="action-row">
                  <IconButton icon={<Check size={16} />} label={text.accepted} onClick={() => setFindingStatus("accepted")} />
                  <IconButton icon={<X size={16} />} label={text.rejected} onClick={() => setFindingStatus("rejected")} />
                  <IconButton
                    icon={<CheckCircle2 size={16} />}
                    label={text.resolved}
                    onClick={() => setFindingStatus("resolved")}
                  />
                </div>
                <label className="comment-box">
                  <span>{text.comment}</span>
                  <textarea
                    value={reviewState.commentsByFinding[selectedFinding.findingId] ?? ""}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>
              </div>
            )}
          </aside>

          <section className="panel evidence-compare" aria-label={text.evidence}>
            <div className="panel-heading">
              <h2>{text.evidence}</h2>
              <span>{selectedFinding?.evidence.length ?? 0}</span>
            </div>
            <div className="evidence-grid">
              {selectedFinding?.evidence.map((evidence, index) => (
                <article className="evidence-item" key={evidence.evidenceId}>
                  <h3>Occurrence {index + 1}</h3>
                  <dl>
                    <dt>Path</dt>
                    <dd>{evidence.sourcePath}</dd>
                    <dt>Lines</dt>
                    <dd>
                      {evidence.startLine}-{evidence.endLine}
                    </dd>
                    <dt>Heading</dt>
                    <dd>{evidence.headingPath.join(" > ") || "(none)"}</dd>
                  </dl>
                  <pre>{evidence.fullText}</pre>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "trace" && <TraceMatrix run={run} />}
      {view === "diff" && <GitDiffView run={run} />}
      {view === "findings" && <FindingTable run={run} reviewState={reviewState} />}
    </div>
  );
}

function TraceMatrix({ run }: { run: AuditRun }): ReactElement {
  return (
    <main className="table-view">
      <h2>Trace Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>SourceBlock</th>
            <th>Artifact</th>
            <th>Findings</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {run.sourceBlocks.map((block) => {
            const findings = run.findings.filter((finding) => finding.sourceBlockIds.includes(block.blockId));
            return (
              <tr key={block.blockId}>
                <td>{block.blockId}</td>
                <td>{run.artifacts.find((artifact) => artifact.artifactId === block.artifactId)?.sourcePath}</td>
                <td>{findings.map((finding) => finding.findingId).join(", ") || "covered"}</td>
                <td>{run.coverage.excludedSourceBlocks.some((entry) => entry.sourceBlockId === block.blockId) ? "excluded" : "covered"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

function GitDiffView({ run }: { run: AuditRun }): ReactElement {
  return (
    <main className="table-view">
      <h2>Git Diff</h2>
      <table>
        <thead>
          <tr>
            <th>Baseline</th>
            <th>Target</th>
            <th>Artifact</th>
            <th>File hash</th>
          </tr>
        </thead>
        <tbody>
          {run.artifacts.map((artifact) => (
            <tr key={artifact.artifactId}>
              <td>{run.baselineCommit ?? "none"}</td>
              <td>{artifact.gitCommit}</td>
              <td>{artifact.sourcePath}</td>
              <td>{artifact.fileHash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function FindingTable({ run, reviewState }: { run: AuditRun; reviewState: ReviewState }): ReactElement {
  return (
    <main className="table-view">
      <h2>Finding List</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Evidence count</th>
          </tr>
        </thead>
        <tbody>
          {run.findings.map((finding) => (
            <tr key={finding.findingId}>
              <td>{finding.title}</td>
              <td>{finding.category}</td>
              <td>{finding.severity}</td>
              <td>{reviewState.statusByFinding[finding.findingId] ?? finding.status}</td>
              <td>{finding.evidence.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function loadReviewState(runId: string): ReviewState {
  try {
    const stored = localStorage.getItem(`audit-canvas:${runId}:reviews`);
    if (stored) {
      return JSON.parse(stored) as ReviewState;
    }
  } catch {
    return { statusByFinding: {}, commentsByFinding: {} };
  }
  return { statusByFinding: {}, commentsByFinding: {} };
}

function download(format: "json" | "markdown" | "html", run: AuditRun): void {
  const content = renderExport(format, run);
  const type = format === "json" ? "application/json" : format === "html" ? "text/html" : "text/markdown";
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a") as HTMLAnchorElement;
  anchor.href = url;
  anchor.download = `${run.auditRunId}.${format === "markdown" ? "md" : format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderExport(format: "json" | "markdown" | "html", run: AuditRun): string {
  if (format === "json") return JSON.stringify(run, null, 2);
  if (format === "markdown") {
    return run.findings
      .map((finding) =>
        [
          `## ${finding.title}`,
          finding.explanation,
          ...finding.evidence.map(
            (evidence, index) =>
              `### Occurrence ${index + 1}\n${evidence.sourcePath}:${evidence.startLine}-${evidence.endLine}\n\n${evidence.fullText}`
          )
        ].join("\n\n")
      )
      .join("\n\n");
  }
  return `<html><body><h1>AuditCanvas</h1><pre>${escapeHtml(JSON.stringify(run, null, 2))}</pre></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export { repeatedEvidence };
