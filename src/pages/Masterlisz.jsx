import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";

const Masterlisz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", error: "" });

  const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return "";
    const [hourText, minute] = timeString.split(":");
    const hourValue = Number(hourText);
    if (Number.isNaN(hourValue) || !minute) return timeString;

    const period = hourValue >= 12 ? "PM" : "AM";
    const hour12 = hourValue === 0 ? 12 : hourValue > 12 ? hourValue - 12 : hourValue;
    return `${hour12}:${minute} ${period}`;
  };

  const links = [
    { id: "my-sections", label: "My Sections" },
    { id: "masterlist", label: "Masterlist" },
  ];

  // Reusable function to fetch sections
  const fetchSections = async () => {
    if (!user?.userId) return;
    setSectionsLoading(true);
    try {
      const response = await api.get(`/teacher/my-sections?userId=${user.userId}`);
      const sectionsData = response.data || [];
      setSections(sectionsData);
      setStatus({ message: "", error: "" });
      console.log("Sections fetched successfully:", sectionsData);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      setStatus({ message: "", error: "Unable to fetch sections." });
    } finally {
      setSectionsLoading(false);
    }
  };

  // Fetch sections on component mount
  useEffect(() => {
    fetchSections();
  }, [user]);

  // Refetch sections when user returns to the page (window focus)
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log("Page regained focus - refetching sections");
      fetchSections();
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [user?.userId]);

  const handleSectionClick = (section) => {
    const sectionId = section.id ?? section.sectionId;
    const subjectId = section.subjectId ?? section.subject?.id;
    const teacherId = section.teacherId ?? section.teacher?.id;
    
    console.log("Navigating to section:", { sectionId, subjectId, teacherId });
    
    navigate(`/teacher/masterlist/${sectionId}`, { 
      state: { 
        section,
        sectionId,
        subjectId,
        teacherId
      } 
    });
  };

  const handleSidebarNav = (id) => {
    if (id === "my-sections") {
      navigate("/teacher/dashboard");
    } else if (id === "masterlist") {
      navigate("/teacher/masterlist");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Navigation</h2>
            <p className="text-sm text-slate-600">Quick access to dashboard sections.</p>

            <nav className="mt-6 space-y-2">
              {links?.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleSidebarNav(link.id)}
                  className={`w-full text-left rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    link.id === 'masterlist'
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Masterlist</h1>
                <p className="mt-2 text-sm text-slate-600">Select a section to view student masterlist.</p>
              </div>
              <button
                type="button"
                onClick={fetchSections}
                disabled={sectionsLoading}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {sectionsLoading ? " Refreshing..." : " Refresh"}
              </button>
            </div>
          </header>

          {status.error && <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">{status.error}</div>}
          {status.message && <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">{status.message}</div>}

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Select Section</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a section to view the masterlist of students.</p>
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
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSectionClick(section)}
                      className="rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:border-slate-400 hover:shadow-md"
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Section</p>
                      <h3 className="mt-3 text-xl font-semibold text-slate-900">{section.section ?? section.name ?? `Section ${id}`}</h3>
                      <p className="mt-2 text-sm text-slate-600">{section.subject ?? 'N/A'}</p>
                      {Array.isArray(section.schedules) && section.schedules.length > 0 ? (
                        <div className="mt-1 space-y-1 text-xs text-slate-500">
                          {section.schedules.map((schedule, idx) => (
                            <p key={idx}>
                               {schedule.day} {formatTimeTo12Hour(schedule.startTime)} - {formatTimeTo12Hour(schedule.endTime)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500"> No schedule</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Masterlisz;
