import SoilMoisture from "./sections/SoilMoisture";
import FieldzyFeatureCarousel from "./sections/FieldzyFeatureCarousel";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Droplets,
  Cloud,
  Leaf,
  Menu,
  Radio,
  ShieldCheck,
  Sprout
} from "lucide-react";

import "./dashboard.css";

// Dashboard sections
import Overview from "./sections/overview";
import MyFields from "./sections/myfield";
import EarlyWarnings from "./sections/earlywarning";
import Observations from "./sections/observation";
import AcousticIntelligence from "./sections/acousticintelligence";
import NetworkSystems from "./sections/networksystem";
import PlantDiseaseDetection from "./sections/PlantDiseaseDetection";

// Reusable dashboard components
import EvidenceDebtMeter from "./components/EvidenceDebtMeter";
import ThreatVisualizer from "./components/ThreatVisualizer";
import TransmissionFeed from "./components/TransmissionFeed";

async function analyzeFarmSound(audioFile) {
  const formData = new FormData();
  formData.append("file", audioFile);

  const response = await fetch(
    "http://127.0.0.1:8001/analyze",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error || data.detail) {
    throw new Error(
      data.error || data.detail || "Sound analysis failed"
    );
  }

  return data;
}


// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const STORAGE_KEY = "fieldzy-dashboard-v1";

export const VERIFICATION_STATUSES = [
  "Unverified",
  "Conflicting",
  "Corroborated",
  "Expert-confirmed",
  "Inconclusive",
];

export const NAVIGATION_ITEMS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "soil", label: "Soil Moisture", icon: Droplets },
  { id: "fields", label: "My Fields", icon: Sprout },
  { id: "warnings", label: "Early Warnings", icon: AlertTriangle },
  { id: "observations", label: "Observations", icon: ClipboardList },
  { id: "acoustic", label: "Acoustic Intelligence", icon: Activity },
  { id: "network", label: "Network Systems", icon: Radio },
  { id: "plant", label: "Plant Disease Detection", icon: Leaf },
];

const INITIAL_FIELDS = [
  {
    id: "field-north",
    name: "North Field",
    crop: "Not specified",
    area: "",
    status: "Monitoring",
  },
  {
    id: "field-east",
    name: "East Field",
    crop: "Not specified",
    area: "",
    status: "Monitoring",
  },
  {
    id: "field-south",
    name: "South Field",
    crop: "Not specified",
    area: "",
    status: "Monitoring",
  },
  {
    id: "field-west",
    name: "West Field",
    crop: "Not specified",
    area: "",
    status: "Monitoring",
  },
];

const INITIAL_OBSERVATIONS = [
  {
    id: "observation-1",
    fieldId: "field-north",
    fieldName: "North Field",
    title: "Unusual leaf discoloration",
    description:
      "Leaf colour changes have been noticed. Further inspection is needed before identifying a cause.",
    category: "Crop health",
    status: "Unverified",
    evidenceGaps: [
      {
        id: "gap-1",
        question: "Has a close visual inspection been recorded?",
        resolved: false,
      },
      {
        id: "gap-2",
        question: "Has the affected area been compared with healthy plants?",
        resolved: false,
      },
    ],
    evidence: [],
    nextAction: "Inspect affected plants and record the findings.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "observation-2",
    fieldId: "field-east",
    fieldName: "East Field",
    title: "Soil moisture needs checking",
    description:
      "A fresh measurement is needed to assess the current soil moisture.",
    category: "Soil",
    status: "Unverified",
    evidenceGaps: [
      {
        id: "gap-3",
        question: "Is there a recent soil moisture measurement?",
        resolved: false,
      },
    ],
    evidence: [],
    nextAction: "Take and record a fresh soil moisture measurement.",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_STATE = {
  fields: INITIAL_FIELDS,
  observations: INITIAL_OBSERVATIONS,
  evidenceHistory: [],
  baselineSounds: [],
  transmissionLogs: [],
  threat: null,
  neighbourAlerts: [],
  whisperLevel: 1,
  fieldSyncQueue: [],
};

// --------------------------------------------------
// SAFE LOCAL STORAGE
// --------------------------------------------------

function loadDashboardState() {
  if (typeof window === "undefined") {
    return INITIAL_STATE;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return INITIAL_STATE;
    }

    const parsed = JSON.parse(saved);

    return {
      ...INITIAL_STATE,
      ...parsed,
fields: Array.isArray(parsed.fields)
  ? parsed.fields
  : INITIAL_FIELDS,
      observations: Array.isArray(parsed.observations)
        ? parsed.observations
        : INITIAL_OBSERVATIONS,
      evidenceHistory: Array.isArray(parsed.evidenceHistory)
        ? parsed.evidenceHistory
        : [],
      baselineSounds: Array.isArray(parsed.baselineSounds)
        ? parsed.baselineSounds
        : [],
      transmissionLogs: Array.isArray(parsed.transmissionLogs)
        ? parsed.transmissionLogs
        : [],
      neighbourAlerts: Array.isArray(parsed.neighbourAlerts)
        ? parsed.neighbourAlerts
        : [],
           fieldSyncQueue: Array.isArray(parsed.fieldSyncQueue)
        ? parsed.fieldSyncQueue
        : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function createTimestamp() {
  return new Date().toISOString();
}

// --------------------------------------------------
// MAIN DASHBOARD
// --------------------------------------------------
const SECTION_VISUALS = {
  overview: {
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600",
    title: "A clearer view of your farm",
    description: "Monitor your fields and stay informed."
  },
  soil: {
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600",
    title: "Understand your soil",
    description: "Keep track of soil moisture and field conditions."
  },
  fields: {
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600",
    title: "Every field matters",
    description: "Keep your agricultural spaces connected."
  },
  warnings: {
    image: "https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1600",
    title: "Stay ahead of changing conditions",
    description: "Review warnings and emerging field risks."
  },
  observations: {
    image: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?w=1600",
    title: "Observe before you act",
    description: "Record field observations and supporting evidence."
  },
  acoustic: {
    image: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1600",
    title: "Listen to your surroundings",
    description: "Explore acoustic activity in your fields."
  },
  network: {
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600",
    title: "A connected farming network",
    description: "Keep track of sensors and system connectivity."
  },
  plant: {
    image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1600",
    title: "Look closer at plant health",
    description: "Inspect crops and assess possible concerns."
  }
};

export default function Dashboard({ onGoHome }) {
const [soundFile, setSoundFile] = useState(null);
const [soundDescription, setSoundDescription] = useState("");
const [soundAnalysis, setSoundAnalysis] = useState(null);
const [soundLoading, setSoundLoading] = useState(false);
const [soundError, setSoundError] = useState("");

const handleSoundAnalysis = async () => {
  console.log("ANALYZE BUTTON CLICKED");
  if (!soundFile) return;

  setSoundLoading(true);
  setSoundError("");
  setSoundAnalysis(null);

  try {
    const result = await analyzeFarmSound(soundFile);
    setSoundAnalysis(result);
  } catch (error) {
    console.error("Farm sound analysis failed:", error);
    setSoundError(
      error.message || "Unable to connect to the analysis service."
    );
  } finally {
    setSoundLoading(false);
  }
};

  const [dashboardState, setDashboardState] = useState(loadDashboardState);
  const dashboardStateRef = useRef(dashboardState);
dashboardStateRef.current = dashboardState;
  const [fieldsLoaded, setFieldsLoaded] = useState(false);

  const syncPendingFieldsRef = useRef(null);
  const syncPendingObservationsRef = useRef(null);
  const isSyncingFieldsRef = useRef(false);


useEffect(() => {
  async function loadDashboardFromSupabase() {
    try {
      const [
        fieldsResult,
        observationsResult,
        logsResult,
        neighbourAlertsResult,
        threatsResult,
        baselinesResult,
      ] = await Promise.all([
        supabase.from("fields").select("*"),

        supabase
          .from("observations")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("transmission_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("neighbour_alerts")
          .select("*")
          .order("received_at", { ascending: false }),

        supabase
          .from("threat_alerts")
          .select("*")
          .neq("status", "cleared")
          .order("created_at", { ascending: false }),

        supabase
          .from("baseline_sounds")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (fieldsResult.error) {
        console.error("Failed to load fields:", fieldsResult.error.message);
      }

      if (observationsResult.error) {
        console.error(
          "Failed to load observations:",
          observationsResult.error.message
        );
      }

      if (logsResult.error) {
        console.error("Failed to load logs:", logsResult.error.message);
      }

      if (neighbourAlertsResult.error) {
        console.error(
          "Failed to load neighbour alerts:",
          neighbourAlertsResult.error.message
        );
      }

      if (threatsResult.error) {
        console.error(
          "Failed to load threat alerts:",
          threatsResult.error.message
        );
      }

      if (baselinesResult.error) {
  console.error(
    "Failed to load sound baselines:",
    baselinesResult.error.message
  );
}


      setDashboardState((previous) => ({
        ...previous,

...(fieldsResult.data?.length > 0
  ? {
      fields: (() => {
        let mergedFields = fieldsResult.data.map((row) => ({
          id: row.external_id || row.id,
          name: row.name,
          crop: row.crop_type || "Not specified",
          area: row.area ?? "",
          status: row.status || "Monitoring",
        }));

        (previous.fieldSyncQueue || []).forEach((operation) => {
          if (operation.type === "upsert") {
            mergedFields = [
              ...mergedFields.filter(
                (field) => field.id !== operation.field.id
              ),
              operation.field,
            ];
          }

          if (operation.type === "delete") {
            mergedFields = mergedFields.filter(
              (field) => field.id !== operation.fieldId
            );
          }
        });

        return mergedFields;
      })(),
    }
  : {}),

...(observationsResult.data
  ? {
      observations: (() => {
        const remoteObservations = observationsResult.data.map((row) => ({
          id: row.external_id || row.id,
          fieldId: row.field_id,
          fieldName: row.field_name,
          title: row.title,
          description: row.description || "",
          category: row.category || "General",
          status: row.status || "Unverified",
          syncStatus: row.sync_status || "synced",

          evidenceGaps: row.evidence_gaps || [],
          validation: row.validation || null,
          evidence: row.evidence || [],

          // Evidence Debt review data
          reviewStage: row.review_stage || "Open",
          qualityChecks: row.quality_checks || {},
          reviewHistory: row.review_history || [],

          nextAction: row.next_action || "",
          createdAt: row.created_at,
        }));

        const remoteIds = new Set(
          remoteObservations.map((item) => item.id)
        );

        const localPending = previous.observations.filter(
          (item) =>
            String(item.syncStatus || "pending").toLowerCase() !== "synced" &&
            !remoteIds.has(item.id)
        );

        return [...localPending, ...remoteObservations];
      })(),
    }
  : {}),

        ...(logsResult.data
          ? {
              transmissionLogs: [...logsResult.data]
                .reverse()
                .map((row) => ({
                  id: row.external_id || row.id,
                  message: row.message,
                  type: row.type || "info",
                  timestamp: row.created_at,
                  simulated: row.simulated ?? true,
                })),
            }
          : {}),

        ...(neighbourAlertsResult.data
          ? {
              neighbourAlerts: neighbourAlertsResult.data.map((row) => ({
                id: row.external_id || row.id,
                originNode: row.origin_node,
                title: row.title,
                status: row.status || "Unverified",
                sourceReportId: row.source_report_id,
                receivedAt: row.received_at,
                simulated: row.simulated ?? true,
              })),
            }
          : {}),

        ...(threatsResult.data
          ? {
              threat: threatsResult.data.length
                ? {
                    id:
                      threatsResult.data[0].external_id ||
                      threatsResult.data[0].id,
                    title: threatsResult.data[0].threat_type,
                    fieldId:
                      threatsResult.data[0].details?.fieldId || null,
                    source:
                      threatsResult.data[0].message || "Recorded alert",
                    status:
                      threatsResult.data[0].status || "Unverified",
                    evidenceDebt:
                      threatsResult.data[0].details?.evidenceDebt ?? 0,
                    timestamp: threatsResult.data[0].created_at,
                    simulated:
                      threatsResult.data[0].details?.simulated ?? true,
                  }
                : null,
            }
          : {}),

        ...(baselinesResult.data
          ? {
              baselineSounds: baselinesResult.data.map((row) => ({
                id: row.external_id || row.id,
                label: row.label,
                description: row.description || "",
                learningMode:
                  row.learning_mode || "User-labelled local reference",
                simulatedLearning: row.simulated_learning ?? true,
                createdAt: row.created_at,
              })),
            }
          : {}),
      }));
    } catch (error) {
      console.error("Failed to load FIELDZY data:", error);
    } finally {
      setFieldsLoaded(true);
    }
  }

  loadDashboardFromSupabase();
}, []);

  const [activeSection, setActiveSection] = useState("overview");
  const activeVisual =
  SECTION_VISUALS[activeSection] || SECTION_VISUALS.overview;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
  function handleClickOutside(event) {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscape);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
  };
}, []);

  const [isOffline, setIsOffline] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !navigator.onLine
  );

  const [storageWarning, setStorageWarning] = useState("");

  const {
    fields,
    observations,
    evidenceHistory,
    baselineSounds,
    transmissionLogs,
    threat,
    neighbourAlerts,
    whisperLevel,
  } = dashboardState;

  // ----------------------------------------------
  // PERSIST DASHBOARD DATA
  // ----------------------------------------------

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dashboardState)
      );

      setStorageWarning("");
    } catch {
      setStorageWarning(
        "Local saving is unavailable. Your latest changes may not survive a refresh."
      );
    }
  }, [dashboardState]);

  // ----------------------------------------------
  // CONNECTION STATUS
  // ----------------------------------------------

useEffect(() => {
  function handleOnline() {
    setIsOffline(false);

    syncPendingFieldsRef.current?.();
    syncPendingObservationsRef.current?.();
  }

  function handleOffline() {
    setIsOffline(true);
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

  // ----------------------------------------------
  // SHARED STATE HELPERS
  // ----------------------------------------------

  function updateDashboard(updater) {
    setDashboardState((previous) => {
      if (typeof updater === "function") {
        return updater(previous);
      }

      return {
        ...previous,
        ...updater,
      };
    });
  }


function addLog(message, type = "info") {
  const log = {
    id: createId("log"),
    message,
    type,
    timestamp: createTimestamp(),
    simulated: true,
  };

  updateDashboard((previous) => ({
    ...previous,
    transmissionLogs: [...previous.transmissionLogs, log].slice(-200),
  }));

  supabase
    .from("transmission_logs")
    .upsert(
      {
        external_id: log.id,
        message: log.message,
        type: log.type,
        simulated: log.simulated,
        created_at: log.timestamp,
      },
      { onConflict: "external_id" }
    )
    .then(({ error }) => {
      if (error) {
        console.error("Failed to save transmission log:", error.message);
      }
    });

  return log;
}


  // ----------------------------------------------
  // FIELDS
  // ----------------------------------------------
async function addField(fieldData) {
  console.log("1. ADD FIELD CALLED:", fieldData);

  const name = fieldData.name?.trim();

  if (!name) {
    return {
      success: false,
      message: "Field name is required.",
    };
  }

  const currentFields = dashboardStateRef.current.fields;

  console.log("2. CURRENT FIELDS:", currentFields);

  const alreadyExists = currentFields.some(
    (field) => field.name.toLowerCase() === name.toLowerCase()
  );

  if (alreadyExists) {
    return {
      success: false,
      message: "A field with this name already exists.",
    };
  }

  const newField = {
    id: createId("field"),
    name,
    crop: fieldData.crop,
    area: fieldData.area,
    status: "Monitoring",
  };

  const operation = {
    id: createId("sync"),
    type: "upsert",
    field: newField,
    queuedAt: createTimestamp(),
  };

  console.log("3. NEW FIELD:", newField);

  updateDashboard((previous) => {
    const updatedState = {
      ...previous,
      fields: [...previous.fields, newField],
      fieldSyncQueue: [
        ...(previous.fieldSyncQueue || []),
        operation,
      ],
    };

    console.log("4. UPDATED FIELDS:", updatedState.fields);

    return updatedState;
  });

  console.log("5. STATE UPDATE SENT");

  addLog(`New field added: ${name}`);

  return {
    success: true,
    field: newField,
  };
}

  
async function updateField(fieldId, changes) {
  const existingField = dashboardState.fields.find(
    (field) => field.id === fieldId
  );

  if (!existingField) {
    return { success: false, message: "Field not found." };
  }

  const updatedField = {
    ...existingField,
    ...changes,
    name: changes.name?.trim() || existingField.name,
  };

  const duplicateName = dashboardState.fields.some(
    (field) =>
      field.id !== fieldId &&
      field.name.toLowerCase() === updatedField.name.toLowerCase()
  );

  if (duplicateName) {
    return { success: false, message: "A field with this name already exists." };
  }

  const operation = {
    id: createId("sync"),
    type: "upsert",
    field: updatedField,
    queuedAt: createTimestamp(),
  };

  updateDashboard((previous) => ({
    ...previous,
    fields: previous.fields.map((field) =>
      field.id === fieldId ? updatedField : field
    ),
    fieldSyncQueue: [...(previous.fieldSyncQueue || []), operation],
  }));

  addLog(`Field updated: ${updatedField.name}`);

  return { success: true, field: updatedField };
}

 
async function deleteField(fieldId) {
  const field = dashboardState.fields.find(
    (item) => item.id === fieldId
  );

  if (!field) {
    return { success: false, message: "Field not found." };
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${field.name}?`
  );

  if (!confirmed) {
    return { success: false, message: "Deletion cancelled." };
  }

  const operation = {
    id: createId("sync"),
    type: "delete",
    fieldId,
    queuedAt: createTimestamp(),
  };

  updateDashboard((previous) => ({
    ...previous,
    fields: previous.fields.filter((item) => item.id !== fieldId),
    fieldSyncQueue: [...(previous.fieldSyncQueue || []), operation],
  }));

  addLog(`Field deleted: ${field.name}`);

  return { success: true };
}

  // ----------------------------------------------
  // OBSERVATIONS
  // ----------------------------------------------


async function addObservation(observationData) {
  const title = String(observationData.title || "").trim();

  if (!title) {
    return {
      success: false,
      message: "Enter an observation title.",
    };
  }

  const selectedField = dashboardStateRef.current.fields.find(
    (field) => field.id === observationData.fieldId
  );

  if (!selectedField) {
    return {
      success: false,
      message: "Select a valid field.",
    };
  }

  // Preserve feature-specific evidence questions.
  const suppliedGaps = Array.isArray(observationData.evidenceGaps)
    ? observationData.evidenceGaps
    : [];

  const evidenceGaps = suppliedGaps.length
    ? suppliedGaps.map((gap) => ({
        id: gap.id || createId("gap"),
        question:
          typeof gap === "string"
            ? gap
            : gap.question || "Additional evidence is required.",
        resolved: Boolean(
          typeof gap === "object" && gap.resolved
        ),
      }))
    : [
        {
          id: createId("gap"),
          question:
            "What independent evidence supports this observation?",
          resolved: false,
        },
      ];

  const observation = {
    id: createId("observation"),
    fieldId: selectedField.id,
    fieldName: selectedField.name,
    title,
    description: String(
      observationData.description || ""
    ).trim(),
    category: observationData.category || "General",

    // AI assessment never automatically means verified.
    status: "Unverified",
    syncStatus: "pending",

    evidenceGaps,
    evidence: Array.isArray(observationData.evidence)
      ? observationData.evidence
      : [],

    // Keep the actual validation response.
    validation: observationData.validation || null,

    reviewStage: "Open",
    qualityChecks: {},
    reviewHistory: [],

    nextAction:
      String(observationData.nextAction || "").trim() ||
      observationData.validation?.next_action ||
      "Collect additional evidence before drawing a conclusion.",

    createdAt: createTimestamp(),
  };

  // Save locally first.
  updateDashboard((previous) => ({
    ...previous,
    observations: [
      observation,
      ...previous.observations,
    ],
  }));

  // Sync to Supabase when online.
  if (typeof navigator !== "undefined" && navigator.onLine) {
    const { error } = await supabase
      .from("observations")
      .upsert(
        {
          external_id: observation.id,
          field_id: observation.fieldId,
          field_name: observation.fieldName,
          title: observation.title,
          description: observation.description,
          category: observation.category,
          status: observation.status,
          sync_status: "synced",
          evidence_gaps: observation.evidenceGaps,
          evidence: observation.evidence,
          validation: observation.validation,
          review_stage: observation.reviewStage,
          quality_checks: observation.qualityChecks,
          review_history: observation.reviewHistory,
          next_action: observation.nextAction,
          created_at: observation.createdAt,
        },
        { onConflict: "external_id" }
      );

    if (!error) {
      const syncedObservation = {
        ...observation,
        syncStatus: "synced",
      };

      updateDashboard((previous) => ({
        ...previous,
        observations: previous.observations.map((item) =>
          item.id === observation.id
            ? syncedObservation
            : item
        ),
      }));

      addLog(`Observation synced: ${title}`, "success");

      return {
        success: true,
        observation: syncedObservation,
        message: "Observation saved and synced.",
      };
    }

    console.error("Observation sync failed:", error.message);
  }

  return {
    success: true,
    observation,
    message: "Observation saved locally. Sync is pending.",
  };
}


async function syncPendingObservations() {
  if (!navigator.onLine) {
    return {
      success: false,
      message: "You are offline. Sync cannot be attempted.",
    };
  }

  const pending = observations.filter(
    (item) =>
      String(item.syncStatus || "pending").toLowerCase() !== "synced"
  );

  if (pending.length === 0) {
    return {
      success: true,
      synced: 0,
      message: "All observations are already synced.",
    };
  }

  const rows = pending.map((item) => ({
    validation: item.validation || null,
    external_id: item.id,
    field_id: item.fieldId,
    field_name: item.fieldName,
    title: item.title,
    description: item.description || "",
    category: item.category || "General",
    status: item.status || "Unverified",
    sync_status: "synced",
    evidence_gaps: item.evidenceGaps || [],
    evidence: item.evidence || [],

    // NEW: Persistent Evidence Debt review data
    review_stage: item.reviewStage || "Open",
    quality_checks: item.qualityChecks || {},
    review_history: item.reviewHistory || [],

    next_action: item.nextAction || "",
    created_at: item.createdAt,
  }));

  try {
    const { error } = await supabase
      .from("observations")
      .upsert(rows, { onConflict: "external_id" });

    if (error) {
      throw error;
    }

    const syncedIds = pending.map((item) => item.id);

    updateDashboard((previous) => ({
      ...previous,
      observations: previous.observations.map((item) =>
        syncedIds.includes(item.id)
          ? { ...item, syncStatus: "synced" }
          : item
      ),
    }));

    addLog(
      `${syncedIds.length} observation(s) synced successfully.`,
      "success"
    );

    return {
      success: true,
      synced: syncedIds.length,
      message: `${syncedIds.length} observation(s) synced successfully.`,
    };
  } catch (error) {
    console.error("Observation sync failed:", error);

    return {
      success: false,
      message: "Sync failed. Observations remain saved locally.",
    };
  }
}

async function syncPendingFields() {
  if (!navigator.onLine || isSyncingFieldsRef.current) return;

  isSyncingFieldsRef.current = true;

  try {
    const pendingOperations = [
  ...(dashboardStateRef.current.fieldSyncQueue || []),
];

    for (const operation of pendingOperations) {
      let result;

      if (operation.type === "upsert") {
        const field = operation.field;

        result = await supabase.from("fields").upsert(
          {
            external_id: field.id,
            name: field.name,
            crop_type: field.crop,
            area: field.area,
            status: field.status,
          },
          { onConflict: "external_id" }
        );
      } else if (operation.type === "delete") {
        result = await supabase
          .from("fields")
          .delete()
          .eq("external_id", operation.fieldId);
      } else {
        continue;
      }

      if (result.error) {
        console.error("Field sync failed:", result.error.message);
        break;
      }

      updateDashboard((previous) => ({
        ...previous,
        fieldSyncQueue: (previous.fieldSyncQueue || []).filter(
          (item) => item.id !== operation.id
        ),
      }));
    }
  } catch (error) {
    console.error("Field sync failed:", error);
  } finally {
    isSyncingFieldsRef.current = false;
  }
}

syncPendingFieldsRef.current = syncPendingFields;
syncPendingObservationsRef.current = syncPendingObservations;

useEffect(() => {
  if (
    navigator.onLine &&
    dashboardState.fieldSyncQueue.length > 0
  ) {
    syncPendingFieldsRef.current?.();
  }
}, [dashboardState.fieldSyncQueue]);

async function updateObservation(observationId, changes) {
  const existingObservation = observations.find(
    (observation) => observation.id === observationId
  );

  if (!existingObservation) {
    return {
      success: false,
      message: "Observation not found.",
    };
  }

  const selectedField = fields.find(
    (field) => field.id === (changes.fieldId ?? existingObservation.fieldId)
  );

  if (!selectedField) {
    return {
      success: false,
      message: "Select a valid field.",
    };
  }

  const title = String(
    changes.title ?? existingObservation.title
  ).trim();

  const description = String(
    changes.description ?? existingObservation.description
  ).trim();

  if (!title || !description) {
    return {
      success: false,
      message: "Enter an observation title and description.",
    };
  }

  const updatedObservation = {
    ...existingObservation,
    ...changes,

    id: existingObservation.id,
    fieldId: selectedField.id,
    fieldName: selectedField.name,
    title,
    description,

    evidence: existingObservation.evidence ?? [],
    evidenceGaps: existingObservation.evidenceGaps ?? [],

    // Preserve Evidence Debt review data
    reviewStage:
      changes.reviewStage ??
      existingObservation.reviewStage ??
      "Open",

    qualityChecks:
      changes.qualityChecks ??
      existingObservation.qualityChecks ??
      {},

    reviewHistory:
      changes.reviewHistory ??
      existingObservation.reviewHistory ??
      [],

    createdAt: existingObservation.createdAt,
    syncStatus: "pending",
  };

  // 1. Save locally first
  updateDashboard((previous) => ({
    ...previous,
    observations: previous.observations.map((observation) =>
      observation.id === observationId
        ? updatedObservation
        : observation
    ),
  }));

  // 2. Attempt Supabase sync
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from("observations")
        .update({
          field_id: updatedObservation.fieldId,
          field_name: updatedObservation.fieldName,
          title: updatedObservation.title,
          description: updatedObservation.description,
          category: updatedObservation.category,
          status: updatedObservation.status,
          sync_status: "synced",
          evidence_gaps: updatedObservation.evidenceGaps,
          evidence: updatedObservation.evidence,

          // NEW: Save review workflow data
          review_stage: updatedObservation.reviewStage,
          quality_checks: updatedObservation.qualityChecks,
          review_history: updatedObservation.reviewHistory,

          next_action: updatedObservation.nextAction || "",
        })
        .eq("external_id", observationId)
        .select("external_id");

      if (error || !data?.length) {
        throw error || new Error("No matching database record found.");
      }

      const syncedObservation = {
        ...updatedObservation,
        syncStatus: "synced",
      };

      updateDashboard((previous) => ({
        ...previous,
        observations: previous.observations.map((observation) =>
          observation.id === observationId
            ? syncedObservation
            : observation
        ),
      }));

      addLog(`Observation updated: ${title}`, "success");

      return {
        success: true,
        observation: syncedObservation,
        message: "Observation updated and synced.",
      };
    } catch (error) {
      console.error("Observation update sync failed:", error);
    }
  }

  // 3. Keep locally saved changes pending
  addLog(`Observation updated locally: ${title}`, "info");

  return {
    success: true,
    observation: updatedObservation,
    message: "Changes saved locally. Database sync is pending.",
  };
}

  // ----------------------------------------------
  // EVIDENCE AND EVIDENCE DEBT
  // ----------------------------------------------

async function addEvidence(observationId, evidenceData) {
  const note = String(evidenceData.note || "").trim();

  if (!note) {
    return {
      success: false,
      message: "Enter an evidence note.",
    };
  }

  const observation = observations.find(
    (item) => item.id === observationId
  );

  if (!observation) {
    return {
      success: false,
      message: "Observation not found.",
    };
  }

  const evidenceItem = {
    id: createId("evidence"),
    note,
    source: evidenceData.source || "Farmer observation",
    sourceReportId: evidenceData.sourceReportId || null,
    independent: Boolean(evidenceData.independent),
    timestamp: createTimestamp(),
  };

  const evidence = [
    ...(observation.evidence || []),
    evidenceItem,
  ];

  const { data, error } = await supabase
    .from("observations")
    .update({ evidence })
    .eq("external_id", observationId)
    .select("external_id");

  if (error || !data?.length) {
    console.error(
      "Evidence save failed:",
      error?.message || "No matching observation was updated."
    );

    return {
      success: false,
      message: "Could not save evidence to the database.",
    };
  }

  const historyItem = {
    id: createId("history"),
    observationId,
    action: "Evidence added",
    details: note,
    timestamp: createTimestamp(),
  };

  updateDashboard((previous) => ({
    ...previous,
    observations: previous.observations.map((item) =>
      item.id === observationId
        ? { ...item, evidence }
        : item
    ),
    evidenceHistory: [
      historyItem,
      ...previous.evidenceHistory,
    ],
  }));

  addLog(
    `Evidence note added: ${observation.title}`,
    "success"
  );

  return {
    success: true,
    evidence: evidenceItem,
  };
}

async function updateEvidenceGap(observationId, gapId, resolved) {
  const observation = observations.find(
    (item) => item.id === observationId
  );

  if (!observation) {
    return {
      success: false,
      message: "Observation not found.",
    };
  }

  const existingGaps = observation.evidenceGaps || [];

  if (!existingGaps.some((gap) => gap.id === gapId)) {
    return {
      success: false,
      message: "Evidence gap not found.",
    };
  }

  const evidenceGaps = existingGaps.map((gap) =>
    gap.id === gapId
      ? { ...gap, resolved: Boolean(resolved) }
      : gap
  );

  const { data, error } = await supabase
    .from("observations")
    .update({ evidence_gaps: evidenceGaps })
    .eq("external_id", observationId)
    .select("external_id");

  if (error || !data?.length) {
    console.error(
      "Evidence gap update failed:",
      error?.message || "No matching observation was updated."
    );

    return {
      success: false,
      message: "Could not save evidence-gap changes.",
    };
  }

  const historyItem = {
    id: createId("history"),
    observationId,
    action: resolved
      ? "Evidence gap reviewed"
      : "Evidence gap reopened",
    details:
      evidenceGaps.find((gap) => gap.id === gapId)?.question || "",
    timestamp: createTimestamp(),
  };

  updateDashboard((previous) => ({
    ...previous,
    observations: previous.observations.map((item) =>
      item.id === observationId
        ? { ...item, evidenceGaps }
        : item
    ),
    evidenceHistory: [
      historyItem,
      ...previous.evidenceHistory,
    ],
  }));

  return { success: true };
}


async function updateVerification(observationId, status, details = "") {
  if (!VERIFICATION_STATUSES.includes(status)) {
    return {
      success: false,
      message: "Invalid verification status.",
    };
  }

  const observation = observations.find(
    (item) => item.id === observationId
  );

  if (!observation) {
    return {
      success: false,
      message: "Observation not found.",
    };
  }

  const { data, error } = await supabase
    .from("observations")
    .update({ status })
    .eq("external_id", observationId)
    .select("external_id");

  if (error || !data?.length) {
    console.error(
      "Verification update failed:",
      error?.message || "No matching observation was updated."
    );

    return {
      success: false,
      message: "Could not save verification status.",
    };
  }

  const historyItem = {
    id: createId("history"),
    observationId,
    action: "Verification status changed",
    details: `${observation.status} → ${status}${
      details ? `: ${details}` : ""
    }`,
    timestamp: createTimestamp(),
  };

  updateDashboard((previous) => ({
    ...previous,

    observations: previous.observations.map((item) =>
      item.id === observationId
        ? { ...item, status }
        : item
    ),

    evidenceHistory: [
      historyItem,
      ...previous.evidenceHistory,
    ],
  }));

  addLog(
    `Verification updated for ${observation.title}: ${status}`,
    "success"
  );

  return { success: true };
}


  
const unresolvedEvidenceCount = observations.reduce(
  (total, observation) => {
    const gaps = Array.isArray(observation.evidenceGaps)
      ? observation.evidenceGaps
      : [];

    return total + gaps.filter((gap) => !gap.resolved).length;
  },
  0
);


  
const unverifiedCount = observations.filter((observation) =>
  ["Unverified", "Conflicting", "Inconclusive"].includes(
    observation.status || "Unverified"
  )
).length;


  const evidenceDebt = Math.min(
  100,
  unresolvedEvidenceCount * 15 + unverifiedCount * 10
);

  // ----------------------------------------------
  // THREAT VISUALIZER
  // ----------------------------------------------


async function triggerDemoThreat(threatData = {}) {
  const newThreat = {
    id: createId("demo-threat"),
    title: threatData.title || "Potential agricultural threat",
    fieldId: threatData.fieldId || null,
    source: "Local demonstration",
    status: "Unverified",
    evidenceDebt,
    timestamp: createTimestamp(),
    simulated: true,
  };

  const { error } = await supabase.from("threat_alerts").insert({
    external_id: newThreat.id,
    threat_type: newThreat.title,
    severity: "medium",
    message: newThreat.source,
    status: "unverified",
    details: {
      fieldId: newThreat.fieldId,
      evidenceDebt: newThreat.evidenceDebt,
      simulated: true,
    },
    created_at: newThreat.timestamp,
  });

  if (error) {
    console.error("Failed to save demo threat:", error.message);
    addLog("Failed to save demonstration alert to database.", "error");
    return null;
  }

  updateDashboard((previous) => ({
    ...previous,
    threat: newThreat,
  }));

  addLog(
    `DEMO ALERT: ${newThreat.title}. This is not a real detection.`,
    "warning"
  );

  return newThreat;
}

  
async function clearThreat() {
  const currentThreat = dashboardState.threat;

  if (!currentThreat?.id) {
    updateDashboard((previous) => ({
      ...previous,
      threat: null,
    }));
    return;
  }

  const { error } = await supabase
    .from("threat_alerts")
    .update({ status: "cleared" })
    .neq("status", "cleared");

  if (error) {
    console.error("Failed to clear threat alerts:", error.message);
    addLog("Failed to clear threat alerts in the database.", "error");
    return;
  }

  updateDashboard((previous) => ({
    ...previous,
    threat: null,
  }));

  addLog("Active demonstration alerts cleared.", "info");
}


  // ----------------------------------------------
  // ACOUSTIC BASELINES
  // ----------------------------------------------

async function saveBaseline(soundData) {
  const label = String(soundData.label || "").trim();
  const description = String(soundData.description || "").trim();

  if (!label) {
    return {
      success: false,
      message: "Enter a sound label.",
    };
  }

  const baseline = {
    id: createId("baseline"),
    label,
    description,
    createdAt: createTimestamp(),
    learningMode: "User-labelled local reference",
    simulatedLearning: true,
  };

  const { data, error } = await supabase
    .from("baseline_sounds")
    .insert({
      external_id: baseline.id,
      label: baseline.label,
      description: baseline.description,
      learning_mode: baseline.learningMode,
      simulated_learning: baseline.simulatedLearning,
    })
    .select("external_id, label, description, learning_mode, simulated_learning")
    .single();

  if (error || !data) {
    console.error(
      "Sound baseline save failed:",
      error?.message || "No baseline was returned."
    );

    return {
      success: false,
      message: "Could not save the sound baseline to the database.",
    };
  }

  const savedBaseline = {
    ...baseline,
    id: data.external_id,
    label: data.label,
    description: data.description || "",
    learningMode: data.learning_mode,
    simulatedLearning: data.simulated_learning,
  };

  updateDashboard((previous) => ({
    ...previous,
    baselineSounds: [
      savedBaseline,
      ...previous.baselineSounds.filter(
        (item) => item.id !== savedBaseline.id
      ),
    ],
  }));

  addLog(
    `Sound baseline saved: ${savedBaseline.label}. No AI training performed.`,
    "success"
  );

  return { success: true, baseline: savedBaseline };
}


  // ----------------------------------------------
  // WHISPER-WEIGHT LEVEL
  // ----------------------------------------------

  function setWhisperLevel(level) {
    const selectedLevel = Number(level);

    if (![1, 2, 3].includes(selectedLevel)) {
      return {
        success: false,
        message: "Select protocol level 1, 2 or 3.",
      };
    }

    updateDashboard((previous) => ({
      ...previous,
      whisperLevel: selectedLevel,
    }));

    addLog(
      `Whisper-Weight demonstration level changed to ${selectedLevel}.`,
      "info"
    );

    return { success: true };
  }

  // ----------------------------------------------
  // NEIGHBOUR ALERT DEMONSTRATION
  // ----------------------------------------------


async function receiveDemoNeighbourAlert(alertData = {}) {
  const selectedFieldId =
    alertData.fieldId ||
    dashboardStateRef.current.fields?.[0]?.id ||
    null;

  if (!selectedFieldId) {
    return {
      success: false,
      message: "A field must be registered before receiving a neighbour alert.",
    };
  }

  const alert = {
    id: createId("neighbour-demo"),
    originNode: alertData.originNode || "Farm Node Demo",
    title: alertData.title || "Potential crop threat",
    status: "Unverified",
    sourceReportId:
      alertData.sourceReportId || createId("source-report"),
    receivedAt: createTimestamp(),
    fieldId: selectedFieldId,
    simulated: true,
  };

  // 1. Save the neighbour alert.
  const { error } = await supabase
    .from("neighbour_alerts")
    .upsert(
      {
        external_id: alert.id,
        origin_node: alert.originNode,
        title: alert.title,
        status: alert.status,
        source_report_id: alert.sourceReportId,
        received_at: alert.receivedAt,
        simulated: alert.simulated,
      },
      { onConflict: "external_id" }
    );

  if (error) {
    console.error("Failed to save neighbour alert:", error.message);
    addLog("Failed to save demonstration neighbour alert.", "error");

    return {
      success: false,
      message: "Could not save the neighbour alert to the database.",
    };
  }

  // 2. Update the neighbour alert dashboard.
  updateDashboard((previous) => ({
    ...previous,
    neighbourAlerts: [
      alert,
      ...previous.neighbourAlerts.filter(
        (existing) => existing.id !== alert.id
      ),
    ],
  }));

  // 3. Validate the report's evidence.
  let validation = {
    status: "insufficient",
    missing_evidence: [
      {
        key: "independent_evidence",
        question: "Is there independent evidence supporting this neighbour report?",
      },
    ],
    expert_confirmed: false,
  };

  try {
    const response = await fetch(
      "http://127.0.0.1:8001/validate-evidence",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: "observation",
          model_result: {},
          context: {
            description: alert.title,
            independent_evidence: null,
          },
          evidence: [
            {
              type: "neighbour_alert",
              source: alert.originNode,
              source_report_id: alert.sourceReportId,
              received_at: alert.receivedAt,
              simulated: true,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Evidence validation failed: ${response.status}`);
    }

    const data = await response.json();
    validation = data.validation || data;
  } catch (validationError) {
    console.error("Neighbour alert validation failed:", validationError);
    addLog(
      "Neighbour alert saved, but evidence validation could not be completed.",
      "warning"
    );
  }

  // 4. Convert missing evidence into Evidence Debt gaps.
  const evidenceGaps = (
    validation.missing_evidence || []
  ).map((item) => ({
    key: typeof item === "string" ? item : item.key,
    question:
      typeof item === "string"
        ? item
        : item.question || "Additional independent evidence is required.",
    resolved: false,
  }));

  // 5. Create the corresponding observation.
  try {
    const observationResult = await addObservation({
      fieldId: selectedFieldId,
      category: "Neighbour Alert",
      title: `Neighbour report: ${alert.title}`,
      description:
        `A ${alert.simulated ? "simulated " : ""}report was received from ${alert.originNode}. ` +
        "The report has not been independently corroborated.",
      evidence: [
        {
          type: "neighbour_alert",
          source: alert.originNode,
          sourceReportId: alert.sourceReportId,
          neighbourAlertId: alert.id,
          simulated: alert.simulated,
          receivedAt: alert.receivedAt,
        },
      ],
      evidenceGaps,
      validation,
      nextAction:
        "Seek independent field evidence and verify the report before taking action.",
    });

    if (observationResult?.success === false) {
      throw new Error(
        observationResult.message || "Could not create the observation."
      );
    }

    addLog(
      `Neighbour alert converted into an unverified field observation: ${alert.title}.`,
      "warning"
    );

    return {
      success: true,
      alert,
      validation,
      observationResult,
    };
  } catch (observationError) {
    console.error(
      "Failed to create neighbour alert observation:",
      observationError
    );

    addLog(
      "Neighbour alert was saved, but its Evidence Debt observation could not be created.",
      "error"
    );

    return {
      success: false,
      alert,
      message: "Alert saved, but observation creation failed.",
    };
  }
}


  // ----------------------------------------------
  // SHARED PROPS
  // ----------------------------------------------

  async function updateObservationReview(observationId, changes) {
  const existingObservation = observations.find(
    (item) => item.id === observationId
  );

  if (!existingObservation) {
    return {
      success: false,
      message: "Observation not found.",
    };
  }

  const updatedObservation = {
    ...existingObservation,

    reviewStage:
      changes.reviewStage ??
      existingObservation.reviewStage ??
      "Open",

    qualityChecks:
      changes.qualityChecks ??
      existingObservation.qualityChecks ??
      {},

    reviewHistory:
      changes.reviewHistory ??
      existingObservation.reviewHistory ??
      [],

    syncStatus: "pending",
  };

  // 1. Save review changes locally
  updateDashboard((previous) => ({
    ...previous,
    observations: previous.observations.map((item) =>
      item.id === observationId ? updatedObservation : item
    ),
  }));

  // 2. Try syncing to Supabase
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from("observations")
        .update({
          review_stage: updatedObservation.reviewStage,
          quality_checks: updatedObservation.qualityChecks,
          review_history: updatedObservation.reviewHistory,
          sync_status: "synced",
        })
        .eq("external_id", observationId)
        .select("external_id");

      if (error || !data?.length) {
        throw error || new Error("Observation not found in database.");
      }

      const syncedObservation = {
        ...updatedObservation,
        syncStatus: "synced",
      };

      updateDashboard((previous) => ({
        ...previous,
        observations: previous.observations.map((item) =>
          item.id === observationId ? syncedObservation : item
        ),
      }));

      return {
        success: true,
        observation: syncedObservation,
        message: "Review progress saved and synced.",
      };
    } catch (error) {
      console.error("Review update sync failed:", error);
    }
  }

  return {
    success: true,
    observation: updatedObservation,
    message: "Review progress saved locally. Sync is pending.",
  };
}

  const sharedData = {
    fields,
    observations,
    evidenceHistory,
    baselineSounds,
    transmissionLogs,
    neighbourAlerts,
    threat,
    whisperLevel,
    isOffline,

    evidenceDebt,
    unresolvedEvidenceCount,
    unverifiedCount,

    addField,
    updateField,
    deleteField,
    addObservation,
    addEvidence,
    updateEvidenceGap,
    updateVerification,
    triggerDemoThreat,
    clearThreat,
    saveBaseline,
    updateObservation,
    updateObservationReview,
    setWhisperLevel,
    receiveDemoNeighbourAlert,
    addLog,
    syncPendingObservations,
  };

  // ----------------------------------------------
  // ACTIVE SECTION
  // ----------------------------------------------

  function renderActiveSection() {

    switch (activeSection) {
      
      case "fields":
        return <MyFields {...sharedData} />;

      case "warnings":
        return <EarlyWarnings {...sharedData} />;

      case "observations":
        return <Observations {...sharedData} />;

           case "acoustic":
        return (
          <AcousticIntelligence
            {...sharedData}
            onNavigate={setActiveSection}
          />
        );

      case "network":
        return (
          <NetworkSystems
            {...sharedData}
            TransmissionFeed={TransmissionFeed}
          />
        );

        case "soil":
  return <SoilMoisture {...sharedData} />;

case "plant":
  return <PlantDiseaseDetection {...sharedData} />;

      case "overview":
      default:
        return (
          <Overview
            {...sharedData}
            EvidenceDebtMeter={EvidenceDebtMeter}
            ThreatVisualizer={ThreatVisualizer}
            onNavigate={setActiveSection}
          />
        );
    }
  }

  // ----------------------------------------------
  // DASHBOARD LAYOUT
  // ----------------------------------------------

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        
  <button
    type="button"
    className="dashboard-brand"
    onClick={() => {
      setActiveSection("overview");
      setMenuOpen(false);
    }}
    aria-label="FIELDZY overview"
  >
<span className="dashboard-brand-mark">
  <img
    src="/Fieldzy Smart Farm Emblem.png"
    alt="FIELDZY"
  />
</span>

    <span className="dashboard-brand-copy">
      <strong>FIELDZY</strong>
      <small>OFF-GRID AGRICULTURAL INTELLIGENCE</small>
    </span>
  </button>

<div className="dashboard-menu-wrapper" ref={menuRef}>
    <button
      type="button"
      className="dashboard-menu-button"
      aria-label="Dashboard navigation"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((open) => !open)}
    >
      <Menu size={22} />
      <span>Menu</span>
    </button>

    <nav
      className={`dashboard-navigation ${
        menuOpen ? "navigation-open" : ""
      }`}
      aria-label="Main navigation"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            className={`dashboard-nav-item ${
              activeSection === item.id ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection(item.id);
              setMenuOpen(false);
            }}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  </div>

  <div className="topbar-actions">
    <span
      className={`connection-status ${
        isOffline ? "is-offline" : ""
      }`}
    >
      {isOffline ? <Cloud size={17} /> : <Radio size={17} />}
      {isOffline ? "OFFLINE" : "BROWSER ONLINE"}
    </span>

    {onGoHome && (
      <button
        type="button"
        className="dashboard-home-button"
        onClick={onGoHome}
      >
        Home
      </button>
    )}
  </div>
</header>
<FieldzyFeatureCarousel
  onNavigate={(featureId) => {
    setActiveSection(featureId);
  }}
/>

      {isOffline && (
        <div className="offline-banner" role="status">
          <Cloud size={18} />
          <span>
            Your browser reports that it is offline. Local dashboard data
            may still be available. Nearby-device connectivity is not verified.
          </span>
        </div>
      )}

      {storageWarning && (
        <div className="dashboard-notice" role="alert">
          <AlertTriangle size={18} />
          <span>{storageWarning}</span>
        </div>
      )}

      <main className="dashboard-main">
        <div className="dashboard-page-heading">
          <div>
            <p className="eyebrow">FIELDZY / AGRICULTURAL MONITORING</p>
            <h1>
              {NAVIGATION_ITEMS.find(
                (item) => item.id === activeSection
              )?.label || "Overview"}
            </h1>
            <p className="page-subtitle">
              Observe carefully. Verify evidence. Share warnings responsibly.
            </p>
          </div>

          <div className="system-indicator">
            <span className="system-indicator-dot" />
            LOCAL DASHBOARD
          </div>
        </div>

        <section className="dashboard-photo-banner">
  <img
    src={activeVisual.image}
    alt={activeVisual.title}
    key={activeSection}
  />

  <div className="dashboard-photo-overlay">
    <span>FIELDZY / FIELD INSIGHTS</span>
    <h2>{activeVisual.title}</h2>
    <p>{activeVisual.description}</p>
  </div>
</section>

        {renderActiveSection()}
        <section className="sound-analysis-panel">
  <h2>🌿 Farm Sound Analysis</h2>
  <p>
    Describe a sound heard on your farm for a demonstration analysis.
  </p>

<input
  type="file"
  accept="audio/*"
  onChange={(event) =>
    setSoundFile(event.target.files[0] || null)
  }
/>

{soundFile && (
  <p>Selected: {soundFile.name}</p>
)}



<button
  type="button"
  onClick={handleSoundAnalysis}
  disabled={soundLoading || !soundFile}
>
  {soundLoading ? "Analyzing..." : "Analyze Sound"}
</button>

  {soundError && <p role="alert">{soundError}</p>}

{soundAnalysis && (
  <div className="sound-result-card">
    <div className="sound-result-header">
      <span className="sound-result-icon">🌿</span>
      <div>
        <h3>Analysis Report</h3>
        <span className="sound-demo-badge">LOCAL MODEL RESULT</span>
      </div>
    </div>

    <div className="sound-result-row">
      <span>Predicted Sound</span>
      <strong>{soundAnalysis.prediction}</strong>
    </div>

    <div className="sound-result-row">
      <span>Model Confidence</span>
      <strong>{soundAnalysis.confidence}%</strong>
    </div>

    <p className="sound-result-warning">
      ⚠️ {soundAnalysis.message}
    </p>
  </div>
)}

  <small>
    Demo mode: results are simulated and do not confirm real threats.
  </small>
</section>
        <footer className="dashboard-footer">

          <span className="footer-brand">
            <Leaf size={16} />
            <strong>FIELDZY</strong>
          </span>

          <span>
            Offline-first design · Evidence-aware alerts · Local browser storage
          </span>

          <span>Demo functions are labelled where applicable.</span>
        </footer>
      </main>
    </div>
  );
}