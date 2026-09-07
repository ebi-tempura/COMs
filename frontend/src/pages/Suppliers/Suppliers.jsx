import { useState } from "react";
import { suppliers as initialSuppliers } from "../../data/SuppliersData";
import Card from "../../components/common/Card";
import SupplierTable from "../../components/suppliers/SupplierTable";
import SupplierForm from "../../components/suppliers/SupplierForm";
import Can from "../../components/security/Can";
import { SupplierWorkflow } from "../../workflows/supplierWorkflow";
import {
  ACTIONS,
  MODULES,
  SUPPLIER_STATUS,
} from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

function Suppliers() {
  const { user } = useAuth();
  const { statusLabel, t, workflowMessage } = useLanguage();
  const [supplierList, setSupplierList] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredSuppliers = supplierList.filter((supplier) => {
    const matchesSearch = supplier.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function handleCreateSupplier(newSupplier) {
    const timestamp = new Date().toISOString();
    const supplierWithWorkflow = {
      ...newSupplier,
      status: SUPPLIER_STATUS.DRAFT,
      createdBy: user.id,
      createdByName: user.name,
      isActive: true,
      approvalHistory: [],
      createdAt: timestamp,
      updatedAt: timestamp,
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
          ? {
              ...supplier,
              status: SUPPLIER_STATUS.INACTIVE,
              isActive: false,
            }
          : supplier
      )
    );
  }

  function showWorkflowError(error) {
    window.alert(workflowMessage(error.message));
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
      showWorkflowError(error);
    }
  }

  function handleRejectSupplier(supplierId) {
    const comment = window.prompt(t("suppliers.rejectionPrompt"));

    if (comment === null) {
      return;
    }

    if (!comment.trim()) {
      window.alert(t("suppliers.rejectionRequired"));
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
      showWorkflowError(error);
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
            <h1>{t("suppliers.title")}</h1>
            <p className="page-subtitle">{t("suppliers.subtitle")}</p>
          </div>
        </div>

        <Can module={MODULES.SUPPLIERS} action={ACTIONS.CREATE}>
          <Card>
            <div className="panel-title">
              <h2>{t("suppliers.createTitle")}</h2>
            </div>
            <SupplierForm onCreateSupplier={handleCreateSupplier} />
          </Card>
        </Can>

        <Card>
          <div className="panel-title">
            <div>
              <h2>{t("suppliers.directory")}</h2>
            </div>

            <div className="table-tools">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("suppliers.searchPlaceholder")}
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">{t("common.allStatuses")}</option>
                {Object.values(SUPPLIER_STATUS).map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <button className="secondary-button">{t("common.filter")}</button>
              <button className="secondary-button">{t("common.export")}</button>
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
