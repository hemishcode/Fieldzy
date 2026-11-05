
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
} from "lucide-react";

export default function PlantDiseaseDetection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setError("");
  };

  const analyzeImage = async () => {
    if (!file) {
      setError("Please upload a leaf image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:8001/predict-plant",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Plant analysis failed.");
      }

      setResult(data);
    } catch (err) {
      console.error("Plant detection error:", err);
      setError(
        err.message || "Unable to connect to the FIELDZY AI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setLoading(false);
  };

  const formatDisease = (name) => {
    return name
      ?.replaceAll("___", " — ")
      .replaceAll("_", " ")
      .replaceAll(",", ", ");
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
            Upload a leaf image to receive a preliminary AI-based
            crop health assessment.
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

          <div className="plant-action-buttons">
            <button
              className="plant-analyze-button"
              onClick={analyzeImage}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="plant-spin" size={18} />
                  Analysing image...
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
              disabled={loading}
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
              <p>FIELDZY is processing the uploaded leaf.</p>
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
