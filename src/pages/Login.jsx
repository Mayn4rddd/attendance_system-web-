    import { useState } from "react";
    import { Navigate, useNavigate } from "react-router-dom";
    import api from "../api/axios";
    import { useAuth } from "../context/AuthContext";

    const Login = () => {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (user) {
        return <Navigate to={`/${user.role?.toLowerCase()}`} replace />;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-8">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">QR Attendance Login</h1>
            <p className="text-sm text-slate-500 mb-6">Sign in to access your attendance dashboard.</p>

            {error && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700">{error}</div>}

            <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
                <span className="text-sm font-medium text-slate-700">Username</span>
                <input
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
            </label>

            <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
            </label>

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>
            </form>
        </div>
        </div>
    );
    };

    export default Login;
