import Can from "../security/Can";
import {
  ROLES,
  WORK_ORDER_STATUS,
} from "../../security/constants";
import { useLanguage } from "../../i18n/LanguageContext";

const APPROVER_BY_STATUS = {
  [WORK_ORDER_STATUS.PENDING_PRESIDENT_APPROVAL]: ROLES.PRESIDENT,
  [WORK_ORDER_STATUS.PENDING_TREASURER_APPROVAL]: ROLES.TREASURER,
  [WORK_ORDER_STATUS.PENDING_BOARD_MEMBER_APPROVAL]: ROLES.BOARD_MEMBER,
};

export default function WorkOrderTable({
  workOrders,
  currentUser,
  disabled = false,
  onViewWorkOrder,
  onSubmitWorkOrder,
  onApproveWorkOrder,
  onRejectWorkOrder,
}) {
  const { formatCurrency, statusLabel, t, valueLabel } = useLanguage();

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
          {workOrders.map((workOrder) => {
            const isCreator = workOrder.createdBy === currentUser?.id;

            const canSubmit =
              workOrder.status === "Draft" &&
              isCreator &&
              ["Staff", "Manager"].includes(currentUser?.role);

            const canReview =
              Boolean(currentUser) &&
              !isCreator &&
              APPROVER_BY_STATUS[workOrder.status] === currentUser.role;

            return (
              <tr key={workOrder.id}>
                <td>{workOrder.id}</td>
                <td>{workOrder.title}</td>
                <td>{valueLabel("category", workOrder.category)}</td>
                <td>{workOrder.supplier}</td>
                <td>{workOrder.requestedBy}</td>
                <td>{formatCurrency(workOrder.amount)}</td>

                <td>
                  <span
                    className={`status-badge status-${workOrder.status
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
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
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onViewWorkOrder(workOrder.id)}
                    >
                      {t("workOrderTable.view")}
                    </button>

                    {canSubmit && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSubmitWorkOrder(workOrder.id)}
                      >
                        {t("workOrderTable.submit")}
                      </button>
                    )}

                    {canReview && (
                      <>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onApproveWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.approve")}
                        </button>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onRejectWorkOrder(workOrder.id)}
                        >
                          {t("workOrderTable.reject")}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {!disabled && workOrders.length === 0 && (
            <tr>
              <td colSpan={9}>No work orders found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}