import { useCallback, useEffect, useState } from 'react';
import api, { detailText, fileUrl } from '../../api/client';
import Loader from '../../components/Loader';
import Pagination, { usePager } from '../../components/Pagination';
import { apiDate } from '../../utils/datetime';

const refreshBadge = () =>
  window.dispatchEvent(new Event('approvals:refresh'));

const SECTION_LABELS = {
  options: 'Options',
  truefalse: 'True/False answer',
  shortanswer: 'Short answer',
  numerical: 'Numerical answer',
  essay: 'Essay settings',
  multianswer: 'Multi-answer',
  match: 'Match pairs',
  gapselect: 'Gap options',
  ordering: 'Ordering items',
  calculated: 'Calculated settings',
  description: 'Description',
  images: 'Images',
  paragraph: 'Linked questions',
  coding: 'Coding settings',
};

const BASE_LABELS = {
  name: 'Name',
  question_text: 'Question text',
  default_mark: 'Marks',
  category_id: 'Category ID',
};

const FIELD_LABELS = {
  true_answer: 'Answer is True',
  answer_text: 'Answer text',
  case_sensitive: 'Case sensitive',
  answer_value: 'Answer value',
  tolerance: 'Tolerance',
  max_words: 'Max words',
  answer_format: 'Answer format',
  formula: 'Formula',
  units: 'Units',
  content: 'Content',
  language: 'Language',
  starter_code: 'Starter code',
  time_limit: 'Time limit (s)',
};

const eq = (a, b) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const fmtScalar = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

// Render a subtype section value (list or object) as readable lines
// for one side of the diff.
function sectionLines(key, value) {
  if (value === null || value === undefined) return ['(none)'];

  if (Array.isArray(value)) {
    if (!value.length) return ['(empty)'];
    if (key === 'options') {
      return value.map((o, i) =>
        `${i + 1}. ${o.option_text || '[image]'}`
        + (o.image_url ? ' [has image]' : '')
        + (o.is_correct ? '  ✓ correct' : '')
        + (o.fraction ? `  frac ${o.fraction}` : '')
      );
    }
    if (key === 'match') {
      return value.map((m, i) => `${i + 1}. ${m.sub_question} → ${m.sub_answer}`);
    }
    if (key === 'gapselect') {
      return value.map((g) =>
        `blank ${g.blank_no}: ${g.option_text}${g.is_correct ? '  ✓' : ''}`
      );
    }
    if (key === 'ordering') {
      return value.map((o) => `${o.position}. ${o.item_text}`);
    }
    if (key === 'images') {
      return value.map((im, i) => `${i + 1}. ${im.alt_text || im.image_url}`);
    }
    return value.map((v, i) => `${i + 1}. ${fmtScalar(v)}`);
  }

  if (key === 'paragraph') {
    const ids = value.question_ids || [];
    return ids.length
      ? [ids.map((id) => `#${id}`).join(', ')]
      : ['(empty)'];
  }

  if (key === 'coding') {
    const lines = [
      `language: ${fmtScalar(value.language)}`,
      `time limit: ${fmtScalar(value.time_limit)}s`,
    ];
    if (value.starter_code) lines.push('starter code: (set)');
    const cases = value.test_cases || [];
    lines.push(`test cases: ${cases.length}`);
    cases.forEach((tc, i) => {
      lines.push(
        `  ${i + 1}. ${fmtScalar(tc.input_text)} → ${fmtScalar(tc.expected_output)}`
        + `${tc.is_hidden ? ' [hidden]' : ''} (${tc.marks} mk)`
      );
    });
    return lines;
  }

  if (key === 'calculated') {
    const lines = [
      `formula: ${fmtScalar(value.formula)}`,
      `tolerance: ${fmtScalar(value.tolerance)}`,
    ];
    if (value.units) lines.push(`units: ${value.units}`);
    (value.datasets || []).forEach((d) => {
      lines.push(
        `  {${d.name}}: ${fmtScalar(d.min_value)}–${fmtScalar(d.max_value)} (${d.decimals ?? 0} dp)`
      );
    });
    return lines;
  }

  // Generic object — one line per field.
  return Object.entries(value || {}).map(([k, v]) => {
    if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
    else if (v === null || v === undefined) v = '—';
    return `${FIELD_LABELS[k] || k}: ${v}`;
  });
}

function ImageStrip({ urls }) {
  const imgs = (urls || []).filter(Boolean);
  if (!imgs.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {imgs.map((u, i) => (
        <img key={i} src={fileUrl(u)} alt=""
          className="h-10 w-10 object-cover rounded border" />
      ))}
    </div>
  );
}

// Expandable panel comparing `current` (server snapshot) with the
// staged `payload`.
function ChangesPanel({ request }) {
  const cur = request.current || {};
  const pay = request.payload || {};

  if (request.action === 'delete') {
    return (
      <div className="border rounded p-3 bg-red-50/40 text-xs">
        <p className="font-semibold text-red-700 mb-1">
          This question will be permanently deleted:
        </p>
        {cur.base && (
          <div className="text-gray-700 space-y-0.5">
            <p><b>Name:</b> {cur.base.name}</p>
            <p><b>Text:</b> {cur.base.question_text}</p>
            <p><b>Marks:</b> {fmtScalar(cur.base.default_mark)}</p>
          </div>
        )}
      </div>
    );
  }

  const changedBase = Object.entries(pay.base || {})
    .filter(([k, v]) => !eq(cur.base?.[k], v));
  const sameBase = Object.keys(pay.base || {}).length - changedBase.length;

  const sectionKeys = Object.keys(SECTION_LABELS)
    .filter((k) => k in pay);

  const anyChange = changedBase.length > 0 ||
    sectionKeys.some((k) => !eq(cur[k], pay[k]));

  if (!anyChange) {
    return (
      <p className="text-xs text-gray-500 italic">
        Staged state matches the current question — no visible changes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {changedBase.length > 0 && (
        <div className="border rounded overflow-hidden">
          <p className="bg-gray-50 px-3 py-1.5 text-xs font-semibold border-b">
            Question details{sameBase > 0 ? ` (+${sameBase} unchanged)` : ''}
          </p>
          <table className="w-full text-xs">
            <tbody>
              {changedBase.map(([k, v]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="p-2 font-medium text-gray-500 w-32 align-top">
                    {BASE_LABELS[k] || k}
                  </td>
                  <td className="p-2 bg-red-50/50 text-red-800 align-top whitespace-pre-wrap break-words">
                    {fmtScalar(cur.base?.[k])}
                  </td>
                  <td className="p-2 bg-green-50/50 text-green-800 align-top whitespace-pre-wrap break-words">
                    {fmtScalar(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sectionKeys.map((key) => {
        const same = eq(cur[key], pay[key]);
        return (
          <div key={key} className="border rounded overflow-hidden">
            <p className="bg-gray-50 px-3 py-1.5 text-xs font-semibold border-b">
              {SECTION_LABELS[key]}
              {same && (
                <span className="ml-2 font-normal text-gray-400">
                  (unchanged)
                </span>
              )}
            </p>
            {!same && (
              <div className="grid grid-cols-2 divide-x text-xs">
                <div className="p-3 bg-red-50/40">
                  <p className="font-semibold text-red-600 mb-1">Current</p>
                  <ul className="space-y-0.5 text-gray-700 whitespace-pre-wrap break-words">
                    {sectionLines(key, cur[key]).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                  {(key === 'options' || key === 'images') && (
                    <ImageStrip
                      urls={key === 'options'
                        ? (cur[key] || []).map((o) => o.image_url)
                        : (cur[key] || []).map((im) => im.image_url)}
                    />
                  )}
                </div>
                <div className="p-3 bg-green-50/40">
                  <p className="font-semibold text-green-700 mb-1">Requested</p>
                  <ul className="space-y-0.5 text-gray-700 whitespace-pre-wrap break-words">
                    {sectionLines(key, pay[key]).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                  {(key === 'options' || key === 'images') && (
                    <ImageStrip
                      urls={key === 'options'
                        ? (pay[key] || []).map((o) => o.image_url)
                        : (pay[key] || []).map((im) => im.image_url)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);
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
        <div className="space-y-3">
          {pg.items.map((r) => {
            const open = expanded === r.id;
            return (
              <div key={r.id} className="bg-white rounded shadow">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      #{r.question_id} — {r.question_name || '(deleted)'}
                      <span className="ml-2 text-xs text-gray-400 capitalize">
                        {r.question_type}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.action === 'delete' ? 'Delete request' : 'Edit request'}
                      {' by '}{r.requester_name || `#${r.requested_by}`}
                      {' · '}{r.created_at ? apiDate(r.created_at).toLocaleString() : ''}
                      {r.review_note ? ` · note: ${r.review_note}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    r.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : r.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {r.status}
                  </span>
                  <button
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="text-xs text-blue-600 hover:underline">
                    {open ? 'Hide changes' : 'View changes'}
                  </button>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => act(r, 'approve')}
                        className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700">
                        Approve
                      </button>
                      <button onClick={() => act(r, 'reject')}
                        className="text-xs bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700">
                        Reject
                      </button>
                    </>
                  )}
                </div>
                {open && (
                  <div className="border-t p-3">
                    {r.current || r.action === 'delete' ? (
                      <ChangesPanel request={r} />
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        Change details are only shown while a request is pending.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} />
    </div>
  );
}
