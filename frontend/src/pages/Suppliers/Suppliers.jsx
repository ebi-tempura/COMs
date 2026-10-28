import { useEffect, useRef, useState } from "react";
import Card from "../../components/common/Card";
import SupplierForm from "../../components/suppliers/SupplierForm";
import SupplierTable from "../../components/suppliers/SupplierTable";
import Can from "../../components/security/Can";
import {
  ACTIONS,
  MODULES,
  SUPPLIER_STATUS,
} from "../../security/constants";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { api } from "../../lib/api";

const SUPPLIERS_URL = "/api/suppliers/api/suppliers";

const APPROVAL_STEPS = {
  "Pending President Approval": {
    role: "President",
    endpoint: "president",
  },
  "Pending Treasurer Approval": {
    role: "Treasurer",
    endpoint: "treasurer",
  },
  "Pending Board Member Approval": {
    role: "Board Member",
    endpoint: "board-member",
  },
};

// Convert backend fields into the names your existing components use.
function mapSupplier(record) {
  return {
    ...record,
    id: record.supplier_id,
    name: record.supplier_name,
    supplierType: record.supplier_type,
    serviceCategory: record.service_category,
    contactPerson: record.contact,
    paymentMethod: record.payment_method,
    createdBy: record.created_by_user_id,
    createdAt: record.created_at,
  };
}

function Suppliers() {
  function handleSubmitSupplier (supplierId){
    return runSupplierAction(supplierId,"submit");
  }
  
  const { user } = useAuth();
  const { statusLabel, t} = useLanguage();
  
  const [supplierList, setSupplierList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationLock = useRef(false);  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setSupplierList([]);
    setError("");
    setLoading(true);

    if (!user?.account_id) {
      setLoading(false);
      return () => controller.abort();
    }

    async function loadSuppliers() {
      try {
        const records = await api(SUPPLIERS_URL, {
          signal: controller.signal,
        });

        if (!Array.isArray(records)) {
          throw new Error("The backend returned an invalid supplier list.");
        }

        if (active) {
          setSupplierList(records.map(mapSupplier));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load suppliers.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSuppliers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [user?.account_id]);

  const filteredSuppliers = supplierList.filter((supplier) => {
    const matchesSearch = supplier.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function handleCreateSupplier(form) {
  if (operationLock.current || !user?.account_id) return false;

  operationLock.current = true;
  setBusy(true);
  setError("");

  try {
    const payload = {
      account_id: user.account_id,
      supplier_type: form.supplierType.trim(),
      supplier_name: form.name.trim(),
      service_category: form.serviceCategory.trim(),
      contact: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      rfc: form.rfc.trim().toUpperCase(),
      address: form.address.trim(),
      clabe: form.clabe.trim(),
      payment_method: form.paymentMethod.trim(),
      notes: form.notes.trim() || null,
    };

    const requiredFields = [
      "supplier_type",
      "supplier_name",
      "service_category",
      "contact",
      "phone",
      "email",
      "rfc",
      "address",
      "clabe",
      "payment_method",
    ];

    if (requiredFields.some((field) => !payload[field])) {
      throw new Error("Complete every supplier field except Notes.");
    }

    if (payload.rfc.length < 12 || payload.rfc.length > 13) {
      throw new Error("RFC must contain 12 or 13 characters.");
    }

    if (!/^\d{18}$/.test(payload.clabe)) {
      throw new Error("CLABE must contain exactly 18 digits.");
    }

    const record = await api(SUPPLIERS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSupplierList((current) => [mapSupplier(record), ...current]);
    return true;
  } catch (err) {
    setError(err.message || "Unable to create supplier.");
    return false;
  } finally {
    operationLock.current = false;
    setBusy(false);
  }
}

async function runSupplierAction(supplierId, action) {
  if (operationLock.current) return;

  operationLock.current = true;
  setBusy(true);
  setError("");

  try {
    const record = await api(
      `${SUPPLIERS_URL}/${encodeURIComponent(supplierId)}/${action}`,
      { method: "POST" }
    );

    const updated = mapSupplier(record);

    setSupplierList((current) =>
      current.map((supplier) =>
        supplier.id === supplierId ? updated : supplier
      )
    );
  } catch (err) {
    setError(err.message || "Unable to update supplier.");
  } finally {
    operationLock.current = false;
    setBusy(false);
  }
}

async function handleSubmit(event) {
  return runSupplierAction(supplierId,"submit");
}

function handleApproveSupplier(supplierId) {
  const supplier = supplierList.find((item) => item.id === supplierId);
  const step = APPROVAL_STEPS[supplier?.status];

  if (!step || step.role !== user?.role) {
    setError("This supplier is not awaiting approval from your role.");
    return;
  }

  return runSupplierAction(supplierId, `approve-${step.endpoint}`);
}

function handleRejectSupplier(supplierId) {
  const supplier = supplierList.find((item) => item.id === supplierId);
  const step = APPROVAL_STEPS[supplier?.status];

  if (!step || step.role !== user?.role) {
    setError("This supplier is not awaiting review from your role.");
    return;
  }

  // The current backend does not accept a rejection comment.
  if (!window.confirm(`Reject supplier ${supplierId}?`)) return;

  return runSupplierAction(supplierId, `reject-${step.endpoint}`);
}

function showUnavailableAction() {
  setError("This action does not have a backend endpoint yet.");
}

function handleEditSupplier() {
  showUnavailableAction();
}

function handleInactiveSupplier() {
  showUnavailableAction();
}

function handleRfcValidation() {
  showUnavailableAction();
}

function handleResubmitSupplier() {
  showUnavailableAction();
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
            <fieldset
              disabled={busy || loading}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <SupplierForm onCreateSupplier={handleCreateSupplier} />
            </fieldset>
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
                {[...new Set(supplierList.map((supplier) => supplier.status))].map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <button className="secondary-button">{t("common.filter")}</button>
              <button className="secondary-button">{t("common.export")}</button>
            </div>
          </div>

          <fieldset
            disabled={busy || loading}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >


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
          </fieldset>
        </Card>
      </main>
        {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
        {error}
        </p>
        )}

        {loading && <p role="status">Loading suppliers…</p>}

    </div>
  );
}

export default Suppliers;
