import { useState } from "react";
import Button from "../common/Button";
import { WORK_ORDER_STATUS, WORK_ORDER_COMPLETION_REPORT_STATUS } from "../../security/constants";
import { useLanguage } from "../../i18n/LanguageContext";

const initialForm = {
  title: "",
  supplier: "",
  amount: "",
  priority: "",
  type: "",
  category: "",
  location: "",
  requestedBy: "",
  targetDate: "",
  description: "",
};

const suppliers = [
  "Electro Services SA",
  "Aqua Solutions",
  "BuildWell Co.",
  "Lift Experts",
  "GreenCare",
];
const priorities = ["Low", "Medium", "High"];
const workOrderTypes = ["Emergency", "Normal"];
const categories = [
  "Electrical",
  "Plumbing",
  "Maintenance",
  "Safety",
  "Landscaping",
];
const requesters = ["Admin User", "Resident #203", "Resident #105"];

function WorkOrderForm({ onCreateWorkOrder, workOrders,onCancel }) {
  const { t, userName, valueLabel } = useLanguage();
  const [formData, setFormData] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newWorkOrder = {
      id: `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(4, "0")}`,
      title: formData.title,
      category: formData.category,
      supplier: formData.supplier,
      requestedBy: formData.requestedBy,
      amount: Number(formData.amount),
      status: WORK_ORDER_STATUS.DRAFT,
      completitionReportStatus: WORK_ORDER_COMPLETION_REPORT_STATUS.NOT_STARTED,
      completionReportVersions: [],
      completionReport:null,
      priority: formData.priority,
      type: formData.type,
      targetDate: formData.targetDate,
      location: formData.location,
      description: formData.description,
    };

    onCreateWorkOrder(newWorkOrder);
    setFormData(initialForm);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t("workOrderForm.title")}</label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder={t("workOrderForm.titlePlaceholder")}
          required
        />
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.supplier")}</label>
        <select
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          required
        >
          <option value="">{t("workOrderForm.selectSupplier")}</option>
          {suppliers.map((supplier) => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.amount")}</label>
        <input
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          placeholder="$ 0.00"
          required
        />
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.priority")}</label>
        <select name="priority" value={formData.priority} onChange={handleChange}>
          <option value="">{t("workOrderForm.selectPriority")}</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {valueLabel("priority", priority)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.type")}</label>
        <select name="type" value={formData.type} onChange={handleChange} required>
          <option value="">{t("workOrderForm.selectType")}</option>
          {workOrderTypes.map((type) => (
            <option key={type} value={type}>
              {valueLabel("workOrderType", type)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.category")}</label>
        <select
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
        <label>{t("workOrderForm.location")}</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder={t("workOrderForm.locationPlaceholder")}
          required
        />
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.requestedBy")}</label>
        <select
          name="requestedBy"
          value={formData.requestedBy}
          onChange={handleChange}
          required
        >
          <option value="">{t("workOrderForm.selectRequester")}</option>
          {requesters.map((requester) => (
            <option key={requester} value={requester}>
              {userName(requester)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{t("workOrderForm.targetDate")}</label>
        <input
          name="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group form-wide">
        <label>{t("workOrderForm.description")}</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={t("workOrderForm.descriptionPlaceholder")}
          required
        />
      </div>

      <div className="attachment-box form-wide">
        <strong>{t("workOrderForm.attachments")}</strong>
        <p>{t("workOrderForm.dropFiles")}</p>
        <button type="button">{t("workOrderForm.browseFiles")}</button>
        <small>{t("workOrderForm.fileHelp")}</small>
      </div>

      <div className="form-actions form-wide">
        <Button type="submit" className="primary-action-button">
          {t("workOrderForm.create")}
        </Button>
      </div>
    </form>
  );
}

export default WorkOrderForm;
