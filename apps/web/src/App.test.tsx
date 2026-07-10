// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App, repeatedEvidence } from "./App.js";

describe("审计工作台", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("默认使用中文并完整展示四区工作台和全部重复证据", () => {
    const { container } = render(<App />);
    expect(screen.getByLabelText("制品导航")).toBeInTheDocument();
    expect(screen.getByLabelText("原文视图")).toBeInTheDocument();
    expect(screen.getByLabelText("问题面板")).toBeInTheDocument();
    expect(screen.getByLabelText("证据对比")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "无效" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "同一内容重复出现 3 次" })).toBeInTheDocument();
    expect(screen.getAllByText(repeatedEvidence).length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toContain("...");
  });

  it("保留英文界面切换", () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByLabelText("Artifact Navigator")).toBeInTheDocument();
    expect(screen.getByText("Evidence-preserving Review Canvas")).toBeInTheDocument();
    unmount();
    render(<App />);
    expect(screen.getByLabelText("Artifact Navigator")).toBeInTheDocument();
  });
});
