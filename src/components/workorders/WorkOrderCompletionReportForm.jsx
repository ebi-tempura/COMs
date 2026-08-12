import { useState } from "react";
import Button from "../common/Button";
import { useLanguage } from "../../i18n/LanguageContext";

const initialForm = {
  completionDate: "",
  workPerformed: "",
  observations: "",
  /*finalAmount: "",*/
};

function WorkOrderCompletionReportForm({
  workOrder,
  initialReport,
  onSubmitReport,
  onCancel,
}) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(()=> ({
    ...initialForm,
    ...(initialReport ?? {}),
  }));

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const completionReport = {
      completionDate: formData.completionDate,
      workPerformed: formData.workPerformed,
      observations: formData.observations,
    };

    onSubmitReport(completionReport);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-group form-wide">
        <h2>{t("Completion Report")}</h2>
        <p>
          {t("Work Order:")} <strong>{workOrder.id}</strong> 
        </p>
        <p>{t("Work Order Title:")} <strong>{workOrder.title}</strong>
        </p>

      </div>

      {/*<div className="form-group">
        <label>Final amount*</label>
        <input
          name="finalAmount"
          type="number"
          min="0"
          step="0.01"
          value={formData.finalAmount}
          onChange={handleChange}
          placeholder="$ 0.00"
          required
        />
      </div>*/}

      <div className="form-group form-wide">
        <label>{t("Work performed description*")}</label>
        <textarea
          name="workPerformed"
          value={formData.workPerformed}
          onChange={handleChange}
          placeholder="Describe the work that was completed"
          required
        />
      </div>

      <div className="form-group">
        <label>{t("Completion date*")}</label>
        <input
          name="completionDate"
          type="date"
          value={formData.completionDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group form-wide">
        <label>{t("Observations*")}</label>
        <textarea
          name="observations"
          value={formData.observations}
          onChange={handleChange}
          placeholder="Add any relevant observations"
        />
      </div>

      <div className="attachment-box form-wide">
        <strong>{t("Evidence and attachments*")}</strong>
        <p>{t("Photos, invoices, receipts, or other evidence")}</p>
        <button type="button">Browse files</button>
        <small>File uploading will be connected later.</small>
      </div>

      <div className="form-actions form-wide">
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        
        <Button type="button" onClick={onCancel}>
          Save
        </Button>

        <Button type="submit" className="primary-action-button">
          Submit report
        </Button>
      </div>
    </form>
  );
}
    
export default WorkOrderCompletionReportForm;