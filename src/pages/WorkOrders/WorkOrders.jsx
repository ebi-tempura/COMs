
import Card from "../../components/common/Card";
import Can from "../../components/security/Can";

import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import WorkOrderDetailsPanel from "../../components/workorders/WorkOrderDetailsPanel";

import { createAuditEvent } from "../../workflows/workflowEngine";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
    ACTIONS,
    MODULES,
    WORK_ORDER_STATUS,
    } from "../../security/constants";
import {
    approveWorkOrder,
    rejectWorkOrder,
    submitWorkOrder,
    } from "../../workflows/workOrderWorkflow";

const initialWorkOrders = [
    {
        id: "WO-2025-0012",
        Title: "Fix lobby light",
        category: "Electrical",
        supplier: "Electro Services SA",
        requestedBy: "Admin User",
        amount: 1200,
        status: WORK_ORDER_STATUS.DRAFT,
        priority: "Medium",
        targetDate: "",
        createdBy: "admin-1",
        createdByName: "Admin User",
        version: 1,
        approvalHistory: [],
    },
];

function WorkOrders() {
    const { user } = useAuth();

    const [workOrders, setWorkOrders] =
        useState(initialWorkOrders);

    const [selectedWorkOrderId, setSelectedWorkOrderId] =
        useState(null);

    const selectedWorkOrder =
        workOrders.find(
            (workOrder) => workOrder.id === selectedWorkOrderId
        ) ?? null;
    const [showForm, setShowForm] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState("All");

    function handleCreateWorkOrder(newWorkOrder) {
        const timestamp = new Date().toISOString();

        const baseWorkOrder = {
            ...newWorkOrder,
            entityType: "Work Order",
            createdBy: user.id,
            createdByName: user.name,
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1,
        };

        const creationEvent = createAuditEvent({
            action: ACTIONS.CREATE,
            entityType: "Work Order",
            entityId: baseWorkOrder.id,
            entityVersion: baseWorkOrder.version,
            fromStatus: null,
            toStatus: WORK_ORDER_STATUS.DRAFT,
            user,
            timestamp,
            changes: Object.entries(newWorkOrder).map(
                ([field, value]) => ({
                    field,
                    oldValue: null,
                    newValue: value,
                })
            ),
        });

        const preparedWorkOrder = {
            ...baseWorkOrder,
            auditTrail: [creationEvent],

            // Temporary Supplier-workflow compatibility.
            approvalHistory: [creationEvent],
        };

        setWorkOrders((current) => [
            preparedWorkOrder,
            ...current,
        ]);
    }

    function handleSubmitWorkOrder(workOrderId) {
        try {
            setWorkOrders((current) =>
                current.map((workOrder) => {
                    if (workOrder.id !== workOrderId) {
                        return workOrder;
                    }

                    return submitWorkOrder(workOrder, user);
                })
            );
        } catch (error) {
            alert(error.message);
        }
    }

    function handleApproveWorkOrder(workOrderId) {
        try {
            const workOrder = workOrders.find(
                (item) => item.id === workOrderId
            );

            if (!workOrder) {
                throw new Error("Work Order not found.");
            }

            const updatedWorkOrder = approveWorkOrder(
                workOrder,
                user
            );

            setWorkOrders((current) =>
                current.map((item) =>
                    item.id === workOrderId
                        ? updatedWorkOrder
                        : item
                )
            );
        } catch (error) {
            alert(error.message);
        }
    }

    function handleRejectWorkOrder(workOrderId) {
        const comment = window.prompt(
            "Enter the reason for rejection:"
        );

        if (comment === null) {
            return;
        }

        try {
            const workOrder = workOrders.find(
                (item) => item.id === workOrderId
            );

            if (!workOrder) {
                throw new Error("Work Order not found.");
            }

            const updatedWorkOrder = rejectWorkOrder(
                workOrder,
                user,
                comment
            );

            setWorkOrders((current) =>
                current.map((item) =>
                    item.id === workOrderId
                        ? updatedWorkOrder
                        : item
                )
            );
        } catch (error) {
            alert(error.message);
        }
    }

    function handleViewWorkOrder(workOrderId) {
        setSelectedWorkOrderId(workOrderId);
    }

    function handleCloseDetails() {
        setSelectedWorkOrderId(null);
    }


    const filteredWorkOrders = workOrders.filter(
        (workOrder) => {
            const text =
                `${workOrder.id} ${workOrder.title} ${workOrder.supplier}`.toLowerCase();

            const matchesSearch = text.includes(
                search.toLowerCase()
            );

            const matchesStatus =
                statusFilter === "All" ||
                workOrder.status === statusFilter;

            return matchesSearch && matchesStatus;
        }
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Work Orders</h1>
                    <p>
                        Create, approve, and track condominium
                        maintenance work.
                    </p>
                </div>
            </div>

            <Can
                module={MODULES.WORK_ORDERS}
                action={ACTIONS.CREATE}
            >
                {showForm && (
                    <Card>
                        <div className="panel-title">
                            <h2>Create New Work Order</h2>
                        </div>

                            <WorkOrderForm
                                onCreateWorkOrder={
                                    handleCreateWorkOrder
                                }
                                workOrders={workOrders}

                                onCancel={() => setShowForm(false)}
                            />
                        </Card>
                )}
            </Can>

            <Card>
                <div className="panel-title">
                    <div>
                        <h2>Work Orders</h2>
                        <span>
                            {filteredWorkOrders.length} Total
                        </span>
                    </div>

                    <div className="table-tools">
                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search work orders..."
                        />

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="All">
                                All Statuses
                            </option>

                            {Object.values(
                                WORK_ORDER_STATUS
                            ).map((status) => (
                                <option
                                    key={status}
                                    value={status}
                                >
                                    {status}
                                </option>
                            ))}
                        </select>

                        <button className="secondary-button">
                            Filter
                        </button>

                        <button className="secondary-button">
                            Export
                        </button>
                    </div>
                </div>

                <WorkOrderTable
                    workOrders={filteredWorkOrders}
                    currentUser={user}
                    onViewWorkOrder={handleViewWorkOrder}
                    onSubmitWorkOrder={handleSubmitWorkOrder}
                    onApproveWorkOrder={handleApproveWorkOrder}
                    onRejectWorkOrder={handleRejectWorkOrder}
                />

                <div className="table-footer">
                    <p>
                        Showing 1 to{" "}
                        {filteredWorkOrders.length} of{" "}
                        {workOrders.length} results
                    </p>

                    <div className="pagination">
                        <button>‹</button>
                        <button className="active-page">
                            1
                        </button>
                        <button>2</button>
                        <button>›</button>
                    </div>
                </div>
            </Card>

            <Card>
            <h2>Work order details</h2>
                <WorkOrderDetailsPanel
                    workOrder={selectedWorkOrder}
                    onClose={handleCloseDetails}
                />
            </Card>

        </div>
    );
}
export default WorkOrders;  