function SupplierTable({ suppliers }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>RFC</th>
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
              <td>{supplier.status}</td>
              <td>{supplier.rfc}</td>
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