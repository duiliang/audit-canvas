#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  doctorCommand,
  exportCommand,
  scanCommand,
  serveCommand,
  verifyCoverageCommand
} from "./commands.js";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("audit-canvas")
    .description("Local-first, evidence-preserving audit workbench for software artifacts.")
    .version("0.1.0");

  program
    .command("scan")
    .description("Scan a file or directory and write an audit run under .auditcanvas/.")
    .argument("[target]", "file or directory to scan", ".")
    .option("--baseline <ref>", "baseline Git ref")
    .option("--target <ref>", "target Git ref", "HEAD")
    .action(async (target: string, options: { baseline?: string; target: string }) => {
      const result = await scanCommand({ target, baseline: options.baseline, targetRef: options.target });
      console.log(`Audit run: ${result.run.auditRunId}`);
      console.log(`Run file: ${result.runPath}`);
      console.log(`Findings: ${result.run.findings.length}`);
    });

  program
    .command("export")
    .description("Export an existing audit run.")
    .option("--format <format>", "json, markdown, or html", "html")
    .option("--run <runId>", "audit run ID; defaults to latest")
    .option("--output <path>", "output path")
    .action(async (options: { format: string; run?: string; output?: string }) => {
      const result = await exportCommand({
        format: parseExportFormat(options.format),
        runId: options.run,
        outputPath: options.output
      });
      console.log(`Exported ${result.format}: ${result.outputPath}`);
    });

  program
    .command("verify-coverage")
    .description("Verify coverage invariants for an audit run.")
    .option("--run <runId>", "audit run ID; defaults to latest")
    .action(async (options: { run?: string }) => {
      const result = await verifyCoverageCommand({ runId: options.run });
      console.log(`Coverage OK: ${result.run.auditRunId}`);
    });

  program
    .command("doctor")
    .description("Check local AuditCanvas CLI prerequisites.")
    .action(async () => {
      const result = await doctorCommand();
      console.log(result.lines.join("\n"));
    });

  program
    .command("serve")
    .description("Serve local .auditcanvas reports and run data.")
    .option("--port <port>", "port to listen on", "4738")
    .action(async (options: { port: string }) => {
      const result = await serveCommand({ port: Number(options.port) });
      console.log(`AuditCanvas server listening at ${result.url}`);
    });

  return program;
}

function parseExportFormat(value: string): "json" | "markdown" | "html" {
  if (value === "json" || value === "markdown" || value === "md" || value === "html") {
    return value === "md" ? "markdown" : value;
  }
  throw new Error(`Unsupported export format: ${value}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await createProgram().parseAsync(process.argv);
}
