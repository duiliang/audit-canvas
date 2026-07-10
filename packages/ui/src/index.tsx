import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import type { FindingSeverity, FindingStatus } from "@audit-canvas/schema";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function IconButton({
  icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string }): ReactElement {
  return (
    <button className={cx("icon-button", className)} aria-label={label} title={label} {...props}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function StatusBadge({
  status,
  label = status
}: {
  status: FindingStatus;
  label?: string;
}): ReactElement {
  return <span className={cx("badge", `status-${status}`)}>{label}</span>;
}

export function SeverityBadge({
  severity,
  label = severity
}: {
  severity: FindingSeverity;
  label?: string;
}): ReactElement {
  return <span className={cx("badge", `severity-${severity}`)}>{label}</span>;
}
