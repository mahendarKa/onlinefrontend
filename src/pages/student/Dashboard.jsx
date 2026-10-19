import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';

const STATUS_STYLE = {
  available: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-200 text-gray-600',
  attempt_limit_reached: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/student/dashboard/exams');
    setExams(data);
  };

  useEffect(() => { load(); }, []);

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
      setError(err.response?.data?.detail || 'Unable to start exam');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Exams</h1>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {exams.length === 0 && (
        <p className="text-gray-500 bg-white p-4 rounded shadow">
          No exams assigned to your batches yet.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam) => (
          <div key={exam.exam_id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold">{exam.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[exam.status] || ''}`}>
                {exam.status.replace('_', ' ')}
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
                onClick={() => startExam(exam)}
                className="w-full bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700"
              >
                {exam.status === 'in_progress' ? 'Resume Attempt' : 'Start Exam'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
