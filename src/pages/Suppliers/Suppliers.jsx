import { useState } from "react";
import { suppliers as initialSuppliers } from "../../data/SuppliersData";
import Card from "../../components/common/Card";
import SupplierTable from "../../components/suppliers/SupplierTable";
import SupplierForm from "../../components/suppliers/SupplierForm";
import Can from "../../components/security/Can"

import { SupplierWorkflow } from "../../workflows/supplierWorkflow";

/*import {submitSupplier, 
  applyRfcValidation,   
  resubmitSupplier,
  approveSupplier,
  rejectSupplier} from "../../workflows/supplierWorkflow";
*/

import { ACTIONS, MODULES, SUPPLIER_STATUS} from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";

/*const STATUSES = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  ACTIVE: "Active",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};*/

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
    try {
      setSupplierList((current) =>
        current.map((supplier) =>
          supplier.id === supplierId
            ? SupplierWorkflow.approve(supplier, user)
            : supplier
        )
      );
    } catch (error) {
      window.alert(error.message);
    }
  }

  function handleRejectSupplier(supplierId) {
  const comment = window.prompt("Enter rejection reason:");

   if (comment === null) {
    return;
    }

    if (!comment.trim()) {
    window.alert("Rejection requires a comment.");
    return;
    }

    try {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? SupplierWorkflow.reject(supplier, user, comment)
          : supplier
      )
    );
    } catch (error) {
    window.alert(error.message);
    }
    }

  function handleSubmitSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? SupplierWorkflow.submit(supplier, user)
          : supplier
      )
    );
  }

  function handleRfcValidation(supplierId, result) {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? SupplierWorkflow.applyRfcValidation(supplier, result)
          : supplier
      )
    );
  }

  function handleResubmitSupplier(supplierId) {
    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId
          ? SupplierWorkflow.resubmit(supplier, user)
          : supplier
      )
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
              {Object.values(SUPPLIER_STATUS).map((status) => (
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