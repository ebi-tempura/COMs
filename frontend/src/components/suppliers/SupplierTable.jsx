import Can from "../security/Can";
import {
  ACTIONS,
  MODULES,
  ROLES,
  SUPPLIER_STATUS,
} from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

function getStatusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function SupplierTable({
  suppliers,
  onEditSupplier,
  onInactiveSupplier,
  onSubmitSupplier,
  onRfcValidation,
  onApproveSupplier,
  onRejectSupplier,
  onResubmitSupplier,
}) {
  const { user } = useAuth();
  const { statusLabel, t, valueLabel } = useLanguage();

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("supplierTable.id")}</th>
            <th>{t("supplierTable.type")}</th>
            <th>{t("supplierTable.name")}</th>
            <th>{t("supplierTable.category")}</th>
            <th>{t("supplierTable.status")}</th>
            <th>{t("supplierTable.rfc")}</th>
            <th>{t("supplierTable.actions")}</th>
          </tr>
        </thead>

        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td>{supplier.id}</td>
              <td>{valueLabel("supplierType", supplier.supplierType)}</td>
              <td>{supplier.name}</td>
              <td>{valueLabel("category", supplier.serviceCategory)}</td>
              <td>
                <span
                  className={`status-badge status-${getStatusClass(
                    supplier.status
                  )}`}
                >
                  {statusLabel(supplier.status)}
                </span>
              </td>
              <td>{supplier.rfc}</td>

              <td>
                <div className="icon-actions">
                  <Can module={MODULES.SUPPLIERS} action={ACTIONS.VIEW}>
                    <button type="button" aria-label={t("supplierTable.view")}>
                      👁
                    </button>
                    <button type="button" aria-label={t("supplierTable.more")}>
                      ⋮
                    </button>
                  </Can>

                  {supplier.status === SUPPLIER_STATUS.DRAFT && (
                    <Can module={MODULES.SUPPLIERS} action={ACTIONS.SUBMIT}>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onSubmitSupplier(supplier.id)}
                      >
                        {t("supplierTable.submit")}
                      </button>
                    </Can>
                  )}

                  {[
                    SUPPLIER_STATUS.REJECTED,
                    SUPPLIER_STATUS.RFC_VALIDATION_FAILED,
                    SUPPLIER_STATUS.MANUAL_RFC_REVIEW_REQUIRED,
                  ].includes(supplier.status) && (
                    <Can module={MODULES.SUPPLIERS} action={ACTIONS.RESUBMIT}>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onResubmitSupplier(supplier.id)}
                      >
                        {t("supplierTable.resubmit")}
                      </button>
                    </Can>
                  )}

                  {supplier.status === SUPPLIER_STATUS.PENDING_RFC_VALIDATION && (
                    <>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onRfcValidation(supplier.id, "valid")}
                      >
                        {t("supplierTable.rfcValid")}
                      </button>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onRfcValidation(supplier.id, "failed")}
                      >
                        {t("supplierTable.rfcFailed")}
                      </button>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onRfcValidation(supplier.id, "manualReview")}
                      >
                        {t("supplierTable.manualReview")}
                      </button>
                    </>
                  )}

                  {supplier.createdBy !== user.id &&
                    ((supplier.status ===
                      SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL &&
                      user.role === ROLES.PRESIDENT) ||
                      (supplier.status ===
                        SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL &&
                        user.role === ROLES.BOARD_MEMBER)) && (
                      <>
                        <Can module={MODULES.SUPPLIERS} action={ACTIONS.APPROVE}>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => onApproveSupplier(supplier.id)}
                          >
                            {t("supplierTable.approve")}
                          </button>
                        </Can>
                        <Can module={MODULES.SUPPLIERS} action={ACTIONS.REJECT}>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => onRejectSupplier(supplier.id)}
                          >
                            {t("supplierTable.reject")}
                          </button>
                        </Can>
                      </>
                    )}

                  <Can module={MODULES.SUPPLIERS} action={ACTIONS.EDIT}>
                    <button
                      className="table-action-button"
                      type="button"
                      onClick={() => onEditSupplier(supplier)}
                    >
                      {t("supplierTable.edit")}
                    </button>
                  </Can>

                  <Can
                    module={MODULES.SUPPLIERS}
                    action={ACTIONS.DELETE_INACTIVE}
                  >
                    <button
                      className="table-action-button"
                      type="button"
                      onClick={() => onInactiveSupplier(supplier.id)}
                    >
                      {t("supplierTable.inactive")}
                    </button>
                  </Can>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SupplierTable;
