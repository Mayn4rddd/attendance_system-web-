import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            QR Attendance System
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {user ? `${user.role} • ${user.name}` : "Welcome"}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="bg-slate-900 text-white hover:bg-slate-700"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
