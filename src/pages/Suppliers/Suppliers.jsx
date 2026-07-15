import { useState } from "react";
import { suppliers as initialSuppliers } from "../../data/SuppliersData";
import Card from "../../components/common/Card";
import SupplierTable from "../../components/suppliers/SupplierTable";
import SupplierForm from "../../components/suppliers/SupplierForm";
import Can from "../../components/security/Can"
import { submitSupplier } from "../../workflows/supplierWorkflow";

import { ACTIONS, MODULES, ROLES, SUPPLIER_STATUS } from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";

const STATUSES = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  ACTIVE: "Active",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

function Suppliers({userEmail}) {
  console.log(userEmail);
  
const {user} = useAuth();
const [supplierList, setSupplierList] = useState(initialSuppliers);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("All");
const filteredSuppliers = supplierList.filter((supplier) => {
  const matchesSearch =
    supplier.name.toLowerCase().includes(search.toLowerCase());

  const matchesStatus =
    statusFilter === "All" || supplier.status === statusFilter;

  return matchesSearch && matchesStatus;
});
  
  function handleCreateSupplier(newSupplier) {
    const supplierWithWorkflow = { 
      ... newSupplier,

      status: SUPPLIER_STATUS.DRAFT,
      createdBy: user.id,    
      createdByName: user.name,
      isActive: true,

      approvalHistory:[],
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSupplierList((current) => [supplierWithWorkflow, ...current]);
  }

  function handleEditSupplier(supplier) {
    console.log("Edit supplier:", supplier);
  }
  
  function handleInactiveSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? { ...supplier, status: "Inactive", isActive: false }
          : supplier
      )
    );
  }

  function handleApproveSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) => {
        if (supplier.id !== supplierId) {
          return supplier;
        }
  
        if (supplier.createdBy === user.id) {
          window.alert("You cannot approve your own supplier request.");
          return supplier;
        }
  
        let nextStatus;

        if (
          supplier.status === SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL
          ) {

        if (user.role !== ROLES.PRESIDENT) {
            window.alert("Only the President can approve this step.");
            return supplier;
          }

          nextStatus =
            SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL;
          } else if (
            supplier.status ===
            SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL
          ) {

        if (user.role !== ROLES.BOARD_MEMBER) {
            window.alert("Only a Board Member can approve this step.");
            return supplier;
            }

          nextStatus = SUPPLIER_STATUS.APPROVED;
        } else {
          return supplier;
        }
        return {
          ...supplier,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
  
          approvalHistory: [
            ...(supplier.approvalHistory || []),
            {
              action: ACTIONS.APPROVE,
              fromStatus: supplier.status,
              toStatus: nextStatus,
              byUserId: user.id,
              byUserName: user.name,
              byRole: user.role,
              at: new Date().toISOString(),
              comment: "",
            },
          ],
        };
      })
    );
  }

  function handleRejectSupplier(supplierId) {
    const comment = window.prompt("Enter rejection reason:");
  
    if (!comment || !comment.trim()) {
      window.alert("Rejection requires a comment.");
      return;
    }
  
    setSupplierList((current) =>
      current.map((supplier) => {
        if (supplier.id !== supplierId) {
          return supplier;
        }
  
        const isPresidentStep =
          supplier.status ===
          SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL;
  
        const isBoardMemberStep =
          supplier.status ===
          SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL;
  
        if (!isPresidentStep && !isBoardMemberStep) {
          window.alert("This supplier is not currently pending approval.");
          return supplier;
        }
  
        if (supplier.createdBy === user.id) {
          window.alert("You cannot reject your own supplier request.");
          return supplier;
        }
  
        if (isPresidentStep && user.role !== ROLES.PRESIDENT) {
          window.alert("Only the President can reject this step.");
          return supplier;
        }
  
        if (isBoardMemberStep && user.role !== ROLES.BOARD_MEMBER) {
          window.alert("Only a Board Member can reject this step.");
          return supplier;
        }
  
        return {
          ...supplier,
          status: SUPPLIER_STATUS.REJECTED,
          updatedAt: new Date().toISOString(),
  
          approvalHistory: [
            ...(supplier.approvalHistory || []),
            {
              action: ACTIONS.REJECT,
              fromStatus: supplier.status,
              toStatus: SUPPLIER_STATUS.REJECTED,
              byUserId: user.id,
              byUserName: user.name,
              byRole: user.role,
              at: new Date().toISOString(),
              comment: comment.trim(),
            },
          ],
        };
      })
    );
  }

  function handleSubmitSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? submitSupplier(supplier, user)
          : supplier
      )
    );
  }

  function handleRfcValidation(supplierId, result) {
    setSupplierList((current) =>
      current.map((supplier) => {
        if (supplier.id !== supplierId) {
          return supplier;
        }
  
        let nextStatus;
        let action;
  
        if (result === "valid") {
          nextStatus = SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL;
          action = "rfcValidated";
        } else if (result === "failed") {
          nextStatus = SUPPLIER_STATUS.RFC_VALIDATION_FAILED;
          action = "rfcValidationFailed";
        } else if (result === "manualReview") {
          nextStatus = SUPPLIER_STATUS.MANUAL_RFC_REVIEW_REQUIRED;
          action = "manualRfcReviewRequired";
        } else {
          return supplier;
        }
  
        return {
          ...supplier,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
  
          approvalHistory: [
            ...(supplier.approvalHistory || []),
            {
              action,
              fromStatus: supplier.status,
              toStatus: nextStatus,
              byUserId: "system",
              byUserName: "System",
              byRole: "System",
              at: new Date().toISOString(),
              comment: "",
            },
          ],
        };
      })
    );
  }

  function handleResubmitSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) => {
        if (supplier.id !== supplierId) {
          return supplier;
        }

        const canResubmit = [
          SUPPLIER_STATUS.REJECTED,
          SUPPLIER_STATUS.RFC_VALIDATION_FAILED,
          SUPPLIER_STATUS.MANUAL_RFC_REVIEW_REQUIRED,
        ].includes(supplier.status);

        if (!canResubmit) {
          return supplier;
        }

        const previousStatus = supplier.status;

        return {
          ...supplier,
          status: SUPPLIER_STATUS.PENDING_RFC_VALIDATION,
          updatedAt: new Date().toISOString(),
          resubmittedAt: new Date().toISOString(),

          approvalHistory: [
            ...(supplier.approvalHistory || []),
            {
              action: ACTIONS.RESUBMIT,
              fromStatus: previousStatus,
              toStatus: SUPPLIER_STATUS.PENDING_RFC_VALIDATION,
              byUserId: user.id,
              byUserName: user.name,
              byRole: user.role,
              at: new Date().toISOString(),
              comment: "",
            },
          ],
        };
      })
    );
}
    return (
      
      <div className="page-container">
        <main> 
        <div className="page-header">
          <div>
            <h1>Suppliers</h1>
              <p className="page-subtitle">Manage companies and individual contractors approved for condominium work.
              </p>
          </div>
        </div>  

        <Can module={MODULES.SUPPLIERS} action={ACTIONS.CREATE}>
          <Card>
          <div className="panel-title">
              <h2>Create a New Supplier</h2>
          </div> 
            <SupplierForm onCreateSupplier={handleCreateSupplier} />
          </Card>
        </Can>


          <Card>
            <div className="panel-title">
              <div>
                <h2> Supplier Directory</h2>
              </div>

              <div className="table-tools">
              <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search work orders..."
              />
              <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              {Object.values(STATUSES).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <button className="secondary-button">Filter</button>
            <button className="secondary-button">Export</button>
          </div>
        </div>
            <SupplierTable 
            
            suppliers={filteredSuppliers}
            onEditSupplier={handleEditSupplier}
            onInactiveSupplier={handleInactiveSupplier} 
            onSubmitSupplier={handleSubmitSupplier}
            onRfcValidation={handleRfcValidation}
            onApproveSupplier={handleApproveSupplier}
            onRejectSupplier={handleRejectSupplier}
            onResubmitSupplier={handleResubmitSupplier}

            />
          </Card>
        </main>
    
      </div>
    );
  }

export default Suppliers;