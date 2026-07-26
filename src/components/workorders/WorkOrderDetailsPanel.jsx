import WorkOrderAuditTrail from "./WorkOrderAuditTrail";
import { useLanguage } from "../../i18n/LanguageContext";

function WorkOrderDetailsPanel({ workOrder, onClose }) {
  const { formatCurrency, statusLabel, t, valueLabel } = useLanguage();

  if (!workOrder) {
    return null;
  }

  return (
    <div className="details-overlay">
      <section
        className="details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-details-title"
      >
        <div className="details-panel-header">
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>

          <div>
            <h2 id="work-order-details-title">{workOrder.id}</h2>
            <p>
              <strong>{t("workOrderDetails.title")}:</strong> {workOrder.title}
            </p>
          </div>
        </div>

        <div className="work-order-details">
          <p>
            <strong>{t("workOrderDetails.status")}:</strong>{" "}
            {statusLabel(workOrder.status)}
          </p>
          <p>
            <strong>{t("workOrderDetails.supplier")}:</strong>{" "}
            {workOrder.supplier}
          </p>
          <p>
            <strong>{t("workOrderDetails.amount")}:</strong>{" "}
            {formatCurrency(workOrder.amount)}
          </p>
          <p>
            <strong>{t("workOrderDetails.priority")}:</strong>{" "}
            {valueLabel("priority", workOrder.priority)}
          </p>
          <p>
            <strong>{t("workOrderDetails.description")}:</strong>{" "}
            {workOrder.description}
          </p>
        </div>

        <hr />
        <h3>{t("workOrderDetails.auditTrail")}</h3>
        <WorkOrderAuditTrail workOrder={workOrder} />
      </section>
    </div>
  );
}

export default WorkOrderDetailsPanel;
