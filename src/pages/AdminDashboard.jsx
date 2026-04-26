import { useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";

// Pure validation functions - NO setState calls
const validateStudentId = (value) => {
  if (!value || !value.trim()) {
    return "Student ID is required";
  }
  return "";
};

const validateName = (value) => {
  if (!value || !value.trim()) {
    return "Name is required";
  }
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(value.trim())) {
    return "Name must contain letters and spaces only";
  }
  return "";
};

const validateSection = (value) => {
  if (!value || value === "") {
    return "Section must be selected";
  }
  return "";
};

const validateParentName = (value) => {
  if (!value || !value.trim()) {
    return "Parent name is required";
  }
  return "";
};

const validateParentUsername = (value) => {
  if (!value || !value.trim()) {
    return "Parent username is required";
  }
  return "";
};

const validateParentPassword = (value) => {
  if (!value || !value.trim()) {
    return "Parent password is required";
  }
  return "";
};

const validateEmail = (value) => {
  if (!value || !value.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return "Email is invalid";
  }
  return "";
};

const validateUsername = (value) => {
  if (!value || !value.trim()) {
    return "Username is required";
  }
  const usernameRegex = /^[a-zA-Z0-9_\.\-]{3,30}$/;
  if (!usernameRegex.test(value.trim())) {
    return "Username must be 3-30 characters and may include letters, numbers, underscores, dots, or dashes";
  }
  return "";
};

const validateTeacherPassword = (value) => {
  if (!value || !value.trim()) {
    return "Password is required";
  }
  if (value.length < 6) {
    return "Password must be at least 6 characters";
  }
  return "";
};

const AdminDashboard = () => {
  const [studentForm, setStudentForm] = useState({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
  const [studentFormErrors, setStudentFormErrors] = useState({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
  const [studentFormTouched, setStudentFormTouched] = useState({ studentId: false, name: false, sectionId: false, parentName: false, parentUsername: false, parentPassword: false });
  const [sectionForm, setSectionForm] = useState({ name: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", username: "", password: "", email: "" });
  const [teacherFormErrors, setTeacherFormErrors] = useState({ name: "", username: "", password: "", email: "" });
  const [teacherFormTouched, setTeacherFormTouched] = useState({ name: false, username: false, password: false, email: false });
  const [assignForm, setAssignForm] = useState({
    sectionId: "",
    teacherId: "",
    subjectId: "",
    schedules: [{ day: "", startTime: "", endTime: "" }],
  });
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  
  const [editSection, setEditSection] = useState(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [deleteSection, setDeleteSection] = useState(null);
  
  const [editTeacher, setEditTeacher] = useState(null);
  const [editTeacherData, setEditTeacherData] = useState({ name: "", username: "", password: "", email: "" });
  const [deleteTeacher, setDeleteTeacher] = useState(null);
  
  const [editStudent, setEditStudent] = useState(null);
  const [editStudentData, setEditStudentData] = useState({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
  const [deleteStudent, setDeleteStudent] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);

  const [selectedSection, setSelectedSection] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSection, searchQuery]);

  const filteredStudents = selectedSection ? students.filter(s => s.sectionId == selectedSection) : students;
  const searchedStudents = filteredStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(searchedStudents.length / studentsPerPage);
  const paginatedStudents = searchedStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const apiRoutes = useMemo(
    () => ({
      students: "/admin/students",
      teachers: "/admin/teachers",
      subjects: "/admin/subjects",
      sections: "/admin/sections",
      createTeacher: "/admin/create-teacher",
      createSection: "/admin/create-section",
      createSubject: "/admin/create-subject",
      assignTeacherSubject: "/admin/assign-teacher-subject",
    }),
    []
  );

  const isDuplicateStudentId = (studentId) => {
    const normalized = String(studentId).trim().toLowerCase();
    return students.some((student) => String(student.studentId).trim().toLowerCase() === normalized);
  };

  const isDuplicateUsername = (username, excludeTeacherId = null) => {
    const normalized = String(username).trim().toLowerCase();
    const teacherCollision = teachers.some(
      (teacher) => teacher.id !== excludeTeacherId && String(teacher.username || "").trim().toLowerCase() === normalized
    );
    if (teacherCollision) return true;
    return students.some(
      (student) => String(student.parentUsername || "").trim().toLowerCase() === normalized
    );
  };

  const getTeacherFormErrors = (formData, excludeTeacherId = null, requirePassword = true) => {
    const errors = {
      name: validateName(formData.name),
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      password: requirePassword ? validateTeacherPassword(formData.password) : "",
    };

    if (!errors.username && isDuplicateUsername(formData.username, excludeTeacherId)) {
      errors.username = "Username already exists";
    }

    return errors;
  };

  const getStudentFormErrors = (formData) => {
    const errors = {
      studentId: validateStudentId(formData.studentId),
      name: validateName(formData.name),
      sectionId: validateSection(formData.sectionId),
      parentName: validateParentName(formData.parentName),
      parentUsername: validateParentUsername(formData.parentUsername),
      parentPassword: validateParentPassword(formData.parentPassword),
    };

    if (!errors.studentId && isDuplicateStudentId(formData.studentId)) {
      errors.studentId = "Student ID already exists";
    }

    if (!errors.parentUsername && isDuplicateUsername(formData.parentUsername)) {
      errors.parentUsername = "Username already exists";
    }

    return errors;
  };

  const isStudentFormValidPure = (formData) => {
    const errors = getStudentFormErrors(formData);
    return Object.values(errors).every((error) => error === "");
  };

  const isTeacherFormValidPure = (formData) => {
    const errors = getTeacherFormErrors(formData);
    return Object.values(errors).every((error) => error === "");
  };

  const handleTeacherInputChange = (field, value) => {
    setTeacherForm((current) => ({ ...current, [field]: value }));
    if (teacherFormTouched[field]) {
      setTeacherFormErrors((current) => ({
        ...current,
        [field]: field === "name"
          ? validateName(value)
          : field === "username"
          ? validateUsername(value)
          : field === "password"
          ? validateTeacherPassword(value)
          : field === "email"
          ? validateEmail(value)
          : "",
      }));
    }
  };

  const handleTeacherFieldBlur = (field) => {
    setTeacherFormTouched((current) => ({ ...current, [field]: true }));
    setTeacherFormErrors((current) => ({
      ...current,
      [field]: field === "name"
        ? validateName(teacherForm.name)
        : field === "username"
        ? validateUsername(teacherForm.username)
        : field === "password"
        ? validateTeacherPassword(teacherForm.password)
        : field === "email"
        ? validateEmail(teacherForm.email)
        : "",
    }));
  };

  const navigationSections = useMemo(
    () => [
      { id: "students", label: "Add Student" },
      { id: "sections", label: "Create Section" },
      { id: "subjects", label: "Create Subject" },
      { id: "teachers", label: "Create Teacher" },
      { id: "assign", label: "Assign Teacher Subject" },
    ],
    []
  );

  // Validate and handle student input changes
  const handleStudentInputChange = (field, value) => {
    let processedValue = value;

    // Auto-trim spaces for most fields
    if (field !== "parentPassword") {
      processedValue = value.trimStart();
    }

    setStudentForm((current) => ({ ...current, [field]: processedValue }));

    // Real-time validation only if field is already touched
    if (studentFormTouched[field]) {
      let error = "";
      if (field === "studentId") error = validateStudentId(processedValue);
      else if (field === "name") error = validateName(processedValue);
      else if (field === "sectionId") error = validateSection(processedValue);
      else if (field === "parentName") error = validateParentName(processedValue);
      else if (field === "parentUsername") error = validateParentUsername(processedValue);
      else if (field === "parentPassword") error = validateParentPassword(processedValue);

      setStudentFormErrors((current) => ({ ...current, [field]: error }));
    }
  };

  // Mark field as touched and validate on blur
  const handleStudentFieldBlur = (field) => {
    setStudentFormTouched((current) => ({ ...current, [field]: true }));
    
    // Validate on blur
    let error = "";
    if (field === "studentId") error = validateStudentId(studentForm.studentId);
    else if (field === "name") error = validateName(studentForm.name);
    else if (field === "sectionId") error = validateSection(studentForm.sectionId);
    else if (field === "parentName") error = validateParentName(studentForm.parentName);
    else if (field === "parentUsername") error = validateParentUsername(studentForm.parentUsername);
    else if (field === "parentPassword") error = validateParentPassword(studentForm.parentPassword);

    setStudentFormErrors((current) => ({ ...current, [field]: error }));
  };

  const submitForm = async (endpoint, payload, successText) => {
    console.log("submitForm start", endpoint, payload);
    setLoading(true);

    try {
      const response = await api.post(endpoint, payload);
      const successMessage = response?.data?.message || successText;
      toast.success(successMessage);
      console.log("submitForm success", response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Request failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        (error.response?.data ? JSON.stringify(error.response.data) : null) ||
        error.message ||
        "Request failed";
      toast.error(errorMessage);
      console.log("submitForm error", errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      console.log("submitForm finished", endpoint, { loading: false });
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get(apiRoutes.subjects);
      setSubjects(response.data || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      toast.error("Unable to load subjects.");
    }
  };

  const fetchSections = async () => {
    try {
      const response = await api.get(apiRoutes.sections);
      setSections(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      toast.error("Unable to load sections.");
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get(apiRoutes.teachers);
      setTeachers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      toast.error("Unable to load teachers.");
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get(apiRoutes.students);
      setStudents(response.data || []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Unable to load students.");
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchSections();
    fetchTeachers();
    fetchStudents();
  }, []);

  const handleStudentCreate = async (event) => {
    event.preventDefault();

    const errors = getStudentFormErrors(studentForm);
    if (Object.values(errors).some((error) => error !== "")) {
      setStudentFormErrors(errors);
      setStudentFormTouched({ studentId: true, name: true, sectionId: true, parentName: true, parentUsername: true, parentPassword: true });
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    const response = await submitForm(apiRoutes.students, {
      studentId: studentForm.studentId.trim(),
      name: studentForm.name.trim(),
      sectionId: Number(studentForm.sectionId),
      parentName: studentForm.parentName.trim(),
      parentUsername: studentForm.parentUsername.trim(),
      parentPassword: studentForm.parentPassword,
    }, "Student created successfully.");

    if (!response.success) {
      return;
    }

    setStudentForm({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
    setStudentFormErrors({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
    setStudentFormTouched({ studentId: false, name: false, sectionId: false, parentName: false, parentUsername: false, parentPassword: false });
    fetchStudents();
  };

  const handleSubjectCreate = async (event) => {
    event.preventDefault();
    if (!subjectForm.name.trim()) {
      toast.error("Subject name is required.");
      return;
    }
    const response = await submitForm(apiRoutes.createSubject, { name: subjectForm.name }, "Subject created successfully.");
    if (!response.success) {
      return;
    }
    setSubjectForm({ name: "" });
    fetchSubjects(); // Refresh the list
  };

  const handleSectionCreate = async (event) => {
    event.preventDefault();
    if (!sectionForm.name.trim()) {
      toast.error("Section name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.post(apiRoutes.createSection, { name: sectionForm.name });
      toast.success("Section created successfully.");
      setSectionForm({ name: "" });
      fetchSections(); // Refresh the list
    } catch (error) {
      console.error("Create failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Create failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherCreate = async (event) => {
    event.preventDefault();
    console.log("Teacher create submit handler triggered", teacherForm);

    const errors = getTeacherFormErrors(teacherForm);
    if (Object.values(errors).some((error) => error !== "")) {
      console.log("Teacher create validation failed", errors);
      setTeacherFormErrors(errors);
      setTeacherFormTouched({ name: true, username: true, password: true, email: true });
      toast.error(errors.username || errors.email || errors.name || errors.password || "Please fix the highlighted fields before submitting.");
      return;
    }

    const response = await submitForm(apiRoutes.createTeacher, {
      name: teacherForm.name.trim(),
      username: teacherForm.username.trim(),
      password: teacherForm.password,
      email: teacherForm.email.trim(),
    }, "Teacher created successfully.");

    if (!response.success) {
      console.log("Teacher create request failed", response.error);
      return;
    }

    console.log("Teacher create request succeeded", response.data);
    setTeacherForm({ name: "", username: "", password: "", email: "" });
    setTeacherFormErrors({ name: "", username: "", password: "", email: "" });
    setTeacherFormTouched({ name: false, username: false, password: false, email: false });
    fetchTeachers(); // Refresh the list
  };

  const addScheduleRow = () => {
    setAssignForm((current) => {
      if (current.schedules.length >= 3) return current;
      return {
        ...current,
        schedules: [...current.schedules, { day: "", startTime: "", endTime: "" }],
      };
    });
  };

  const removeScheduleRow = (index) => {
    setAssignForm((current) => {
      if (current.schedules.length <= 1) return current;
      return {
        ...current,
        schedules: current.schedules.filter((_, idx) => idx !== index),
      };
    });
  };

  const updateScheduleRow = (index, field, value) => {
    setAssignForm((current) => ({
      ...current,
      schedules: current.schedules.map((schedule, idx) =>
        idx === index ? { ...schedule, [field]: value } : schedule
      ),
    }));
  };

  const handleAssignTeacher = async (event) => {
    event.preventDefault();
    if (!assignForm.sectionId || !assignForm.teacherId || !assignForm.subjectId || assignForm.schedules.some(s => !s.day || !s.startTime || !s.endTime)) {
      toast.error("Please fill all required fields.");
      return;
    }
    const payload = {
      teacherId: Number(assignForm.teacherId),
      sectionId: Number(assignForm.sectionId),
      subjectId: Number(assignForm.subjectId),
      schedules: assignForm.schedules.map((schedule) => ({
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    };
    console.log("FINAL PAYLOAD:", payload);
    const response = await submitForm(apiRoutes.assignTeacherSubject, payload, "Teacher assigned successfully.");
    if (response.success) {
      setAssignForm({
        sectionId: "",
        teacherId: "",
        subjectId: "",
        schedules: [{ day: "", startTime: "", endTime: "" }],
      });
    }
  };

  const handleEditSubject = async (event) => {
    event?.preventDefault();
    if (!editSubject) return;
    if (!editSubjectName.trim()) {
      toast.error("Subject name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/admin/subject/${editSubject.id}`, { name: editSubjectName });
      toast.success("Subject updated successfully.");
      setEditSubject(null);
      setEditSubjectName("");
      fetchSubjects();
    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Update failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subject) => {
    setLoading(true);
    try {
      await api.delete(`/admin/subject/${subject.id}`);
      toast.success("Subject deleted successfully.");
      fetchSubjects();
    } catch (error) {
      const errorData = error.response?.data;
      const hasAssignments =
        errorData?.hasAssignments ||
        (typeof errorData === "string" &&
          errorData.toLowerCase().includes("assigned"));
      if (hasAssignments) {
        setDeleteModal({
          title: "Confirm Deletion",
          message: "This subject is assigned to teachers. Deleting it will remove all assignments. Are you sure?",
          onConfirm: async () => {
            setLoading(true);
            try {
              await api.delete(`/admin/subject/${subject.id}?force=true`);
              toast.success("Subject and assignments deleted successfully.");
              fetchSubjects();
              setDeleteModal(null);
            } catch (forceError) {
              toast.error(
                forceError.response?.data?.message ||
                  forceError.message ||
                  "Force delete failed"
              );
            } finally {
              setLoading(false);
            }
          },
          onCancel: () => setDeleteModal(null)
        });
      } else {
        toast.error(
          errorData?.message ||
            error.message ||
            "Delete failed"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = async (event) => {
    event?.preventDefault();
    if (!editSection) return;
    if (!editSectionName.trim()) {
      toast.error("Section name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/admin/section/${editSection.id}`, { name: editSectionName });
      toast.success("Section updated successfully.");
      setEditSection(null);
      setEditSectionName("");
      fetchSections();
    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Update failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteSection) return;
    setLoading(true);
    try {
      await api.delete(`/admin/section/${deleteSection.id}`);
      toast.success("Section deleted successfully.");
      setDeleteSection(null);
      fetchSections();
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Delete failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeacher = async (event) => {
    event?.preventDefault();
    if (!editTeacher) return;

    const errors = getTeacherFormErrors(editTeacherData, editTeacher.id, false);
    if (Object.values(errors).some((error) => error !== "")) {
      toast.error(errors.username || errors.email || errors.name || errors.password || "Please fix the highlighted fields before updating.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: editTeacherData.name.trim(),
        username: editTeacherData.username.trim(),
        email: editTeacherData.email.trim(),
      };
      if (editTeacherData.password) {
        payload.password = editTeacherData.password;
      }
      await api.put(`${apiRoutes.teachers}/${editTeacher.id}`, payload);
      toast.success("Teacher updated successfully.");
      setEditTeacher(null);
      setEditTeacherData({ name: "", username: "", password: "", email: "" });
      fetchTeachers();
    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Update failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTeacher) return;
    setLoading(true);
    try {
      await api.delete(`/admin/teacher/${deleteTeacher.id}`);
      toast.success("Teacher deleted successfully.");
      setDeleteTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Delete failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (event) => {
    event?.preventDefault();
    if (!editStudent) return;
    if (!editStudentData.name.trim()) {
      toast.error("Student name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/admin/student/${editStudent.id}`, {
        studentId: editStudentData.studentId,
        name: editStudentData.name,
        sectionId: Number(editStudentData.sectionId),
        parentName: editStudentData.parentName,
        parentUsername: editStudentData.parentUsername,
        parentPassword: editStudentData.parentPassword,
      });
      toast.success("Student updated successfully.");
      setEditStudent(null);
      setEditStudentData({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
      fetchStudents();
    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Update failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;
    setLoading(true);
    try {
      await api.delete(`/admin/student/${deleteStudent.id}`);
      toast.success("Student deleted successfully.");
      setDeleteStudent(null);
      fetchStudents();
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Delete failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <ToastContainer position="top-right" autoClose={3000} pauseOnHover newestOnTop />
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar links={navigationSections} />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Manage students, sections, teachers, and assignments.</p>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Students Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm ring-1 ring-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Students</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">{students.length}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Total Teachers Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm ring-1 ring-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Total Teachers</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">{teachers.length}</p>
                </div>
                <div className="text-4xl">👨‍🏫</div>
              </div>
            </div>

            {/* Total Subjects Card */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm ring-1 ring-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Subjects</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">{subjects.length}</p>
                </div>
                <div className="text-4xl">📚</div>
              </div>
            </div>

            {/* Total Sections Card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm ring-1 ring-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Total Sections</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{sections.length}</p>
                </div>
                <div className="text-4xl">🏫</div>
              </div>
            </div>
          </div>

          <section id="students" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">{editStudent ? "Edit Student" : "Add Student"}</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={editStudent ? handleEditStudent : handleStudentCreate}>
              {/* Student ID */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Student ID</span>
                <input
                  type="text"
                  value={editStudent ? editStudentData.studentId : studentForm.studentId}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, studentId: e.target.value })) : handleStudentInputChange("studentId", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("studentId")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.studentId && studentFormTouched.studentId
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.studentId && studentFormTouched.studentId && studentForm.studentId.trim()
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  placeholder="Enter Student ID"
                  required={!editStudent}
                />
                {!editStudent && studentFormErrors.studentId && studentFormTouched.studentId && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.studentId}</p>
                )}
              </label>

              {/* Name */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={editStudent ? editStudentData.name : studentForm.name}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, name: e.target.value })) : handleStudentInputChange("name", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("name")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.name && studentFormTouched.name
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.name && studentFormTouched.name && studentForm.name.trim()
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  placeholder="Enter Name"
                  required={!editStudent}
                />
                {!editStudent && studentFormErrors.name && studentFormTouched.name && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.name}</p>
                )}
              </label>

              {/* Section */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Section</span>
                <select
                  value={editStudent ? editStudentData.sectionId : studentForm.sectionId}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, sectionId: e.target.value })) : handleStudentInputChange("sectionId", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("sectionId")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.sectionId && studentFormTouched.sectionId
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.sectionId && studentFormTouched.sectionId && studentForm.sectionId
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  required={!editStudent}
                >
                  <option value="">-- Select Section --</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                {!editStudent && studentFormErrors.sectionId && studentFormTouched.sectionId && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.sectionId}</p>
                )}
              </label>

              {/* Parent Name */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Parent Name</span>
                <input
                  type="text"
                  value={editStudent ? editStudentData.parentName : studentForm.parentName}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, parentName: e.target.value })) : handleStudentInputChange("parentName", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("parentName")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.parentName && studentFormTouched.parentName
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.parentName && studentFormTouched.parentName && studentForm.parentName.trim()
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  placeholder="Enter Parent Name"
                  required={!editStudent}
                />
                {!editStudent && studentFormErrors.parentName && studentFormTouched.parentName && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.parentName}</p>
                )}
              </label>

              {/* Parent Username */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Parent Username</span>
                <input
                  type="text"
                  value={editStudent ? editStudentData.parentUsername : studentForm.parentUsername}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, parentUsername: e.target.value })) : handleStudentInputChange("parentUsername", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("parentUsername")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.parentUsername && studentFormTouched.parentUsername
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.parentUsername && studentFormTouched.parentUsername && studentForm.parentUsername.trim()
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  placeholder="Enter Parent Username"
                  required={!editStudent}
                />
                {!editStudent && studentFormErrors.parentUsername && studentFormTouched.parentUsername && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.parentUsername}</p>
                )}
              </label>

              {/* Parent Password */}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Parent Password</span>
                <input
                  type="password"
                  value={editStudent ? editStudentData.parentPassword : studentForm.parentPassword}
                  onChange={(e) => editStudent ? setEditStudentData((current) => ({ ...current, parentPassword: e.target.value })) : handleStudentInputChange("parentPassword", e.target.value)}
                  onBlur={() => !editStudent && handleStudentFieldBlur("parentPassword")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editStudent
                      ? "border-slate-200 bg-slate-50"
                      : studentFormErrors.parentPassword && studentFormTouched.parentPassword
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : !studentFormErrors.parentPassword && studentFormTouched.parentPassword && studentForm.parentPassword.trim()
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  placeholder="Enter password"
                  required={!editStudent}
                />
                {!editStudent && studentFormErrors.parentPassword && studentFormTouched.parentPassword && (
                  <p className="mt-1 text-sm text-rose-600">{studentFormErrors.parentPassword}</p>
                )}
              </label>

              {/* Submit Buttons */}
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : editStudent ? "Update Student" : "Create Student"}
                </button>
                {editStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditStudent(null);
                      setEditStudentData({ studentId: "", name: "", sectionId: "", parentName: "", parentUsername: "", parentPassword: "" });
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Students Data Table */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Existing Students</h3>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">All Sections</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={fetchStudents}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                   Refresh
                </button>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
                />
              </div>
              {searchedStudents.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon="👤" title="No Students" description={students.length === 0 ? "Start by adding students to the system." : "No students match your search criteria."} />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Student ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Section</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Parent Account Created</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                     {paginatedStudents.map((student) => (
  <tr key={student.studentId} className="transition hover:bg-slate-50">
    <td className="px-6 py-4 text-slate-900">{student.studentId}</td>
    <td className="px-6 py-4 text-slate-900">{student.name}</td>
    <td className="px-6 py-4 text-slate-600">
      {student.section || 'N/A'}
    </td>
    <td className="px-6 py-4 text-slate-600">
      Created
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setEditStudent(student);
            setEditStudentData({
              studentId: student.studentId,
              name: student.name,
              sectionId: student.sectionId || "",
              parentName: student.parentName || "",
              parentUsername: student.parentUsername || "",
              parentPassword: "",
            });
          }}
          className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setDeleteStudent(student)}
          className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-200"
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section id="sections" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{editSection ? "Edit Section" : "Create Section"}</h2>
              <button
                type="button"
                onClick={fetchSections}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={editSection ? handleEditSection : handleSectionCreate}>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Section Name</span>
                <input
                  type="text"
                  value={editSection ? editSectionName : sectionForm.name}
                  onChange={(e) => editSection ? setEditSectionName(e.target.value) : setSectionForm({ name: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Saving..." : editSection ? "Update Section" : "Create Section"}
                </button>
                {editSection && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditSection(null);
                      setEditSectionName("");
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Sections Data Table */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Existing Sections</h3>
              {sections.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon="📚" title="No Sections" description="Create sections before adding students and teachers." />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Section ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sections.map((section) => (
                        <tr key={section.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{section.id}</td>
                          <td className="px-6 py-4 text-slate-900">{section.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditSection(section);
                                  setEditSectionName(section.name);
                                  // Scroll to section form
                                  document.getElementById("sections")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteSection(section)}
                                className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section id="subjects" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Create Subject</h2>
              </div>
              <button
                type="button"
                onClick={fetchSubjects}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                 Refresh
              </button>
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubjectCreate}>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Subject Name</span>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ name: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Saving..." : "Add Subject"}
                </button>
              </div>
            </form>

            {/* Subjects Data Table */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Existing Subjects</h3>
              {subjects.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon="📖" title="No Subjects" description="Start by creating subjects for your institution." />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Subject ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {subjects.map((subject) => (
                        <tr key={subject.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{subject.id}</td>
                          <td className="px-6 py-4 text-slate-900">{subject.name}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditSubject(subject);
                                setEditSubjectName(subject.name);
                              }}
                              className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(subject)}
                              className="rounded-lg bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700 transition hover:bg-rose-200"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section id="teachers" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{editTeacher ? "Edit Teacher" : "Create Teacher"}</h2>
              <button
                type="button"
                onClick={fetchTeachers}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={editTeacher ? handleEditTeacher : handleTeacherCreate}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={editTeacher ? editTeacherData.name : teacherForm.name}
                  onChange={(e) => editTeacher ? setEditTeacherData((current) => ({ ...current, name: e.target.value })) : handleTeacherInputChange("name", e.target.value)}
                  onBlur={() => !editTeacher && handleTeacherFieldBlur("name")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editTeacher
                      ? "border-slate-200 bg-slate-50"
                      : teacherFormTouched.name && teacherFormErrors.name
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : teacherFormTouched.name && !teacherFormErrors.name
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                />
                {!editTeacher && teacherFormTouched.name && teacherFormErrors.name && (
                  <p className="mt-1 text-sm text-rose-600">{teacherFormErrors.name}</p>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Username</span>
                <input
                  type="text"
                  value={editTeacher ? editTeacherData.username : teacherForm.username}
                  onChange={(e) => editTeacher ? setEditTeacherData((current) => ({ ...current, username: e.target.value })) : handleTeacherInputChange("username", e.target.value)}
                  onBlur={() => !editTeacher && handleTeacherFieldBlur("username")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editTeacher
                      ? "border-slate-200 bg-slate-50"
                      : teacherFormTouched.username && teacherFormErrors.username
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : teacherFormTouched.username && !teacherFormErrors.username
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                />
                {!editTeacher && teacherFormTouched.username && teacherFormErrors.username && (
                  <p className="mt-1 text-sm text-rose-600">{teacherFormErrors.username}</p>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{editTeacher ? "Password (leave empty to keep current)" : "Password"}</span>
                <input
                  type="password"
                  value={editTeacher ? editTeacherData.password : teacherForm.password}
                  onChange={(e) => editTeacher ? setEditTeacherData((current) => ({ ...current, password: e.target.value })) : handleTeacherInputChange("password", e.target.value)}
                  onBlur={() => !editTeacher && handleTeacherFieldBlur("password")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editTeacher
                      ? "border-slate-200 bg-slate-50"
                      : teacherFormTouched.password && teacherFormErrors.password
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : teacherFormTouched.password && !teacherFormErrors.password
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                />
                {!editTeacher && teacherFormTouched.password && teacherFormErrors.password && (
                  <p className="mt-1 text-sm text-rose-600">{teacherFormErrors.password}</p>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={editTeacher ? editTeacherData.email : teacherForm.email}
                  onChange={(e) => editTeacher ? setEditTeacherData((current) => ({ ...current, email: e.target.value })) : handleTeacherInputChange("email", e.target.value)}
                  onBlur={() => !editTeacher && handleTeacherFieldBlur("email")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 transition ${
                    editTeacher
                      ? "border-slate-200 bg-slate-50"
                      : teacherFormTouched.email && teacherFormErrors.email
                      ? "border-rose-500 bg-rose-50 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      : teacherFormTouched.email && !teacherFormErrors.email
                      ? "border-emerald-500 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      : "border-slate-200 bg-slate-50"
                  }`}
                />
                {!editTeacher && teacherFormTouched.email && teacherFormErrors.email && (
                  <p className="mt-1 text-sm text-rose-600">{teacherFormErrors.email}</p>
                )}
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`rounded-2xl px-6 py-3 text-white transition ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-sky-600 hover:bg-sky-700"
                  }`}
                >
                  {loading ? "Saving..." : editTeacher ? "Update Teacher" : "Create Teacher"}
                </button>
                {editTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTeacher(null);
                      setEditTeacherData({ name: "", username: "", password: "", email: "" });
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Teachers Data Table */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Existing Teachers</h3>
                <button
                  type="button"
                  onClick={fetchTeachers}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
              {teachers.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon="👨‍🏫" title="No Teachers" description="Create teachers and assign them to sections." />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Teacher ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{teacher.id}</td>
                          <td className="px-6 py-4 text-slate-900">{teacher.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTeacher(teacher);
                                  setEditTeacherData({
                                    name: teacher.name,
                                    username: teacher.username || "",
                                    password: "",
                                    email: teacher.email || "",
                                  });
                                }}
                                className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTeacher(teacher)}
                                className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section id="assign" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Assign Teacher Subject</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleAssignTeacher}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Section</span>
                <select
                  value={assignForm.sectionId}
                  onChange={(e) => setAssignForm((current) => ({ ...current, sectionId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                >
                  <option value="">-- Select Section --</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Teacher</span>
                <select
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm((current) => ({ ...current, teacherId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Subject</span>
                <select
                  value={assignForm.subjectId}
                  onChange={(e) => setAssignForm((current) => ({ ...current, subjectId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span className="text-sm font-medium text-slate-700">Schedules</span>
                  <button
                    type="button"
                    onClick={addScheduleRow}
                    disabled={assignForm.schedules.length >= 3}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200"
                  >
                    Add Schedule
                  </button>
                </div>

                {/* Labels Header Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: "12px" }}>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Day</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Start Time</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">End Time</span>
                  </div>
                  <div></div>
                </div>

                {/* Schedule Rows */}
                {assignForm.schedules.map((schedule, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: "12px", alignItems: "center" }}>
                    <select
                      value={schedule.day}
                      onChange={(e) => updateScheduleRow(index, "day", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      required
                    >
                      <option value="">-- Select Day --</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => updateScheduleRow(index, "startTime", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      required
                    />
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => updateScheduleRow(index, "endTime", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      required
                    />
                    <button
                      type="button"
                      disabled={assignForm.schedules.length <= 1}
                      onClick={() => removeScheduleRow(index)}
                      className="h-12 rounded-2xl bg-rose-100 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Saving..." : "Assign Teacher"}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      {/* Edit Section Modal - NOT USED (inline form above) */}
      {/* Delete Section Confirmation Dialog */}
      {deleteSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-slate-900">Delete Section</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete "{deleteSection.name}"?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteSection()}
                disabled={loading}
                className="flex-1 rounded-2xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:bg-slate-200"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteSection(null)}
                disabled={loading}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-slate-900">Edit Subject</h3>
            <form onSubmit={handleEditSubject}>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Subject Name</span>
                <input
                  type="text"
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditSubject(null);
                    setEditSubjectName("");
                  }}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

      )}

      {editTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-slate-900">Edit Teacher</h3>
            <form onSubmit={handleEditTeacher}>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={editTeacherData.name}
                  onChange={(e) => setEditTeacherData((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Username</span>
                <input
                  type="text"
                  value={editTeacherData.username}
                  onChange={(e) => setEditTeacherData((current) => ({ ...current, username: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Password (leave empty to keep current)</span>
                <input
                  type="password"
                  value={editTeacherData.password}
                  onChange={(e) => setEditTeacherData((current) => ({ ...current, password: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={editTeacherData.email}
                  onChange={(e) => setEditTeacherData((current) => ({ ...current, email: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTeacher(null);
                    setEditTeacherData({ name: "", username: "", password: "", email: "" });
                  }}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation Dialog */}
      {deleteTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-slate-900">Delete Teacher</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete "{deleteTeacher.name}"?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteTeacher()}
                disabled={loading}
                className="flex-1 rounded-2xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:bg-slate-200"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTeacher(null)}
                disabled={loading}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Dialog */}
      {deleteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-slate-900">Delete Student</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete "{deleteStudent.name}" ({deleteStudent.studentId})?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteStudent()}
                disabled={loading}
                className="flex-1 rounded-2xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:bg-slate-200"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStudent(null)}
                disabled={loading}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <ConfirmationModal
          title={deleteModal.title}
          message={deleteModal.message}
          onConfirm={deleteModal.onConfirm}
          onCancel={deleteModal.onCancel}
        />
      )}
    </div>
  );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 text-slate-700">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
