import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { detailText } from '../../api/client';
import { apiDate } from '../../utils/datetime';
import { probeCameraStream } from '../../utils/camera';
import Pagination, { usePager } from '../../components/Pagination';
import Loader from '../../components/Loader';
import { StatCard, Donut, HBars, VBars, Panel } from '../../components/Charts';

const STATUS_STYLE = {
  available: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-200 text-gray-600',
  attempt_limit_reached: 'bg-red-100 text-red-700',
  pending_approval: 'bg-purple-100 text-purple-700',
};

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [disclaimerExam, setDisclaimerExam] = useState(null);
  const [camChecking, setCamChecking] = useState(false);
  const [camError, setCamError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const [ex, su] = await Promise.all([
      api.get('/student/dashboard/exams'),
      api.get('/student/dashboard/summary'),
    ]);
    setExams(ex.data);
    setSummary(su.data);
  };

  useEffect(() => {
    load()
      .catch(() => setError('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = (exam) => {
    // Proctored exams get a disclaimer + camera check first.
    if (exam.is_proctored) {
      setCamError('');
      setDisclaimerExam(exam);
    } else {
      startExam(exam);
    }
  };

  // Camera access must be granted BEFORE the attempt is created so a
  // denied camera never consumes an attempt.
  const agreeAndStart = async () => {
    const exam = disclaimerExam;
    setCamChecking(true);
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      // Permission alone isn't enough — a closed cap or disabled
      // camera streams black/frozen frames. Require live frames.
      const live = await probeCameraStream(stream);
      stream.getTracks().forEach((t) => t.stop());
      if (!live) {
        setCamError(
          'Your camera is not producing video — open the camera ' +
          'cover or enable camera access, then try again.'
        );
        setCamChecking(false);
        return;
      }
    } catch {
      setCamError(
        'Camera access is required for this exam. Allow camera ' +
        'permission in your browser and try again.'
      );
      setCamChecking(false);
      return;
    }
    // Fullscreen requires a user gesture — request it here, while the
    // click is still active, so it survives the route change.
    try {
      await document.documentElement.requestFullscreen();
    } catch { /* the player shows a re-enter banner */ }
    setCamChecking(false);
    setDisclaimerExam(null);
    startExam(exam);
  };

  const startExam = async (exam) => {
    setError('');
    try {
      const { data } = await api.post(`/student/exams/${exam.exam_id}/start`);
      // Expired in-progress attempts come back submitted with no time
      // left — show a time-up notice instead of opening the player.
      if (data.status !== 'in_progress' || data.remaining_seconds <= 0) {
        setError('Time is up for this exam — your attempt was auto-submitted.');
        load();
        return;
      }
      navigate(`/exam/${exam.exam_id}/attempt/${data.attempt_id}`);
    } catch (err) {
      setError(detailText(err, 'Unable to start exam'));
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = exams.filter((e) =>
    (statusFilter === '' || e.status === statusFilter) &&
    (q === '' ||
      e.name.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q))
  );
  const pg = usePager(filtered);

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
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

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
            <VBars rows={summary.trend.map((x) => ({
              label: x.exam,
              short: x.exam.slice(0, 8),
              value: Math.round(x.percentage),
            }))} />
          </Panel>
          <Panel title="Average by course">
            <HBars rows={summary.course_avg.map((c) => ({
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

      <h2 className="font-semibold mb-3">All exams</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <input placeholder="Search exam name or description..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-48" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm capitalize">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLE).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {exams.length === 0 && (
        <p className="text-gray-500 bg-white p-4 rounded shadow">
          No exams assigned to your batches yet.
        </p>
      )}
      {exams.length > 0 && filtered.length === 0 && (
        <p className="text-gray-500 bg-white p-4 rounded shadow">
          No exams match your search/filters.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pg.items.map((exam) => (
          <div key={exam.exam_id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold">{exam.name}</h2>
              <span className="flex gap-1">
                {exam.is_proctored && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700"
                    title="Webcam + activity monitoring">
                    Proctored
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[exam.status] || ''}`}>
                  {exam.status.replace('_', ' ')}
                </span>
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">{exam.description || 'No description'}</p>
            <div className="text-xs text-gray-500 space-y-1 mb-3">
              <p>Duration: {exam.duration_minutes} min · {exam.total_marks} marks (pass: {exam.passing_percentage ?? exam.passing_marks}%)</p>
              <p>Attempts: {exam.attempts_used} / {exam.attempts_allowed ?? '∞'}</p>
              {exam.start_time && <p>Opens: {apiDate(exam.start_time).toLocaleString()}</p>}
              {exam.end_time && <p>Closes: {apiDate(exam.end_time).toLocaleString()}</p>}
            </div>
            {/* {exam.status === 'pending_approval' && (
              <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1.5">
                This exam is under pending status. Please wait for admin approval.
              </p>
            )} */}
            {(exam.status === 'available' || exam.status === 'in_progress') && (
              <button
                onClick={() => handleStart(exam)}
                className="w-full bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700"
              >
                {exam.status === 'in_progress' ? 'Resume Attempt' : 'Start Exam'}
              </button>
            )}
          </div>
        ))}
      </div>
      <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} />

      {disclaimerExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => !camChecking && setDisclaimerExam(null)}>
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">
              Proctored exam — {disclaimerExam.name}
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              This exam is remotely proctored. By continuing you agree
              that during the attempt:
            </p>
            <ul className="text-sm text-gray-700 space-y-1.5 mb-4 list-disc pl-5">
              <li>Your <strong>webcam stays on</strong> and your face
                remains visible to the camera.</li>
              <li>Periodically your webcam frame is checked — absence,
                extra people, or looking away are recorded.</li>
              <li>Switching tabs or minimising the browser is recorded
                as a violation.</li>
              <li>Copy, paste, cut and right-click are disabled and
                logged.</li>
              <li>Flagged snapshots are reviewed by your instructor.</li>
              {disclaimerExam.max_violations && (
                <li className="font-medium text-red-700">
                  Reaching {disclaimerExam.max_violations} violations
                  ends your attempt automatically.
                </li>
              )}
            </ul>

            {camError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
                {camError}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={agreeAndStart} disabled={camChecking}
                className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {camChecking
                  ? 'Checking camera...'
                  : disclaimerExam.status === 'in_progress'
                    ? 'I agree — resume exam'
                    : 'I agree — start exam'}
              </button>
              <button onClick={() => setDisclaimerExam(null)}
                disabled={camChecking}
                className="px-4 bg-gray-200 py-2 rounded text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
