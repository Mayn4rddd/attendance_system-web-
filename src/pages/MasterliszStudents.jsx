import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const MasterliszStudents = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.state?.section;
  const teacherId = location.state?.teacherId;
  const subjectIdFromState = location.state?.subjectId;
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
    
    // Use values from state, fallback to direct access, but teacherId must be from state
    const subjectId = subjectIdFromState ?? section?.subjectId ?? section?.subject?.id;
    
    if (!sectionId || !subjectId || !teacherId) {
      console.error("Missing required parameters:", { sectionId, subjectId, teacherId });
      setStatus({ message: "", error: "Section ID, Subject ID, or Teacher ID is missing. Please navigate from the masterlist page." });
      return;
    }
    
    setIsRefreshing(true);
    try {
      const response = await api.get(
        `/teacher/masterlist?sectionId=${sectionId}&subjectId=${subjectId}&teacherId=${teacherId}`
      );
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
    
    // Get subjectId from state or section data
    const subjectId = subjectIdFromState ?? section?.subjectId ?? section?.subject?.id;
    
    // Safety checks for required parameters
    if (!sectionId || !subjectId || !teacherId) {
      console.error("Missing required parameters:", { sectionId, subjectId, teacherId });
      setStatus({ message: "", error: "Section ID, Subject ID, or Teacher ID is missing. Please navigate from the masterlist page." });
      return;
    }
    
    setGridLoading(true);
    try {
      const response = await api.get(
        `/teacher/masterlist-grid?sectionId=${sectionId}&subjectId=${subjectId}&teacherId=${teacherId}&startDate=${start}&endDate=${end}`
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

  const handleExportExcel = () => {
    if (!gridData.students.length || !gridData.dates.length) {
      setStatus({ message: "", error: "No data available to export." });
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Define styles
    const titleStyle = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFE6F3FF" } }
    };

    const sectionStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "left" }
    };

    const dateRangeStyle = {
      font: { sz: 11 },
      alignment: { horizontal: "left" }
    };

    const headerStyle = {
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFD3D3D3" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const studentNameStyle = {
      font: { bold: true, sz: 10 },
      alignment: { horizontal: "left" },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const dateHeaderStyle = {
      font: { bold: true, sz: 10 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFD3D3D3" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const presentStyle = {
      font: { sz: 10 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFE8F5E8" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const lateStyle = {
      font: { sz: 10 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFFFF3E0" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const absentStyle = {
      font: { sz: 10 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFFFEBEE" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    const emptyStyle = {
      font: { sz: 10 },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "FFF5F5F5" } },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } }
      }
    };

    // Add title (centered across columns)
    XLSX.utils.sheet_add_aoa(ws, [["Student Masterlist"]], { origin: "A1" });
    ws['A1'].s = titleStyle;

    // Add section name
    XLSX.utils.sheet_add_aoa(ws, [[`Section: ${sectionName || 'N/A'}`]], { origin: "A3" });
    ws['A3'].s = sectionStyle;

    // Add date range
    const dateRange = `From: ${new Date(startDate).toLocaleDateString()} To: ${new Date(endDate).toLocaleDateString()}`;
    XLSX.utils.sheet_add_aoa(ws, [[dateRange]], { origin: "A4" });
    ws['A4'].s = dateRangeStyle;

    // Create headers: Student Name + dates
    const headers = ["Student Name", ...gridData.dates.map(date =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      })
    )];

    // Add headers starting from row 6
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A6" });

    // Apply header styles
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 5, c: index }); // Row 6 (0-indexed as 5)
      if (index === 0) {
        ws[cellRef].s = headerStyle; // Student Name header
      } else {
        ws[cellRef].s = dateHeaderStyle; // Date headers
      }
    });

    // Create data rows
    const dataRows = gridData.students.map(student => {
      const row = [student.studentName || 'N/A'];

      // Add attendance data for each date
      gridData.dates.forEach(date => {
        const status = student.records?.[date] || "";
        let displayValue = "-";

        if (status === "P") {
          displayValue = "Present";
        } else if (status === "L") {
          displayValue = "Late";
        } else if (status === "A") {
          displayValue = "Absent";
        }

        row.push(displayValue);
      });

      return row;
    });

    // Add data rows starting from row 7
    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A7" });

    // Apply data cell styles
    dataRows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 6, c: colIndex }); // Start from row 7 (0-indexed as 6)

        if (colIndex === 0) {
          // Student name column
          ws[cellRef].s = studentNameStyle;
        } else {
          // Attendance columns
          const status = row[colIndex];
          if (status === "Present") {
            ws[cellRef].s = presentStyle;
          } else if (status === "Late") {
            ws[cellRef].s = lateStyle;
          } else if (status === "Absent") {
            ws[cellRef].s = absentStyle;
          } else {
            ws[cellRef].s = emptyStyle;
          }
        }
      });
    });

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Student Name
      ...gridData.dates.map(() => ({ wch: 12 })) // Date columns
    ];
    ws['!cols'] = colWidths;

    // Merge title cell across all columns
    const totalColumns = headers.length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } } // Merge A1 to last column in row 1
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Student Masterlist");

    // Generate filename with section and date range
    const fileName = `Student_Masterlist_${sectionName || 'Unknown'}_${startDate}_to_${endDate}.xlsx`;

    // Write and save file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
  };

  useEffect(() => {
    const initialFetch = async () => {
      if (!sectionId) return;
      
      const subjectId = subjectIdFromState ?? section?.subjectId ?? section?.subject?.id;
      
      if (!sectionId || !subjectId || !teacherId) {
        console.error("Missing required parameters:", { sectionId, subjectId, teacherId });
        setStatus({ message: "", error: "Section ID, Subject ID, or Teacher ID is missing. Please navigate from the masterlist page." });
        return;
      }
      
      setLoading(true);
      try {
        const response = await api.get(
          `/teacher/masterlist?sectionId=${sectionId}&subjectId=${subjectId}&teacherId=${teacherId}`
        );
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
  }, [sectionId, section, teacherId, subjectIdFromState]);

  // Fetch grid data when view mode changes to grid
  useEffect(() => {
  const subjectId = subjectIdFromState ?? section?.subjectId ?? section?.subject?.id;

  if (viewMode === "grid" && teacherId && subjectId) {
    fetchGridData(startDate, endDate);
  }
}, [viewMode, startDate, endDate, teacherId, subjectIdFromState, section]);

  // Fallback section name if API doesn't provide it
  const displaySectionName = sectionName || (section?.section ?? section?.name ?? `Section ${sectionId}`);
  const getAttendanceSummaryObject = (attendance = {}) => {
    const summary = { present: 0, late: 0, absent: 0 };

    Object.values(attendance).forEach((status) => {
      if (status === "Present") summary.present += 1;
      if (status === "Late") summary.late += 1;
      if (status === "Absent") summary.absent += 1;
    });

    return summary;
  };
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
                onClick={() => setViewMode("list")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  viewMode === "list"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                List
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
                Grid
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
                        return (
                          <tr
                            key={student.studentId || index}
                            className="border-b border-slate-200 transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 text-sm text-slate-900">{student.studentNumber || student.studentId || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-slate-900">{student.studentName || 'N/A'}</td>
                            <td className="px-6 py-4">
                              {(() => {
                                const summary = getAttendanceSummaryObject(student.attendance);
                                return (
                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                      P: {summary.present}
                                    </span>
                                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                      L: {summary.late}
                                    </span>
                                    <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                                      A: {summary.absent}
                                    </span>
                                  </div>
                                );
                              })()}
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
                            
                            // ✅ FIXED: Properly handle status codes and empty values
                            // Backend returns: "P" (Present), "L" (Late), "A" (Absent), "" (No class/empty)
                            let displayValue = "";
                            let bgColor = "bg-white";
                            
                            if (!status || status === "") {
                              // No class day or empty status - NOT Absent
                              displayValue = "—";
                              bgColor = "bg-gray-50";
                            } else if (status === "P") {
                              // Present
                              displayValue = "✓ P";
                              bgColor = "bg-emerald-50";
                            } else if (status === "L") {
                              // Late
                              displayValue = "⏱ L";
                              bgColor = "bg-amber-50";
                            } else if (status === "A") {
                              // Absent
                              displayValue = "✕ A";
                              bgColor = "bg-rose-50";
                            }
                            
                            return (
                              <td
                                key={dateIdx}
                                className={`border border-gray-200 px-2 py-3 text-center text-sm font-semibold text-slate-900 ${bgColor}`}
                              >
                                {displayValue}
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!gridData.students.length || !gridData.dates.length}
                className="rounded-2xl bg-green-600 px-6 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => navigate("/teacher/masterlist")}
                className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                Back to Masterlist
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MasterliszStudents;
