import { useEffect, useState } from 'react';
import api from '../../api/client';

function PieChart({ detail }) {
  // Older detail payloads lack pending/no_verdict — fall back to
  // deriving pending as attempted minus the known buckets.
  const pending = detail.pending ?? Math.max(
    (detail.attempted ?? 0) - (detail.correct ?? 0) - (detail.wrong ?? 0),
    0
  );
  const slices = [
    { label: 'Correct', value: detail.correct ?? 0, color: '#16a34a' },
    { label: 'Wrong', value: detail.wrong ?? 0, color: '#dc2626' },
    { label: 'Graded (no verdict)', value: detail.no_verdict ?? 0, color: '#0ea5e9' },
    { label: 'Pending grading', value: pending, color: '#d97706' },
    { label: 'Skipped', value: detail.skipped ?? 0, color: '#9ca3af' },
  ];
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 56, C = 65;
  let angle = -Math.PI / 2;
  const arcs = [];
  for (const s of slices) {
    if (!s.value || !total) continue;
    const sweep = (s.value / total) * Math.PI * 2;
    if (sweep >= Math.PI * 2 - 1e-9) {
      arcs.push({ circle: true, color: s.color });
      continue;
    }
    const x1 = C + R * Math.cos(angle), y1 = C + R * Math.sin(angle);
    angle += sweep;
    const x2 = C + R * Math.cos(angle), y2 = C + R * Math.sin(angle);
    arcs.push({
      color: s.color,
      d: `M ${C} ${C} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`,
    });
  }
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 130 130" className="w-32 h-32 shrink-0">
        {arcs.map((a, i) =>
          a.circle ? (
            <circle key={i} cx={C} cy={C} r={R} fill={a.color} />
          ) : (
            <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth="1" />
          )
        )}
        {total === 0 && <circle cx={C} cy={C} r={R} fill="#e5e7eb" />}
      </svg>
      <ul className="text-xs space-y-1">
        <li className="font-medium text-gray-700">
          Attempted: {detail.attempted}/{detail.total_questions}
        </li>
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
            {s.label}: {s.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerReview({ q, index }) {
  const badge = !q.answered
    ? 'text-gray-400'
    : q.marks_obtained === null
      ? 'text-amber-600'
      : q.is_correct === null
        ? 'text-sky-600'
        : q.is_correct ? 'text-green-600' : 'text-red-600';
  const badgeText = q.marks_obtained !== null
    ? `${q.marks_obtained}/${q.marks} marks`
    : q.answered ? 'pending grading' : `0/${q.marks} marks`;

  const picked = new Set(
    [q.selected_option_id, ...(q.selected_option_ids || [])].filter(Boolean)
  );

  return (
    <div className="border rounded p-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 uppercase">Q{index} {'\u00b7'} {q.question_type}</span>
        <span className={`font-medium ${badge}`}>{badgeText}</span>
      </div>
      <p className="font-medium text-sm">{q.name}</p>
      <p className="text-sm mb-2 whitespace-pre-wrap">{q.question_text}</p>

      {(q.images || []).map((img, i) => (
        <img key={i} src={img.image_url} alt={img.alt_text || q.name}
          className="mb-2 max-h-40 rounded border" />
      ))}

      {!q.answered && <p className="text-sm text-gray-400 italic">Not answered</p>}

      {q.options && (
        <div className="space-y-1">
          {q.options.map((o) => (
            <div
              key={o.id}
              className={`px-2 py-1 rounded text-sm flex items-center gap-2 ${
                o.is_correct
                  ? 'bg-green-50 text-green-700 font-medium'
                  : picked.has(o.id)
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {o.image_url && (
                <img src={o.image_url} alt={o.option_text || 'option'}
                  className="h-14 object-contain rounded" />
              )}
              {o.option_text}
              {o.is_correct && <span className="ml-2 text-xs">(correct answer)</span>}
              {picked.has(o.id) && <span className="ml-2 text-xs">&larr; your answer</span>}
            </div>
          ))}
        </div>
      )}

      {q.match_items && (
        <div className="text-xs space-y-1">
          <div className="flex gap-3 font-medium text-gray-500">
            <span className="w-1/3">Item</span>
            <span className="flex-1">Your answer</span>
            <span className="flex-1">Correct answer</span>
          </div>
          {q.match_items.map((m) => {
            const yours = (q.match_answers || {})[m.sub_question];
            return (
              <div key={m.sub_question} className="flex gap-3">
                <span className="w-1/3">{m.sub_question}</span>
                <span className={`flex-1 ${yours === m.correct ? 'text-green-700' : 'text-red-600'}`}>
                  {yours || '\u2014'}
                </span>
                <span className="flex-1 text-green-700">{m.correct}</span>
              </div>
            );
          })}
        </div>
      )}

      {q.gap_blanks && (
        <div className="text-xs space-y-1">
          <div className="flex gap-3 font-medium text-gray-500">
            <span className="w-16">Blank</span>
            <span className="flex-1">Your answer</span>
            <span className="flex-1">Correct answer</span>
          </div>
          {q.gap_blanks.map((b) => {
            const yours = (q.match_answers || {})[String(b.blank_no)];
            return (
              <div key={b.blank_no} className="flex gap-3">
                <span className="w-16 text-gray-500">[[{b.blank_no}]]</span>
                <span className={`flex-1 ${yours === b.correct ? 'text-green-700' : 'text-red-600'}`}>
                  {yours || '\u2014'}
                </span>
                <span className="flex-1 text-green-700">{b.correct || '\u2014'}</span>
              </div>
            );
          })}
        </div>
      )}

      {q.ordering_items && (
        <div className="text-xs flex gap-4">
          <div className="flex-1">
            <p className="font-medium text-gray-500 mb-1">Your order</p>
            {(((q.match_answers || {}).order || [])
              .map((id) => q.ordering_items.find((it) => it.id === id))
              .filter(Boolean)
            ).map((it, i) => (
              <p key={it.id}
                className={q.ordering_items[i]?.id === it.id ? 'text-green-700' : 'text-red-600'}>
                {i + 1}. {it.item_text}
              </p>
            ))}
            {((q.match_answers || {}).order || []).length === 0 && (
              <p className="text-gray-400">{'\u2014'}</p>
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-500 mb-1">Correct order</p>
            {q.ordering_items.map((it, i) => (
              <p key={it.id} className="text-green-700">
                {i + 1}. {it.item_text}
              </p>
            ))}
          </div>
        </div>
      )}

      {q.question_type === 'coding' && q.code_text && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Your code:</p>
          <pre className="bg-gray-900 text-green-300 rounded p-2 text-xs overflow-x-auto">
            {q.code_text}
          </pre>
        </div>
      )}

      {!q.options && !q.match_items && !q.gap_blanks && !q.ordering_items
        && q.question_type !== 'coding' && q.answered && (
        <div className="text-sm space-y-1">
          <p>
            <span className="text-gray-500">Your answer: </span>
            {q.answer_text || q.answer_file || '\u2014'}
          </p>
          {q.correct_answer && (
            <p className="text-green-700">
              <span className="text-gray-500">Correct answer: </span>
              {q.correct_answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const [results, setResults] = useState([]);
  const [detail, setDetail] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    api.get('/results/my-results').then((r) => setResults(r.data));
  }, []);

  const view = async (attemptId) => {
    const { data } = await api.get(`/results/my-results/${attemptId}`);
    setAnswers(null);
    setDetail(data);
  };

  const viewFull = async () => {
    setLoadingFull(true);
    try {
      const { data } = await api.get(
        `/results/my-results/${detail.attempt_id}/answers`
      );
      setAnswers(data);
    } finally {
      setLoadingFull(false);
    }
  };

  const close = () => {
    setDetail(null);
    setAnswers(null);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Results</h1>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">Exam</th><th>Attempt</th><th>Status</th>
            <th>Total marks</th><th>Obtained</th><th>%</th><th>Result</th><th></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.attempt_id} className="border-b">
              <td className="p-3">{r.exam_name}</td>
              <td>{r.attempt_no}</td>
              <td className="capitalize">{r.status}</td>
              <td>{r.maximum_marks ?? '-'}</td>
              <td>{r.total_marks ?? '-'}</td>
              <td>{r.percentage ?? '-'}</td>
              <td>
                <span className={
                  r.pass_fail === 'PASS' ? 'text-green-600 font-medium'
                    : r.pass_fail === 'FAIL' ? 'text-red-600'
                    : 'text-amber-600'
                }>
                  {r.pass_fail ? r.pass_fail.toLowerCase() : 'pending'}
                </span>
              </td>
              <td>
                <button onClick={() => view(r.attempt_id)}
                  className="text-blue-600 hover:underline">Details</button>
              </td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr><td colSpan={8} className="p-4 text-gray-400">No results yet</td></tr>
          )}
        </tbody>
      </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={close}>
          <div
            className={`bg-white rounded shadow-lg p-6 max-h-[85vh] overflow-y-auto ${
              answers ? 'w-full max-w-3xl' : 'w-full max-w-md'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Attempt {detail.attempt_id} detail</h2>
              <button onClick={close} title="Close"
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &#10005;
              </button>
            </div>
            <dl className="text-sm space-y-1 max-w-sm mx-auto">
              <div className="flex justify-between"><dt>Status</dt><dd className="capitalize">{detail.status}</dd></div>
              <div className="flex justify-between"><dt>Questions</dt><dd>{detail.total_questions}</dd></div>
              <div className="flex justify-between"><dt>Attempted</dt><dd>{detail.attempted}</dd></div>
              <div className="flex justify-between"><dt>Correct</dt><dd>{detail.correct}</dd></div>
              <div className="flex justify-between"><dt>Wrong</dt><dd>{detail.wrong}</dd></div>
              <div className="flex justify-between"><dt>Skipped</dt><dd>{detail.skipped}</dd></div>
              <div className="flex justify-between"><dt>Total marks</dt><dd>{detail.maximum_marks ?? '-'}</dd></div>
              <div className="flex justify-between"><dt>Obtained</dt><dd>{detail.total_marks}</dd></div>
              <div className="flex justify-between"><dt>Percentage</dt><dd>{detail.percentage}%</dd></div>
              <div className="flex justify-between font-bold">
                <dt>Result</dt>
                <dd>{detail.pass_fail === 'PENDING' ? 'Pending manual grading' : detail.pass_fail}</dd>
              </div>
            </dl>

            {!answers && (
              <div className="mt-4 flex gap-2 max-w-sm mx-auto">
                <button onClick={viewFull} disabled={loadingFull}
                  className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm disabled:opacity-50">
                  {loadingFull ? 'Loading...' : 'Full details'}
                </button>
                <button onClick={close}
                  className="flex-1 bg-gray-200 py-1.5 rounded text-sm">Close</button>
              </div>
            )}

            {answers && (
              <>
                <div className="mt-4 flex justify-center">
                  <PieChart detail={detail} />
                </div>
                <div className="mt-5 space-y-3 max-w-2xl mx-auto">
                  {answers.map((q, i) => (
                    <AnswerReview key={q.question_id} q={q} index={i + 1} />
                  ))}
                </div>
                <button onClick={close}
                  className="mt-4 w-full bg-gray-200 py-1.5 rounded text-sm">Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
