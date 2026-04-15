import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCode } from "react-qr-code";
import api from "../api/axios";
import { onReceiveAttendanceUpdate, startSignalRConnection, stopSignalRConnection } from "../signalr/connection";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [session, setSession] = useState(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const [newlyScanned, setNewlyScanned] = useState(new Set());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [manualAttendance, setManualAttendance] = useState({});
  const [manualLoading, setManualLoading] = useState(false);
  const [manualStatus, setManualStatus] = useState({ message: "", error: "" });
  const [status, setStatus] = useState({ message: "", error: "" });
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const navLinks = [
    { id: "my-sections", label: "My Sections", action: () => navigate("/teacher/dashboard") },
    { id: "masterlist", label: "Masterlist", action: () => navigate("/teacher/masterlist") },
  ];

  useEffect(() => {
    const fetchSections = async () => {
      if (!user?.userId) return;
      setSectionsLoading(true);
      try {
        const response = await api.get(`/teacher/my-sections?userId=${user.userId}`);
        const sectionsData = response.data || [];
        setSections(sectionsData);
        if (!selectedSection && sectionsData?.length) {
          const firstSection = sectionsData[0];
          setSelectedSection(firstSection);
          const firstSectionId = firstSection.id ?? firstSection.sectionId;
          await fetchMasterlist(firstSectionId);
        }
        setStatus({ message: "", error: "" });
      } catch (error) {
        console.error("Failed to fetch sections:", error);
        setStatus({ message: "", error: "Unable to fetch sections." });
      } finally {
        setSectionsLoading(false);
      }
    };
    fetchSections();
  }, [user]);

  // Fetch masterlist with current attendance status
  const fetchMasterlist = async (sectionId) => {
    try {
      const response = await api.get(`/teacher/masterlist?sectionId=${sectionId}`);
      console.log("[Masterlist] Response:", response.data);
      
      // Extract students from response
      const students = response.data.students || [];
      setSectionStudents(students);
      
      // Get today's date
      const today = new Date().toISOString().split("T")[0];
      
      // Initialize manual attendance state from API response using today's date
      const manualAttendanceState = {};
      students.forEach(student => {
        manualAttendanceState[student.studentId] = student.attendance?.[today] || null;
      });
      setManualAttendance(manualAttendanceState);
      
      console.log("[Masterlist] Updated students:", students);
    } catch (error) {
      console.error("Failed to fetch masterlist:", error);
    }
  };

  let liveAttendanceInterval;

  const fetchLiveAttendance = async () => {
    if (!attendanceSessionId) return;
    try {
      const response = await api.get(`/attendance/live/${attendanceSessionId}`);
      const liveStudents = response.data || [];
      setStudents(liveStudents);
    } catch (error) {
      if (error.response?.status === 404) {
        clearInterval(liveAttendanceInterval);
        return;
      }
      if (error.response?.status !== 404) {
        console.error(error);
      }
    }
  };


  useEffect(() => {
  let intervalId;

  if (session?.expiresAt) {
    const updateCountdown = () => {
      const expiresAt = new Date(session.expiresAt).getTime();

      if (isNaN(expiresAt)) {
        console.error("Invalid expiresAt:", session.expiresAt);
        return;
      }

      const seconds = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000)
      );

      setCountdown(seconds);

      if (seconds <= 0) {
        clearInterval(intervalId);
      }
    };

    updateCountdown(); // run immediately
    intervalId = setInterval(updateCountdown, 1000);
  }

  return () => clearInterval(intervalId);
}, [session]);

  useEffect(() => {
    if (!attendanceSessionId) return;

    liveAttendanceInterval = setInterval(async () => {
      try {
        await fetchLiveAttendance();
      } catch (error) {
        if (error.response?.status === 404) {
          clearInterval(liveAttendanceInterval);
        }
      }
    }, 2000);

    return () => clearInterval(liveAttendanceInterval);
  }, [attendanceSessionId]);

  // TEMP: SignalR disabled 
  const handleGenerate = async () => {
    if (loading) return;
    
    // Validate required fields
    if (!user?.userId) {
      setStatus({ message: "", error: "User ID is missing. Please refresh and try again." });
      return;
    }
    
    if (!selectedSection) {
      setStatus({ message: "", error: "Please select a section before generating a QR code." });
      return;
    }
    
    const sectionId = selectedSection.id ?? selectedSection.sectionId;
    const subjectId = selectedSection.subjectId ?? selectedSection.subject?.id;
    
    if (!sectionId) {
      setStatus({ message: "", error: "Section ID is missing. Please try again." });
      return;
    }
    
    if (!subjectId) {
      setStatus({ message: "", error: "Subject ID is missing. This section may not be properly configured." });
      console.error("Selected section missing subjectId:", selectedSection);
      return;
    }
    
    setLoading(true);
    setStatus({ message: "", error: "" });
    
    try {
      const payload = {
        userId: user.userId,
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
      };
      
      console.log("[QR Generate] Sending payload:", payload);
      
      const response = await api.post("/qr/generate", payload);
      
      setSession(response.data);
      setAttendanceSessionId(response.data?.attendanceSessionId);
      setAttendance([]);
      setNewlyScanned(new Set());
      setStatus({ message: "QR session generated successfully.", error: "" });
      
      // Refresh masterlist to show current attendance status
      await fetchMasterlist(sectionId);
    } catch (error) {
      console.error("[QR Generate] Error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || "Failed to generate QR session. Please ensure the section is properly configured.";
      setStatus({ message: "", error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendanceSubmit = async (studentId, statusValue) => {
    if (!selectedSection || !user?.userId || !statusValue) return;
    
    console.log("[Manual Attendance] Debug - selectedSection:", selectedSection);
    
    const sectionId = selectedSection.id ?? selectedSection.sectionId;
    const subjectId = selectedSection.subjectId ?? selectedSection.subject?.id;
    
    console.log("[Manual Attendance] Debug - sectionId:", sectionId, "subjectId:", subjectId);
    
    if (!sectionId) {
      setManualStatus({ message: "", error: "Section ID is missing." });
      return;
    }
    
    if (!subjectId) {
      setManualStatus({ message: "", error: "Subject ID is missing. Please select a valid section." });
      console.error("[Manual Attendance] Error: Subject ID is missing");
      return;
    }
    
    setManualLoading(true);
    setManualStatus({ message: "", error: "" });
    
    try {
      const payload = {
        studentId: Number(studentId),
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        teacherId: Number(user.userId),
        status: statusValue,
      };
      
      console.log("[Manual Attendance] Submitting:", payload);
      
      await api.post("/attendance/manual", payload);
      
      // Update local state
      setManualAttendance(prev => ({
        ...prev,
        [studentId]: statusValue,
      }));
      
      setManualStatus({ message: `Marked ${statusValue} successfully!`, error: "" });
      
      // Refresh masterlist to reflect changes
      await fetchMasterlist(sectionId);
      
      setTimeout(() => setManualStatus({ message: "", error: "" }), 3000);
    } catch (error) {
      console.error("[Manual Attendance] Error:", error.response?.data || error.message);
      setManualStatus({ 
        message: "", 
        error: error.response?.data?.message || "Failed to mark attendance. Please try again." 
      });
    } finally {
      setManualLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!attendanceSessionId) return;
    setAttendanceLoading(true);
    try {
      const response = await api.get(`/teacher/session-attendance?sessionId=${attendanceSessionId}`);
      const attendanceList = response.data || [];
      
      // Track newly scanned students
      const currentIds = new Set(attendance.map(a => a.studentId));
      const newIds = new Set(attendanceList.map(a => a.studentId));
      const newlyScannedIds = new Set(
        Array.from(newIds).filter(id => !currentIds.has(id))
      );
      
      setAttendance(attendanceList);

      // Update manual attendance state
      const updatedManual = {};
      attendanceList.forEach(a => {
        updatedManual[a.studentId] = a.status;
      });

      setManualAttendance(prev => ({
        ...prev,
        ...updatedManual
      }));
      
      setNewlyScanned(prev => new Set([...prev, ...newlyScannedIds]));
      
      // Remove highlight after 2 seconds
      setTimeout(() => setNewlyScanned(new Set()), 2000);
      
      // Refresh masterlist to show updated attendance status
      if (selectedSection) {
        const sectionId = selectedSection.id ?? selectedSection.sectionId;
        await fetchMasterlist(sectionId);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (!attendanceSessionId) return;
    fetchAttendance();
    const refreshInterval = setInterval(fetchAttendance, 3000);
    return () => clearInterval(refreshInterval);
  }, [attendanceSessionId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Navigation</h2>
            <p className="text-sm text-slate-600">Quick access to dashboard sections.</p>

            <nav className="mt-6 space-y-2">
              {navLinks?.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={link.action}
                  className={`w-full text-left rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    link.id === 'my-sections'
                      ? 'bg-sky-100 text-sky-800 border-2 border-sky-300'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-semibold">Teacher Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Generate QR sessions and monitor attendance in real time.</p>
          </header>

          {status.error && <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>}
          {status.message && <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>}

          <section id="class-list" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">My Sections</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a section to view attendance.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sectionsLoading ? (
                <div className="col-span-full">
                  <EmptyState icon="⏳" title="Loading" description="Fetching your sections..." />
                </div>
              ) : sections.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon="📚" title="No Sections" description="You don't have any sections yet. Contact your administrator." />
                </div>
              ) : (
                sections.map((section) => {
                  const id = section.id ?? section.sectionId;
                  const isSelected = selectedSection?.id === id || selectedSection?.sectionId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedSection(section);
                        fetchMasterlist(id);
                      }}
                      className={`rounded-3xl border p-6 text-left transition ${isSelected ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Section</p>
                      <h3 className="mt-3 text-xl font-semibold text-slate-900">{section.section ?? section.name ?? `Section ${id}`}</h3>
                      <p className="mt-2 text-sm text-slate-600">{section.subject ?? 'N/A'}</p>
                      {Array.isArray(section.schedules) && section.schedules.length > 0 ? (
                        <div className="mt-1 space-y-1 text-xs text-slate-500">
                          {section.schedules.map((schedule, idx) => (
                            <p key={idx}>
                              ⏰ {schedule.day} {schedule.startTime} - {schedule.endTime}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">⏰ No schedule</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Attendance Mode Selection */}
          {selectedSection && !selectedMode && (
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-slate-900">Choose Attendance Mode</h2>
                <p className="mt-2 text-sm text-slate-600">
                  You have selected <span className="font-medium">{selectedSection.section ?? selectedSection.name}</span>. Choose how you want to take attendance.
                </p>
              </div>
              
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {/* QR Attendance Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode("QR")}
                  className="flex flex-col items-center gap-4 rounded-3xl border-2 border-sky-200 bg-sky-50 p-8 transition hover:border-sky-400 hover:bg-sky-100"
                >
                  <div className="text-5xl">📱</div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900">QR Code Attendance</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Generate a QR code for students to scan and check real-time attendance.
                    </p>
                  </div>
                  <div className="mt-4 rounded-2xl bg-sky-600 px-6 py-2 text-white font-medium transition hover:bg-sky-700">
                    Use QR Mode
                  </div>
                </button>

                {/* Manual Attendance Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode("Manual")}
                  className="flex flex-col items-center gap-4 rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-8 transition hover:border-emerald-400 hover:bg-emerald-100"
                >
                  <div className="text-5xl">✋</div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900">Manual Attendance</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Manually mark students as Present, Late, or Absent.
                    </p>
                  </div>
                  <div className="mt-4 rounded-2xl bg-emerald-600 px-6 py-2 text-white font-medium transition hover:bg-emerald-700">
                    Use Manual Mode
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="mt-8 w-full rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
              >
                Back to Sections
              </button>
            </section>
          )}

          {selectedMode === "QR" && (
          <section id="qr-generator" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Generate QR Session</h2>
                <p className="mt-1 text-sm text-slate-600">Create a one-time login token for students to scan.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerate}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Generating..." : "Generate QR"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-2 text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                {session ? (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                        countdown > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {countdown > 0 ? '✓ Active' : '✕ Expired'}
                      </span>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center">
                      <QRCode value={session.token} size={240} />
                    </div>
                    
                    {/* Debug: Display token */}
                    <p className="text-center text-xs text-slate-500 break-all">{session.token}</p>

                    {/* Countdown Timer */}
                    <div className={`rounded-2xl p-6 text-center ${
                      countdown > 60
                        ? 'bg-emerald-50 ring-1 ring-emerald-200'
                        : countdown > 0
                        ? 'bg-amber-50 ring-1 ring-amber-200'
                        : 'bg-rose-50 ring-1 ring-rose-200'
                    }`}>
                      <p className="text-sm text-slate-600">Time Remaining</p>
                      <p className={`mt-2 text-4xl font-bold tabular-nums ${
                        countdown > 60
                          ? 'text-emerald-600'
                          : countdown > 0
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}>
                        {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </p>
                    </div>

                    {/* Session Details */}
                    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <div>
                        <p className="text-xs text-slate-500">Attendance Session ID</p>
                        <p className="mt-1 break-all text-sm font-mono text-slate-900">{attendanceSessionId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">QR Token</p>
                        <p className="mt-1 break-all text-sm font-mono text-slate-900">{session.token}</p>
                      </div>
                    </div>

                    {/* Regenerate Button */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGenerate}
                      className="w-full rounded-2xl border-2 border-sky-600 bg-white px-4 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-50 disabled:border-slate-400 disabled:text-slate-400"
                    >
                      {loading ? 'Regenerating...' : 'Regenerate QR'}
                    </button>
                  </div>
                ) : (
                  <EmptyState
                    icon="📱"
                    title="No Active Session"
                    description="Generate a QR session to begin taking attendance."
                  />
                )}
              </div>

              {/* Attendance List */}
              <div>
                <h3 className="text-lg font-semibold">Live Attendance</h3>
                <p className="mt-1 text-sm text-slate-600">Students who have scanned the QR code</p>
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {students.length === 0 ? (
                    <div className="py-8 text-center text-slate-600">
                      <p className="text-sm">No students have scanned yet.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {students.map((student, index) => (
                        <li
                          key={student.studentId || index}
                          className={`flex items-center justify-between rounded-lg p-3 transition ${
                            newlyScanned.has(student.studentId)
                              ? 'animate-pulse bg-emerald-100 ring-2 ring-emerald-300'
                              : 'bg-white ring-1 ring-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {student.status?.toLowerCase() === 'present' ? '✓' : '⏱'}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{student.studentName || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">Student ID: {student.studentId || student.id}</p>
                              {student.section && (
                                <p className="text-xs text-slate-500">Section: {student.section}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            student.status?.toLowerCase() === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {student.status || 'Present'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Manual Attendance Section */}
          {selectedMode === "Manual" && (
          <section id="manual-attendance" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Manual Attendance</h2>
                <p className="mt-1 text-sm text-slate-600">Mark students as Present, Late, or Absent</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
            </div>

            {manualStatus.error && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{manualStatus.error}</div>
            )}
            {manualStatus.message && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{manualStatus.message}</div>
            )}

            <div className="mt-6">
              {!selectedSection ? (
                <EmptyState icon="📋" title="No Section Selected" description="Select a section from 'My Sections' to mark attendance." />
              ) : sectionStudents.length === 0 ? (
                <EmptyState icon="👥" title="No Students" description="This section has no students assigned yet." />
              ) : (
                <div className="space-y-3">
                  {sectionStudents.map((student) => (
                    <div
                      key={student.studentId}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{student.studentName || 'Unknown'}</p>
                        <p className="text-sm text-slate-600">Student ID: {student.studentId || student.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Present', 'Late', 'Absent'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={manualLoading}
                            onClick={() => handleManualAttendanceSubmit(student.studentId, status)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                              manualAttendance[student.studentId] === status
                                ? status === 'Present'
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                  : status === 'Late'
                                  ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                                  : 'bg-rose-600 text-white ring-2 ring-rose-300'
                                : status === 'Present'
                                ? 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                                : status === 'Late'
                                ? 'border border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
                                : 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {status === 'Present' ? '✓' : status === 'Late' ? '⏱' : '✕'} {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          )}

        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
