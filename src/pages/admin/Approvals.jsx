import { useCallback, useEffect, useState } from 'react';
import api, { detailText } from '../../api/client';
import Loader from '../../components/Loader';
import Pagination, { usePager } from '../../components/Pagination';
import { apiDate } from '../../utils/datetime';

const refreshBadge = () =>
  window.dispatchEvent(new Event('approvals:refresh'));

// Short human summary of what an update payload changes.
function describePayload(r) {
  if (r.action === 'delete') return 'Delete this question';
  const base = r.payload?.base || {};
  const parts = [];
  if (base.name) parts.push(`name → ${base.name}`);
  if (base.default_mark != null) parts.push(`marks → ${base.default_mark}`);
  if (base.question_text) parts.push('question text updated');
  return parts.join(' · ') || 'Edit this question';
}

export default function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/questions/change-requests', {
      params: statusFilter ? { status: statusFilter } : {},
    })
      .then(({ data }) => setRequests(data))
      .catch((err) => setError(detailText(err, 'Failed to load requests')))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const pg = usePager(requests);

  const act = async (r, action) => {
    setError('');
    setMessage('');
    const note = action === 'reject'
      ? window.prompt('Reason for rejection (optional)') || ''
      : '';
    try {
      await api.post(
        `/questions/change-requests/${r.id}/${action}`,
        action === 'reject' ? { note } : {}
      );
      setMessage(
        `Request ${action === 'approve' ? 'approved' : 'rejected'}`
      );
      refreshBadge();
      load();
    } catch (err) {
      setError(detailText(err, `Failed to ${action} request`));
    }
  };

  if (loading) return <Loader full />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Question Approvals</h1>
        <select value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}
      {message && (
        <p className="mb-3 text-sm text-green-700 bg-green-50 p-2 rounded">{message}</p>
      )}

      {requests.length === 0 ? (
        <p className="text-gray-500 bg-white p-4 rounded shadow">
          No {statusFilter || ''} change requests.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Question</th>
                <th>Action</th><th>Requested By</th>
                <th>Requested</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((r) => (
                <tr key={r.id} className="border-b align-top">
                  <td className="p-3">
                    <p className="font-medium">
                      #{r.question_id} — {r.question_name || '(deleted)'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {r.question_type || ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {describePayload(r)}
                    </p>
                  </td>
                  <td className="capitalize">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.action === 'delete'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.action}
                    </span>
                  </td>
                  <td>{r.requester_name || `#${r.requested_by}`}</td>
                  <td className="text-xs text-gray-500">
                    {r.created_at ? apiDate(r.created_at).toLocaleString() : '-'}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      r.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : r.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {r.status}
                    </span>
                    {r.review_note && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.review_note}
                      </p>
                    )}
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => act(r, 'approve')}
                          className="text-green-600 hover:underline">
                          Approve
                        </button>
                        <button onClick={() => act(r, 'reject')}
                          className="text-red-600 hover:underline">
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} />
    </div>
  );
}
