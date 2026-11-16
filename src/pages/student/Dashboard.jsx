import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';
import Loader from '../../components/Loader';
import { StatCard, Donut, HBars, VBars, Panel } from '../../components/Charts';
import useExamStarter from './useExamStarter';

const PF_STYLE = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

// Heroicons outline paths for the stat cards.
const ICONS = {
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
};

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [ex, su] = await Promise.all([
      api.get('/student/dashboard/exams'),
      api.get('/student/dashboard/summary'),
    ]);
    setExams(ex.data);
    setSummary(su.data);
  };

  const { handleStart, error, setError, modal } =
    useExamStarter({ onAutoSubmitted: load });

  useEffect(() => {
    load()
      .catch(() => setError('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inProgress = exams.filter((e) => e.status === 'in_progress');
  const upcoming = exams
    .filter((e) => e.status === 'upcoming' && e.start_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
    .slice(0, 3);

  const totals = summary?.totals;
  const passRate = totals?.evaluated
    ? `${Math.round((totals.passed / totals.evaluated) * 100)}%`
    : '—';

  if (loading) return <Loader full />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link to="/my-exams" className="text-sm text-blue-600 hover:underline">
          View my exams →
        </Link>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Assigned exams" value={exams.length}
          icon={ICONS.book} accent="bg-blue-100 text-blue-600" />
        <StatCard label="Attempts taken" value={totals?.attempts ?? '—'}
          icon={ICONS.pencil} accent="bg-violet-100 text-violet-600"
          to="/attempts" />
        <StatCard label="Avg score"
          value={totals?.avg_percentage != null ? `${totals.avg_percentage}%` : '—'}
          icon={ICONS.chart} accent="bg-sky-100 text-sky-600"
          sub={totals?.best_percentage != null ? `Best ${totals.best_percentage}%` : undefined} />
        <StatCard label="Pass rate" value={passRate}
          icon={ICONS.star} accent="bg-emerald-100 text-emerald-600"
          sub={totals?.evaluated ? `${totals.passed}/${totals.evaluated} passed` : 'No results yet'} />
      </div>

      {/* Pinned resume banners — an open attempt must never be buried */}
      {inProgress.map((exam) => (
        <div key={exam.exam_id}
          className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-blue-800 truncate">
              Attempt in progress — {exam.name}
            </p>
            <p className="text-xs text-blue-600">
              You have an unfinished attempt. Resume before the window closes.
            </p>
          </div>
          <button onClick={() => handleStart(exam)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm shrink-0 hover:bg-blue-700">
            Resume
          </button>
        </div>
      ))}

      {upcoming.length > 0 && (
        <Panel title="Coming up" className="mb-5">
          <ul className="divide-y">
            {upcoming.map((e) => (
              <li key={e.exam_id} className="py-2 flex justify-between gap-3 text-sm">
                <span className="font-medium truncate">{e.name}</span>
                <span className="text-gray-500 shrink-0">
                  opens {apiDate(e.start_time).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {summary && totals.evaluated > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Panel title="Results">
            <Donut centerLabel="results" slices={[
              { label: 'Passed', value: totals.passed, color: '#22c55e' },
              { label: 'Failed', value: totals.failed, color: '#ef4444' },
              { label: 'Pending', value: totals.pending_results, color: '#f59e0b' },
            ]} />
          </Panel>
          <Panel title="Score trend — last 10">
            <VBars max={100} rows={summary.trend.map((x) => ({
              label: x.exam,
              short: x.exam.slice(0, 8),
              value: Math.round(x.percentage),
            }))} />
          </Panel>
          <Panel title="Average by course">
            <HBars max={100} rows={summary.course_avg.map((c) => ({
              label: c.course,
              value: c.avg,
              color: c.avg >= 60 ? '#22c55e' : c.avg >= 40 ? '#f59e0b' : '#ef4444',
            }))} />
          </Panel>
        </div>
      )}

      {summary && summary.recent.length > 0 && (
        <Panel title="Recent results" className="mb-5">
          <table className="w-full text-sm">
            <tbody>
              {summary.recent.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.exam_name}</td>
                  <td className="py-2 text-gray-500">
                    {r.total_marks} marks · {r.percentage}%
                  </td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${PF_STYLE[r.pass_fail] || ''}`}>
                      {r.pass_fail}
                    </span>
                  </td>
                  <td className="py-2 text-right text-xs text-gray-400">
                    {r.end_time ? apiDate(r.end_time).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/results" className="inline-block mt-3 text-xs text-blue-600 hover:underline">
            View all results →
          </Link>
        </Panel>
      )}

      {modal}
    </div>
  );
}
