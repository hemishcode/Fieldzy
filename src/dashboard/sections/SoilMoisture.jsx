
import { useState } from "react";
import {
  Droplets,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Sprout,
  Activity,
} from "lucide-react";

export default function SoilMoisture({
  fields = [],
  addObservation,
  addLog,
}) {
  const [selectedField, setSelectedField] = useState(
    fields[0]?.id ?? ""
  );
  const [moisture, setMoisture] = useState(42);
  const [savedReadings, setSavedReadings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const field = fields.find(
    (item) => String(item.id) === String(selectedField)
  );

  const status =
    moisture <= 20
      ? "Critical"
      : moisture <= 35
      ? "Low"
      : moisture <= 65
      ? "Healthy"
      : "High";

  const statusColor =
    status === "Critical"
      ? "#c74736"
      : status === "Low"
      ? "#c58b36"
      : status === "Healthy"
      ? "#477c52"
      : "#528ca0";

  const irrigationPlan = fields.map((item) => {
    const reading = savedReadings.find(
      (entry) => String(entry.fieldId) === String(item.id)
    );

    const value = reading?.moisture ?? null;

    return {
      field: item,
      moisture: value,
      priority:
        value === null
          ? "Needs measurement"
          : value <= 20
          ? "High priority"
          : value <= 35
          ? "Review soon"
          : "No immediate flag",
      color:
        value === null
          ? "#858b7c"
          : value <= 20
          ? "#c74736"
          : value <= 35
          ? "#c58b36"
          : "#477c52",
      action:
        value === null
          ? "Save a demo reading before reviewing this field."
          : value <= 20
          ? "Inspect field conditions promptly."
          : value <= 35
          ? "Review moisture conditions and inspect the field."
          : "Continue monitoring and use field conditions to guide decisions.",
    };
  });

  async function saveReading() {
    if (!selectedField || !field) {
      setError("Please select a field first.");
      return;
    }

    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    const capturedAt = new Date().toISOString();

    const reading = {
      id: Date.now(),
      fieldId: selectedField,
      fieldName: field.name ?? field.label ?? "Demo Field",
      moisture,
      status,
      timestamp: new Date(capturedAt).toLocaleString(),
      capturedAt,
    };

    // Save the demo reading in the component's local history.
    setSavedReadings((previous) => [reading, ...previous]);

    try {
      // Only low and critical readings create observations.
      if (status === "Low" || status === "Critical") {
        if (typeof addObservation !== "function") {
          throw new Error("Observation service is unavailable.");
        }

        setMessage("Validating soil moisture evidence...");

        const evidence = [
          {
            type: "soil_moisture_reading",
            source: "FIELDZY Soil Moisture Demo",
            measurement: moisture,
            unit: "percentage",
            measurement_source: "simulated",
            field_name: reading.fieldName,
            captured_at: capturedAt,
          },
        ];

        const context = {
          measurement_source: "simulated",
          measurement_location: reading.fieldName,
          measurement_time: capturedAt,
        };

        // Send the reading to the central evidence engine.
        const response = await fetch(
          "https://owns-artists-pill-occasions.trycloudflare.com/validate-evidence",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              feature: "soil",
              model_result: {},
              context,
              evidence,
            }),
          }
        );

        const validation = await response.json();

        if (!response.ok) {
          const detail =
            typeof validation.detail === "string"
              ? validation.detail
              : "Soil evidence validation failed.";

          throw new Error(detail);
        }

        const evidenceGaps = (
          validation.missing_evidence || []
        ).map((item) => ({
          question: item.question,
          resolved: false,
        }));

        const description = [
          `A simulated soil moisture reading of ${moisture}% was recorded.`,
          `Field: ${reading.fieldName}.`,
          `Reading status: ${status}.`,
          "This is simulated data, not a physical sensor measurement.",
          `Evidence assessment: ${validation.status || "insufficient"}.`,
          validation.reasoning || "",
        ].join(" ");

        // Save the validated observation through Dashboard.
        const result = await addObservation({
          fieldId: selectedField,
          category: "Soil Moisture",
          title: `Soil moisture ${status.toLowerCase()}`,
          description,
          evidence,
          evidenceGaps,
          validation,
          nextAction:
            validation.next_action ||
            "Connect a calibrated soil moisture sensor and verify the field conditions.",
        });

        if (result?.success === false) {
          throw new Error(
            result.message || "Could not save the observation."
          );
        }

        setMessage(
          `Reading saved and observation created. Evidence status: ${
            validation.status || "insufficient"
          }.`
        );
      } else {
        setMessage(
          "Demo reading saved. No observation was required for this reading."
        );
      }

      if (typeof addLog === "function") {
        addLog(
          `Soil moisture demo reading saved: ${moisture}% (${status}).`
        );
      }
    } catch (saveError) {
      console.error("Soil moisture save failed:", saveError);
      setError(
        saveError.message || "Could not process the soil moisture reading."
      );
      setMessage(
        "The demo reading is saved locally, but its observation could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="sm-page">
      <header className="sm-header">
        <div>
          <span className="sm-eyebrow">FIELD INTELLIGENCE</span>
          <h1>Soil Moisture</h1>
          <p>
            Understand field moisture and review potential irrigation needs.
          </p>
        </div>

        <div className="sm-demo-badge">
          <Activity size={16} />
          Demo simulation
        </div>
      </header>

      <section className="sm-notice">
        <AlertTriangle size={19} />
        <div>
          <strong>No physical sensor connected</strong>
          <p>
            Adjust the demo reading below to explore the interface.
            These values are simulated and must not be treated as real
            measurements or irrigation instructions.
          </p>
        </div>
      </section>

      <section className="sm-grid">
        <article className="sm-card sm-main-card">
          <div className="sm-card-heading">
            <div className="sm-icon">
              <Droplets size={22} />
            </div>
            <div>
              <h2>Moisture level</h2>
              <p>Simulated reading</p>
            </div>
          </div>

          <div className="sm-reading">
            <span>{moisture}</span>
            <small>%</small>
          </div>

          <div className="sm-meter">
            <div
              className="sm-meter-fill"
              style={{
                width: `${moisture}%`,
                background: statusColor,
              }}
            />
          </div>

          <div className="sm-meter-labels">
            <span>Dry</span>
            <span>Balanced</span>
            <span>Wet</span>
          </div>

          <label className="sm-slider-label" htmlFor="sm-moisture">
            Adjust simulated moisture
          </label>

          <input
            id="sm-moisture"
            className="sm-slider"
            type="range"
            min="0"
            max="100"
            value={moisture}
            onChange={(event) =>
              setMoisture(Number(event.target.value))
            }
          />

          <div className="sm-status" style={{ color: statusColor }}>
            {status === "Healthy" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <strong>{status}</strong>
          </div>

          <button
            className="sm-button"
            onClick={saveReading}
            disabled={saving}
          >
            {saving ? "Validating..." : "Save demo reading"}
          </button>

          {message && (
            <p className="sm-muted" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="sm-error" role="alert">
              {error}
            </p>
          )}
        </article>

        <article className="sm-card">
          <div className="sm-card-heading">
            <div className="sm-icon">
              <Sprout size={22} />
            </div>
            <div>
              <h2>Field selection</h2>
              <p>Choose a field for this demo</p>
            </div>
          </div>

          {fields.length > 0 ? (
            <select
              className="sm-select"
              value={selectedField}
              onChange={(event) => {
                setSelectedField(event.target.value);
                setMessage("");
                setError("");
              }}
              disabled={saving}
            >
              {fields.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? item.label ?? `Field ${item.id}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="sm-muted">
              No fields are available yet. Add a field to use this selector.
            </p>
          )}

          <div className="sm-field-summary">
            <Leaf size={20} />
            <div>
              <strong>
                {field?.name ?? field?.label ?? "Demo field"}
              </strong>
              <p>Selected for simulated monitoring</p>
            </div>
          </div>

          <div className="sm-info">
            <strong>How to read this demo</strong>
            <p>
              Low values show a potential moisture concern in this
              illustration. Actual irrigation decisions require calibrated
              sensors, crop information, soil conditions, and field inspection.
            </p>
          </div>
        </article>
      </section>

      <section className="sm-card sm-history">
        <div className="sm-card-heading">
          <div className="sm-icon">
            <Sprout size={22} />
          </div>
          <div>
            <h2>Smart Irrigation Planner</h2>
            <p>Field-by-field review using saved demo readings</p>
          </div>
        </div>

        <div className="sm-reading-list">
          {irrigationPlan.map((item) => (
            <div className="sm-reading-row" key={item.field.id}>
              <div>
                <strong>
                  {item.field.name ??
                    item.field.label ??
                    `Field ${item.field.id}`}
                </strong>
                <p>
                  {item.moisture === null
                    ? "No reading saved"
                    : `Demo reading: ${item.moisture}%`}
                </p>
                <p>{item.action}</p>
              </div>

              <strong style={{ color: item.color }}>
                {item.priority}
              </strong>
            </div>
          ))}
        </div>

        <p className="sm-muted">
          Demo recommendations only. No physical sensor or automatic
          irrigation control is connected.
        </p>
      </section>

      <section className="sm-card sm-history">
        <div className="sm-card-heading">
          <div className="sm-icon">
            <Activity size={22} />
          </div>
          <div>
            <h2>Recent readings</h2>
            <p>Readings saved during this session</p>
          </div>
        </div>

        {savedReadings.length === 0 ? (
          <p className="sm-muted">
            No readings saved yet. Adjust the slider and save a demo reading.
          </p>
        ) : (
          <div className="sm-reading-list">
            {savedReadings.map((reading) => {
              const readingColor =
                reading.status === "Critical"
                  ? "#c74736"
                  : reading.status === "Low"
                  ? "#c58b36"
                  : reading.status === "Healthy"
                  ? "#477c52"
                  : "#528ca0";

              return (
                <div className="sm-reading-row" key={reading.id}>
                  <div>
                    <strong>{reading.fieldName}</strong>
                    <p>{reading.timestamp}</p>
                  </div>

                  <strong>{reading.moisture}%</strong>

                  <span style={{ color: readingColor }}>
                    {reading.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="sm-notice">
        <AlertTriangle size={19} />
        <div>
          <strong>Evidence limitation</strong>
          <p>
            Simulated readings are deliberately marked as insufficient
            evidence. Connect a calibrated physical sensor and record
            measurement details before treating readings as field evidence.
          </p>
        </div>
      </div>
    </main>
  );
}
