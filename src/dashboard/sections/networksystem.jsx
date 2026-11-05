import { useEffect, useMemo, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Radio,
  Database,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  ShieldCheck,
} from "lucide-react";

const STORAGE_KEY = "fieldzy-network-relay-v1";

function readSavedLogs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function NetworkSystems({
  observations = [],
  transmissionLogs = [],
  isOffline: dashboardOffline,
  addLog,
  receiveDemoNeighbourAlert,
  syncPendingObservations,
}) {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const [relayLogs, setRelayLogs] = useState(readSavedLogs);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(relayLogs));
    } catch {
      // Keep the dashboard usable if browser storage is unavailable.
    }
  }, [relayLogs]);

  const online =
    dashboardOffline === undefined
      ? browserOnline
      : browserOnline && !dashboardOffline;

const queue = useMemo(
  () =>
    observations
      .filter((observation) => {
        const status = String(
          observation.syncStatus || "pending"
        ).toLowerCase();

        return status !== "synced";
      })
      .map((observation) => ({
        id: observation.id,
        title: observation.title || "Untitled observation",
        fieldName: observation.fieldName || "Unknown field",
        status: observation.status || "Unverified",
        syncStatus: observation.syncStatus || "pending",
        evidenceGaps: Array.isArray(observation.evidenceGaps)
          ? observation.evidenceGaps.filter((gap) => !gap.resolved).length
          : Number(observation.evidenceGaps) || 0,
        createdAt: observation.createdAt || null,
      })),
  [observations]
);

  const unverifiedCount = queue.filter(
    (item) => item.status === "Unverified"
  ).length;

  const evidenceGapCount = queue.reduce(
    (total, item) => total + item.evidenceGaps,
    0
  );

  function recordRelayEvent(action, message) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      message,
      time: new Date().toISOString(),
      online,
    };

    setRelayLogs((previous) => [entry, ...previous].slice(0, 50));

    if (typeof addLog === "function") {
  addLog(message, "network");
}
  }

  function handleCheckConnection() {
    const connected = navigator.onLine;
    setBrowserOnline(connected);

    recordRelayEvent(
      "Connection check",
      connected
        ? "Browser reports an internet connection. Server delivery has not been verified."
        : "Browser reports no internet connection. Observations remain in local dashboard storage."
    );
  }

  function handlePrepareQueue() {
    recordRelayEvent(
      "Queue reviewed",
      `${queue.length} observations reviewed. ${unverifiedCount} are unverified, with ${evidenceGapCount} open evidence gaps. No server upload was performed.`
    );
  }

async function handleRetry() {
  if (!online) {
    recordRelayEvent(
      "Sync postponed",
      "You are offline. Pending observations remain saved locally."
    );
    return;
  }

  if (typeof syncPendingObservations !== "function") {
    recordRelayEvent(
      "Sync failed",
      "Observation sync service is unavailable."
    );
    return;
  }

  recordRelayEvent(
    "Sync started",
    "Attempting to sync pending observations with Supabase."
  );

  try {
    const result = await syncPendingObservations();

    recordRelayEvent(
      result.success ? "Sync completed" : "Sync failed",
      result.message
    );
  } catch (error) {
    console.error("Sync retry failed:", error);

    recordRelayEvent(
      "Sync failed",
      "An unexpected error occurred. Pending records remain locally saved."
    );
  }
}

  async function handleSendDemoAlert() {
  if (typeof receiveDemoNeighbourAlert !== "function") {
    recordRelayEvent(
      "Alert failed",
      "Neighbour alert service is unavailable."
    );
    return;
  }

  const result = await receiveDemoNeighbourAlert({
    originNode: "North Field",
    title: "Demo alert: unusual sound category detected",
    sourceReportId: `demo-${Date.now()}`,
  });

  if (result?.success) {
    recordRelayEvent(
      "Demo alert recorded",
      "A simulated farm alert was saved to Supabase. No physical device transmission occurred."
    );
  } else {
    recordRelayEvent(
      "Alert failed",
      result?.message || "Could not save the demo alert."
    );
  }
}

  const visibleLogs = [
  ...relayLogs.map((log) => ({
    ...log,
    source: "Relay",
    timestamp: log.time,
  })),
  ...transmissionLogs
    .filter((log) => log && typeof log === "object")
    .map((log) => ({
      ...log,
      source: "Dashboard",
      time: log.timestamp,
      online: !log.offline,
    })),
].filter((log) => {
  if (filter === "Online") return log.online;
  if (filter === "Offline") return !log.online;
  return true;
});

  function formatTime(value) {
    if (!value) return "Time unavailable";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";

    return date.toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="network-section">
      <div className="network-header">
        <div>
          <span className="network-eyebrow">FIELDZY CONNECTIVITY</span>
          <h2>Offline Relay</h2>
          <p>
            Track local observations, connection health, and relay activity
            without misreporting delivery.
          </p>
        </div>

        <div
          className={`network-status ${
            online ? "is-online" : "is-offline"
          }`}
        >
          {online ? <Wifi size={19} /> : <WifiOff size={19} />}
          <span>{online ? "Browser online" : "Browser offline"}</span>
        </div>
      </div>

      <div className="network-notice">
        <ShieldCheck size={21} />
        <div>
          <strong>Local data protection</strong>
          <p>
            Observations are managed by FIELDZY's dashboard. An internet
            connection does not mean records have reached a server.
          </p>
        </div>
      </div>

      <div className="network-stats">
        <article className="network-stat dashboard-card">
          <div className="network-stat-icon">
            <Database size={20} />
          </div>
          <span>Tracked observations</span>
          <strong>{queue.length}</strong>
          <small>Available in this dashboard</small>
        </article>

        <article className="network-stat dashboard-card">
          <div className="network-stat-icon">
            <Clock3 size={20} />
          </div>
          <span>Unverified records</span>
          <strong>{unverifiedCount}</strong>
          <small>Require further review</small>
        </article>

        <article className="network-stat dashboard-card">
          <div className="network-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <span>Evidence gaps</span>
          <strong>{evidenceGapCount}</strong>
          <small>Evidence still needed</small>
        </article>

        <article className="network-stat dashboard-card">
          <div className="network-stat-icon">
            <Activity size={20} />
          </div>
          <span>Relay events</span>
          <strong>{relayLogs.length}</strong>
          <small>Saved activity entries</small>
        </article>
      </div>

      <div className="network-main-grid">
        <article className="dashboard-card network-panel">
          <div className="network-panel-heading">
            <div>
              <Radio size={20} />
              <h3>Connection monitor</h3>
            </div>
            <span
              className={`network-dot ${online ? "online" : "offline"}`}
            />
          </div>

          <p className="network-muted">
            Checks the browser's reported connectivity. It does not test a
            FIELDZY server or physical sensor connection.
          </p>

          <div className="network-connection-row">
            <span>Internet connection</span>
            <strong>{online ? "Available" : "Unavailable"}</strong>
          </div>

          <div className="network-connection-row">
  <span>Supabase database</span>
  <strong>Connected</strong>
</div>

          <div className="network-connection-row">
            <span>Physical sensors</span>
            <strong>Not connected</strong>
          </div>

<div className="network-button-row">
  <button
    className="network-button network-button-primary"
    onClick={handleCheckConnection}
  >
    <RefreshCw size={16} />
    Check connection
  </button>

  <button
    className="network-button"
    onClick={handlePrepareQueue}
  >
    Review queue
    <ArrowUpRight size={16} />
  </button>

  <button
    className="network-button network-button-primary"
    onClick={handleSendDemoAlert}
  >
    <Radio size={16} />
    Send Demo Alert
  </button>
</div>
        </article>

        <article className="dashboard-card network-panel">
          <div className="network-panel-heading">
            <div>
              <Database size={20} />
              <h3>Observation queue</h3>
            </div>
            <span className="network-count">{queue.length}</span>
          </div>

          {queue.length === 0 ? (
            <div className="network-empty">
              <CheckCircle2 size={26} />
              <strong>No observations yet</strong>
              <p>New field observations will appear here.</p>
            </div>
          ) : (
            <div className="network-queue-list">
              {queue.slice(0, 5).map((item) => (
                <div className="network-queue-item" key={item.id}>
                  <div className="network-queue-copy">
                    <strong>{item.title}</strong>
                    <span>
                      {item.fieldName} · {formatTime(item.createdAt)}
                    </span>
                    {item.evidenceGaps > 0 && (
                      <small>
                        {item.evidenceGaps} evidence gap
                        {item.evidenceGaps === 1 ? "" : "s"}
                      </small>
                    )}
                  </div>

                  <div className="network-status-stack">
  <span className="network-record-status">
    {item.status}
  </span>

  <span className="network-sync-status">
    {item.syncStatus === "synced"
      ? "Synced"
      : "Pending Sync"}
  </span>
</div>
                </div>
              ))}
            </div>
          )}

          <p className="network-footnote">
  Pending observations are stored locally and can be synced to Supabase
  when an internet connection is available.
</p>

          <button
            className="network-button network-button-primary network-full-button"
            onClick={handleRetry}
          >
            <RefreshCw size={16} />
            Check sync readiness
          </button>
        </article>
      </div>

      <article className="dashboard-card network-history">
        <div className="network-history-heading">
          <div>
            <span className="network-eyebrow">AUDIT TRAIL</span>
            <h3>Transmission activity</h3>
          </div>

          <select
            aria-label="Filter transmission activity"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>All</option>
            <option>Online</option>
            <option>Offline</option>
          </select>
        </div>

        {visibleLogs.length === 0 ? (
          <div className="network-empty">
            <Clock3 size={25} />
            <strong>No relay activity recorded</strong>
            <p>Connection checks and queue reviews will appear here.</p>
          </div>
        ) : (
          <div className="network-log-list">
            {visibleLogs.map((log) => (
              <div className="network-log-item" key={log.id}>
                <span
                  className={`network-log-icon ${
                    log.online ? "online" : "offline"
                  }`}
                >
                  {log.online ? <Wifi size={17} /> : <WifiOff size={17} />}
                </span>

                <div>
                 <strong>
  {typeof log.action === "string"
    ? log.action
    : typeof log.message === "string"
      ? log.message
      : "System activity"}
</strong>
                  {typeof log.message === "string" ? log.message : "System activity"}
                  <small>{formatTime(log.time || log.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="network-footnote">
          {transmissionLogs.length > 0
            ? `${transmissionLogs.length} existing dashboard transmission log entries are available separately.`
            : "No existing dashboard transmission logs were supplied to this section."}
        </p>
      </article>
    </section>
  );
}