import { useEffect, useState } from 'react';
import api from '../api/client';
import { StatCard, Donut, HBars, VBars, Panel } from '../components/Charts';

const ICON = {
  batches: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  students: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  exams: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  attempted: 'M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12',
};

function ScorerList({ title, scorers, tone, rankTone }) {
  return (
    <div className={`rounded-xl shadow-sm border p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3">{title}</p>
      {scorers.length === 0 ? (
        <p className="text-sm opacity-70">No evaluated results yet.</p>
      ) : (
        <ol className="space-y-2">
          {scorers.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankTone}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {s.student_name || 'Student'}
                </p>
                <p className="text-xs opacity-70 truncate">
                  {s.exam_name} · {s.marks} marks · {s.pass_fail}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0">{s.percentage}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teacher')
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!data) return <p className="text-sm text-gray-500">Could not load dashboard.</p>;

  const t = data.totals;
  const DIST_COLORS = ['#dc2626', '#d97706', '#2563eb', '#16a34a'];
  const distRows = data.score_distribution.map((d, i) => ({
    label: d.range, value: d.students, color: DIST_COLORS[i],
  }));
  const attemptRows = [
    { label: 'In progress', value: data.attempts.in_progress, color: '#d97706' },
    { label: 'Submitted', value: data.attempts.submitted, color: '#2563eb' },
    { label: 'Evaluated', value: data.attempts.evaluated, color: '#059669' },
    { label: 'Pending (not attempted)', value: data.attempts.pending, color: '#64748b' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="My Batches" value={t.batches} icon={ICON.batches}
          accent="bg-violet-100 text-violet-600" to="/batches" />
        <StatCard label="Students in My Batches" value={t.students}
          icon={ICON.students} accent="bg-blue-100 text-blue-600" to="/batches" />
        <StatCard label="My Exams" value={t.exams} icon={ICON.exams}
          accent="bg-amber-100 text-amber-600" to="/exams" />
        <StatCard label="Students Attempted" value={t.students_attempted}
          icon={ICON.attempted} accent="bg-emerald-100 text-emerald-600"
          to="/monitoring" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Panel title="Results">
          <Donut centerLabel="results" slices={[
            { label: 'Passed', value: data.results.passed, color: '#16a34a' },
            { label: 'Failed', value: data.results.failed, color: '#dc2626' },
          ]} />
        </Panel>
        <Panel title="Attempts by status">
          <HBars rows={attemptRows} />
        </Panel>
        <Panel title="Score distribution">
          <VBars rows={distRows} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScorerList title="Top 10 Scorers" scorers={data.top_scorers}
          tone="bg-emerald-50 border-emerald-200 text-emerald-800"
          rankTone="bg-emerald-200 text-emerald-900" />
        <ScorerList title="Least 10 Scorers" scorers={data.lowest_scorers}
          tone="bg-red-50 border-red-200 text-red-800"
          rankTone="bg-red-200 text-red-900" />
      </div>
    </div>
  );
}
