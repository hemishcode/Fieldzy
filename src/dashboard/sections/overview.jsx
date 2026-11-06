import { useState } from "react";
import EvidenceDebtMeter from "../components/EvidenceDebtMeter";
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
  triggerDemoThreat,
  addEvidence,
  addObservation,
  ThreatVisualizer,
  updateObservationReview,
  updateVerification,
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
  
 const [aiAssessment, setAiAssessment] = useState(null);
const [summaryLoading, setSummaryLoading] = useState(false);
const [summaryError, setSummaryError] = useState("");
const [summaryGeneratedAt, setSummaryGeneratedAt] = useState(null);

async function generateFieldSummary() {
  setSummaryLoading(true);
  setSummaryError("");

  try {
    // Collect evidence already attached to saved observations.
    const featureEvidence = observations.flatMap((observation) =>
      (Array.isArray(observation.evidence) ? observation.evidence : []).map(
        (item) => ({
          ...item,
          fieldId: observation.fieldId,
          field_id: observation.fieldId,
          fieldName: observation.fieldName,
          observationId: observation.id,
          observationTitle: observation.title,
          observationStatus: observation.status || "Unverified",
          observationCreatedAt: observation.createdAt,
        })
      )
    );

    // Include the current threat only with its actual simulation status.
    if (threat) {
      featureEvidence.push({
        type: "threat_alert",
        source: threat.source || "FIELDZY threat record",
        title: threat.title,
        fieldId: threat.fieldId,
        field_id: threat.fieldId,
        status: threat.status || "Unverified",
        simulated: Boolean(threat.simulated),
        timestamp: threat.timestamp || null,
        verificationStatus: threat.simulated
          ? "Simulated"
          : "Unverified",
      });
    }

    const payload = {
      fields: fields.map((field) => ({
        id: field.id,
        name: field.name,
        crop_type: field.crop || field.crop_type || null,
        area: field.area ?? null,
        status: field.status || null,
      })),

      observations: observations.map((observation) => ({
        id: observation.id,
        field_id: observation.fieldId,
        field_name: observation.fieldName,
        title: observation.title,
        description: observation.description,
        category: observation.category,
        status: observation.status || "Unverified",
        evidence: observation.evidence || [],
        evidence_gaps: observation.evidenceGaps || [],
        validation: observation.validation || null,
        created_at: observation.createdAt || null,
      })),

      evidence_debt: {
        score: evidenceDebt,
        unresolved_evidence_count: unresolvedEvidenceCount,
        unverified_record_count: unverifiedCount,
        calculation_source: "FIELDZY dashboard evidence calculation",
      },

      feature_evidence: featureEvidence,
    };

    const response = await fetch(
      "https://applicant-brakes-incomplete-secondary.trycloudflare.com/field-health-summary",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not generate the agricultural assessment."
      );
    }

if (!data.assessment || typeof data.assessment !== "object") {
  throw new Error("The backend did not return a structured assessment.");
}

setAiAssessment(data.assessment);
setSummaryGeneratedAt(new Date().toISOString());
  } catch (error) {
    console.error("FIELDZY field assessment error:", error);
    setSummaryError(error.message || "AI summary generation failed.");
  } finally {
    setSummaryLoading(false);
  }
}
  async function handleThreatReview(event) {
  if (typeof addObservation !== "function") {
    window.alert("Observation saving is not connected.");
    return;
  }

  if (!event.fieldId) {
    window.alert("This alert has no assigned field. Assign a field first.");
    return;
  }

  // Avoid creating the same threat observation twice.
  const alreadyAdded = observations.some((observation) =>
    (observation.evidence || []).some(
      (item) => item.sourceThreatId === event.id
    )
  );

  if (alreadyAdded) {
    window.alert("This threat already has an observation in FIELDZY.");
    return;
  }

  try {
    const response = await fetch(
      "https://applicant-brakes-incomplete-secondary.trycloudflare.com/validate-evidence",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: "observation",
          model_result: {},
          context: {
            description: event.detail || event.type,
            independent_evidence: null,
          },
          evidence: [],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || data.error || "Evidence validation failed."
      );
    }

    const validation = data.validation || data;

    const missingEvidence = validation.missing_evidence || [];

    const evidenceGaps = missingEvidence.map((gap) => {
      if (typeof gap === "string") {
        return {
          question: gap,
          resolved: false,
        };
      }

      return {
        key: gap.key,
        question: gap.question || gap.key || "Additional evidence required",
        resolved: false,
      };
    });

    const saveResult = await addObservation({
      fieldId: event.fieldId,
      category: "Threat Review",
      title: `${event.simulated ? "[SIMULATED] " : ""}${event.type}`,
      description: event.detail || "Threat alert requires investigation.",
      evidence: [
        {
          type: "threat_alert",
          source: event.simulated
            ? "Simulated demonstration alert"
            : "Recorded FIELDZY alert",
          sourceThreatId: event.id,
          simulated: Boolean(event.simulated),
          timestamp: new Date().toISOString(),
        },
      ],
      evidenceGaps,
      validation,
      nextAction:
        validation.next_action ||
        "Inspect the field and collect independent supporting evidence.",
    });

    if (saveResult?.success === false) {
      throw new Error(
        saveResult.message || "Could not save the threat observation."
      );
    }

    window.alert(
      "Threat review submitted. Check the Evidence Debt Meter and Priority Queue."
    );
  } catch (error) {
    console.error("Threat review failed:", error);
    window.alert(error.message || "Threat review failed.");
  }
}

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
  const assessedFields = Array.isArray(aiAssessment?.field_assessments)
  ? aiAssessment.field_assessments
  : Array.isArray(aiAssessment?.fields)
    ? aiAssessment.fields
    : aiAssessment?.crop_health || aiAssessment?.soil_moisture
      ? [aiAssessment]
      : [];

const assessmentOverview =
  aiAssessment?.overall_summary ||
  aiAssessment?.summary ||
  aiAssessment?.overview ||
  "";

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

      {/* Agricultural visual gallery */}
<div className="overview-visual-gallery">

  <div className="overview-visual-card overview-visual-large">
    <img
      src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000"
      alt="Wide view of green agricultural farmland"
      loading="lazy"
    />
    <div className="overview-visual-caption">
      <span>FIELD INSIGHTS</span>
      <h3>Every field tells a story.</h3>
      <p>Stay connected to what's happening on your farm.</p>
    </div>
  </div>

  <div className="overview-visual-card">
    <img
      src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800"
      alt="Healthy agricultural crops"
      loading="lazy"
    />
    <div className="overview-visual-caption">
      <span>CROP MONITORING</span>
      <h3>Watch your crops grow.</h3>
    </div>
  </div>

  <div className="overview-visual-card">
    <img
      src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800"
      alt="Plants growing in rich soil"
      loading="lazy"
    />
    <div className="overview-visual-caption">
      <span>FIELD CONDITIONS</span>
      <h3>Understand your land.</h3>
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
 
      {/* FIELDZY Local Agricultural Assessment */}
      <article className="overview-panel fieldzy-ai-summary">
        <div className="overview-panel-image">
  <img
    src="https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?w=1200"
    alt="Agricultural crops in a field"
    loading="lazy"
  />
</div>
        <div className="overview-panel-heading">
          <div>
            <p className="overview-section-label">
              FIELDZY AGRICULTURAL INTELLIGENCE
            </p>
            <h3>Unified Field Assessment</h3>
            <p className="overview-panel-description">
              A structured review of saved field records, model predictions,
              measurements and outstanding evidence gaps.
            </p>
          </div>

          <Leaf size={24} />
        </div>

        <button
          type="button"
          className="overview-text-button"
          onClick={generateFieldSummary}
          disabled={summaryLoading || fields.length === 0}
        >
          {summaryLoading
            ? "Reviewing field evidence..."
            : aiAssessment
              ? "Refresh Assessment"
              : "Generate Field Assessment"}

          {!summaryLoading && <ArrowRight size={16} />}
        </button>

        {summaryError && (
          <div className="overview-empty-state">
            <CircleAlert size={20} />
            <p>{summaryError}</p>
          </div>
        )}

        {aiAssessment && (
          <div className="fieldzy-ai-summary-content">
            <div className="overview-network-status">
              <span className="overview-network-indicator local" />
              <div>
                <strong>Local evidence assessment generated</strong>
                <p>
                  Generated by FIELDZY's local assessment engine.
                  This is not a Gemini-generated report or expert diagnosis.
                </p>
              </div>
            </div>

            {assessmentOverview && (
              <p className="fieldzy-ai-summary-text">
                {assessmentOverview}
              </p>
            )}

            {assessedFields.length > 0 ? (
              <div className="fieldzy-assessment-fields">
                {assessedFields.map((field, index) => {
                  const cropHealth = field.crop_health || {};
                  const soilMoisture = field.soil_moisture || {};
                  const evidenceReview = field.evidence_review || {};

                  const findings = Array.isArray(field.findings)
                    ? field.findings
                    : [];

                  const recommendations = Array.isArray(field.recommendations)
                    ? field.recommendations
                    : [];

                  const prediction =
                    cropHealth.prediction ||
                    cropHealth.disease_prediction ||
                    field.prediction ||
                    null;

                  const confidence =
                    cropHealth.confidence ??
                    field.confidence ??
                    null;

                  const cropMismatch =
                    cropHealth.crop_mismatch === true ||
                    field.crop_mismatch === true;

                  const soilValue =
                    soilMoisture.value ??
                    soilMoisture.measurement ??
                    soilMoisture.moisture_percentage ??
                    null;

                  const soilUnit = soilMoisture.unit || "%";

                  const soilIsSimulated =
                    soilMoisture.is_simulated === true ||
                    soilMoisture.simulated === true;

                  const missingEvidence = Array.isArray(
                    evidenceReview.missing_evidence
                  )
                    ? evidenceReview.missing_evidence
                    : [];

                  const conflictingEvidence = Array.isArray(
                    evidenceReview.conflicting_evidence
                  )
                    ? evidenceReview.conflicting_evidence
                    : [];

                  const unverifiedEvidence = Array.isArray(
                    evidenceReview.unverified_evidence
                  )
                    ? evidenceReview.unverified_evidence
                    : [];

                  const fieldName =
                    field.field_name ||
                    field.name ||
                    fields.find(
                      (item) =>
                        String(item.id) === String(field.field_id || field.id)
                    )?.name ||
                    `Field ${index + 1}`;

                  const cropName =
                    field.crop_type ||
                    field.crop ||
                    fields.find(
                      (item) =>
                        String(item.id) === String(field.field_id || field.id)
                    )?.crop ||
                    "Crop unspecified";

                  return (
                    <div
                      className="fieldzy-assessment-field"
                      key={field.field_id || field.id || index}
                    >
                      <div className="fieldzy-assessment-field-heading">
                        <div>
                          <strong>{fieldName}</strong>
                          <small>{cropName}</small>
                        </div>

                        <span className="overview-status-tag unverified">
                          Not expert verified
                        </span>
                      </div>

                      {/* Plant model result */}
                      <div className="fieldzy-assessment-section">
                        <strong>
                          <Leaf size={16} />
                          Plant health prediction
                        </strong>

                        {prediction ? (
                          <>
                            <p>{prediction}</p>

                            {confidence !== null && (
                              <small>
                                Model confidence:{" "}
                                {Number.isFinite(Number(confidence))
                                  ? `${Number(confidence).toFixed(2)}%`
                                  : confidence}
                              </small>
                            )}

                            {cropMismatch && (
                              <div className="fieldzy-assessment-warning">
                                <AlertTriangle size={17} />
                                <span>
                                  The model prediction may not match the
                                  registered crop. Verify the plant identity
                                  and image before relying on this result.
                                </span>
                              </div>
                            )}

                            <small>
                              Model output is an unverified prediction,
                              not a confirmed disease diagnosis.
                            </small>
                          </>
                        ) : (
                          <p>No plant model prediction is available.</p>
                        )}
                      </div>

                      {/* Soil reading */}
                      <div className="fieldzy-assessment-section">
                        <strong>
                          <Activity size={16} />
                          Soil moisture
                        </strong>

                        {soilValue !== null ? (
                          <>
                            <p>
                              {soilValue}
                              {soilUnit}
                            </p>

                            {soilIsSimulated ? (
                              <small>
                                <AlertTriangle size={14} />
                                Simulated demonstration reading — no physical
                                sensor measurement.
                              </small>
                            ) : (
                              <small>
                                Check the measurement source and verification
                                status before using this value.
                              </small>
                            )}
                          </>
                        ) : (
                          <p>No soil moisture reading is available.</p>
                        )}
                      </div>

                      {/* Findings */}
                      {findings.length > 0 && (
                        <div className="fieldzy-assessment-section">
                          <strong>
                            <ClipboardCheck size={16} />
                            Findings
                          </strong>

                          <ul>
                            {findings.map((finding, findingIndex) => (
                              <li key={findingIndex}>
                                {typeof finding === "string"
                                  ? finding
                                  : finding.message ||
                                    finding.description ||
                                    finding.title ||
                                    JSON.stringify(finding)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Evidence review */}
                      {(missingEvidence.length > 0 ||
                        conflictingEvidence.length > 0 ||
                        unverifiedEvidence.length > 0) && (
                        <div className="fieldzy-assessment-section">
                          <strong>
                            <ShieldCheck size={16} />
                            Evidence review
                          </strong>

                          {missingEvidence.length > 0 && (
                            <div>
                              <small>Missing evidence</small>
                              <ul>
                                {missingEvidence.map((item, itemIndex) => (
                                  <li key={itemIndex}>
                                    {typeof item === "string"
                                      ? item
                                      : item.question ||
                                        item.description ||
                                        item.key ||
                                        JSON.stringify(item)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {conflictingEvidence.length > 0 && (
                            <div>
                              <small>Conflicting evidence</small>
                              <ul>
                                {conflictingEvidence.map((item, itemIndex) => (
                                  <li key={itemIndex}>
                                    {typeof item === "string"
                                      ? item
                                      : item.description ||
                                        item.message ||
                                        JSON.stringify(item)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {unverifiedEvidence.length > 0 && (
                            <div>
                              <small>Unverified records</small>
                              <ul>
                                {unverifiedEvidence.map((item, itemIndex) => (
                                  <li key={itemIndex}>
                                    {typeof item === "string"
                                      ? item
                                      : item.description ||
                                        item.source ||
                                        item.type ||
                                        JSON.stringify(item)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommendations */}
                      {recommendations.length > 0 && (
                        <div className="fieldzy-assessment-section">
                          <strong>
                            <CheckCircle2 size={16} />
                            Suggested next steps
                          </strong>

                          <ul>
                            {recommendations.map((recommendation, itemIndex) => (
                              <li key={itemIndex}>
                                {typeof recommendation === "string"
                                  ? recommendation
                                  : recommendation.action ||
                                    recommendation.description ||
                                    recommendation.message ||
                                    JSON.stringify(recommendation)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overview-empty-state">
                <CircleAlert size={20} />
                <p>
                  The assessment was returned, but no per-field breakdown
                  was found in the response.
                </p>
              </div>
            )}

            {Array.isArray(aiAssessment.limitations) &&
              aiAssessment.limitations.length > 0 && (
                <div className="fieldzy-assessment-limitations">
                  <strong>Assessment limitations</strong>
                  <ul>
                    {aiAssessment.limitations.map((item, index) => (
                      <li key={index}>
                        {typeof item === "string"
                          ? item
                          : item.description || item.message || JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {summaryGeneratedAt && (
              <small>
                Generated: {formatTime(summaryGeneratedAt)}
              </small>
            )}
          </div>
        )}

        {!aiAssessment && !summaryLoading && !summaryError && (
          <p className="overview-panel-description">
            Generate an assessment to review saved observations, plant model
            predictions, soil readings and evidence gaps together.
          </p>
        )}
      </article>

      {/* Evidence Debt and verification */}
{/* Evidence Debt and verification */}
<div className="overview-primary-grid">

<EvidenceDebtMeter
  observations={observations}
  onReviewObservation={() => onNavigate("observations")}
  onUpdateReview={updateObservationReview}
  onUpdateVerification={updateVerification}
  onAddEvidence={async (record) => {
    const note = window.prompt(
      `Add evidence note for: ${record.title || "Observation"}`
    );

    if (!note?.trim()) {
      return { success: false, message: "Cancelled." };
    }

    if (typeof addEvidence !== "function") {
      window.alert("Evidence saving is not connected.");

      return { success: false, message: "Evidence saving unavailable." };
    }

    try {
      const result = await addEvidence(record.id, {
        note: note.trim(),
        source: "Farmer observation",
        independent: false,
      });

      if (result?.success === false) {
        window.alert(result.message || "Evidence could not be saved.");
        return result;
      }

      return result || { success: true };
    } catch (error) {
      console.error("Evidence saving failed:", error);
      window.alert("Could not save evidence.");

      return { success: false, message: error.message };
    }
  }}
/>

  {/* Field summary */}
  <article className="overview-panel">
    <div className="overview-panel-image overview-panel-image-small">
  <img
    src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900"
    alt="Green crops growing in agricultural rows"
    loading="lazy"
  />
</div>
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
                <small>{field.crop || "Crop unspecified"}</small>
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

{/* Threat Visualizer connected to Evidence Debt */}
{ThreatVisualizer && (
  <ThreatVisualizer
    events={
      threat
        ? [
            {
              id: threat.id,
              fieldId: threat.fieldId,
              field:
                fields.find(
                  (field) => String(field.id) === String(threat.fieldId)
                )?.name || "Field not assigned",
              type: threat.title || "Threat alert",
              detail:
                threat.source || "Recorded alert requires investigation.",
              time: formatTime(threat.timestamp),
              level:
                ["urgent", "critical"].includes(
                  String(threat.status).toLowerCase()
                )
                  ? "urgent"
                  : "review",
              evidence: threat.simulated
                ? "Simulated demonstration alert"
                : "Recorded alert",
              verified: false,
              simulated: Boolean(threat.simulated),
            },
          ]
        : []
    }
    onReview={handleThreatReview}
  />
)}

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

          <div className="overview-panel-image overview-panel-image-small">
  <img
    src="https://images.unsplash.com/photo-1501691223387-dd0500403074?w=900"
    alt="Changing weather over a landscape"
    loading="lazy"
  />
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

          <div className="overview-panel-image overview-panel-image-small">
  <img
    src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900"
    alt="Technology and infrastructure"
    loading="lazy"
  />
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
        <button
  type="button"
  className="overview-text-button"
  onClick={() =>
    triggerDemoThreat({
      title: "Demo wildlife movement alert",
      fieldId: fields[0]?.id || null,
    })
  }
>
  Trigger Demo Threat <ArrowRight size={16} />
</button>
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