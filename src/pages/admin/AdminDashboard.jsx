import { useEffect, useState } from 'react';
import api from '../../api/client';
import { StatCard, Donut, HBars, VBars, Panel } from '../../components/Charts';
import Loader from '../../components/Loader';

const ICON = {
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  batches: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  questions: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  exams: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
};

const ROLE_COLORS = {
  student: '#2563eb',
  teacher: '#7c3aed',
  admin: '#059669',
  superadmin: '#d97706',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader full />;
  if (!data) return <p className="text-sm text-gray-500">Could not load dashboard.</p>;

  const t = data.totals;
  const roleSlices = Object.entries(data.users_by_role).map(([role, n]) => ({
    label: role, value: n,
    color: ROLE_COLORS[role] || '#64748b',
  }));
  const attemptRows = [
    { label: 'In progress', value: data.attempts.in_progress, color: '#d97706' },
    { label: 'Submitted', value: data.attempts.submitted, color: '#2563eb' },
    { label: 'Evaluated', value: data.attempts.evaluated, color: '#059669' },
    { label: 'Pending (not attempted)', value: data.attempts.pending, color: '#64748b' },
  ];
  const dayBars = data.attempts_last_7d.map((d) => ({
    label: d.date,
    short: d.date.slice(5), // MM-DD
    value: d.count,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Users" value={t.users} icon={ICON.users}
          accent="bg-blue-100 text-blue-600" to="/admin/users" />
        <StatCard label="Total Batches" value={t.batches} icon={ICON.batches}
          accent="bg-violet-100 text-violet-600" to="/admin/batches" />
        <StatCard label="Total Questions" value={t.questions} icon={ICON.questions}
          accent="bg-amber-100 text-amber-600" to="/questions" />
        <StatCard label="Total Exams" value={t.exams} icon={ICON.exams}
          accent="bg-emerald-100 text-emerald-600" to="/exams"
          sub={`${data.exams.active} active · ${data.exams.inactive} inactive`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Users by role">
          <Donut slices={roleSlices} centerLabel="users" />
        </Panel>
        <Panel title="Attempts by status">
          <HBars rows={attemptRows} />
        </Panel>
        <Panel title="Results">
          <Donut centerLabel="results" slices={[
            { label: 'Passed', value: data.results.passed, color: '#16a34a' },
            { label: 'Failed', value: data.results.failed, color: '#dc2626' },
          ]} />
        </Panel>
      </div>

      <Panel title="Attempts started — last 7 days" className="mt-4">
        <VBars rows={dayBars} />
      </Panel>
    </div>
  );
}
