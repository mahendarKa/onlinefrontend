import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import api from '../../api/client';
import { apiDate } from '../../utils/datetime';

function Timer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  );

  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, onExpire]);

  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');

  return (
    <span className={`font-mono font-bold ${remaining < 300 ? 'text-red-600' : ''}`}>
      {h}:{m}:{s}
    </span>
  );
}

const CM_LANGS = {
  python: () => python(),
  java: () => java(),
  javascript: () => javascript(),
  js: () => javascript(),
  node: () => javascript(),
};

// IDE-style editor + "Run" against the question's visible test cases.
// Kept as its own component so run state resets per question (key below).
function CodingEditor({ question, saved, onChange, examId, attemptId }) {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const code = saved?.code_text ?? (question.starter_code || '');
  const langKey = (question.coding_language || '').toLowerCase();
  const extensions = CM_LANGS[langKey] ? [CM_LANGS[langKey]()] : [];
  const cases = question.coding_test_cases || [];

  const doRun = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      // Persist exactly what's on screen, then execute it.
      onChange({ code_text: code });
      const { data } = await api.post(
        `/student/exams/attempt/${attemptId}/run-code`,
        { question_id: question.id, code }
      );
      setRunResult(data);
    } catch (err) {
      setRunResult({
        error: err.response?.data?.detail || 'Could not run the code',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {question.coding_language
            ? `Language: ${question.coding_language}`
            : 'Write your solution below'}
        </span>
        {cases.length > 0 && (
          <button type="button" onClick={doRun} disabled={running}
            className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50">
            {running ? 'Running…' : '\u25B6 Run code'}
          </button>
        )}
      </div>

      <div className="border rounded overflow-hidden text-sm">
        <CodeMirror
          value={code}
          height="320px"
          theme="dark"
          extensions={extensions}
          onChange={(value) => onChange({ code_text: value })}
        />
      </div>

      {cases.length > 0 && (
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer select-none">
            Sample test cases ({cases.length})
          </summary>
          <div className="mt-2 space-y-2">
            {cases.map((c, i) => (
              <div key={i} className="border rounded p-2 bg-gray-50">
                <p className="font-medium mb-1">Case {i + 1}</p>
                {c.input_text != null && c.input_text !== '' && (
                  <pre className="bg-white border rounded p-1.5 mb-1 whitespace-pre-wrap">
                    <span className="text-gray-400">input:</span> {c.input_text}
                  </pre>
                )}
                <pre className="bg-white border rounded p-1.5 whitespace-pre-wrap">
                  <span className="text-gray-400">expected:</span> {c.expected_output}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {runResult && (runResult.error ? (
        <p className="text-sm text-red-600">{runResult.error}</p>
      ) : (
        <div className="border rounded text-xs divide-y">
          <p className={`px-3 py-2 font-medium ${runResult.passed_count === runResult.total ? 'text-emerald-700' : 'text-amber-700'}`}>
            Passed {runResult.passed_count}/{runResult.total} test case{runResult.total !== 1 ? 's' : ''}
          </p>
          {runResult.results.map((r, i) => (
            <div key={i} className="px-3 py-2 space-y-1">
              <p>
                <span className={`inline-block px-1.5 rounded font-medium ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  Case {i + 1}: {r.passed ? 'PASS' : 'FAIL'}
                </span>
                {r.timed_out && <span className="ml-2 text-amber-600">timed out</span>}
              </p>
              {r.error && <pre className="text-red-600 whitespace-pre-wrap">{r.error}</pre>}
              {!r.passed && !r.error && (
                <div className="grid grid-cols-2 gap-2">
                  <pre className="bg-gray-50 border rounded p-1.5 whitespace-pre-wrap">
                    <span className="text-gray-400">expected:</span> {r.expected_output}
                  </pre>
                  <pre className="bg-gray-50 border rounded p-1.5 whitespace-pre-wrap">
                    <span className="text-gray-400">actual:</span> {r.actual_output}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AnswerInput({ question, saved, onChange, examId, attemptId }) {
  const type = question.type;

  if (type === 'multichoice') {
    return (
      <div className="space-y-2">
        {question.options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={saved?.selected_option_id === o.id}
              onChange={() => onChange({ selected_option_id: o.id })}
            />
            {o.option_text}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'multiselect') {
    const selected = saved?.selected_option_ids || [];
    const toggle = (id) => {
      const next = selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
      onChange({ selected_option_ids: next });
    };
    return (
      <div className="space-y-2">
        {question.options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
            />
            {o.option_text}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'truefalse') {
    return (
      <div className="space-x-4">
        {['true', 'false'].map((v) => (
          <label key={v} className="inline-flex items-center gap-1 text-sm">
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={saved?.answer_text === v}
              onChange={() => onChange({ answer_text: v })}
            />
            {v === 'true' ? 'True' : 'False'}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'match') {
    const current = saved?.match_answers || {};
    return (
      <div className="space-y-2">
        {(question.match_items || []).map((item) => (
          <div key={item.id} className="flex items-center gap-3 text-sm">
            <span className="w-1/2">{item.sub_question}</span>
            <select
              className="border rounded px-2 py-1 w-1/2"
              value={current[item.sub_question] || ''}
              onChange={(e) =>
                onChange({
                  match_answers: {
                    ...current,
                    [item.sub_question]: e.target.value,
                  },
                })
              }
            >
              <option value="">-- choose --</option>
              {(question.match_choices || []).map((choice, idx) => (
                <option key={idx} value={choice}>{choice}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'selectmissing') {
    // Text contains [[n]] placeholders; each renders as a dropdown.
    const current = saved?.match_answers || {};
    const parts = question.question_text.split(/(\[\[\d+\]\])/g);
    return (
      <p className="leading-9 whitespace-pre-wrap">
        {parts.map((p, i) => {
          const m = p.match(/^\[\[(\d+)\]\]$/);
          if (!m) return <span key={i}>{p}</span>;
          const blank = (question.gap_blanks || []).find(
            (b) => b.blank_no === Number(m[1])
          );
          return (
            <select key={i}
              value={current[m[1]] || ''}
              onChange={(e) => onChange({
                match_answers: { ...current, [m[1]]: e.target.value },
              })}
              className="border rounded px-2 py-1 mx-1 text-sm bg-blue-50">
              <option value="">{m[1]} choose...</option>
              {(blank?.options || []).map((opt, j) => (
                <option key={j} value={opt}>{opt}</option>
              ))}
            </select>
          );
        })}
      </p>
    );
  }

  if (type === 'ordering') {
    const items = question.ordering_items || [];
    const savedOrder = saved?.match_answers?.order;
    // Saved order wins on resume; items added later land at the end.
    // Deduped — a corrupted saved order can never render duplicate rows
    // or duplicate React keys.
    const seen = new Set();
    const seq = (savedOrder?.length ? savedOrder : items.map((x) => x.id))
      .map((id) => items.find((x) => x.id === id))
      .filter((x) => x && !seen.has(x.id) && seen.add(x.id))
      // Only items NOT already in the sequence — never duplicate.
      .concat(items.filter((x) => !seen.has(x.id)));
    const apply = (ids) => onChange({ match_answers: { order: ids } });
    const move = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= seq.length) return;
      const ids = seq.map((x) => x.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      apply(ids);
    };
    // Drag & drop: dragging a row onto another inserts it at that position.
    const dropTo = (from, to) => {
      if (Number.isNaN(from) || from === to || from < 0 || from >= seq.length) {
        return;
      }
      const ids = seq.map((x) => x.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      apply(ids);
    };
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 mb-1">
          Arrange the items in the correct order — drag rows or use the arrows:
        </p>
        {seq.map((item, i) => (
          <div key={item.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(i));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnter={(e) =>
              e.currentTarget.classList.add('ring-2', 'ring-blue-300')
            }
            onDragLeave={(e) =>
              e.currentTarget.classList.remove('ring-2', 'ring-blue-300')
            }
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('ring-2', 'ring-blue-300');
              dropTo(
                parseInt(e.dataTransfer.getData('text/plain'), 10),
                i
              );
            }}
            className="flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50 cursor-grab active:cursor-grabbing">
            <span className="w-6 text-gray-400">{i + 1}.</span>
            <span className="text-gray-300 select-none" title="Drag to reorder">
              &#x283F;
            </span>
            <span className="flex-1">{item.item_text}</span>
            <button type="button" onClick={() => move(i, -1)}
              disabled={i === 0}
              className="px-2 py-0.5 border rounded disabled:opacity-30"
              title="Move up">&#8593;</button>
            <button type="button" onClick={() => move(i, 1)}
              disabled={i === seq.length - 1}
              className="px-2 py-0.5 border rounded disabled:opacity-30"
              title="Move down">&#8595;</button>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'coding') {
    return (
      <CodingEditor
        question={question}
        saved={saved}
        onChange={onChange}
        examId={examId}
        attemptId={attemptId}
      />
    );
  }

  // Description/paragraph items are informational text; no answer to give.
  if (type === 'description' || type === 'paragraph') {
    return null;
  }

  // Image questions: single-choice over text and/or image options.
  if (type === 'image') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((o) => (
          <label
            key={o.id}
            className={`border rounded p-2 flex flex-col items-center gap-2 cursor-pointer text-center ${
              saved?.selected_option_id === o.id
                ? 'ring-2 ring-blue-500 border-blue-500'
                : 'hover:border-blue-300'
            }`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              className="sr-only"
              checked={saved?.selected_option_id === o.id}
              onChange={() => onChange({ selected_option_id: o.id })}
            />
            {o.image_url && (
              <img src={o.image_url} alt={o.option_text || 'option'}
                className="h-28 object-contain" />
            )}
            {o.option_text && <span className="text-sm">{o.option_text}</span>}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'essay') {
    return (
      <textarea
        rows={8}
        className="w-full border rounded px-3 py-2 text-sm"
        value={saved?.answer_text || ''}
        onChange={(e) => onChange({ answer_text: e.target.value })}
      />
    );
  }

  // shortanswer, numerical, multianswer, calculated, paragraph -- free text
  return (
    <div>
      {(type === 'multianswer' || type === 'calculatedmulti') && (
        <p className="text-xs text-gray-500 mb-1">
          {type === 'multianswer' ? (
            <>Fill each blank in order, separated by commas — e.g.{' '}
            <span className="italic">answer1, answer2</span>. Answers are not
            case-sensitive.</>
          ) : (
            <>Enter each numeric answer in order, separated by commas — e.g.{' '}
            <span className="italic">14, 2</span>. Partial marks per correct
            part.</>
          )}
        </p>
      )}
      <input
        type="text"
        className="border rounded px-3 py-2 w-full"
        placeholder={type === 'multianswer' || type === 'calculatedmulti' ? 'answer1, answer2, ...' : ''}
        value={saved?.answer_text || ''}
        onChange={(e) => onChange({ answer_text: e.target.value })}
      />
    </div>
  );
}

export default function ExamPlayer() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fbRating, setFbRating] = useState(0);
  const [fbComments, setFbComments] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbError, setFbError] = useState('');
  const [loadError, setLoadError] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [q, a] = await Promise.all([
          api.get(`/student/exams/${examId}/attempt/${attemptId}/questions`),
          api.get(`/student/exams/attempt/${attemptId}/answers`),
        ]);
        // Description headers go first; paragraphs stay in sort order so
        // each passage sits right before the questions that belong to it.
        setQuestions([
          ...q.data.filter((x) => x.type === 'description'),
          ...q.data.filter((x) => x.type !== 'description'),
        ]);

        const map = {};
        a.data.forEach((ans) => { map[ans.question_id] = ans; });
        setAnswers(map);
      } catch (err) {
        setLoadError(err.response?.data?.detail || 'Failed to load exam');
      }
    };
    load();

    // Countdown deadline = min(start + duration, exam window end).
    Promise.all([
      api.get(`/attempt-history/exams/${examId}`),
      api.get('/student/dashboard/exams'),
    ]).then(([history, dash]) => {
      const attempt = history.data.attempts.find(
        (x) => x.attempt_id === Number(attemptId)
      );
      const examInfo = dash.data.find((x) => x.exam_id === Number(examId));
      if (attempt?.start_time && examInfo) {
        const durationEnd =
          apiDate(attempt.start_time).getTime() +
          examInfo.duration_minutes * 60 * 1000;
        const windowEnd = examInfo.end_time
          ? apiDate(examInfo.end_time).getTime()
          : Infinity;
        setDeadline(Math.min(durationEnd, windowEnd));
      }
    }).catch(() => {});
  }, [examId, attemptId]);

  const saveAnswer = (questionId, patch) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), ...patch },
    }));

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/student/exams/attempt/${attemptId}/answers`, {
          question_id: questionId,
          ...patch,
        });
      } catch {
        // transient failure; next change will retry
      }
    }, 500);
  };

  const submit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await api.post(`/student/exams/attempt/${attemptId}/submit`);
      setSubmitted(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      // Already submitted (timer auto-submit, another tab, etc.) -- just leave.
      if (typeof detail === 'string' && /already submitted/i.test(detail)) {
        navigate('/dashboard');
        return;
      }
      alert(typeof detail === 'string' ? detail : 'Submit failed');
      setSubmitting(false);
    }
  };

  // Feedback is optional — student can skip and just leave.
  const sendFeedback = async () => {
    if (!fbRating || fbSaving) return;
    setFbSaving(true);
    setFbError('');
    try {
      await api.post('/exam-feedback/', {
        attempt_id: Number(attemptId),
        rating: fbRating,
        comments: fbComments.trim() || null,
      });
      navigate('/dashboard');
    } catch (err) {
      const d = err.response?.data?.detail;
      if (typeof d === 'string' && /already submitted/i.test(d)) {
        navigate('/dashboard');
        return;
      }
      setFbError(typeof d === 'string' ? d : 'Could not save feedback');
      setFbSaving(false);
    }
  };

  const isAnswered = (a) =>
    !!a && (
      !!a.selected_option_id ||
      (a.selected_option_ids || []).length > 0 ||
      Object.keys(a.match_answers || {}).length > 0 ||
      (a.answer_text || '').trim().length > 0 ||
      (a.code_text || '').trim().length > 0 ||
      !!a.answer_file
    );

  const answerable = useMemo(
    () => questions.filter(
      (q) => !['description', 'paragraph'].includes(q.type)
    ),
    [questions]
  );

  // Paragraph items are passages, not standalone pages — they have no
  // nav slot and only render above the questions linked to them.
  const visible = useMemo(
    () => questions.filter((x) => x.type !== 'paragraph'),
    [questions]
  );

  const answeredCount = useMemo(
    () => answerable.filter((q) => isAnswered(answers[q.id])).length,
    [answerable, answers]
  );

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 bg-red-50 rounded p-4">{loadError}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow w-full max-w-md">
          <h1 className="text-xl font-bold text-green-600 mb-1 text-center">
            Exam submitted
          </h1>
          <p className="text-gray-500 text-sm text-center mb-4">
            How was this exam? Your feedback is optional.
          </p>

          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setFbRating(n)}
                className={`text-3xl leading-none ${
                  n <= fbRating ? 'text-amber-400' : 'text-gray-300'
                }`}>
                &#9733;
              </button>
            ))}
          </div>

          <textarea rows={3} value={fbComments}
            onChange={(e) => setFbComments(e.target.value)}
            placeholder="Comments (optional)"
            className="w-full border rounded px-3 py-2 text-sm mb-3" />

          {fbError && (
            <p className="text-sm text-red-600 mb-2">{fbError}</p>
          )}

          <div className="flex gap-2">
            <button onClick={sendFeedback}
              disabled={!fbRating || fbSaving}
              className="flex-1 bg-blue-600 text-white py-2 rounded text-sm disabled:opacity-40">
              {fbSaving ? 'Saving...' : 'Submit feedback'}
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-200 py-2 rounded text-sm">
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <p className="p-8">Loading exam...</p>;
  }

  const q = visible[current];

  if (!q) {
    return <p className="p-8">This exam has no questions yet.</p>;
  }

  // Passage above the question: the paragraph item that lists this
  // question in linked_question_ids applies to it (order-independent).
  let passage = null;
  if (q.type !== 'paragraph' && q.type !== 'description') {
    passage = questions.find(
      (x) => x.type === 'paragraph' &&
        (x.linked_question_ids || []).includes(q.id)
    ) || null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-2 items-center justify-between">
        <span className="font-bold">Exam in progress</span>
        {deadline ? <Timer deadline={deadline} onExpire={submit} /> : <span />}
        <span className="text-sm text-gray-500">
          Answered {answeredCount}/{answerable.length}
        </span>
      </header>

      <div className="flex flex-col md:flex-row flex-1">
        <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r p-3 md:p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Questions</p>
          <div className="grid grid-cols-8 md:grid-cols-5 gap-1.5">
            {visible.map((item, i) => {
              const answered = isAnswered(answers[item.id]);
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrent(i)}
                  className={`h-9 rounded text-sm font-medium ${
                    i === current
                      ? 'bg-blue-600 text-white'
                      : answered
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="bg-white rounded shadow p-4 md:p-6 max-w-3xl">
            {passage && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs text-amber-700 uppercase mb-1">
                  Passage — {passage.name}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {passage.question_text}
                </p>
              </div>
            )}

            <div className="flex justify-between mb-1">
              <p className="text-xs text-gray-400 uppercase">{q.type}</p>
              {!['description', 'paragraph'].includes(q.type) && (
                <p className="text-xs text-gray-400">{q.default_mark} marks</p>
              )}
            </div>
            <h2 className="font-semibold mb-1">{q.name}</h2>
            {/* selectmissing renders its own text with inline dropdowns */}
            {q.type !== 'selectmissing' && (
              <p className="mb-4 whitespace-pre-wrap">{q.question_text}</p>
            )}

            {(q.images || []).map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                alt={img.alt_text || q.name}
                className="mb-4 max-h-72 rounded border"
              />
            ))}

            <AnswerInput
              key={q.id}
              question={q}
              saved={answers[q.id]}
              onChange={(patch) => saveAnswer(q.id, patch)}
              examId={examId}
              attemptId={attemptId}
            />
          </div>

          <div className="flex justify-between max-w-3xl mt-4">
            <button
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}
              className="px-4 py-2 bg-white border rounded disabled:opacity-40"
            >
              Previous
            </button>
            {current < visible.length - 1 ? (
              <button
                onClick={() => setCurrent(current + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
