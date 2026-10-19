import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toApiUtc, toLocalInput } from '../utils/datetime';

const EMPTY = {
  course_id: '',
  name: '',
  description: '',
  duration_minutes: null,
  passing_percentage: null,
  start_time: '',
  end_time: '',
  attempts_allowed: null,
  shuffle_questions: false,
};

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function Exams() {
  const { user } = useAuth();
  const isAdminUser = ['admin', 'superadmin'].includes(user?.role);
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [e, c] = await Promise.all([
      api.get('/exams/'),
      api.get('/courses/'),
    ]);
    setExams(e.data);
    setCourses(c.data);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.start_time && form.end_time) {
      const windowMin =
        (new Date(form.end_time) - new Date(form.start_time)) / 60000;
      if (windowMin <= 0) {
        setError('End time must be after start time');
        return;
      }
      if (Number(form.duration_minutes) > windowMin) {
        setError(
          `Duration (${form.duration_minutes} min) is longer than the time ` +
          `between start and end (${Math.floor(windowMin)} min)`
        );
        return;
      }
    }
    const payload = {
      ...form,
      course_id: Number(form.course_id),
      duration_minutes: Number(form.duration_minutes),
      passing_percentage: Number(form.passing_percentage),
      attempts_allowed: Number(form.attempts_allowed),
      start_time: toApiUtc(form.start_time),
      end_time: toApiUtc(form.end_time),
    };
    try {
      if (editId) {
        await api.put(`/exams/${editId}`, payload);
        setMessage('Exam updated');
      } else {
        await api.post('/exams/', payload);
        setMessage('Exam created. Add questions to set its total marks.');
      }
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to save exam'
      );
    }
  };

  const startEdit = (exam) => {
    setEditId(exam.id);
    setError('');
    setMessage('');
    setForm({
      course_id: exam.course_id,
      name: exam.name,
      description: exam.description || '',
      duration_minutes: exam.duration_minutes,
      passing_percentage: exam.passing_percentage ?? '',
      // datetime-local needs "YYYY-MM-DDTHH:MM" in local time
      start_time: toLocalInput(exam.start_time),
      end_time: toLocalInput(exam.end_time),
      attempts_allowed: exam.attempts_allowed || 1,
      shuffle_questions: !!exam.shuffle_questions,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY);
  };

  const toggleActive = async (exam) => {
    await api.put(`/exams/${exam.id}`, { is_active: !exam.is_active });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    await api.delete(`/exams/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Exams</h1>

      <form onSubmit={submit} className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <select required value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            className="border rounded px-3 py-2">
            <option value="">Course...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Exam name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2" />
          <input required type="number" min="1" placeholder="Duration (min)"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            className="border rounded px-3 py-2" />
          <input required type="number" min="0" max="100" step="0.01"
            placeholder="Pass %"
            value={form.passing_percentage}
            onChange={(e) => setForm({ ...form, passing_percentage: e.target.value })}
            className="border rounded px-3 py-2" />
          <input required type="number" min="1" placeholder="Attempts allowed"
            value={form.attempts_allowed}
            onChange={(e) => setForm({ ...form, attempts_allowed: e.target.value })}
            className="border rounded px-3 py-2" />
          <div>
            <label className="text-xs text-gray-500 block">Start time</label>
            <input type="datetime-local" min={nowLocal()} value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="border rounded px-3 py-1.5 w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">End time</label>
            <input type="datetime-local" min={form.start_time || nowLocal()} value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="border rounded px-3 py-1.5 w-full" />
          </div>
        </div>
        <input placeholder="Description (optional)" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded px-3 py-2 mb-3" />
        <label className="text-sm flex items-center gap-2 mb-3">
          <input type="checkbox" checked={form.shuffle_questions}
            onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })} />
          Shuffle questions
        </label>
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          {editId ? 'Update Exam' : 'Create Exam'}
        </button>
        {editId && (
          <button type="button" onClick={cancelEdit}
            className="ml-2 px-4 py-2 border rounded">Cancel</button>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Total marks is calculated automatically from the questions you add.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </form>

      <div className="flex flex-wrap gap-2 mb-3">
        <input placeholder="Search exam name..." value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-48" />
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">ID</th><th>Name</th><th>Course</th>
            <th>Marks</th><th>Duration</th><th>Active</th>
            {isAdminUser && <th>Created By</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exams.filter((exam) =>
            (courseFilter === '' || exam.course_id === Number(courseFilter)) &&
            (nameFilter === '' ||
              exam.name.toLowerCase().includes(nameFilter.toLowerCase()))
          ).map((exam) => (
            <tr key={exam.id} className="border-b">
              <td className="p-3">{exam.id}</td>
              <td>
                <Link to={`/exams/${exam.id}`} className="text-blue-600 hover:underline">
                  {exam.name}
                </Link>
              </td>
              <td>{courses.find((c) => c.id === exam.course_id)?.name || exam.course_id}</td>
              <td>{exam.total_marks}</td>
              <td>{exam.duration_minutes}m</td>
              <td>{exam.is_active ? 'Yes' : 'No'}</td>
              {isAdminUser && <td>{exam.creator_name || '-'}</td>}
              <td className="space-x-2">
                <Link to={`/exams/${exam.id}`} className="text-blue-600 hover:underline">Manage</Link>
                <button onClick={() => startEdit(exam)}
                  className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => toggleActive(exam)}
                  className="text-gray-600 hover:underline">
                  {exam.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(exam.id)}
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
