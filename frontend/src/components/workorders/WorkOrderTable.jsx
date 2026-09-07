import Can from "../security/Can";
import {
  ACTIONS,
  MODULES,
  ROLES,
  WORK_ORDER_STATUS,
} from "../../security/constants";
import { useLanguage } from "../../i18n/LanguageContext";

function getStatusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function canCurrentUserApprove(workOrder, currentUser) {
  const currentStep = workOrder.approvalRoute?.[workOrder.currentApprovalStep];

  if (
    !currentStep ||
    !currentUser ||
    workOrder.status === WORK_ORDER_STATUS.REJECTED ||
    workOrder.status === WORK_ORDER_STATUS.APPROVED
  ) {
    return false;
  }

  const isRequiredApprover = currentStep.role === currentUser.role;
  const isWorkOrderCreator = workOrder.createdBy === currentUser.id;

  return isRequiredApprover && !isWorkOrderCreator;
}

function canCurrentUserOperateWorkOrder(currentUser) {
  return [ROLES.STAFF, ROLES.MANAGER].includes(currentUser?.role);
}

function canCurrentUserApproveCompletion(workOrder, currentUser) {
  const currentStep =
    workOrder.completionApprovalRoute?.[
      workOrder.currentCompletionApprovalStep
    ];
   
  if (!currentStep || !currentUser) {
    return false;
  }
  const isRequiredApprover = currentStep.role === currentUser.role;
  const isCompletionSubmitter =
    workOrder.completionSubmittedBy?.userId === currentUser.id;

  return isRequiredApprover && !isCompletionSubmitter;
}

function WorkOrderTable({
  workOrders,
  currentUser,
  onViewWorkOrder,
  onSubmitWorkOrder,
  onApproveWorkOrder,
  onRejectWorkOrder,
  onStartWork,
  onSubmitCompletion,
  onApproveCompletion,
  onRejectCompletion,
  onEditWorkOrder,
  onInactiveWorkOrder,
  onCloseWorkOrderForm
}) {
  const { formatCurrency, statusLabel, t, userName, valueLabel } = useLanguage();
  
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("workOrderTable.id")}</th>
            <th>{t("workOrderTable.title")}</th>
            <th>{t("workOrderTable.category")}</th>
            <th>{t("workOrderTable.supplier")}</th>
            <th>{t("workOrderTable.requestedBy")}</th>
            <th>{t("workOrderTable.amount")}</th>
            <th>{t("workOrderTable.status")}</th>
            <th>{t("workOrderTable.priority")}</th>
            <th>{t("workOrderTable.actions")}</th>
          </tr>
        </thead>

        <tbody>
          {workOrders.map((workOrder) => (
            <tr key={workOrder.id}>
              <td>{workOrder.id}</td>
              <td>{workOrder.title}</td>
              <td>{valueLabel("category", workOrder.category)}</td>
              <td>{workOrder.supplier}</td>
              <td>{userName(workOrder.requestedBy)}</td>
              <td>{formatCurrency(workOrder.amount)}</td>
              <td>
                <span
                  className={`status-badge status-${getStatusClass(
                    workOrder.status
                  )}`}
                >
                  {statusLabel(workOrder.status)}
                </span>
              </td>
              <td>
                <span
                  className={`priority-dot priority-${workOrder.priority.toLowerCase()}`}
                />
                {valueLabel("priority", workOrder.priority)}
              </td>
              <td>
                <div className="icon-actions">
                  <Can module={MODULES.WORK_ORDERS} action={ACTIONS.VIEW}>
                    <button
                      type="button"
                      onClick={() => onViewWorkOrder(workOrder.id)}
                    >
                      {t("workOrderTable.view")}
                    </button>
                  </Can>

                  {workOrder.status === WORK_ORDER_STATUS.DRAFT && (
                    <Can module={MODULES.WORK_ORDERS} action={ACTIONS.SUBMIT}>
                      <button
                        type="button"
                        onClick={() => onSubmitWorkOrder(workOrder.id)}
                      >
                        {t("workOrderTable.submit")}
                      </button>
                    </Can>
                  )}

                  {canCurrentUserApprove(workOrder, currentUser) && (
                    <>
                      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.APPROVE}>
                        <button
                          type="button"
                          onClick={() => onApproveWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.approve")}
                        </button>
                      </Can>

                      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.REJECT}>
                        <button
                          type="button"
                          onClick={() => onRejectWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.reject")}
                        </button>
                      </Can>
                    </>
                  )}

                  {onEditWorkOrder &&
                    workOrder.status === WORK_ORDER_STATUS.DRAFT && (
                      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.EDIT}>
                        <button
                          type="button"
                          onClick={() => onEditWorkOrder(workOrder)}
                        >
                          {t("workOrderTable.edit")}
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
                        onClick={() => onInactiveWorkOrder(workOrder.id)}
                      >
                        {t("workOrderTable.inactive")}
                      </button>
                    </Can>
                  )}

                  {workOrder.status === WORK_ORDER_STATUS.APPROVED &&
                    canCurrentUserOperateWorkOrder(currentUser) && (
                      <Can
                        module={MODULES.WORK_ORDERS}
                        action={ACTIONS.START_WORK}
                      >
                        <button
                          type="button"
                          onClick={() => onStartWork(workOrder.id)}          
                        >
                            {t("workOrderTable.startWork")}
                        </button>
                      </Can>
                    )}

                  {[
                    WORK_ORDER_STATUS.IN_PROGRESS,
                    WORK_ORDER_STATUS.COMPLETION_REJECTED,
                  ].includes(workOrder.status) &&
                    canCurrentUserOperateWorkOrder(currentUser) && (
                      <Can
                        module={MODULES.WORK_ORDERS}
                        action={ACTIONS.COMPLETE_WORK}
                      >
                        <button
                          type="button"
                          onClick={() => onSubmitCompletion(workOrder.id)}
                        >
                          {t("workOrderTable.submitCompletion")}
                        </button>
                      </Can>
                    )}

                  {canCurrentUserApproveCompletion(workOrder, currentUser) && (
                    <>
                      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.APPROVE}>
                        <button
                          type="button"
                          onClick={() => onApproveCompletion(workOrder.id)}
                        >
                          {t("workOrderTable.approveCompletion")}
                        </button>
                      </Can>

                      <Can module={MODULES.WORK_ORDERS} action={ACTIONS.REJECT}>
                        <button
                          type="button"
                          onClick={() => onRejectCompletion(workOrder.id)}
                        >
                          {t("workOrderTable.rejectCompletion")}
                        </button>
                      </Can>
                    </>
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
