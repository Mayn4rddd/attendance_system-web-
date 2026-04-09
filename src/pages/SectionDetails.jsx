import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

const SectionDetails = () => {
  const { user } = useAuth();
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [allStudents, setAllStudents] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", error: "" });

  const links = useMemo(
    () => [
      { id: "class-list", label: "My Sections" },
      { id: "qr-generator", label: "Generate QR" },
      { id: "attendance-log", label: "Attendance" },
    ],
    []
  );

  const handleExport = async () => {
    try {
      const response = await api.get(`/teacher/export?sectionId=${sectionId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      setStatus({ message: "", error: "Export failed." });
    }
  };

  useEffect(() => {
    const fetchSectionStudents = async () => {
      if (!user?.userId || !sectionId) return;
      setLoading(true);
      try {
        let url = `/teacher/my-students?userId=${user.userId}&sectionId=${sectionId}`;
        if (selectedDate) {
          url += `&date=${selectedDate}`;
        }
        const response = await api.get(url);
       const data = response.data ?? [];

setAllStudents(data);
setActiveStudents(data.filter(s => s.status === "Present"));
        setStatus({ message: "", error: "" });
      } catch (error) {
        console.error("Unable to fetch students:", error);
        setStatus({ message: "", error: "Unable to fetch students." });
        setAllStudents([]);
        setActiveStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSectionStudents();
  }, [user, sectionId, selectedDate]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar links={links} />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Section Details</h1>
                <p className="mt-2 text-sm text-slate-600">Review students and attendance status for section {sectionId}.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/teacher")}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-slate-700 transition hover:bg-slate-200"
              >
                Back to Dashboard
              </button>
            </div>
          </header>

          {status.error && <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>}
          {status.message && <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>}

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">📋 All Students</h2>
                <p className="mt-1 text-sm text-slate-600">All students in this section.</p>
              </div>
              <div className="flex gap-4">
                <label className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">Filter by Date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-2xl bg-green-600 px-6 py-2 text-white transition hover:bg-green-700"
                >
                  Export to Excel
                </button>
              </div>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="text-slate-600">Loading...</div>
              ) : allStudents.length === 0 ? (
                <div className="text-slate-500">No students found</div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-6 py-4 font-medium">Student Name</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allStudents.map((student) => {
                        const date = student.date ? new Date(student.date) : null;
                        return (
                          <tr key={student.id ?? student.studentId}>
                            <td className="px-6 py-4 text-slate-800 font-medium">
                              {student.name ?? student.studentName}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  student.status === "Present"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {student.status ?? "No Status"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {date ? date.toLocaleDateString() : "-"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {date ? date.toLocaleTimeString() : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SectionDetails;
