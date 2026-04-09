import { useState } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const StudentDashboard = () => {
  const [registerForm, setRegisterForm] = useState({ studentId: "", name: "", password: "" });
  const [scanForm, setScanForm] = useState({ sessionId: "", token: "", studentId: "" });
  const [registerStatus, setRegisterStatus] = useState({ message: "", error: "" });
  const [scanStatus, setScanStatus] = useState({ message: "", error: "" });
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  const links = [
    { id: "register", label: "Register" },
    { id: "scan", label: "Scan Attendance" },
  ];

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoadingRegister(true);
    setRegisterStatus({ message: "", error: "" });

    try {
      await api.post("/student/register", {
        studentId: registerForm.studentId,
        name: registerForm.name,
        password: registerForm.password,
      });
      setRegisterStatus({ message: "Registration successful.", error: "" });
    } catch (error) {
      setRegisterStatus({ message: "", error: error.response?.data?.message || error.message || "Unable to register." });
    } finally {
      setLoadingRegister(false);
    }
  };

  const handleScan = async (event) => {
    event.preventDefault();
    setLoadingScan(true);
    setScanStatus({ message: "", error: "" });

    try {
      await api.post("/attendance/scan", {
        sessionId: scanForm.sessionId,
        token: scanForm.token,
        studentId: Number(scanForm.studentId),
      });
      setScanStatus({ message: "Attendance recorded successfully.", error: "" });
    } catch (error) {
      setScanStatus({ message: "", error: error.response?.data?.message || error.message || "Unable to record attendance." });
    } finally {
      setLoadingScan(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar links={links} />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-semibold">Student Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Register your account and scan QR sessions to log attendance.</p>
          </header>

          <section id="register" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Register Student</h2>
            {registerStatus.error && <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{registerStatus.error}</div>}
            {registerStatus.message && <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{registerStatus.message}</div>}
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleRegister}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Student ID</span>
                <input
                  type="text"
                  value={registerForm.studentId}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, studentId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, password: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loadingRegister}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loadingRegister ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </section>

          <section id="scan" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold">Scan Attendance</h2>
            {scanStatus.error && <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{scanStatus.error}</div>}
            {scanStatus.message && <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{scanStatus.message}</div>}
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleScan}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Session ID</span>
                <input
                  type="text"
                  value={scanForm.sessionId}
                  onChange={(e) => setScanForm((current) => ({ ...current, sessionId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Token</span>
                <input
                  type="text"
                  value={scanForm.token}
                  onChange={(e) => setScanForm((current) => ({ ...current, token: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Student ID</span>
                <input
                  type="number"
                  value={scanForm.studentId}
                  onChange={(e) => setScanForm((current) => ({ ...current, studentId: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loadingScan}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-white transition hover:bg-sky-700 disabled:bg-slate-400"
                >
                  {loadingScan ? "Submitting..." : "Submit Attendance"}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
