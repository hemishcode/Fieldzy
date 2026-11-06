import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AudioLines,
  CheckCircle2,
  Clock,
  Info,
  Mic,
  MicOff,
  Save,
  ShieldCheck,
  Waves,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

const PROFILE_KEY = "fieldzy-echo-print-v1";
const EVENT_KEY = "fieldzy-echo-events-v1";

const SAMPLE_SECONDS = 5;
const REQUIRED_BASELINE_SAMPLES = 3;
const MAX_BASELINE_SAMPLES = 5;

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}

function percentDifference(value, reference) {
  if (!Number.isFinite(value) || !Number.isFinite(reference)) return null;

  // A near-zero reference makes percentage differences misleading.
  if (Math.abs(reference) < 0.000001) return null;

  return ((value - reference) / Math.abs(reference)) * 100;
}

function formatDate(value) {
  if (!value) return "Unknown date";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function buildProfile(samples) {
  const rmsValues = samples.map((sample) => sample.rms);
  const centroidValues = samples.map((sample) => sample.centroid);

  return {
    samples,
    sampleCount: samples.length,
    averageRms: average(rmsValues),
    averageCentroid: average(centroidValues),
    rmsSpread: standardDeviation(rmsValues),
    centroidSpread: standardDeviation(centroidValues),
    updatedAt: new Date().toISOString(),
  };
}

function assessRecording({ rms, clippingRatio, variation }) {
  const issues = [];

  if (rms < 0.005) {
    issues.push("The recording is extremely quiet. Move closer to the sound source.");
  }

  if (clippingRatio > 0.03) {
    issues.push("The recording may be distorted. Reduce the input level or move farther away.");
  }

  if (variation < 0.0005) {
    issues.push("Very little signal variation was measured. Check the microphone and try again.");
  }

  return {
    issues,
    quality: issues.length === 0 ? "Usable" : "Check recording",
  };
}

export default function AcousticIntelligence({
  fields = [],
  addObservation,
  onNavigate,
}) {
  const [selectedField, setSelectedField] = useState("");
  const [profiles, setProfiles] = useState(() =>
    readLocal(PROFILE_KEY, {})
  );
  const [events, setEvents] = useState(() =>
    readLocal(EVENT_KEY, [])
  );

  const [sampling, setSampling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSample, setCurrentSample] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldContext, setFieldContext] = useState("");

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (
      fields.length > 0 &&
      !fields.some((field) => field.id === selectedField)
    ) {
      setSelectedField(fields[0].id);
    }

    if (fields.length === 0) {
      setSelectedField("");
    }
  }, [fields, selectedField]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    } catch {
      setError("Could not save field reference data in this browser.");
    }
  }, [profiles]);

  useEffect(() => {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(events));
    } catch {
      setError("Could not save EchoPrint history in this browser.");
    }
  }, [events]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (contextRef.current) {
        contextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const profile = profiles[selectedField] || null;
  const baselineSamples = profile?.samples || [];
  const hasBaseline =
    baselineSamples.length >= REQUIRED_BASELINE_SAMPLES;

  const fieldEvents = events.filter(
    (event) => event.fieldId === selectedField
  );

  function stopMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
  }



async function captureSample() {
  setError("");
  setMessage("");
  setCurrentSample(null);

  if (!selectedField) {
    setError("Add or select a field before recording.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setError("Microphone access requires localhost or HTTPS.");
    return;
  }

  const isComparison = hasBaseline;

  cancelRef.current = false;
  setSampling(true);
  setProgress(0);

  let recorder;
  let chunks = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    if (cancelRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    streamRef.current = stream;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    const audioContext = new AudioContextClass();
    contextRef.current = audioContext;
    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);

    if (!window.MediaRecorder) {
      throw new Error("Audio recording is not supported.");
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";

    recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );

    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.start();

    const timeData = new Float32Array(analyser.fftSize);
    const frequencyData = new Float32Array(analyser.frequencyBinCount);

    const rmsReadings = [];
    const centroidReadings = [];

    let clippedFrames = 0;
    let totalFrames = 0;

    const startedAt = Date.now();
    const durationMs = SAMPLE_SECONDS * 1000;

    while (Date.now() - startedAt < durationMs) {
      if (cancelRef.current) {
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }

      analyser.getFloatTimeDomainData(timeData);
      analyser.getFloatFrequencyData(frequencyData);

      let squareSum = 0;
      let clippedCount = 0;

      for (const value of timeData) {
        squareSum += value * value;
        if (Math.abs(value) >= 0.99) clippedCount++;
      }

      const rms = Math.sqrt(squareSum / timeData.length);

      let weightedFrequency = 0;
      let totalPower = 0;

      for (let i = 0; i < frequencyData.length; i++) {
        const db = frequencyData[i];
        if (!Number.isFinite(db) || db <= -120) continue;

        const power = Math.pow(10, db / 10);
        const frequency =
          (i * audioContext.sampleRate) / analyser.fftSize;

        weightedFrequency += frequency * power;
        totalPower += power;
      }

      rmsReadings.push(rms);
      centroidReadings.push(
        totalPower > 0 ? weightedFrequency / totalPower : 0
      );

      clippedFrames += clippedCount;
      totalFrames += timeData.length;

      setProgress(
        Math.min(100, Math.round(
          ((Date.now() - startedAt) / durationMs) * 100
        ))
      );

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (cancelRef.current) return;

    const audioBlob = await new Promise(resolve => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        }));
      };
      recorder.stop();
    });

    const rms = average(rmsReadings);
    const centroid = average(centroidReadings);

    const clippingRatio =
      totalFrames > 0 ? clippedFrames / totalFrames : 0;

    const variation = standardDeviation(rmsReadings);

    const quality = assessRecording({
      rms,
      clippingRatio,
      variation,
    });

    const result = {
      id: `sample-${Date.now()}`,
      fieldId: selectedField,
      rms,
      centroid,
      clippingRatio,
      variation,
      quality: quality.quality,
      issues: quality.issues,
      capturedAt: new Date().toISOString(),
    };

    setCurrentSample(result);

    // Run AI analysis
    setMessage("Analysing recording...");

    const formData = new FormData();
    formData.append("file", audioBlob, "fieldzy-audio.webm");

    const response = await fetch(
      "https://applicant-brakes-incomplete-secondary.trycloudflare.com/acoustic-intelligence",
      { method: "POST", body: formData }
    );
    console.log("AI backend status:", response.status);

    const aiResult = await response.json();
    console.log("AI prediction:", aiResult);

   if (!response.ok || aiResult.error) {
  throw new Error(aiResult.error || "AI analysis failed.");
}

    const enrichedResult = {
      ...result,
      aiPrediction: aiResult.prediction,
      aiConfidence: aiResult.confidence,
    };

    setCurrentSample(enrichedResult);

    // Automatically compare if a baseline already exists.
    if (isComparison && result.quality === "Usable") {
      const selectedProfile = profiles[selectedField];

      const rmsChange = percentDifference(
        rms,
        selectedProfile.averageRms
      );

      const centroidChange = percentDifference(
        centroid,
        selectedProfile.averageCentroid
      );

      const comparison = {
        id: `event-${Date.now()}`,
        fieldId: selectedField,
        fieldName:
          fields.find(field => field.id === selectedField)?.name ||
          "Selected field",
        type: "Sound comparison",
        createdAt: new Date().toISOString(),
        sample: enrichedResult,
        rmsChange,
        centroidChange,
        note: "Recording compared with the saved field reference. Differences are investigation signals, not confirmed threats.",
      };

      setEvents(previous => {
  if (previous.some(event => event.sample?.id === comparison.sample.id)) {
    return previous;
  }

  return [comparison, ...previous];
});

      setMessage(
        `Comparison complete. Audio level: ${formatPercent(rmsChange)}. Spectral brightness: ${formatPercent(centroidChange)}. Verify any changes before taking action.`
      );
    } else {
      setMessage(
        "Reference recording captured. Add it to the field reference."
      );
    }

  } catch (captureError) {
    setError(captureError.message || "Could not analyse recording.");
  } finally {
    stopMicrophone();
    setSampling(false);
    setProgress(0);
  }
}



  function cancelCapture() {
    cancelRef.current = true;
    stopMicrophone();
    setSampling(false);
    setProgress(0);
    setMessage("Recording cancelled.");
  }

  function addSampleToBaseline() {
    if (!currentSample) return;

    if (currentSample.quality !== "Usable") {
      setError("Retake the sample with acceptable recording quality before using it as a reference.");
      return;
    }

    const existingSamples = profiles[selectedField]?.samples || [];

    const nextSamples = [
      ...existingSamples,
      {
        id: currentSample.id,
        rms: currentSample.rms,
        centroid: currentSample.centroid,
        capturedAt: currentSample.capturedAt,
      },
    ].slice(-MAX_BASELINE_SAMPLES);

    const nextProfile = buildProfile(nextSamples);

    setProfiles((previous) => ({
      ...previous,
      [selectedField]: nextProfile,
    }));

    setEvents((previous) => [
      {
        id: `event-${Date.now()}`,
        fieldId: selectedField,
        fieldName:
          fields.find((field) => field.id === selectedField)?.name ||
          "Selected field",
        type: "Reference sample",
        createdAt: new Date().toISOString(),
        note: `Added a usable recording to the field reference (${nextSamples.length}/${MAX_BASELINE_SAMPLES} samples stored).`,
        sample: currentSample,
      },
      ...previous,
    ]);

    setCurrentSample(null);
    setError("");

    setMessage(
      nextSamples.length >= REQUIRED_BASELINE_SAMPLES
        ? "Field reference updated. New samples can now be compared against it."
        : `Reference sample saved. Add ${REQUIRED_BASELINE_SAMPLES - nextSamples.length} more usable sample(s) to create a baseline.`
    );
  }

  function saveComparison() {
    if (!currentSample || !hasBaseline) {
      setError("Capture a sample and build a baseline from at least three usable samples first.");
      return;
    }

    if (currentSample.quality !== "Usable") {
      setError("This recording needs to be retaken before comparison.");
      return;
    }

    const rmsChange = percentDifference(
      currentSample.rms,
      profile.averageRms
    );

    const centroidChange = percentDifference(
      currentSample.centroid,
      profile.averageCentroid
    );

    const event = {
      id: `event-${Date.now()}`,
      fieldId: selectedField,
      fieldName:
        fields.find((field) => field.id === selectedField)?.name ||
        "Selected field",
      type: "Sound comparison",
      createdAt: new Date().toISOString(),
      sample: currentSample,
      rmsChange,
      centroidChange,
      note:
        "A difference from the stored reference is an investigation signal only. It does not confirm pests, disease, or crop damage.",
    };

    setEvents((previous) => [event, ...previous]);
    setMessage("Comparison saved to EchoPrint history.");
    setError("");
  }


async function createObservation(event) {
  if (!addObservation) {
    setError("Observation service is unavailable.");
    return false;
  }

  try {
    setError("");
    setMessage("Validating acoustic evidence...");

    const sample = event.sample;

    const field = fields.find(
      (item) => item.id === event.fieldId
    );

    const modelResult = {
      prediction: sample.aiPrediction || null,
      confidence: sample.aiConfidence ?? null,
    };

    const context = {
      recording_quality:
        sample.quality === "Usable" ? "Usable" : "",
      field_context: fieldContext.trim(),
      baseline_available: Boolean(
        profiles[event.fieldId]?.samples?.length >=
          REQUIRED_BASELINE_SAMPLES
      ),
    };

    const evidence = [
      {
        type: "audio_recording_analysis",
        source: "FIELDZY EchoPrint",
        recording_quality: sample.quality,
        rms: sample.rms,
        spectral_centroid: sample.centroid,
        clipping_ratio: sample.clippingRatio,
        variation: sample.variation,
        baseline_comparison: {
          rms_change: event.rmsChange,
          centroid_change: event.centroidChange,
        },
        captured_at: sample.capturedAt,
      },
    ];

    // Send the result to the central evidence engine.
    const response = await fetch(
      "https://applicant-brakes-incomplete-secondary.trycloudflare.com/validate-evidence",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: "acoustic",
          model_result: modelResult,
          context,
          evidence,
        }),
      }
    );

    const validation = await response.json();

    if (!response.ok || !validation.success) {
      throw new Error(
        validation.detail || "Evidence validation failed."
      );
    }

    // Convert backend questions into Dashboard evidence gaps.
    const evidenceGaps = (
      validation.missing_evidence || []
    ).map((item) => ({
      question: item.question,
      resolved: false,
    }));

    const predictionText = sample.aiPrediction
      ? `The acoustic model predicted "${sample.aiPrediction}" with ${Number(
          sample.aiConfidence
        ).toFixed(1)}% model confidence.`
      : "No AI sound prediction was available.";

    const description = [
      predictionText,
      `Recording quality: ${sample.quality}.`,
      `Recording context: ${fieldContext.trim() || "Not provided"}.`,
      `Baseline comparison: ${formatPercent(
        event.rmsChange
      )} audio level change and ${formatPercent(
        event.centroidChange
      )} spectral brightness change.`,
      "These measurements are investigation signals, not confirmation of pests, disease, or another agricultural threat.",
      `Evidence assessment: ${validation.status}.`,
      validation.reasoning || "",
    ].join(" ");

    const result = await addObservation({
      fieldId: event.fieldId,
      category: "Acoustic",
      title: "Acoustic variation from field reference",
      description,
      evidence,
      evidenceGaps,
      validation,
      nextAction:
        validation.next_action ||
        "Repeat the recording under similar conditions and inspect the field.",
    });

    if (!result?.success) {
      throw new Error(
        result?.message || "Could not save the observation."
      );
    }

    setMessage(
      validation.status === "preliminary"
        ? "Observation saved. Basic evidence checks passed, but the sound classification is not confirmed."
        : `Observation saved as unverified. ${validation.missing_count} evidence requirement(s) still need attention.`
    );

    setError("");
    return true;

  } catch (observationError) {
    console.error(
      "Acoustic evidence validation failed:",
      observationError
    );

    setError(
      observationError.message ||
        "Could not validate the acoustic observation."
    );

    setMessage("");
    return false;
  }
}



  function resetBaseline() {
    const confirmed = window.confirm(
      "Clear this field's sound reference? Existing history will remain."
    );

    if (!confirmed) return;

    setProfiles((previous) => {
      const next = { ...previous };
      delete next[selectedField];
      return next;
    });

    setCurrentSample(null);
    setMessage("Field reference cleared. Build a new baseline using multiple samples.");
    setError("");
  }

  return (
    <section className="echo-section">
      <header className="echo-header">
        <div className="echo-heading-icon">
          <AudioLines size={28} />
        </div>

        <div>
          <p className="echo-eyebrow">FIELDZY · ACOUSTIC INTELLIGENCE</p>
          <h2>EchoPrint</h2>
          <p>
            Build a sound reference for each field and identify recordings
            that differ from its usual measurements.
          </p>
        </div>
      </header>

      <div className="echo-notice">
        <Info size={19} />
        <p>
          EchoPrint measures audio level and spectral brightness. It does not
          identify pests or diagnose crop disease. Changes can also come from
          wind, people, vehicles, microphone position, or other conditions.
        </p>
      </div>

      <div className="echo-panel">
        <label htmlFor="echo-field">Choose a field</label>

        <select
          id="echo-field"
          value={selectedField}
          onChange={(event) => {
            setSelectedField(event.target.value);
            setCurrentSample(null);
            setMessage("");
            setError("");
          }}
          disabled={sampling}
        >
          {fields.length === 0 && (
            <option value="">No fields available</option>
          )}

          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>

        <div className="echo-context-input">
  <label htmlFor="echo-context">
    What was happening in the field during recording?
  </label>

  <textarea
    id="echo-context"
    value={fieldContext}
    onChange={(event) =>
      setFieldContext(event.target.value)
    }
    placeholder="Example: Recording taken near the crops in the evening. Light wind was present."
    rows={3}
  />

  <small>
    This context helps FIELDZY assess the recording responsibly.
  </small>
</div>

        <div className="echo-baseline-status">
          <div className="echo-status-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <strong>
              {hasBaseline
                ? "Reference ready"
                : "Reference needs more samples"}
            </strong>
            <p>
              {baselineSamples.length} of {MAX_BASELINE_SAMPLES} sample slots
              filled. At least {REQUIRED_BASELINE_SAMPLES} usable samples are
              required before comparisons are enabled.
            </p>
          </div>
        </div>

        <div
          className="echo-sample-progress"
          aria-label={`Baseline samples: ${baselineSamples.length} of ${MAX_BASELINE_SAMPLES}`}
        >
          {Array.from({ length: MAX_BASELINE_SAMPLES }).map((_, index) => (
            <span
              key={index}
              className={
                index < baselineSamples.length ? "is-filled" : ""
              }
            />
          ))}
        </div>

        <div className="echo-actions">
          <button
            type="button"
            className="echo-primary-button"
            onClick={captureSample}
            disabled={sampling || !selectedField}
          >
            {sampling ? <Waves size={18} /> : <Mic size={18} />}
            {sampling ? "Recording…" : `Record ${SAMPLE_SECONDS}-second sample`}
          </button>

          {sampling && (
            <button
              type="button"
              className="echo-secondary-button"
              onClick={cancelCapture}
            >
              <MicOff size={18} />
              Cancel
            </button>
          )}

          {baselineSamples.length > 0 && !sampling && (
            <button
              type="button"
              className="echo-secondary-button"
              onClick={resetBaseline}
            >
              <RotateCcw size={18} />
              Reset reference
            </button>
          )}
        </div>

        {sampling && (
          <div className="echo-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}

        {message && <p className="echo-message">{message}</p>}
        {error && <p className="echo-error">{error}</p>}
      </div>

      {currentSample && (
        <div className="echo-panel">
          <div className="echo-panel-heading">
            <div>
              <p className="echo-eyebrow">LATEST RECORDING</p>
              <h3>Sample quality and measurements</h3>
            </div>

            <span
              className={`echo-quality-badge ${
                currentSample.quality === "Usable"
                  ? "is-good"
                  : "is-warning"
              }`}
            >
              {currentSample.quality}
            </span>
          </div>

          <div className="echo-metric-grid">
            <div className="echo-metric">
              <Activity size={20} />
              <span>Average audio level</span>
              <strong>{currentSample.rms.toFixed(4)}</strong>
              <small>Normalized RMS amplitude</small>
            </div>

            <div className="echo-metric">
              <Waves size={20} />
              <span>Spectral brightness</span>
              <strong>{Math.round(currentSample.centroid)} Hz</strong>
              <small>Descriptive frequency measure</small>
            </div>

            <div className="echo-metric">
              <AlertTriangle size={20} />
              <span>Clipped samples</span>
              <strong>
                {(currentSample.clippingRatio * 100).toFixed(2)}%
              </strong>
              <small>High values may indicate distortion</small>
            </div>
          </div>

          {currentSample.aiPrediction && (
  <div className="echo-notice">
    <ShieldCheck size={19} />
    <p>
      <strong>AI Sound Classification</strong>
      <br />
      Detected sound: {currentSample.aiPrediction}
      <br />
      Confidence:{" "}
      {Number(currentSample.aiConfidence).toFixed(1)}%
      <br />
      <small>
        AI prediction for investigation. Not a confirmed threat.
      </small>
    </p>
  </div>
)}

          {currentSample.issues.length > 0 && (
            <div className="echo-quality-issues">
              <strong>Check this recording</strong>
              <ul>
                {currentSample.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {currentSample.quality === "Usable" && (
            <div className="echo-actions">
              <button
                type="button"
                className="echo-primary-button"
                onClick={addSampleToBaseline}
                disabled={
                  baselineSamples.length >= MAX_BASELINE_SAMPLES
                }
              >
                <Save size={18} />
                Add to field reference
              </button>

              <button
                type="button"
                className="echo-secondary-button"
                onClick={saveComparison}
                disabled={!hasBaseline}
              >
                <Activity size={18} />
                Compare with reference
              </button>
            </div>
          )}

          {baselineSamples.length >= MAX_BASELINE_SAMPLES && (
            <p className="echo-muted">
              The reference already has five samples. Reset it if you want to
              build a new reference.
            </p>
          )}
        </div>
      )}

      {hasBaseline && currentSample?.quality === "Usable" && (
        <div className="echo-panel">
          <p className="echo-eyebrow">REFERENCE COMPARISON</p>
          <h3>Difference from this field's baseline</h3>

          <div className="echo-metric-grid">
            <div className="echo-metric">
              <Activity size={20} />
              <span>Audio level change</span>
              <strong>
                {formatPercent(
                  percentDifference(
                    currentSample.rms,
                    profile.averageRms
                  )
                )}
              </strong>
            </div>

            <div className="echo-metric">
              <Waves size={20} />
              <span>Spectral brightness change</span>
              <strong>
                {formatPercent(
                  percentDifference(
                    currentSample.centroid,
                    profile.averageCentroid
                  )
                )}
              </strong>
            </div>
          </div>

          <p className="echo-muted">
            These percentages describe measurement differences. They are not
            threat probabilities or validated alert thresholds.
          </p>
        </div>
      )}

      <div className="echo-panel">
        <div className="echo-panel-heading">
          <div>
            <p className="echo-eyebrow">FIELD MEMORY</p>
            <h3>EchoPrint history</h3>
          </div>
          <Clock size={22} />
        </div>

        {fieldEvents.length === 0 ? (
          <div className="echo-empty">
            <AudioLines size={30} />
            <p>No recordings saved for this field yet.</p>
            <span>
              Record several usable samples to build its reference.
            </span>
          </div>
        ) : (
          <div className="echo-history-list">
            {fieldEvents.map((event) => (
              <article className="echo-history-item" key={event.id}>
                <div className="echo-history-icon">
                  {event.type === "Sound comparison" ? (
                    <Activity size={19} />
                  ) : (
                    <CheckCircle2 size={19} />
                  )}
                </div>

                <div className="echo-history-content">
                  <strong>{event.type}</strong>
                  <time>{formatDate(event.createdAt)}</time>
                  <p>{event.note}</p>

                  {event.type === "Sound comparison" && (
                    <div className="echo-history-values">
                      <span>
                        Level: {formatPercent(event.rmsChange)}
                      </span>
                      <span>
                        Brightness: {formatPercent(event.centroidChange)}
                      </span>
                    </div>
                  )}

                  {event.type === "Sound comparison" && (
                    
<button
  type="button"
  className="echo-link-button"
onClick={async () => {
  const saved = await createObservation(event);

  if (saved) {
    onNavigate?.("observations");
  }
}}
>
  Create unverified observation
</button>

                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="echo-footer-note">
        <Info size={17} />
        <p>
          For more consistent comparisons, use the same device and recording
          position, and record at similar times and under similar conditions.
          A baseline built from a few samples is an initial reference, not a
          scientifically validated model of normal farm conditions.
        </p>
      </div>
    </section>
  );
}