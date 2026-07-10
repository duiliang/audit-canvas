#!/usr/bin/env node
import { runCli } from "./runtime.mjs";

if (process.argv.includes("--doctor")) {
  runCli(["doctor"]);
  process.exit(0);
}

const target = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? ".";
runCli(["scan", target]);
