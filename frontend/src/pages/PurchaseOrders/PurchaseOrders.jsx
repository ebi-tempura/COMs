import { useEffect, useRef, useState } from "react";
import Card from "../../components/common/Card";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";

const PO_URL = "/api/purchase-orders";
const SUPPLIERS_URL = "/api/suppliers/api/suppliers";
const WORK_ORDERS_URL = "/api/work_orders/api/work-orders";

const CREATE_ROLES = ["Admin", "Manager", "Staff"];
const VIEW_ROLES = [
  ...CREATE_ROLES,
  "President",
  "Treasurer",
  "Board Member",
];

const APPROVAL_STEPS = {
  "Pending President Approval": {
    role: "President",
    action: "approve-president",
  },
  "Pending Treasurer Approval": {
    role: "Treasurer",
    action: "approve-treasurer",
  },
  "Pending Board Member Approval": {
    role: "Board Member",
    action: "approve-board-member",
  },
};

const EMPTY_FORM = {
  title: "",
  supplier_id: "",
  work_order_number: "",
  amount: "",
  priority: "Medium",
  description: "",
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PurchaseOrders() {
  const { user } = useAuth();

  // Reset page state when the account or signed-in identity changes.
  if (!user) return null;

  return (
    <PurchaseOrdersPage
      key={`${user.account_id}:${user.id}:${user.role}`}
      user={user}
    />
  );
}

function PurchaseOrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  const lock = useRef(false);
  const canCreate = CREATE_ROLES.includes(user.role);
  const canView = VIEW_ROLES.includes(user.role);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      setLoading(true);
      setError("");
      setLookupError("");

      if (!canView) {
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        api(PO_URL, { signal: controller.signal }),
        api(SUPPLIERS_URL, { signal: controller.signal }),
        canCreate
          ? api(WORK_ORDERS_URL, { signal: controller.signal })
          : Promise.resolve([]),
      ]);

      if (!active) return;

      const [poResult, supplierResult, woResult] = results;
      const lookupErrors = [];

      if (
        poResult.status === "fulfilled" &&
        Array.isArray(poResult.value)
      ) {
        setOrders(poResult.value);
      } else {
        setOrders([]);
        setError(
          poResult.status === "rejected"
            ? poResult.reason.message
            : "The backend returned an invalid purchase-order list."
        );
      }

      if (
        supplierResult.status === "fulfilled" &&
        Array.isArray(supplierResult.value)
      ) {
        setSuppliers(supplierResult.value);
      } else {
        setSuppliers([]);
        lookupErrors.push("Unable to load suppliers. Click Refresh to retry.");
      }

      if (
        woResult.status === "fulfilled" &&
        Array.isArray(woResult.value)
      ) {
        setWorkOrders(woResult.value);
      } else {
        setWorkOrders([]);
        lookupErrors.push(
          "Unable to load work orders. Click Refresh before linking one."
        );
      }

      setLookupError(lookupErrors.join(" "));
      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload, canView, canCreate]);

  const approvedSuppliers = suppliers.filter(
    (supplier) =>
      supplier.status === "Approved" && supplier.is_active !== false
  );

  // Matches the current PO backend's exact eligibility check.
  const approvedWorkOrders = workOrders.filter(
    (workOrder) => workOrder.status === "Approved"
  );

  const supplierNames = new Map(
    suppliers.map((supplier) => [
      supplier.supplier_id,
      supplier.supplier_name,
    ])
  );

  const filteredOrders = orders.filter((order) => {
    const text = [
      order.purchase_order_number,
      order.title,
      order.supplier_id,
      supplierNames.get(order.supplier_id),
      order.work_order_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search.trim().toLowerCase()) &&
      (statusFilter === "All" || order.status === statusFilter)
    );
  });

  const statuses = [...new Set(orders.map((order) => order.status))];

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createOrder(event) {
    event.preventDefault();
    if (lock.current) return;

    setError("");
    setMessage("");

    if (!form.title.trim() || !form.description.trim()) {
      setError("Enter a title and description.");
      return;
    }

    if (
      !approvedSuppliers.some(
        (supplier) => supplier.supplier_id === form.supplier_id
      )
    ) {
      setError("Select an approved supplier.");
      return;
    }

    if (
      form.work_order_number &&
      !approvedWorkOrders.some(
        (order) => order.work_order_number === form.work_order_number
      )
    ) {
      setError("Select an eligible work order or choose No work order.");
      return;
    }

    if (
      !/^\d{1,10}(\.\d{1,2})?$/.test(form.amount) ||
      Number(form.amount) <= 0
    ) {
      setError("Enter a positive amount with no more than two decimals.");
      return;
    }

    lock.current = true;
    setBusy(true);

    try {
      const saved = await api(PO_URL, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          supplier_id: form.supplier_id,
          work_order_number: form.work_order_number || null,
          amount: form.amount,
          priority: form.priority,
          description: form.description.trim(),
        }),
      });

      setOrders((current) => [saved, ...current]);
      setForm({ ...EMPTY_FORM });
      setStatusFilter("All");
      setSearch("");
      setMessage(`${saved.purchase_order_number} saved as Draft.`);
    } catch (err) {
      setError(err.message || "Unable to create purchase order.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function performAction(order, action) {
    if (lock.current) return;

    let payload;

    if (action === "reject") {
      const comment = window.prompt("Enter the rejection reason:");

      if (comment === null) return;

      if (!comment.trim()) {
        setError("A rejection reason is required.");
        return;
      }

      payload = { comment: comment.trim() };
    }

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const saved = await api(
        `${PO_URL}/${encodeURIComponent(order.purchase_order_number)}/${action}`,
        {
          method: "POST",
          ...(payload ? { body: JSON.stringify(payload) } : {}),
        }
      );

      setOrders((current) =>
        current.map((item) =>
          item.database_id === saved.database_id ? saved : item
        )
      );

      setMessage(`${saved.purchase_order_number}: ${saved.status}`);
    } catch (err) {
      setError(err.message || "Unable to update purchase order.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!canView) {
    return <p>Your role does not have access to purchase orders.</p>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p className="page-subtitle">
            Create purchase requests and track their approvals.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={loading || busy}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {lookupError && <p role="alert">{lookupError}</p>}
      {message && <p role="status">{message}</p>}
      {loading && <p role="status">Loading purchase orders…</p>}

      {canCreate && (
        <Card>
          <div className="panel-title">
            <h2>Create purchase order</h2>
          </div>

          <form onSubmit={createOrder}>
            <fieldset
              disabled={loading || busy}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="po-title">Title</label>
                  <input
                    id="po-title"
                    name="title"
                    value={form.title}
                    onChange={changeForm}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-supplier">Supplier</label>
                  <select
                    id="po-supplier"
                    name="supplier_id"
                    value={form.supplier_id}
                    onChange={changeForm}
                    required
                  >
                    <option value="">Select an approved supplier</option>
                    {approvedSuppliers.map((supplier) => (
                      <option
                        key={supplier.database_id}
                        value={supplier.supplier_id}
                      >
                        {supplier.supplier_name} — {supplier.supplier_id}
                      </option>
                    ))}
                  </select>

                  {!loading && approvedSuppliers.length === 0 && (
                    <small>
                      An approved supplier is required to create a PO.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="po-work-order">
                    Work order — optional
                  </label>
                  <select
                    id="po-work-order"
                    name="work_order_number"
                    value={form.work_order_number}
                    onChange={changeForm}
                  >
                    <option value="">No work order</option>
                    {approvedWorkOrders.map((order) => (
                      <option
                        key={order.database_id}
                        value={order.work_order_number}
                      >
                        {order.work_order_number} — {order.title}
                      </option>
                    ))}
                  </select>
                  <small>Only eligible approved work orders are listed.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="po-amount">Amount — MXN</label>
                  <input
                    id="po-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={form.amount}
                    onChange={changeForm}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-priority">Priority</label>
                  <select
                    id="po-priority"
                    name="priority"
                    value={form.priority}
                    onChange={changeForm}
                  >
                    {["Low", "Medium", "High"].map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group form-wide">
                  <label htmlFor="po-description">Description</label>
                  <textarea
                    id="po-description"
                    name="description"
                    value={form.description}
                    onChange={changeForm}
                    rows={4}
                    required
                  />
                </div>

                <div className="form-actions form-wide">
                  <button
                    type="submit"
                    className="primary-action-button"
                    disabled={approvedSuppliers.length === 0}
                  >
                    {busy ? "Saving…" : "Create draft"}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </Card>
      )}

      <Card>
        <div className="panel-title">
          <h2>Purchase-order register</h2>

          <div className="table-tools">
            <input
              aria-label="Search purchase orders"
              placeholder="Search number, title, or supplier…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO number</th>
                <th>Title / description</th>
                <th>Supplier</th>
                <th>Work order</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const step = APPROVAL_STEPS[order.status];
                const canReview =
                  step?.role === user.role &&
                  order.created_by_user_id !== user.id;

                return (
                  <tr key={order.database_id}>
                    <td>{order.purchase_order_number}</td>
                    <td>
                      <strong>{order.title}</strong>
                      <details>
                        <summary>View description</summary>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {order.description}
                        </p>
                      </details>
                    </td>
                    <td>
                      {supplierNames.get(order.supplier_id) ||
                        order.supplier_id}
                    </td>
                    <td>{order.work_order_number || "—"}</td>
                    <td>{money.format(Number(order.amount))}</td>
                    <td>{order.status}</td>
                    <td>
                      <div className="icon-actions">
                        {order.status === "Draft" && canCreate && (
                          <button
                            type="button"
                            className="table-action-button"
                            disabled={busy || loading}
                            onClick={() => performAction(order, "submit")}
                          >
                            Submit
                          </button>
                        )}

                        {canReview && (
                          <>
                            <button
                              type="button"
                              className="table-action-button"
                              disabled={busy || loading}
                              onClick={() =>
                                performAction(order, step.action)
                              }
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="table-action-button"
                              disabled={busy || loading}
                              onClick={() => performAction(order, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7}>No purchase orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}