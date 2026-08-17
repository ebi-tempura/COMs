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
      create: "audit.actionCreate",
      edit: "audit.actionEdit",
      submit: "audit.actionSubmit",
      approve: "audit.actionApprove",
      reject: "audit.actionReject",
      startWork: "audit.actionStartWork",
      completeCompletion: "audit.actionSubmitCompletion",
      approveCompletion: "audit.actionApproveCompletion",
      rejectCompletion: "audit.actionRejectCompletion",
    };
  
    return auditLabels[action]
      ? t(auditLabels[action])
      : actionLabel(action);
  };
  
  const auditDateLabel = (action) => {
    const labels = {
      create: "audit.dateCreate",
      edit: "audit.dateEdit",
      submit: "audit.dateSubmit",
      approve: "audit.dateApprove",
      reject: "audit.dateReject",
      startWork: "audit.dateStartWork",
      completeCompletion: "audit.dateSubmitCompletion",
      approveCompletion: "audit.dateApproveCompletion",
      rejectCompletion: "audit.dateRejectCompletion",
    };
  
    return t(labels[action] ?? "audit.dateActivity");
  };
  if (events.length === 0) {
    return <p className="audit-empty">{t("audit.empty")}</p>;
  }

  return (
  <>
    <h3>{t("workOrderDetails.auditTrail")}</h3>

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
              event.performedBy?.role ??
              event.userRole ??
              t("common.unknownRole");

            return (
              <article
                className="audit-event"
                key={event.id ?? `${event.timestamp}-${index}`}
              >
                <div className="audit-event-dot" />
                
                <div className="audit-event-content">
                  <hr />
                  <h4>
                    {event.action
                      ? auditActionLabel(event.action)
                      : t("common.activity")}
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

                  <strong>{auditDateLabel(event.action)}: </strong>
                  <time>{formatDateTime(event.timestamp)}</time>

                  {event.comment && (
                    <p className="audit-comment">
                      <strong>{t("common.comment")}:</strong>{" "}
                      {event.comment}
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
  </>
);
}

export default WorkOrderAuditTrail;
