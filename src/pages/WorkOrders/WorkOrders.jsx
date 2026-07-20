import { useState } from "react";

import Card from "../../components/common/Card";
import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import Can from "../../components/security/Can";

import { useAuth } from "../../auth/AuthContext";

import {
    ACTIONS,
    MODULES,
    WORK_ORDER_STATUS,
} from "../../security/constants";

import { submitWorkOrder } from "../../workflows/workOrderWorkflow";

const initialWorkOrders = [
    {
        id: "WO-2025-0012",
        title: "Fix lobby light",
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

    const [showForm, setShowForm] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState("All");

    function handleCreateWorkOrder(newWorkOrder) {
        const preparedWorkOrder = {
            ...newWorkOrder,
            createdBy: user.id,
            createdByName: user.name,
            version: 1,
            approvalHistory: [],
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
                    onSubmitWorkOrder={
                        handleSubmitWorkOrder
                    }
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
        </div>
    );
}

export default WorkOrders;  