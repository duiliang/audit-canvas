import React from "react";
import { createRoot } from "react-dom/client";
import type { AuditReview, AuditReviewPatch, AuditRun } from "@audit-canvas/schema";
import { App } from "./App.js";
import "./styles.css";

interface WorkspacePayload {
  run: AuditRun;
  review: AuditReview;
}

const root = createRoot(document.getElementById("root") as HTMLElement);
let reviewSaveQueue: Promise<void> = Promise.resolve();

void bootstrap();

async function bootstrap(): Promise<void> {
  try {
    const response = await fetch("./api/workspace/latest", { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status === 404 || !contentType.includes("application/json")) {
      renderSample();
      return;
    }
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as WorkspacePayload;
    root.render(
      <React.StrictMode>
        <App
          run={payload.run}
          initialReview={payload.review}
          mode="workspace"
          onReviewChange={persistReview}
        />
      </React.StrictMode>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    root.render(<main className="startup-error">无法加载审计工作区：{message}</main>);
  }
}

function renderSample(): void {
  root.render(
    <React.StrictMode>
      <App mode="sample" />
    </React.StrictMode>
  );
}

async function persistReview(patch: AuditReviewPatch): Promise<void> {
  reviewSaveQueue = reviewSaveQueue
    .catch(() => undefined)
    .then(async () => {
      const response = await fetch(`./api/reviews/${encodeURIComponent(patch.auditRunId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    });
  return reviewSaveQueue;
}
