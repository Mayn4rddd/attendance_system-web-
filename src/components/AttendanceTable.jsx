const AttendanceTable = ({ rows, showSections = false }) => {
  if (!rows || rows.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No records yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {showSections && <th className="px-6 py-4 font-medium">Section Name</th>}
            {showSections && <th className="px-6 py-4 font-medium">Subject Name</th>}
            <th className="px-6 py-4 font-medium">Student Name</th>
            <th className="px-6 py-4 font-medium">Attendance Status</th>
            {!showSections && <th className="px-6 py-4 font-medium">Time</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => (
            <tr key={`${row.studentName}-${index}`}>
              {showSections && <td className="px-6 py-4 text-slate-800">{row.sectionName}</td>}
              {showSections && <td className="px-6 py-4 text-slate-800">{row.subjectName}</td>}
              <td className="px-6 py-4 text-slate-800">{row.studentName}</td>
              <td className="px-6 py-4 text-slate-700">{row.attendanceStatus ?? row.status}</td>
              {!showSections && <td className="px-6 py-4 text-slate-600">{new Date(row.time).toLocaleString()}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
