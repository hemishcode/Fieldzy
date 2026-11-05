
import { useMemo, useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Eye,
  ShieldCheck,
  Waves,
} from "lucide-react";

const STATUS = {
  normal: {
    label: "Normal",
    short: "Stable",
    icon: CheckCircle2,
  },
  review: {
    label: "Review needed",
    short: "Review",
    icon: Eye,
  },
  urgent: {
    label: "Urgent review",
    short: "Urgent",
    icon: AlertTriangle,
  },
};

export default function ThreatVisualizer({
  events = [],
  onReview,
}) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);

  const safeEvents = Array.isArray(events) ? events : [];

  useEffect(() => {
    if (
      expandedId !== null &&
      !safeEvents.some((event) => event.id === expandedId)
    ) {
      setExpandedId(null);
    }
  }, [safeEvents, expandedId]);

  const counts = useMemo(
    () => ({
      normal: safeEvents.filter((event) => event.level === "normal").length,
      review: safeEvents.filter((event) => event.level === "review").length,
      urgent: safeEvents.filter((event) => event.level === "urgent").length,
    }),
    [safeEvents]
  );

  const visibleEvents = safeEvents.filter(
    (event) => filter === "all" || event.level === filter
  );

  const needsReview = counts.review + counts.urgent;

  const simulatedCount = safeEvents.filter(
    (event) => event.simulated
  ).length;

  const badgeLabel =
    safeEvents.length === 0
      ? "No active events"
      : simulatedCount === safeEvents.length
        ? "Simulated data"
        : simulatedCount > 0
          ? "Mixed data"
          : "Recorded events";

  async function handleReview(event) {
    if (!onReview || reviewingId === event.id) return;

    setReviewingId(event.id);

    try {
      await onReview(event);
    } catch (error) {
      console.error("Threat review failed:", error);
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <section className="threat-visualizer">
      <header className="tv-header">
        <div className="tv-heading">
          <span className="tv-heading-icon">
            <Activity size={22} />
          </span>

          <div>
            <p className="tv-eyebrow">FIELDZY · FIELD SAFETY</p>
            <h2>Threat Visualizer</h2>
            <p className="tv-subtitle">
              Understand field signals, review evidence, and decide what
              needs attention.
            </p>
          </div>
        </div>

        <span className="tv-demo-badge">
          <span />
          {badgeLabel}
        </span>
      </header>

      <div className="tv-summary">
        <article className="tv-summary-card tv-summary-normal">
          <span className="tv-summary-icon">
            <CheckCircle2 size={20} />
          </span>
          <span className="tv-summary-label">Normal</span>
          <strong>{counts.normal}</strong>
          <small>Routine status items</small>
        </article>

        <article className="tv-summary-card tv-summary-review">
          <span className="tv-summary-icon">
            <Eye size={20} />
          </span>
          <span className="tv-summary-label">Review needed</span>
          <strong>{counts.review}</strong>
          <small>Signals requiring a closer look</small>
        </article>

        <article className="tv-summary-card tv-summary-urgent">
          <span className="tv-summary-icon">
            <AlertTriangle size={20} />
          </span>
          <span className="tv-summary-label">Urgent review</span>
          <strong>{counts.urgent}</strong>
          <small>Priority checks, not confirmed threats</small>
        </article>
      </div>

      <div className="tv-main-grid">
        <section className="tv-panel tv-overview-panel">
          <div className="tv-panel-heading">
            <div>
              <p className="tv-eyebrow">FIELD OVERVIEW</p>
              <h3>Current attention level</h3>
            </div>
            <ShieldCheck size={22} />
          </div>

          <div className={`tv-attention-state ${needsReview ? "has-review" : ""}`}>
            <div className="tv-attention-icon">
              {needsReview ? (
                <AlertTriangle size={25} />
              ) : (
                <CheckCircle2 size={25} />
              )}
            </div>

            <div>
              <strong>
                {needsReview
                  ? `${needsReview} item${needsReview === 1 ? "" : "s"} need review`
                  : "No pending review items"}
              </strong>
              <p>
                {needsReview
                  ? "Check the available evidence before deciding whether field action is necessary."
                  : "Continue routine monitoring and field checks."}
              </p>
            </div>
          </div>

          <div className="tv-attention-meter">
            <div>
              <span>Items requiring review</span>
              <strong>
                {safeEvents.length
                  ? Math.round((needsReview / safeEvents.length) * 100)
                  : 0}%
              </strong>
            </div>

            <div className="tv-meter-track">
              <span
                style={{
                  width: `${
                    safeEvents.length
                      ? Math.min(100, (needsReview / safeEvents.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>

            <small>
              Share of listed items needing review. This is not a threat
              probability.
            </small>
          </div>

          <div className="tv-guidance">
            <CircleHelp size={19} />
            <p>
              <strong>Remember:</strong> an unusual sound or unavailable sensor
              is a reason to investigate, not proof of an agricultural threat.
            </p>
          </div>
        </section>

        <section className="tv-panel tv-legend-panel">
          <div className="tv-panel-heading">
            <div>
              <p className="tv-eyebrow">STATUS GUIDE</p>
              <h3>How to read the signals</h3>
            </div>
            <Waves size={22} />
          </div>

          {Object.entries(STATUS).map(([key, status]) => {
            const Icon = status.icon;

            return (
              <div className={`tv-legend-row tv-legend-${key}`} key={key}>
                <span className="tv-legend-icon">
                  <Icon size={19} />
                </span>
                <div>
                  <strong>{status.label}</strong>
                  <p>
                    {key === "normal"
                      ? "Routine status; continue normal checks."
                      : key === "review"
                        ? "Inspect the measurements and gather more evidence."
                        : "Prioritize a human check; confirm before taking action."}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="tv-panel tv-events-panel">
        <div className="tv-panel-heading tv-events-heading">
          <div>
            <p className="tv-eyebrow">SIGNAL REGISTER</p>
            <h3>Items to inspect</h3>
            <p className="tv-subtitle">
              Select an item to inspect its evidence and review guidance.
            </p>
          </div>

          <label className="tv-filter">
            <span>Filter</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All items</option>
              <option value="normal">Normal</option>
              <option value="review">Review needed</option>
              <option value="urgent">Urgent review</option>
            </select>
          </label>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="tv-empty">
            <CheckCircle2 size={27} />
            <strong>No active threat events</strong>
            <p>
              No threat records are currently available. This does not mean
              the farm is free from threats.
            </p>
          </div>
        ) : (
          <div className="tv-event-list">
            {visibleEvents.map((event) => {
              const status = STATUS[event.level] || STATUS.review;
              const Icon = status.icon;
              const expanded = expandedId === event.id;

              return (
                <article
                  className={`tv-event tv-event-${event.level}`}
                  key={event.id}
                >
                  <button
                    type="button"
                    className="tv-event-toggle"
                    onClick={() =>
                      setExpandedId(expanded ? null : event.id)
                    }
                    aria-expanded={expanded}
                  >
                    <span className="tv-event-icon">
                      <Icon size={21} />
                    </span>

                    <span className="tv-event-main">
                      <span className="tv-event-title-row">
                        <strong>{event.type || "Threat alert"}</strong>
                        <span className="tv-status-badge">
                          {status.label}
                        </span>
                      </span>

                      <span className="tv-event-detail">
                        {event.detail || "Additional inspection is required."}
                      </span>

                      <span className="tv-event-meta">
                        <span>{event.field || "Field not assigned"}</span>
                        <span>·</span>
                        <span>
                          <Clock3 size={13} />
                          {event.time || "Time unavailable"}
                        </span>
                      </span>
                    </span>

                    <ChevronDown
                      className={`tv-chevron ${expanded ? "is-open" : ""}`}
                      size={19}
                    />
                  </button>

                  {expanded && (
                    <div className="tv-event-expanded">
                      <div className="tv-evidence-row">
                        <span>Available evidence</span>
                        <strong>{event.evidence || "Not provided"}</strong>
                      </div>

                      <div className="tv-evidence-row">
                        <span>Human verification</span>
                        <strong>
                          {event.verified ? "Reviewed" : "Still required"}
                        </strong>
                      </div>

                      <div className="tv-evidence-row">
                        <span>Data source</span>
                        <strong>
                          {event.simulated ? "Simulated" : "Recorded"}
                        </strong>
                      </div>

                      <p className="tv-review-note">
                        {event.verified
                          ? "This item has been marked as reviewed. Continue routine monitoring."
                          : "Inspect the field and relevant sensor information. Record what you actually observe before classifying the cause."}
                      </p>

                      {onReview && !event.verified && (
                        <button
                          type="button"
                          className="tv-review-button"
                          disabled={reviewingId === event.id}
                          onClick={() => handleReview(event)}
                        >
                          <Eye size={16} />
                          {reviewingId === event.id
                            ? "Recording review..."
                            : "Review this item"}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="tv-footer">
        <ShieldCheck size={18} />
        <p>
          This visualizer organizes stored alert information. It does not
          independently detect, diagnose, or confirm threats. Simulated
          demonstration events are not real-world detections.
        </p>
      </footer>
    </section>
  );
}
