function getStatusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function WorkOrderTable({ workOrders }) {
  return (
    <div className="table-wrapper">
      <table className="work-orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Requested By</th>
            <th>Amount (MXN)</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Target Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {workOrders.map((workOrder) => (
            <tr key={workOrder.id}>
              <td>{workOrder.id}</td>
              <td>{workOrder.title}</td>
              <td>{workOrder.category}</td>
              <td>{workOrder.supplier}</td>
              <td>{workOrder.requestedBy}</td>
              <td>${workOrder.amount.toLocaleString()}</td>
              <td>
                <span className={`status-badge status-${getStatusClass(workOrder.status)}`}>
                  {workOrder.status}
                </span>
              </td>
              <td>
                <span className={`priority-dot priority-${workOrder.priority.toLowerCase()}`} />
                {workOrder.priority}
              </td>
              <td>{workOrder.targetDate || "—"}</td>
              <td>
                <div className="icon-actions">
                  <button>👁</button>
                  <button>⋮</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WorkOrderTable;
