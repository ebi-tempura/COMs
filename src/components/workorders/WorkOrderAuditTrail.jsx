import { useLanguage } from "../../i18n/LanguageContext";
import "../../styles/format.css"


function WorkOrderAuditTrail({ workOrder }) {
  const {
    actionLabel,
    displayValue,
    fieldLabel,
    formatDateTime,
    roleLabel,
    statusLabel,
    t,
    userName,
  } = useLanguage();

  const events = workOrder?.auditTrail ?? workOrder?.approvalHistory ?? [];

  const auditActionLabel = (action) => {
    const auditLabels = {
      submit: "Work Order Submitted by",
      approve: "Work Order Approved by",
      reject: "Work Order Rejected by",
      startWork: "Work Order Started by"
    };
  
    return auditLabels[action] ?? actionLabel(action);
  };

  if (events.length === 0) {
    return <p className="audit-empty">{t("audit.empty")}</p>;
  }

  return (
    <details className="auidt-expander" open>
       <summary className="audit-expander-summary">
        {t("workOrderDetails.auditTrail")} 
        <span>
        </span>
      </summary>
      <div className="audit-expander-content">
        {events.length === 0 ? (
          <p className="audit-empty">{t("audit.empty")}</p>
        ) : (

    <div className="audit-timeline">
      {events.map((event, index) => {
        const actorName =
          event.performedBy?.userName ??
          event.userName ??
          t("common.unknownUser");
        const actorRole =
          event.performedBy?.role ?? event.userRole ?? t("common.unknownRole");

        return (
          <article
            className="audit-event"
            key={event.id ?? `${event.timestamp}-${index}`}
          >
            <div className="audit-event-dot" />

            <div className="audit-event-content">
              <h4>
                {event.action ? auditActionLabel(event.action)
                : t("common.activity")
                }
              </h4>

              <p>
                <strong>{t("User: ")} </strong>
                {userName(actorName)}
              </p>

              <p>
                <strong>{t("Role: ")} </strong>
                {roleLabel(actorRole)}
              </p>

              {event.toStatus && (
                
                <p>
                  <strong>{t("Process: ")} </strong>
                  {event.fromStatus
                    ? statusLabel(event.fromStatus)
                    : t("common.noStatus")}
                  {" → "}
                  {statusLabel(event.toStatus)}
                </p>
              )}

              <strong>
                {event.action == "submit"
                 ? "Date and time of submission: "
                 : "Date and time of approval: "
                }
              </strong>
           
               
              <time>{formatDateTime(event.timestamp)}</time>

              {event.comment && (
                <p className="audit-comment">
                  <strong>{t("common.comment")}:</strong> {event.comment}
                </p>
              )}

              {event.changes?.length > 0 && (
                <details>
                  <summary>{t("common.viewRecordedValues")}</summary>
                  <ul>
                    {event.changes.map((change, changeIndex) => (
                      <li key={`${change.field}-${changeIndex}`}>
                        <strong>{fieldLabel(change.field)}:</strong>{" "}
                        {displayValue(change.oldValue)}
                        {" → "}
                        {displayValue(change.newValue)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </article>
        );
      })}
      </div>
      )}
    </div>
    </details>
  );
}

export default WorkOrderAuditTrail;
