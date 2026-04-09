import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCode } from "react-qr-code";
import api from "../api/axios";
import { onReceiveAttendanceUpdate, startSignalRConnection, stopSignalRConnection } from "../signalr/connection";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [session, setSession] = useState(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState(null);
  const [attendance, setAttendance] = useState([]);
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

  const links = useMemo(
    () => [
      { id: "class-list", label: "My Sections" },
      { id: "qr-generator", label: "Generate QR" },
      { id: "manual-attendance", label: "Manual Attendance" },
      { id: "attendance-log", label: "Live Attendance" },
    ],
    []
  );

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
          fetchSectionStudents(firstSection.id ?? firstSection.sectionId);
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

  const fetchSectionStudents = async (sectionId) => {
    try {
      const response = await api.get(`/student/section/${sectionId}`);
      const students = response.data || [];
      setSectionStudents(students);
      // Initialize manual attendance state
      const initialAttendance = {};
      students.forEach(student => {
        initialAttendance[student.studentId] = null;
      });
      setManualAttendance(initialAttendance);
    } catch (error) {
      console.error("Failed to fetch section students:", error);
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
    } catch (error) {
      console.error("[QR Generate] Error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || "Failed to generate QR session. Please ensure the section is properly configured.";
      setStatus({ message: "", error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendanceSubmit = async (studentId, status) => {
    if (!selectedSection || !user?.userId || !status) return;
    
    const sectionId = selectedSection.id ?? selectedSection.sectionId;
    const subjectId = selectedSection.subjectId ?? selectedSection.subject?.id;
    
    if (!attendanceSessionId) {
      setManualStatus({ 
        message: "", 
        error: "Please generate a QR session first before marking manual attendance." 
      });
      return;
    }
    
    setManualLoading(true);
    setManualStatus({ message: "", error: "" });
    
    try {
      const payload = {
        sessionId: Number(attendanceSessionId),
        studentId: Number(studentId),
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        teacherId: Number(user.userId),
        status,
      };
      
      console.log("[Manual Attendance] Submitting:", payload);
      
      await api.post("/attendance/manual", payload);
      
      // Update local state
      setManualAttendance(prev => ({
        ...prev,
        [studentId]: status,
      }));
      
      setManualStatus({ message: `Marked ${status} successfully!`, error: "" });
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
    if (!session?.sessionId) return;
    setAttendanceLoading(true);
    try {
      const response = await api.get(`/teacher/session-attendance?sessionId=${session.sessionId}`);
      const attendanceList = response.data || [];
      
      // Track newly scanned students
      const currentIds = new Set(attendance.map(a => a.studentId));
      const newIds = new Set(attendanceList.map(a => a.studentId));
      const newlyScannedIds = new Set(
        Array.from(newIds).filter(id => !currentIds.has(id))
      );
      
      setAttendance(attendanceList);
      setNewlyScanned(prev => new Set([...prev, ...newlyScannedIds]));
      
      // Remove highlight after 2 seconds
      setTimeout(() => setNewlyScanned(new Set()), 2000);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.sessionId) return;
    fetchAttendance();
    const refreshInterval = setInterval(fetchAttendance, 3000);
    return () => clearInterval(refreshInterval);
  }, [session?.sessionId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar links={links} />

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
                        fetchSectionStudents(id);
                        navigate(`/section/${id}`);
                      }}
                      className={`rounded-3xl border p-6 text-left transition ${isSelected ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Section</p>
                      <h3 className="mt-3 text-xl font-semibold text-slate-900">{section.name ?? `Section ${id}`}</h3>
                      <p className="mt-2 text-sm text-slate-600">Subject: {section.subject ?? 'N/A'}</p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section id="qr-generator" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Generate QR Session</h2>
                <p className="mt-1 text-sm text-slate-600">Create a one-time login token for students to scan.</p>
              </div>
              <button
                type="button"
                disabled={loading || !selectedSection}
                onClick={handleGenerate}
                className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                title={!selectedSection ? "Please select a section first" : "Generate new QR code"}
              >
                {loading ? "Generating..." : "Generate QR"}
              </button>
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
                      <QRCode value={JSON.stringify({ sessionId: session.sessionId, token: session.token })} size={240} />
                    </div>

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
                        <p className="text-xs text-slate-500">Session ID</p>
                        <p className="mt-1 break-all text-sm font-mono text-slate-900">{session.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Token</p>
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
                  {attendanceLoading && attendance.length === 0 ? (
                    <div className="py-8 text-center text-slate-600">Loading attendance...</div>
                  ) : attendance.length === 0 ? (
                    <div className="py-8 text-center text-slate-600">
                      <p className="text-sm">No students have scanned yet.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {attendance.map((student) => (
                        <li
                          key={student.studentId}
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
                              <p className="text-sm font-medium text-slate-900">{student.studentName || student.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">ID: {student.studentId}</p>
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

          {/* Manual Attendance Section */}
          <section id="manual-attendance" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Manual Attendance</h2>
                <p className="mt-1 text-sm text-slate-600">Mark students as Present, Late, or Absent</p>
              </div>
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
                        <p className="font-medium text-slate-900">{student.name || student.studentName}</p>
                        <p className="text-sm text-slate-600">ID: {student.studentId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Present', 'Late', 'Absent'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={manualLoading || !attendanceSessionId}
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

        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
