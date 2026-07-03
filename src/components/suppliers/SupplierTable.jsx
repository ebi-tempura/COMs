function SupplierTable({ suppliers }) {
  return (
    <div className="table-wrapper">
      <table className="work-orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Name</th>
            <th>Category</th>
            <th>Contact</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Status</th>
            <th>RFC</th>
            <th>CLABE</th>
            <th>Payment</th>
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
              <td>{supplier.contactPerson}</td>
              <td>{supplier.phone}</td>
              <td>{supplier.address}</td>
              <td>{supplier.status}</td>
              <td>{supplier.rfc}</td>
              <td>{supplier.clabe}</td>
              <td>{supplier.paymentMethod}</td>
              <td>
                <div className="icon-actions">
                  <button>👁</button>
                  <button>⋮</button>
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