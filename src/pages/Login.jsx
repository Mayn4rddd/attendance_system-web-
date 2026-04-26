    import { useState } from "react";
    import { Navigate, useNavigate } from "react-router-dom";
    import api from "../api/axios";
    import { useAuth } from "../context/AuthContext";
import TeacherForgotPassword from "./TeacherForgotPassword";

const Login = () => {
const { login, user } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role?.toLowerCase()}`} replace />;
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/web-login", {
        username: form.username,
        password: form.password,
      });

      const { token, role, name, userId, id } = response.data;
      login({ token, role, name, userId: userId ?? id ?? null });

      if (role === "Admin") navigate("/admin");
      else if (role === "Teacher") navigate("/teacher");
      else if (role === "Student") navigate("/student");
      else navigate("/login");
    } catch (exception) {
      console.error("Login error response:", exception.response?.data || exception);

      const response = exception.response?.data;
      const serverMessage =
        response?.message ||
        response?.error ||
        (Array.isArray(response?.errors)
          ? response.errors[0]?.message || response.errors[0]
          : null);

      setError(serverMessage || exception.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return <TeacherForgotPassword onBack={() => setShowForgot(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 py-10">
      <div className="w-full max-w-7xl rounded-3xl bg-white shadow-[0_35px_90px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Left Panel - Branding */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-sky-950 via-sky-800 to-sky-600 px-10 py-14">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute right-10 bottom-10 h-36 w-36 rounded-full bg-blue-200/10 blur-3xl"></div>
            </div>

            <div className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center text-center text-white">
              <div className="mb-12 flex items-center justify-center">
  <div className="h-64 w-64 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-[0_30px_80px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
    <img
      src="/aclc-admin.png"
      alt="ACLC Logo"
      className="h-62 w-100 rounded-full object-cover"
    />
  </div>
</div>

              <p className="text-lg font-medium tracking-wide text-blue-100 leading-relaxed max-w-xs">
                Empowering teachers. Building better futures.
              </p>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex items-center justify-center px-8 py-12 sm:px-12 bg-white">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-semibold text-slate-900">Welcome Back!</h2>
                <p className="mt-3 text-sm text-slate-500">Sign in to access your teacher dashboard</p>
              </div>

              {error && (
                <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      name="username"
                      type="text"
                      value={form.username}
                      onChange={handleChange}
                      required
                      placeholder="Enter your username"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                      </svg>
                    </span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-14 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      name="rememberMe"
                      type="checkbox"
                      checked={form.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Remember me
                  </label>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm font-semibold text-sky-600 transition hover:text-sky-700">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-3xl bg-sky-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-lg"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sky-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                Secure & Trusted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

