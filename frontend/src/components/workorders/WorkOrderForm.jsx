import { useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const initialForm = {
  title: "",
  supplier_id: "",
  amount: "",
  priority: "Medium",
  type: "Normal",
  category: "",
  location: "",
  target_date: "",
  description: "",
};

const categories = [
  "Electrical",
  "Plumbing",
  "Maintenance",
  "Safety",
  "Landscaping",
];

export default function WorkOrderForm({
  suppliers = [],
  currentUser,
  disabled = false,
  onCreateWorkOrder,
  onCancel,
}) {
  const { t, valueLabel } = useLanguage();
  const [formData, setFormData] = useState({ ...initialForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (lock.current || disabled) return;

    setError("");

    const payload = {
      ...formData,
      title: formData.title.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
    };

    if (!payload.title || !payload.location || !payload.description) {
      setError("Enter a title, location, and description.");
      return;
    }

    if (
      !Number.isFinite(Number(payload.amount)) ||
      Number(payload.amount) <= 0
    ) {
      setError("The amount must be greater than zero.");
      return;
    }

    lock.current = true;
    setSaving(true);

    try {
      const saved = await onCreateWorkOrder(payload);
      if (saved) setFormData({ ...initialForm });
    } catch (err) {
      setError(err.message || "Unable to save work order.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>
      )}

      <fieldset
        disabled={disabled || saving}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="wo-title">{t("workOrderForm.title")}</label>
            <input
              id="wo-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wo-supplier">{t("workOrderForm.supplier")}</label>
            <select
              id="wo-supplier"
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              required
            >
              <option value="">{t("workOrderForm.selectSupplier")}</option>
              {suppliers.map((supplier) => (
                <option
                  key={supplier.database_id}
                  value={supplier.supplier_id}
                >
                  {supplier.supplier_name} — {supplier.supplier_id}
                </option>
              ))}
            </select>

            {!disabled && suppliers.length === 0 && (
              <small>Create a supplier before creating a work order.</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="wo-amount">{t("workOrderForm.amount")}</label>
            <input
              id="wo-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wo-priority">{t("workOrderForm.priority")}</label>
            <select
              id="wo-priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              {["Low", "Medium", "High"].map((priority) => (
                <option key={priority} value={priority}>
                  {valueLabel("priority", priority)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wo-type">{t("workOrderForm.type")}</label>
            <select
              id="wo-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {["Normal", "Emergency"].map((type) => (
                <option key={type} value={type}>
                  {valueLabel("workOrderType", type)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wo-category">{t("workOrderForm.category")}</label>
            <select
              id="wo-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">{t("workOrderForm.selectCategory")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {valueLabel("category", category)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wo-location">{t("workOrderForm.location")}</label>
            <input
              id="wo-location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wo-requester">
              {t("workOrderForm.requestedBy")}
            </label>
            <input
              id="wo-requester"
              value={currentUser?.name || ""}
              readOnly
            />
          </div>

          <div className="form-group">
            <label htmlFor="wo-date">{t("workOrderForm.targetDate")}</label>
            <input
              id="wo-date"
              name="target_date"
              type="date"
              value={formData.target_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group form-wide">
            <label htmlFor="wo-description">
              {t("workOrderForm.description")}
            </label>
            <textarea
              id="wo-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={2000}
              rows={4}
              required
            />
          </div>

          <div className="form-actions form-wide">
            <button
              type="submit"
              className="primary-action-button"
              disabled={suppliers.length === 0}
            >
              {saving ? "Saving…" : t("workOrderForm.create")}
            </button>

            {onCancel && (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancel}
              >
                Close form
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}