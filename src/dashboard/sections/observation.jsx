
import { useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Clock,
  ShieldCheck,
  AlertCircle,
  Leaf,
  X,
  Pencil,
} from "lucide-react";

const CATEGORIES = [
  "Crop health",
  "Pest activity",
  "Soil",
  "Water",
  "Weather",
  "Acoustic",
  "Other",
];

const STATUSES = [
  "Unverified",
  "Conflicting",
  "Corroborated",
  "Expert-confirmed",
  "Inconclusive",
];

const EMPTY_FORM = {
  fieldId: "",
  title: "",
  description: "",
  category: "Crop health",
  nextAction: "",
};

export default function Observations({
  fields = [],
  observations = [],
  addObservation,
  updateObservation,
  updateEvidenceGap,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const getFieldName = (observation) => {
    const field = fields.find(
      (item) =>
        item.id === observation.fieldId ||
        item.name === observation.fieldName
    );

    return field?.name || observation.fieldName || "Unknown field";
  };

  const filteredObservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return observations
      .filter((observation) => {
        const searchableValues = [
          observation.title,
          observation.description,
          observation.category,
          getFieldName(observation),
        ];

        const matchesSearch =
          !query ||
          searchableValues
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(query)
            );

        const matchesStatus =
          statusFilter === "All" ||
          observation.status === statusFilter;

        const matchesCategory =
          categoryFilter === "All" ||
          observation.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
  }, [
    observations,
    fields,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const unverifiedCount = observations.filter(
    (item) => item.status === "Unverified"
  ).length;

  const evidenceGapCount = observations.reduce(
    (total, item) => {
      if (Array.isArray(item.evidenceGaps)) {
        return (
          total +
          item.evidenceGaps.filter((gap) => !gap.resolved).length
        );
      }

      return total + Math.max(0, Number(item.evidenceGaps) || 0);
    },
    0
  );

  const verifiedCount = observations.filter(
    (item) =>
      item.status === "Corroborated" ||
      item.status === "Expert-confirmed"
  ).length;

  const getStatusClass = (status) => {
    switch (status) {
      case "Expert-confirmed":
      case "Corroborated":
        return "observation-status-positive";

      case "Conflicting":
      case "Inconclusive":
        return "observation-status-warning";

      default:
        return "observation-status-pending";
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const handleEdit = (observation) => {
    setForm({
      fieldId: observation.fieldId || "",
      title: observation.title || "",
      description: observation.description || "",
      category: observation.category || "Other",
      nextAction: observation.nextAction || "",
    });

    setEditingId(observation.id);
    setShowForm(true);
    setError("");

    window.setTimeout(() => {
      document
        .querySelector(".observation-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (fields.length === 0) {
      setError(
        "Add a field in My Fields before recording an observation."
      );
      return;
    }

    if (!form.fieldId) {
      setError("Please select a field.");
      return;
    }

    if (!form.title.trim() || !form.description.trim()) {
      setError("Please enter a title and description.");
      return;
    }

    const selectedField = fields.find(
      (field) => field.id === form.fieldId
    );

    if (!selectedField) {
      setError("Please select a valid field.");
      return;
    }

    const changes = {
      fieldId: selectedField.id,
      fieldName: selectedField.name,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      nextAction: form.nextAction.trim(),
    };

    try {
      let result;

      if (editingId) {
        if (typeof updateObservation !== "function") {
          setError(
            "Editing is not connected to the dashboard yet."
          );
          return;
        }

        result = updateObservation(editingId, changes);
      } else {
        if (typeof addObservation !== "function") {
          setError("Observation saving is unavailable.");
          return;
        }

        result = addObservation(changes);
      }

      if (result?.success === false) {
        setError(
          result.message || "Could not save the observation."
        );
        return;
      }

      resetForm();
    } catch {
      setError("Could not save the observation. Please try again.");
    }
  };

  return (
    <section className="observations-section">
      <div className="observations-header">
        <div>
          <span className="observations-eyebrow">
            FIELD RECORDS
          </span>

          <h2>Field Observations</h2>

          <p>
            Record field events, preserve evidence, and track
            verification without treating unconfirmed reports as facts.
          </p>
        </div>

        <button
          type="button"
          className="observation-add-button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setForm({ ...EMPTY_FORM });
              setEditingId(null);
              setError("");
              setShowForm(true);
            }
          }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "New observation"}
        </button>
      </div>

      <div className="observation-stats">
        <div className="observation-stat-card">
          <div className="observation-stat-icon">
            <ClipboardList size={20} />
          </div>
          <span>Total observations</span>
          <strong>{observations.length}</strong>
        </div>

        <div className="observation-stat-card">
          <div className="observation-stat-icon">
            <Clock size={20} />
          </div>
          <span>Awaiting verification</span>
          <strong>{unverifiedCount}</strong>
        </div>

        <div className="observation-stat-card">
          <div className="observation-stat-icon">
            <AlertCircle size={20} />
          </div>
          <span>Evidence gaps</span>
          <strong>{evidenceGapCount}</strong>
        </div>

        <div className="observation-stat-card">
          <div className="observation-stat-icon">
            <ShieldCheck size={20} />
          </div>
          <span>Corroborated / expert-confirmed</span>
          <strong>{verifiedCount}</strong>
        </div>
      </div>

      {showForm && (
        <form
          className="dashboard-card observation-form"
          onSubmit={handleSubmit}
        >
          <div className="observation-form-heading">
            <div>
              <h3>
                {editingId
                  ? "Edit observation"
                  : "Record an observation"}
              </h3>

              <p>
                {editingId
                  ? "Update the details while preserving existing evidence and verification."
                  : "Describe what was observed. Verification comes later."}
              </p>
            </div>
          </div>

          {error && (
            <div className="observation-form-error" role="alert">
              {error}
            </div>
          )}

          <div className="observation-form-grid">
            <div className="observation-form-field">
              <label htmlFor="observation-field">
                Select field *
              </label>

              <select
                id="observation-field"
                value={form.fieldId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    fieldId: event.target.value,
                  })
                }
                required
              >
                <option value="">Choose a field</option>

                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="observation-form-field">
              <label htmlFor="observation-category">
                Category *
              </label>

              <select
                id="observation-category"
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value,
                  })
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="observation-form-field observation-form-full">
              <label htmlFor="observation-title">
                Observation title *
              </label>

              <input
                id="observation-title"
                type="text"
                placeholder="e.g. Unusual leaf discoloration"
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                maxLength={120}
                required
              />
            </div>

            <div className="observation-form-field observation-form-full">
              <label htmlFor="observation-description">
                What did you observe? *
              </label>

              <textarea
                id="observation-description"
                placeholder="Describe what you saw, where it occurred, and any relevant details..."
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                rows={4}
                maxLength={2000}
                required
              />
            </div>

            <div className="observation-form-field observation-form-full">
              <label htmlFor="observation-next-action">
                Suggested next action
              </label>

              <input
                id="observation-next-action"
                type="text"
                placeholder="e.g. Inspect affected plants and record a fresh measurement"
                value={form.nextAction}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nextAction: event.target.value,
                  })
                }
                maxLength={300}
              />
            </div>
          </div>

          <div className="observation-form-footer">
            <p>
              {editingId
                ? "Saving changes will not automatically verify this observation."
                : "New observations are marked Unverified until supporting information is reviewed."}
            </p>

            <button
              type="submit"
              className="observation-add-button"
            >
              {editingId ? (
                <Pencil size={17} />
              ) : (
                <Plus size={17} />
              )}
              {editingId ? "Save changes" : "Save observation"}
            </button>
          </div>
        </form>
      )}

      <div className="observation-toolbar">
        <div className="observation-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search observations or fields..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search observations"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by verification status"
        >
          <option value="All">All statuses</option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>

          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="observation-list-heading">
        <div>
          <h3>Observation history</h3>
          <p>
            Showing {filteredObservations.length} of{" "}
            {observations.length}
          </p>
        </div>
      </div>

      {filteredObservations.length === 0 ? (
        <div className="dashboard-card observation-empty">
          <div className="observation-empty-icon">
            <Leaf size={28} />
          </div>

          <h3>
            {observations.length === 0
              ? "No observations recorded"
              : "No matching observations"}
          </h3>

          <p>
            {observations.length === 0
              ? "Start by recording something you noticed in one of your fields."
              : "Try changing your search or filters."}
          </p>

          {observations.length === 0 && (
            <button
              type="button"
              className="observation-add-button"
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setEditingId(null);
                setError("");
                setShowForm(true);
              }}
            >
              <Plus size={17} />
              Record your first observation
            </button>
          )}
        </div>
      ) : (
        <div className="observation-list">
          {filteredObservations.map((observation) => {
            const evidenceCount = Array.isArray(observation.evidence)
              ? observation.evidence.length
              : 0;

            const evidenceGaps = Array.isArray(
              observation.evidenceGaps
            )
              ? observation.evidenceGaps.filter(
                  (gap) => !gap.resolved
                ).length
              : Math.max(
                  0,
                  Number(observation.evidenceGaps) || 0
                );

            return (
              <article
                className="dashboard-card observation-record"
                key={observation.id}
              >
                <div className="observation-record-top">
                  <div className="observation-record-title">
                    <span className="observation-category">
                      {observation.category || "Other"}
                    </span>

                    <h3>{observation.title}</h3>
                  </div>

                  <div className="observation-record-actions">
                    <span
                      className={`observation-status ${getStatusClass(
                        observation.status
                      )}`}
                    >
                      {observation.status || "Unverified"}
                    </span>

                    <button
                      type="button"
                      className="observation-edit-button"
                      onClick={() => handleEdit(observation)}
                      aria-label={`Edit ${observation.title}`}
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  </div>
                </div>

                <p className="observation-description">
                  {observation.description}
                </p>

                <div className="observation-record-meta">
                  <span>
                    <Leaf size={15} />
                    {getFieldName(observation)}
                  </span>

                  <span>
                    <Clock size={15} />
                    {formatDate(observation.createdAt)}
                  </span>
                </div>

                
<div className="observation-evidence-row">
  <span>
    Evidence recorded: <strong>{evidenceCount}</strong>
  </span>

  <span
    className={
      evidenceGaps > 0
        ? "observation-gap-open"
        : "observation-gap-resolved"
    }
  >
    {evidenceGaps > 0
      ? `${evidenceGaps} evidence gap${evidenceGaps === 1 ? "" : "s"}`
      : "No open evidence gaps"}
  </span>
</div>

{Array.isArray(observation.evidenceGaps) &&
  observation.evidenceGaps.length > 0 && (
    <div className="observation-gap-details">
      <strong>Evidence still needed</strong>

      {observation.evidenceGaps.map((gap) => (
        <div key={gap.id} className="observation-gap-item">
          <AlertCircle size={15} />

          <span>
            {gap.question || "Additional evidence required"}
          </span>

          <button
            type="button"
            onClick={() =>
              updateEvidenceGap?.(
                observation.id,
                gap.id,
                !gap.resolved
              )
            }
            disabled={!updateEvidenceGap}
          >
            {gap.resolved ? "Reopen" : "Resolve"}
          </button>
        </div>
      ))}

      <p>
        Resolve a gap only after reviewing the relevant evidence.
      </p>
    </div>
  )}


                {observation.nextAction && (
                  <div className="observation-next-action">
                    <strong>Next action:</strong>{" "}
                    {observation.nextAction}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
