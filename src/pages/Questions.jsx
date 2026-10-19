import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

const TYPES = [
  'multichoice', 'multiselect', 'truefalse', 'shortanswer',
  'numerical', 'essay', 'match', 'multianswer', 'coding', 'description',
  'image', 'paragraph', 'selectmissing', 'ordering',
  'calculated', 'calculatedsimple', 'calculatedmulti',
];

const OPTION_TYPES = ['multichoice', 'multiselect', 'image'];

const CALC_TYPES = ['calculated', 'calculatedsimple', 'calculatedmulti'];

// Types that are informational text only — no answer, no marks.
const INFO_TYPES = ['description', 'paragraph'];

const EMPTY_Q = {
  category_id: '',
  type: 'multichoice',
  name: '',
  question_text: '',
  default_mark: 1,
};

export default function Questions() {
  const { user } = useAuth();
  const isAdminUser = ['admin', 'superadmin'].includes(user?.role);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_Q);
  const [options, setOptions] = useState([{ option_text: '', image_file: null, image_preview: '', is_correct: false, fraction: 0, sort_order: 0 }]);
  const [imageQ, setImageQ] = useState({ file: null, preview: '', alt_text: '' });
  const [hasQImage, setHasQImage] = useState(true);
  const [tfAnswer, setTfAnswer] = useState('true');
  const [shortAnswer, setShortAnswer] = useState({ answer_text: '', case_sensitive: false });
  const [numerical, setNumerical] = useState({ answer_value: '', tolerance: 0 });
  const [matchItems, setMatchItems] = useState([{ sub_question: '', sub_answer: '', sort_order: 0 }]);
  const [multiAnswer, setMultiAnswer] = useState('');
  const [essay, setEssay] = useState({ max_words: '' });
  const [calc, setCalc] = useState({ formula: '', tolerance: 0, units: '' });
  const [datasets, setDatasets] = useState([]);
  const [paraLinks, setParaLinks] = useState([]);
  const [gapBlanks, setGapBlanks] = useState([
    { blank_no: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] },
  ]);
  const [orderItems, setOrderItems] = useState([{ text: '' }, { text: '' }]);
  const [codingCfg, setCodingCfg] = useState({
    language: 'python', starter_code: '', time_limit: 5,
  });
  const [testCases, setTestCases] = useState([
    { input_text: '', expected_output: '', marks: 1, is_hidden: false },
  ]);
  // Edit mode: snapshot of server rows (for id-based diffing) and the
  // question's existing images.
  const [origSnap, setOrigSnap] = useState({
    options: [], match: [], gap: [], order: [], cases: [], images: [],
  });
  const [editImages, setEditImages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [qFilter, setQFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(null);

  const load = async () => {
    const [q, c] = await Promise.all([
      api.get('/questions/'),
      api.get('/question-categories/'),
    ]);
    setQuestions(q.data);
    setCategories(c.data);
  };

  useEffect(() => { load(); }, []);

  const uploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setError('');
    setBulkResult(null);
    setBulkLoading(true);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const { data } = await api.post('/questions/bulk-upload', fd, {
        onUploadProgress: (e2) => {
          setUploadPct(
            e2.total ? Math.round((e2.loaded / e2.total) * 100) : null
          );
        },
      });
      setBulkResult(data);
      if (data.created_count > 0) load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Bulk upload failed');
    } finally {
      setBulkLoading(false);
      setUploadPct(null);
    }
  };

  const downloadSampleCsv = () => {
    // Build rows from objects so every value lands in its own column.
    const COLS = [
      'name', 'type', 'category', 'question_text', 'default_mark',
      'general_feedback', 'options', 'correct_options', 'answer_text',
      'case_sensitive', 'true_false', 'numerical_answer', 'tolerance',
      'match_pairs', 'ordering_items', 'gaps', 'content', 'max_words',
      'formula', 'units', 'datasets', 'language', 'starter_code',
      'time_limit', 'test_cases', 'children', 'image_url', 'alt_text',
    ];
    const DATA = [
      { name: 'Capital MCQ', type: 'multichoice', category: 'General Knowledge', question_text: 'What is the capital of France?', default_mark: 1, options: 'Paris|London|Rome|Madrid', correct_options: '1' },
      { name: 'Planets MS', type: 'multiselect', category: 'General Knowledge', question_text: 'Which are planets?', default_mark: 2, options: 'Mars|Venus|Sun|Moon', correct_options: '1|2' },
      { name: 'Sky TF', type: 'truefalse', category: 'General Knowledge', question_text: 'The sky is blue', default_mark: 1, true_false: 'true' },
      { name: 'Mars SA', type: 'shortanswer', category: 'General Knowledge', question_text: 'Red planet name?', default_mark: 1, answer_text: 'Mars' },
      { name: 'PI Num', type: 'numerical', category: 'General Knowledge', question_text: 'Value of pi (2 dp)?', default_mark: 1, numerical_answer: '3.14', tolerance: '0.01' },
      { name: 'Capitals Match', type: 'match', category: 'General Knowledge', question_text: 'Match country to capital', default_mark: 2, match_pairs: 'France=Paris|Italy=Rome' },
      { name: 'Alphabet Order', type: 'ordering', category: 'General Knowledge', question_text: 'Order the letters', default_mark: 1, ordering_items: 'a|b|c' },
      { name: 'Fill Blanks', type: 'selectmissing', category: 'General Knowledge', question_text: 'The [[1]] is [[2]]', default_mark: 1, gaps: '1:*sun|moon;2:hot|*blue' },
      { name: 'Short Essay', type: 'essay', category: 'General Knowledge', question_text: 'Describe photosynthesis', default_mark: 5, max_words: '150' },
      { name: 'Reading Note', type: 'description', category: 'General Knowledge', question_text: 'Read this before the next section', default_mark: 0, content: 'Section 2 covers world capitals.' },
      { name: 'Add Two Numbers', type: 'calculated', category: 'General Knowledge', question_text: 'What is {a} + {b}?', default_mark: 2, formula: '{a}+{b}', tolerance: '0.1', datasets: 'a=1-10|b=5-20' },
      { name: 'Hello Program', type: 'coding', category: 'General Knowledge', question_text: 'Read a name and print Hello, name!', default_mark: 5, language: 'python', starter_code: 'name = input()', time_limit: '5', test_cases: 'Sam=>Hello, Sam!@1|!Al=>Hello, Al!@2' },
      { name: 'Geography Set', type: 'paragraph', category: 'General Knowledge', question_text: 'Answer based on the passage', default_mark: 0, content: 'France is a country in Europe.', children: 'Capital MCQ|Sky TF' },
      { name: 'Flag MCQ', type: 'image', category: 'General Knowledge', question_text: 'Which flag is France?', default_mark: 1, options: 'A|B|C', correct_options: '1', image_url: 'https://example.com/flags.png', alt_text: 'flag choices' },
    ];
    const csvCell = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      COLS.join(','),
      ...DATA.map((d) => COLS.map((c) => csvCell(d[c])).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([rows.join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.post('/question-categories/', { name: newCategory.trim() });
    setNewCategory('');
    load();
  };

  const updateOption = (i, patch) => {
    setOptions(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };

  const updateMatch = (i, patch) => {
    setMatchItems(matchItems.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  const blankOption = (sort_order = 0) => ({
    option_text: '', image_file: null, image_url: null, image_preview: '',
    is_correct: false, fraction: 0, sort_order,
  });

  const resetTypeStates = () => {
    setOptions([blankOption()]);
    setImageQ({ file: null, preview: '', alt_text: '' });
    setHasQImage(true);
    setEditImages([]);
    setOrigSnap({ options: [], match: [], gap: [], order: [], cases: [], images: [] });
    setTfAnswer('true');
    setShortAnswer({ answer_text: '', case_sensitive: false });
    setNumerical({ answer_value: '', tolerance: 0 });
    setMatchItems([{ sub_question: '', sub_answer: '', sort_order: 0 }]);
    setMultiAnswer('');
    setEssay({ max_words: '' });
    setCalc({ formula: '', tolerance: 0, units: '' });
    setDatasets([]);
    setParaLinks([]);
    setGapBlanks([
      { blank_no: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] },
    ]);
    setOrderItems([{ text: '' }, { text: '' }]);
    setCodingCfg({ language: 'python', starter_code: '', time_limit: 5 });
    setTestCases([{ input_text: '', expected_output: '', marks: 1, is_hidden: false }]);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY_Q);
    resetTypeStates();
  };

  // GET that resolves to null on failure (missing config is normal).
  const tryGet = (path) =>
    api.get(path).then((r) => r.data).catch(() => null);

  const startEdit = async (q) => {
    setEditId(q.id);
    setError('');
    setMessage('');
    setForm({
      category_id: q.category_id,
      type: q.type,
      name: q.name,
      question_text: q.question_text,
      default_mark: q.default_mark,
    });
    resetTypeStates();
    const snap = { options: [], match: [], gap: [], order: [], cases: [], images: [] };

    if (OPTION_TYPES.includes(q.type)) {
      const data = await tryGet(`/questions/${q.id}/options`);
      if (data?.length) {
        snap.options = data;
        setOptions(data.map((o, i) => ({
          id: o.id,
          option_text: o.option_text || '',
          image_url: o.image_url,
          image_file: null,
          image_preview: o.image_url || '',
          is_correct: o.is_correct,
          fraction: Number(o.fraction),
          sort_order: o.sort_order ?? i,
        })));
      }
    }
    if (q.type === 'image') {
      const data = await tryGet(`/questions/${q.id}/images`);
      if (data) {
        snap.images = data;
        setEditImages(data);
        setHasQImage(data.length > 0);
      }
    }
    if (q.type === 'truefalse') {
      const d = await tryGet(`/questions/${q.id}/truefalse`);
      if (d) setTfAnswer(d.true_answer ? 'true' : 'false');
    }
    if (q.type === 'shortanswer') {
      const d = await tryGet(`/questions/${q.id}/shortanswer`);
      if (d) setShortAnswer({ answer_text: d.answer_text, case_sensitive: !!d.case_sensitive });
    }
    if (q.type === 'numerical') {
      const d = await tryGet(`/questions/${q.id}/numerical`);
      if (d) setNumerical({ answer_value: d.answer_value, tolerance: d.tolerance });
    }
    if (q.type === 'match') {
      const d = await tryGet(`/questions/${q.id}/match`);
      if (d?.length) {
        snap.match = d;
        setMatchItems(d.map((m) => ({
          id: m.id,
          sub_question: m.sub_question,
          sub_answer: m.sub_answer,
          sort_order: m.sort_order,
        })));
      }
    }
    if (q.type === 'essay') {
      const d = await tryGet(`/questions/${q.id}/essay`);
      if (d) setEssay({ max_words: d.max_words ?? '' });
    }
    if (q.type === 'multianswer') {
      const d = await tryGet(`/questions/${q.id}/multianswer`);
      if (d) setMultiAnswer(d.answer_text);
    }
    if (CALC_TYPES.includes(q.type)) {
      const d = await tryGet(`/questions/${q.id}/calculated-config`);
      if (d) {
        setCalc({ formula: d.formula, tolerance: d.tolerance, units: d.units || '' });
        setDatasets(d.datasets || []);
      }
    }
    if (q.type === 'paragraph') {
      const d = await tryGet(`/paragraphs/question/${q.id}`);
      setParaLinks(d?.question_ids || []);
    }
    if (q.type === 'selectmissing') {
      const d = await tryGet(`/questions/${q.id}/gapselect`);
      if (d?.length) {
        snap.gap = d;
        const grouped = {};
        d.forEach((o) => {
          (grouped[o.blank_no] = grouped[o.blank_no] || []).push(o);
        });
        setGapBlanks(Object.keys(grouped).map(Number).sort((a, b) => a - b)
          .map((bn) => ({
            blank_no: bn,
            options: grouped[bn].map((o) => ({
              id: o.id, text: o.option_text, is_correct: o.is_correct,
            })),
          })));
      }
    }
    if (q.type === 'ordering') {
      const d = await tryGet(`/questions/${q.id}/ordering`);
      if (d?.length) {
        snap.order = d;
        setOrderItems(d.map((o) => ({ id: o.id, text: o.item_text })));
      }
    }
    if (q.type === 'coding') {
      const cfg = await tryGet(`/questions/${q.id}/coding-config`);
      if (cfg) {
        setCodingCfg({
          language: cfg.language,
          starter_code: cfg.starter_code || '',
          time_limit: cfg.time_limit,
        });
      }
      const cases = await tryGet(`/questions/${q.id}/coding-config/test-cases`);
      if (cases?.length) {
        snap.cases = cases;
        setTestCases(cases.map((c) => ({
          id: c.id,
          input_text: c.input_text || '',
          expected_output: c.expected_output,
          marks: c.marks,
          is_hidden: c.is_hidden,
        })));
      }
    }
    setOrigSnap(snap);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // PUT a singleton config; POST it when the question doesn't have one yet.
  const putOrPost = async (path, payload) => {
    try {
      await api.put(path, payload);
    } catch (err) {
      if (err.response?.status !== 404) throw err;
      await api.post(path, payload);
    }
  };

  // Diff list rows by id against the server snapshot: rows vanished from
  // state are deleted, rows with an id are PUT, new rows are POSTed.
  const syncRows = async (base, orig, current, toPayload) => {
    const kept = new Set(current.filter((r) => r.id).map((r) => r.id));
    for (const r of orig) {
      if (!kept.has(r.id)) await api.delete(`${base}/${r.id}`);
    }
    for (const r of current) {
      if (r.id) await api.put(`${base}/${r.id}`, toPayload(r));
      else await api.post(base, toPayload(r));
    }
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/uploads', fd);
    return data.image_url;
  };

  // Persist the type-specific config while editing an existing question.
  const saveTypeConfig = async (qid) => {
    const t = form.type;
    const base = `/questions/${qid}`;

    if (OPTION_TYPES.includes(t)) {
      const prepared = [];
      for (const [i, o] of options.entries()) {
        if (!(o.option_text.trim() || o.image_file || o.image_url)) continue;
        let image_url = o.image_url || null;
        if (o.image_file) image_url = await uploadFile(o.image_file);
        prepared.push({ ...o, image_url, sort_order: i });
      }
      await syncRows(`${base}/options`, origSnap.options, prepared, (o) => ({
        option_text: o.option_text,
        ...(o.image_url ? { image_url: o.image_url } : {}),
        is_correct: o.is_correct,
        fraction: o.fraction,
        sort_order: o.sort_order,
      }));
    } else if (t === 'truefalse') {
      await putOrPost(`${base}/truefalse`, { true_answer: tfAnswer === 'true' });
    } else if (t === 'shortanswer') {
      await putOrPost(`${base}/shortanswer`, shortAnswer);
    } else if (t === 'numerical') {
      await putOrPost(`${base}/numerical`, {
        answer_value: Number(numerical.answer_value),
        tolerance: Number(numerical.tolerance),
      });
    } else if (t === 'match') {
      const cur = matchItems.filter(
        (m) => m.sub_question.trim() && m.sub_answer.trim()
      );
      await syncRows(`${base}/match`, origSnap.match, cur, (m) => ({
        sub_question: m.sub_question,
        sub_answer: m.sub_answer,
        sort_order: cur.indexOf(m),
      }));
    } else if (t === 'essay') {
      await putOrPost(`${base}/essay`, {
        max_words: essay.max_words ? Number(essay.max_words) : null,
      });
    } else if (t === 'multianswer') {
      await putOrPost(`${base}/multianswer`, {
        answer_text: multiAnswer,
        answer_format: 'text',
      });
    } else if (CALC_TYPES.includes(t)) {
      await putOrPost(`${base}/calculated-config`, {
        formula: calc.formula,
        tolerance: Number(calc.tolerance) || 0,
        units: calc.units.trim() || null,
        datasets: datasets
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name.trim().replace(/[{}]/g, ''),
            min_value: Number(d.min_value),
            max_value: Number(d.max_value),
            decimals: Number(d.decimals) || 0,
          })),
      });
    } else if (t === 'selectmissing') {
      const items = gapBlanks.flatMap((b) =>
        b.options
          .filter((o) => o.text.trim())
          .map((o, i) => ({
            id: o.id,
            blank_no: b.blank_no,
            option_text: o.text.trim(),
            is_correct: o.is_correct,
            sort_order: i,
          }))
      );
      await syncRows(`${base}/gapselect`, origSnap.gap, items, (o) => ({
        blank_no: o.blank_no,
        option_text: o.option_text,
        is_correct: o.is_correct,
        sort_order: o.sort_order,
      }));
    } else if (t === 'ordering') {
      const cur = orderItems.filter((o) => o.text.trim());
      await syncRows(`${base}/ordering`, origSnap.order, cur, (o) => ({
        item_text: o.text.trim(),
        position: cur.indexOf(o) + 1,
      }));
    } else if (t === 'coding') {
      await putOrPost(`${base}/coding-config`, {
        language: codingCfg.language,
        starter_code: codingCfg.starter_code || null,
        time_limit: Number(codingCfg.time_limit) || 5,
      });
      const cur = testCases.filter((tc) => tc.expected_output.trim());
      await syncRows(
        `${base}/coding-config/test-cases`, origSnap.cases, cur, (tc) => ({
          input_text: tc.input_text || null,
          expected_output: tc.expected_output,
          is_hidden: !!tc.is_hidden,
          marks: Number(tc.marks) || 1,
          sort_order: cur.indexOf(tc),
        })
      );
    }

    if (t === 'image') {
      await syncRows(`${base}/images`, origSnap.images, editImages, (img) => ({
        image_url: img.image_url,
        alt_text: img.alt_text || null,
        position: img.position ?? 0,
      }));
      if (hasQImage && imageQ.file) {
        const url = await uploadFile(imageQ.file);
        await api.post(`${base}/images`, {
          image_url: url,
          alt_text: imageQ.alt_text.trim() || null,
          position: editImages.length,
        });
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate type-specific config for both create and update.
    if (OPTION_TYPES.includes(form.type)) {
      const filled = options.filter(
        (o) => o.option_text.trim() || o.image_file || o.image_url
      );
      const correctCount = filled.filter((o) => o.is_correct).length;
      if (filled.length < 1) {
        setError('Add at least one option (text or image)');
        return;
      }
      if ((form.type === 'multichoice' || form.type === 'image') && correctCount !== 1) {
        setError('Check exactly one option as the correct answer');
        return;
      }
      if (form.type === 'multiselect' && correctCount < 1) {
        setError('Check at least one option as correct');
        return;
      }
    }

    if (form.type === 'paragraph' && paraLinks.length === 0) {
      setError('Select at least one question that belongs to this paragraph');
      return;
    }

    if (form.type === 'selectmissing') {
      const used = new Set(
        [...form.question_text.matchAll(/\[\[(\d+)\]\]/g)]
          .map((m) => Number(m[1]))
      );
      if (used.size === 0) {
        setError('Add at least one [[n]] placeholder in the question text');
        return;
      }
      for (const bn of used) {
        const blank = gapBlanks.find((b) => b.blank_no === bn);
        if (!blank) {
          setError(`No options defined for blank [[${bn}]]`);
          return;
        }
        const opts = blank.options.filter((o) => o.text.trim());
        if (opts.length < 2) {
          setError(`Blank [[${bn}]] needs at least 2 options`);
          return;
        }
        if (opts.filter((o) => o.is_correct).length !== 1) {
          setError(`Mark exactly one correct option for blank [[${bn}]]`);
          return;
        }
      }
    }

    if (form.type === 'ordering'
      && orderItems.filter((o) => o.text.trim()).length < 2) {
      setError('Add at least 2 items to order');
      return;
    }

    // Update: save base fields plus the type-specific config.
    if (editId) {
      try {
        await api.put(`/questions/${editId}`, {
          category_id: Number(form.category_id),
          name: form.name,
          question_text: form.question_text,
          default_mark: INFO_TYPES.includes(form.type) ? 0 : Number(form.default_mark),
        });
        if (form.type === 'paragraph') {
          await api.post(`/paragraphs/question/${editId}`, {
            question_ids: paraLinks,
          });
        }
        await saveTypeConfig(editId);
        setMessage(`Question ${editId} updated`);
        cancelEdit();
        load();
      } catch (err) {
        setError(
          typeof err.response?.data?.detail === 'string'
            ? err.response.data.detail
            : 'Failed to update question'
        );
      }
      return;
    }

    let createdId = null;
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        // Info items are informational text, not scored questions.
        default_mark: INFO_TYPES.includes(form.type) ? 0 : Number(form.default_mark),
      };
      const { data: question } = await api.post('/questions/', payload);
      createdId = question.id;

      if (OPTION_TYPES.includes(form.type)) {
        // Upload option image files first, then send URLs with the payload.
        const preparedOptions = [];
        for (const o of options) {
          let image_url = null;
          if (o.image_file) {
            const fd = new FormData();
            fd.append('file', o.image_file);
            const { data: up } = await api.post('/uploads', fd);
            image_url = up.image_url;
          }
          if (o.option_text.trim() || image_url) {
            preparedOptions.push({
              option_text: o.option_text,
              image_url,
              is_correct: o.is_correct,
              fraction: o.fraction,
              sort_order: o.sort_order,
            });
          }
        }
        await api.post(`/questions/${question.id}/options/bulk`, {
          options: preparedOptions,
        });
      } else if (form.type === 'truefalse') {
        await api.post(`/questions/${question.id}/truefalse`, {
          true_answer: tfAnswer === 'true',
        });
      } else if (form.type === 'shortanswer') {
        await api.post(`/questions/${question.id}/shortanswer`, shortAnswer);
      } else if (form.type === 'numerical') {
        await api.post(`/questions/${question.id}/numerical`, {
          answer_value: Number(numerical.answer_value),
          tolerance: Number(numerical.tolerance),
        });
      } else if (form.type === 'match') {
        await api.post(`/questions/${question.id}/match/bulk`, {
          items: matchItems.filter((m) => m.sub_question.trim() && m.sub_answer.trim()),
        });
      } else if (form.type === 'essay') {
        await api.post(`/questions/${question.id}/essay`, {
          max_words: essay.max_words ? Number(essay.max_words) : null,
        });
      } else if (form.type === 'multianswer') {
        await api.post(`/questions/${question.id}/multianswer`, {
          answer_text: multiAnswer,
          answer_format: 'text',
        });
      } else if (CALC_TYPES.includes(form.type)) {
        await api.post(`/questions/${question.id}/calculated-config`, {
          formula: calc.formula,
          tolerance: Number(calc.tolerance) || 0,
          units: calc.units.trim() || null,
          datasets: datasets
            .filter((d) => d.name.trim())
            .map((d) => ({
              name: d.name.trim().replace(/[{}]/g, ''),
              min_value: Number(d.min_value),
              max_value: Number(d.max_value),
              decimals: Number(d.decimals) || 0,
            })),
        });
      } else if (form.type === 'paragraph') {
        await api.post(`/paragraphs/question/${question.id}`, {
          question_ids: paraLinks,
        });
      } else if (form.type === 'selectmissing') {
        await api.post(`/questions/${question.id}/gapselect/bulk`, {
          items: gapBlanks.flatMap((b) =>
            b.options
              .filter((o) => o.text.trim())
              .map((o, i) => ({
                blank_no: b.blank_no,
                option_text: o.text.trim(),
                is_correct: o.is_correct,
                sort_order: i,
              }))
          ),
        });
      } else if (form.type === 'ordering') {
        // The order entered here IS the correct sequence (1-based).
        await api.post(`/questions/${question.id}/ordering/bulk`, {
          items: orderItems
            .filter((o) => o.text.trim())
            .map((o, i) => ({ item_text: o.text.trim(), position: i + 1 })),
        });
      } else if (form.type === 'coding') {
        await api.post(`/questions/${question.id}/coding-config`, {
          language: codingCfg.language,
          starter_code: codingCfg.starter_code || null,
          time_limit: Number(codingCfg.time_limit) || 5,
          memory_limit: 256,
          execution_limit: 10,
        });
        const cases = testCases.filter((tc) => tc.expected_output.trim());
        for (const [i, tc] of cases.entries()) {
          await api.post(
            `/questions/${question.id}/coding-config/test-cases`,
            {
              input_text: tc.input_text || null,
              expected_output: tc.expected_output,
              is_hidden: !!tc.is_hidden,
              marks: Number(tc.marks) || 1,
              sort_order: i,
            }
          );
        }
      }

      if (form.type === 'image' && hasQImage && imageQ.file) {
        const fd = new FormData();
        fd.append('file', imageQ.file);
        const { data: up } = await api.post('/uploads', fd);
        await api.post(`/questions/${question.id}/images`, {
          image_url: up.image_url,
          alt_text: imageQ.alt_text.trim() || null,
          position: 0,
        });
      }

      setMessage(`Question ${question.id} created`);
      // Keep category and type so adding multiple questions to the same
      // category doesn't require re-selecting them every time.
      setForm({ ...EMPTY_Q, category_id: form.category_id, type: form.type });
      resetTypeStates();
      load();
    } catch (err) {
      // A step after question creation failed — remove the half-created
      // question so retrying doesn't leave an optionless duplicate.
      if (createdId) {
        try {
          await api.delete(`/questions/${createdId}`);
        } catch { /* ignore cleanup failure */ }
      }
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to create question'
      );
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await api.delete(`/questions/${id}`);
    load();
  };

  const filteredQuestions = questions.filter(
    (q) =>
      (catFilter === '' || q.category_id === Number(catFilter)) &&
      (typeFilter === '' || q.type === typeFilter) &&
      (qFilter === '' ||
        q.name.toLowerCase().includes(qFilter.toLowerCase()) ||
        q.question_text.toLowerCase().includes(qFilter.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Question Bank</h1>
        <button
          onClick={() => { setShowBulk(!showBulk); setBulkResult(null); }}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm"
        >
          {showBulk ? 'Close Bulk Upload' : 'Bulk Upload'}
        </button>
      </div>

      {showBulk && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <form onSubmit={uploadCsv} className="flex flex-wrap items-center gap-3">
            <input required type="file" accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="border rounded px-3 py-2 text-sm" />
            <button disabled={bulkLoading || !csvFile}
              className="bg-emerald-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
              {bulkLoading
                ? `Uploading${uploadPct != null ? ` ${uploadPct}%` : '...'}`
                : 'Upload & Create'}
            </button>
            <button type="button" onClick={downloadSampleCsv}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded text-sm hover:bg-blue-50">
              Sample CSV
            </button>
          </form>
          {bulkLoading && (
            <div className="mt-2 h-2 w-full max-w-md bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${uploadPct ?? 100}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Required columns: <code className="bg-gray-100 px-1 rounded">name,type,category,question_text</code>
            {' '}&mdash; <code className="bg-gray-100 px-1 rounded">category</code> is the category
            <strong>name</strong> (created automatically if missing), not an id.
            Optional: <code className="bg-gray-100 px-1 rounded">default_mark,general_feedback</code> and
            per-type columns: <code className="bg-gray-100 px-1 rounded">options</code> (A|B|C),
            {' '}<code className="bg-gray-100 px-1 rounded">correct_options</code> (1 or 1|3),
            {' '}<code className="bg-gray-100 px-1 rounded">answer_text,case_sensitive,true_false,numerical_answer,tolerance,match_pairs</code> (l=r|l2=r2),
            {' '}<code className="bg-gray-100 px-1 rounded">ordering_items</code> (a|b|c in correct order),
            {' '}<code className="bg-gray-100 px-1 rounded">gaps</code> (1:*correct|wrong;2:wrong|*correct),
            {' '}<code className="bg-gray-100 px-1 rounded">max_words</code> (essay),
            {' '}<code className="bg-gray-100 px-1 rounded">content</code> (description/paragraph),
            {' '}<code className="bg-gray-100 px-1 rounded">formula,units,datasets</code> (calculated: a=1-10@2|b=5-20),
            {' '}<code className="bg-gray-100 px-1 rounded">language,starter_code,time_limit,test_cases</code> (coding: in=&gt;out@marks, ! = hidden),
            {' '}<code className="bg-gray-100 px-1 rounded">children</code> (paragraph: optional question names or ids, | separated — leave blank to link later),
            {' '}<code className="bg-gray-100 px-1 rounded">image_url,alt_text</code> (image).
            {' '}All types are supported — download the Sample CSV for a working example of each.
          </p>

          {bulkResult && (
            <div className="mt-3 text-sm">
              <p>
                <span className="text-green-700 font-medium">{bulkResult.created_count} created</span>
                {' \u00b7 '}
                <span className="text-red-600">{bulkResult.error_count} errors</span>
              </p>
              {bulkResult.created_categories?.length > 0 && (
                <p className="mt-1 text-xs text-gray-600">
                  New categories created: {bulkResult.created_categories.join(', ')}
                </p>
              )}
              {bulkResult.errors.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-0.5 text-xs">
                  {bulkResult.errors.map((e2) => (
                    <li key={e2.row} className="text-red-600">
                      Row {e2.row}: {e2.name} &mdash; {e2.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-2 mb-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">New category name</label>
            <input value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm" />
          </div>
          <button onClick={addCategory}
            className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Add Category</button>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Category</label>
              <select required value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="border rounded px-3 py-2 w-full">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Question type</label>
              <select value={form.type} disabled={!!editId}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border rounded px-3 py-2 w-full disabled:bg-gray-100 disabled:text-gray-400">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Question name</label>
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Marks{form.type === 'description' && ' (not scored)'}
              </label>
              <input required type="number" step="0.5" min="0.5"
                value={form.type === 'description' ? 0 : form.default_mark}
                disabled={form.type === 'description'}
                onChange={(e) => setForm({ ...form, default_mark: e.target.value })}
                className="border rounded px-3 py-2 w-full disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
          </div>

          <label className="text-xs text-gray-500 block mb-1">Question text</label>
          <textarea required value={form.question_text}
            onChange={(e) => setForm({ ...form, question_text: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-3" rows={2} />

          {OPTION_TYPES.includes(form.type) && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Options</p>
              {options.map((o, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input value={o.option_text} aria-label={`Option ${i + 1}`}
                    placeholder={form.type === 'image' ? 'Option text (optional if image given)' : ''}
                    onChange={(e) => updateOption(i, { option_text: e.target.value })}
                    className="border rounded px-3 py-1.5 flex-1" />
                  {form.type === 'image' && (
                    <div className="flex items-center gap-1 flex-1">
                      {o.image_preview && (
                        <img src={fileUrl(o.image_preview)} alt=""
                          className="h-10 w-10 object-contain rounded border" />
                      )}
                      <input type="file" accept="image/*" aria-label={`Option ${i + 1} image`}
                        onChange={(e) => {
                          const f = e.target.files[0] || null;
                          updateOption(i, {
                            image_file: f,
                            image_preview: f ? URL.createObjectURL(f) : '',
                          });
                        }}
                        className="text-xs w-40" />
                    </div>
                  )}
                  <label className="text-sm flex items-center gap-1">
                    <input type="checkbox" checked={o.is_correct}
                      onChange={(e) => updateOption(i, { is_correct: e.target.checked, fraction: e.target.checked ? 100 : 0 })} />
                    Correct
                  </label>
                  <input type="number" title="Fraction %" value={o.fraction}
                    onChange={(e) => updateOption(i, { fraction: Number(e.target.value) })}
                    className="border rounded px-2 py-1.5 w-20" />
                  {options.length > 1 && (
                    <button type="button" onClick={() => setOptions(options.filter((_, x) => x !== i))}
                      className="text-red-600">x</button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => setOptions([...options, { option_text: '', image_file: null, image_preview: '', is_correct: false, fraction: 0, sort_order: options.length }])}
                className="text-sm text-blue-600 hover:underline">+ Add option</button>
            </div>
          )}

          {form.type === 'image' && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={hasQImage}
                  onChange={(e) => setHasQImage(e.target.checked)} />
                Question includes an image
                <span className="text-xs text-gray-400">(uncheck for text question with image options)</span>
              </label>
              {hasQImage && (
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">
                      {editImages.length ? 'Add question image' : 'Question image *'}
                    </label>
                    {editImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editImages.map((img) => (
                          <div key={img.id} className="relative border rounded p-1">
                            <img src={fileUrl(img.image_url)} alt={img.alt_text || ''}
                              className="h-16 object-contain" />
                            <button type="button" title="Remove image"
                              onClick={() => setEditImages(editImages.filter((x) => x.id !== img.id))}
                              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none shadow">
                              &#10005;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input required={editImages.length === 0} type="file" accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files[0] || null;
                          setImageQ({
                            ...imageQ,
                            file: f,
                            preview: f ? URL.createObjectURL(f) : '',
                          });
                        }}
                        className="text-sm" />
                      {imageQ.preview && (
                        <img src={imageQ.preview} alt=""
                          className="h-14 rounded border object-contain" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Alt text (optional)</label>
                    <input value={imageQ.alt_text}
                      onChange={(e) => setImageQ({ ...imageQ, alt_text: e.target.value })}
                      className="border rounded px-3 py-1.5" />
                  </div>
                </div>
              )}
            </div>
          )}

          {CALC_TYPES.includes(form.type) && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Calculated answer</p>
              <p className="text-xs text-gray-500 mb-2">
                {form.type === 'calculated' && (
                  <>Use <span className="font-mono">{'{name}'}</span> wildcards in
                  the question text and formula — each student gets random
                  values from the ranges you define below. Student enters one
                  number; correct within tolerance.</>
                )}
                {form.type === 'calculatedsimple' && (
                  <>Fixed formula evaluated to the expected answer, e.g.{' '}
                  <span className="italic">sqrt(2) * 10</span> or{' '}
                  <span className="italic">2 * pi * 5</span>. Student enters a
                  number; correct within tolerance.</>
                )}
                {form.type === 'calculatedmulti' && (
                  <>Enter one formula per answer part, separated by{' '}
                  <span className="font-mono">|</span> — e.g.{' '}
                  <span className="italic">a+b | a-b</span>. Student enters
                  comma-separated numbers; partial marks per correct part.</>
                )}
              </p>
              <div className="flex gap-3">
                <input required value={calc.formula} placeholder="Formula *" title="Math expression, e.g. 2*pi*5 or sqrt(16)"
                  onChange={(e) => setCalc({ ...calc, formula: e.target.value })}
                  className="border rounded px-3 py-1.5 flex-1 font-mono" />
                <input type="number" step="any" min="0" value={calc.tolerance} title="Allowed +/- error"
                  placeholder="Tolerance"
                  onChange={(e) => setCalc({ ...calc, tolerance: e.target.value })}
                  className="border rounded px-2 py-1.5 w-28" />
                <input value={calc.units} placeholder="Units (optional)" title="e.g. m/s, kg"
                  onChange={(e) => setCalc({ ...calc, units: e.target.value })}
                  className="border rounded px-3 py-1.5 w-32" />
              </div>

              {form.type === 'calculated' && (
                <div className="mt-2">
                  {datasets.map((d, i) => (
                    <div key={i} className="flex gap-2 mb-1">
                      <input value={d.name} placeholder="name" title="Wildcard name, used as {name}"
                        onChange={(e) => setDatasets(datasets.map(
                          (x, j) => j === i ? { ...x, name: e.target.value } : x
                        ))}
                        className="border rounded px-2 py-1 w-20 font-mono" />
                      <input type="number" step="any" value={d.min_value} placeholder="min"
                        onChange={(e) => setDatasets(datasets.map(
                          (x, j) => j === i ? { ...x, min_value: e.target.value } : x
                        ))}
                        className="border rounded px-2 py-1 w-24" />
                      <input type="number" step="any" value={d.max_value} placeholder="max"
                        onChange={(e) => setDatasets(datasets.map(
                          (x, j) => j === i ? { ...x, max_value: e.target.value } : x
                        ))}
                        className="border rounded px-2 py-1 w-24" />
                      <input type="number" min="0" max="6" value={d.decimals} placeholder="dec" title="Decimal places"
                        onChange={(e) => setDatasets(datasets.map(
                          (x, j) => j === i ? { ...x, decimals: e.target.value } : x
                        ))}
                        className="border rounded px-2 py-1 w-16" />
                      <button type="button"
                        onClick={() => setDatasets(datasets.filter((_, j) => j !== i))}
                        className="text-red-600 px-1">&times;</button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setDatasets([...datasets, { name: '', min_value: null, max_value: null, decimals: null }])}
                    className="text-blue-600 text-sm">+ Add wildcard</button>
                </div>
              )}
            </div>
          )}

          {form.type === 'paragraph' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">
                Questions under this paragraph
              </p>
              <p className="text-xs text-gray-500 mb-2">
                The question text is a reading passage — informational, not
                graded (like description). Tick the questions whose exam page
                should display this passage above them. Create those questions
                first if they don't exist yet.
              </p>
              <div className="border rounded max-h-40 overflow-y-auto p-2">
                {questions.filter((qq) => !INFO_TYPES.includes(qq.type)).length === 0 && (
                  <p className="text-xs text-gray-400">
                    No answerable questions yet — create them first.
                  </p>
                )}
                {questions
                  .filter((qq) => !INFO_TYPES.includes(qq.type))
                  .map((qq) => (
                    <label key={qq.id} className="flex items-center gap-2 text-sm py-0.5">
                      <input type="checkbox"
                        checked={paraLinks.includes(qq.id)}
                        onChange={(e) => setParaLinks(
                          e.target.checked
                            ? [...paraLinks, qq.id]
                            : paraLinks.filter((x) => x !== qq.id)
                        )} />
                      <span className="text-gray-400">{qq.id}</span>
                      <span className="uppercase text-xs text-gray-400 w-28">{qq.type}</span>
                      <span className="truncate">{qq.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {form.type === 'selectmissing' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Dropdown blanks</p>
              <p className="text-xs text-gray-500 mb-2">
                Put <span className="font-mono">[[1]]</span>, <span className="font-mono">[[2]]</span>, ...
                placeholders in the question text where a dropdown should
                appear, then define each blank's options below. Exactly one
                option per blank must be marked correct.
              </p>
              {gapBlanks.map((b, bi) => (
                <div key={bi} className="border rounded p-2 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Blank</span>
                    <input type="number" min="1" value={b.blank_no}
                      onChange={(e) => setGapBlanks(gapBlanks.map((x, j) =>
                        j === bi ? { ...x, blank_no: Number(e.target.value) } : x))}
                      className="border rounded px-2 py-1 w-16 text-sm" />
                    <button type="button"
                      onClick={() => setGapBlanks(gapBlanks.filter((_, j) => j !== bi))}
                      className="text-red-600 text-sm">Remove blank</button>
                  </div>
                  {b.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-1 text-sm">
                      <input type="radio" name={`gap-correct-${bi}`}
                        checked={o.is_correct} title="Mark as correct"
                        onChange={() => setGapBlanks(gapBlanks.map((x, j) =>
                          j === bi ? {
                            ...x,
                            options: x.options.map((oo, k) => ({ ...oo, is_correct: k === oi })),
                          } : x))} />
                      <input value={o.text} placeholder={`Option ${oi + 1}`}
                        onChange={(e) => setGapBlanks(gapBlanks.map((x, j) =>
                          j === bi ? {
                            ...x,
                            options: x.options.map((oo, k) =>
                              k === oi ? { ...oo, text: e.target.value } : oo),
                          } : x))}
                        className="border rounded px-3 py-1 flex-1" />
                      {b.options.length > 2 && (
                        <button type="button"
                          onClick={() => setGapBlanks(gapBlanks.map((x, j) =>
                            j === bi ? {
                              ...x,
                              options: x.options.filter((_, k) => k !== oi),
                            } : x))}
                          className="text-red-600 px-1">&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setGapBlanks(gapBlanks.map((x, j) =>
                      j === bi ? {
                        ...x,
                        options: [...x.options, { text: '', is_correct: false }],
                      } : x))}
                    className="text-sm text-blue-600 hover:underline">+ Add option</button>
                </div>
              ))}
              <button type="button"
                onClick={() => setGapBlanks([...gapBlanks, {
                  blank_no: gapBlanks.length
                    ? Math.max(...gapBlanks.map((x) => x.blank_no)) + 1
                    : 1,
                  options: [{ text: '', is_correct: true }, { text: '', is_correct: false }],
                }])}
                className="text-sm text-blue-600 hover:underline">+ Add blank</button>
            </div>
          )}

          {form.type === 'ordering' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Items in correct order</p>
              <p className="text-xs text-gray-500 mb-2">
                Enter the items in the CORRECT order — students see them
                shuffled and must restore this sequence.
              </p>
              {orderItems.map((o, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 text-sm">
                  <span className="w-6 text-gray-400">{i + 1}.</span>
                  <input value={o.text} placeholder={`Item ${i + 1}`}
                    onChange={(e) => setOrderItems(orderItems.map(
                      (x, j) => (j === i ? { ...x, text: e.target.value } : x)
                    ))}
                    className="border rounded px-3 py-1.5 flex-1" />
                  {orderItems.length > 2 && (
                    <button type="button"
                      onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}
                      className="text-red-600 px-1">&times;</button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => setOrderItems([...orderItems, { text: '' }])}
                className="text-sm text-blue-600 hover:underline">+ Add item</button>
            </div>
          )}

          {form.type === 'truefalse' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Correct answer</p>
              <select value={tfAnswer} onChange={(e) => setTfAnswer(e.target.value)}
                className="border rounded px-3 py-1.5">
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {form.type === 'shortanswer' && (
            <div className="mb-3 flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Expected answer</label>
                <input required value={shortAnswer.answer_text}
                  onChange={(e) => setShortAnswer({ ...shortAnswer, answer_text: e.target.value })}
                  className="border rounded px-3 py-1.5 w-full" />
              </div>
              <label className="text-sm flex items-center gap-1">
                <input type="checkbox" checked={shortAnswer.case_sensitive}
                  onChange={(e) => setShortAnswer({ ...shortAnswer, case_sensitive: e.target.checked })} />
                Case sensitive
              </label>
            </div>
          )}

          {form.type === 'numerical' && (
            <div className="mb-3 flex gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Answer value</label>
                <input required type="number" step="any"
                  value={numerical.answer_value}
                  onChange={(e) => setNumerical({ ...numerical, answer_value: e.target.value })}
                  className="border rounded px-3 py-1.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tolerance</label>
                <input type="number" step="any"
                  value={numerical.tolerance}
                  onChange={(e) => setNumerical({ ...numerical, tolerance: e.target.value })}
                  className="border rounded px-3 py-1.5" />
              </div>
            </div>
          )}

          {form.type === 'match' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Matching pairs</p>
              {matchItems.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input placeholder="Left (sub-question)" value={m.sub_question}
                    onChange={(e) => updateMatch(i, { sub_question: e.target.value })}
                    className="border rounded px-3 py-1.5 flex-1" />
                  <input placeholder="Right (correct match)" value={m.sub_answer}
                    onChange={(e) => updateMatch(i, { sub_answer: e.target.value })}
                    className="border rounded px-3 py-1.5 flex-1" />
                  {matchItems.length > 2 && (
                    <button type="button" onClick={() => setMatchItems(matchItems.filter((_, x) => x !== i))}
                      className="text-red-600">x</button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => setMatchItems([...matchItems, { sub_question: '', sub_answer: '', sort_order: matchItems.length }])}
                className="text-sm text-blue-600 hover:underline">+ Add pair</button>
            </div>
          )}

          {form.type === 'essay' && (
            <div className="mb-3 flex gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max words (optional)</label>
                <input type="number" min="1"
                  value={essay.max_words}
                  onChange={(e) => setEssay({ ...essay, max_words: e.target.value })}
                  className="border rounded px-3 py-1.5" />
              </div>
            </div>
          )}

          {form.type === 'multianswer' && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Accepted answers (one per line)</p>
              <textarea required value={multiAnswer}
                onChange={(e) => setMultiAnswer(e.target.value)}
                className="w-full border rounded px-3 py-2" rows={3} />
              <p className="text-xs text-gray-500 mt-1">
                Each line is one full acceptable answer for all blanks in order
                (e.g. "programming james ghosly"). Matching ignores case and
                comma/space separators.
              </p>
            </div>
          )}

          {form.type === 'coding' && (
            <div className="mb-3 border rounded p-3 bg-gray-50 space-y-3">
              <p className="text-sm font-medium">Coding configuration</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Language</label>
                  <select value={codingCfg.language}
                    onChange={(e) => setCodingCfg({ ...codingCfg, language: e.target.value })}
                    className="border rounded px-3 py-1.5 text-sm">
                    <option value="python">python</option>
                    <option value="java">java</option>
                    <option value="javascript">javascript</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Time limit (sec)</label>
                  <input type="number" min="1" max="60" value={codingCfg.time_limit}
                    onChange={(e) => setCodingCfg({ ...codingCfg, time_limit: e.target.value })}
                    className="border rounded px-3 py-1.5 text-sm w-24" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Starter code (optional — pre-fills the student's editor)
                </label>
                <textarea value={codingCfg.starter_code}
                  onChange={(e) => setCodingCfg({ ...codingCfg, starter_code: e.target.value })}
                  className="w-full border rounded px-3 py-2 font-mono text-xs" rows={4} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">
                    Test cases (program input → expected output)
                  </label>
                  <button type="button"
                    onClick={() => setTestCases([
                      ...testCases,
                      { input_text: '', expected_output: '', marks: 1, is_hidden: false },
                    ])}
                    className="text-xs text-blue-600">+ Add case</button>
                </div>
                {testCases.map((tc, i) => (
                  <div key={i} className="border rounded p-2 mb-2 bg-white space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Case {i + 1}</span>
                      {testCases.length > 1 && (
                        <button type="button"
                          onClick={() => setTestCases(testCases.filter((_, x) => x !== i))}
                          className="text-xs text-red-500">Remove</button>
                      )}
                    </div>
                    <textarea value={tc.input_text} placeholder="stdin input (optional)"
                      onChange={(e) => setTestCases(testCases.map(
                        (x, xi) => (xi === i ? { ...x, input_text: e.target.value } : x)
                      ))}
                      className="w-full border rounded px-2 py-1 font-mono text-xs" rows={2} />
                    <textarea value={tc.expected_output} placeholder="expected stdout"
                      onChange={(e) => setTestCases(testCases.map(
                        (x, xi) => (xi === i ? { ...x, expected_output: e.target.value } : x)
                      ))}
                      className="w-full border rounded px-2 py-1 font-mono text-xs" rows={2} />
                    <div className="flex items-center gap-4">
                      <label className="text-xs text-gray-500 flex items-center gap-1">
                        Marks
                        <input type="number" min="0.5" step="0.5" value={tc.marks}
                          onChange={(e) => setTestCases(testCases.map(
                            (x, xi) => (xi === i ? { ...x, marks: e.target.value } : x)
                          ))}
                          className="border rounded px-2 py-0.5 w-16 text-xs" />
                      </label>
                      <label className="text-xs text-gray-500 flex items-center gap-1">
                        <input type="checkbox" checked={tc.is_hidden}
                          onChange={(e) => setTestCases(testCases.map(
                            (x, xi) => (xi === i ? { ...x, is_hidden: e.target.checked } : x)
                          ))} />
                        Hidden (grading only — never shown to students)
                      </label>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  Students get a code editor with a Run button for the non-hidden
                  cases; submission auto-grades against every case and awards
                  marks proportionally.
                </p>
              </div>
            </div>
          )}

          <button className="bg-green-600 text-white px-4 py-2 rounded">
            {editId ? 'Update Question' : 'Create Question'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit}
              className="ml-2 px-4 py-2 border rounded">Cancel</button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input placeholder="Search name or text..." value={qFilter}
          onChange={(e) => setQFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-48" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">ID</th><th>Name</th><th>Type</th>
            <th>Marks</th><th>Question</th>
            {isAdminUser && <th>Created By</th>}<th></th>
          </tr>
        </thead>
        <tbody>
          {filteredQuestions.map((q) => (
            <tr key={q.id} className="border-b">
              <td className="p-3">{q.id}</td>
              <td>{q.name}</td>
              <td className="capitalize">{q.type}</td>
              <td>{q.default_mark}</td>
              <td className="max-w-xs truncate">{q.question_text}</td>
              {isAdminUser && <td>{q.creator_name || '-'}</td>}
              <td className="space-x-2">
                <button onClick={() => startEdit(q)}
                  className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => remove(q.id)}
                  className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
