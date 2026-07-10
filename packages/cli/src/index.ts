#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExportLocale } from "@audit-canvas/core";
import {
  doctorCommand,
  exportCommand,
  scanCommand,
  serveCommand,
  verifyCoverageCommand
} from "./commands.js";

export function createProgram(): Command {
  const defaultLocale = environmentLocale();
  const zh = defaultLocale === "zh-CN";
  const program = new Command();
  program
    .name("audit-canvas")
    .description(
      zh
        ? "本地优先、保留完整证据的软件制品审计工作台。"
        : "Local-first, evidence-preserving audit workbench for software artifacts."
    )
    .version("0.1.0", "-V, --version", zh ? "显示版本号" : "output the version number")
    .helpOption("-h, --help", zh ? "显示命令帮助" : "display help for command")
    .addHelpCommand("help [command]", zh ? "显示指定命令的帮助" : "display help for command")
    .configureHelp({
      styleTitle: (title: string) => (zh ? localizeHelpTitle(title) : title)
    });

  program
    .command("scan")
    .description(
      zh
        ? "扫描文件或目录，并把审计运行写入 .auditcanvas/。"
        : "Scan a file or directory and write an audit run under .auditcanvas/."
    )
    .argument("[target]", zh ? "要扫描的文件或目录" : "file or directory to scan", ".")
    .option("--baseline <ref>", zh ? "Git 基线引用" : "baseline Git ref")
    .option("--target <ref>", zh ? "Git 目标引用" : "target Git ref", "HEAD")
    .option(
      "--locale <locale>",
      zh ? "报告语言：zh-CN 或 en" : "report locale: zh-CN or en",
      defaultLocale
    )
    .action(
      async (target: string, options: { baseline?: string; target: string; locale: string }) => {
        const locale = parseLocale(options.locale);
        const result = await scanCommand({
          target,
          baseline: options.baseline,
          targetRef: options.target,
          locale
        });
        const outputZh = locale === "zh-CN";
        console.log(`${outputZh ? "审计运行" : "Audit run"}: ${result.run.auditRunId}`);
        console.log(`${outputZh ? "运行文件" : "Run file"}: ${result.runPath}`);
        console.log(`${outputZh ? "问题数" : "Findings"}: ${result.run.findings.length}`);
      }
    );

  program
    .command("export")
    .description(zh ? "导出现有审计运行。" : "Export an existing audit run.")
    .option("--format <format>", zh ? "json、markdown 或 html" : "json, markdown, or html", "html")
    .option(
      "--run <runId>",
      zh ? "审计运行 ID，默认使用 latest" : "audit run ID; defaults to latest"
    )
    .option("--output <path>", zh ? "输出路径" : "output path")
    .option(
      "--locale <locale>",
      zh ? "报告语言：zh-CN 或 en" : "report locale: zh-CN or en",
      defaultLocale
    )
    .action(async (options: { format: string; run?: string; output?: string; locale: string }) => {
      const locale = parseLocale(options.locale);
      const outputZh = locale === "zh-CN";
      const result = await exportCommand({
        format: parseExportFormat(options.format, outputZh),
        runId: options.run,
        outputPath: options.output,
        locale
      });
      console.log(`${outputZh ? "已导出" : "Exported"} ${result.format}: ${result.outputPath}`);
    });

  program
    .command("verify-coverage")
    .description(
      zh ? "验证审计运行的覆盖率不变量。" : "Verify coverage invariants for an audit run."
    )
    .option(
      "--run <runId>",
      zh ? "审计运行 ID，默认使用 latest" : "audit run ID; defaults to latest"
    )
    .action(async (options: { run?: string }) => {
      const result = await verifyCoverageCommand({ runId: options.run });
      console.log(`${zh ? "覆盖率验证通过" : "Coverage OK"}: ${result.run.auditRunId}`);
    });

  program
    .command("doctor")
    .description(
      zh ? "检查本地 AuditCanvas CLI 运行条件。" : "Check local AuditCanvas CLI prerequisites."
    )
    .action(async () => {
      const result = await doctorCommand({ locale: defaultLocale });
      console.log(result.lines.join("\n"));
    });

  program
    .command("serve")
    .description(
      zh
        ? "提供本地 .auditcanvas 报告和运行数据服务。"
        : "Serve local .auditcanvas reports and run data."
    )
    .option("--port <port>", zh ? "监听端口" : "port to listen on", "4738")
    .option(
      "--locale <locale>",
      zh ? "报告语言：zh-CN 或 en" : "report locale: zh-CN or en",
      defaultLocale
    )
    .action(async (options: { port: string; locale: string }) => {
      const locale = parseLocale(options.locale);
      const result = await serveCommand({
        port: Number(options.port),
        locale
      });
      const outputZh = locale === "zh-CN";
      console.log(
        `${outputZh ? "AuditCanvas 服务地址" : "AuditCanvas server listening at"}: ${result.url}`
      );
    });

  return program;
}

function parseExportFormat(value: string, zh: boolean): "json" | "markdown" | "html" {
  if (value === "json" || value === "markdown" || value === "md" || value === "html") {
    return value === "md" ? "markdown" : value;
  }
  throw new Error(`${zh ? "不支持的导出格式" : "Unsupported export format"}: ${value}`);
}

function parseLocale(value: string): ExportLocale {
  if (value === "zh" || value === "zh-CN") return "zh-CN";
  if (value === "en") return "en";
  throw new Error(`不支持的语言 / Unsupported locale: ${value}`);
}

function environmentLocale(): ExportLocale {
  return process.env.AUDIT_CANVAS_LOCALE === "en" ? "en" : "zh-CN";
}

function localizeHelpTitle(title: string): string {
  const titles: Record<string, string> = {
    "Usage:": "用法：",
    "Arguments:": "参数：",
    "Options:": "选项：",
    "Commands:": "命令：",
    "Global Options:": "全局选项："
  };
  return titles[title] ?? title;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await createProgram().parseAsync(process.argv);
}
