import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

// Inline SVG icons keyed by route (24x24 outline style).
const ICONS = {
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  courses: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  batches: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  questions: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  exams: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  grading: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  monitoring: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  audit: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  results: 'M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941',
  attempts: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  notifications: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  profile: 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
};

const LINK_ICONS = {
  '/admin/users': 'users',
  '/admin/courses': 'courses',
  '/admin/batches': 'batches',
  '/batches': 'batches',
  '/questions': 'questions',
  '/exams': 'exams',
  '/grading': 'grading',
  '/monitoring': 'monitoring',
  '/admin/audit-logs': 'audit',
  '/dashboard': 'exams',
  '/results': 'results',
  '/attempts': 'attempts',
  '/notifications': 'notifications',
  '/profile': 'profile',
};

function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`${className} shrink-0`} aria-hidden="true">
      <path d={ICONS[name] || ICONS.exams} />
    </svg>
  );
}

const NAV = {
  superadmin: [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/batches', label: 'Batches' },
    { to: '/questions', label: 'Questions' },
    { to: '/exams', label: 'Exams' },
    { to: '/grading', label: 'Grading' },
    { to: '/monitoring', label: 'Monitoring' },
    { to: '/admin/audit-logs', label: 'Audit Logs' },
  ],
  admin: [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/batches', label: 'Batches' },
    { to: '/questions', label: 'Questions' },
    { to: '/exams', label: 'Exams' },
    { to: '/grading', label: 'Grading' },
    { to: '/monitoring', label: 'Monitoring' },
  ],
  teacher: [
    { to: '/batches', label: 'Batches' },
    { to: '/questions', label: 'Questions' },
    { to: '/exams', label: 'Exams' },
    { to: '/grading', label: 'Grading' },
    { to: '/monitoring', label: 'Monitoring' },
  ],
  student: [
    { to: '/dashboard', label: 'My Exams' },
    { to: '/results', label: 'Results' },
    { to: '/attempts', label: 'Attempt History' },
  ],
};

// Links every signed-in user gets, shown below their role menu.
const COMMON_NAV = [
  { to: '/notifications', label: 'Notifications' },
  { to: '/profile', label: 'Profile' },
];

function Avatar({ first, last, pic }) {
  if (pic) {
    return (
      <img src={pic} alt={[first, last].filter(Boolean).join(' ')}
        className="h-8 w-8 rounded-full object-cover border border-gray-200" />
    );
  }
  const init = (
    (first || '').trim().charAt(0) +
    (last || '').trim().charAt(0)
  ).toUpperCase() || '?';
  return (
    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
      {init}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Fresh profile (avatar may change after login).
  const [me, setMe] = useState(user);
  const [unread, setUnread] = useState(0);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar:collapsed') === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem('sidebar:collapsed', c ? '0' : '1');
      return !c;
    });

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => setMe((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    const refreshUnread = () =>
      api.get('/notifications/my/unread-count')
        .then(({ data }) => setUnread(data.unread_count))
        .catch(() => {});

    refreshUnread();
    window.addEventListener('notifications:refresh', refreshUnread);
    return () =>
      window.removeEventListener('notifications:refresh', refreshUnread);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [...(NAV[user?.role] || []), ...COMMON_NAV];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile: nav collapses into a top bar */}
      <nav className="md:hidden bg-blue-700 text-white px-2 py-2">
        <div className="flex items-center justify-between">
          <Link to="/" className="px-2 py-1 font-bold flex items-center gap-1.5">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-full bg-white object-contain" />
            Exam Portal
          </Link>
          <button onClick={() => setMobileOpen((o) => !o)}
            className="px-2 py-1 rounded hover:bg-blue-600" title="Menu"
            aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
                    isActive ? 'bg-blue-800 font-semibold' : 'hover:bg-blue-600'
                  }`
                }
              >
                <Icon name={LINK_ICONS[link.to]} className="w-4 h-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <aside className={`${collapsed ? 'w-20' : 'w-56'} bg-blue-700 text-white flex-col hidden md:flex md:fixed md:inset-y-0 md:left-0 md:h-screen md:z-20 md:overflow-hidden transition-[width] duration-200`}>
        <div className={`py-4 border-b border-blue-600 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Exam Portal"
              className="h-10 w-10 rounded-full bg-white object-contain p-0.5" />
            {!collapsed && <span className="text-lg font-bold">Exam Portal</span>}
          </Link>
          {!collapsed && (
            <button onClick={toggleCollapsed} title="Collapse sidebar"
              className="text-blue-200 hover:text-white p-1" aria-label="Collapse sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
        <nav className="flex-1 py-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              className={({ isActive }) =>
                `flex items-center py-2.5 text-sm border-l-4 ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'} ${
                  isActive
                    ? 'bg-blue-800 font-semibold border-amber-400'
                    : 'border-transparent hover:bg-blue-600'
                }`
              }
            >
              <Icon name={LINK_ICONS[link.to]} />
              {!collapsed && link.label}
            </NavLink>
          ))}
        </nav>
        {collapsed && (
          <button onClick={toggleCollapsed} title="Expand sidebar"
            className="py-3 text-blue-200 hover:text-white flex justify-center border-t border-blue-600"
            aria-label="Expand sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </aside>

      <div className={`flex-1 flex flex-col ${collapsed ? 'md:ml-20' : 'md:ml-56'}`}>
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-2 group">
            <Avatar first={me?.first_name} last={me?.last_name}
              pic={me?.profile_pic} />
            <span className="text-sm text-gray-500 group-hover:text-blue-600">
              {me?.name}
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative text-gray-500 hover:text-blue-600" title="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.243.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Z" clipRule="evenodd" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-4 flex items-center justify-center px-0.5">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 border hover:underline"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
