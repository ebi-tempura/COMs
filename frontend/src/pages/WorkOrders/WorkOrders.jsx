import { useEffect, useRef, useState } from "react";
import Card from "../../components/common/Card";
import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import WorkOrderDetailsPanel from "../../components/workorders/WorkOrderDetailsPanel";
import WorkOrderCompletionReportForm from "../../components/workorders/WorkOrderCompletionReportForm";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../lib/api";

const WORK_ORDERS_URL = "/api/work_orders/api/work-orders";
const SUPPLIERS_URL = "/api/suppliers/api/suppliers";
//const PURCHASE_ORDERS_URL = "/api/purchaseorders/api/purchase-orders"

const APPROVAL_STEPS = {
  "Pending President Approval": {
    role: "President",
    endpoint: "president",
  },
  "Pending Treasurer Approval": {
    role: "Treasurer",
    endpoint: "treasurer",
  },
  "Pending Board Member Approval": {
    role: "Board Member",
    endpoint: "board_member",
  },
};

function mapWorkOrder(record, user) {
  return {
    ...record,
    id: record.work_order_number,
    supplier: record.supplier_name || record.supplier_id,
    amount: Number(record.amount),
    createdBy: record.created_by_user_id,
    requestedBy:
      record.created_by_user_id === user.id
        ? user.name
        : record.created_by_user_id != null
          ? `User #${record.created_by_user_id}`
          : "—",
    targetDate: record.target_date,
    createdAt: record.created_at,
  };
}

export default function WorkOrders() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <WorkOrdersPage
      key={`${user.account_id}:${user.id}:${user.role}`}
      user={user}
    />
  );
}

function WorkOrdersPage({ user }) {
  const { t, statusLabel } = useLanguage();
  const [workOrders, setWorkOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const lock = useRef(false);

  const canCreate = ["Admin", "Manager", "Staff"].includes(user.role);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      setLoading(true);
      setError("");
      setSupplierError("");

      const results = await Promise.allSettled([
        api(WORK_ORDERS_URL, { signal: controller.signal }),
        canCreate
          ? api(SUPPLIERS_URL, { signal: controller.signal })
          : Promise.resolve([]),
      ]);

      if (!active) return;

      const [ordersResult, suppliersResult] = results;

      if (
        ordersResult.status === "fulfilled" &&
        Array.isArray(ordersResult.value)
      ) {
        setWorkOrders(
          ordersResult.value.map((record) => mapWorkOrder(record, user))
        );
      } else {
        setWorkOrders([]);
        setError(
          ordersResult.status === "rejected"
            ? ordersResult.reason.message
            : "The backend returned an invalid work-order list."
        );
      }

      if (
        suppliersResult.status === "fulfilled" &&
        Array.isArray(suppliersResult.value)
      ) {
        setSuppliers(suppliersResult.value);
      } else {
        setSuppliers([]);
        setSupplierError(
          suppliersResult.status === "rejected"
            ? suppliersResult.reason.message
            : "The backend returned an invalid supplier list."
        );
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload, canCreate, user.id, user.account_id, user.name]);

  async function handleCreateWorkOrder(payload) {
    if (lock.current) return false;

    if (!suppliers.some((item) => item.supplier_id === payload.supplier_id)) {
      setError("Select a supplier from the loaded list.");
      return false;
    }

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const record = await api(WORK_ORDERS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const saved = mapWorkOrder(record, user);
      setWorkOrders((current) => [saved, ...current]);
      setSearch("");
      setStatusFilter("All");
      setMessage(`${saved.id} saved as ${saved.status}.`);
      return true;
    } catch (err) {
      setError(err.message || "Unable to create work order.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }

    const creationEvent = createAuditEvent({
      action: ACTIONS.CREATE,
      entityType: "Work Order",
      entityId: baseWorkOrder.id,
      entityVersion: baseWorkOrder.version,
      fromStatus: null,
      toStatus: WORK_ORDER_STATUS.DRAFT,
      user,
      timestamp,
      changes: Object.entries(newWorkOrder).map(([field, value]) => ({
        field,
        oldValue: null,
        newValue: value,
      })),
    });

    const preparedWorkOrder = {
      ...baseWorkOrder,
      auditTrail: [creationEvent],
      approvalHistory: [creationEvent],
    };
  }

  async function runAction(workOrderId, action) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const record = await api(
        `${WORK_ORDERS_URL}/${encodeURIComponent(workOrderId)}/${action}`,
        { method: "POST" }
      );

      const saved = mapWorkOrder(record, user);

      setWorkOrders((current) =>
        current.map((item) => (item.id === saved.id ? saved : item))
      );

      setMessage(`${saved.id}: ${saved.status}`);
    } catch (err) {
      setError(err.message || "Unable to update work order.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function handleSubmitWorkOrder(id) {
    return runAction(id, "submit");
  }

  function handleReview(id, decision) {
    const workOrder = workOrders.find((item) => item.id === id);
    const step = APPROVAL_STEPS[workOrder?.status];

    if (
      !step ||
      step.role !== user.role ||
      workOrder.createdBy === user.id
    ) {
      setError("You cannot review this work order at its current step.");
      return;
    }

    if (
      decision === "reject" &&
      !window.confirm(`Reject work order ${id}?`)
    ) {
      return;
    }

    return runAction(id, `${decision}-${step.endpoint}`);
  }

  const filteredWorkOrders = workOrders.filter((workOrder) => {
    const text =
      `${workOrder.id} ${workOrder.title} ${workOrder.supplier}`.toLowerCase();

    return (
      text.includes(search.trim().toLowerCase()) &&
      (statusFilter === "All" || workOrder.status === statusFilter)
    );
  });

  const statuses = [...new Set(workOrders.map((item) => item.status))];
  const selected = workOrders.find((item) => item.id === selectedId);


  function handleStartWork(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) => startWorkOrder(workOrder, user));
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleSubmitCompletion(workOrderId, completionReport) {
    try {
      updateWorkOrder(workOrderId, (workOrder) => {
        const nextVersion =
          (Number.isInteger(workOrder.completionVersion)
            ? workOrder.completionVersion
            : 0) + 1;
  
        const timestamp = new Date().toISOString();
  
        const reportVersion = {
          version: nextVersion,
          status: WORK_ORDER_COMPLETION_REPORT_STATUS.SUBMITTED,
  
          submittedAt: timestamp,
  
          submittedBy: {
            userId: user.id,
            userName: user.name,
            role: user.role,
          },
  
          report: {
            ...completionReport,
          },
        };
  
        const workOrderWithReport = {
          ...workOrder,
  
          // Latest editable report
          completionReport: {
            ...completionReport,
          },
  
          // Permanent version history
          completionReportVersions: [
            ...(workOrder.completionReportVersions ?? []),
            reportVersion,
          ],
        };
  
        return submitWorkOrderCompletion(
          workOrderWithReport,
          user
        );
      });
  
      setCompletionReportWorkOrderId(null);
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleApproveCompletion(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) =>
        approveWorkOrderCompletion(workOrder, user)
      );
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleRejectCompletion(workOrderId) {
    const comment = window.prompt(t("workOrders.completionRejectionPrompt"));

    if (comment === null) {
      return;
    }

    try {
      updateWorkOrder(workOrderId, (workOrder) =>
        rejectWorkOrderCompletion(workOrder, user, comment)
      );
    } catch (error) {
      showWorkflowError(error);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t("workOrders.title")}</h1>
          <p>{t("workOrders.subtitle")}</p>
        </div>

        <div className="table-tools">
          {canCreate && !showForm && (
            <button
              type="button"
              className="primary-action-button"
              onClick={() => setShowForm(true)}
            >
              {t("workOrders.createTitle")}
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            disabled={busy || loading}
            onClick={() => setReload((value) => value + 1)}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {supplierError && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          Unable to load suppliers: {supplierError}
        </p>
      )}

      {message && <p role="status">{message}</p>}
      {loading && <p role="status">Loading work orders…</p>}

      {canCreate && showForm && (
        <Card>
          <div className="panel-title">
            <h2>{t("workOrders.createTitle")}</h2>
          </div>

          <WorkOrderForm
            suppliers={suppliers}
            currentUser={user}
            disabled={busy || loading || Boolean(supplierError)}
            onCreateWorkOrder={handleCreateWorkOrder}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      <Card>
        <div className="panel-title">
          <div>
            <h2>{t("workOrders.title")}</h2>
            <span>
              {filteredWorkOrders.length} {t("common.total")}
            </span>
          </div>

          <div className="table-tools">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("workOrders.searchPlaceholder")}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">{t("common.allStatuses")}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <WorkOrderTable
          workOrders={filteredWorkOrders}
          currentUser={user}
          disabled={busy || loading}
          onViewWorkOrder={setSelectedId}
          onSubmitWorkOrder={handleSubmitWorkOrder}
          onApproveWorkOrder={(id) => handleReview(id, "approve")}
          onRejectWorkOrder={(id) => handleReview(id, "reject")}
          onStartWork={handleStartWork}
          onSubmitCompletion={setCompletionReportWorkOrderId}
          onApproveCompletion={handleApproveCompletion}
          onRejectCompletion={handleRejectCompletion}
        />
      </Card>
 
      {selected && (
        <Card>
          <div className="panel-title">
            <h2>{selected.id}</h2>
            <button type="button" onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>

          <h3>{selected.title}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{selected.description}</p>
          <p><strong>Supplier:</strong> {selected.supplier}</p>
          <p><strong>Type:</strong> {selected.type}</p>
          <p><strong>Location:</strong> {selected.location}</p>
          <p><strong>Target date:</strong> {selected.targetDate}</p>
          <p><strong>Status:</strong> {statusLabel(selected.status)}</p>
          <p><strong>Created by:</strong> {selected.requestedBy}</p>
        </Card>
      )}
      <Can
        module={MODULES.WORK_ORDERS}
        action={ACTIONS.COMPLETE_WORK}
     >
      <Card>
          <WorkOrderCompletionReportForm
          workOrder={completionReportWorkOrder}
          initialReport={completionReportWorkOrder.completionReport}
          onSubmitReport={(completionReport) =>
            handleSubmitCompletion(
              completionReportWorkOrder.id,
              completionReport
            )
          }
          onCancel={() => setCompletionReportWorkOrderId(null)}
          />
        </Card>
        </Can>
      )}


        {selectedWorkOrder && (
          <Card>
            <h2>{t("workOrders.detailsTitle")}</h2>
            <WorkOrderDetailsPanel
              workOrder={selectedWorkOrder}
              onClose={() => setSelectedWorkOrderId(null)}
            />
          </Card>
        )}
        
    </div>
  );
}