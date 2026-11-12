import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { detailText } from '../../api/client';
import { apiDate } from '../../utils/datetime';
import Pagination, { usePager } from '../../components/Pagination';
import Loader from '../../components/Loader';

const STATUS_STYLE = {
  available: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-200 text-gray-600',
  attempt_limit_reached: 'bg-red-100 text-red-700',
  pending_approval: 'bg-purple-100 text-purple-700',
};

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [disclaimerExam, setDisclaimerExam] = useState(null);
  const [camChecking, setCamChecking] = useState(false);
  const [camError, setCamError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/student/dashboard/exams');
    setExams(data);
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
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setCamError(
        'Camera access is required for this exam. Allow camera ' +
        'permission in your browser and try again.'
      );
      setCamChecking(false);
      return;
    }
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
                  ? 'Requesting camera...'
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
