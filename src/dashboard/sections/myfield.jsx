import { useMemo, useState } from "react";
import {
  Sprout,
  Trash2,
  Plus,
  Search,
  Pencil,
  X,
  MapPin,
  Ruler,
  Leaf,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  ClipboardList,
  Droplets,
  Thermometer,
  CalendarDays,
  Save,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  crop: "",
  area: "",
  areaUnit: "acres",
  location: "",
  soilType: "",
  plantingDate: "",
  notes: "",
};

const cropOptions = [
  "Rice",
  "Ragi",
  "Wheat",
  "Maize",
  "Tomato",
  "Potato",
  "Sugarcane",
  "Cotton",
  "Groundnut",
  "Other",
];

function normalizeField(field, index) {
  return {
    ...field,
    id: field.id ?? field._id ?? field.name ?? `field-${index}`,
    name: field.name ?? field.fieldName ?? `Field ${index + 1}`,
    crop: field.crop ?? "Not specified",
    area: field.area ?? "",
    status: field.status ?? "Monitoring",
    location: field.location ?? "",
    soilType: field.soilType ?? "",
    plantingDate: field.plantingDate ?? "",
    notes: field.notes ?? "",
  };
}

function getStatus(field) {
  const status = String(field.status ?? "Monitoring").toLowerCase();

  if (
    status.includes("critical") ||
    status.includes("urgent") ||
    status.includes("high risk")
  ) {
    return { label: "Needs attention", type: "warning" };
  }

  if (status.includes("alert") || status.includes("risk")) {
    return { label: "Review recommended", type: "warning" };
  }

  if (status.includes("offline")) {
    return { label: "Offline", type: "muted" };
  }

  if (status.includes("healthy") || status.includes("normal")) {
    return { label: "Healthy", type: "success" };
  }

  return { label: status === "monitoring" ? "Monitoring" : field.status, type: "info" };
}

function getMeasurements(field) {
  const measurements = field.measurements ?? field.latestMeasurements ?? {};

  return {
    moisture: measurements.moisture ?? field.soilMoisture ?? null,
    temperature: measurements.temperature ?? field.temperature ?? null,
    humidity: measurements.humidity ?? field.humidity ?? null,
    ph: measurements.ph ?? field.soilPH ?? null,
  };
}

function formatMeasurement(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "No data";
  }

  return `${value}${unit}`;
}

export default function MyFields({
  fields = [],
  addField,
  updateField,
  deleteField,
}) {
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedFields = useMemo(
    () => fields.map(normalizeField),
    [fields]
  );

  const totalArea = normalizedFields.reduce((sum, field) => {
    const area = Number(field.area);
    return sum + (Number.isFinite(area) && area > 0 ? area : 0);
  }, 0);

  const attentionCount = normalizedFields.filter((field) => {
    return getStatus(field).type === "warning";
  }).length;

  const cropTypes = [
    ...new Set(
      normalizedFields
        .map((field) => field.crop)
        .filter((crop) => crop && crop !== "Not specified")
    ),
  ];

  const filteredFields = normalizedFields.filter((field) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      field.name.toLowerCase().includes(query) ||
      String(field.crop).toLowerCase().includes(query) ||
      String(field.location).toLowerCase().includes(query);

    const matchesCrop =
      cropFilter === "all" || field.crop === cropFilter;

    const status = getStatus(field);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attention" && status.type === "warning") ||
      (statusFilter === "monitoring" && status.label === "Monitoring") ||
      (statusFilter === "offline" && status.type === "muted");

    return matchesSearch && matchesCrop && matchesStatus;
  });

  const selectedField = normalizedFields.find(
    (field) => String(field.id) === String(selectedId)
  );

  const comparedFields = normalizedFields.filter((field) =>
    compareIds.includes(String(field.id))
  );

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(field) {
    setEditingId(field.id);
    setForm({
      name: field.name === `Field ${normalizedFields.indexOf(field) + 1}`
        ? ""
        : field.name,
      crop: field.crop === "Not specified" ? "" : field.crop,
      area: field.area ?? "",
      location: field.location ?? "",areaUnit: field.areaUnit ?? "acres",
      soilType: field.soilType ?? "",
      plantingDate: field.plantingDate ?? "",
      notes: field.notes ?? "",
    });
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

 async function handleSave(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const name = form.name.trim();
    const crop = form.crop.trim();
    const area = form.area === "" ? "" : Number(form.area);

    if (!name) {
      setFormError("Enter a name for this field.");
      return;
    }

    if (!crop) {
      setFormError("Choose or enter a crop type.");
      return;
    }

    if (
      form.area !== "" &&
      (!Number.isFinite(area) || area <= 0)
    ) {
      setFormError("Enter a valid area greater than zero.");
      return;
    }

    const duplicate = normalizedFields.some(
      (field) =>
        field.name.trim().toLowerCase() === name.toLowerCase() &&
        String(field.id) !== String(editingId)
    );

    if (duplicate) {
      setFormError("A field with this name already exists.");
      return;
    }

    const updatedField = {
      name,
      areaUnit: form.areaUnit || "acres",
      crop,
      area,
      location: form.location.trim(),
      soilType: form.soilType.trim(),
      plantingDate: form.plantingDate,
      notes: form.notes.trim(),
    };

    try {
      if (editingId !== null) {
        if (typeof updateField !== "function") {
          setFormError("Field editing is not connected to the dashboard yet.");
          return;
        }

        updateField(editingId, updatedField);
        setNotice("Field details updated.");
      } else {
        if (typeof addField !== "function") {
          setFormError("Adding fields is not connected to the dashboard yet.");
          return;
        }

const result = await addField({
  ...updatedField,
  status: "Monitoring",
});

if (!result?.success) {
  setFormError(result?.message || "Unable to add this field.");
  return;
}

setNotice("Field added successfully.");
      }

      closeForm();
    } catch (error) {
      console.error("Unable to save field:", error);
      setFormError("Unable to save this field. Please try again.");
    }
  }

  function toggleCompare(field) {
    const id = String(field.id);

    setCompareIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }

      if (previous.length >= 3) {
        setNotice("You can compare up to three fields at a time.");
        return previous;
      }

      setNotice("");
      return [...previous, id];
    });
  }

  function clearFilters() {
    setSearch("");
    setCropFilter("all");
    setStatusFilter("all");
  }

  return (
    <section className="my-fields-page">
      {/* Page introduction */}
      <div className="my-fields-hero">
        <div className="my-fields-hero-copy">
          <span className="my-fields-eyebrow">
            FIELDZY / FARM MANAGEMENT
          </span>

          <h2>My Fields</h2>

          <p>
            One place to manage your land, review field information,
            and understand what needs attention.
          </p>
        </div>

        <button
          type="button"
          className="my-fields-primary-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add new field
        </button>
      </div>

      {notice && (
        <div className="my-fields-notice" role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overview metrics */}
      <div className="my-fields-stats">
        <article className="my-fields-stat-card">
          <div className="my-fields-stat-icon green">
            <Sprout size={20} />
          </div>
          <div>
            <span className="my-fields-stat-label">Registered fields</span>
            <strong>{normalizedFields.length}</strong>
            <small>Fields in your farm</small>
          </div>
        </article>

        <article className="my-fields-stat-card">
          <div className="my-fields-stat-icon blue">
            <Ruler size={20} />
          </div>
          <div>
            <span className="my-fields-stat-label">Total recorded area</span>
            <strong>{totalArea.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}</strong>
            <small>Area units as entered</small>
          </div>
        </article>

        <article className="my-fields-stat-card">
          <div className="my-fields-stat-icon amber">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="my-fields-stat-label">Needs review</span>
            <strong>{attentionCount}</strong>
            <small>Based on recorded field status</small>
          </div>
        </article>

        <article className="my-fields-stat-card">
          <div className="my-fields-stat-icon violet">
            <Leaf size={20} />
          </div>
          <div>
            <span className="my-fields-stat-label">Crop varieties</span>
            <strong>{cropTypes.length}</strong>
            <small>Distinct recorded crop types</small>
          </div>
        </article>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="my-fields-form-panel">
          <div className="my-fields-panel-heading">
            <div>
              <span className="my-fields-eyebrow">
                FIELD CONFIGURATION
              </span>
              <h3>{editingId !== null ? "Edit field" : "Register a new field"}</h3>
              <p>Enter the details you know. You can add more information later.</p>
            </div>

            <button
              type="button"
              className="my-fields-icon-button"
              aria-label="Close form"
              onClick={closeForm}
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="my-fields-form-grid">
              <label>
                Field name <span>*</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. North Field"
                  maxLength={70}
                  required
                />
              </label>

              <label>
                Crop type <span>*</span>
                <input
                  name="crop"
                  value={form.crop}
                  onChange={handleFormChange}
                  placeholder="Choose or enter a crop"
                  list="my-fields-crop-options"
                  maxLength={60}
                  required
                />
                <datalist id="my-fields-crop-options">
                  {cropOptions.map((crop) => (
                    <option value={crop} key={crop} />
                  ))}
                </datalist>
              </label>

              <label>
                Area
                <input
                  name="area"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.area}
                  onChange={handleFormChange}
                  placeholder="e.g. 2.5"
                />
              </label>

              <label>
                Area unit
                <select
                  name="areaUnit"
                  value={form.areaUnit ?? "acres"}
                  onChange={handleFormChange}
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="sq-m">Square metres</option>
                </select>
              </label>

              <label>
                Location
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="Village, area or coordinates"
                  maxLength={120}
                />
              </label>

              <label>
                Soil type
                <select
                  name="soilType"
                  value={form.soilType}
                  onChange={handleFormChange}
                >
                  <option value="">Not recorded</option>
                  <option value="Clay">Clay</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Loamy">Loamy</option>
                  <option value="Silty">Silty</option>
                  <option value="Black soil">Black soil</option>
                  <option value="Red soil">Red soil</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Planting date
                <input
                  name="plantingDate"
                  type="date"
                  value={form.plantingDate}
                  onChange={handleFormChange}
                />
              </label>

              <label className="my-fields-full-width">
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Optional field notes..."
                  rows={3}
                  maxLength={1000}
                />
              </label>
            </div>

            {formError && (
              <p className="my-fields-form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="my-fields-form-actions">
              <button
                type="button"
                className="my-fields-secondary-button"
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="my-fields-primary-button"
              >
                <Save size={17} />
                {editingId !== null ? "Save changes" : "Register field"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and filters */}
      <div className="my-fields-toolbar">
        <div className="my-fields-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fields, crops or locations..."
            aria-label="Search fields"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <label className="my-fields-filter">
          <span>Crop</span>
          <select
            value={cropFilter}
            onChange={(event) => setCropFilter(event.target.value)}
          >
            <option value="all">All crops</option>
            {cropTypes.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="my-fields-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="monitoring">Monitoring</option>
            <option value="attention">Needs attention</option>
            <option value="offline">Offline</option>
          </select>
          <ChevronDown size={14} />
        </label>

        {(search || cropFilter !== "all" || statusFilter !== "all") && (
          <button
            type="button"
            className="my-fields-clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Field list heading */}
      <div className="my-fields-list-heading">
        <div>
          <h3>Your registered fields</h3>
          <p>
            Showing {filteredFields.length} of {normalizedFields.length} fields
          </p>
        </div>

        {compareIds.length > 0 && (
          <span className="my-fields-compare-count">
            {compareIds.length} selected for comparison
          </span>
        )}
      </div>

      {/* Field cards */}
      {filteredFields.length === 0 ? (
        <div className="my-fields-empty">
          <div className="my-fields-empty-icon">
            <Sprout size={30} />
          </div>

          <h3>
            {normalizedFields.length === 0
              ? "Start by registering your first field"
              : "No fields match your filters"}
          </h3>

          <p>
            {normalizedFields.length === 0
              ? "Add your field details to start organizing your farm in FIELDZY."
              : "Try changing your search or filters to see more fields."}
          </p>

          {normalizedFields.length === 0 ? (
            <button
              type="button"
              className="my-fields-primary-button"
              onClick={openAddForm}
            >
              <Plus size={18} />
              Add your first field
            </button>
          ) : (
            <button
              type="button"
              className="my-fields-secondary-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="my-fields-grid">
          {filteredFields.map((field) => {
            const status = getStatus(field);
            const measurements = getMeasurements(field);
            const isSelected = String(selectedId) === String(field.id);
            const isCompared = compareIds.includes(String(field.id));

            return (
              <article className="my-field-card" key={field.id}>
                <div className="my-field-card-top">
                  <div className="my-field-crop-icon">
                    <Sprout size={22} />
                  </div>

                  <span className={`my-field-status ${status.type}`}>
                    <span />
                    {status.label}
                  </span>
                </div>

                <div className="my-field-card-title">
                  <h4>{field.name}</h4>
                  <p>
                    <Leaf size={14} />
                    {field.crop}
                  </p>
                </div>

                <div className="my-field-meta">
                  <span>
                    <Ruler size={15} />
                    {field.area !== "" && field.area !== null
                      ? `${field.area} ${field.areaUnit ?? "acres"}`
                      : "Area not recorded"}
                  </span>

                  <span>
                    <MapPin size={15} />
                    {field.location || "Location not recorded"}
                  </span>
                </div>

                <div className="my-field-measurements">
                  <div>
                    <Droplets size={16} />
                    <span>Moisture</span>
                    <strong>{formatMeasurement(measurements.moisture, "%")}</strong>
                  </div>

                  <div>
                    <Thermometer size={16} />
                    <span>Temperature</span>
                    <strong>{formatMeasurement(measurements.temperature, "°")}</strong>
                  </div>
                </div>

                <p className="my-field-data-note">
                  <Activity size={14} />
                  {measurements.moisture === null &&
                  measurements.temperature === null
                    ? "No sensor measurements recorded"
                    : "Showing latest available measurements"}
                </p>

                <div className="my-field-card-actions">
                  <button
                    type="button"
                    className="my-field-view-button"
                    onClick={() => {
                      setSelectedId(isSelected ? null : field.id);
                    }}
                  >
                    {isSelected ? "Hide details" : "View details"}
                    {isSelected ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  <button
                    type="button"
                    className={`my-field-compare-button ${isCompared ? "selected" : ""}`}
                    onClick={() => toggleCompare(field)}
                    aria-pressed={isCompared}
                    title="Select for comparison"
                  >
                    <GitCompareArrows size={17} />
                  </button>

                  <button
                    type="button"
                    className="my-field-compare-button"
                    onClick={() => {
  console.log("EDIT CLICKED:", field);
  openEditForm(field);
}}
                    aria-label={`Edit ${field.name}`}
                    title="Edit field"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
  type="button"
  className="my-field-compare-button my-field-delete-button"
  onClick={() => deleteField?.(field.id)}
  aria-label={`Delete ${field.name}`}
  title="Delete field"
>
  <Trash2 size={16} />
</button>
                </div>

                {isSelected && (
                  <div className="my-field-expanded">
                    <h5>Field profile</h5>

                    <div className="my-field-detail-row">
                      <span>Soil type</span>
                      <strong>{field.soilType || "Not recorded"}</strong>
                    </div>

                    <div className="my-field-detail-row">
                      <span>Planting date</span>
                      <strong>
                        {field.plantingDate || "Not recorded"}
                      </strong>
                    </div>

                    <div className="my-field-detail-row">
                      <span>Humidity</span>
                      <strong>
                        {formatMeasurement(measurements.humidity, "%")}
                      </strong>
                    </div>

                    <div className="my-field-detail-row">
                      <span>Soil pH</span>
                      <strong>
                        {formatMeasurement(measurements.ph, "")}
                      </strong>
                    </div>

                    <div className="my-field-detail-row">
                      <span>Monitoring status</span>
                      <strong>{status.label}</strong>
                    </div>

                    <div className="my-field-notes">
                      <span>Field notes</span>
                      <p>{field.notes || "No notes have been added."}</p>
                    </div>

                    <div className="my-field-history-placeholder">
                      <Clock3 size={16} />
                      <div>
                        <strong>Field activity history</strong>
                        <p>
                          Historical observations and sensor trends will
                          appear here when records are connected.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Comparison panel */}
      {comparedFields.length > 0 && (
        <section className="my-fields-comparison">
          <div className="my-fields-panel-heading">
            <div>
              <span className="my-fields-eyebrow">FIELD ANALYSIS</span>
              <h3>Compare fields</h3>
              <p>
                Compare the information currently recorded for selected fields.
              </p>
            </div>

            <button
              type="button"
              className="my-fields-secondary-button"
              onClick={() => setCompareIds([])}
            >
              Clear selection
            </button>
          </div>

          <div className="my-fields-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {comparedFields.map((field) => (
                    <th key={field.id}>{field.name}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Crop</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>{field.crop}</td>
                  ))}
                </tr>

                <tr>
                  <td>Area</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>
                      {field.area !== "" && field.area !== null
                        ? `${field.area} ${field.areaUnit ?? "acres"}`
                        : "Not recorded"}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Soil moisture</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>
                      {formatMeasurement(getMeasurements(field).moisture, "%")}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Temperature</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>
                      {formatMeasurement(getMeasurements(field).temperature, "°")}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>Soil type</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>{field.soilType || "Not recorded"}</td>
                  ))}
                </tr>

                <tr>
                  <td>Status</td>
                  {comparedFields.map((field) => (
                    <td key={field.id}>{getStatus(field).label}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="my-fields-comparison-note">
            Comparison is based only on recorded values. Missing data is not
            treated as a healthy reading.
          </p>
        </section>
      )}

      {/* Future data integrations */}
      <section className="my-fields-next-steps">
        <div className="my-fields-next-steps-icon">
          <ClipboardList size={22} />
        </div>

        <div>
          <h3>Make your field data more useful</h3>
          <p>
            Connect verified sensor readings, observations and early warnings
            to unlock historical trends and evidence-based field insights.
          </p>
        </div>

        <div className="my-fields-next-steps-tag">
          Data-driven monitoring
        </div>
      </section>
    </section>
  );
}