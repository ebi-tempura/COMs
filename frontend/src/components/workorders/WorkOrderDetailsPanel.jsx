import WorkOrderAuditTrail from "./WorkOrderAuditTrail";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";


function WorkOrderDetailsPanel({ workOrder, onClose }) {
  const { formatCurrency, statusLabel, t, valueLabel } = useLanguage();
  const [activeSection, setActiveSection] = useState(null);

  if (!workOrder) {
    return null;
  }

  const latestReportVersion = workOrder.completionReportVersions?.at(-1);
  const completionReport =
    workOrder.completionReport ?? latestReportVersion?.report ?? null;

  return (
    <div className="details-overlay">
      <section
        className="details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-details-title"
      >
        <div className="details-panel-header">

          <div>
            <h3 id="work-order-details-title">{workOrder.id}</h3>
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
        <hr/>
        <p></p>

      <div className="Work-Order-details-actions">
        <div className="button-group">
          <button
            type="button" 
            onClick={() =>
              setActiveSection((currentSection) =>
                currentSection === "completionReport"
                  ? null
                  : "completionReport"
              )
            }
          >
            {t("workOrderDetails.completionReport")}
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveSection((currrentSection) => 
              currrentSection === "auditTrail" ? null : "auditTrail"
              )
            }
          >
            {t("workOrderDetails.auditTrail")}
          </button>
        </div>

        {activeSection === "auditTrail" && (
        <div className="work-order-details-section">
          <WorkOrderAuditTrail workOrder={workOrder} />
        </div>
         )}

         {activeSection === "completionReport" && (
        <div className="work-order-details-section">

          {!completionReport ? (
            <p>{t("workOrderDetails.noCompletionReport")}</p>
          ) : (
            <div className="work-order-completion-report">
              <h3>{t("workOrderDetails.completionReport")}</h3>
              <hr />
              <p>
                <strong>{t("workOrderDetails.completionDate")}:</strong>{" "}
                {completionReport.completionDate || t("common.none")}
              </p>
              <p>
                <strong>{t("workOrderDetails.workPerformed")}:</strong>{" "}
                {completionReport.workPerformed || t("common.none")}
              </p>
              <p>
                <strong>{t("workOrderDetails.observations")}:</strong>{" "}
                {completionReport.observations || t("common.none")}
              </p>
            </div>
          )}
        </div>
        )}


      </div>
        <p></p>
        <button type="button" className="primary-action-button" onClick={onClose}>
          {t("common.close")}
        </button>
        
      </section>
    </div>
  );
}

export default WorkOrderDetailsPanel;
