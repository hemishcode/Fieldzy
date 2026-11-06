
import { useState } from "react";
import {
  Leaf,
  Upload,
  Image as ImageIcon,
  ScanSearch,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ClipboardCheck,
  Save,
  ShieldAlert,
} from "lucide-react";

export default function PlantDiseaseDetection({
  fields = [],
  addObservation,
  addLog,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [selectedField, setSelectedField] = useState(
    fields[0]?.id || ""
  );
  const [cropType, setCropType] = useState(
    fields[0]?.crop && fields[0].crop !== "Not specified"
      ? fields[0].crop
      : ""
  );
  const [symptomDuration, setSymptomDuration] = useState("");
  const [affectedParts, setAffectedParts] = useState("");
  const [spread, setSpread] = useState("");

  const handleFieldChange = (event) => {
    const fieldId = event.target.value;
    const field = fields.find((item) => item.id === fieldId);

    setSelectedField(fieldId);
    setCropType(
      field?.crop && field.crop !== "Not specified"
        ? field.crop
        : ""
    );
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setValidation(null);
    setSaved(false);
    setError("");
  };

  const analyzeImage = async () => {
    if (!file) {
      setError("Please upload a leaf image first.");
      return;
    }

    if (!selectedField) {
      setError("Please select the field where the crop is growing.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setValidation(null);
    setSaved(false);

    try {
      // 1. Run the actual plant disease model
      const formData = new FormData();
      formData.append("file", file);

      const predictionResponse = await fetch(
        "https://article-behind-instance-christopher.trycloudflare.com/predict-plant",
        {
          method: "POST",
          body: formData,
        }
      );

      const predictionData = await predictionResponse.json();

      if (!predictionResponse.ok) {
        throw new Error(
          predictionData.detail || "Plant analysis failed."
        );
      }

      setResult(predictionData);

      // 2. Send model output and farmer-provided context
      // to the central evidence validation engine.
      const validationResponse = await fetch(
        "https://article-behind-instance-christopher.trycloudflare.com/validate-evidence",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feature: "plant",
            model_result: {
              prediction: predictionData.prediction,
              confidence: predictionData.confidence,
            },
            context: {
              crop_type: cropType.trim(),
              symptom_duration: symptomDuration,
              affected_parts: affectedParts,
              spread: spread,
            },
            evidence: [],
          }),
        }
      );

      const validationData = await validationResponse.json();

      if (!validationResponse.ok) {
        throw new Error(
          validationData.detail ||
            "Evidence validation could not be completed."
        );
      }

      setValidation(validationData);

    } catch (err) {
      console.error("Plant detection error:", err);
      setError(
        err.message ||
          "Unable to connect to the FIELDZY AI backend."
      );
    } finally {
      setLoading(false);
    }
  };


const saveObservation = async () => {
  if (!result || !validation) return;

  if (!selectedField) {
    setError("Select a field before saving.");
    return;
  }

  if (typeof addObservation !== "function") {
    setError("Observation saving is not connected.");
    return;
  }

  setSaving(true);
  setError("");

  try {
    const selectedFieldData = fields.find(
      (field) => field.id === selectedField
    );

    const timestamp = new Date().toISOString();

    // Preserve every missing evidence requirement.
    const evidenceGaps = (
      validation.missing_evidence || []
    ).map((gap, index) => ({
      id: `plant-gap-${Date.now()}-${index}`,
      key: gap.key,
      question: gap.question,
      resolved: Boolean(gap.resolved),
    }));

    // Preserve the complete model result as structured evidence.
    // This is an AI prediction, NOT independent field verification.
const modelEvidence = {
  id: `plant-model-${Date.now()}`,
  type: "plant_image_model_prediction",
  source: "FIELDZY Plant Disease Model",
  description: "AI prediction generated from an uploaded plant image",

  prediction: result.prediction,
  confidence: result.confidence,
  top_predictions: result.top_predictions || [],

  image: {
    file_name: file?.name || null,
    mime_type: file?.type || null,
    size_bytes: file?.size || null,
  },

  field_id: selectedField,
  crop_type: cropType.trim() || null,

  farmer_context: {
    symptom_duration: symptomDuration || null,
    affected_parts: affectedParts || null,
    nearby_spread: spread || null,
  },

  validation_status: validation.status,
  verificationStatus: "Unverified",
  verified: false,
  isIndependentEvidence: false,
  expertConfirmed: false,

  measurement_source: "uploaded_image",
  simulated: false,
  createdAt: timestamp,
};

    const description = [
      `AI model prediction: ${formatDisease(result.prediction)}.`,
      `Model score: ${result.confidence}%.`,
      `Validation status: ${validation.status}.`,
      validation.reasoning || "",
      `Crop: ${cropType || "Not specified"}.`,
      `Symptoms visible for: ${symptomDuration || "Not specified"}.`,
      `Affected parts: ${affectedParts || "Not specified"}.`,
      `Nearby spread: ${spread || "Not specified"}.`,
    ]
      .filter(Boolean)
      .join(" ");

    const response = await addObservation({
      fieldId: selectedField,
      title: `Plant assessment: ${formatDisease(result.prediction)}`,
      description,
      category: "Crop health",

      // Existing Evidence Debt workflow.
      evidenceGaps,
      validation,

      // New structured model evidence.
      evidence: [modelEvidence],

      nextAction:
        validation.next_action ||
        "Collect additional field evidence before relying on the assessment.",
    });

    if (!response?.success) {
      throw new Error(
        response?.message || "Could not save the observation."
      );
    }

    setSaved(true);

    addLog?.(
      `Plant assessment saved for ${selectedFieldData?.name || "selected field"}.`,
      "success"
    );

  } catch (err) {
    console.error("Plant observation save failed:", err);
    setError(err.message || "Could not save this assessment.");
  } finally {
    setSaving(false);
  }
};


  const resetAnalysis = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setValidation(null);
    setError("");
    setLoading(false);
    setSaving(false);
    setSaved(false);
  };

  const formatDisease = (name) => {
    return name
      ?.replaceAll("___", " — ")
      .replaceAll("_", " ");
  };

  return (
    <div className="plant-detection-page">
      <div className="plant-header">
        <div className="plant-header-icon">
          <Leaf size={23} />
        </div>

        <div>
          <p className="plant-eyebrow">FIELDZY · CROP HEALTH</p>
          <h1>Plant Disease Detection</h1>
          <p className="plant-subtitle">
            Upload a leaf image and provide field context for an
            evidence-aware crop health assessment.
          </p>
        </div>
      </div>

      <div className="plant-main-grid">
        <section className="plant-upload-card">
          <div className="plant-section-heading">
            <ImageIcon size={19} />
            <h2>Leaf Image</h2>
          </div>

          <label className="plant-upload-area">
            {preview ? (
              <img
                src={preview}
                alt="Uploaded leaf preview"
                className="plant-image-preview"
              />
            ) : (
              <div className="plant-upload-placeholder">
                <div className="plant-upload-icon">
                  <Upload size={27} />
                </div>

                <h3>Upload a leaf image</h3>
                <p>Choose an image from your device</p>
                <span>JPG, JPEG, PNG supported</span>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </label>

          {file && (
            <p className="plant-file-name">
              <CheckCircle2 size={15} />
              {file.name}
            </p>
          )}

          <div className="plant-context-form">
            <div className="plant-section-heading">
              <ClipboardCheck size={19} />
              <h2>Field Information</h2>
            </div>

            <label>
              Field
              <select
                value={selectedField}
                onChange={handleFieldChange}
              >
                <option value="">Select a field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Crop type
              <input
                value={cropType}
                onChange={(event) =>
                  setCropType(event.target.value)
                }
                placeholder="e.g. Tomato"
              />
            </label>

            <label>
              How long have symptoms been visible?
              <select
                value={symptomDuration}
                onChange={(event) =>
                  setSymptomDuration(event.target.value)
                }
              >
                <option value="">Select duration</option>
                <option value="Less than 2 days">Less than 2 days</option>
                <option value="2–7 days">2–7 days</option>
                <option value="1–2 weeks">1–2 weeks</option>
                <option value="More than 2 weeks">More than 2 weeks</option>
                <option value="Not sure">Not sure</option>
              </select>
            </label>

            <label>
              Which parts of the plant are affected?
              <select
                value={affectedParts}
                onChange={(event) =>
                  setAffectedParts(event.target.value)
                }
              >
                <option value="">Select affected parts</option>
                <option value="Leaves">Leaves</option>
                <option value="Stems">Stems</option>
                <option value="Fruits">Fruits</option>
                <option value="Roots">Roots</option>
                <option value="Multiple parts">Multiple parts</option>
                <option value="Not sure">Not sure</option>
              </select>
            </label>

            <label>
              Are nearby plants showing similar symptoms?
              <select
                value={spread}
                onChange={(event) =>
                  setSpread(event.target.value)
                }
              >
                <option value="">Select an answer</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not sure">Not sure</option>
              </select>
            </label>
          </div>

          <div className="plant-action-buttons">
            <button
              className="plant-analyze-button"
              onClick={analyzeImage}
              disabled={!file || loading || !selectedField}
            >
              {loading ? (
                <>
                  <Loader2 className="plant-spin" size={18} />
                  Analysing...
                </>
              ) : (
                <>
                  <ScanSearch size={18} />
                  Analyse Leaf
                </>
              )}
            </button>

            <button
              className="plant-reset-button"
              onClick={resetAnalysis}
              disabled={loading || saving}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          {error && (
            <div className="plant-error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
        </section>

        <section className="plant-results-card">
          <div className="plant-section-heading">
            <ScanSearch size={19} />
            <h2>Analysis Results</h2>
          </div>

          {!result && !loading && (
            <div className="plant-empty-state">
              <div className="plant-empty-icon">
                <Leaf size={31} />
              </div>
              <h3>Awaiting leaf image</h3>
              <p>
                Your preliminary crop health assessment will
                appear here after image analysis.
              </p>
            </div>
          )}

          {loading && (
            <div className="plant-empty-state">
              <Loader2 className="plant-spin" size={35} />
              <h3>Analysing your image</h3>
              <p>
                FIELDZY is running the plant model and checking
                the supporting field information.
              </p>
            </div>
          )}

          {result && (
            <div className="plant-result-content">
              <div className="plant-result-label">
                TOP MODEL PREDICTION
              </div>

              <h3 className="plant-prediction-name">
                {formatDisease(result.prediction)}
              </h3>

              <div className="plant-confidence-row">
                <span>Model score</span>
                <strong>{result.confidence}%</strong>
              </div>

              <div className="plant-confidence-track">
                <div
                  className="plant-confidence-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, result.confidence)
                    )}%`,
                  }}
                />
              </div>

              <h4 className="plant-top-heading">
                Other predictions
              </h4>

              <div className="plant-prediction-list">
                {result.top_predictions?.map((item, index) => (
                  <div
                    className="plant-prediction-item"
                    key={`${item.disease}-${index}`}
                  >
                    <div>
                      <span className="plant-rank">
                        {index + 1}
                      </span>
                      <span className="plant-disease-name">
                        {formatDisease(item.disease)}
                      </span>
                    </div>

                    <strong>{item.confidence}%</strong>
                  </div>
                ))}
              </div>

              {validation && (
                <div className="plant-validation-panel">
                  <div className="plant-section-heading">
                    {validation.status === "insufficient" ? (
                      <ShieldAlert size={19} />
                    ) : (
                      <CheckCircle2 size={19} />
                    )}
                    <h2>Evidence Validation</h2>
                  </div>

                  <span
                    className={`plant-validation-status ${
                      validation.status === "insufficient"
                        ? "is-insufficient"
                        : "is-preliminary"
                    }`}
                  >
                    {validation.status === "insufficient"
                      ? "MORE EVIDENCE NEEDED"
                      : "PRELIMINARY ASSESSMENT"}
                  </span>

                  <p>{validation.reasoning}</p>

                  {validation.missing_evidence?.length > 0 && (
                    <div className="plant-missing-evidence">
                      <strong>Information still needed</strong>
                      {validation.missing_evidence.map((gap) => (
                        <div key={gap.key}>
                          <AlertCircle size={15} />
                          <span>{gap.question}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validation.missing_evidence?.length === 0 && (
                    <p className="plant-evidence-complete">
                      The required field information has been
                      provided. This is still a preliminary
                      assessment, not expert confirmation.
                    </p>
                  )}

                  <div className="plant-next-action">
                    <strong>Recommended next step</strong>
                    <p>{validation.next_action}</p>
                  </div>

                  {validation.source_warning && (
                    <div className="plant-error">
                      <AlertCircle size={16} />
                      {validation.source_warning}
                    </div>
                  )}

                  <small>
                    Validation method: {validation.validation_source}
                  </small>
                </div>
              )}

              {validation && (
                <button
                  type="button"
                  className="plant-save-button"
                  onClick={saveObservation}
                  disabled={saving || saved}
                >
                  {saving ? (
                    <>
                      <Loader2 className="plant-spin" size={17} />
                      Saving observation...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 size={17} />
                      Saved to Observations
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save to Evidence Debt Meter
                    </>
                  )}
                </button>
              )}

              <div className="plant-disclaimer">
                <AlertCircle size={17} />
                <p>
                  {result.message} Model scores are not confirmed
                  diagnoses. Consult an agricultural expert before
                  taking crop treatment decisions.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
