import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Search,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Eye,
  ClipboardCheck,
  WifiOff,
  Info,
} from "lucide-react";

export default function EarlyWarnings({
  fields = [],
  observations = [],
  threat,
  isOffline,
  onNavigate,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [reviewedIds, setReviewedIds] = useState([]);

  const reports = useMemo(() => {
    return observations.filter((observation) => {
      const query = search.trim().toLowerCase();

      const matchesSearch = [
        observation.title,
        observation.fieldName,
        observation.category,
        observation.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (observation.status || "Unverified") === statusFilter;

      const rawSeverity = String(
        observation.severity || observation.priority || ""
      ).toLowerCase();

      const severity =
        ["critical", "high", "medium", "low"].includes(rawSeverity)
          ? rawSeverity.charAt(0).toUpperCase() + rawSeverity.slice(1)
          : "Unassessed";

      const matchesSeverity =
        severityFilter === "All" || severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [observations, search, statusFilter, severityFilter]);

  const unverifiedCount = observations.filter((observation) =>
    ["Unverified", "Conflicting", "Inconclusive"].includes(
      observation.status || "Unverified"
    )
  ).length;

  const unresolvedCount = observations.reduce(
    (total, observation) =>
      total +
      (observation.evidenceGaps || []).filter((gap) => !gap.resolved).length,
    0
  );

  const reviewedCount = observations.filter((observation) =>
    reviewedIds.includes(observation.id)
  ).length;

  function toggleReviewed(id) {
    setReviewedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function getSeverity(observation) {
    const value = String(
      observation.severity || observation.priority || ""
    ).toLowerCase();

    if (value === "critical") return "Critical";
    if (value === "high") return "High";
    if (value === "medium") return "Medium";
    if (value === "low") return "Low";

    return "Unassessed";
  }

  function getSeverityClass(severity) {
    return `ew-severity ew-severity-${severity.toLowerCase()}`;
  }

  return (
    <section className="early-warnings">
      <header className="ew-header">
        <div>
          <span className="ew-eyebrow">FIELDZY INTELLIGENCE</span>
          <h2>Early Warnings</h2>
          <p>
            Review potential field risks, inspect supporting evidence, and
            track reports requiring attention.
          </p>
        </div>

        <span className="ew-connection">
          {isOffline ? <WifiOff size={15} /> : <ShieldCheck size={15} />}
          {isOffline ? "Offline · Local data" : "Local data"}
        </span>
      </header>

      <div className="ew-notice">
        <Info size={20} />
        <p>
          <strong>Evidence first.</strong> Severity and verification are
          separate. Reports without an assigned severity remain unassessed,
          and unverified reports must not be treated as confirmed threats.
        </p>
      </div>

      <div className="ew-summary">
        <article className="ew-stat">
          <span className="ew-stat-icon ew-green">
            <ShieldCheck size={21} />
          </span>
          <div>
            <p>Fields monitored</p>
            <h3>{fields.length}</h3>
            <span>Registered fields</span>
          </div>
        </article>

        <article className="ew-stat">
          <span className="ew-stat-icon ew-amber">
            <AlertTriangle size={21} />
          </span>
          <div>
            <p>Reports to verify</p>
            <h3>{unverifiedCount}</h3>
            <span>Unverified or inconclusive</span>
          </div>
        </article>

        <article className="ew-stat">
          <span className="ew-stat-icon ew-red">
            <Eye size={21} />
          </span>
          <div>
            <p>Open evidence gaps</p>
            <h3>{unresolvedCount}</h3>
            <span>Questions still unresolved</span>
          </div>
        </article>

        <article className="ew-stat">
          <span className="ew-stat-icon ew-blue">
            <ClipboardCheck size={21} />
          </span>
          <div>
            <p>Reviewed this session</p>
            <h3>{reviewedCount}</h3>
            <span>Review progress</span>
          </div>
        </article>
      </div>

      {threat && (
        <div className="ew-threat">
          <AlertTriangle size={21} />
          <div>
            <strong>Reported alert: {threat.title}</strong>
            <p>
              {threat.description ||
                "Review the available evidence before acting on this report."}
            </p>
            <span>
              This alert is not independently verified by this dashboard.
            </span>
          </div>
        </div>
      )}

      <div className="ew-reports">
        <div className="ew-reports-heading">
          <div>
            <h3>Field Risk Reports</h3>
            <p>Reports recorded in FIELDZY's local dashboard data.</p>
          </div>

          <span className="ew-count">{reports.length} reports</span>
        </div>

        <div className="ew-filters">
          <label className="ew-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search reports or fields..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search reports"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by verification status"
          >
            <option value="All">All statuses</option>
            <option value="Unverified">Unverified</option>
            <option value="Conflicting">Conflicting</option>
            <option value="Corroborated">Corroborated</option>
            <option value="Expert-confirmed">Expert-confirmed</option>
            <option value="Inconclusive">Inconclusive</option>
          </select>

          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            aria-label="Filter by severity"
          >
            <option value="All">All severity levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Unassessed">Unassessed</option>
          </select>
        </div>

        {reports.length === 0 ? (
          <div className="ew-empty">
            <ShieldCheck size={32} />
            <h4>No matching reports</h4>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="ew-list">
            {reports.map((observation) => {
              const gaps = observation.evidenceGaps || [];
              const openGaps = gaps.filter((gap) => !gap.resolved).length;
              const evidenceCount = (observation.evidence || []).length;
              const severity = getSeverity(observation);
              const isReviewed = reviewedIds.includes(observation.id);
              const verification = observation.status || "Unverified";

              return (
                <article className="ew-report" key={observation.id}>
                  <div className="ew-report-top">
                    <span className="ew-category">
                      {observation.category || observation.type || "General"}
                    </span>

                    <span className={getSeverityClass(severity)}>
                      {severity === "Unassessed" && (
                        <Info size={13} />
                      )}
                      {severity}
                    </span>
                  </div>

                  <h4>{observation.title || "Untitled observation"}</h4>

                  <p className="ew-field">
                    Field: {observation.fieldName || "Unknown field"}
                  </p>

                  <p className="ew-description">
                    {observation.description || "No description provided."}
                  </p>

                  <div className="ew-verification">
                    <ShieldCheck size={16} />
                    <span>Evidence status:</span>
                    <strong>{verification}</strong>
                  </div>

                  <div className="ew-metadata">
                    <span>
                      <ShieldCheck size={15} />
                      {evidenceCount} evidence notes
                    </span>

                    <span>
                      <AlertTriangle size={15} />
                      {openGaps} open gaps
                    </span>

                    <span>
                      <Clock size={15} />
                      {observation.createdAt
                        ? new Date(observation.createdAt).toLocaleString()
                        : "Time unavailable"}
                    </span>
                  </div>

                  {observation.nextAction && (
                    <div className="ew-next-action">
                      <strong>Suggested next step</strong>
                      <p>{observation.nextAction}</p>
                    </div>
                  )}

                  <div className="ew-actions">
                    <button
                      type="button"
                      className={`ew-review-button ${
                        isReviewed ? "is-reviewed" : ""
                      }`}
                      onClick={() => toggleReviewed(observation.id)}
                    >
                      <CheckCircle2 size={16} />
                      {isReviewed ? "Reviewed" : "Mark as reviewed"}
                    </button>

                    <button
                      type="button"
                      className="ew-secondary-button"
                      onClick={() => onNavigate?.("observations")}
                    >
                      View observations
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <footer className="ew-footer">
        <Info size={18} />
        <p>
          FIELDZY displays locally recorded observations. It does not currently
          provide live weather alerts, independently verify threats, or
          diagnose crop disease. Confirm important findings through field
          inspection and appropriate expert advice.
        </p>
      </footer>
    </section>
  );
}