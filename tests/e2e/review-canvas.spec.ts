import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("审计工作台默认使用中文并展示完整重复证据", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("制品导航")).toBeVisible();
  await expect(page.getByLabel("原文视图")).toBeVisible();
  await expect(page.getByLabel("问题面板")).toBeVisible();
  await expect(page.getByLabel("证据对比")).toBeVisible();
  await expect(page.getByText("真实工作区")).toBeVisible();
  await expect(page.getByRole("heading", { name: "同一内容重复出现 3 次" })).toBeVisible();
  const repeated = "结算服务必须完整展示每一处重复需求，包括完整证据、文件路径、章节和行号。";
  await expect.poll(async () => page.getByText(repeated).count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator("body")).not.toContainText("...");
});

test("真实画布持久化审阅状态并导出合并后的运行", async ({ page, request }) => {
  const workspaceResponse = await request.get("/api/workspace/latest");
  const payload = (await workspaceResponse.json()) as {
    run: { auditRunId: string; findings: Array<{ findingId: string }> };
  };
  const findingId = payload.run.findings[0]?.findingId;
  if (!findingId) throw new Error("真实审计运行没有生成问题");

  await page.goto("/");
  await page.getByRole("button", { name: "接受" }).click();
  await page.getByRole("textbox", { name: "人工批注" }).fill("已在真实画布确认");

  const workspacePath = resolve(process.cwd(), "test-results", "review-canvas-workspace");
  const reviewPath = resolve(
    workspacePath,
    ".auditcanvas",
    "reviews",
    `${payload.run.auditRunId}.json`
  );
  await expect
    .poll(async () => {
      const review = JSON.parse(await readFile(reviewPath, "utf8")) as {
        statusByFinding: Record<string, string>;
        commentsByFinding: Record<string, string>;
      };
      return [review.statusByFinding[findingId], review.commentsByFinding[findingId]];
    })
    .toEqual(["accepted", "已在真实画布确认"]);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "人工批注" })).toHaveValue("已在真实画布确认");
  await expect(page.locator(".status-accepted").first()).toHaveText("已接受");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("浏览器没有生成审计导出文件");
  const exported = JSON.parse(await readFile(downloadPath, "utf8")) as {
    findings: Array<{ findingId: string; status: string; reviewerComment: string | null }>;
  };
  const reviewedFinding = exported.findings.find((finding) => finding.findingId === findingId);
  expect(reviewedFinding).toMatchObject({
    status: "accepted",
    reviewerComment: "已在真实画布确认"
  });

  const resolveResult = spawnSync(
    process.execPath,
    [resolve(process.cwd(), "plugins", "codex-audit-canvas", "scripts", "resolve-findings.mjs")],
    { cwd: workspacePath, encoding: "utf8" }
  );
  expect(resolveResult.status, `${resolveResult.stdout}\n${resolveResult.stderr}`).toBe(0);
  const impactReport = await readFile(
    resolve(workspacePath, ".auditcanvas", "reviews", "accepted-findings-impact.md"),
    "utf8"
  );
  expect(impactReport).toContain(findingId);
});

test("审计工作台保留英文切换", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByLabel("Artifact Navigator")).toBeVisible();
  await expect(page.getByText("Evidence-preserving Review Canvas")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Artifact Navigator")).toBeVisible();
});
