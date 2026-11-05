import WeatherCard from "./WeatherCard";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Cloud,
  ClipboardCheck,
  Clock3,
  Leaf,
  Radio,
  ShieldCheck,
  Sprout,
} from "lucide-react";

function formatTime(timestamp) {
  if (!timestamp) return "Time unavailable";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriority(observation) {
  const unresolvedGaps = (observation.evidenceGaps || []).filter(
    (gap) => !gap.resolved
  ).length;

  if (observation.status === "Conflicting") return 1;
  if (unresolvedGaps >= 2) return 2;
  if (observation.status === "Unverified") return 3;
  if (observation.status === "Inconclusive") return 4;

  return 5;
}

export default function Overview({
  fields = [],
  observations = [],
  evidenceHistory = [],
  transmissionLogs = [],
  neighbourAlerts = [],
  threat = null,
  isOffline = false,
  evidenceDebt = 0,
  unresolvedEvidenceCount = 0,
  unverifiedCount = 0,
  onNavigate = () => {},
}) {
  const totalFields = fields.length;
  const totalObservations = observations.length;

  const verifiedCount = observations.filter((observation) =>
    ["Corroborated", "Expert-confirmed"].includes(observation.status)
  ).length;

  const unresolvedObservations = observations.filter((observation) =>
    ["Unverified", "Conflicting", "Inconclusive"].includes(
      observation.status
    )
  );

  const priorityActions = [...unresolvedObservations]
    .sort((a, b) => {
      const priorityDifference = getPriority(a) - getPriority(b);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    })
    .slice(0, 5);

  const recentActivity = [
    ...evidenceHistory.map((item) => ({
      id: item.id,
      title: item.action || "Evidence activity",
      description: item.details || "A record was updated.",
      timestamp: item.timestamp,
      type: "evidence",
    })),
    ...transmissionLogs
  .filter((item) => item && typeof item === "object")
  .map((item) => ({
    id: item.id || `${item.timestamp || "log"}-${Math.random()}`,
    title:
      typeof item.message === "string"
        ? item.message
        : "System activity",
    description:
      typeof item.type === "string"
        ? item.type
        : "Activity",
    timestamp: item.timestamp,
    type: "system",
    simulated: item.simulated,
  })),
  ]
    .filter((item) => item.timestamp)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    )
    .slice(0, 5);

  const activeThreatCount =
    (threat ? 1 : 0) +
    neighbourAlerts.filter(
      (alert) =>
        !["Resolved", "Dismissed"].includes(alert.status)
    ).length;

  const hasUnverifiedThreat = Boolean(
    threat || neighbourAlerts.some((alert) => alert.status === "Unverified")
  );

  return (
    <section className="fieldzy-overview">
     <WeatherCard />
      {/* Welcome section */}
      <div className="overview-welcome">
        <div>
          <p className="overview-eyebrow">
            <Sprout size={15} />
            YOUR AGRICULTURAL COMMAND CENTRE
          </p>

          <h2>Know your fields. Verify what matters.</h2>

          <p>
            A clear view of your field records, evidence gaps, and outstanding
            actions — using information saved in this dashboard.
          </p>
        </div>

        <div
          className={`overview-connectivity ${
            isOffline ? "offline" : "online"
          }`}
        >
          {isOffline ? <Cloud size={18} /> : <Radio size={18} />}

          <div>
            <strong>{isOffline ? "Offline mode" : "Browser online"}</strong>
            <span>
              {isOffline
                ? "Local records may remain available"
                : "Internet connection reported"}
            </span>
          </div>
        </div>
      </div>

      {/* Main statistics */}
      <div className="overview-stat-grid">
        <button
          type="button"
          className="overview-stat-card"
          onClick={() => onNavigate("fields")}
        >
          <span className="overview-stat-icon">
            <Sprout size={21} />
          </span>

          <span className="overview-stat-label">Registered fields</span>
          <strong className="overview-stat-value">{totalFields}</strong>
          <span className="overview-stat-foot">
            View your fields <ArrowRight size={14} />
          </span>
        </button>

        <button
          type="button"
          className="overview-stat-card"
          onClick={() => onNavigate("observations")}
        >
          <span className="overview-stat-icon">
            <ClipboardCheck size={21} />
          </span>

          <span className="overview-stat-label">Observations</span>
          <strong className="overview-stat-value">{totalObservations}</strong>
          <span className="overview-stat-foot">
            Review records <ArrowRight size={14} />
          </span>
        </button>

        <button
          type="button"
          className="overview-stat-card"
          onClick={() => onNavigate("observations")}
        >
          <span className="overview-stat-icon warning">
            <CircleAlert size={21} />
          </span>

          <span className="overview-stat-label">Unverified records</span>
          <strong className="overview-stat-value">{unverifiedCount}</strong>
          <span className="overview-stat-foot">
            Need further review
          </span>
        </button>

        <button
          type="button"
          className="overview-stat-card"
          onClick={() => onNavigate("warnings")}
        >
          <span className="overview-stat-icon threat">
            <AlertTriangle size={21} />
          </span>

          <span className="overview-stat-label">Outstanding alerts</span>
          <strong className="overview-stat-value">{activeThreatCount}</strong>
          <span className="overview-stat-foot">
            {hasUnverifiedThreat
              ? "Includes unverified alerts"
              : "No active demo alert"}
          </span>
        </button>
      </div>

      {/* Evidence Debt and verification */}
      <div className="overview-primary-grid">
        <article className="overview-panel evidence-debt-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-section-label">EVIDENCE QUALITY</p>
              <h3>Evidence Debt</h3>
            </div>

            <ShieldCheck size={23} />
          </div>

          <div className="evidence-debt-score-row">
            <strong>{evidenceDebt}</strong>
            <span>/ 100</span>

            <span
              className={`evidence-debt-status ${
                evidenceDebt >= 60
                  ? "high"
                  : evidenceDebt >= 30
                    ? "medium"
                    : "low"
              }`}
            >
              {evidenceDebt >= 60
                ? "High outstanding debt"
                : evidenceDebt >= 30
                  ? "Moderate outstanding debt"
                  : "Lower outstanding debt"}
            </span>
          </div>

          <div
            className="evidence-debt-track"
            role="progressbar"
            aria-label="Evidence debt score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={evidenceDebt}
          >
            <div
              className={`evidence-debt-fill ${
                evidenceDebt >= 60
                  ? "high"
                  : evidenceDebt >= 30
                    ? "medium"
                    : "low"
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, evidenceDebt))}%`,
              }}
            />
          </div>

          <p className="overview-panel-description">
            A dashboard indicator based on unresolved evidence gaps and
            observations that still need verification. It is not a crop-risk
            prediction.
          </p>

          <div className="evidence-debt-breakdown">
            <div>
              <span>Unresolved evidence gaps</span>
              <strong>{unresolvedEvidenceCount}</strong>
            </div>

            <div>
              <span>Unverified observations</span>
              <strong>{unverifiedCount}</strong>
            </div>

            <div>
              <span>Verified observations</span>
              <strong>{verifiedCount}</strong>
            </div>
          </div>

          <button
            type="button"
            className="overview-text-button"
            onClick={() => onNavigate("observations")}
          >
            Review evidence gaps <ArrowRight size={16} />
          </button>
        </article>

        {/* Field summary */}
        <article className="overview-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-section-label">FIELD REGISTER</p>
              <h3>Field Health Summary</h3>
            </div>

            <Leaf size={23} />
          </div>

          <div className="field-summary-total">
            <strong>{totalFields}</strong>
            <span>registered fields</span>
          </div>

          {fields.length === 0 ? (
            <div className="overview-empty-state">
              <Sprout size={24} />
              <p>No fields registered yet.</p>
            </div>
          ) : (
            <div className="overview-field-list">
              {fields.slice(0, 5).map((field) => {
                const fieldObservations = observations.filter(
                  (observation) => observation.fieldId === field.id
                );

                const pendingCount = fieldObservations.filter(
                  (observation) =>
                    !["Corroborated", "Expert-confirmed"].includes(
                      observation.status
                    )
                ).length;

                return (
                  <button
                    type="button"
                    className="overview-field-row"
                    key={field.id}
                    onClick={() => onNavigate("fields")}
                  >
                    <span className="overview-field-icon">
                      <Sprout size={17} />
                    </span>

                    <span className="overview-field-copy">
                      <strong>{field.name}</strong>
                      <small>
                        {field.crop || "Crop unspecified"}
                      </small>
                    </span>

                    <span
                      className={`overview-field-count ${
                        pendingCount > 0 ? "has-pending" : ""
                      }`}
                    >
                      {pendingCount} pending
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {fields.length > 5 && (
            <p className="overview-panel-description">
              Showing 5 of {fields.length} registered fields.
            </p>
          )}

          <button
            type="button"
            className="overview-text-button"
            onClick={() => onNavigate("fields")}
          >
            Open My Fields <ArrowRight size={16} />
          </button>
        </article>
      </div>

      {/* Priority action queue */}
      <article className="overview-panel overview-action-panel">
        <div className="overview-panel-heading">
          <div>
            <p className="overview-section-label">WHAT NEEDS ATTENTION</p>
            <h3>Priority Action Queue</h3>
            <p className="overview-panel-description">
              Actions are generated from recorded observations and unresolved
              evidence gaps.
            </p>
          </div>

          <Activity size={23} />
        </div>

        {priorityActions.length === 0 ? (
          <div className="overview-success-state">
            <CheckCircle2 size={24} />

            <div>
              <strong>No outstanding verification actions</strong>
              <p>
                There are currently no unverified, conflicting, or
                inconclusive observations.
              </p>
            </div>
          </div>
        ) : (
          <div className="overview-action-list">
            {priorityActions.map((observation) => {
              const gapCount = (observation.evidenceGaps || []).filter(
                (gap) => !gap.resolved
              ).length;

              const priority = getPriority(observation);

              return (
                <div className="overview-action-row" key={observation.id}>
                  <span
                    className={`overview-action-marker priority-${priority}`}
                  >
                    {priority <= 2 ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <ClipboardCheck size={17} />
                    )}
                  </span>

                  <div className="overview-action-copy">
                    <div className="overview-action-title-row">
                      <strong>{observation.title}</strong>

                      <span
                        className={`overview-status-tag ${
                          observation.status === "Conflicting"
                            ? "conflicting"
                            : observation.status === "Inconclusive"
                              ? "inconclusive"
                              : "unverified"
                        }`}
                      >
                        {observation.status}
                      </span>
                    </div>

                    <p>
                      {observation.fieldName || "Field not specified"}
                      {" · "}
                      {gapCount} unresolved {gapCount === 1 ? "gap" : "gaps"}
                    </p>

                    <small>
                      {observation.nextAction ||
                        "Review the observation and collect supporting evidence."}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="overview-action-button"
                    onClick={() => onNavigate("observations")}
                    aria-label={`Review ${observation.title}`}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {unresolvedObservations.length > 5 && (
          <button
            type="button"
            className="overview-text-button"
            onClick={() => onNavigate("observations")}
          >
            View all {unresolvedObservations.length} outstanding records
            <ArrowRight size={16} />
          </button>
        )}
      </article>

      {/* Threat and network status */}
      <div className="overview-secondary-grid">
        <article className="overview-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-section-label">THREAT MONITORING</p>
              <h3>Active Threats & Alerts</h3>
            </div>

            <AlertTriangle size={22} />
          </div>

          {threat ? (
            <div className="overview-alert-card">
              <span className="overview-alert-badge">
                {threat.simulated ? "SIMULATED ALERT" : "RECORDED ALERT"}
              </span>

              <strong>{threat.title}</strong>

              <p>
                Status: {threat.status || "Unverified"}
                {threat.fieldId
                  ? ` · ${
                      fields.find((field) => field.id === threat.fieldId)
                        ?.name || "Field unavailable"
                    }`
                  : ""}
              </p>

              {threat.simulated && (
                <small>
                  Demonstration data — this is not a verified real-world
                  detection.
                </small>
              )}
            </div>
          ) : (
            <div className="overview-empty-state">
              <ShieldCheck size={27} />
              <p>No active demonstration threat is recorded.</p>
              <small>
                This does not establish that the farm is free of threats.
              </small>
            </div>
          )}

          {neighbourAlerts.length > 0 && (
            <div className="overview-neighbour-summary">
              <strong>{neighbourAlerts.length} neighbour alert record(s)</strong>
              <p>
                Review their source and verification status before acting on
                them.
              </p>
            </div>
          )}

          <button
            type="button"
            className="overview-text-button"
            onClick={() => onNavigate("warnings")}
          >
            Open Early Warnings <ArrowRight size={16} />
          </button>
        </article>

        <article className="overview-panel">
          <div className="overview-panel-heading">
            <div>
              <p className="overview-section-label">SYSTEM READINESS</p>
              <h3>Network & Local Storage</h3>
            </div>

            {isOffline ? <Cloud size={22} /> : <Radio size={22} />}
          </div>

          <div className="overview-network-status">
            <span
              className={`overview-network-indicator ${
                isOffline ? "offline" : "online"
              }`}
            />

            <div>
              <strong>{isOffline ? "Browser reports offline" : "Browser online"}</strong>
              <p>
                {isOffline
                  ? "Dashboard changes may be saved locally if browser storage is available."
                  : "Internet access is reported by the browser."}
              </p>
            </div>
          </div>

          <div className="overview-network-status">
            <span className="overview-network-indicator local" />

            <div>
              <strong>Local browser persistence</strong>
              <p>
                Dashboard state is stored in localStorage when saving succeeds.
                This is not a confirmed remote sync.
              </p>
            </div>
          </div>

          <div className="overview-network-status">
            <span className="overview-network-indicator local" />

            <div>
              <strong>Recorded activity</strong>
              <p>
                {transmissionLogs.length} activity log entries available.
                Nearby-device delivery is not verified by this count.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="overview-text-button"
            onClick={() => onNavigate("network")}
          >
            Open Network Systems <ArrowRight size={16} />
          </button>
        </article>
      </div>

      {/* Recent activity */}
      <article className="overview-panel overview-activity-panel">
        <div className="overview-panel-heading">
          <div>
            <p className="overview-section-label">AUDIT TRAIL</p>
            <h3>Recent Activity</h3>
          </div>

          <Clock3 size={22} />
        </div>

        {recentActivity.length === 0 ? (
          <div className="overview-empty-state">
            <Activity size={24} />
            <p>No recent activity has been recorded.</p>
          </div>
        ) : (
          <div className="overview-activity-list">
            {recentActivity.map((item) => (
              <div className="overview-activity-row" key={item.id}>
                <span
                  className={`overview-activity-icon ${
                    item.type === "evidence" ? "evidence" : "system"
                  }`}
                >
                  {item.type === "evidence" ? (
                    <ShieldCheck size={17} />
                  ) : (
                    <Activity size={17} />
                  )}
                </span>

                <div className="overview-activity-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  {item.simulated && (
                    <small>Simulated demonstration activity</small>
                  )}
                </div>

                <time dateTime={item.timestamp}>
                  {formatTime(item.timestamp)}
                </time>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="overview-disclaimer">
        <ShieldCheck size={17} />
        <p>
          <strong>Evidence-first monitoring:</strong> Dashboard indicators
          reflect stored records. Alerts, sound labels, and network
          demonstrations should be independently verified before agricultural
          decisions are made.
        </p>
      </div>
    </section>
  );
}