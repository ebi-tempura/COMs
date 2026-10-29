import { useEffect, useRef, useState } from "react";
import Card from "../../components/common/Card";
import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import WorkOrderModal from "../../components/workorders/WorkOrderModal";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../lib/api";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

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
  
  const [reportModal, setReportModal] = useState(null);


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
    
  const modalWorkOrder = workOrders.find(
    (item) => item.id === reportModal?.id
  );

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
          onViewWorkOrder={(id) => setReportModal({id, mode: "details"})}
          onSubmitWorkOrder={handleSubmitWorkOrder}
          onApproveWorkOrder={(id) => handleReview(id, "approve")}
          onRejectWorkOrder={(id) => handleReview(id, "reject")}
          onOpenReport={(id, mode) => setReportModal({id, mode})}
        />
      </Card>

      {reportModal && modalWorkOrder && (
        <WorkOrderModal
          key={`${user.account_id}:${user.id}:${reportModal.id}:${reportModal.mode}`}
          mode={reportModal.mode}
          workOrder={modalWorkOrder}
          currentUser={user}
          onClose={() => setReportModal(null)}
          onChanged={() => setReload((value) => value + 1)}
        />
      )}
    </div>
  );
}