export default function ProductsLoading() {
  return (
    <div aria-busy="true" className="admin-catalog-loading" role="status">
      <span className="sr-only">Loading the menu and product catalog…</span>
      <div aria-hidden="true" className="admin-catalog-loading-heading">
        <i />
        <span><i /><i /></span>
      </div>
      <div aria-hidden="true" className="admin-catalog-loading-stats">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
      <div aria-hidden="true" className="admin-catalog-loading-table"><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}
