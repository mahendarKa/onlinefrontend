import { useEffect, useState } from 'react';
import api, { detailText } from '../../api/client';
import { apiDate } from '../../utils/datetime';

const PAGE_SIZE = 20;

function fmt(dt) {
  return apiDate(dt).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogs() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [filters, setFilters] = useState({ user_id: '', action: '', entity_type: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (p = page, f = filters) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: PAGE_SIZE };
      if (f.user_id) params.user_id = Number(f.user_id);
      if (f.action) params.action = f.action;
      if (f.entity_type) params.entity_type = f.entity_type;
      const { data } = await api.get('/audit-logs/', { params });
      setData(data);
      setError('');
    } catch (err) {
      setError(detailText(err, 'Failed to load audit logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const goTo = (p) => {
    setPage(p);
    load(p);
  };

  const pg = data.pagination || {};

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Audit Logs</h1>

      <form onSubmit={applyFilters} className="bg-white p-3 rounded shadow mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">User ID</label>
          <input value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            placeholder="e.g. 7" className="border rounded px-3 py-1.5 text-sm w-28" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Action</label>
          <input value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="e.g. auth.login" className="border rounded px-3 py-1.5 text-sm w-44" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Entity type</label>
          <input value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            placeholder="e.g. exam" className="border rounded px-3 py-1.5 text-sm w-36" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Filter</button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded shadow text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log.id} className="border-b align-top">
                    <td className="p-3 whitespace-nowrap text-xs text-gray-500">
                      {fmt(log.created_at)}
                    </td>
                    <td>
                      {log.user_name
                        ? <>{log.user_name}<span className="block text-xs text-gray-400">{log.user_email}</span></>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td>
                      <span className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="text-xs">
                      {log.entity_type}
                      {log.entity_id != null && (
                        <span className="text-gray-400"> {log.entity_id}</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-600 max-w-xs break-words">
                      {log.details || '—'}
                    </td>
                    <td className="text-xs text-gray-400">{log.ip_address || '—'}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">
                    No audit log entries
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pg.total_pages > 1 && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <button disabled={page <= 1} onClick={() => goTo(page - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40">
                Prev
              </button>
              <span className="text-gray-500">
                Page {pg.page} of {pg.total_pages} ({pg.total_items} entries)
              </span>
              <button disabled={page >= pg.total_pages} onClick={() => goTo(page + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
