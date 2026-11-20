import {
  ROLES,
  WORK_ORDER_STATUS,
} from "../../security/constants";
import { useLanguage } from "../../i18n/LanguageContext";
import WorkOrderProgress from "./WorkOrderProgress";
import { useEffect, useRef, useState } from "react";
import { api, apiDownload } from "../../lib/api";

const APPROVER_BY_STATUS = {
  [WORK_ORDER_STATUS.PENDING_PRESIDENT_APPROVAL]: ROLES.PRESIDENT,
  [WORK_ORDER_STATUS.PENDING_TREASURER_APPROVAL]: ROLES.TREASURER,
  [WORK_ORDER_STATUS.PENDING_BOARD_MEMBER_APPROVAL]: ROLES.BOARD_MEMBER,
};

function WorkOrderStatusBadge({ workOrder, refreshKey }) {
  const { ui } = useLanguage();
  const { statusLabel } = useLanguage();
  const [completionState, setCompletionState] = useState(null);
  const [retry, setRetry] = useState(0);

  const needsCompletion =
    workOrder.status === "Authorized Work Order";

  useEffect(() => {
    if (!needsCompletion) {
      setCompletionState(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setCompletionState(null);

    async function loadCompletionStatus() {
      try {
        const records = await api(
          `/api/work_order_comp_eme/api/work-orders/${encodeURIComponent(
            workOrder.id
          )}/WO-completion`,
          { signal: controller.signal }
        );

        if (!Array.isArray(records)) {
          throw new Error(ui("Invalid completion report list."));
        }

        const latest = [...records].sort(
          (a, b) => Number(b.database_id) - Number(a.database_id)
        )[0];

        if (active) {
          setCompletionState({
            workOrder,
            latest: latest || null,
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setCompletionState({
            workOrder,
            latest: null,
            error: error.message || ui("Unable to load completion status."),
          });
        }
      }
    }

    loadCompletionStatus();

    return () => {
      active = false;
      controller.abort();
    };
  }, [workOrder, needsCompletion, refreshKey, retry]);

  let label = statusLabel(workOrder.status);
  let badgeStatus = workOrder.status;
  let title = "";

  if (
    workOrder.status === "Approved" ||
    workOrder.status === "Completed"
  ) {
    label = ui("Approved / Closed");
    badgeStatus = "Approved";
  }

  if (workOrder.status === "Needs Emergency Information") {
    label = ui("Emergency information required");
  }

  if (needsCompletion) {
    const loaded = completionState?.workOrder === workOrder;

    if (!loaded) {
      return (
        <span
          className="status-badge status-pending-approval"
          role="status"
        >
          {ui("Loading status…")}
        </span>
      );
    }

    if (completionState.error) {
      return (
        <button
          type="button"
          className="table-action-button"
          title={completionState.error}
          onClick={() => setRetry((value) => value + 1)}
        >
          {ui("Status unavailable · Retry")}
        </button>
      );
    }

    const latest = completionState.latest;

    label = ui("Work in progress");
    badgeStatus = "In Progress";

    if (latest) {
      badgeStatus = latest.status;
      title = ui("Completion report {number}", { number: latest.completion_number });

      const reviewLabels = {
        "Pending President Approval": ui("Awaiting President review"),
        "Pending Treasurer Approval": ui("Awaiting Treasurer review"),
        "Pending Board Member Approval": ui("Awaiting Board Member review"),
      };

      if (reviewLabels[latest.status]) {
        label = reviewLabels[latest.status];
      } else if (/reject/i.test(latest.status)) {
        label = ui("Completion rejected");
        badgeStatus = "Rejected";
        title += ` · ${latest.status} · A new report is required`;
      } else if (latest.status === "Approved") {
        label = ui("Completion approved, awaiting closure");
        badgeStatus = "Pending Approval";
      } else {
        label = ui("Completion · {status}", { status: statusLabel(latest.status) });
      }
    }
  }

  const statusClass = badgeStatus
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return (
    <span
      className={`status-badge status-${statusClass}`}
      title={title || label}
    >
      {label}
    </span>
  );
}

function WOAttachmentsCell({ workOrderNumber, userRole, refreshKey }) {
  const { ui } = useLanguage();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [retry, setRetry] = useState(0);
  const downloadLock = useRef(false);

  const canRead = [
    "Admin",
    "Manager",
    "Staff",
    "President",
    "Treasurer",
    "Board Member",
    "Resident",
  ].includes(userRole);

  const attachmentsUrl =
    `/api/attachments/api/work-orders/${encodeURIComponent(workOrderNumber)}/attachments`;

  useEffect(() => {
    if (!canRead) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError("");

    api(attachmentsUrl, { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error(ui("Invalid attachment list."));
        }

        if (active) setAttachments(result);
      })
      .catch((err) => {
        if (active) {
          setAttachments([]);
          setError(err.message || ui("Unable to load attachments."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort(); 
    };
  }, [attachmentsUrl, canRead, refreshKey, retry]);

  async function downloadAttachment(attachment) {
    if (!canRead || downloadLock.current) return;

    downloadLock.current = true;
    setDownloading(attachment.attachment_number);
    setError("");

    try {
      await apiDownload(
        `${attachmentsUrl}/${encodeURIComponent(
          attachment.attachment_number
        )}/download`,
        attachment.original_filename
      );
    } catch (err) {
      setError(err.message || ui("Unable to download attachment."));
    } finally {
      downloadLock.current = false;
      setDownloading(null);
    }
  }
  async function handleDeleteDraft(id) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      await api(`${WORK_ORDERS_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setWorkOrders((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setError(error.message || ui("Unable to delete work order."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!canRead) return <span>{ui("Not permitted")}</span>;
  if (loading) return <span>{ui("Loading…")}</span>;

  return (
    <div>
      {error && (
        <div>
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            {ui("Refresh attachments")}
          </button>
        </div>
      )}

      {attachments.length > 0 ? (
        <>
          <button
            type="button"
            className="table-action-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {attachments.length} 📎
          </button>

          {expanded && (
            <ul>
              {attachments.map((attachment) => (
                <li key={attachment.attachment_number}>
                  <span style={{ overflowWrap: "anywhere" }}>
                    {attachment.original_filename}
                  </span>
                  {" "}
                  <button
                    type="button"
                    disabled={downloading !== null}
                    onClick={() => downloadAttachment(attachment)}
                  >
                    {downloading === attachment.attachment_number
                      ? ui("Downloading…")
                      : ui("Download")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        !error && <span>📎</span>
      )}
    </div>
  );
  }

export default function WorkOrderTable({
  workOrders,
  currentUser,
  disabled = false,
  refreshKey,

  onViewWorkOrder,
  onSubmitWorkOrder,
  onApproveWorkOrder,
  onRejectWorkOrder,
  onOpenReport,
}) {
  const { ui } = useLanguage();
  const { formatCurrency, statusLabel, t, valueLabel } = useLanguage();

  const canSubmitReports = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.STAFF,
  ].includes(currentUser?.role);

  const canViewAudit = [
  ROLES.ADMIN,
  ROLES.PRESIDENT,
  ROLES.TREASURER,
  ROLES.BOARD_MEMBER,
  ].includes(currentUser?.role);


  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("workOrderTable.id")}</th>
            <th>{t("workOrderTable.title")}</th>
            <th>{t("workOrderTable.category")}</th>
            <th>{t("workOrderTable.priority")}</th>
            <th>{t("workOrderTable.status")}</th>
            <th>{ui("Progress")}</th>
            <th>{t("Attachments")}</th>
            <th>{t("workOrderTable.actions")}</th>
            
          </tr>
        </thead>

        <tbody>
          {workOrders.map((workOrder) => {
            const isCreator = workOrder.createdBy === currentUser?.id;

            const canSubmit =
              workOrder.status === "Draft" &&
              isCreator &&
              ["Staff", "Manager"].includes(currentUser?.role);

            const canReview =
              Boolean(currentUser) &&
              !isCreator &&
              APPROVER_BY_STATUS[workOrder.status] === currentUser.role;

            return (
              <tr key={workOrder.id}>
                <td>{workOrder.id}</td>
                <td>{workOrder.title}</td>
                <td>{valueLabel("category", workOrder.category)}</td>

                <td>
                  <span
                    className={`priority-dot priority-${workOrder.priority.toLowerCase()}`}
                  />
                  {valueLabel("priority", workOrder.priority)}
                </td> 

                <td>
                  <WorkOrderStatusBadge
                    workOrder={workOrder}
                    refreshKey={refreshKey ?? refreshKey}
                  />
                </td>
                
                <td>
                  <WorkOrderProgress workOrder={workOrder} />
                </td>
                <td> <WOAttachmentsCell
                      workOrderNumber={workOrder.id}
                      userRole={currentUser?.role}
                /></td>

                <td>
                  <div className="icon-actions">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onViewWorkOrder(workOrder.id)}
                    >
                      {t("workOrderTable.view")}
                    </button>

                    {workOrder.status === "Draft" &&
                      ["Manager", "Staff"].includes(currentUser?.role) && (
                      <button
                        type="button"
                        className="table-action-button"
                        disabled={disabled}
                        onClick={() => {
                          if (window.confirm(ui("Delete this draft work order?"))) {
                            onDeleteDraft(workOrder.id);
                          }
                        }}
                      >
                        {ui("Delete draft")}
                      </button>
                      )}

                    {workOrder.type === "Emergency" && (
                    
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onOpenReport(workOrder.id, "emergency")}
                    >
                      {canSubmitReports &&
                      workOrder.status === "Needs Emergency Information"
                        ? ui("Emergency info")
                        : ui("Emergency reports")}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onOpenReport(workOrder.id, "completion")}
                  >
                    {ui("Completion reports")}
                  </button>

                  {canViewAudit && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onOpenReport(workOrder.id, "audit")}
                    >
                      {ui("Audit trail")}
                    </button>
                  )}

                    {canSubmit && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSubmitWorkOrder(workOrder.id)}
                      >
                        {t("workOrderTable.submit")}
                      </button>
                    )}

                    {canReview && (
                      <>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onApproveWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.approve")}
                        </button>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onRejectWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.reject")}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {!disabled && workOrders.length === 0 && (
            <tr>
              <td colSpan={9}>{ui("No work orders found.")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
