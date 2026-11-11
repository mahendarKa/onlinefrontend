import { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';
import Pagination, { usePager } from '../../components/Pagination';

export default function AttemptHistory() {
  const [history, setHistory] = useState({ attempts: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  const statuses = [...new Set(history.attempts.map((a) => a.status))].sort();
  const q = search.trim().toLowerCase();
  const filtered = history.attempts.filter((a) =>
    (statusFilter === '' || a.status === statusFilter) &&
    (resultFilter === '' ||
      (a.pass_fail === 'PASS' ? 'pass'
        : a.pass_fail === 'FAIL' ? 'fail' : 'pending') === resultFilter) &&
    (q === '' || a.exam_name.toLowerCase().includes(q))
  );
  const pg = usePager(filtered);

  useEffect(() => {
    api.get('/attempt-history/my-attempts').then((r) => setHistory(r.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        Attempt History ({history.total_attempts || 0})
      </h1>

      <div className="flex flex-wrap gap-2 mb-3">
        <input placeholder="Search exam name..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-48" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm capitalize">
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All results</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">Exam</th><th>Attempt</th><th>Started</th>
            <th>Status</th><th>Marks</th><th>%</th><th>Result</th>
          </tr>
        </thead>
        <tbody>
          {pg.items.map((a) => (
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
          {history.attempts.length > 0 && filtered.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-gray-400">No matching attempts</td></tr>
          )}
        </tbody>
      </table>
      </div>
      <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} />
    </div>
  );
}
