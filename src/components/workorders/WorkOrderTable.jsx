import Can from "../security/Can";

import {
    ACTIONS,
    MODULES,
    WORK_ORDER_STATUS,
} from "../../security/constants";

function getStatusClass(status) {
    return status.toLowerCase().replaceAll(" ", "-");
}

function canCurrentUserApprove(workOrder, currentUser) {
    const currentStep =
        workOrder.approvalRoute?.[workOrder.currentApprovalStep];

    if (
        !currentStep ||
        !currentUser ||
        workOrder.status === WORK_ORDER_STATUS.REJECTED ||
        workOrder.status === WORK_ORDER_STATUS.APPROVED
    ) {
        return false;
    }

    const isRequiredApprover =
        currentStep.role === currentUser.role;

    const isWorkOrderCreator =
        workOrder.createdBy === currentUser.id;

    return isRequiredApprover && !isWorkOrderCreator;
}

function WorkOrderTable({
    workOrders,
    currentUser,
    onViewWorkOrder,
    onSubmitWorkOrder,
    onApproveWorkOrder,
    onRejectWorkOrder,
    onEditWorkOrder,
    onInactiveWorkOrder,
}) {
    return (
        <div className="table-wrapper">
             <table className="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Supplier</th>
                        <th>Requested By</th>
                        <th>Amount (MXN)</th>
                        <th>Status</th>
                        <th>Approval Route</th>
                        <th>Priority</th>
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

                            <td>
                                ${Number(workOrder.amount).toLocaleString()}
                            </td>

                            <td>
                                <span
                                    className={`status-badge status-${getStatusClass(
                                        workOrder.status
                                    )}`}
                                >
                                    {workOrder.status}
                                </span>
                            </td>

                            <td>
                                {workOrder.approvalRouteLabel ||
                                    "Calculated on submission"}
                            </td>

                            <td>
                                <span
                                    className={`priority-dot priority-${workOrder.priority.toLowerCase()}`}
                                />
                                {workOrder.priority}
                            </td>

                            <td>
                                <div className="icon-actions">
                                    <Can
                                        module={MODULES.WORK_ORDERS}
                                        action={ACTIONS.VIEW}
                                    >
                                        <button type="button"


                                            onClick={() => onViewWorkOrder(workOrder.id)}
                                        >
                                            View
                                        </button>



                                    </Can>

                                    {workOrder.status ===
                                        WORK_ORDER_STATUS.DRAFT && (
                                            <Can
                                                module={MODULES.WORK_ORDERS}
                                                action={ACTIONS.SUBMIT}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSubmitWorkOrder(workOrder.id)
                                                    }
                                                >
                                                    Submit
                                                </button>
                                            </Can>
                                        )}
                                    {canCurrentUserApprove(workOrder, currentUser) && (
                                        <>
                                            <Can
                                                module={MODULES.WORK_ORDERS}
                                                action={ACTIONS.APPROVE}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onApproveWorkOrder(workOrder.id)
                                                    }
                                                >
                                                    Approve
                                                </button>
                                            </Can>

                                            <Can
                                                module={MODULES.WORK_ORDERS}
                                                action={ACTIONS.REJECT}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onRejectWorkOrder(workOrder.id)
                                                    }
                                                >
                                                    Reject
                                                </button>
                                            </Can>
                                        </>
                                    )}
                                    {onEditWorkOrder &&
                                        workOrder.status ===
                                        WORK_ORDER_STATUS.DRAFT && (
                                            <Can
                                                module={MODULES.WORK_ORDERS}
                                                action={ACTIONS.EDIT}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onEditWorkOrder(workOrder)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                            </Can>
                                        )}

                                    {onInactiveWorkOrder && (
                                        <Can
                                            module={MODULES.WORK_ORDERS}
                                            action={ACTIONS.DELETE_INACTIVE}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onInactiveWorkOrder(workOrder.id)
                                                }
                                            >
                                                Inactive
                                            </button>
                                        </Can>
                                    )}
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