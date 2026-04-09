const EmptyState = ({ icon = "📋", title = "No data", description = "There are no records to display." }) => {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      <div className="text-6xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
};

export default EmptyState;
