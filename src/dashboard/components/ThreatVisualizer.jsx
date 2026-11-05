import { useMemo, useState } from "react";
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

const INITIAL_EVENTS = [
  {
    id: 1,
    field: "Field 02",
    type: "Sound deviation",
    detail: "Audio measurements differed from the saved field reference.",
    time: "Latest assessment",
    level: "review",
    evidence: "Measurement difference",
    verified: false,
  },
  {
    id: 2,
    field: "Field 05",
    type: "Sensor unavailable",
    detail: "A sensor status needs checking before the field can be assessed.",
    time: "Device status",
    level: "urgent",
    evidence: "Device status",
    verified: false,
  },
  {
    id: 3,
    field: "Field 01",
    type: "Routine observation",
    detail: "No unresolved observation has been added to this example feed.",
    time: "Field overview",
    level: "normal",
    evidence: "Routine status",
    verified: true,
  },
];

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
  events = INITIAL_EVENTS,
  onReview,
}) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(1);

  const safeEvents = Array.isArray(events) ? events : INITIAL_EVENTS;

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
          Illustrative data
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
            <strong>No items in this category</strong>
            <p>Choose another filter to see other field statuses.</p>
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
                        <strong>{event.type}</strong>
                        <span className="tv-status-badge">{status.label}</span>
                      </span>

                      <span className="tv-event-detail">{event.detail}</span>

                      <span className="tv-event-meta">
                        <span>{event.field}</span>
                        <span>·</span>
                        <span>
                          <Clock3 size={13} />
                          {event.time}
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
                          {event.verified ? "Routine status" : "Still required"}
                        </strong>
                      </div>

                      <p className="tv-review-note">
                        {event.level === "normal"
                          ? "Continue routine checks. This status does not guarantee that the field is free from risk."
                          : "Inspect the field and relevant sensor information. Record what you actually observe before classifying the cause."}
                      </p>

                      {onReview && !event.verified && (
                        <button
                          type="button"
                          className="tv-review-button"
                          onClick={() => onReview(event)}
                        >
                          <Eye size={16} />
                          Review this item
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
          This visualizer organizes status information. It does not independently
          detect, diagnose, or confirm threats. Example items are illustrative
          until connected to real FIELDZY observations and sensor data.
        </p>
      </footer>
    </section>
  );
}