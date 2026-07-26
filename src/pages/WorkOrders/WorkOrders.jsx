import { useState } from "react";
import Card from "../../components/common/Card";
import Can from "../../components/security/Can";
import WorkOrderForm from "../../components/workorders/WorkOrderForm";
import WorkOrderTable from "../../components/workorders/WorkOrderTable";
import WorkOrderDetailsPanel from "../../components/workorders/WorkOrderDetailsPanel";
import { createAuditEvent } from "../../workflows/workflowEngine";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  ACTIONS,
  MODULES,
  WORK_ORDER_STATUS,
} from "../../security/constants";
import {
  approveWorkOrder,
  rejectWorkOrder,
  submitWorkOrder,
  startWorkOrder,
  submitWorkOrderCompletion,
  approveWorkOrderCompletion,
  rejectWorkOrderCompletion,
} from "../../workflows/workOrderWorkflow";

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
    type: "Normal",
    targetDate: "",
    description: "Replace the damaged lobby light fixture.",
    createdBy: "admin-1",
    createdByName: "Admin User",
    version: 1,
    approvalHistory: [],
  },
];

function WorkOrders() {
  const { user } = useAuth();
  const { statusLabel, t, workflowMessage } = useLanguage();
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const selectedWorkOrder =
    workOrders.find((workOrder) => workOrder.id === selectedWorkOrderId) ?? null;

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

    setWorkOrders((current) => [preparedWorkOrder, ...current]);
  }

  function updateWorkOrder(workOrderId, updateFunction) {
    const workOrder = workOrders.find((item) => item.id === workOrderId);

    if (!workOrder) {
      throw new Error("Work Order not found.");
    }

    const updatedWorkOrder = updateFunction(workOrder);

    setWorkOrders((current) =>
      current.map((item) => (item.id === workOrderId ? updatedWorkOrder : item))
    );
  }

  function showWorkflowError(error) {
    window.alert(workflowMessage(error.message));
  }

  function handleSubmitWorkOrder(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) => submitWorkOrder(workOrder, user));
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleApproveWorkOrder(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) => approveWorkOrder(workOrder, user));
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleRejectWorkOrder(workOrderId) {
    const comment = window.prompt(t("workOrders.rejectionPrompt"));

    if (comment === null) {
      return;
    }

    try {
      updateWorkOrder(workOrderId, (workOrder) =>
        rejectWorkOrder(workOrder, user, comment)
      );
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleStartWork(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) => startWorkOrder(workOrder, user));
    } catch (error) {
      showWorkflowError(error);
    }
  }

  function handleSubmitCompletion(workOrderId) {
    try {
      updateWorkOrder(workOrderId, (workOrder) =>
        submitWorkOrderCompletion(workOrder, user)
      );
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
          <h1>{t("workOrders.title")}</h1>
          <p>{t("workOrders.subtitle")}</p>
        </div>
      </div>

      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.CREATE}>
        {showForm && (
          <Card>
            <div className="panel-title">
              <h2>{t("workOrders.createTitle")}</h2>
            </div>

            <WorkOrderForm
              onCreateWorkOrder={handleCreateWorkOrder}
              workOrders={workOrders}
              onCancel={() => setShowForm(false)}
            />
          </Card>
        )}
      </Can>

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
              {Object.values(WORK_ORDER_STATUS).map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>

            <button className="secondary-button">{t("common.filter")}</button>
            <button className="secondary-button">{t("common.export")}</button>
          </div>
        </div>

        <WorkOrderTable
          workOrders={filteredWorkOrders}
          currentUser={user}
          onViewWorkOrder={setSelectedWorkOrderId}
          onSubmitWorkOrder={handleSubmitWorkOrder}
          onApproveWorkOrder={handleApproveWorkOrder}
          onRejectWorkOrder={handleRejectWorkOrder}
          onStartWork={handleStartWork}
          onSubmitCompletion={handleSubmitCompletion}
          onApproveCompletion={handleApproveCompletion}
          onRejectCompletion={handleRejectCompletion}
        />

        <div className="table-footer">
          <p>
            {t("common.showingResults", {
              shown: filteredWorkOrders.length,
              total: workOrders.length,
            })}
          </p>

          <div className="pagination">
            <button>‹</button>
            <button className="active-page">1</button>
            <button>2</button>
            <button>›</button>
          </div>
        </div>
      </Card>

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

export default WorkOrders;
