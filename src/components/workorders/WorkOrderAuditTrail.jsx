import { useLanguage } from "../../i18n/LanguageContext";

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

  if (events.length === 0) {
    return <p className="audit-empty">{t("audit.empty")}</p>;
  }

  return (
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
                {event.action ? actionLabel(event.action) : t("common.activity")}
              </h4>

              <p>
                {userName(actorName)} — {roleLabel(actorRole)}
              </p>

              {event.toStatus && (
                <p>
                  {event.fromStatus
                    ? statusLabel(event.fromStatus)
                    : t("common.noStatus")}
                  {" → "}
                  {statusLabel(event.toStatus)}
                </p>
              )}

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
  );
}

export default WorkOrderAuditTrail;
