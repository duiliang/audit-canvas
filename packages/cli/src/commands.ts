import { createServer } from "node:http";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";
import {
  exportAuditHtml,
  exportAuditJson,
  exportAuditMarkdown,
  runLocalAudit,
  verifyCoverageInvariant,
  type AuditInput,
  type ExportLocale
} from "@audit-canvas/core";
import {
  AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
  applyAuditReview,
  validateAuditReview,
  validateAuditRun,
  type AuditReview,
  type AuditReviewPatch,
  type FindingStatus,
  type AuditRun
} from "@audit-canvas/schema";
import { isGitWorktreeClean, readGitFileAtRef, readGitMetadata } from "@audit-canvas/git";

export type ExportFormat = "json" | "markdown" | "html";

export interface ScanCommandOptions {
  target: string;
  baseline?: string;
  targetRef?: string;
  cwd?: string;
  locale?: ExportLocale;
}

export interface ScanCommandResult {
  run: AuditRun;
  runPath: string;
  reportPaths: Record<ExportFormat, string>;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".yml",
  ".yaml"
]);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".auditcanvas",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  ".turbo",
  ".vite",
  "cache"
]);

const REVIEW_STATUSES = new Set<FindingStatus>([
  "pending",
  "accepted",
  "rejected",
  "resolved",
  "ignored-with-reason",
  "invalid"
]);
const reviewWriteQueues = new Map<string, Promise<void>>();

export async function scanCommand(options: ScanCommandOptions): Promise<ScanCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const targetPath = resolve(cwd, options.target);
  assertTargetInsideWorkspace(cwd, targetPath);
  const metadata = readGitMetadata(cwd, options.targetRef);
  const currentMetadata = readGitMetadata(cwd);
  if (currentMetadata.isGitRepository) {
    if (!isGitWorktreeClean(cwd)) {
      throw new Error("Git 工作树包含未提交的制品改动，无法为证据绑定真实 commit");
    }
    if (metadata.gitCommit !== currentMetadata.gitCommit) {
      throw new Error("当前版本尚未实现从非 HEAD target 读取制品；请先检出目标版本再扫描");
    }
  }
  const files = await discoverFiles(targetPath, cwd);
  const createdAt = new Date().toISOString();
  const inputs: AuditInput[] = [];
  const repositoryRoot = currentMetadata.isGitRepository
    ? await realpath(resolve(currentMetadata.repository))
    : null;

  for (const filePath of files) {
    const content = repositoryRoot
      ? readTrackedGitContent(cwd, repositoryRoot, metadata.gitCommit, await realpath(filePath))
      : await readFile(filePath, "utf8");
    inputs.push({
      sourcePath: normalizePath(relative(cwd, filePath)),
      content,
      repository: metadata.repository,
      gitCommit: metadata.gitCommit,
      gitBranch: metadata.gitBranch,
      createdAt
    });
  }

  const run = runLocalAudit(inputs, {
    baselineCommit: options.baseline ?? null,
    targetCommit: metadata.gitCommit,
    createdAt
  });
  const auditRoot = join(cwd, ".auditcanvas");
  await ensureAuditCanvasLayout(auditRoot);
  await writeConfig(auditRoot);

  const runPath = join(auditRoot, "runs", `${run.auditRunId}.json`);
  await writeFile(runPath, exportAuditJson(run), "utf8");
  const reportPaths = await writeReports(auditRoot, run, options.locale ?? "zh-CN");
  await writeFile(join(auditRoot, "runs", "latest.json"), exportAuditJson(run), "utf8");

  return { run, runPath, reportPaths };
}

export async function exportCommand(options: {
  format: ExportFormat;
  runId?: string;
  outputPath?: string;
  cwd?: string;
  locale?: ExportLocale;
}): Promise<{ run: AuditRun; outputPath: string; format: ExportFormat }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const auditRoot = join(cwd, ".auditcanvas");
  const rawRun = await readRun(auditRoot, options.runId);
  const review = await readAuditReview(auditRoot, rawRun.auditRunId);
  const run = applyAuditReview(rawRun, review);
  const outputPath =
    options.outputPath ??
    join(auditRoot, "reports", `${run.auditRunId}.${extensionForFormat(options.format)}`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderExport(run, options.format, options.locale ?? "zh-CN"), "utf8");
  return { run, outputPath, format: options.format };
}

export async function verifyCoverageCommand(options: {
  runId?: string;
  cwd?: string;
}): Promise<{ run: AuditRun }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const run = await readRun(join(cwd, ".auditcanvas"), options.runId);
  const result = verifyCoverageInvariant(run);
  if (!result.valid) {
    throw new Error(result.message);
  }
  return { run };
}

export async function doctorCommand(
  options: { cwd?: string; locale?: ExportLocale } = {}
): Promise<{ lines: string[] }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const metadata = readGitMetadata(cwd);
  const nodeVersion = process.version;
  const zh = (options.locale ?? "zh-CN") === "zh-CN";
  const gitState = metadata.isGitRepository
    ? zh
      ? `Git 仓库 ${metadata.repository}，提交 ${metadata.gitCommit}`
      : `git repository ${metadata.repository} at ${metadata.gitCommit}`
    : zh
      ? "当前目录不在 Git 仓库中"
      : "not inside a Git repository";
  return {
    lines: [
      zh ? "AuditCanvas 环境检查" : "AuditCanvas doctor",
      `node: ${nodeVersion}`,
      `git: ${gitState}`,
      zh ? "远程分析器：默认关闭" : "remote providers: disabled by default",
      zh ? "数据：本地 .auditcanvas/ 工作区" : "data: local .auditcanvas/ workspace"
    ]
  };
}

export async function serveCommand(options: {
  port: number;
  cwd?: string;
  locale?: ExportLocale;
}): Promise<{ url: string; close: () => Promise<void> }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const auditRoot = join(cwd, ".auditcanvas");
  const webRoot = await resolveWebRoot();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    try {
      if (request.method === "GET" && url.pathname === "/api/latest") {
        const latest = await readRun(auditRoot);
        writeJson(response, 200, latest);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/workspace/latest") {
        const latest = await readRun(auditRoot);
        const review = await readAuditReview(auditRoot, latest.auditRunId);
        writeJson(response, 200, { run: latest, review });
        return;
      }

      const reviewMatch = /^\/api\/reviews\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
      if (request.method === "PATCH" && reviewMatch) {
        const run = await readRun(auditRoot, reviewMatch[1]);
        const patch = await parseReviewPatch(request);
        assertReviewPatchMatchesRun(patch, run);
        const mergedReview = await updateAuditReview(auditRoot, patch);
        writeJson(response, 200, mergedReview);
        return;
      }

      if (request.method === "GET" || request.method === "HEAD") {
        await serveWebAsset(webRoot, url.pathname, request.method === "HEAD", response);
        return;
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end((options.locale ?? "zh-CN") === "zh-CN" ? "未找到" : "Not found");
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(
        error instanceof Error
          ? error.message
          : (options.locale ?? "zh-CN") === "zh-CN"
            ? "未知服务器错误"
            : "Unknown server error"
      );
    }
  });

  await new Promise<void>((resolvePromise) =>
    server.listen(options.port, "127.0.0.1", resolvePromise)
  );
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolvePromise, reject) => {
        server.close((error) => (error ? reject(error) : resolvePromise()));
      })
  };
}

export async function discoverFiles(targetPath: string, cwd: string): Promise<string[]> {
  const currentStat = await stat(targetPath);
  if (currentStat.isFile()) {
    return isSupportedFile(targetPath) ? [targetPath] : [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(entry.name, fullPath, cwd)) {
        continue;
      }
      files.push(...(await discoverFiles(fullPath, cwd)));
      continue;
    }

    if (entry.isFile() && isSupportedFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) =>
    normalizePath(relative(cwd, left)).localeCompare(normalizePath(relative(cwd, right)))
  );
}

async function ensureAuditCanvasLayout(auditRoot: string): Promise<void> {
  await mkdir(join(auditRoot, "runs"), { recursive: true });
  await mkdir(join(auditRoot, "reports"), { recursive: true });
  await mkdir(join(auditRoot, "reviews"), { recursive: true });
  await mkdir(join(auditRoot, "cache"), { recursive: true });
}

async function writeConfig(auditRoot: string): Promise<void> {
  const configPath = join(auditRoot, "config.json");
  const config = {
    schemaVersion: "0.1.0",
    persistRunsInGit: false,
    persistReviewsInGit: true,
    remoteProvidersEnabled: false
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function writeReports(
  auditRoot: string,
  run: AuditRun,
  locale: ExportLocale
): Promise<Record<ExportFormat, string>> {
  const reports: Record<ExportFormat, string> = {
    json: join(auditRoot, "reports", `${run.auditRunId}.json`),
    markdown: join(auditRoot, "reports", `${run.auditRunId}.md`),
    html: join(auditRoot, "reports", `${run.auditRunId}.html`)
  };

  await writeFile(reports.json, exportAuditJson(run), "utf8");
  await writeFile(reports.markdown, exportAuditMarkdown(run, locale), "utf8");
  await writeFile(reports.html, exportAuditHtml(run, locale), "utf8");
  return reports;
}

async function readRun(auditRoot: string, runId?: string): Promise<AuditRun> {
  const runPath = runId
    ? join(auditRoot, "runs", `${runId}.json`)
    : join(auditRoot, "runs", "latest.json");
  const parsed = JSON.parse(await readFile(runPath, "utf8")) as unknown;
  const result = validateAuditRun(parsed);
  if (!result.valid) {
    throw new Error(`审计运行文件无效: ${runPath}`);
  }
  assertSafeAuditRunId(result.data.auditRunId);
  if (runId && result.data.auditRunId !== runId) {
    throw new Error("审计运行文件内容与请求 ID 不匹配");
  }
  return result.data;
}

async function readAuditReview(auditRoot: string, auditRunId: string): Promise<AuditReview> {
  const reviewPath = join(auditRoot, "reviews", `${auditRunId}.json`);
  try {
    const parsed = JSON.parse(await readFile(reviewPath, "utf8")) as unknown;
    const result = validateAuditReview(parsed);
    if (!result.valid) {
      throw new Error(`审阅文件无效: ${reviewPath}`);
    }
    if (result.data.auditRunId !== auditRunId) {
      throw new Error("审阅文件内容与请求 ID 不匹配");
    }
    return result.data;
  } catch (error) {
    if (isMissingFileError(error)) {
      return emptyAuditReview(auditRunId);
    }
    throw error;
  }
}

async function writeAuditReview(auditRoot: string, review: AuditReview): Promise<void> {
  assertSafeAuditRunId(review.auditRunId);
  const reviewsRoot = join(auditRoot, "reviews");
  await mkdir(reviewsRoot, { recursive: true });
  const reviewPath = join(reviewsRoot, `${review.auditRunId}.json`);
  const temporaryPath = join(
    reviewsRoot,
    `.${review.auditRunId}.${process.pid}.${randomUUID()}.tmp`
  );
  await writeFile(temporaryPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  await rename(temporaryPath, reviewPath);
}

async function updateAuditReview(auditRoot: string, patch: AuditReviewPatch): Promise<AuditReview> {
  const queueKey = `${auditRoot}:${patch.auditRunId}`;
  const previous = reviewWriteQueues.get(queueKey) ?? Promise.resolve();
  let mergedReview: AuditReview | undefined;
  const operation = previous.then(async () => {
    await withReviewFileLock(auditRoot, patch.auditRunId, async () => {
      const current = await readAuditReview(auditRoot, patch.auditRunId);
      mergedReview = {
        ...current,
        statusByFinding: { ...current.statusByFinding, ...(patch.statusByFinding ?? {}) },
        commentsByFinding: { ...current.commentsByFinding, ...(patch.commentsByFinding ?? {}) },
        updatedAt: patch.updatedAt
      };
      await writeAuditReview(auditRoot, mergedReview);
    });
  });
  const settled = operation.then(
    () => undefined,
    () => undefined
  );
  reviewWriteQueues.set(queueKey, settled);
  await operation;
  if (reviewWriteQueues.get(queueKey) === settled) {
    reviewWriteQueues.delete(queueKey);
  }
  if (!mergedReview) throw new Error("审阅更新未完成");
  return mergedReview;
}

async function withReviewFileLock<T>(
  auditRoot: string,
  auditRunId: string,
  operation: () => Promise<T>
): Promise<T> {
  const reviewsRoot = join(auditRoot, "reviews");
  await mkdir(reviewsRoot, { recursive: true });
  const lockPath = join(reviewsRoot, `.${auditRunId}.lock`);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        return await operation();
      } finally {
        await handle.close();
        await unlink(lockPath).catch(() => undefined);
      }
    } catch (error) {
      if (!isExclusiveOpenError(error)) throw error;
      await removeStaleReviewLock(lockPath);
      await delay(10);
    }
  }
  throw new Error("等待审阅文件锁超时");
}

async function removeStaleReviewLock(lockPath: string): Promise<void> {
  try {
    const lockStat = await stat(lockPath);
    if (Date.now() - lockStat.mtimeMs > 30_000) {
      await unlink(lockPath);
    }
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function assertSafeAuditRunId(auditRunId: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(auditRunId)) {
    throw new Error("审计运行 ID 包含不安全字符");
  }
}

function emptyAuditReview(auditRunId: string): AuditReview {
  return {
    schemaVersion: AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
    auditRunId,
    statusByFinding: {},
    commentsByFinding: {},
    updatedAt: new Date(0).toISOString()
  };
}

async function parseReviewPatch(
  request: import("node:http").IncomingMessage
): Promise<AuditReviewPatch> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new Error("审阅请求超过 1 MB 限制");
    }
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!isRecord(parsed)) throw new Error("审阅请求格式无效");
  const allowedKeys = new Set(["auditRunId", "statusByFinding", "commentsByFinding", "updatedAt"]);
  if (Object.keys(parsed).some((key) => !allowedKeys.has(key))) {
    throw new Error("审阅请求包含未知字段");
  }
  if (typeof parsed.auditRunId !== "string") throw new Error("审阅请求缺少 auditRunId");
  assertSafeAuditRunId(parsed.auditRunId);
  if (typeof parsed.updatedAt !== "string" || !Number.isFinite(Date.parse(parsed.updatedAt))) {
    throw new Error("审阅请求 updatedAt 无效");
  }
  const statusByFinding = optionalStatusRecord(parsed.statusByFinding);
  const commentsByFinding = optionalCommentRecord(parsed.commentsByFinding);
  if (!statusByFinding && !commentsByFinding) {
    throw new Error("审阅请求没有任何变更");
  }
  return {
    auditRunId: parsed.auditRunId,
    statusByFinding,
    commentsByFinding,
    updatedAt: parsed.updatedAt
  };
}

function assertReviewPatchMatchesRun(patch: AuditReviewPatch, run: AuditRun): void {
  if (patch.auditRunId !== run.auditRunId) {
    throw new Error("审阅记录与审计运行不匹配");
  }
  const findingIds = new Set(run.findings.map((finding) => finding.findingId));
  for (const findingId of [
    ...Object.keys(patch.statusByFinding ?? {}),
    ...Object.keys(patch.commentsByFinding ?? {})
  ]) {
    if (!findingIds.has(findingId)) {
      throw new Error(`审阅记录引用了不存在的问题: ${findingId}`);
    }
  }
}

function optionalStatusRecord(value: unknown): Record<string, FindingStatus> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("statusByFinding 格式无效");
  const result: Record<string, FindingStatus> = {};
  for (const [findingId, status] of Object.entries(value)) {
    if (typeof status !== "string" || !REVIEW_STATUSES.has(status as FindingStatus)) {
      throw new Error(`问题 ${findingId} 的状态无效`);
    }
    result[findingId] = status as FindingStatus;
  }
  return result;
}

function optionalCommentRecord(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || Object.values(value).some((comment) => typeof comment !== "string")) {
    throw new Error("commentsByFinding 格式无效");
  }
  return value as Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function resolveWebRoot(): Promise<string> {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.AUDIT_CANVAS_WEB_DIST,
    resolve(moduleDirectory, "..", "assets", "web"),
    resolve(moduleDirectory, "..", "..", "..", "apps", "web", "dist")
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(join(candidate, "index.html"));
      return resolve(candidate);
    } catch {
      // Try the next supported installation layout.
    }
  }
  throw new Error("未找到 Review Canvas Web 构建产物，请先运行 pnpm build");
}

async function serveWebAsset(
  webRoot: string,
  pathname: string,
  headOnly: boolean,
  response: import("node:http").ServerResponse
): Promise<void> {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
  const filePath = resolve(webRoot, relativePath);
  if (filePath !== webRoot && !filePath.startsWith(`${webRoot}${sep}`)) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(headOnly ? undefined : body);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function contentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json" || extension === ".map") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function writeJson(
  response: import("node:http").ServerResponse,
  status: number,
  value: unknown
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isExclusiveOpenError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function renderExport(run: AuditRun, format: ExportFormat, locale: ExportLocale): string {
  if (format === "json") return exportAuditJson(run);
  if (format === "markdown") return exportAuditMarkdown(run, locale);
  return exportAuditHtml(run, locale);
}

function extensionForFormat(format: ExportFormat): string {
  if (format === "json") return "json";
  if (format === "markdown") return "md";
  return "html";
}

function shouldIgnoreDirectory(name: string, fullPath: string, cwd: string): boolean {
  if (IGNORED_DIRECTORIES.has(name)) return true;
  const relativePath = normalizePath(relative(cwd, fullPath));
  return relativePath === ".auditcanvas/cache";
}

function assertTargetInsideWorkspace(cwd: string, targetPath: string): void {
  const targetRelative = relative(cwd, targetPath);
  if (
    isAbsolute(targetRelative) ||
    targetRelative === ".." ||
    targetRelative.startsWith(`..${sep}`)
  ) {
    throw new Error("扫描目标必须位于当前工作区内");
  }
  const normalized = normalizePath(targetRelative);
  if (normalized === ".auditcanvas" || normalized.startsWith(".auditcanvas/")) {
    throw new Error("不能把 .auditcanvas 生成目录作为扫描目标");
  }
}

function readTrackedGitContent(
  cwd: string,
  repositoryRoot: string,
  commit: string,
  filePath: string
): string {
  const repositoryPath = relative(repositoryRoot, filePath);
  if (
    isAbsolute(repositoryPath) ||
    repositoryPath === ".." ||
    repositoryPath.startsWith(`..${sep}`)
  ) {
    throw new Error(`制品不在当前 Git 仓库中: ${filePath}`);
  }
  const content = readGitFileAtRef(cwd, commit, repositoryPath);
  if (content === null) {
    throw new Error(`制品未被目标 commit 跟踪，不能绑定为 Git 证据: ${filePath}`);
  }
  return content;
}

function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

export function sha256ForCli(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function cliFileUrl(filePath: string): string {
  return pathToFileURL(resolve(filePath)).toString();
}

export function cliPathFromUrl(value: string): string {
  return fileURLToPath(value);
}
