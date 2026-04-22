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
  const [isClassTimeActive, setIsClassTimeActive] = useState(true);

  // Helper function to convert backend errors to user-friendly messages
  const getFriendlyErrorMessage = (backendError) => {
    const errorMap = {
      "Student already scanned via QR": "Student already scanned via QR. They cannot be marked again.",
      "Student not found": "Student not found in this section.",
      "Invalid assignment": "Invalid teacher assignment for this section.",
      "Section not found": "Section not found. Please select another section.",
      "Subject not found": "Subject not found. Please select another section.",
      "Teacher assignment not found": "Teacher assignment not found. Please contact your administrator.",
      "Class time is over": "Class time has ended. Attendance is no longer available.",
      "Attendance session expired": "QR session has expired. Generate a new session.",
      "Unauthorized": "You are not authorized to perform this action.",
    };

    // Check for exact matches first
    if (errorMap[backendError]) {
      return errorMap[backendError];
    }

    // Check for partial matches (case-insensitive)
    for (const [key, value] of Object.entries(errorMap)) {
      if (backendError?.toLowerCase?.().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Default fallback for unknown errors
    return `${backendError || "An error occurred. Please try again."}`;
  };

  // Helper function to extract error message from Axios error
  const getErrorMessage = (error, defaultMsg = "An error occurred. Please try again.") => {
    // Priority 1: Check error.response.data.message (backend custom message)
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // Priority 2: Check error.response.data (might be a string)
    if (typeof error.response?.data === 'string') {
      return error.response.data;
    }

    // Priority 3: Check error.message (Axios default error)
    if (error.message) {
      return error.message;
    }

    // Fallback: Use provided default message
    return defaultMsg;
  };

  // Helper function to check if current time is within class schedule
  const checkIfClassTimeActive = (section) => {
    if (!section || !section.schedules || section.schedules.length === 0) {
      return true; // Allow if no schedule defined
    }

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Format: HHMM (e.g., 1430 for 2:30 PM)

    // Check if today is a scheduled day and current time is within schedule
    const isScheduledToday = section.schedules.some((schedule) => {
      if (!schedule.day || !schedule.startTime || !schedule.endTime) {
        return false;
      }

      const isSameDay = schedule.day.toLowerCase() === currentDay.toLowerCase();
      if (!isSameDay) return false;

      // Parse times to HHMM format
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startTimeNum = startHour * 100 + startMin;
      const endTimeNum = endHour * 100 + endMin;

      return currentTime >= startTimeNum && currentTime <= endTimeNum;
    });

    return isScheduledToday;
  };

  // Format time from 24-hour format (e.g., "18:00") to 12-hour format (e.g., "6:00 PM")
  const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return "";
    const [hourText, minute] = timeString.split(":");
    const hourValue = Number(hourText);
    if (Number.isNaN(hourValue) || !minute) return timeString;

    const period = hourValue >= 12 ? "PM" : "AM";
    const hour12 = hourValue === 0 ? 12 : hourValue > 12 ? hourValue - 12 : hourValue;
    return `${hour12}:${minute} ${period}`;
  };

  // Update class time status whenever selectedSection changes
  useEffect(() => {
    if (selectedSection) {
      setIsClassTimeActive(checkIfClassTimeActive(selectedSection));
    }
  }, [selectedSection]);

  const navLinks = [
    { id: "my-sections", label: "My Subjects", action: () => navigate("/teacher/dashboard") },
    { id: "masterlist", label: "Masterlist", action: () => navigate("/teacher/masterlist") },
  ];

  useEffect(() => {
    const fetchSections = async () => {
      if (!user?.userId) {
        console.error("[Sections] Error: user.userId is missing");
        return;
      }
      setSectionsLoading(true);
      try {
        console.log("[Sections] Fetching sections for userId:", user.userId);
        const response = await api.get(`/teacher/my-sections?userId=${user.userId}`);
        const sectionsData = response.data || [];
        
        console.log("[Sections] API Response:", {
          count: sectionsData.length,
          sections: sectionsData,
        });
        
        setSections(sectionsData);
        setStatus({ message: "", error: "" });
        
        // Try to restore selected section from localStorage
        const savedSectionJSON = localStorage.getItem("selectedTeacherSection");
        if (savedSectionJSON) {
          try {
            const savedSection = JSON.parse(savedSectionJSON);
            console.log("[Sections] Restoring section from localStorage:", savedSection);
            
            // Verify the saved section still exists in the fetched sections
            const sectionId = savedSection.id ?? savedSection.sectionId;
            const subjectId = savedSection.subjectId ?? savedSection.subject?.id;
            
            const existingSection = sectionsData.find(s => {
              const s_sectionId = s.id ?? s.sectionId;
              const s_subjectId = s.subjectId ?? s.subject?.id;
              return s_sectionId === sectionId && s_subjectId === subjectId;
            });
            
            if (existingSection) {
              console.log("[Sections] Found matching section in fetched data, restoring...");
              setSelectedSection(existingSection);
              setSelectedMode("QR");
            } else {
              console.log("[Sections] Saved section no longer exists, clearing localStorage");
              localStorage.removeItem("selectedTeacherSection");
            }
          } catch (e) {
            console.error("[Sections] Error parsing saved section from localStorage:", e);
            localStorage.removeItem("selectedTeacherSection");
          }
        }
      } catch (error) {
        console.error("[Sections] Failed to fetch sections:", error.response?.data || error.message);
        const errorMsg = getErrorMessage(error, "Unable to fetch sections.");
        const friendlyMsg = getFriendlyErrorMessage(errorMsg);
        setStatus({ message: "", error: friendlyMsg });
      } finally {
        setSectionsLoading(false);
      }
    };
    fetchSections();
  }, [user]);

  // Save selected section to localStorage whenever it changes
  useEffect(() => {
    if (selectedSection) {
      console.log("[LocalStorage] Saving selected section:", selectedSection);
      localStorage.setItem("selectedTeacherSection", JSON.stringify(selectedSection));
    } else {
      console.log("[LocalStorage] Clearing selected section");
      localStorage.removeItem("selectedTeacherSection");
    }
  }, [selectedSection]);

  // Fetch masterlist with current attendance status
  const fetchMasterlist = async (section) => {
    // Validate section parameter is provided
    if (!section) {
      console.error("[Masterlist] Error: section parameter is not provided");
      return;
    }

    console.log("[Masterlist] Starting fetch with section:", section);

    // Extract IDs directly from the passed section object
    // IMPORTANT: Use section.sectionId (not section.id) for the API
    const finalSectionId = section.sectionId || section.id;
    const finalSubjectId = section.subjectId || section.subject?.id;
    const finalTeacherId = user?.userId;

    // Validate all required parameters with detailed logging
    console.log("[Masterlist] Extracted IDs for API call:", {
      sectionId: finalSectionId,
      sectionIdSource: section.sectionId ? "section.sectionId" : "section.id",
      subjectId: finalSubjectId,
      subjectIdSource: section.subjectId ? "section.subjectId" : "section.subject.id",
      teacherId: finalTeacherId,
    });

    if (!finalSectionId || finalSectionId === undefined || finalSectionId === null) {
      console.error("[Masterlist] Error: sectionId is missing or invalid", { 
        sectionId: finalSectionId, 
        section 
      });
      return;
    }

    if (!finalSubjectId || finalSubjectId === undefined || finalSubjectId === null) {
      console.error("[Masterlist] Error: subjectId is missing or invalid", { 
        subjectId: finalSubjectId, 
        section 
      });
      return;
    }

    if (!finalTeacherId || finalTeacherId === undefined || finalTeacherId === null) {
      console.error("[Masterlist] Error: teacherId is missing or invalid", { finalTeacherId });
      return;
    }

    const apiUrl = `/teacher/masterlist?sectionId=${Number(finalSectionId)}&subjectId=${Number(finalSubjectId)}&teacherId=${Number(finalTeacherId)}`;
    console.log("[Masterlist] Calling API with URL:", apiUrl);

    try {
      const response = await api.get(apiUrl);
      console.log("[Masterlist] API Response received:", response.data);

      // Extract students from response - handle different response formats
      const students = Array.isArray(response.data) ? response.data : response.data?.students || [];
      
      console.log("[Masterlist] Extracted students:", {
        count: students.length,
        sectionId: finalSectionId,
        subjectId: finalSubjectId,
        students: students.slice(0, 3), // First 3 for preview
      });

      // Update state with fetched students
      setSectionStudents(students);

      // Get today's date for initializing manual attendance
      const today = new Date().toISOString().split("T")[0];
      console.log("[Masterlist] Using date for attendance:", today);

      // Initialize manual attendance state from API response using today's date
      // IMPORTANT: Use student.id (database ID) not student.studentId (student number)
      // student.id maps to Students.Id in the database - required by backend API
      // student.studentId is the student number - only for display purposes
      const manualAttendanceState = {};
      students.forEach((student) => {
        const todayStatus = student.attendance?.[today];
        // Use student.id (database ID) as key, NOT student.studentId (student number)
        manualAttendanceState[student.id] = todayStatus || null;
        console.log("[Masterlist] Student attendance status:", {
          id: student.id,
          studentId: student.studentId, 
          studentName: student.studentName,
          todayStatus: todayStatus,
        });
      });

      setManualAttendance(manualAttendanceState);

      console.log("[Masterlist] Updated manual attendance state:", manualAttendanceState);
      console.log("[Masterlist] Successfully fetched and processed masterlist with", students.length, "students");
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      console.error("[Masterlist] API Error:", {
        message: errorMsg,
        status: error.response?.status,
        data: error.response?.data,
        url: apiUrl,
        sectionId: finalSectionId,
        subjectId: finalSubjectId,
      });
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
        const errorMsg = getErrorMessage(error);
        console.error("[Live Attendance] Error:", errorMsg);
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

  // Fetch existing active QR session from backend
  const fetchActiveQRSession = async (section) => {
    if (!section) {
      console.error("[Active QR] Error: section parameter is not provided");
      return;
    }

    const sectionId = section.id ?? section.sectionId;
    const subjectId = section.subjectId ?? section.subject?.id;
    const teacherId = user?.userId;

    // Validate required parameters
    if (!sectionId || !subjectId || !teacherId) {
      console.log("[Active QR] Missing parameters, will need to generate new QR:", {
        sectionId,
        subjectId,
        teacherId,
      });
      return;
    }

    try {
      console.log("[Active QR] Fetching active QR session:", {
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        teacherId: Number(teacherId),
      });

      const response = await api.get(
        `/qr/active?sectionId=${Number(sectionId)}&subjectId=${Number(subjectId)}&teacherId=${Number(teacherId)}`
      );

      const activeSession = response.data;

      if (activeSession && activeSession.token) {
        console.log("[Active QR] Found active session:", activeSession);

        // Check if session is expired
        const expiresAt = new Date(activeSession.expiresAt).getTime();
        const now = Date.now();
        const secondsRemaining = Math.floor((expiresAt - now) / 1000);

        // Always restore the session, regardless of expiration status
        // The backend controls validity, frontend just displays what's returned
        console.log("[Active QR] Restoring session with", secondsRemaining, "seconds remaining (may be expired)");
        setSession(activeSession);
        setAttendanceSessionId(activeSession.attendanceSessionId);
        setAttendance([]);
        setNewlyScanned(new Set());
        setStatus({ message: "Restored active QR session.", error: "" });
        return;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("[Active QR] No active QR session found");
      } else {
        const errorMsg = getErrorMessage(error);
        console.error("[Active QR] Error fetching active session:", errorMsg);
      }
    }
  };

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
    
    // Get GPS location before generating QR
    if (!navigator.geolocation) {
      setStatus({ message: "", error: "Geolocation is not supported by this browser." });
      return;
    }
    
    setLoading(true);
    setStatus({ message: "", error: "" });
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });
      
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      
      console.log("Teacher GPS:", latitude, longitude);
      
      const payload = {
        userId: user.userId,
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        latitude: latitude,
        longitude: longitude,
      };
      
      console.log("[QR Generate] Sending payload:", payload);
      
      const response = await api.post("/qr/generate", payload);
      
      setSession(response.data);
      setAttendanceSessionId(response.data?.attendanceSessionId);
      setAttendance([]);
      setNewlyScanned(new Set());
      setStatus({ message: "QR session generated successfully.", error: "" });
      
      // Refresh masterlist to show current attendance status
      await fetchMasterlist(selectedSection);
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Please enable location to generate QR");
        setStatus({ message: "", error: "Location permission is required to generate QR codes." });
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setStatus({ message: "", error: "Location information is unavailable. Please check your GPS settings." });
      } else if (error.code === error.TIMEOUT) {
        setStatus({ message: "", error: "Location request timed out. Please try again." });
      } else {
        const errorMsg = getErrorMessage(error, "Failed to generate QR session. Please ensure the section is properly configured.");
        console.error("[QR Generate] Error:", errorMsg);
        const friendlyMsg = getFriendlyErrorMessage(errorMsg);
        setStatus({ message: "", error: friendlyMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendanceSubmit = async (studentDbId, statusValue) => {
    // Prevent duplicate/spam clicks and if class is over
    // NOTE: studentDbId is the database ID (student.id), NOT studentId (student number)
    if (manualLoading || !isClassTimeActive || manualAttendance[studentDbId] === statusValue) return;
    
    if (!selectedSection || !statusValue) return;
    
    console.log("[Manual Attendance] Debug - selectedSection:", selectedSection);
    
    const sectionId = selectedSection.id ?? selectedSection.sectionId;
    const subjectId = selectedSection.subjectId ?? selectedSection.subject?.id;
    // TeacherId from TeacherAssignments (not Users.Id - see note below)
    const teacherId = selectedSection.teacherId ?? selectedSection.teacher?.id;
    
    console.log("[Manual Attendance] Debug - sectionId:", sectionId, "subjectId:", subjectId, "teacherId:", teacherId);
    
    if (!sectionId) {
      setManualStatus({ message: "", error: "Section ID is missing." });
      return;
    }
    
    if (!subjectId) {
      setManualStatus({ message: "", error: "Subject ID is missing. Please select a valid section." });
      console.error("[Manual Attendance] Error: Subject ID is missing");
      return;
    }
    
    if (!teacherId) {
      setManualStatus({ message: "", error: "Teacher assignment ID is missing. This section may not be properly configured." });
      console.error("[Manual Attendance] Error: teacherId is missing from section:", selectedSection);
      return;
    }
    
    setManualLoading(true);
    setManualStatus({ message: "", error: "" });
    
    try {
      // IMPORTANT: Backend uses TeacherAssignments table with (TeacherId, SectionId, SubjectId)
      // TeacherId here is from Teachers table (via TeacherAssignments), NOT Users table
      // user.userId is from Users table and won't match TeacherAssignments.TeacherId
      const payload = {
        studentId: Number(studentDbId),
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        teacherId: Number(teacherId),
        status: statusValue,
      };
      
      console.log("[Manual Attendance] Submitting:", payload);
      
      await api.post("/attendance/manual", payload);
      
      // Update local state
      setManualAttendance(prev => ({
        ...prev,
        [studentDbId]: statusValue,
      }));
      
      setManualStatus({ message: `Marked ${statusValue} successfully!`, error: "" });
      
      // Refresh masterlist to reflect changes
      await fetchMasterlist(selectedSection);
      
      setTimeout(() => setManualStatus({ message: "", error: "" }), 3000);
    } catch (error) {
      const errorMsg = getErrorMessage(error, "Failed to mark attendance. Please try again.");
      console.error("[Manual Attendance] Error:", errorMsg);
      const friendlyMsg = getFriendlyErrorMessage(errorMsg);
      setManualStatus({ 
        message: "", 
        error: friendlyMsg
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
        updatedManual[a.studentDbId] = a.status;
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
        console.log("[Attendance] Refreshing masterlist after fetch");
        await fetchMasterlist(selectedSection);
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      console.error("[Attendance] Error:", errorMsg);
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

  // Fetch existing active QR session when entering QR mode
  useEffect(() => {
    if (selectedSection && selectedMode === "QR") {
      console.log("[QR Mode] Entering QR mode, fetching active session...");
      fetchActiveQRSession(selectedSection);
    }
  }, [selectedSection, selectedMode]);

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Teacher Dashboard</h1>
                <p className="mt-2 text-sm text-slate-600">Generate QR sessions and monitor attendance in real time.</p>
              </div>
              {selectedMode && (
                <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  selectedMode === 'QR'
                    ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200'
                    : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                }`}>
                  {selectedMode === 'QR' ? 'QR Mode' : 'Manual Mode'}
                </div>
              )}
            </div>
          </header>

          {status.error && <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>}
          {status.message && <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>}

          <section id="class-list" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">My Subjects</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a subject to view attendance.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sectionsLoading ? (
                <div className="col-span-full">
                  <EmptyState icon="" title="Loading" description="Fetching your sections..." />
                </div>
              ) : sections.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon="" title="No Sections" description="You don't have any sections yet. Contact your administrator." />
                </div>
              ) : (
                sections.map((section) => {
                  const sectionId = section.id ?? section.sectionId;
                  const subjectId = section.subjectId ?? section.subject?.id;
                  const selectedSectionId = selectedSection?.id ?? selectedSection?.sectionId;
                  const selectedSubjectId = selectedSection?.subjectId ?? selectedSection?.subject?.id;
                  const isSelected = selectedSectionId === sectionId && selectedSubjectId === subjectId;
                  return (
                    <button
                      key={`${sectionId}-${subjectId}`}
                      type="button"
                      onClick={() => {
                        console.log("[Subject Click] Selected subject:", { sectionId, subjectId, section });
                        setSelectedSection(section);
                        fetchMasterlist(section);
                      }}
                      className={`rounded-3xl border p-6 text-left transition ${isSelected ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Subject</p>
                      <h3 className="mt-3 text-xl font-semibold text-slate-900">{section.subjectName ?? section.subject ?? `Subject ${subjectId}`}</h3>
                      <p className="mt-2 text-sm text-slate-600">{section.sectionName ?? section.section ?? `Section ${sectionId}`}</p>
                      {Array.isArray(section.schedules) && section.schedules.length > 0 ? (
                        <div className="mt-1 space-y-1 text-xs text-slate-500">
                          {section.schedules.map((schedule, idx) => (
                            <p key={idx}>
                              {schedule.day} {formatTimeTo12Hour(schedule.startTime)} - {formatTimeTo12Hour(schedule.endTime)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">No schedule</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Guidance Message */}
          {!selectedSection && sections.length > 0 && !selectedMode && (
            <section className="rounded-3xl bg-slate-50 p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-center">
                <p className="text-slate-600">Please select a subject to proceed.</p>
              </div>
            </section>
          )}

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
                  disabled={loading || !isClassTimeActive}
                  onClick={handleGenerate}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Generating..." : session ? "QR Already Generated" : "Generate QR"}
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

            {!isClassTimeActive && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
                <p className="text-sm font-semibold text-rose-700">Class time is over. Attendance is closed.</p>
              </div>
            )}

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
                        {countdown > 0 ? 'Active' : 'Expired'}
                      </span>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center">
                      <QRCode value={session.token} size={240} />
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
                    icon=""
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
                            <div>
                              <p className="text-sm font-medium text-slate-900">{student.studentName || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">Student ID: {student.studentId || student.id}</p>
                              {student.section && (
                                <p className="text-xs text-slate-500">Section: {student.section}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            student.status?.toLowerCase() === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.status?.toLowerCase() === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
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

            {!isClassTimeActive && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
                <p className="text-sm font-semibold text-rose-700">Class time is over. Attendance is closed.</p>
              </div>
            )}

            {manualStatus.error && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{manualStatus.error}</div>
            )}
            {manualStatus.message && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{manualStatus.message}</div>
            )}

            <div className="mt-6">
              {!selectedSection ? (
                <EmptyState icon="" title="No Section Selected" description="Select a section from 'My Sections' to mark attendance." />
              ) : sectionStudents.length === 0 ? (
                <EmptyState icon="" title="No Students" description="This section has no students assigned yet." />
              ) : (
                <>
                  {(() => {
                   const filteredStudents = sectionStudents.filter(student =>
  !attendance.some(a => a.studentDbId === student.id)
);

                    if (filteredStudents.length === 0) {
                      return (
                        <EmptyState icon="" title="All Caught Up" description="All students have already scanned via QR code." />
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{student.studentName || 'Unknown'}</p>
                        <p className="text-sm text-slate-600">Student ID: {student.studentId || student.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Present', icon: '', bgSelected: '#059669', textSelected: '#fff', bgUnselected: '#fff', border: '#a3e635', text: '#166534' },
                          { label: 'Late', icon: '', bgSelected: '#d97706', textSelected: '#fff', bgUnselected: '#fff', border: '#fcd34d', text: '#92400e' },
                          { label: 'Absent', icon: '', bgSelected: '#dc2626', textSelected: '#fff', bgUnselected: '#fff', border: '#fca5a5', text: '#991b1b' }
                        ].map((status) => (
                          <button
                            key={status.label}
                            type="button"
                            disabled={manualLoading || !isClassTimeActive}
                            onClick={() => handleManualAttendanceSubmit(student.id, status.label)}
                            style={{
                              backgroundColor: manualAttendance[student.id] === status.label ? status.bgSelected : status.bgUnselected,
                              color: manualAttendance[student.id] === status.label ? status.textSelected : status.text,
                              borderWidth: '1px',
                              borderColor: status.border,
                              borderRadius: '0.5rem',
                              paddingLeft: '1rem',
                              paddingRight: '1rem',
                              paddingTop: '0.5rem',
                              paddingBottom: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: manualLoading || !isClassTimeActive ? 'not-allowed' : 'pointer',
                              opacity: manualLoading || !isClassTimeActive ? '0.5' : '1',
                              transition: 'all 200ms',
                            }}
                          >
                            {status.icon} {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
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
