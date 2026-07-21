function formatAction(action) {
    if (!action) {
        return "Activity";
    }

    return String(action)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return "Unknown time";
    }

    return new Intl.DateTimeFormat("en-MX", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp));
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") {
        return "None";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

function WorkOrderAuditTrail({ workOrder }) {
    const events =
        workOrder?.auditTrail ??
        workOrder?.approvalHistory ??
        [];

    if (events.length === 0) {
        return (
            <p className="audit-empty">
                No audit events have been recorded.
            </p>
        );
    }

    return (
        <div className="audit-timeline">
            {events.map((event, index) => {
                const actorName =
                    event.performedBy?.userName ??
                    event.userName ??
                    "Unknown user";

                const actorRole =
                    event.performedBy?.role ??
                    event.userRole ??
                    "Unknown role";

                return (
                    <article
                        className="audit-event"
                        key={event.id ?? `${event.timestamp}-${index}`}
                    >
                        <div className="audit-event-dot" />

                        <div className="audit-event-content">
                            <h4>{formatAction(event.action)}</h4>

                            <p>
                                {actorName} — {actorRole}
                            </p>

                            {event.toStatus && (
                                <p>
                                    {event.fromStatus ?? "No status"}
                                    {" → "}
                                    {event.toStatus}
                                </p>
                            )}

                            <time>
                                {formatTimestamp(event.timestamp)}
                            </time>

                            {event.comment && (
                                <p className="audit-comment">
                                    <strong>Comment:</strong>{" "}
                                    {event.comment}
                                </p>
                            )}

                            {event.changes?.length > 0 && (
                                <details>
                                    <summary>
                                        View recorded values
                                    </summary>

                                    <ul>
                                        {event.changes.map(
                                            (change, changeIndex) => (
                                                <li
                                                    key={`${change.field}-${changeIndex}`}
                                                >
                                                    <strong>
                                                        {change.field}:
                                                    </strong>{" "}
                                                    {formatValue(
                                                        change.oldValue
                                                    )}
                                                    {" → "}
                                                    {formatValue(
                                                        change.newValue
                                                    )}
                                                </li>
                                            )
                                        )}
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