import { useLanguage } from "../../i18n/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, apiDownload } from "../../lib/api";
import { ROLES } from "../../security/constants";
import "../../styles/WorkOrderModal.css"

const BASE = "/api/work_order_comp_eme/api/work-orders";
const AUDIT_BASE = "/api/audit/api/work-orders";

const OPERATORS = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];
const AUDIT_ROLES = [
  ROLES.ADMIN,
  ROLES.PRESIDENT,
  ROLES.TREASURER,
  ROLES.BOARD_MEMBER,
];

const REVIEW_STEPS = {
  "Pending President Approval": {
    role: ROLES.PRESIDENT,
    endpoint: "president",
  },
  "Pending Treasurer Approval": {
    role: ROLES.TREASURER,
    endpoint: "treasurer",
  },
  "Pending Board Member Approval": {
    role: ROLES.BOARD_MEMBER,
    endpoint: "board-member",
  },
};

const EMERGENCY_FIELDS = [
  ["wo_emergency_what", "What happened?", "text"],
  ["wo_emergency_where", "Where did it happen?", "text"],
  ["wo_emergency_when", "When did it happen?", "date"],
  ["wo_emergency_who", "Who was involved?", "text"],
  ["wo_emergency_why", "Why is this an emergency?", "text"],
  ["wo_emergency_howmany", "How many were affected?", "text"],
  ["wo_emergency_howmuch", "Estimated cost", "text"], 
];

const COMPLETION_FIELDS = [
  ["work_performed_date", "Work performed date", "date"],
  ["work_performed_description", "Work performed", "text"],
  ["work_performed_observation", "Observations", "text"],
];

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function WorkOrderModal({
  mode,
  workOrder,
  currentUser,
  onClose,
  onChanged,
}) {
  const { ui, statusLabel } = useLanguage();
  const dialogRef = useRef(null);
  const lock = useRef(false);
  const dirty = useRef(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [emergencySubmitted, setEmergencySubmitted] = useState(false);

  const number = workOrder.id;
  const encodedNumber = encodeURIComponent(number);
  const isEmergency = mode === "emergency";
  const isAudit = mode === "audit";
  const isDetails = mode === "details";
  const fields = isEmergency ? EMERGENCY_FIELDS : COMPLETION_FIELDS;
  const canOperate = OPERATORS.includes(currentUser.role);
  const canRead = !isAudit || AUDIT_ROLES.includes(currentUser.role);
  const resource = isEmergency ? "WO-emergency" : "WO-completion";
  const url = isAudit
    ? `${AUDIT_BASE}/${encodedNumber}/audit-logs`
    : `${BASE}/${encodedNumber}/${resource}`;

  const title = isDetails
    ? ui("Work order details")
    : isAudit
      ? ui("Audit trail")
      : isEmergency
        ? ui("Emergency information")
        : ui("Completion reports");

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();

    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (isDetails) {
      setLoading(false);
      return;
    }
    
    if (!canRead) {
      setLoading(false);
      setError(ui("Your role cannot view the audit trail."));
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    async function load() {
      try {
        const result = await api(url, { signal: controller.signal });
        if (!Array.isArray(result)) {
          throw new Error(ui("The backend returned an invalid report list."));
        }
        if (active) setRecords(result);
      } catch (err) {
        if (active) setError(err.message || ui("Unable to load records."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, canRead, reload]);

  function requestClose() {
    if (lock.current) return;
    if (
      dirty.current &&
      !window.confirm(ui("Discard the information entered in this form?"))
    ) {
      return;
    }
    onClose();
  }

  const hasPendingOrApprovedReport = records.some(
    (record) => REVIEW_STEPS[record.status] || record.status === "Approved"
  );

  const canSubmit =
    !isDetails &&
    !isAudit &&
    canOperate &&
    !loading &&
    !error &&
    !isAudit &&
    (isEmergency
      ? workOrder.type === "Emergency" &&
        workOrder.status === "Needs Emergency Information" &&
        !emergencySubmitted
      : workOrder.status === "Authorized Work Order" &&
        !hasPendingOrApprovedReport);

  async function submitReport(event) {
    event.preventDefault();
    if (lock.current || !canSubmit) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(
      fields.map(([name]) => [name, String(data.get(name) || "").trim()])
    );

    if (Object.values(payload).some((value) => !value)) {
      setMessage(ui("Please complete every field; spaces alone are not valid."));
      return;
    }

    lock.current = true;
    setBusy(true);
    setMessage("");

    try {
      const saved = await api(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setRecords((current) => [...current, saved]);
      if (isEmergency) setEmergencySubmitted(true);
      dirty.current = false;
      form.reset();
      setMessage(ui("Saved successfully: {status}.", { status: statusLabel(saved.status) }));
      onChanged();
    } catch (err) {
      // Preserve the form so the user can correct it or retry.
      setMessage(err.message || ui("Unable to submit the report."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function reviewReport(record, decision) {
    const step = REVIEW_STEPS[record.status];
    if (
      lock.current ||
      !step ||
      step.role !== currentUser.role ||
      record.created_by_user_id === currentUser.id
    ) {
      return;
    }

    if (
      decision === "reject" &&
      !window.confirm(`Reject completion report ${record.completion_number}?`)
    ) {
      return;
    }
    
    const options = { method: "POST" };

    if (decision === "reject") {
      const reason = window.prompt(
        ui("Why are you rejecting completion {number}?", { number: record.completion_number })
      );

      if (reason === null) return;

      const comment = reason.trim();

      if (!comment) {
        setMessage(ui("Enter a reason to reject the completion report."));
        return;
      }

      options.body = JSON.stringify({ comment });
    }

    lock.current = true;
    setBusy(true);
    setMessage("");

    try {
      const saved = await api(
        `${BASE}/${encodedNumber}/WO-completion/` +
          `${encodeURIComponent(record.completion_number)}/` +
          `${decision}-${step.endpoint}`,
        { method: "POST" }
      );

      setRecords((current) =>
        current.map((item) =>
          item.completion_number === saved.completion_number ? saved : item
        )
      );
      setMessage(`${saved.completion_number}: ${statusLabel(saved.status)}`);
      onChanged();
    } catch (err) {
      setMessage(err.message || ui("Unable to review the report."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="wo-modal"
      aria-labelledby="wo-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="wo-modal-header">
        <div>
          <h2 id="wo-modal-title">{title}</h2>
          <p>{number} · {workOrder.title}</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={requestClose}
        >
          {ui("Close")}
        </button>
      </div>

      <div className="wo-modal-body">
        <p><strong>{ui("Work order status:")}</strong> {statusLabel(workOrder.status)}</p>
        {isDetails && (
          <div className="wo-saved-report">
            <dl>
              <dt>{ui("Description")}</dt>
              <dd>{workOrder.description || "—"}</dd>

              <dt>{ui("Supplier")}</dt>
              <dd>{workOrder.supplier || "—"}</dd>

              <dt>{ui("Amount")}</dt>
              <dd>
                {workOrder.amount == null
                  ? "—"
                  : Number(workOrder.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </dd>

              <dt>{ui("Type")}</dt>
              <dd>{workOrder.type || "—"}</dd>

              <dt>{ui("Category")}</dt>
              <dd>{workOrder.category || "—"}</dd>

              <dt>{ui("Priority")}</dt>
              <dd>{workOrder.priority || "—"}</dd>

              <dt>{ui("Location")}</dt>
              <dd>{workOrder.location || "—"}</dd>

              <dt>{ui("Target date")}</dt>
              <dd>{workOrder.targetDate || "—"}</dd>

              <dt>{ui("Created by")}</dt>
              <dd>{workOrder.requestedBy || "—"}</dd>

              <dt>{ui("Created on")}</dt>
              <dd>{displayDate(workOrder.createdAt)}</dd>
            </dl>

             <WorkOrderAttachments
              workOrderNumber={workOrder.id}
              canOperate={canOperate}
              />
          </div>
        )}

        {loading && <p role="status">{ui("Loading…")}</p>}
        {message && <p role="status">{message}</p>}

        {error && (
          <div role="alert">
            <p>{error}</p>
            {canRead && (
              <button
                type="button"
                className="secondary-button"
                disabled={loading || busy}
                onClick={() => setReload((value) => value + 1)}
              >
                {ui("Retry")}
              </button>
            )}
          </div>
        )}

        {canSubmit && (
          <form onSubmit={submitReport} onChange={() => { dirty.current = true; }}>
            <fieldset disabled={busy} className="wo-report-fields">
              <legend>
                {isEmergency ? ui("Submit emergency information") : ui("Submit completion")}
              </legend>

              {fields.map(([name, label, type]) => (
                <label key={name} htmlFor={`wo-${name}`}>
                  {ui(label)}
                  {type === "date" ? (
                    <input
                      id={`wo-${name}`}
                      name={name}
                      type="date"
                      required
                    />
                  ) : (
                    <textarea
                      id={`wo-${name}`}
                      name={name}
                      rows={3}
                      maxLength={500}
                      required
                    />
                  )}
                </label>
              ))}

              <button type="submit" className="primary-action-button">
                {busy ? ui("Saving…") : ui("Submit report")}
              </button>
            </fieldset>
          </form>
        )}

        {!loading && !error && !isAudit && (
          <>
            {!isEmergency && canOperate && !canSubmit && (
              <p>
                {hasPendingOrApprovedReport
                  ? ui("A completion report is pending approval or already approved.")
                  : ui("Completion submission requires an Authorized Work Order.")}
              </p>
            )}

            <h3>{ui("Saved reports")}</h3>
            {records.length === 0 && <p>{ui("No reports submitted yet.")}</p>}

            {[...records].reverse().map((record) => {
              const reference = isEmergency
                ? record.emergency_number
                : record.completion_number;
              const step = REVIEW_STEPS[record.status];
              const canReview =
                !isEmergency &&
                step?.role === currentUser.role &&
                record.created_by_user_id !== currentUser.id;

              return (
                <article className="wo-saved-report" key={record.database_id}>
                  <h4>{reference}</h4>
                  <p><strong>{ui("Status:")}</strong> {statusLabel(record.status)}</p>
                  <p>
                    {ui("Submitted")} {displayDate(record.created_at)}
                    {" · "}{ui("User #")}{record.created_by_user_id}
                  </p>

                  <dl>
                    {fields.map(([name, label]) => (
                      <div key={name}>
                        <dt>{ui(label)}</dt>
                        <dd>{record[name] || "—"}</dd>
                      </div>
                    ))}
                  </dl>

                  {canReview && (
                    <div className="wo-modal-actions">
                      <button
                        type="button"
                        className="primary-action-button"
                        disabled={busy}
                        onClick={() => reviewReport(record, "approve")}
                      >
                        {ui("Approve completion")}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => reviewReport(record, "reject")}
                      >
                        {ui("Reject completion")}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </>
        )}

        {!loading && !error && isAudit && !isDetails && (
          <>
            {records.length === 0 && <p>{ui("No audit records found.")}</p>}
            {records.map((record) => (
              <article className="wo-saved-report" key={record.database_id}>
                <h3>{record.action}</h3>
                <p>
                  {record.user_name} · {record.user_role}
                  {" · "}{displayDate(record.created_at)}
                </p>
                <p><strong>{ui("Reference:")}</strong> {record.record_id}</p>
                <p className="wo-preserve-text">{record.details}</p>
              </article>
            ))}
          </>
        )}
      </div>
    </dialog>,
    document.body
  );
}

function WorkOrderAttachments({ workOrderNumber, canOperate }) {
  const { ui } = useLanguage();
  const url =
    `/api/attachments/api/work-orders/${encodeURIComponent(workOrderNumber)}/attachments`;

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api(url, { signal: controller.signal })
      .then((records) => {
        if (!controller.signal.aborted) setAttachments(records);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  async function perform(action) {
    setBusy(true);
    setError("");

    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function uploadFiles(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files);
    input.value = "";

    if (!files.length) return;

    const body = new FormData();
    for (const file of files) {
      body.append("files", file);
    }

    perform(async () => {
      const batch = await api(url, { method: "POST", body });
      const failures = batch.results
        .filter((result) => result.status_code !== 201)
        .map((result) => `${result.original_filename}: ${result.error}`);

      if (failures.length) {
        setError(`${batch.uploaded_count} uploaded. ${failures.join(" · ")}`);
      }

      setAttachments(await api(url));
    });
  }

  return (
    <section>
      <h3>{ui("Attachments")}</h3>

      {canOperate && (
        <label>
          {ui("Add files")}
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={busy || loading}
            onChange={uploadFiles}
          />
        </label>
      )}

      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">{ui("Loading attachments…")}</p>}
      {!loading && !error && attachments.length === 0 && (
        <p>{ui("No attachments yet.")}</p>
      )}

      <ul>
        {attachments.map((attachment) => {
          const fileUrl =
            `${url}/${encodeURIComponent(attachment.attachment_number)}`;

          return (
            <li key={attachment.attachment_number}>
              {attachment.original_filename}{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  perform(() =>
                    apiDownload(`${fileUrl}/download`, attachment.original_filename)
                  )
                }
              >
                {ui("Download")}
              </button>{" "}
              {canOperate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(ui("Delete {filename}?", { filename: attachment.original_filename }))) {
                      return;
                    } 
                    perform(async () => {
                      await api(fileUrl, { method: "DELETE" });
                      setAttachments(await api(url));
                    });
                  }}
                >
                  {ui("Delete")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}