import { useState } from "react";
import { suppliers as initialSuppliers } from "../../data/SuppliersData";
import Card from "../../components/common/Card";
import SupplierTable from "../../components/suppliers/SupplierTable";
import SupplierForm from "../../components/suppliers/SupplierForm";



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
  
  const [supplierList, setSupplierList] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  function handleCreateSupplier(newSupplier) {
    setSupplierList([newSupplier, ...supplierList]);
  }

  const filteredSuppliers = supplierList.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

          <Card>
          <div className="panel-title">
              <h2>Create a New Supplier</h2>
          </div> 
            <SupplierForm onCreateSupplier={handleCreateSupplier} />
          </Card>
          
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
            <SupplierTable suppliers={filteredSuppliers} />
          </Card>
        </main>
    
      </div>
    );
  }

export default Suppliers;