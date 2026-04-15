import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";

const MasterliszStudents = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.state?.section;
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [gridData, setGridData] = useState({ dates: [], students: [] });
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [gridLoading, setGridLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", error: "" });
  
  // Date range state for grid view
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Reusable fetch function
  const fetchMasterlist = async () => {
    if (!sectionId) return;
    setIsRefreshing(true);
    try {
      const response = await api.get(`/teacher/masterlist?sectionId=${sectionId}`);
      console.log("Masterlist response:", response.data);
      
      // Extract students array from response
      const studentsData = response.data.students || [];
      const apiSectionName = response.data.sectionName || "";
      
      // Sort students alphabetically by name
      const sortedStudents = [...studentsData].sort((a, b) => {
        const nameA = (a.studentName || "Unknown").toLowerCase();
        const nameB = (b.studentName || "Unknown").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStudents(sortedStudents);
      setSectionName(apiSectionName);
      setStatus({ message: "", error: "" });
    } catch (error) {
      console.error("Failed to fetch masterlist:", error);
      setStatus({ message: "", error: "Unable to fetch student masterlist." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch grid data with date range and subject
  const fetchGridData = async (start, end) => {
    if (!sectionId) return;
    
    // Get teacherId from authenticated user
    if (!user?.userId) {
      console.error("Teacher ID (userId) is missing");
      setStatus({ message: "", error: "Teacher ID is missing. Please log in again." });
      return;
    }
    
    // Get subjectId from section data
    const subjectId = section?.subjectId ?? section?.subject?.id;
    if (!subjectId) {
      console.error("Subject ID is missing");
      setStatus({ message: "", error: "Subject ID is missing for this section." });
      return;
    }
    
    setGridLoading(true);
    try {
      const response = await api.get(
        `/teacher/masterlist-grid?sectionId=${sectionId}&subjectId=${subjectId}&teacherId=${user.userId}&startDate=${start}&endDate=${end}`
      );
      console.log("Grid data response:", response.data);
      
      // Expected format: { dates: [], students: [] }
      const { dates = [], students: gridStudents = [] } = response.data || {};
      
      // Sort grid students alphabetically by name
      const sortedGridStudents = [...gridStudents].sort((a, b) => {
        const nameA = (a.studentName || "Unknown").toLowerCase();
        const nameB = (b.studentName || "Unknown").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setGridData({ dates, students: sortedGridStudents });
      setStatus({ message: "", error: "" });
    } catch (error) {
      console.error("Failed to fetch grid data:", error);
      setStatus({ message: "", error: "Unable to fetch attendance grid." });
      setGridData({ dates: [], students: [] });
    } finally {
      setGridLoading(false);
    }
  };

  useEffect(() => {
    const initialFetch = async () => {
      if (!sectionId) return;
      setLoading(true);
      try {
        const response = await api.get(`/teacher/masterlist?sectionId=${sectionId}`);
        console.log("Masterlist response:", response.data);
        
        // Extract students array from response
        const studentsData = response.data.students || [];
        const apiSectionName = response.data.sectionName || "";
        
        // Sort students alphabetically by name
        const sortedStudents = [...studentsData].sort((a, b) => {
          const nameA = (a.studentName || a.name || "Unknown").toLowerCase();
          const nameB = (b.studentName || b.name || "Unknown").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setStudents(sortedStudents);
        setSectionName(apiSectionName);
        setStatus({ message: "", error: "" });
      } catch (error) {
        console.error("Failed to fetch masterlist:", error);
        setStatus({ message: "", error: "Unable to fetch student masterlist." });
      } finally {
        setLoading(false);
      }
    };
    initialFetch();
  }, [sectionId]);

  // Fetch grid data when view mode changes to grid
  useEffect(() => {
    if (viewMode === "grid" && user?.userId) {
      fetchGridData(startDate, endDate);
    }
  }, [viewMode, startDate, endDate, user?.userId]);

  // Fallback section name if API doesn't provide it
  const displaySectionName = sectionName || (section?.section ?? section?.name ?? `Section ${sectionId}`);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate("/teacher/masterlist")}
            className="text-sky-600 hover:text-sky-700 hover:underline"
          >
            Masterlist
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-medium text-slate-900">{displaySectionName}</span>
        </div>

        <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Student Masterlist</h1>
              <p className="mt-2 text-sm text-slate-600">{displaySectionName}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchMasterlist()}
                disabled={isRefreshing || gridLoading}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {isRefreshing || gridLoading ? "🔄 Refreshing..." : "🔄 Refresh"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === "list"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📋 List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === "grid"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📊 Grid
              </button>
            </div>
          </div>
          
          {/* Date range inputs for grid view */}
          {viewMode === "grid" && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                From:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                To:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={() => fetchGridData(startDate, endDate)}
                disabled={gridLoading}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:bg-slate-400"
              >
                {gridLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          )}
        </header>

        {status.error && <div className="mt-6 rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>}
        {status.message && <div className="mt-6 rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>}

        <section className="mt-6 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          {/* List View */}
          {viewMode === "list" && (
            <>
              {loading ? (
                <div className="p-6 text-center">
                  <EmptyState icon="⏳" title="Loading" description="Fetching student masterlist..." />
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 text-center">
                  <EmptyState icon="👥" title="No Students" description="No students found in this section." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Student ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const today = new Date().toISOString().split("T")[0];
                        const todayStatus = student.attendance?.[today];
                        return (
                          <tr
                            key={student.studentId || index}
                            className="border-b border-slate-200 transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 text-sm text-slate-900">{student.studentNumber || student.studentId || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-slate-900">{student.studentName || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm">
                              {todayStatus ? (
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  todayStatus.toLowerCase() === 'present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : todayStatus.toLowerCase() === 'late'
                                    ? 'bg-amber-100 text-amber-800'
                                    : todayStatus.toLowerCase() === 'absent'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {todayStatus}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <>
              {gridLoading ? (
                <div className="p-6 text-center">
                  <EmptyState icon="⏳" title="Loading" description="Fetching attendance grid..." />
                </div>
              ) : gridData.students.length === 0 ? (
                <div className="p-6 text-center">
                  <EmptyState icon="📊" title="No Data" description="No attendance records found for the selected date range." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="border border-gray-200 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-900 w-40">
                          Student Name
                        </th>
                        {gridData.dates.map((date, idx) => {
                          const dateObj = new Date(date);
                          const displayDate = dateObj.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            weekday: 'short'
                          });
                          return (
                            <th
                              key={idx}
                              className="border border-gray-200 bg-slate-50 px-2 py-3 text-center text-xs font-semibold text-slate-900 min-w-12"
                            >
                              {displayDate}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.students.map((student, studentIdx) => (
                        <tr key={student.studentId || studentIdx} className="hover:bg-sky-50">
                          <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-50">
                            {student.studentName || 'N/A'}
                          </td>
                          {gridData.dates.map((date, dateIdx) => {
                            // Get attendance status for this date from records object
                            const status = student.records?.[date] || "";
                            
                            // Convert status to single letter with icon
                            let displayValue = "";
                            let bgColor = "bg-white";
                            if (status.toLowerCase() === "present") {
                              displayValue = "✓ P";
                              bgColor = "bg-emerald-50";
                            } else if (status.toLowerCase() === "late") {
                              displayValue = "⏱ L";
                              bgColor = "bg-amber-50";
                            } else if (status.toLowerCase() === "absent") {
                              displayValue = "✕ A";
                              bgColor = "bg-rose-50";
                            }
                            
                            return (
                              <td
                                key={dateIdx}
                                className={`border border-gray-200 px-2 py-3 text-center text-sm font-semibold text-slate-900 ${bgColor}`}
                              >
                                {displayValue || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          
          <div className="border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => navigate("/teacher/masterlist")}
              className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-2 text-slate-700 transition hover:bg-slate-50"
            >
              Back to Masterlist
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MasterliszStudents;
