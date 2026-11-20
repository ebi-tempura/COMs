import { useLanguage } from "../../i18n/LanguageContext";
import { useEffect, useRef, useState } from "react";
import Card from "../../components/common/Card";
import { useAuth } from "../../auth/AuthContext";
import { api, apiDownload } from "../../lib/api";

function getStatusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function formatFlagReason(reason, ui) {
  const match = reason.match(
    /^Possible split purchase\. Current PO: (.+?)\. Related POs: (.+?)\. Combined amount: MXN ([\d,.]+)\.$/
  );
  if (!match) return ui(reason);

  return ui("Possible split purchase. Current PO: {current}. Related POs: {related}. Combined amount: MXN {amount}.", {
    current: match[1],
    related: match[2],
    amount: match[3],
  });
}

function POFlagCell({ order }) {
  const { ui } = useLanguage();
  const dialogRef = useRef(null);
  const headingId = `po-flag-heading-${order.database_id}`;

  if (!order.flag_reason) {
    return <span aria-label={ui("No flag")}></span>;
  }

  return (
    <>
      <button
        type="button"
        className="table-action-button"
        aria-label={ui("View flag reason for {number}", { number: order.purchase_order_number })}
        onClick={() => dialogRef.current.showModal()}
      >
        <span aria-hidden="true">🚩</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        style={{
          width: "min(28rem, calc(100% - 2rem))",
          whiteSpace: "normal",
          padding: 0,
          border: 0,
          borderRadius: "12px",
        }}
      >
        <div className="wo-modal">
          <h2 id={headingId}>{ui("Flagged purchase order")}</h2>
          <p><strong>{order.purchase_order_number}</strong></p>
          <p>{formatFlagReason(order.flag_reason, ui)}</p>

          <form method="dialog">
            <button type="button" class="secondary-button" onClick={() => dialogRef.current.close()}>
              {ui("Close")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

function PurchaseOrdersPage({ user }) {
  const { ui, statusLabel, valueLabel } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [attachmentOrder, setAttachmentOrder] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentError, setAttachmentError] = useState(null);
  const attachmentInputRef = useRef(null);

  const lock = useRef(false);
  const canCreate = CREATE_ROLES.includes(user.role);
  const canView = VIEW_ROLES.includes(user.role);



  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      setLoading(true);
      setError("");
      setLookupError("");

      if (!canView) {
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        api(PO_URL, { signal: controller.signal }),
        api(SUPPLIERS_URL, { signal: controller.signal }),
        canCreate
          ? api(WORK_ORDERS_URL, { signal: controller.signal })
          : Promise.resolve([]),
      ]);

      if (!active) return;

      const [poResult, supplierResult, woResult] = results;
      const lookupErrors = [];

      if (
        poResult.status === "fulfilled" &&
        Array.isArray(poResult.value)
      ) {
        setOrders(poResult.value);
      } else {
        setOrders([]);
        setError(
          poResult.status === "rejected"
            ? poResult.reason.message
            : ui("The backend returned an invalid purchase-order list.")
        );
      }

      if (
        supplierResult.status === "fulfilled" &&
        Array.isArray(supplierResult.value)
      ) {
        setSuppliers(supplierResult.value);
      } else {
        setSuppliers([]);
        lookupErrors.push(ui("Unable to load suppliers. Click Refresh to retry."));
      }

      if (
        woResult.status === "fulfilled" &&
        Array.isArray(woResult.value)
      ) {
        setWorkOrders(woResult.value);
      } else {
        setWorkOrders([]);
        lookupErrors.push(
          ui("Unable to load work orders. Click Refresh before linking one.")
        );
      }

      setLookupError(lookupErrors.join(" "));
      setLoading(false);
    }

    loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload, canView, canCreate]);

  const approvedSuppliers = suppliers.filter(
    (supplier) =>
      supplier.status === "Approved" && supplier.is_active !== false
  );

  // Matches the current PO backend's exact eligibility check.
  const eligibleWorkOrders = workOrders.filter((workOrder) =>
    ["Authorized Work Order", "Completed", "Approved"].includes(workOrder.status)
  );

  const supplierNames = new Map(
    suppliers.map((supplier) => [
      supplier.supplier_id,
      supplier.supplier_name,
    ])
  );

  const filteredOrders = orders.filter((order) => {
    const text = [
      order.purchase_order_number,
      order.title,
      order.supplier_id,
      supplierNames.get(order.supplier_id),
      order.work_order_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search.trim().toLowerCase()) &&
      (statusFilter === "All" || order.status === statusFilter)
    );
  });

  const statuses = [...new Set(orders.map((order) => order.status))];

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFileSelection(event) {
    const newFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (newFiles.length === 0) return;

    setAttachmentError("");

    // Keep existing files and skip duplicate selections.
    const combinedFiles = [...selectedFiles];

    for (const file of newFiles) {
      const alreadySelected = combinedFiles.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );

      if (!alreadySelected) {
        combinedFiles.push(file);
      }
    }

    if (combinedFiles.length > 5) {
      setAttachmentError(ui("You can select a maximum of 5 files."));
      return;
    }

    if (
      combinedFiles.some(
        (file) => !/\.(pdf|jpe?g|png)$/i.test(file.name)
      )
    ) {
      setAttachmentError(ui("Only PDF, JPG, JPEG and PNG files are allowed."));
      return;
    }

    if (
      combinedFiles.some(
        (file) => file.size === 0 || file.size > 10 * 1024 * 1024
      )
    ) {
      setAttachmentError(
        ui("Files must not be empty and cannot exceed 10 MiB each.")
      );
      return;
    }

    const totalSize = combinedFiles.reduce(
      (total, file) => total + file.size,
      0
    );

    if (totalSize > 25 * 1024 * 1024) {
      setAttachmentError(ui("The selected files cannot exceed 25 MiB combined."));
      return;
    }

    setSelectedFiles(combinedFiles);
  }
  async function createOrder(event) {
    event.preventDefault();
    if (lock.current) return;

    setError("");
    setMessage("");

    if (!form.title.trim() || !form.description.trim()) {
      setError(ui("Enter a title and description."));
      return;
    }

    if (
      !approvedSuppliers.some(
        (supplier) => supplier.supplier_id === form.supplier_id
      )
    ) {eligibleWorkOrders
      setError(ui("Select an approved supplier."));
      return;
    }

    if (
      form.work_order_number &&
      !eligibleWorkOrders.some(
        (order) => order.work_order_number === form.work_order_number
      )
    ) {
      setError(ui("Select an eligible work order or choose No work order."));
      return;
    }

    if (
      !/^\d{1,10}(\.\d{1,2})?$/.test(form.amount) ||
      Number(form.amount) <= 0
    ) {
      setError(ui("Enter a positive amount with no more than two decimals."));
      return;
    }

    lock.current = true;
    setBusy(true);

    try {
      const saved = await api(PO_URL, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          supplier_id: form.supplier_id,
          work_order_number: form.work_order_number || null,
          amount: form.amount,
          priority: form.priority,
          description: form.description.trim(),
        }),
      });

      // The PO has been saved successfully.
      setOrders((current) => [saved, ...current]);
      setForm({ ...EMPTY_FORM });
      setStatusFilter("All");
      setSearch("");
      setAttachmentError("");

      // Keep a copy for uploading, then clear the creation form's selection.
      const filesToUpload = [...selectedFiles];
      setSelectedFiles([]);

      if (filesToUpload.length === 0) {
        setMessage(ui("{number} saved as Draft.", { number: saved.purchase_order_number }));
      } else {
        setMessage(
          ui("{number} saved as Draft. Uploading attachments…", { number: saved.purchase_order_number })
        );

        const uploadData = new FormData();

        filesToUpload.forEach((file) => {
          uploadData.append("files", file);
        });

        try {
          const uploadResult = await api(
            `${PO_URL}/${encodeURIComponent(
              saved.purchase_order_number
            )}/attachments`,
            {
              method: "POST",
              body: uploadData,
            }
          );

          // This endpoint can return HTTP 200 even when individual files fail.
          if (!Array.isArray(uploadResult.results)) {
            throw new Error(ui("Unexpected attachment upload response."));
          }

          const failedFiles = uploadResult.results.filter(
            (result) => result.status_code !== 201
          );

          setMessage(
            ui("{number} saved as Draft. {uploaded} attachment(s) uploaded; {failed} failed.", {
              number: saved.purchase_order_number,
              uploaded: uploadResult.uploaded_count,
              failed: uploadResult.failed_count,
            })
          );

          if (failedFiles.length > 0) {
            setError(
              failedFiles
                .map(
                  (result) =>
                    `${result.original_filename}: ${
                      result.error || ui("Upload failed.")
                    }`
                )
                .join(" ") + " " +
              ui("The PO already exists as {number}.", { number: saved.purchase_order_number }) + " " +
              ui("Check its saved attachments before retrying. Do not create another PO.")
            );
          }
        } catch (uploadError) {
          setMessage(ui("{number} saved as Draft.", { number: saved.purchase_order_number }));

          setError(
            ui("Could not confirm all attachment uploads: {error}", { error: uploadError.message }) + " " +
            ui("The PO already exists as {number}.", { number: saved.purchase_order_number }) + " " +
            ui("Check its saved attachments before retrying. Do not create another PO.")
          );
        }
      }
    } catch (err){
      setError(err.message || ui("Unable to create purchase order."));
    } finally{
      lock.current = false;
      setBusy(false);
    }
  }

  async function performAction(order, action) {
    if (lock.current) return;

    let payload;

    if (action === "reject") {
      const comment = window.prompt(ui("Enter the rejection reason:"));

      if (comment === null) return;

      if (!comment.trim()) {
        setError(ui("A rejection reason is required."));
        return;
      }

      payload = { comment: comment.trim() };
    }

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const saved = await api(
        `${PO_URL}/${encodeURIComponent(order.purchase_order_number)}/${action}`,
        {
          method: "POST",
          ...(payload ? { body: JSON.stringify(payload) } : {}),
        }
      );

      setOrders((current) =>
        current.map((item) =>
          item.database_id === saved.database_id ? saved : item
        )
      );

      setMessage(`${saved.purchase_order_number}: ${statusLabel(saved.status)}`);
    } catch (err) {
      setError(err.message || ui("Unable to update purchase order."));
    } finally {
      lock.current = false;
      setBusy(false);
    }

    if (action === "delete") {
      const orderNumber = order.purchase_order_number;

      await api(`${PO_URL}/${encodeURIComponent(orderNumber)}`, {
        method: "DELETE",
      });

      setOrders((current) =>
        current.filter((item) => item.purchase_order_number !== orderNumber)
      );

      setMessage(ui("{number}: draft deleted.", { number: orderNumber }));
      return;
    }
  }

  if (!canView) {
    return <p>{ui("Your role does not have access to purchase orders.")}</p>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{ui("Purchase Orders")}</h1>
          <p className="page-subtitle">
            {ui("Create purchase requests and track their approvals.")}
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={loading || busy}
          onClick={() => setReload((value) => value + 1)}
        >
          {ui("Refresh")}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {lookupError && <p role="alert">{lookupError}</p>}
      {message && <p role="status">{message}</p>}
      {loading && <p role="status">{ui("Loading purchase orders…")}</p>}

      {canCreate && (
        <Card>
          <div className="panel-title">
            <h2>{ui("Create purchase order")}</h2>
          </div>

          <form onSubmit={createOrder}>
            <fieldset
              disabled={loading || busy}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="po-title">{ui("Title*")}</label>
                  <input
                    id="po-title"
                    name="title"
                    value={form.title}
                    onChange={changeForm}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-supplier">{ui("Supplier*")}</label>
                  <select
                    id="po-supplier"
                    name="supplier_id"
                    value={form.supplier_id}
                    onChange={changeForm}
                    required
                  >
                    <option value="">{ui("Select an approved supplier")}</option>
                    {approvedSuppliers.map((supplier) => (
                      <option
                        key={supplier.database_id}
                        value={supplier.supplier_id}
                      >
                        {supplier.supplier_name} — {supplier.supplier_id}
                      </option>
                    ))}
                  </select>

                  {!loading && approvedSuppliers.length === 0 && (
                    <small>
                      {ui("An approved supplier is required to create a PO.")}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="po-work-order">
                    {ui("Work order — optional")}
                  </label>
                  <select
                    id="po-work-order"
                    name="work_order_number"
                    value={form.work_order_number}
                    onChange={changeForm}
                  >
                    <option value="">{ui("No work order")}</option>
                    {eligibleWorkOrders.map((order) => (
                      <option
                        key={order.database_id}
                        value={order.work_order_number}
                      >
                        {order.work_order_number} — {order.title}
                      </option>
                    ))}
                  </select>
                  <small>{ui("Only eligible approved work orders are listed.")}</small>
                </div>

                <div className="form-group">
                  <label htmlFor="po-amount">{ui("Amount — MXN*")}</label>
                  <input
                    id="po-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={form.amount}
                    onChange={changeForm}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="po-priority">{ui("Priority*")}</label>
                  <select
                    id="po-priority"
                    name="priority"
                    value={form.priority}
                    onChange={changeForm}
                  >
                    {["Low", "Medium", "High"].map((priority) => (
                      <option key={priority} value={priority}>
                        {valueLabel("priority", priority)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group form-wide">
                  <label htmlFor="po-description">{ui("Description*")}</label>
                  <textarea
                    id="po-description"
                    name="description"
                    value={form.description}
                    onChange={changeForm}
                    rows={4}
                    required
                  />
                </div>
                
                <div className="attachment-box form-wide">
                  <strong>{ui("Attachments")}</strong>
                  <p>{ui("Select an invoice or supporting documents.")}</p>

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    hidden
                    onChange={handleFileSelection}
                  />

                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    {ui("Browse files")}
                  </button>

                  <p>
                    <small>
                      {ui("Maximum 5 files, 10 MiB per file and 25 MiB combined. Browsing again to add more files.")}
                    </small>
                  </p>

                  {attachmentError && (
                    <p role="alert" style={{ color: "#b91c1c" }}>
                      {attachmentError}
                    </p>
                  )}

                  {selectedFiles.length > 0 && (
                    <ul>
                      {selectedFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <span style ={{ fontSize: "13px" }}>
                            {file.name} — {(file.size / 1024).toFixed(1)} KiB
                            </span>
                          {" "}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles((current) =>
                                current.filter((_, position) => position !== index)
                              )
                            }
                          >
                            X
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="form-actions form-wide">
                  <button
                    type="submit"
                    className="primary-action-button"
                    disabled={approvedSuppliers.length === 0}
                  >
                    {busy ? ui("Saving…") : ui("Create draft")}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </Card>
      )}

      <Card>
        <div className="panel-title">
          <div className="table-tools">
            <input
              aria-label={ui("Search purchase orders")}
              placeholder={ui("Search number, title, or supplier…")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label={ui("Filter by status")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">{ui("All statuses")}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper"> 
          <table className="data-table">
            <thead>
              <tr>
                <th>{ui("PO number")}</th>
                <th>{ui("Title / description")}</th>
                <th>{ui("Supplier")}</th>
                <th>{ui("Work order")}</th>
                <th>{ui("Amount")}</th>
                <th>{ui("Status")}</th>
                <th>{ui("Attachments")}</th>
                <th>{ui("Flag Reason")}</th>
                <th>{ui("Actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const step = APPROVAL_STEPS[order.status];
                const canReview =
                  step?.role === user.role &&
                  order.created_by_user_id !== user.id;

                return (
                  <tr key={order.database_id}>
                    <td>{order.purchase_order_number}</td>
                    <td>
                      <strong>{order.title}</strong>
                      <details>
                        <summary>{ui("View description")}</summary>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {order.description}
                        </p>
                      </details>
                    </td>
                    <td>
                      {supplierNames.get(order.supplier_id) ||
                        order.supplier_id}
                    </td>
                    <td>{order.work_order_number || "—"}</td>
                    <td>{money.format(Number(order.amount))}</td>
                    <td>
                      <span className= {`status-badge status-${getStatusClass(order.status)}`}>
                      {order.status?.toLowerCase().startsWith("reject")
                        ? ui("Rejected")
                        : statusLabel(order.status)}
                      </span>
                    </td>

                    <td> <POAttachmentsCell
                          purchaseOrderNumber={order.purchase_order_number}
                          userRole={user.role}
                        refreshKey={`${reload}:${busy}`}
                    /></td>

                    <td>
                      <POFlagCell order={order} />
                    </td>
                    
                    <td>
                      <div className="icon-actions">
                        {order.status === "Draft" && canCreate && (
                          <button
                            type="button"
                            className="table-action-button"
                            disabled={busy || loading}
                            onClick={() => performAction(order, "submit")}
                          >
                            {ui("Submit")}
                          </button>
                        )}
                          
                        {order.status === "Draft" &&
                          ["Manager", "Staff"].includes(user.role) && (
                            <button
                              type="button"
                              className="table-action-button"
                              disabled={busy || loading}
                              onClick={() => {
                                if (window.confirm(ui("Delete this draft purchase order?"))) {
                                  performAction(order, "delete");
                                }
                              }}
                            >
                              {ui("Delete draft")}
                            </button>
                          )}
                          
                        {canReview && (
                          <>
                            <button
                              type="button"
                              className="table-action-button"
                              disabled={busy || loading}
                              onClick={() =>
                                performAction(order, step.action)
                              }
                            >
                              {ui("Approve")}
                            </button>
                            
                        

                            <button
                              type="button"
                              className="table-action-button"
                              disabled={busy || loading}
                              onClick={() => performAction(order, "reject")}
                            >
                              {ui("Reject")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8}>{ui("No purchase orders found.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
  
  function POAttachmentsCell({ purchaseOrderNumber, userRole, refreshKey }) {
  const { ui } = useLanguage();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [retry, setRetry] = useState(0);
  const downloadLock = useRef(false);

  const canRead = [
    "Admin",
    "Manager",
    "Staff",
    "President",
    "Treasurer",
    "Board Member",
  ].includes(userRole);

  const attachmentsUrl =
    `${PO_URL}/${encodeURIComponent(purchaseOrderNumber)}/attachments`;

  useEffect(() => {
    if (!canRead) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError("");

    api(attachmentsUrl, { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error(ui("Invalid attachment list."));
        }

        if (active) setAttachments(result);
      })
      .catch((err) => {
        if (active) {
          setAttachments([]);
          setError(err.message || ui("Unable to load attachments."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort(); 
    };
  }, [attachmentsUrl, canRead, refreshKey, retry]);

  async function downloadAttachment(attachment) {
    if (!canRead || downloadLock.current) return;

    downloadLock.current = true;
    setDownloading(attachment.attachment_number);
    setError("");

    try {
      await apiDownload(
        `${attachmentsUrl}/${encodeURIComponent(
          attachment.attachment_number
        )}/download`,
        attachment.original_filename
      );
    } catch (err) {
      setError(err.message || ui("Unable to download attachment."));
    } finally {
      downloadLock.current = false;
      setDownloading(null);
    }
  }

  if (!canRead) return <span>{ui("Not permitted")}</span>;
  if (loading) return <span>{ui("Loading…")}</span>;

  return (
    <div>
      {error && (
        <div>
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            {ui("Refresh attachments")}
          </button>
        </div>
      )}

      {attachments.length > 0 ? (
        <>
          <button
            type="button"
            className="table-action-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {attachments.length} 📎
          </button>

          {expanded && (
            <ul>
              {attachments.map((attachment) => (
                <li key={attachment.attachment_number}>
                  <span style={{ overflowWrap: "anywhere" }}>
                    {attachment.original_filename}
                  </span>
                  {" "}
                  <button
                    type="button"
                    disabled={downloading !== null}
                    onClick={() => downloadAttachment(attachment)}
                  >
                    {downloading === attachment.attachment_number
                      ? ui("Downloading…")
                      : ui("Download")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        !error && <span>📎</span>
      )}
    </div>
  );
}
}

const PO_URL = "/api/purchase-orders";
const SUPPLIERS_URL = "/api/suppliers/api/suppliers";
const WORK_ORDERS_URL = "/api/work_orders/api/work-orders";

const CREATE_ROLES = ["Admin", "Manager", "Staff"];
const VIEW_ROLES = [...CREATE_ROLES, "President", "Treasurer", "Board Member"];
const money = new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN",});

const APPROVAL_STEPS = {
  "Pending President Approval": {
    role: "President",
    action: "approve-president",
  },
  "Pending Treasurer Approval": {
    role: "Treasurer",
    action: "approve-treasurer",
  },
  "Pending Board Member Approval": {
    role: "Board Member",
    action: "approve-board-member",
  },
};
const EMPTY_FORM = {
  title: "",
  supplier_id: "",
  work_order_number: "",
  amount: "",
  priority: "Medium",
  description: "",
};

export default function PurchaseOrders() {
  const { user } = useAuth();

  // Reset page state when the account or signed-in identity changes.
  if (!user) return null;

  return (
    <PurchaseOrdersPage
      key={`${user.account_id}:${user.id}:${user.role}`}
      user={user}
    />
  );
}
