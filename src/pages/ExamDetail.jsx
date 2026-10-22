import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { detailText } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { apiDate, toApiUtc, toLocalInput } from '../utils/datetime';

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function ExamDetail() {
  const { examId } = useParams();
  const { user } = useAuth();
  const [exam, setExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examBatches, setExamBatches] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [btMap, setBtMap] = useState({}); // batch_id -> [teacher user_ids]
  const [editGraders, setEditGraders] = useState(null); // assignment_id
  const [editSet, setEditSet] = useState(new Set());
  const [fbSummary, setFbSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState('');
  const [checked, setChecked] = useState(new Set());
  const [bulkMarks, setBulkMarks] = useState('');
  const [randCat, setRandCat] = useState('');
  const [randCount, setRandCount] = useState('');
  const [bForm, setBForm] = useState({ batch_id: '', start_time: '', end_time: '', graders: new Set() });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [ex, eq, eb, qs, bs, cs, ts, fb] = await Promise.all([
      api.get(`/exams/${examId}`),
      api.get(`/exams/${examId}/questions`),
      api.get(`/exams/${examId}/batches`),
      api.get('/questions/'),
      api.get('/batches/'),
      api.get('/question-categories/'),
      api.get('/users/', { params: { role: 'teacher' } }),
      api.get(`/exam-feedback/summary/${examId}`),
    ]);
    setExam(ex.data);
    setExamQuestions(eq.data);
    setExamBatches(eb.data);
    setQuestions(qs.data);
    setBatches(bs.data);
    setCategories(cs.data);
    setTeachers(ts.data);
    setFbSummary(fb.data);
  };

  const teacherName = (id) =>
    teachers.find((t) => t.id === id)?.name || `#${id}`;

  // Lazily load a batch's teachers (needed for the grader pickers).
  const ensureBatchTeachers = async (batchId) => {
    const id = Number(batchId);
    if (!id || btMap[id]) return;
    try {
      const { data } = await api.get(`/batch-teachers/batch/${id}`);
      setBtMap((m) => ({ ...m, [id]: data.map((r) => r.user_id) }));
    } catch { /* grader picker stays hidden */ }
  };

  useEffect(() => { load(); }, [examId]);

  const toggleQ = (id) => {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  };

  const addSelected = async () => {
    setError('');
    setMessage('');
    let ok = 0;
    let skipped = 0;
    for (const id of checked) {
      const q = questions.find((x) => x.id === id);
      const marks = bulkMarks !== '' ? Number(bulkMarks) : Number(q.default_mark);
      try {
        await api.post(`/exams/${examId}/questions`, {
          question_id: id,
          marks,
          sort_order: examQuestions.length + ok + 1,
        });
        ok++;
      } catch (err) {
        // 409 = already in this exam (e.g. auto-added as a paragraph
        // child) — it's a skip, not a failure.
        if (err.response?.status === 409) {
          skipped++;
        } else {
          setError(`Question ${id}: ${detailText(err, 'failed')}`);
        }
      }
    }
    setChecked(new Set());
    setBulkMarks('');
    const parts = [];
    if (ok) parts.push(`Added ${ok} question(s)`);
    if (skipped) parts.push(`${skipped} already in exam`);
    if (parts.length) setMessage(parts.join(' · '));
    load();
  };

  const addRandom = async () => {
    setError('');
    setMessage('');
    if (!randCat || !randCount) {
      setError('Choose a category and how many questions to add');
      return;
    }
    try {
      const { data } = await api.post('/questions/random/select', {
        category_id: Number(randCat),
        count: Number(randCount),
      });
      let ok = 0;
      let skipped = 0;
      for (const qid of data.question_ids) {
        const q = questions.find((x) => x.id === qid);
        if (!q || examQuestions.some((x) => x.question_id === qid)) continue;
        try {
          await api.post(`/exams/${examId}/questions`, {
            question_id: qid,
            marks: Number(q.default_mark),
            sort_order: examQuestions.length + ok + 1,
          });
          ok++;
        } catch (err) {
          if (err.response?.status === 409) {
            skipped++;
          } else {
            setError(`Question ${qid}: ${detailText(err, 'failed')}`);
          }
        }
      }
      setMessage(
        `Added ${ok} random question(s)` +
        (skipped ? ` · ${skipped} already in exam` : '')
      );
      setRandCount('');
      load();
    } catch (err) {
      setError(detailText(err, 'Random selection failed'));
    }
  };

  const removeQuestion = async (eqId) => {
    await api.delete(`/exams/${examId}/questions/${eqId}`);
    load();
  };

  const assignBatch = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/exams/${examId}/batches`, {
        batch_id: Number(bForm.batch_id),
        start_time: toApiUtc(bForm.start_time),
        end_time: toApiUtc(bForm.end_time),
        grader_ids: [...bForm.graders],
      });
      setBForm({ batch_id: '', start_time: '', end_time: '', graders: new Set() });
      load();
    } catch (err) {
      setError(detailText(err, 'Failed to assign batch'));
    }
  };

  const removeBatch = async (assignmentId) => {
    await api.delete(`/exams/${examId}/batches/${assignmentId}`);
    load();
  };

  if (!exam) return <p>Loading...</p>;

  // Only the creator (or admin/superadmin) may modify this exam;
  // batch co-teachers get a read-only view.
  const canEdit = user && (
    user.role === 'admin' || user.role === 'superadmin'
    || user.id === exam.created_by
  );

  const assignedQIds = new Set(examQuestions.map((x) => x.question_id));
  const assignedBIds = new Set(examBatches.map((x) => x.batch_id));
  const catName = (id) => categories.find((c) => c.id === id)?.name || '';
  const available = questions.filter(
    (q) => !assignedQIds.has(q.id)
      && (catFilter === '' || q.category_id === Number(catFilter))
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold">{exam.name}</h1>
        {fbSummary?.total_feedback > 0 && (
          <span className="text-sm text-amber-500 font-medium"
            title={`${fbSummary.total_feedback} feedback response(s)`}>
            &#9733; {fbSummary.average_rating}/5 ({fbSummary.total_feedback})
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-2">
        {exam.duration_minutes} min &middot; {exam.total_marks} marks &middot; pass at {exam.passing_percentage ?? exam.passing_marks}%
      </p>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">Questions ({examQuestions.length})</h2>

          {canEdit && (<div className="flex flex-wrap items-center gap-2 mb-2">
            <select value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" step="0.5" min="0.5" placeholder="Marks (blank = default)"
              value={bulkMarks}
              onChange={(e) => setBulkMarks(e.target.value)}
              className="border rounded px-2 py-1.5 w-44 text-sm" />
            <button onClick={addSelected} disabled={checked.size === 0}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-40">
              Add selected ({checked.size})
            </button>
          </div>)}

          {canEdit && (<div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
            <span className="text-gray-500">or add</span>
            <input type="number" min="1" max="100" placeholder="N" value={randCount}
              onChange={(e) => setRandCount(e.target.value)}
              className="border rounded px-2 py-1.5 w-16" />
            <span className="text-gray-500">random questions from</span>
            <select value={randCat} onChange={(e) => setRandCat(e.target.value)}
              className="border rounded px-2 py-1.5 flex-1">
              <option value="">category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={addRandom} disabled={!randCat || !randCount}
              className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-40">
              Add random
            </button>
          </div>)}

          {canEdit && (<div className="max-h-64 overflow-auto border rounded mb-3">
            {available.length > 0 && (
              <label className="flex items-center gap-2 px-3 py-1.5 border-b text-sm font-medium bg-gray-50 sticky top-0">
                <input type="checkbox"
                  checked={available.every((q) => checked.has(q.id))}
                  onChange={() => {
                    const allChecked = available.every((q) => checked.has(q.id));
                    const next = new Set(checked);
                    available.forEach((q) =>
                      allChecked ? next.delete(q.id) : next.add(q.id)
                    );
                    setChecked(next);
                  }} />
                <span>Select all ({available.length})</span>
              </label>
            )}
            {available.map((q) => (
              <label key={q.id} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 text-sm">
                <input type="checkbox"
                  checked={checked.has(q.id)}
                  onChange={() => toggleQ(q.id)} />
                <span className="flex-1 min-w-0">
                  <span className="block">{q.id} {q.name}</span>
                  <span className="block text-xs text-gray-500 truncate"
                    title={q.question_text}>{q.question_text}</span>
                </span>
                <span className="text-gray-400 whitespace-nowrap">{catName(q.category_id)}</span>
                <span className="text-gray-400 whitespace-nowrap">{q.type} &middot; {q.default_mark}m</span>
              </label>
            ))}
            {available.length === 0 && (
              <p className="px-3 py-2 text-gray-400">
                {catFilter ? 'No available questions in this category' : 'All active questions are already in this exam'}
              </p>
            )}
          </div>)}

          <table className="w-full text-sm">
            <tbody>
              {examQuestions.map((eq) => {
                const q = questions.find((x) => x.id === eq.question_id);
                return (
                  <tr key={eq.id} className="border-b">
                    <td className="py-1.5 max-w-64">
                      <span className="block">{eq.question_id} {q?.name}</span>
                      <span className="block text-xs text-gray-500 truncate"
                        title={q?.question_text}>{q?.question_text}</span>
                    </td>
                    <td className="text-gray-500">{q?.type}</td>
                    <td>{eq.marks} marks</td>
                    <td>
                      {canEdit && (
                        <button onClick={() => removeQuestion(eq.id)}
                          className="text-red-600 hover:underline">Remove</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">Assigned Batches ({examBatches.length})</h2>
          {canEdit && (<form onSubmit={assignBatch} className="mb-3">
            <div className="flex gap-2 mb-2">
              <select required value={bForm.batch_id}
                onChange={(e) => {
                  setBForm({ ...bForm, batch_id: e.target.value, graders: new Set() });
                  ensureBatchTeachers(e.target.value);
                }}
                className="border rounded px-2 py-1.5 flex-1 text-sm">
                <option value="">Select batch...</option>
                {batches.filter((b) => !assignedBIds.has(b.id)).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            {(btMap[bForm.batch_id]?.length > 0) && (
              <div className="border rounded p-2 mb-2 text-sm">
                <p className="text-xs text-gray-500 mb-1">
                  Graders — tick to restrict grading to selected teachers
                  (none ticked = all teachers of the batch)
                </p>
                {btMap[bForm.batch_id].map((tid) => (
                  <label key={tid} className="flex items-center gap-2 py-0.5">
                    <input type="checkbox" checked={bForm.graders.has(tid)}
                      onChange={() => {
                        const next = new Set(bForm.graders);
                        next.has(tid) ? next.delete(tid) : next.add(tid);
                        setBForm({ ...bForm, graders: next });
                      }} />
                    {teacherName(tid)}
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input type="datetime-local"
                min={exam.start_time ? toLocalInput(exam.start_time) : nowLocal()}
                max={exam.end_time ? toLocalInput(exam.end_time) : undefined}
                value={bForm.start_time}
                onChange={(e) => setBForm({ ...bForm, start_time: e.target.value })}
                className="border rounded px-2 py-1.5 flex-1 min-w-40 text-sm" />
              <input type="datetime-local"
                min={bForm.start_time || (exam.start_time ? toLocalInput(exam.start_time) : nowLocal())}
                max={exam.end_time ? toLocalInput(exam.end_time) : undefined}
                value={bForm.end_time}
                onChange={(e) => setBForm({ ...bForm, end_time: e.target.value })}
                className="border rounded px-2 py-1.5 flex-1 min-w-40 text-sm" />
              <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Assign</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Batch times must be inside the exam window
              {exam.start_time || exam.end_time
                ? ` (${exam.start_time ? `opens ${apiDate(exam.start_time).toLocaleString()}` : 'always open'} – ${exam.end_time ? `closes ${apiDate(exam.end_time).toLocaleString()}` : 'never closes'}).`
                : '. Leave times empty to use the exam schedule.'}
            </p>
          </form>)}
          <table className="w-full text-sm">
            <tbody>
              {examBatches.map((eb) => {
                const b = batches.find((x) => x.id === eb.batch_id);
                return (
                  <Fragment key={eb.id}>
                    <tr className="border-b">
                      <td className="py-1.5">{b?.name || `Batch ${eb.batch_id}`}</td>
                      <td className="text-xs text-gray-500">
                        {eb.grader_ids?.length
                          ? `Graders: ${eb.grader_ids.map(teacherName).join(', ')}`
                          : 'Graders: all batch teachers'}
                      </td>
                      <td className="whitespace-nowrap">
                        {canEdit && (<>
                          <button onClick={async () => {
                            await ensureBatchTeachers(eb.batch_id);
                            setEditSet(new Set(eb.grader_ids || []));
                            setEditGraders(editGraders === eb.id ? null : eb.id);
                          }}
                            className="text-blue-600 hover:underline mr-2">Graders</button>
                          <button onClick={() => removeBatch(eb.id)}
                            className="text-red-600 hover:underline">Remove</button>
                        </>)}
                      </td>
                    </tr>
                    {canEdit && editGraders === eb.id && (
                      <tr className="border-b bg-gray-50">
                        <td colSpan="3" className="py-2 px-1">
                          {(btMap[eb.batch_id] || []).map((tid) => (
                            <label key={tid} className="flex items-center gap-2 py-0.5">
                              <input type="checkbox" checked={editSet.has(tid)}
                                onChange={() => {
                                  const next = new Set(editSet);
                                  next.has(tid) ? next.delete(tid) : next.add(tid);
                                  setEditSet(next);
                                }} />
                              {teacherName(tid)}
                            </label>
                          ))}
                          <div className="flex gap-2 mt-2">
                            <button onClick={async () => {
                              try {
                                await api.put(
                                  `/exams/${examId}/batches/${eb.id}/graders`,
                                  [...editSet]
                                );
                                setEditGraders(null);
                                load();
                              } catch (err) {
                                setError(detailText(err, 'Failed to update graders'));
                              }
                            }}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Save graders</button>
                            <button onClick={() => setEditGraders(null)}
                              className="text-gray-500 text-xs">Cancel</button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            No ticks = every teacher of the batch can grade.
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
