import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";
import "../../styles/WorkOrderProgress.css";

const BASE = "/api/work_order_comp_eme/api/work-orders";

function getProgress(workOrder, records) {
  const emergency = workOrder.type === "Emergency";

  const steps = emergency
    ? [
        "Draft created",
        "Work order submitted",
        "Emergency information submitted",
        "Completion submitted",
        "President approved completion",
        "Treasurer approved completion",
        "Completed",
      ]
    : [
        "Draft created",
        "Work order submitted",
        "President approved",
        "Treasurer approved / Work authorized",
        "Completion submitted",
        "President approved completion",
        "Treasurer approved completion",
        "Completed",
      ];

  const completionStart = emergency ? 3 : 4;
  const status = workOrder.status;
  let reached = 0;
  let notice = "";
  let known = true;

  switch (status) {
    case "Draft":
      reached = 1;
      break;

    case "Needs Emergency Information":
      reached = emergency ? 2 : 0;
      known = emergency;
      break;

    case "Pending President Approval":
      reached = emergency ? 0 : 2;
      known = !emergency;
      break;

    case "Pending Treasurer Approval":
      reached = emergency ? 0 : 3;
      known = !emergency;
      break;

    case "Authorized Work Order":
      reached = completionStart;
      break;

    case "Approved":
      reached = steps.length;
      break;

    default:
      known = false;
      notice = `Status: ${status}. Progress mapping is not configured for this status.`;
  }

  // Completion records advance the second part of the workflow.
  if (status === "Authorized Work Order") {
    const latest = [...records].sort(
      (a, b) => Number(b.database_id) - Number(a.database_id)
    )[0];

    if (latest) {
      switch (latest.status) {
        case "Pending President Approval":
          reached = completionStart + 1;
          break;

        case "Pending Treasurer Approval":
          reached = completionStart + 2;
          break;

        case "Approved":
          reached = completionStart + 3;
          notice =
            "Completion approved. Waiting for the work-order status to become Completed.";
          break;

        default:
          if (/reject/i.test(latest.status)) {
            notice =
              `Completion report ${latest.completion_number} was rejected. ` +
              "A new completion report is required.";
          } else {
            known = false;
            notice = `Completion status: ${latest.status}. Progress mapping is not configured for this status.`;
          }
      }
    }
  }

  return {
    steps,
    completionStart,
    reached,
    known,
    notice,
    percent: Math.round((reached / steps.length) * 100),
  };
}

function ProgressDialog({ workOrder, progress, loading, error, onRetry, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;

    dialog.showModal();

    return () => {
      dialog.close();

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  const groups = [
    {
      title:
        workOrder.type === "Emergency"
          ? "Work order & emergency information"
          : "Work order & initial approvals",
      start: 0,
      end: progress.completionStart,
    },
    {
      title: "Completion & final approvals",
      start: progress.completionStart,
      end: progress.steps.length,
    },
  ];

  return createPortal(
    <dialog
      ref={dialogRef}
      className="wop-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="wop-header">
        <div>
          <p className="wop-reference">{workOrder.id}</p>
          <h2 id={titleId}>{workOrder.title}</h2>
        </div>

        <button type="button" className="wop-close" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="wop-status">
        {workOrder.type} · {workOrder.status}
      </p>

      {loading ? (
        <p role="status">Loading completion progress…</p>
      ) : error ? (
        <div role="alert">
          <p>Unable to load completion progress: {error}</p>
          <button type="button" className="wop-close" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : !progress.known ? (
        <p role="status">{progress.notice}</p>
      ) : (
        <>
          <div
            className="wop-track wop-track-large"
            role="progressbar"
            aria-label="Workflow progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>

          <p className="wop-count">
            {progress.reached} of {progress.steps.length} milestones reached
          </p>

          <div className="wop-phases">
            {groups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>

                <ol className="wop-steps">
                  {progress.steps
                    .slice(group.start, group.end)
                    .map((label, index) => {
                      const position = group.start + index;
                      const done = position < progress.reached;
                      const current = position === progress.reached;

                      return (
                        <li
                          key={label}
                          className={
                            done ? "is-done" : current ? "is-current" : ""
                          }
                          aria-current={current ? "step" : undefined}
                        >
                          <span className="wop-dot" aria-hidden="true">
                            {done ? "✓" : current ? "●" : "○"}
                          </span>
                          <span>{label}</span>
                        </li>
                      );
                    })}
                </ol>
              </section>
            ))}
          </div>

          {workOrder.type === "Emergency" && (
            <p className="wop-note">
              Emergency orders bypass initial approval. Completion still
              requires President and Treasurer approval.
            </p>
          )}

          {progress.notice && (
            <p className="wop-note" role="status">
              {progress.notice}
            </p>
          )}
        </>
      )}
    </dialog>,
    document.body
  );
}

export default function WorkOrderProgress({ workOrder }) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const needsCompletion =
      workOrder.status === "Authorized Work Order";

    setRecords([]);
    setError("");

    if (!needsCompletion) {
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setLoading(true);

    async function loadCompletion() {
      try {
        const result = await api(
          `${BASE}/${encodeURIComponent(workOrder.id)}/WO-completion`,
          { signal: controller.signal }
        );

        if (!Array.isArray(result)) {
          throw new Error("The backend returned an invalid completion list.");
        }

        if (active) setRecords(result);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load completion records.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCompletion();

    return () => {
      active = false;
      controller.abort();
    };
  }, [workOrder, retry]);

  const progress = getProgress(workOrder, records);
  const unavailable = loading || Boolean(error) || !progress.known;

  const description = loading
    ? "Loading progress"
    : error
      ? "Completion progress unavailable"
      : !progress.known
        ? progress.notice
        : `${progress.reached} of ${progress.steps.length} milestones reached`;

  return (
    <>
      <button
        type="button"
        className="wop-trigger"
        onClick={() => setOpen(true)}
        aria-label={`${workOrder.id}: ${description}. Open workflow progress.`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`${workOrder.status} · ${description}`}
      >
        <span
          className={`wop-track ${
            unavailable ? "wop-track-unavailable" : ""
          }`}
          aria-hidden="true"
        >
          <span
            style={{
              width: unavailable ? "0%" : `${progress.percent}%`,
            }}
          />
          {unavailable && <span className="wop-unavailable-mark">…</span>}
        </span>
      </button>

      {open && (
        <ProgressDialog
          workOrder={workOrder}
          progress={progress}
          loading={loading}
          error={error}
          onRetry={() => setRetry((value) => value + 1)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}