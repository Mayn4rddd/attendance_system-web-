const Sidebar = ({ links = [] }) => {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Navigation</h2>
        <p className="text-sm text-slate-600">Quick access to dashboard sections.</p>

        <nav className="mt-6 space-y-2">
          {links?.length === 0 ? (
            <p className="text-sm text-slate-400">No navigation available</p>
          ) : (
            links?.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {link.label}
              </a>
            ))
          )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;