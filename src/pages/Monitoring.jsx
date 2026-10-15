import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Monitoring() {
  const [exams, setExams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [fbMap, setFbMap] = useState({}); // exam_id -> summary
  const [fbExam, setFbExam] = useState(null); // exam object for modal
  const [feedback, setFeedback] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/exam-monitoring/exams').then(async (r) => {
      setExams(r.data);
      // Feedback counts so the button only appears where feedback exists.
      const sums = await Promise.all(
        r.data.map((e) =>
          api.get(`/exam-feedback/summary/${e.exam_id}`).catch(() => null)
        )
      );
      const map = {};
      sums.forEach((s, i) => { if (s) map[r.data[i].exam_id] = s.data; });
      setFbMap(map);
    }).catch(() => {});
  }, []);

  const download = async (path, filename) => {
    setError('');
    try {
      const { data } = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Download failed');
    }
  };

  const viewAttempts = async (exam) => {
    setSelected(exam);
    const { data } = await api.get(`/exam-monitoring/exams/${exam.exam_id}/attempts`);
    setAttempts(data);
  };

  const viewFeedback = async (exam) => {
    setFbExam(exam);
    setFbLoading(true);
    try {
      const { data } = await api.get(`/exam-feedback/exams/${exam.exam_id}`);
      setFeedback(data);
    } finally {
      setFbLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Exam Monitoring</h1>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      <div className="space-y-4">
        <div className="overflow-x-auto self-start">
        <table className="bg-white rounded shadow text-sm w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Exam</th>
              <th className="p-3">Attempts</th>
              <th className="p-3">In progress</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Evaluated</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.exam_id} className={`border-b ${selected?.exam_id === e.exam_id ? 'bg-blue-50' : ''}`}>
                <td className="p-3">{e.exam_name}</td>
                <td className="p-3">{e.total_attempts}</td>
                <td className="p-3">{e.in_progress}</td>
                <td className="p-3">{e.submitted}</td>
                <td className="p-3">{e.evaluated}</td>
                <td className="p-3 whitespace-nowrap">
                  <button onClick={() => viewAttempts(e)}
                    className="text-blue-600 hover:underline mr-2">View</button>
                  <button
                    onClick={() => download(
                      `/result-export/exams/${e.exam_id}/csv`,
                      `exam_${e.exam_id}_results.csv`
                    )}
                    className="text-blue-600 hover:underline mr-2">CSV</button>
                  <button
                    onClick={() => download(
                      `/result-pdf/exams/${e.exam_id}/pdf`,
                      `exam_${e.exam_id}_results.pdf`
                    )}
                    className="text-amber-600 hover:underline mr-2">PDF</button>
                  {fbMap[e.exam_id]?.total_feedback > 0 && (
                    <button onClick={() => viewFeedback(e)}
                      className="text-amber-600 hover:underline">Feedback</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {selected && (
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-bold mb-3">Attempts — {selected.exam_name}</h2>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-4">Student</th>
                  <th className="py-1 pr-4">#</th>
                  <th className="py-1 pr-4">Status</th>
                  <th className="py-1 pr-4">Marks</th>
                  <th className="py-1 pr-4">%</th>
                  <th className="py-1 pr-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.attempt_id} className="border-b">
                    <td className="py-1.5 pr-4">{a.student_name}</td>
                    <td className="pr-4">{a.attempt_no}</td>
                    <td className="pr-4 capitalize">{a.status}</td>
                    <td className="pr-4">{a.marks_obtained ?? '-'}</td>
                    <td className="pr-4">{a.percentage ?? '-'}</td>
                    <td>{a.pass_fail ?? '-'}</td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr><td colSpan={6} className="py-3 text-gray-400">No attempts yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      {fbExam && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setFbExam(null)}>
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-1">Feedback — {fbExam.exam_name}</h2>
            {fbMap[fbExam.exam_id] && (
              <p className="text-sm text-amber-500 font-medium mb-3">
                &#9733; {fbMap[fbExam.exam_id].average_rating}/5 average
                ({fbMap[fbExam.exam_id].total_feedback} responses)
              </p>
            )}
            {fbLoading && <p className="text-sm text-gray-400">Loading...</p>}
            {!fbLoading && feedback.map((f) => (
              <div key={f.id} className="border-b py-2 text-sm">
                <p className="text-amber-500">
                  {'\u2605'.repeat(f.rating)}
                  <span className="text-gray-300">
                    {'\u2605'.repeat(5 - f.rating)}
                  </span>
                  <span className="text-gray-400 ml-2 text-xs">
                    Student #{f.student_id}
                  </span>
                </p>
                {f.comments
                  ? <p className="text-gray-700 whitespace-pre-wrap">{f.comments}</p>
                  : <p className="text-gray-400 italic">No comment</p>}
              </div>
            ))}
            <button onClick={() => setFbExam(null)}
              className="mt-4 w-full bg-gray-200 py-1.5 rounded text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
