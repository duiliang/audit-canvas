import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exportCommand, scanCommand, verifyCoverageCommand } from "./commands.js";

const workspaces: string[] = [];

afterEach(async () => {
  for (const workspace of workspaces.splice(0)) {
    await rm(workspace, { recursive: true, force: true });
  }
});

describe("CLI commands", () => {
  it("scans files, writes .auditcanvas, exports HTML, and verifies coverage", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "audit-canvas-cli-"));
    workspaces.push(workspace);
    const duplicate =
      "The API shall retain every duplicated requirement occurrence with complete evidence.";
    await writeFile(join(workspace, "one.md"), `# One\n\n${duplicate}\n`, "utf8");
    await writeFile(join(workspace, "two.md"), `# Two\n\n${duplicate}\n`, "utf8");
    await writeFile(join(workspace, "three.txt"), `${duplicate}\n`, "utf8");

    const scan = await scanCommand({ target: ".", cwd: workspace });
    expect(scan.run.findings[0]?.evidence).toHaveLength(3);
    expect(await readFile(scan.runPath, "utf8")).toContain(duplicate);

    const exported = await exportCommand({ format: "html", cwd: workspace });
    const html = await readFile(exported.outputPath, "utf8");
    expect(html).toContain(duplicate);
    expect(html).not.toContain("...");
    expect(html).toContain('<html lang="zh-CN">');

    const english = await exportCommand({ format: "markdown", cwd: workspace, locale: "en" });
    expect(await readFile(english.outputPath, "utf8")).toContain("# AuditCanvas Report");

    await expect(verifyCoverageCommand({ cwd: workspace })).resolves.toMatchObject({
      run: { auditRunId: scan.run.auditRunId }
    });
  });
});
