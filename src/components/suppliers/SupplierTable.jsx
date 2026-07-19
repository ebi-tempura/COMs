import Can from "../security/Can";

import { ACTIONS,MODULES, ROLES, SUPPLIER_STATUS } from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";
/*import Button from "../common/Button";*/

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


function getStatusClass(status) {
    return status.toLowerCase().replaceAll(" ", "-");
  }

  const { user } = useAuth();

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>RFC</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td>{supplier.id}</td>
              <td>{supplier.supplierType}</td>
              <td>{supplier.name}</td>
              <td>{supplier.serviceCategory}</td>
              <td>
                <span
                 className={`status-badge status-${getStatusClass(supplier.status)}`}>
                {supplier.status}
                </span>
                </td>
              <td>{supplier.rfc}</td>

              <td>
  <div className="icon-actions">

    <Can module={MODULES.SUPPLIERS} action={ACTIONS.VIEW}>
      <button type="button">👁</button>
      <button type="button">⋮</button>
    </Can>

    {supplier.status === SUPPLIER_STATUS.DRAFT && (
      <Can module={MODULES.SUPPLIERS} action={ACTIONS.SUBMIT}>
        <button
          className="table-action-button"
          type="button"
          onClick={() => onSubmitSupplier(supplier.id)}
        >
          Submit
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
      Resubmit
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
        RFC Valid
      </button>

      <button
        className="table-action-button"
        type="button"
        onClick={() => onRfcValidation(supplier.id, "failed")}
      >
        RFC Failed
      </button>

      <button
        className="table-action-button"
        type="button"
        onClick={() => onRfcValidation(supplier.id, "manualReview")}
      >
        Manual Review
      </button>
    </>
  )}

{supplier.createdBy !== user.id &&
  ((supplier.status === SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL &&
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
          Approve
        </button>
      </Can>

      <Can module={MODULES.SUPPLIERS} action={ACTIONS.REJECT}>
        <button
          className="table-action-button"
          type="button"
          onClick={() => onRejectSupplier(supplier.id)}
        >
          Reject
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
        Edit
      </button>
    </Can>

    <Can module={MODULES.SUPPLIERS} action={ACTIONS.DELETE_INACTIVE}>
      <button
        className="table-action-button"
        type="button"
        onClick={() => onInactiveSupplier(supplier.id)}
      >
        Inactive
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