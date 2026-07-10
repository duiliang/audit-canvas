#!/usr/bin/env node
import { runCli } from "./runtime.mjs";

const args = process.argv.slice(2);
const baseline = readOption(args, "--baseline") ?? "main";
const target = readOption(args, "--target") ?? "HEAD";
const scanTarget = readScanTarget(args);

runCli(["scan", scanTarget, "--baseline", baseline, "--target", target]);

function readOption(values, name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : null;
}

function readScanTarget(values) {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--baseline" || values[index] === "--target") {
      index += 1;
      continue;
    }
    if (!values[index].startsWith("--")) return values[index];
  }
  return ".";
}
