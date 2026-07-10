import { expect, test } from "@playwright/test";

test("Review Canvas shows complete duplicate evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Artifact Navigator")).toBeVisible();
  await expect(page.getByLabel("Source Viewer")).toBeVisible();
  await expect(page.getByLabel("Finding Panel")).toBeVisible();
  await expect(page.getByLabel("Evidence Compare")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Duplicate content repeated 3 times" })).toBeVisible();
  const repeated =
    "The checkout service shall keep every duplicate requirement visible with complete evidence, path, heading, and line numbers.";
  await expect.poll(async () => page.getByText(repeated).count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator("body")).not.toContainText("...");
});
