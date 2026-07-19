import { useState } from "react";
import Button from "../common/Button";
const initialForm = {
  title: "",
  supplier: "",
  amount: "",
  priority: "Medium",
  category: "",
  location: "",
  requestedBy: "",
  targetDate: "",
  description: "",
};

function WorkOrderForm({ onCreateWorkOrder, onCancel }) {
  const [formData, setFormData] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const currentYear = new Date().getFullYear();

    const newWorkOrder = {
      id: `WO-${currentYear}-${String(Date.now()).slice(-4)}`,
      title: formData.title,
      category: formData.category,
      supplier: formData.supplier,
      requestedBy: formData.requestedBy,
      amount: Number(formData.amount),
      status: "Draft",
      priority: formData.priority,
      targetDate: formData.targetDate,
      location: formData.location,
      description: formData.description,
    };

    onCreateWorkOrder(newWorkOrder);
    setFormData(initialForm);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Title *</label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter work order title"
          required
        />
      </div>

      <div className="form-group">
        <label>Supplier *</label>
        <select
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          placeholder="Supplier"
          required
        >
          <option value="">Select supplier</option>
          <option>Electro Services SA</option>
          <option>Aqua Solutions</option>
          <option>BuildWell Co.</option>
          <option>Lift Experts</option>
          <option>GreenCare</option>
        </select>
      </div>

      <div className="form-group">
        <label>Requested Amount (MXN) *</label>
        <input
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          placeholder="$ 0.00"
          required
        />
      </div>

      <div className="form-group">
        <label>Priority *</label>
        <select name="priority" value={formData.priority} onChange={handleChange}>
          <option value="">Select priority</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>

      <div className="form-group">
        <label>Type*</label>
        <select name="Work order type" value={formData.type} onChange={handleChange} required>
        <option value="">Select type</option>
          <option>Emergency</option>
          <option>Normal</option>
        </select>
      </div>

      <div className="form-group">
        <label>Category *</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Select category</option>
          <option>Electrical</option>
          <option>Plumbing</option>
          <option>Maintenance</option>
          <option>Safety</option>
          <option>Landscaping</option>
        </select>
      </div>

      <div className="form-group">
        <label>Location *</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g., Lobby, Parking, Roof"
          required
        />
      </div>

      <div className="form-group">
        <label>Requested By *</label>
        <select
          name="requestedBy"
          value={formData.requestedBy}
          onChange={handleChange}
          required
        >
          <option value="">Select requester</option>
          <option>Admin User</option>
          <option>Resident #203</option>
          <option>Resident #105</option>
        </select>
      </div>

      <div className="form-group">
        <label>Target Date</label>
        <input
          name="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group form-wide">
        <label>Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the issue, work needed, and any relevant details..."
          required
        />
      </div>

      <div className="attachment-box form-wide">
        <strong>Attachments</strong>
        <p>Drag and drop files here or</p>
        <button type="button">Browse Files</button>
        <small>PDF, JPG, PNG max. 10MB each</small>
      </div>

      <div className="form-actions form-wide">
        <Button type="submit" className="primary-action-button">
          Create Work Order
        </Button>

        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default WorkOrderForm;
