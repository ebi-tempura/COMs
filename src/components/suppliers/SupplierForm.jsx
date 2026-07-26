import { useState } from "react";
import Button from "../common/Button";
import { useLanguage } from "../../i18n/LanguageContext";

const initialForm = {
  supplierType: "Company",
  name: "",
  serviceCategory: "Plumbing",
  contactPerson: "",
  phone: "",
  email: "",
  rfc: "",
  address: "",
  clabe: "",
  status: "Active",
  paymentMethod: "Bank transfer",
  notes: "",
};

const supplierTypes = ["Company", "Individual"];
const serviceCategories = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Security",
  "Elevator",
  "General Maintenance",
];
const paymentMethods = ["Bank transfer", "Cash", "Card", "Other"];

function SupplierForm({ onCreateSupplier }) {
  const { t, valueLabel } = useLanguage();
  const [formData, setFormData] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const currentYear = new Date().getFullYear();

    onCreateSupplier({
      id: `SUP-${currentYear}-${String(Date.now()).slice(-4)}`,
      ...formData,
    });

    setFormData({ ...initialForm, status: "Pending" });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t("supplierForm.supplierType")}</label>
        <select
          name="supplierType"
          value={formData.supplierType}
          onChange={handleChange}
        >
          {supplierTypes.map((type) => (
            <option key={type} value={type}>
              {valueLabel("supplierType", type)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("supplierForm.name")}</label>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.serviceCategory")}</label>
        <select
          name="serviceCategory"
          value={formData.serviceCategory}
          onChange={handleChange}
        >
          {serviceCategories.map((category) => (
            <option key={category} value={category}>
              {valueLabel("category", category)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("supplierForm.contactPerson")}</label>
        <input
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.phone")}</label>
        <input name="phone" value={formData.phone} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.email")}</label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.rfc")}</label>
        <input name="rfc" value={formData.rfc} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.address")}</label>
        <input name="address" value={formData.address} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.clabe")}</label>
        <input name="clabe" value={formData.clabe} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>{t("supplierForm.paymentMethod")}</label>
        <select
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
        >
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {valueLabel("paymentMethod", method)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("supplierForm.notes")}</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} />
      </div>

      <div className="attachment-box form-wide">
        <strong>{t("supplierForm.attachments")}</strong>
        <p>{t("supplierForm.dropFiles")}</p>
        <button type="button">{t("supplierForm.browseFiles")}</button>
        <small>{t("supplierForm.fileHelp")}</small>
      </div>

      <div className="form-actions">
        <Button type="submit">{t("supplierForm.add")}</Button>
      </div>
    </form>
  );
}

export default SupplierForm;
