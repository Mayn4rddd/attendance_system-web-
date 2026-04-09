import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";

const AdminDashboard = () => {
  const [studentForm, setStudentForm] = useState({ studentId: "", name: "", sectionId: "", parentPhone: "" });
  const [sectionForm, setSectionForm] = useState({ name: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", password: "" });
  const [assignForm, setAssignForm] = useState({ sectionId: "", teacherId: "", subjectId: "" });
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalStudents: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendancePercentage: 0,
  });
  const [status, setStatus] = useState({ message: "", error: "" });
  const [loading, setLoading] = useState(false);

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

  const submitForm = async (endpoint, payload, successText) => {
    setLoading(true);
    setStatus({ message: "", error: "" });
    try {
      await api.post(endpoint, payload);
      setStatus({ message: successText, error: "" });
    } catch (error) {
      console.error("Request failed:", error);
      setStatus({ message: "", error: error.response?.data?.message || error.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/admin/subjects");
      setSubjects(response.data || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await api.get("/admin/sections");
      setSections(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get("/admin/teachers");
      setTeachers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const response = await api.get(`/teacher/attendance-summary?sectionId=1&subjectId=1`);
      setAttendanceSummary(response.data || {
        totalStudents: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendancePercentage: 0,
      });
    } catch (error) {
      console.error("Failed to fetch attendance summary:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/admin/students");
      setStudents(response.data || []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
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
    await submitForm("/admin/students", {
      studentId: studentForm.studentId,
      name: studentForm.name,
      sectionId: Number(studentForm.sectionId),
      parentPhone: studentForm.parentPhone,
    }, "Student created successfully.");
    setStudentForm({ studentId: "", name: "", sectionId: "", parentPhone: "" });
    fetchStudents();
  };

  const handleSubjectCreate = async (event) => {
    event.preventDefault();
    await submitForm("/admin/create-subject", { name: subjectForm.name }, "Subject created successfully.");
    setSubjectForm({ name: "" });
    fetchSubjects(); // Refresh the list
  };

  const handleSectionCreate = async (event) => {
    event.preventDefault();
    await submitForm("/admin/create-section", { name: sectionForm.name }, "Section created successfully.");
    setSectionForm({ name: "" });
    fetchSections(); // Refresh the list
  };

  const handleTeacherCreate = async (event) => {
    event.preventDefault();
    await submitForm("/admin/create-teacher", { name: teacherForm.name, password: teacherForm.password }, "Teacher created successfully.");
    setTeacherForm({ name: "", password: "" });
    fetchTeachers(); // Refresh the list
  };

  const handleAssignTeacher = async (event) => {
    event.preventDefault();
    await submitForm("/admin/assign-teacher-subject", {
      teacherId: Number(assignForm.teacherId),
      sectionId: Number(assignForm.sectionId),
      subjectId: Number(assignForm.subjectId),
    }, "Teacher assigned successfully.");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar links={navigationSections} />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Manage students, sections, teachers, and assignments.</p>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Students Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm ring-1 ring-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Students</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">{attendanceSummary.totalStudents}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Present Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm ring-1 ring-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Present</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">{attendanceSummary.present}</p>
                </div>
                <div className="text-4xl">✓</div>
              </div>
            </div>

            {/* Late Card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm ring-1 ring-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Late</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{attendanceSummary.late}</p>
                </div>
                <div className="text-4xl">⏱</div>
              </div>
            </div>

            {/* Absent Card */}
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-6 shadow-sm ring-1 ring-rose-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600">Absent</p>
                  <p className="mt-2 text-3xl font-bold text-rose-900">{attendanceSummary.absent}</p>
                </div>
                <div className="text-4xl">✕</div>
              </div>
            </div>

            {/* Attendance Percentage Card */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm ring-1 ring-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Attendance %</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">{attendanceSummary.attendancePercentage.toFixed(1)}%</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>
          </div>

          {status.error && (
            <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>
          )}
          {status.message && (
            <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>
          )}

          <section id="students" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Add Student</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleStudentCreate}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Student ID</span>
                <input
                  type="text"
                  value={studentForm.studentId}
                  onChange={(e) => setStudentForm((current) => ({ ...current, studentId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Section</span>
                <select
                  value={studentForm.sectionId}
                  onChange={(e) => setStudentForm((current) => ({ ...current, sectionId: e.target.value }))}
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
                <span className="text-sm font-medium text-slate-700">Parent Phone</span>
                <input
                  type="text"
                  value={studentForm.parentPhone}
                  onChange={(e) => setStudentForm((current) => ({ ...current, parentPhone: e.target.value }))}
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
                  {loading ? "Saving..." : "Create Student"}
                </button>
              </div>
            </form>

            {/* Students Data Table */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Existing Students</h3>
                <button
                  type="button"
                  onClick={fetchStudents}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  🔄 Refresh
                </button>
              </div>
              {students.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon="👤" title="No Students" description="Start by adding students to the system." />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Student ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Section</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Parent Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {students.map((student) => (
                        <tr key={student.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{student.studentId}</td>
                          <td className="px-6 py-4 text-slate-900">{student.name}</td>
                          <td className="px-6 py-4 text-slate-600">{student.sectionName || student.section || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-600">{student.parentPhone || 'N/A'}</td>
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
              <div>
                <h2 className="text-2xl font-semibold">Create Section</h2>
              </div>
              <button
                type="button"
                onClick={fetchSections}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                🔄 Refresh
              </button>
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSectionCreate}>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Section Name</span>
                <input
                  type="text"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ name: e.target.value })}
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
                  {loading ? "Saving..." : "Create Section"}
                </button>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sections.map((section) => (
                        <tr key={section.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{section.id}</td>
                          <td className="px-6 py-4 text-slate-900">{section.name}</td>
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
                🔄 Refresh
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
                  disabled={loading || !subjectForm.name.trim()}
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {subjects.map((subject) => (
                        <tr key={subject.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{subject.id}</td>
                          <td className="px-6 py-4 text-slate-900">{subject.name}</td>
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
              <div>
                <h2 className="text-2xl font-semibold">Create Teacher</h2>
              </div>
              <button
                type="button"
                onClick={fetchTeachers}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                🔄 Refresh
              </button>
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleTeacherCreate}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm((current) => ({ ...current, password: e.target.value }))}
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
                  {loading ? "Saving..." : "Create Teacher"}
                </button>
              </div>
            </form>

            {/* Teachers Data Table */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Existing Teachers</h3>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900">{teacher.id}</td>
                          <td className="px-6 py-4 text-slate-900">{teacher.name}</td>
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
    </div>
  );
};

export default AdminDashboard;
