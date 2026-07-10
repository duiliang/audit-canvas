import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative, resolve } from "node:path";
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
import type { AuditRun } from "@audit-canvas/schema";
import { readGitMetadata } from "@audit-canvas/git";

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
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  ".turbo",
  ".vite",
  "cache"
]);

export async function scanCommand(options: ScanCommandOptions): Promise<ScanCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const targetPath = resolve(cwd, options.target);
  const metadata = readGitMetadata(cwd, options.targetRef);
  const files = await discoverFiles(targetPath, cwd);
  const createdAt = new Date().toISOString();
  const inputs: AuditInput[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
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
  const run = await readRun(auditRoot, options.runId);
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
}): Promise<{ url: string }> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const auditRoot = join(cwd, ".auditcanvas");
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const latest = await readRun(auditRoot);
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(exportAuditHtml(latest, options.locale ?? "zh-CN"));
        return;
      }
      if (url.pathname === "/api/latest") {
        const latest = await readRun(auditRoot);
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(exportAuditJson(latest));
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
  return { url: `http://127.0.0.1:${address.port}` };
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
  return JSON.parse(await readFile(runPath, "utf8")) as AuditRun;
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
