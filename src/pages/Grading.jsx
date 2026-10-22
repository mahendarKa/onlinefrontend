import { useEffect, useState } from 'react';
import api, { detailText } from '../api/client';

export default function Grading() {
  const [pending, setPending] = useState([]);
  const [exams, setExams] = useState([]);
  const [examFilter, setExamFilter] = useState('');
  const [marks, setMarks] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    const [p, e] = await Promise.all([
      api.get('/results/pending-evaluation', {
        params: examFilter ? { exam_id: examFilter } : {},
      }),
      api.get('/exams/'),
    ]);
    setPending(p.data);
    setExams(e.data);
  };

  useEffect(() => { load(); }, [examFilter]);

  const grade = async (item, isCorrect) => {
    setError('');
    const value = marks[item.answer_id];
    if (value === undefined || value === '') return;
    try {
      await api.put(`/results/answers/${item.answer_id}/evaluate`, {
        marks_obtained: Number(value),
        is_correct: isCorrect,
      });
      load();
    } catch (err) {
      setError(detailText(err, 'Evaluation failed'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Pending Manual Evaluation</h1>
        <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All exams</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {pending.length === 0 && (
        <p className="text-gray-500 bg-white p-4 rounded shadow">Nothing pending evaluation.</p>
      )}

      {pending.map((item) => (
        <div key={item.answer_id} className="bg-white rounded shadow p-4 mb-3 text-sm">
          <div className="flex justify-between mb-2">
            <span className="font-medium">
              {item.student_name} — {item.question_type}
            </span>
            <span className="text-gray-500">max {item.maximum_marks} marks</span>
          </div>

          <p className="font-medium mb-1">{item.question_text}</p>

          {item.answer_text && (
            <p className="bg-gray-50 rounded p-2 mb-2 whitespace-pre-wrap">{item.answer_text}</p>
          )}
          {item.code_text && (
            <pre className="bg-gray-900 text-green-300 rounded p-2 mb-2 overflow-auto">{item.code_text}</pre>
          )}
          {item.match_answers && (
            <ul className="bg-gray-50 rounded p-2 mb-2">
              {Object.entries(item.match_answers).map(([k, v]) => (
                <li key={k}>{k} → {v}</li>
              ))}
            </ul>
          )}
          {item.answer_file && (
            <p className="text-blue-600 mb-2">File: {item.answer_file}</p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="number" step="0.5" min="0" max={item.maximum_marks}
              placeholder="Marks"
              value={marks[item.answer_id] ?? ''}
              onChange={(e) => setMarks({ ...marks, [item.answer_id]: e.target.value })}
              className="border rounded px-3 py-1.5 w-28"
            />
            <button onClick={() => grade(item, true)}
              className="bg-green-600 text-white px-3 py-1.5 rounded">Grade Correct</button>
            <button onClick={() => grade(item, false)}
              className="bg-orange-500 text-white px-3 py-1.5 rounded">Grade Wrong</button>
            <button onClick={() => grade(item, null)}
              className="bg-gray-500 text-white px-3 py-1.5 rounded">Grade (no verdict)</button>
          </div>
        </div>
      ))}
    </div>
  );
}
