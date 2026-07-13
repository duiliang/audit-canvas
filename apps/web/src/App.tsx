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
import {
  AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
  applyAuditReview,
  type AuditReview,
  type AuditReviewPatch,
  AuditRun,
  type Finding,
  type FindingCategory,
  type FindingSeverity,
  type FindingStatus
} from "@audit-canvas/schema";
import { IconButton, SeverityBadge, StatusBadge, cx } from "@audit-canvas/ui";
import { repeatedEvidence, sampleRun } from "./sampleRun.js";

type ViewMode = "workbench" | "trace" | "diff" | "findings";
type Locale = "en" | "zh";

const statusOptions: FindingStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "resolved",
  "ignored-with-reason",
  "invalid"
];

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
    allStatus: "All statuses",
    views: "Views",
    workbench: "Workbench",
    provider: "Provider",
    workspaceData: "Workspace data",
    sampleData: "Sample data",
    reviewSaveFailed: "Review save failed",
    none: "None",
    artifactNavigator: "Artifact Navigator",
    findingPanel: "Finding Panel",
    occurrence: "Occurrence",
    path: "Path",
    lines: "Lines",
    heading: "Heading",
    dark: "Dark",
    light: "Light",
    exportJson: "JSON",
    exportMarkdown: "Markdown",
    exportHtml: "HTML",
    sourceBlock: "SourceBlock",
    artifact: "Artifact",
    titleColumn: "Title",
    category: "Category",
    severity: "Severity",
    status: "Status",
    evidenceCount: "Evidence count",
    baseline: "Baseline",
    target: "Target",
    fileHash: "File hash",
    covered: "covered",
    excluded: "excluded",
    findingList: "Finding List"
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
    allStatus: "全部状态",
    views: "视图",
    workbench: "审计工作台",
    provider: "分析器",
    workspaceData: "真实工作区",
    sampleData: "示例数据",
    reviewSaveFailed: "审阅保存失败",
    none: "无",
    artifactNavigator: "制品导航",
    findingPanel: "问题面板",
    occurrence: "出现位置",
    path: "路径",
    lines: "行号",
    heading: "章节",
    dark: "深色",
    light: "浅色",
    exportJson: "导出 JSON",
    exportMarkdown: "导出 Markdown",
    exportHtml: "导出 HTML",
    sourceBlock: "原文块",
    artifact: "制品",
    titleColumn: "标题",
    category: "类别",
    severity: "严重程度",
    status: "状态",
    evidenceCount: "证据数",
    baseline: "基线",
    target: "目标版本",
    fileHash: "文件哈希",
    covered: "已覆盖",
    excluded: "已排除",
    findingList: "问题列表"
  }
} as const;

const statusLabels: Record<Locale, Record<FindingStatus, string>> = {
  en: {
    pending: "pending",
    accepted: "accepted",
    rejected: "rejected",
    resolved: "resolved",
    "ignored-with-reason": "ignored with reason",
    invalid: "invalid"
  },
  zh: {
    pending: "待处理",
    accepted: "已接受",
    rejected: "已拒绝",
    resolved: "已解决",
    "ignored-with-reason": "有理由忽略",
    invalid: "无效"
  }
};

const severityLabels: Record<Locale, Record<FindingSeverity, string>> = {
  en: { info: "info", low: "low", medium: "medium", high: "high", critical: "critical" },
  zh: { info: "提示", low: "低", medium: "中", high: "高", critical: "严重" }
};

const categoryLabels: Record<Locale, Record<FindingCategory, string>> = {
  en: {
    "exact-duplicate": "exact duplicate",
    "near-duplicate": "near duplicate",
    "semantic-duplicate": "semantic duplicate",
    "partial-overlap": "partial overlap",
    contradiction: "contradiction",
    ambiguity: "ambiguity",
    "missing-acceptance-criteria": "missing acceptance criteria",
    "missing-input-output": "missing input/output",
    "missing-error-handling": "missing error handling",
    "non-testable": "non-testable",
    "traceability-gap": "traceability gap",
    "stale-content": "stale content",
    "uncovered-content": "uncovered content",
    "implementation-mismatch": "implementation mismatch",
    "custom-rule": "custom rule"
  },
  zh: {
    "exact-duplicate": "完全重复",
    "near-duplicate": "近似重复",
    "semantic-duplicate": "语义重复",
    "partial-overlap": "部分重叠",
    contradiction: "内容冲突",
    ambiguity: "表述歧义",
    "missing-acceptance-criteria": "缺少验收标准",
    "missing-input-output": "缺少输入输出",
    "missing-error-handling": "缺少错误处理",
    "non-testable": "不可测试",
    "traceability-gap": "追踪缺口",
    "stale-content": "内容过期",
    "uncovered-content": "内容未覆盖",
    "implementation-mismatch": "实现不一致",
    "custom-rule": "自定义规则"
  }
};

export function App({
  run = sampleRun,
  initialReview,
  onReviewChange,
  mode = "sample"
}: {
  run?: AuditRun;
  initialReview?: AuditReview;
  onReviewChange?: (patch: AuditReviewPatch) => void | Promise<void>;
  mode?: "workspace" | "sample";
}): ReactElement {
  const [selectedFindingId, setSelectedFindingId] = useState(run.findings[0]?.findingId ?? "");
  const [selectedArtifactId, setSelectedArtifactId] = useState(run.artifacts[0]?.artifactId ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "all">("all");
  const [view, setView] = useState<ViewMode>("workbench");
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const [dark, setDark] = useState(false);
  const [reviewState, setReviewState] = useState<AuditReview>(
    () => initialReview ?? loadReviewState(run.auditRunId)
  );
  const [saveError, setSaveError] = useState(false);
  const text = labels[locale];
  const reviewedRun = useMemo(() => applyAuditReview(run, reviewState), [reviewState, run]);

  useEffect(() => {
    localStorage.setItem(`audit-canvas:${run.auditRunId}:reviews`, JSON.stringify(reviewState));
  }, [reviewState, run.auditRunId]);

  useEffect(() => {
    localStorage.setItem("audit-canvas:locale", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

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

  const selectedFinding =
    run.findings.find((finding) => finding.findingId === selectedFindingId) ?? run.findings[0];
  const selectedArtifact =
    run.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ??
    run.artifacts[0];
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
    const updatedAt = new Date().toISOString();
    setReviewState((current) => ({
      ...current,
      statusByFinding: { ...current.statusByFinding, [selectedFinding.findingId]: status },
      updatedAt
    }));
    persistReviewPatch({
      auditRunId: run.auditRunId,
      statusByFinding: { [selectedFinding.findingId]: status },
      updatedAt
    });
  }

  function setComment(value: string): void {
    if (!selectedFinding) return;
    const updatedAt = new Date().toISOString();
    setReviewState((current) => ({
      ...current,
      commentsByFinding: { ...current.commentsByFinding, [selectedFinding.findingId]: value },
      updatedAt
    }));
    persistReviewPatch({
      auditRunId: run.auditRunId,
      commentsByFinding: { [selectedFinding.findingId]: value },
      updatedAt
    });
  }

  function persistReviewPatch(patch: AuditReviewPatch): void {
    const save = onReviewChange?.(patch);
    if (!save) return;
    void Promise.resolve(save).then(
      () => setSaveError(false),
      () => setSaveError(true)
    );
  }

  return (
    <div className={cx("app-shell", dark && "theme-dark")}>
      <header className="topbar">
        <div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <nav className="tabs" aria-label={text.views}>
          {(["workbench", "trace", "diff", "findings"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={cx(view === mode && "active")}
              onClick={() => setView(mode)}
            >
              {mode === "workbench"
                ? text.workbench
                : mode === "trace"
                  ? text.trace
                  : mode === "diff"
                    ? text.diff
                    : text.findings}
            </button>
          ))}
        </nav>
        <div className="toolbar">
          <IconButton
            icon={<Download size={16} />}
            label={text.exportJson}
            onClick={() => download("json", reviewedRun, locale)}
          />
          <IconButton
            icon={<Download size={16} />}
            label={text.exportMarkdown}
            onClick={() => download("markdown", reviewedRun, locale)}
          />
          <IconButton
            icon={<Download size={16} />}
            label={text.exportHtml}
            onClick={() => download("html", reviewedRun, locale)}
          />
          <IconButton
            icon={<Languages size={16} />}
            label={locale === "en" ? "中文" : "English"}
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
          />
          <IconButton
            icon={dark ? <Sun size={16} /> : <Moon size={16} />}
            label={dark ? text.light : text.dark}
            onClick={() => setDark(!dark)}
          />
        </div>
      </header>

      <section className="summary-strip" aria-label={text.coverage}>
        <span>{run.auditRunId}</span>
        <span>{run.targetCommit}</span>
        <span>
          {text.coverage}: {run.coveredBlockCount}/{run.sourceBlockCount}
        </span>
        <span>
          {text.provider}: {run.provider === "none" ? text.none : run.provider}
        </span>
        <span>{mode === "workspace" ? text.workspaceData : text.sampleData}</span>
        {saveError && <span role="alert">{text.reviewSaveFailed}</span>}
      </section>

      {view === "workbench" && (
        <main className="review-grid">
          <aside className="panel navigator" aria-label={text.artifactNavigator}>
            <div className="panel-heading">
              <h2>{text.artifactNavigator}</h2>
              <ListFilter size={16} />
            </div>
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.search}
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FindingStatus | "all")}
            >
              <option value="all">{text.allStatus}</option>
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {statusLabels[locale][status]}
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
                    className={cx(
                      "artifact-row",
                      selectedArtifactId === artifact.artifactId && "active"
                    )}
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
                    className={cx(
                      "source-block",
                      selectedEvidenceIds.has(block.blockId) && "highlight"
                    )}
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

          <aside className="panel finding-panel" aria-label={text.findingPanel}>
            <div className="panel-heading">
              <h2>{text.findings}</h2>
              <span>{filteredFindings.length}</span>
            </div>
            <div className="finding-list">
              {filteredFindings.map((finding) => {
                const persistedStatus =
                  reviewState.statusByFinding[finding.findingId] ?? finding.status;
                return (
                  <button
                    className={cx(
                      "finding-row",
                      selectedFindingId === finding.findingId && "active"
                    )}
                    key={finding.findingId}
                    onClick={() => {
                      setSelectedFindingId(finding.findingId);
                      setSelectedArtifactId(finding.evidence[0]?.artifactId ?? selectedArtifactId);
                    }}
                  >
                    <strong>{findingTitle(finding, locale)}</strong>
                    <span>{translateCategory(finding.category, locale)}</span>
                    <StatusBadge
                      status={persistedStatus}
                      label={statusLabels[locale][persistedStatus]}
                    />
                  </button>
                );
              })}
            </div>
            {selectedFinding && (
              <div className="finding-detail">
                <h3>{findingTitle(selectedFinding, locale)}</h3>
                <div className="badge-row">
                  <SeverityBadge
                    severity={selectedFinding.severity}
                    label={severityLabels[locale][selectedFinding.severity]}
                  />
                  <StatusBadge
                    status={
                      reviewState.statusByFinding[selectedFinding.findingId] ??
                      selectedFinding.status
                    }
                    label={
                      statusLabels[locale][
                        reviewState.statusByFinding[selectedFinding.findingId] ??
                          selectedFinding.status
                      ]
                    }
                  />
                  <span>{Math.round(selectedFinding.confidence * 100)}%</span>
                </div>
                <p>{findingExplanation(selectedFinding, locale)}</p>
                <div className="action-row">
                  <IconButton
                    icon={<Check size={16} />}
                    label={text.accepted}
                    onClick={() => setFindingStatus("accepted")}
                  />
                  <IconButton
                    icon={<X size={16} />}
                    label={text.rejected}
                    onClick={() => setFindingStatus("rejected")}
                  />
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
                  <h3>
                    {text.occurrence} {index + 1}
                  </h3>
                  <dl>
                    <dt>{text.path}</dt>
                    <dd>{evidence.sourcePath}</dd>
                    <dt>{text.lines}</dt>
                    <dd>
                      {evidence.startLine}-{evidence.endLine}
                    </dd>
                    <dt>{text.heading}</dt>
                    <dd>{evidence.headingPath.join(" > ") || `(${text.none})`}</dd>
                  </dl>
                  <pre>{evidence.fullText}</pre>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "trace" && <TraceMatrix run={run} locale={locale} />}
      {view === "diff" && <GitDiffView run={run} locale={locale} />}
      {view === "findings" && <FindingTable run={run} reviewState={reviewState} locale={locale} />}
    </div>
  );
}

function TraceMatrix({ run, locale }: { run: AuditRun; locale: Locale }): ReactElement {
  const text = labels[locale];
  return (
    <main className="table-view">
      <h2>{text.trace}</h2>
      <table>
        <thead>
          <tr>
            <th>{text.sourceBlock}</th>
            <th>{text.artifact}</th>
            <th>{text.findings}</th>
            <th>{text.coverage}</th>
          </tr>
        </thead>
        <tbody>
          {run.sourceBlocks.map((block) => {
            const findings = run.findings.filter((finding) =>
              finding.sourceBlockIds.includes(block.blockId)
            );
            return (
              <tr key={block.blockId}>
                <td>{block.blockId}</td>
                <td>
                  {
                    run.artifacts.find((artifact) => artifact.artifactId === block.artifactId)
                      ?.sourcePath
                  }
                </td>
                <td>{findings.map((finding) => finding.findingId).join(", ") || text.covered}</td>
                <td>
                  {run.coverage.excludedSourceBlocks.some(
                    (entry) => entry.sourceBlockId === block.blockId
                  )
                    ? text.excluded
                    : text.covered}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

function GitDiffView({ run, locale }: { run: AuditRun; locale: Locale }): ReactElement {
  const text = labels[locale];
  return (
    <main className="table-view">
      <h2>{text.diff}</h2>
      <table>
        <thead>
          <tr>
            <th>{text.baseline}</th>
            <th>{text.target}</th>
            <th>{text.artifact}</th>
            <th>{text.fileHash}</th>
          </tr>
        </thead>
        <tbody>
          {run.artifacts.map((artifact) => (
            <tr key={artifact.artifactId}>
              <td>{run.baselineCommit ?? text.none}</td>
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

function FindingTable({
  run,
  reviewState,
  locale
}: {
  run: AuditRun;
  reviewState: AuditReview;
  locale: Locale;
}): ReactElement {
  const text = labels[locale];
  return (
    <main className="table-view">
      <h2>{text.findingList}</h2>
      <table>
        <thead>
          <tr>
            <th>{text.titleColumn}</th>
            <th>{text.category}</th>
            <th>{text.severity}</th>
            <th>{text.status}</th>
            <th>{text.evidenceCount}</th>
          </tr>
        </thead>
        <tbody>
          {run.findings.map((finding) => (
            <tr key={finding.findingId}>
              <td>{findingTitle(finding, locale)}</td>
              <td>{translateCategory(finding.category, locale)}</td>
              <td>{severityLabels[locale][finding.severity]}</td>
              <td>
                {
                  statusLabels[locale][
                    reviewState.statusByFinding[finding.findingId] ?? finding.status
                  ]
                }
              </td>
              <td>{finding.evidence.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function loadReviewState(runId: string): AuditReview {
  try {
    const stored = localStorage.getItem(`audit-canvas:${runId}:reviews`);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AuditReview>;
      return {
        schemaVersion: AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
        auditRunId: runId,
        statusByFinding: parsed.statusByFinding ?? {},
        commentsByFinding: parsed.commentsByFinding ?? {},
        updatedAt: parsed.updatedAt ?? new Date(0).toISOString()
      };
    }
  } catch {
    return emptyReview(runId);
  }
  return emptyReview(runId);
}

function emptyReview(auditRunId: string): AuditReview {
  return {
    schemaVersion: AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
    auditRunId,
    statusByFinding: {},
    commentsByFinding: {},
    updatedAt: new Date(0).toISOString()
  };
}

function download(format: "json" | "markdown" | "html", run: AuditRun, locale: Locale): void {
  const content = renderExport(format, run, locale);
  const type =
    format === "json" ? "application/json" : format === "html" ? "text/html" : "text/markdown";
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a") as HTMLAnchorElement;
  anchor.href = url;
  anchor.download = `${run.auditRunId}.${format === "markdown" ? "md" : format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderExport(format: "json" | "markdown" | "html", run: AuditRun, locale: Locale): string {
  if (format === "json") return JSON.stringify(run, null, 2);
  if (format === "markdown") {
    return run.findings
      .map((finding) =>
        [
          `## ${findingTitle(finding, locale)}`,
          findingExplanation(finding, locale),
          ...finding.evidence.map(
            (evidence, index) =>
              `### ${labels[locale].occurrence} ${index + 1}\n${evidence.sourcePath}:${evidence.startLine}-${evidence.endLine}\n\n${evidence.fullText}`
          )
        ].join("\n\n")
      )
      .join("\n\n");
  }
  const language = locale === "zh" ? "zh-CN" : "en";
  return `<html lang="${language}"><body><h1>AuditCanvas ${labels[locale].workbench}</h1><pre>${escapeHtml(JSON.stringify(run, null, 2))}</pre></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function loadLocale(): Locale {
  try {
    return localStorage.getItem("audit-canvas:locale") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function translateCategory(category: FindingCategory, locale: Locale): string {
  return categoryLabels[locale][category];
}

function findingTitle(finding: Finding, locale: Locale): string {
  if (
    finding.ruleId === "local/exact-duplicate" ||
    finding.ruleId === "local/normalized-duplicate"
  ) {
    if (locale === "zh") return `同一内容重复出现 ${finding.evidence.length} 次`;
    return finding.evidence.length === 2
      ? "Duplicate content"
      : `Duplicate content repeated ${finding.evidence.length} times`;
  }
  if (finding.ruleId === "local/near-duplicate") {
    return locale === "zh" ? "发现近似重复内容" : "Near duplicate content";
  }
  if (finding.ruleId === "local/contradiction-seed") {
    return locale === "zh" ? "审查可见性要求相互冲突" : "Review visibility contradiction";
  }
  return finding.title;
}

function findingExplanation(finding: Finding, locale: Locale): string {
  if (
    finding.ruleId === "local/exact-duplicate" ||
    finding.ruleId === "local/normalized-duplicate"
  ) {
    return locale === "zh"
      ? "每一处重复内容均作为完整证据保留。"
      : "Every duplicate occurrence is preserved as full evidence.";
  }
  if (finding.ruleId === "local/near-duplicate") {
    return locale === "zh"
      ? `两个原文块的 token Jaccard 相似度为 ${finding.confidence.toFixed(2)}。`
      : `Two source blocks have token Jaccard similarity ${finding.confidence.toFixed(2)}.`;
  }
  if (finding.ruleId === "local/contradiction-seed") {
    return locale === "zh"
      ? "一个制品要求完整展示，另一个制品却允许隐藏相似失败。"
      : "One artifact requires visibility while another allows hidden similar failures.";
  }
  return finding.explanation;
}

export { repeatedEvidence };
