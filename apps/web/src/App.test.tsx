// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App, repeatedEvidence } from "./App.js";

describe("Review Canvas", () => {
  it("renders the four-region workbench with every duplicate evidence occurrence", () => {
    const { container } = render(<App />);
    expect(screen.getByLabelText("Artifact Navigator")).toBeInTheDocument();
    expect(screen.getByLabelText("Source Viewer")).toBeInTheDocument();
    expect(screen.getByLabelText("Finding Panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence Compare")).toBeInTheDocument();
    expect(screen.getAllByText(repeatedEvidence).length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toContain("...");
  });
});

