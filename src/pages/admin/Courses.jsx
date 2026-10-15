import { useEffect, useState } from 'react';
import api from '../../api/client';

const EMPTY = { name: '', code: '', description: '' };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/courses/');
    setCourses(data);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await api.put(`/courses/${editId}`, form);
      } else {
        await api.post('/courses/', form);
      }
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed');
    }
  };

  const edit = (c) => {
    setForm({ name: c.name, code: c.code, description: c.description || '' });
    setEditId(c.id);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    await api.delete(`/courses/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Courses</h1>

      <form onSubmit={submit} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input required placeholder="Course name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded px-3 py-2" />
        <input required placeholder="Code" value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="border rounded px-3 py-2" disabled={!!editId} />
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border rounded px-3 py-2" />
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 text-white rounded">
            {editId ? 'Update' : 'Create'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); }}
              className="px-3 border rounded">X</button>
          )}
        </div>
        {error && <p className="col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      <input placeholder="Search name, code or description..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm w-full sm:w-96 mb-3" />

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">ID</th><th>Name</th><th>Code</th>
            <th>Description</th><th>Created By</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.filter((c) =>
            search === '' ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(search.toLowerCase())
          ).map((c) => (
            <tr key={c.id} className="border-b">
              <td className="p-3">{c.id}</td>
              <td>{c.name}</td>
              <td>{c.code}</td>
              <td>{c.description}</td>
              <td>{c.creator_name || '-'}</td>
              <td className="space-x-2">
                <button onClick={() => edit(c)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => remove(c.id)} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
