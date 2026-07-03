import { useState } from "react";
import { suppliers as initialSuppliers } from "../../data/SuppliersData";
import Card from "../../components/common/Card";
import SupplierTable from "../../components/suppliers/SupplierTable";
import SupplierForm from "../../components/suppliers/SupplierForm";

const STATUSES = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

function Suppliers() {
  const [supplierList, setSupplierList] = useState(initialSuppliers);

  function handleCreateSupplier(newSupplier) {
    setSupplierList([newSupplier, ...supplierList]);
  }

    return (
      
      <div className="suppliers-page">
        <main> 
          <div className="panel-title">
            <div>
            <h1>Suppliers</h1>
            <p className="page-subtitle">
              Manage companies and individual contractors approved for condominium work.</p>
            </div>
          </div> 

          <Card>
            <SupplierForm onCreateSupplier={handleCreateSupplier} />
          </Card>
          
          <Card>
            <h2> Supplier Directory</h2>
            <SupplierTable suppliers={supplierList} />
          </Card>
        </main>
    
      </div>
    );
  }

export default Suppliers;