import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";
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
    ? "Work order details"
    : isAudit
      ? "Audit trail"
      : isEmergency
        ? "Emergency information"
        : "Completion reports";

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
      setError("Your role cannot view the audit trail.");
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
          throw new Error("The backend returned an invalid report list.");
        }
        if (active) setRecords(result);
      } catch (err) {
        if (active) setError(err.message || "Unable to load records.");
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
      !window.confirm("Discard the information entered in this form?")
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
      setMessage("Please complete every field; spaces alone are not valid.");
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
      setMessage(`Saved successfully: ${saved.status}.`);
      onChanged();
    } catch (err) {
      // Preserve the form so the user can correct it or retry.
      setMessage(err.message || "Unable to submit the report.");
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
      setMessage(`${saved.completion_number}: ${saved.status}`);
      onChanged();
    } catch (err) {
      setMessage(err.message || "Unable to review the report.");
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
          Close
        </button>
      </div>

      <div className="wo-modal-body">
        <p><strong>Work order status:</strong> {workOrder.status}</p>
        {isDetails && (
          <div className="wo-saved-report">
            <dl>
              <dt>Description</dt>
              <dd>{workOrder.description || "—"}</dd>

              <dt>Supplier</dt>
              <dd>{workOrder.supplier || "—"}</dd>

              <dt>Amount</dt>
              <dd>
                {workOrder.amount == null
                  ? "—"
                  : Number(workOrder.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </dd>

              <dt>Type</dt>
              <dd>{workOrder.type || "—"}</dd>

              <dt>Category</dt>
              <dd>{workOrder.category || "—"}</dd>

              <dt>Priority</dt>
              <dd>{workOrder.priority || "—"}</dd>

              <dt>Location</dt>
              <dd>{workOrder.location || "—"}</dd>

              <dt>Target date</dt>
              <dd>{workOrder.targetDate || "—"}</dd>

              <dt>Created by</dt>
              <dd>{workOrder.requestedBy || "—"}</dd>

              <dt>Created on</dt>
              <dd>{displayDate(workOrder.createdAt)}</dd>
            </dl>
          </div>
        )}

        {loading && <p role="status">Loading…</p>}
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
                Retry
              </button>
            )}
          </div>
        )}

        {canSubmit && (
          <form onSubmit={submitReport} onChange={() => { dirty.current = true; }}>
            <fieldset disabled={busy} className="wo-report-fields">
              <legend>
                {isEmergency ? "Submit emergency information" : "Submit completion"}
              </legend>

              {fields.map(([name, label, type]) => (
                <label key={name} htmlFor={`wo-${name}`}>
                  {label}
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
                {busy ? "Saving…" : "Submit report"}
              </button>
            </fieldset>
          </form>
        )}

        {!loading && !error && !isAudit && (
          <>
            {!isEmergency && canOperate && !canSubmit && (
              <p>
                {hasPendingOrApprovedReport
                  ? "A completion report is pending approval or already approved."
                  : "Completion submission requires an Authorized Work Order."}
              </p>
            )}

            <h3>Saved reports</h3>
            {records.length === 0 && <p>No reports submitted yet.</p>}

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
                  <p><strong>Status:</strong> {record.status}</p>
                  <p>
                    Submitted {displayDate(record.created_at)}
                    {" · "}User #{record.created_by_user_id}
                  </p>

                  <dl>
                    {fields.map(([name, label]) => (
                      <div key={name}>
                        <dt>{label}</dt>
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
                        Approve completion
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => reviewReport(record, "reject")}
                      >
                        Reject completion
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
            {records.length === 0 && <p>No audit records found.</p>}
            {records.map((record) => (
              <article className="wo-saved-report" key={record.database_id}>
                <h3>{record.action}</h3>
                <p>
                  {record.user_name} · {record.user_role}
                  {" · "}{displayDate(record.created_at)}
                </p>
                <p><strong>Reference:</strong> {record.record_id}</p>
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