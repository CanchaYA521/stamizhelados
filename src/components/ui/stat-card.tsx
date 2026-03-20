import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="cluster">
        {icon}
        <span className="metric-label">{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      {hint ? <span className="metric-footnote">{hint}</span> : null}
    </article>
  );
}
