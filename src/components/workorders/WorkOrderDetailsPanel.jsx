import WorkOrderCompletionReportForm from "./WorkOrderCompletionReportForm";
import CompletionReportHistory from "./CompletionReportHistory";
import WorkOrderAuditTrail from "./WorkOrderAuditTrail";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";


function WorkOrderDetailsPanel({ workOrder, onClose }) {
  const { formatCurrency, statusLabel, t, valueLabel } = useLanguage();
  const [activeSection, setActiveSection] = useState(null);


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
            Completion Report
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveSection((currrentSection) => 
              currrentSection === "auditTrail" ? null : "auditTrail"
              )
            }
          >
            Audit Trail
          </button>
        </div>

        {activeSection === "auditTrail" && (
        <div className="work-order-details-section">
          <WorkOrderAuditTrail workOrder={workOrder} />
        </div>
         )}

         {activeSection === "completionReport" && (
        <div className="work-order-details-section">
          <WorkOrderCompletionReport workOrder={workOrder} />
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
