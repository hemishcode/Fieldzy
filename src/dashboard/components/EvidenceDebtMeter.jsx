
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  ArrowRight,
  CircleHelp,
  CheckCircle2,
  FileText,
  TrendingUp,
  Camera,
  Radio,
  UserCheck,
  Clock3,
  ChevronDown,
  ChevronUp,
  History,
  SearchCheck,
  Plus,
  Check,
  Sprout,
  Activity,
} from "lucide-react";

// These weights organize human review work.
// They are NOT agricultural risk or AI confidence scores.
const STATUS_WEIGHT = {
  Conflicting: 35,
  Unverified: 25,
  Inconclusive: 20,
  Corroborated: 8,
  "Expert-confirmed": 0,
};

const REVIEW_STATUSES = [
  "Unverified",
  "Conflicting",
  "Inconclusive",
];

const WORKFLOW_STAGES = [
  "Open",
  "Evidence submitted",
  "Under review",
  "Verified / Resolved",
];

const QUALITY_CHECKS = [
  "Evidence is relevant to this observation",
  "Evidence source is identified",
  "Evidence is recent enough to be useful",
  "Evidence supports or contradicts the report",
];

function getUnresolvedGapCount(observation) {
  if (Array.isArray(observation.evidenceGaps)) {
    return observation.evidenceGaps.filter(
      (gap) => !gap.resolved
    ).length;
  }

  return Math.max(0, Number(observation.evidenceGaps) || 0);
}

function getResolvedGapCount(observation) {
  if (!Array.isArray(observation.evidenceGaps)) return 0;

  return observation.evidenceGaps.filter(
    (gap) => gap.resolved
  ).length;
}

function getTotalGapCount(observation) {
  if (Array.isArray(observation.evidenceGaps)) {
    return observation.evidenceGaps.length;
  }

  return getUnresolvedGapCount(observation);
}

function getEvidence(observation) {
  return Array.isArray(observation.evidence)
    ? observation.evidence
    : [];
}

function getPriorityScore(observation, unresolvedGaps) {
  const status = observation.status || "Unverified";
  const statusScore = STATUS_WEIGHT[status] ?? 25;
  const gapScore = Math.min(unresolvedGaps * 12, 36);
  const evidenceScore = getEvidence(observation).length === 0 ? 8 : 0;

  return Math.min(100, statusScore + gapScore + evidenceScore);
}

function getPriorityLabel(score) {
  if (score >= 60) return "High review priority";
  if (score >= 35) return "Needs attention";
  return "Routine review";
}

function getStatusLabel(status) {
  return STATUS_WEIGHT[status] !== undefined
    ? status
    : "Unverified";
}

function getSafeDate(date) {
  if (!date) return 0;

  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(date) {
  const timestamp = getSafeDate(date);

  if (!timestamp) return "Date unavailable";

  return new Date(timestamp).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEvidenceSource(item) {
  const source = String(
    item?.source ||
    item?.type ||
    item?.category ||
    ""
  ).toLowerCase();

  if (source.includes("photo") || source.includes("image")) {
    return "Photo";
  }

  if (source.includes("sensor")) {
    return "Sensor";
  }

  if (
    source.includes("audio") ||
    source.includes("acoustic") ||
    source.includes("recording")
  ) {
    return "Audio";
  }

  if (
    source.includes("expert") ||
    source.includes("specialist")
  ) {
    return "Expert assessment";
  }

  if (
    source.includes("farmer") ||
    source.includes("manual") ||
    source.includes("observation")
  ) {
    return "Farmer observation";
  }

  return item?.source || item?.type || "Other evidence";
}

function getInitialStage(record) {
  if (record.status === "Expert-confirmed") {
    return "Verified / Resolved";
  }

  if (getEvidence(record).length > 0) {
    return "Evidence submitted";
  }

  return "Open";
}

function getNextAction(record, stage) {
  if (stage === "Verified / Resolved") {
    return "Review the observation again if new information appears.";
  }

  if (record.status === "Conflicting") {
    return "Conflicting reports exist. Gather another independent observation.";
  }

  if (record.unresolvedGaps > 0 && record.evidenceCount === 0) {
    return "Add supporting evidence to address the open questions.";
  }

  if (record.unresolvedGaps > 0) {
    return "Review the submitted evidence and address the remaining gaps.";
  }

  if (stage === "Evidence submitted") {
    return "Check the submitted evidence before changing the report status.";
  }

  if (stage === "Under review") {
    return "Complete the evidence checklist and record the review outcome.";
  }

  if (REVIEW_STATUSES.includes(record.status)) {
    return "A human review is still required.";
  }

  return "Continue monitoring the observation.";
}

function getStageClass(stage) {
  if (stage === "Verified / Resolved") return "verified";
  if (stage === "Under review") return "reviewing";
  if (stage === "Evidence submitted") return "submitted";
  return "open";
}

export default function EvidenceDebtMeter({
  observations = [],
  onReviewObservation,
  onAddEvidence,
  onUpdateReview,
}) {
const [expandedId, setExpandedId] = useState(null);
const [addingEvidenceId, setAddingEvidenceId] = useState(null);
const [savingReviewId, setSavingReviewId] = useState(null);

  const summary = useMemo(() => {
    const records = observations.map((observation, index) => {
      const unresolvedGaps = getUnresolvedGapCount(observation);
      const resolvedGaps = getResolvedGapCount(observation);
      const totalGaps = getTotalGapCount(observation);
      const evidence = getEvidence(observation);
      const evidenceCount = evidence.length;
      const status = observation.status || "Unverified";

      const needsReview =
        unresolvedGaps > 0 ||
        REVIEW_STATUSES.includes(status);

      const priorityScore = getPriorityScore(
        observation,
        unresolvedGaps
      );

      return {
        ...observation,
        _meterId: observation.id ?? `observation-${index}`,
        status,
        unresolvedGaps,
        resolvedGaps,
        totalGaps,
        evidenceCount,
        evidence,
        needsReview,
        priorityScore,
      };
    });

    const totalGaps = records.reduce(
      (sum, record) => sum + record.totalGaps,
      0
    );

    const resolvedGaps = records.reduce(
      (sum, record) => sum + record.resolvedGaps,
      0
    );

    const unresolvedGaps = records.reduce(
      (sum, record) => sum + record.unresolvedGaps,
      0
    );

    const totalEvidence = records.reduce(
      (sum, record) => sum + record.evidenceCount,
      0
    );

    const completeness =
      totalGaps > 0
        ? Math.round((resolvedGaps / totalGaps) * 100)
        : null;

    return {
      records,
      total: records.length,
      totalGaps,
      resolvedGaps,
      unresolvedGaps,
      totalEvidence,
      completeness,
      needsReview: records.filter((record) => record.needsReview),
    };
  }, [observations]);

  const priorityRecords = useMemo(() => {
    return [...summary.needsReview].sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      if (b.unresolvedGaps !== a.unresolvedGaps) {
        return b.unresolvedGaps - a.unresolvedGaps;
      }

      return getSafeDate(b.createdAt) - getSafeDate(a.createdAt);
    });
  }, [summary.needsReview]);

  const allEvidenceSources = useMemo(() => {
    const counts = {};

    summary.records.forEach((record) => {
      record.evidence.forEach((item) => {
        const source = getEvidenceSource(item);
        counts[source] = (counts[source] || 0) + 1;
      });
    });

    return counts;
  }, [summary.records]);

function getStage(record) {
  return record.reviewStage || getInitialStage(record);
}

function getCheckedItems(record) {
  const saved = record.qualityChecks || {};

  // Backward compatibility with the old array format
  if (Array.isArray(saved)) {
    return Object.fromEntries(saved.map((item) => [item, true]));
  }

  return saved;
}

async function saveReviewChanges(record, changes, message) {
  if (typeof onUpdateReview !== "function") {
    console.error("Review saving is not connected.");
    return false;
  }

  const history = [
    ...(record.reviewHistory || []),
    {
      id: `review-${Date.now()}`,
      action: message,
      message,
      timestamp: new Date().toISOString(),
    },
  ];

  try {
    setSavingReviewId(record._meterId);

    const result = await onUpdateReview(record.id, {
      reviewStage: changes.reviewStage ?? getStage(record),
      qualityChecks:
        changes.qualityChecks ?? getCheckedItems(record),
      reviewHistory: history,
    });

    if (result?.success === false) {
      console.error("Review saving failed:", result.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Review saving failed:", error);
    return false;
  } finally {
    setSavingReviewId(null);
  }
}

async function updateStage(record, nextStage) {
  if (nextStage === getStage(record)) return;

  await saveReviewChanges(
    record,
    { reviewStage: nextStage },
    `Workflow stage changed to "${nextStage}"`
  );
}

async function toggleQualityCheck(record, check) {
  const current = getCheckedItems(record);

  const updated = {
    ...current,
    [check]: !current[check],
  };

  await saveReviewChanges(
    record,
    { qualityChecks: updated },
    `${check}: ${updated[check] ? "Completed" : "Reopened"}`
  );
}

async function handleAddEvidence(record) {
  if (typeof onAddEvidence !== "function") return;

  try {
    setAddingEvidenceId(record._meterId);

    const result = await onAddEvidence(record);

    // Do not update the workflow if evidence was cancelled or failed.
    if (result?.success === false) return;

    await saveReviewChanges(
      record,
      { reviewStage: "Evidence submitted" },
      "Evidence submission completed"
    );
  } catch (error) {
    console.error("Evidence submission failed:", error);
  } finally {
    setAddingEvidenceId(null);
  }
}

function handleReview(record) {
  onReviewObservation?.(record);
}

  function toggleExpanded(record) {
    setExpandedId((current) =>
      current === record._meterId ? null : record._meterId
    );
  }

function getRecordTimeline(record) {
  const evidenceEvents = record.evidence.map((item, index) => ({
    message: `${getEvidenceSource(item)} added`,
    date: item.createdAt || item.date || item.timestamp,
    key: `evidence-${index}`,
  }));

  const createdEvent = record.createdAt
    ? [{
        message: "Observation recorded",
        date: record.createdAt,
        key: "created",
      }]
    : [];

  const reviewEvents = (record.reviewHistory || []).map(
    (item, index) => ({
      message: item.message || item.action || "Review updated",
      date: item.timestamp || item.date,
      key: item.id || `review-${index}`,
    })
  );

  return [
    ...createdEvent,
    ...evidenceEvents,
    ...reviewEvents,
  ].sort((a, b) => getSafeDate(b.date) - getSafeDate(a.date));
}

  return (
    <section className="dashboard-card evidence-debt-card">
      <style>{`
        .evidence-debt-card .ed-extra-section {
          margin-top: 19px;
        }

        .evidence-debt-card .ed-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--text-primary, #26372b);
          font-family: Garamond, serif;
        }

        .evidence-debt-card .ed-section-title strong {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 17px;
        }

        .evidence-debt-card .ed-section-title span {
          color: var(--text-muted, #778276);
          font-size: 13px;
        }

        .evidence-debt-card .ed-source-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .evidence-debt-card .ed-source-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px;
          border: 1px solid var(--border-color, #e4e8dc);
          border-radius: 11px;
          background: var(--surface-soft, #f8f9f3);
          font-family: Garamond, serif;
        }

        .evidence-debt-card .ed-source-item strong {
          display: block;
          font-size: 15px;
        }

        .evidence-debt-card .ed-source-item small {
          color: var(--text-muted, #778276);
          font-size: 12px;
        }

        .evidence-debt-card .ed-source-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 9px;
          background: #e9f0e3;
          color: #527b4d;
        }

        .evidence-debt-card .ed-detail-panel {
          margin-top: 13px;
          padding: 14px;
          border: 1px solid var(--border-color, #e4e8dc);
          border-radius: 12px;
          background: var(--surface-soft, #f8f9f3);
          font-family: Garamond, serif;
        }

        .evidence-debt-card .ed-detail-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .evidence-debt-card .ed-detail-heading strong {
          font-size: 16px;
        }

        .evidence-debt-card .ed-stage-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color, #dfe5d8);
          border-radius: 9px;
          background: #fffdf7;
          color: #26372b;
          font-family: Garamond, serif;
          font-size: 15px;
        }

        .evidence-debt-card .ed-stage-track {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
          margin: 12px 0 5px;
        }

        .evidence-debt-card .ed-stage-step {
          height: 5px;
          border-radius: 10px;
          background: #e0e5dc;
        }

        .evidence-debt-card .ed-stage-step.active {
          background: #648b57;
        }

        .evidence-debt-card .ed-check-list {
          display: grid;
          gap: 9px;
          margin-top: 10px;
        }

        .evidence-debt-card .ed-check-row {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: var(--text-primary, #26372b);
          font-size: 14px;
          line-height: 1.25;
          cursor: pointer;
        }

        .evidence-debt-card .ed-check-row input {
          margin-top: 3px;
          accent-color: #648b57;
        }

        .evidence-debt-card .ed-check-progress {
          margin-top: 11px;
          color: var(--text-muted, #778276);
          font-size: 13px;
        }

        .evidence-debt-card .ed-next-action {
          display: flex;
          gap: 9px;
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          background: #edf2e7;
          color: #354d32;
          font-size: 14px;
          line-height: 1.3;
        }

        .evidence-debt-card .ed-timeline {
          display: grid;
          gap: 12px;
          margin-top: 10px;
        }

        .evidence-debt-card .ed-timeline-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 14px;
        }

        .evidence-debt-card .ed-timeline-dot {
          width: 9px;
          height: 9px;
          margin-top: 5px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #648b57;
        }

        .evidence-debt-card .ed-timeline-item small {
          display: block;
          margin-top: 3px;
          color: var(--text-muted, #778276);
          font-size: 12px;
        }

        .evidence-debt-card .ed-expand-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 0;
          padding: 7px 0;
          background: transparent;
          color: #527b4d;
          font-family: Garamond, serif;
          font-size: 14px;
          cursor: pointer;
        }

        .evidence-debt-card .ed-stage-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          background: #edf0e8;
          color: #56634e;
        }

        .evidence-debt-card .ed-stage-badge.verified {
          background: #e4f0df;
          color: #3e7040;
        }

        .evidence-debt-card .ed-stage-badge.reviewing {
          background: #f6efdc;
          color: #82682e;
        }

        .evidence-debt-card .ed-stage-badge.submitted {
          background: #e8eff5;
          color: #49667c;
        }

        .evidence-debt-card .ed-stage-badge.open {
          background: #f5e9df;
          color: #94603c;
        }

        .evidence-debt-card .ed-muted-note {
          color: var(--text-muted, #778276);
          font-size: 13px;
          line-height: 1.3;
        }

        @media (max-width: 520px) {
          .evidence-debt-card .ed-source-grid {
            grid-template-columns: 1fr;
          }

          .evidence-debt-card .ed-stage-track {
            gap: 3px;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="evidence-debt-header">
        <div>
          <span className="evidence-eyebrow">FIELD EVIDENCE</span>
          <h3>Evidence Debt</h3>
          <p>
            Track incomplete evidence and identify reports
            that need human review.
          </p>
        </div>

        <div className="evidence-debt-icon">
          <ShieldCheck size={23} />
        </div>
      </div>

      {/* OVERVIEW METRICS */}
      <div className="evidence-debt-metrics">
        <div className="evidence-debt-metric">
          <span>Open evidence gaps</span>
          <strong>{summary.unresolvedGaps}</strong>
          <small>Questions awaiting evidence</small>
        </div>

        <div className="evidence-debt-metric">
          <span>Reports to review</span>
          <strong>{summary.needsReview.length}</strong>
          <small>Require further checking</small>
        </div>

        <div className="evidence-debt-metric">
          <span>Evidence items</span>
          <strong>{summary.totalEvidence}</strong>
          <small>Recorded supporting items</small>
        </div>
      </div>

      {/* GAP RESOLUTION */}
      <div className="evidence-debt-completeness">
        <div className="evidence-debt-completeness-heading">
          <span>
            <TrendingUp size={15} />
            Evidence gap resolution
          </span>

          <strong>
            {summary.completeness === null
              ? "Not measured"
              : `${summary.completeness}%`}
          </strong>
        </div>

        <div
          className="evidence-debt-progress-track"
          role="progressbar"
          aria-label="Evidence gap resolution"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.completeness ?? 0}
        >
          <div
            className="evidence-debt-progress-fill"
            style={{
              width: `${summary.completeness ?? 0}%`,
            }}
          />
        </div>

        <small>
          {summary.completeness === null
            ? "No evidence gaps have been defined yet."
            : `${summary.resolvedGaps} of ${summary.totalGaps} evidence gaps resolved`}
        </small>
      </div>

      <div className="evidence-debt-divider" />

      {/* EVIDENCE SOURCE TRACKING */}
      <div className="ed-extra-section">
        <div className="ed-section-title">
          <strong>
            <Radio size={16} />
            Evidence sources
          </strong>
          <span>{summary.totalEvidence} items recorded</span>
        </div>

        {Object.keys(allEvidenceSources).length === 0 ? (
          <p className="ed-muted-note">
            Evidence source information will appear here when
            supporting items are recorded.
          </p>
        ) : (
          <div className="ed-source-grid">
            {Object.entries(allEvidenceSources).map(
              ([source, count]) => {
                const SourceIcon =
                  source === "Photo"
                    ? Camera
                    : source === "Sensor"
                    ? Radio
                    : source === "Audio"
                    ? Activity
                    : source === "Expert assessment"
                    ? UserCheck
                    : FileText;

                return (
                  <div className="ed-source-item" key={source}>
                    <div className="ed-source-icon">
                      <SourceIcon size={17} />
                    </div>
                    <div>
                      <strong>{count}</strong>
                      <small>{source}</small>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      <div className="evidence-debt-divider" />

      {/* PRIORITY REVIEW QUEUE */}
      <div className="evidence-debt-section-heading">
        <div>
          <AlertTriangle size={16} />
          <strong>Priority review queue</strong>
        </div>

        <span>{summary.needsReview.length} reports</span>
      </div>

      {priorityRecords.length === 0 ? (
        <div className="evidence-debt-empty">
          <ClipboardCheck size={22} />
          <div>
            <strong>
              {summary.total === 0
                ? "No field reports yet"
                : "No pending review actions"}
            </strong>
            <p>
              {summary.total === 0
                ? "Record a field observation to begin tracking evidence."
                : "All recorded observations have cleared the current review checks."}
            </p>
          </div>
        </div>
      ) : (
        <div className="evidence-debt-list">
          {priorityRecords.slice(0, 3).map((record) => {
            const stage = getStage(record);
            const isExpanded = expandedId === record._meterId;
const checkedItems = getCheckedItems(record);

const checkedCount = QUALITY_CHECKS.filter(
  (check) => checkedItems[check]
).length;

const isSaving = savingReviewId === record._meterId;
            const timeline = getRecordTimeline(record);
            const isAdding =
              addingEvidenceId === record._meterId;

            return (
              <div
                className="evidence-debt-item"
                key={record._meterId}
              >
                <div className="evidence-debt-item-main">
                  <span className="evidence-debt-field">
                    {record.fieldName || "Field not specified"}
                  </span>

                  <strong>
                    {record.title || "Untitled observation"}
                  </strong>

                  <div className="evidence-debt-record-meta">
                    <span className="evidence-debt-status-label">
                      {getStatusLabel(record.status)}
                    </span>

                    <span>
                      <CircleHelp size={13} />
                      {record.unresolvedGaps > 0
                        ? `${record.unresolvedGaps} open gap${
                            record.unresolvedGaps === 1 ? "" : "s"
                          }`
                        : "Verification required"}
                    </span>

                    <span>
                      <FileText size={13} />
                      {record.evidenceCount} evidence item
                      {record.evidenceCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="evidence-debt-priority">
                    <span>
                      {getPriorityLabel(record.priorityScore)}
                    </span>
                    <strong>{record.priorityScore}/100</strong>
                  </div>

                  <div style={{ marginTop: 9 }}>
                    <span className={`ed-stage-badge ${getStageClass(stage)}`}>
                      {stage}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ed-expand-button"
                    onClick={() => toggleExpanded(record)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <>
                        Hide review workspace <ChevronUp size={15} />
                      </>
                    ) : (
                      <>
                        Open review workspace <ChevronDown size={15} />
                      </>
                    )}
                  </button>
                </div>

                <div className="evidence-debt-actions">
                  <button
                    type="button"
                    className="evidence-debt-action"
                    onClick={() => handleReview(record)}
                    aria-label={`Review ${record.title || "observation"}`}
                  >
                    <ArrowRight size={17} />
                  </button>

                  {record.unresolvedGaps > 0 &&
                    typeof onAddEvidence === "function" && (
                      <button
                        type="button"
                        className="evidence-debt-add-evidence"
                        onClick={() => handleAddEvidence(record)}
                        disabled={isAdding}
                      >
                        {isAdding ? "Adding..." : "Add evidence"}
                      </button>
                    )}
                </div>

                {/* EXPANDED REVIEW WORKSPACE */}
                {isExpanded && (
                  <div className="ed-detail-panel">
                    {/* 1. VERIFICATION LIFECYCLE */}
                    <div className="ed-detail-heading">
                      <strong>
                        <ClipboardCheck
                          size={16}
                          style={{
                            display: "inline",
                            verticalAlign: "middle",
                            marginRight: 6,
                          }}
                        />
                        Verification lifecycle
                      </strong>
                    </div>

                    <select
                      className="ed-stage-select"
                      value={stage}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateStage(record, event.target.value)
                      }
                      aria-label="Update verification stage"
                    >
                      {WORKFLOW_STAGES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="ed-stage-track">
                      {WORKFLOW_STAGES.map((item, index) => {
                        const currentIndex =
                          WORKFLOW_STAGES.indexOf(stage);

                        return (
                          <div
                            key={item}
                            className={`ed-stage-step ${
                              index <= currentIndex ? "active" : ""
                            }`}
                          />
                        );
                      })}
                    </div>

                    <p className="ed-muted-note">
                      Stages are workflow labels. Selecting a stage
                      here does not independently verify the report
                      or resolve its evidence gaps.
                    </p>

                    {/* 2. QUALITY CHECKLIST */}
                    <div className="ed-extra-section">
                      <div className="ed-section-title">
                        <strong>
                          <SearchCheck size={16} />
                          Evidence quality checklist
                        </strong>
<span>
  {checkedCount}/{QUALITY_CHECKS.length}
</span>
                      </div>

                      <div className="ed-check-list">
                        {QUALITY_CHECKS.map((check) => (
                          <label
                            className="ed-check-row"
                            key={check}
                          >
                            <input
  type="checkbox"
  checked={Boolean(checkedItems[check])}
  disabled={isSaving}
  onChange={() => toggleQualityCheck(record, check)}
/>
                            <span>{check}</span>
                          </label>
                        ))}
                      </div>

                      <div className="ed-check-progress">
                        {checkedCount === QUALITY_CHECKS.length
                          ? "All checklist items marked as reviewed."
                          : "Complete the checklist during human review."}
                      </div>
                    </div>

                    {/* 3. NEXT ACTION */}
                    <div className="ed-next-action">
                      <Sprout size={17} />
                      <div>
                        <strong>Suggested next action</strong>
                        <div>
                          {getNextAction(record, stage)}
                        </div>
                      </div>
                    </div>

                    {/* 4. EVIDENCE HISTORY */}
                    <div className="ed-extra-section">
                      <div className="ed-section-title">
                        <strong>
                          <History size={16} />
                          Evidence activity timeline
                        </strong>
                        <span>{timeline.length} events</span>
                      </div>

                      {timeline.length === 0 ? (
                        <p className="ed-muted-note">
                          No dated evidence activity is available
                          for this observation yet.
                        </p>
                      ) : (
                        <div className="ed-timeline">
                          {timeline.map((event) => (
                            <div
                              className="ed-timeline-item"
                              key={event.key}
                            >
                              <span className="ed-timeline-dot" />
                              <div>
                                <strong>{event.message}</strong>
                                <small>
                                  {formatDate(event.date)}
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5. EVIDENCE ITEMS */}
                    <div className="ed-extra-section">
                      <div className="ed-section-title">
                        <strong>
                          <FileText size={16} />
                          Recorded evidence
                        </strong>
                        <span>{record.evidenceCount} items</span>
                      </div>

                      {record.evidence.length === 0 ? (
                        <p className="ed-muted-note">
                          No evidence items are attached to this
                          observation yet.
                        </p>
                      ) : (
                        <div className="ed-timeline">
                          {record.evidence.map((item, index) => (
                            <div
                              className="ed-timeline-item"
                              key={item.id ?? index}
                            >
                              <span className="ed-timeline-dot" />
                              <div>
                                <strong>
                                  {getEvidenceSource(item)}
                                </strong>
                                <small>
                                  {item.note ||
                                    item.description ||
                                    item.name ||
                                    "Evidence recorded"}
                                </small>
                                {item.createdAt ||
                                item.date ||
                                item.timestamp ? (
                                  <small>
                                    {formatDate(
                                      item.createdAt ||
                                      item.date ||
                                      item.timestamp
                                    )}
                                  </small>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ed-extra-section">
                      <button
                        type="button"
                        className="evidence-debt-add-evidence"
                        onClick={() => handleReview(record)}
                      >
                        Open full observation review
                        <ArrowRight
                          size={14}
                          style={{
                            display: "inline",
                            verticalAlign: "middle",
                            marginLeft: 5,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      <div className="evidence-debt-footer">
        <span>
          <span className="evidence-debt-status-dot" />
          Based on saved field reports
        </span>

        <span>
          <CheckCircle2 size={13} />
          Human verification required
        </span>
      </div>

      <p className="evidence-debt-disclaimer">
        Priority scores organize review work. They do not diagnose
        crop disease, confirm threats, authenticate evidence, or
        establish field conditions.
      </p>
    </section>
  );
}
