import { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';

export default function AttemptHistory() {
  const [history, setHistory] = useState({ attempts: [] });

  useEffect(() => {
    api.get('/attempt-history/my-attempts').then((r) => setHistory(r.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        Attempt History ({history.total_attempts || 0})
      </h1>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">Exam</th><th>Attempt</th><th>Started</th>
            <th>Status</th><th>Marks</th><th>%</th><th>Result</th>
          </tr>
        </thead>
        <tbody>
          {history.attempts.map((a) => (
            <tr key={a.attempt_id} className="border-b">
              <td className="p-3">{a.exam_name}</td>
              <td>{a.attempt_number}</td>
              <td>{a.start_time ? apiDate(a.start_time).toLocaleString() : '-'}</td>
              <td className="capitalize">{a.status}</td>
              <td>{a.total_marks ?? '-'}</td>
              <td>{a.percentage ?? '-'}</td>
              <td>
                <span className={a.pass_fail === 'PASS' ? 'text-green-600' : a.pass_fail === 'FAIL' ? 'text-red-600' : 'text-gray-400'}>
                  {a.pass_fail ?? 'pending'}
                </span>
              </td>
            </tr>
          ))}
          {history.attempts.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-gray-400">No attempts yet</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
