import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">QR Attendance System</p>
          <p className="mt-1 text-sm text-slate-600">{user ? `${user.role} • ${user.name}` : "Welcome"}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
