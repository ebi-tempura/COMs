import { useState } from "react";
import Button from "../common/Button";

function SupplierForm({ onCreateSupplier }) {
  const [formData, setFormData] = useState({
    supplierType: "Company",
    name: "",
    serviceCategory: "Plumbing",
    contactPerson: "",
    phone: "",
    email: "",
    rfc: "",
    address: "",
    clabe: "",
    status: "Active",
    paymentMethod: "Bank transfer",
    notes: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const CurrentYear  = new Date(). getFullYear();

    const newSupplier = {
      id: `SUP-${CurrentYear}-${String(Date.now()).slice(-4)}`,
      ...formData,
    };

   

    onCreateSupplier(newSupplier);

    setFormData({
      supplierType: "Company",
      name: "",
      serviceCategory: "Plumbing",
      contactPerson: "",
      phone: "",
      email: "",
      rfc: "",
      address: "",
      clabe: "",
      status: "Pending",
      paymentMethod: "Bank transfer",
      notes: "",
    });
  }
  return (
   <form className="form-grid" onSubmit={handleSubmit}>
 
      
      <div className="form-group">
        <label>Supplier Type</label>
        <select name="supplierType" value={formData.supplierType} onChange={handleChange}>
          <option>Company</option>
          <option>Individual</option>
        </select>
      </div>
  
      <div className="form-group">
        <label>Name</label>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </div>
  
      <div className="form-group">
        <label>Service Category</label>
        <select name="serviceCategory" value={formData.serviceCategory} onChange={handleChange}>
          <option>Plumbing</option>
          <option>Electrical</option>
          <option>Cleaning</option>
          <option>Security</option>
          <option>Elevator</option>
          <option>General Maintenance</option>
        </select>
      </div>
  
      <div className="form-group">
        <label>Contact Person</label>
        <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
      </div>
  
      <div className="form-group">
        <label>Phone</label>
        <input name="phone" value={formData.phone} onChange={handleChange} required />
      </div>
  
      <div className="form-group">
        <label>Email</label>
        <input name="email" value={formData.email} onChange={handleChange} required />
      </div>
  
      <div className="form-group">
        <label>RFC</label>
        <input name="rfc" value={formData.rfc} onChange={handleChange} />
      </div>
  
      <div className="form-group">
        <label>Address</label>
        <input name="address" value={formData.address} onChange={handleChange} />
      </div>
  
      <div className="form-group">
        <label>CLABE</label>
        <input name="clabe" value={formData.clabe} onChange={handleChange} />
      </div>
  
      <div className="form-group">
        <label>Payment Method</label>
        <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
          <option>Bank transfer</option>
          <option>Cash</option>
          <option>Card</option>
          <option>Other</option>
        </select>
      </div>
  
      <div className="form-group">
        <label>Notes</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} />
      </div>

      <div className="attachment-box form-wide">
        <strong>Attachments</strong>
        <p>Drag and drop files here or</p>
        <button type="button">Browse Files</button>
        <small>PDF, JPG, PNG max. 10MB each</small>
      </div>
  
      <div className="form-actions">
        <Button type="submit">Add Supplier</Button>
      </div>
    </form>
  );
  }
export default SupplierForm;