import { expect, test } from "@playwright/test";

test("审计工作台默认使用中文并展示完整重复证据", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("制品导航")).toBeVisible();
  await expect(page.getByLabel("原文视图")).toBeVisible();
  await expect(page.getByLabel("问题面板")).toBeVisible();
  await expect(page.getByLabel("证据对比")).toBeVisible();
  await expect(page.getByRole("heading", { name: "同一内容重复出现 3 次" })).toBeVisible();
  const repeated = "结算服务必须完整展示每一处重复需求，包括完整证据、文件路径、章节和行号。";
  await expect.poll(async () => page.getByText(repeated).count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator("body")).not.toContainText("...");
});

test("审计工作台保留英文切换", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByLabel("Artifact Navigator")).toBeVisible();
  await expect(page.getByText("Evidence-preserving Review Canvas")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Artifact Navigator")).toBeVisible();
});
