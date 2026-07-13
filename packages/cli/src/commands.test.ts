import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exportCommand, scanCommand, serveCommand, verifyCoverageCommand } from "./commands.js";

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
    const repeatedScan = await scanCommand({ target: ".", cwd: workspace });
    expect(repeatedScan.run.artifacts).toHaveLength(scan.run.artifacts.length);
    expect(
      repeatedScan.run.artifacts.every(
        (artifact) => !artifact.sourcePath.startsWith(".auditcanvas/")
      )
    ).toBe(true);
    await expect(scanCommand({ target: ".auditcanvas", cwd: workspace })).rejects.toThrow(
      "不能把 .auditcanvas 生成目录作为扫描目标"
    );

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

  it("serves a real run, persists review state, and exports the reviewed run", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "audit-canvas-review-"));
    workspaces.push(workspace);
    const repeated = "每一处重复证据都必须在真实审计画布中完整显示。";
    await writeFile(join(workspace, "one.md"), `# 一\n\n${repeated}\n`, "utf8");
    await writeFile(join(workspace, "two.md"), `# 二\n\n${repeated}\n`, "utf8");
    await writeFile(join(workspace, "three.txt"), `${repeated}\n`, "utf8");
    const scan = await scanCommand({ target: ".", cwd: workspace });
    const finding = scan.run.findings[0];
    expect(finding?.evidence).toHaveLength(3);
    if (!finding) throw new Error("测试审计未生成重复问题");

    const webRoot = join(workspace, "web-dist");
    await mkdir(webRoot, { recursive: true });
    await writeFile(join(webRoot, "index.html"), "<html>Review Canvas</html>", "utf8");
    const previousWebRoot = process.env.AUDIT_CANVAS_WEB_DIST;
    process.env.AUDIT_CANVAS_WEB_DIST = webRoot;
    const server = await serveCommand({ port: 0, cwd: workspace });

    try {
      const workspaceResponse = await fetch(`${server.url}/api/workspace/latest`);
      const payload = (await workspaceResponse.json()) as {
        run: typeof scan.run;
        review: { statusByFinding: Record<string, string> };
      };
      expect(payload.run.auditRunId).toBe(scan.run.auditRunId);
      expect(payload.review.statusByFinding).toEqual({});

      const statusPatch = {
        auditRunId: scan.run.auditRunId,
        statusByFinding: { [finding.findingId]: "accepted" as const },
        updatedAt: new Date().toISOString()
      };
      const saveResponse = await fetch(`${server.url}/api/reviews/${scan.run.auditRunId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(statusPatch)
      });
      expect(saveResponse.status).toBe(200);

      const commentPatch = {
        auditRunId: scan.run.auditRunId,
        commentsByFinding: { [finding.findingId]: "来自另一个旧页面的批注" },
        updatedAt: new Date(Date.now() + 1_000).toISOString()
      };
      const staleSaveResponse = await fetch(`${server.url}/api/reviews/${scan.run.auditRunId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(commentPatch)
      });
      expect(staleSaveResponse.status).toBe(200);

      const concurrentResponses = await Promise.all(
        Array.from({ length: 20 }, (_, index) => {
          const patch =
            index % 2 === 0
              ? {
                  auditRunId: scan.run.auditRunId,
                  statusByFinding: { [finding.findingId]: "accepted" },
                  updatedAt: new Date(Date.now() + index + 2_000).toISOString()
                }
              : {
                  auditRunId: scan.run.auditRunId,
                  commentsByFinding: { [finding.findingId]: `并发批注 ${index}` },
                  updatedAt: new Date(Date.now() + index + 2_000).toISOString()
                };
          return fetch(`${server.url}/api/reviews/${scan.run.auditRunId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch)
          });
        })
      );
      expect(concurrentResponses.every((response) => response.status === 200)).toBe(true);

      const persisted = JSON.parse(
        await readFile(
          join(workspace, ".auditcanvas", "reviews", `${scan.run.auditRunId}.json`),
          "utf8"
        )
      ) as {
        statusByFinding: Record<string, string>;
        commentsByFinding: Record<string, string>;
      };
      expect(persisted.statusByFinding[finding.findingId]).toBe("accepted");
      expect(persisted.commentsByFinding[finding.findingId]).toMatch(/^并发批注 \d+$/);

      const exported = await exportCommand({ format: "json", cwd: workspace });
      const reviewedRun = JSON.parse(
        await readFile(exported.outputPath, "utf8")
      ) as typeof scan.run;
      expect(reviewedRun.findings[0]?.status).toBe("accepted");
      expect(reviewedRun.findings[0]?.reviewerComment).toMatch(/^并发批注 \d+$/);

      await writeFile(
        join(workspace, ".auditcanvas", "reviews", `${scan.run.auditRunId}.json`),
        JSON.stringify({ ...persisted, auditRunId: "different-run" }),
        "utf8"
      );
      await expect(exportCommand({ format: "json", cwd: workspace })).rejects.toThrow(
        "审阅文件内容与请求 ID 不匹配"
      );
    } finally {
      await server.close();
      if (previousWebRoot === undefined) delete process.env.AUDIT_CANVAS_WEB_DIST;
      else process.env.AUDIT_CANVAS_WEB_DIST = previousWebRoot;
    }
  });

  it("refuses to label dirty worktree content as committed evidence", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "audit-canvas-dirty-git-"));
    workspaces.push(workspace);
    await writeFile(
      join(workspace, "requirements.md"),
      "# Requirements\n\nCommitted text.\n",
      "utf8"
    );
    git(workspace, ["init", "--initial-branch=main"]);
    git(workspace, ["config", "user.name", "AuditCanvas Test"]);
    git(workspace, ["config", "user.email", "audit-canvas@example.invalid"]);
    git(workspace, ["add", "."]);
    git(workspace, ["commit", "-m", "initial"]);
    await writeFile(join(workspace, "requirements.md"), "# Requirements\n\nDirty text.\n", "utf8");

    await expect(scanCommand({ target: ".", targetRef: "HEAD", cwd: workspace })).rejects.toThrow(
      "Git 工作树包含未提交的制品改动"
    );
  });

  it("refuses ignored and out-of-workspace files as Git evidence", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "audit-canvas-git-boundary-"));
    workspaces.push(workspace);
    await writeFile(join(workspace, ".gitignore"), "ignored.md\n", "utf8");
    await writeFile(join(workspace, "tracked.md"), "# Tracked\n\nCommitted text.\n", "utf8");
    git(workspace, ["init", "--initial-branch=main"]);
    git(workspace, ["config", "user.name", "AuditCanvas Test"]);
    git(workspace, ["config", "user.email", "audit-canvas@example.invalid"]);
    git(workspace, ["add", "."]);
    git(workspace, ["commit", "-m", "initial"]);
    await writeFile(join(workspace, "ignored.md"), "# Ignored\n\nNot committed.\n", "utf8");

    await expect(scanCommand({ target: ".", targetRef: "HEAD", cwd: workspace })).rejects.toThrow(
      "制品未被目标 commit 跟踪"
    );
    await expect(scanCommand({ target: "..", cwd: workspace })).rejects.toThrow(
      "扫描目标必须位于当前工作区内"
    );
  });
});

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}
