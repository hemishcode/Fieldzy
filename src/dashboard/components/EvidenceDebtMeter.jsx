
import { useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  ArrowRight,
  CircleHelp,
} from "lucide-react";

export default function EvidenceDebtMeter({
  observations = [],
  onReviewObservation,
  onAddEvidence,
}) {
  const summary = useMemo(() => {
    const records = observations.map((observation) => {
      const gaps = Array.isArray(observation.evidenceGaps)
        ? observation.evidenceGaps.filter((gap) => !gap.resolved)
        : [];

      const unverified =
        (observation.status || "Unverified") !== "Verified";

      return {
        ...observation,
        unresolvedGaps: gaps.length,
        needsReview: unverified || gaps.length > 0,
      };
    });

    return {
      total: records.length,
      gaps: records.reduce(
        (sum, record) => sum + record.unresolvedGaps,
        0
      ),
      needsReview: records.filter((record) => record.needsReview),
      records,
    };
  }, [observations]);

  const priorityRecords = [...summary.needsReview].sort(
    (a, b) => b.unresolvedGaps - a.unresolvedGaps
  );

  return (
    <section className="dashboard-card evidence-debt-card">
      <div className="evidence-debt-header">
        <div>
          <span className="evidence-eyebrow">FIELD EVIDENCE</span>
          <h3>Evidence Debt</h3>
          <p>
            Identify reports that need more evidence before decisions are made.
          </p>
        </div>

        <div className="evidence-debt-icon">
          <ShieldCheck size={23} />
        </div>
      </div>

      <div className="evidence-debt-metrics">
        <div className="evidence-debt-metric">
          <span>Open evidence gaps</span>
          <strong>{summary.gaps}</strong>
          <small>Unresolved questions</small>
        </div>

        <div className="evidence-debt-metric">
          <span>Reports to review</span>
          <strong>{summary.needsReview.length}</strong>
          <small>Not fully verified</small>
        </div>
      </div>

      <div className="evidence-debt-divider" />

      <div className="evidence-debt-section-heading">
        <div>
          <AlertTriangle size={16} />
          <strong>Needs attention</strong>
        </div>
        <span>{priorityRecords.length} reports</span>
      </div>

      {priorityRecords.length === 0 ? (
        <div className="evidence-debt-empty">
          <ClipboardCheck size={22} />
          <div>
            <strong>
              {summary.total === 0
                ? "No field reports yet"
                : "No open evidence gaps"}
            </strong>
            <p>
              {summary.total === 0
                ? "Record a field observation to begin tracking evidence."
                : "Check individual reports before treating conditions as verified."}
            </p>
          </div>
        </div>
      ) : (
        <div className="evidence-debt-list">
          {priorityRecords.slice(0, 3).map((record) => (
            <div className="evidence-debt-item" key={record.id}>
              <div className="evidence-debt-item-main">
                <span className="evidence-debt-field">
                  {record.fieldName || "Field not specified"}
                </span>

                <strong>{record.title || "Untitled observation"}</strong>

                <span className="evidence-debt-gap-count">
                  <CircleHelp size={13} />
                  {record.unresolvedGaps > 0
                    ? `${record.unresolvedGaps} evidence gap${
                        record.unresolvedGaps === 1 ? "" : "s"
                      }`
                    : "Verification required"}
                </span>
              </div>

              <button
                type="button"
                className="evidence-debt-action"
                onClick={() =>
                  onReviewObservation?.(record)
                }
                aria-label={`Review ${record.title || "observation"}`}
              >
                <ArrowRight size={17} />
              </button>

              {record.unresolvedGaps > 0 && onAddEvidence && (
                <button
                  type="button"
                  className="evidence-debt-add-evidence"
                  onClick={() => onAddEvidence(record)}
                >
                  Add evidence
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="evidence-debt-footer">
        <span>
          <span className="evidence-debt-status-dot" />
          Based on saved field reports
        </span>
        <span>Not an automatic threat diagnosis</span>
      </div>
    </section>
  );
}