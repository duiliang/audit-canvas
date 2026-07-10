import { describe, expect, it } from "vitest";
import { createProgram } from "./index.js";

describe("CLI 中文默认界面", () => {
  it("默认帮助使用中文", () => {
    const help = createProgram().helpInformation();
    expect(help).toContain("本地优先、保留完整证据的软件制品审计工作台");
    expect(help).toContain("用法：");
    expect(help).toContain("选项：");
    expect(help).toContain("命令：");
    expect(help).toContain("显示命令帮助");
    expect(help).not.toContain("Options:");
    expect(help).not.toContain("Commands:");
  });
});
