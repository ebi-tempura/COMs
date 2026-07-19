import { useState } from "react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import Can from "../../components/security/Can";

import { ACTIONS,MODULES } from "../../security/constants";

const STATUSES = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const initialWorkOrders = [
  {
    id: "WO-2025-0012",
    title: "Fix lobby light",
    category: "Electrical",
    supplier: "Electro Services SA",
    requestedBy: "Admin User",
    amount: 1200,
    status: STATUSES.DRAFT,
    priority: "Medium",
    targetDate: "",
  },
];

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [showForm, setShowForm] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  function handleCreateWorkOrder(newWorkOrder) {
    setWorkOrders((current) => [newWorkOrder, ...current]);
  }

  const filteredWorkOrders = workOrders.filter((workOrder) => {
    const text = `${workOrder.id} ${workOrder.title} ${workOrder.supplier}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || workOrder.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Work Orders</h1>
          <p>Create, approve, and track condominium maintenance work.</p>
        </div>

      </div>
      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.CREATE}>
      {showForm && (
        <Card>
          <div className="panel-title">
            <h2>Create New Work Order</h2>
          </div>

          <WorkOrderForm
            onCreateWorkOrder={handleCreateWorkOrder}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}
      </Can>

      <Card>
        <div className="panel-title">
          <div>
            <h2>Work Orders</h2>
            <span>{filteredWorkOrders.length} Total</span>
          </div>

          <div className="table-tools">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search work orders..."
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              {Object.values(STATUSES).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <button className="secondary-button">Filter</button>
            <button className="secondary-button">Export</button>
          </div>
        </div>

        <WorkOrderTable workOrders={filteredWorkOrders} />

        <div className="table-footer">
          <p>
            Showing 1 to {filteredWorkOrders.length} of {workOrders.length} results
          </p>

          <div className="pagination">
            <button>‹</button>
            <button className="active-page">1</button>
            <button>2</button>
            <button>›</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default WorkOrders;