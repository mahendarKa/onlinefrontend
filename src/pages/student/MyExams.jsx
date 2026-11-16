import { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';
import Pagination, { usePager } from '../../components/Pagination';
import Loader from '../../components/Loader';
import useExamStarter from './useExamStarter';

const STATUS_STYLE = {
  available: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-200 text-gray-600',
  attempt_limit_reached: 'bg-red-100 text-red-700',
  pending_approval: 'bg-purple-100 text-purple-700',
};

export default function MyExams() {
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/student/dashboard/exams');
    setExams(data);
  };

  const { handleStart, error, setError, modal } =
    useExamStarter({ onAutoSubmitted: load });

  useEffect(() => {
    load()
      .catch(() => setError('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filtered = exams.filter((e) =>
    (statusFilter === '' || e.status === statusFilter) &&
    (q === '' ||
      e.name.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q))
  );
  const pg = usePager(filtered);

  if (loading) return <Loader full />;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Exams</h1>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

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

      {modal}
    </div>
  );
}
