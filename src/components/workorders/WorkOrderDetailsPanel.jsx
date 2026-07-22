import WorkOrderAuditTrail from "./WorkOrderAuditTrail";

function WorkOrderDetailsPanel({ workOrder, onClose }) {
    if (!workOrder) {
        return null;
    }

    return (
        <div className="details-overlay">
            <section
                className="details-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="work-order-details-title"
            >
                <div className="details-panel-header">
                <button type="button" onClick={onClose}>
                        Close
                    </button>

                    <div>
                        <h2 id="work-order-details-title">
                            {workOrder.id}
                        </h2>

                        <p> <strong>Work Order title: </strong> {workOrder.title}</p>
                    </div>


                </div>

                <div className="work-order-details">
                    <p>
                        <strong>Status:</strong> {workOrder.status}
                    </p>

                    <p>
                        <strong>Supplier:</strong>{" "}
                        {workOrder.supplier}
                    </p>

                    <p>
                        <strong>Amount:</strong> $
                        {Number(workOrder.amount).toLocaleString()} MXN
                    </p>

                    <p>
                        <strong>Priority:</strong>{" "}
                        {workOrder.priority}
                    </p>
                </div>

                <hr />

                <h3>Audit Trail</h3>

                <WorkOrderAuditTrail workOrder={workOrder} />
            </section>
        </div>
    );
}

export default WorkOrderDetailsPanel;