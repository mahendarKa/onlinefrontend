import { useEffect, useState } from 'react';
import api from '../../api/client';

const EMPTY_BATCH = { course_id: '', name: '', start_date: '', end_date: '', description: '' };

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH);
  const [editId, setEditId] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchTeachers, setBatchTeachers] = useState([]);
  const [checkedStudents, setCheckedStudents] = useState(new Set());
  const [checkedTeachers, setCheckedTeachers] = useState(new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [b, c, s, t] = await Promise.all([
      api.get('/batches/'),
      api.get('/courses/'),
      api.get('/users/', { params: { role: 'student' } }),
      api.get('/users/', { params: { role: 'teacher' } }),
    ]);
    setBatches(b.data);
    setCourses(c.data);
    setStudents(s.data);
    setTeachers(t.data);
  };

  useEffect(() => { load(); }, []);

  const selectBatch = async (batch) => {
    setSelected(batch);
    setCheckedStudents(new Set());
    setCheckedTeachers(new Set());
    const [bs, bt] = await Promise.all([
      api.get(`/batch-students/batch/${batch.id}`),
      api.get(`/batch-teachers/batch/${batch.id}`),
    ]);
    setBatchStudents(bs.data);
    setBatchTeachers(bt.data);
  };

  const createBatch = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...batchForm,
      course_id: Number(batchForm.course_id),
      start_date: batchForm.start_date || null,
      end_date: batchForm.end_date || null,
    };
    try {
      if (editId) {
        await api.put(`/batches/${editId}`, payload);
        setMessage('Batch updated');
      } else {
        await api.post('/batches/', payload);
        setMessage('Batch created successfully');
      }
      setBatchForm(EMPTY_BATCH);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save batch');
    }
  };

  const startEdit = (b) => {
    setEditId(b.id);
    setError('');
    setMessage('');
    setBatchForm({
      course_id: b.course_id,
      name: b.name,
      start_date: b.start_date || '',
      end_date: b.end_date || '',
      description: b.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setBatchForm(EMPTY_BATCH);
  };

  const toggle = (setFn, set, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  };

  const enrolledIds = new Set(batchStudents.map((x) => x.user_id));
  const assignedIds = new Set(batchTeachers.map((x) => x.user_id));

  const enrollSelected = async () => {
    setError('');
    setMessage('');
    let ok = 0;
    for (const id of checkedStudents) {
      try {
        await api.post('/batch-students/', { batch_id: selected.id, user_id: id });
        ok++;
      } catch (err) {
        setError(`Failed to enroll user ${id}: ${err.response?.data?.detail || 'error'}`);
      }
    }
    setCheckedStudents(new Set());
    setMessage(`Enrolled ${ok} student(s)`);
    selectBatch(selected);
  };

  const assignSelected = async () => {
    setError('');
    setMessage('');
    let ok = 0;
    for (const id of checkedTeachers) {
      try {
        await api.post('/batch-teachers/', { batch_id: selected.id, user_id: id });
        ok++;
      } catch (err) {
        setError(`Failed to assign user ${id}: ${err.response?.data?.detail || 'error'}`);
      }
    }
    setCheckedTeachers(new Set());
    setMessage(`Assigned ${ok} teacher(s)`);
    selectBatch(selected);
  };

  const removeStudent = async (enrollmentId) => {
    await api.delete(`/batch-students/${enrollmentId}`);
    selectBatch(selected);
  };

  const removeTeacher = async (assignmentId) => {
    await api.delete(`/batch-teachers/${assignmentId}`);
    selectBatch(selected);
  };

  const userName = (id) => {
    const u = [...students, ...teachers].find((x) => x.id === id);
    return u ? u.name : `#${id}`;
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Batches</h1>

      <form onSubmit={createBatch} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select required value={batchForm.course_id}
          onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
          className="border rounded px-3 py-2">
          <option value="">Course...</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input required placeholder="Batch name" value={batchForm.name}
          onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
          className="border rounded px-3 py-2" />
        <input type="date" value={batchForm.start_date}
          onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })}
          className="border rounded px-3 py-2" />
        <input type="date" value={batchForm.end_date}
          onChange={(e) => setBatchForm({ ...batchForm, end_date: e.target.value })}
          className="border rounded px-3 py-2" />
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 text-white rounded">
            {editId ? 'Update' : 'Create'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit}
              className="px-3 border rounded">X</button>
          )}
        </div>
      </form>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="self-start">
        <div className="flex flex-wrap gap-2 mb-2">
          <input placeholder="Search batch name..." value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-40" />
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
        <table className="bg-white rounded shadow text-sm w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">ID</th><th>Name</th><th>Course</th>
              <th>Created By</th><th></th>
            </tr>
          </thead>
          <tbody>
            {batches.filter((b) =>
              (courseFilter === '' || b.course_id === Number(courseFilter)) &&
              (nameFilter === '' ||
                b.name.toLowerCase().includes(nameFilter.toLowerCase()))
            ).map((b) => (
              <tr key={b.id} className={`border-b ${selected?.id === b.id ? 'bg-blue-50' : ''}`}>
                <td className="p-3">{b.id}</td>
                <td>{b.name}</td>
                <td>{courses.find((c) => c.id === b.course_id)?.name || b.course_id}</td>
                <td>{b.creator_name || '-'}</td>
                <td className="space-x-2">
                  <button onClick={() => selectBatch(b)}
                    className="text-blue-600 hover:underline">Manage</button>
                  <button onClick={() => startEdit(b)}
                    className="text-blue-600 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </div>

        {selected && (
          <div className="bg-white rounded shadow p-4 text-sm">
            <h2 className="font-bold mb-3">Manage: {selected.name}</h2>

            <h3 className="font-semibold mt-3 mb-2">Students</h3>
            <div className="max-h-40 overflow-auto border rounded mb-2">
              {students.filter((s) => !enrolledIds.has(s.id)).length > 0 && (
                <label className="flex items-center gap-2 px-3 py-1.5 border-b font-medium bg-gray-50 sticky top-0">
                  <input type="checkbox"
                    checked={students.filter((s) => !enrolledIds.has(s.id)).every((s) => checkedStudents.has(s.id))}
                    onChange={() => {
                      const avail = students.filter((s) => !enrolledIds.has(s.id));
                      const allChecked = avail.every((s) => checkedStudents.has(s.id));
                      const next = new Set(checkedStudents);
                      avail.forEach((s) =>
                        allChecked ? next.delete(s.id) : next.add(s.id)
                      );
                      setCheckedStudents(next);
                    }} />
                  <span>Select all</span>
                </label>
              )}
              {students.filter((s) => !enrolledIds.has(s.id)).map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0">
                  <input type="checkbox"
                    checked={checkedStudents.has(s.id)}
                    onChange={() => toggle(setCheckedStudents, checkedStudents, s.id)} />
                  <span>{s.name} <span className="text-gray-400">({s.email})</span></span>
                </label>
              ))}
              {students.filter((s) => !enrolledIds.has(s.id)).length === 0 && (
                <p className="px-3 py-2 text-gray-400">All students enrolled</p>
              )}
            </div>
            <button onClick={enrollSelected} disabled={checkedStudents.size === 0}
              className="bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-40 mb-3">
              Enroll selected ({checkedStudents.size})
            </button>
            <ul className="mb-4">
              {batchStudents.map((bs) => (
                <li key={bs.id} className="flex justify-between py-1 border-b">
                  <span>{userName(bs.user_id)}</span>
                  <button onClick={() => removeStudent(bs.id)}
                    className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
              {batchStudents.length === 0 && <li className="text-gray-400">No students enrolled</li>}
            </ul>

            <h3 className="font-semibold mb-2">Teachers</h3>
            <div className="max-h-40 overflow-auto border rounded mb-2">
              {teachers.filter((t) => !assignedIds.has(t.id)).length > 0 && (
                <label className="flex items-center gap-2 px-3 py-1.5 border-b font-medium bg-gray-50 sticky top-0">
                  <input type="checkbox"
                    checked={teachers.filter((t) => !assignedIds.has(t.id)).every((t) => checkedTeachers.has(t.id))}
                    onChange={() => {
                      const avail = teachers.filter((t) => !assignedIds.has(t.id));
                      const allChecked = avail.every((t) => checkedTeachers.has(t.id));
                      const next = new Set(checkedTeachers);
                      avail.forEach((t) =>
                        allChecked ? next.delete(t.id) : next.add(t.id)
                      );
                      setCheckedTeachers(next);
                    }} />
                  <span>Select all</span>
                </label>
              )}
              {teachers.filter((t) => !assignedIds.has(t.id)).map((t) => (
                <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0">
                  <input type="checkbox"
                    checked={checkedTeachers.has(t.id)}
                    onChange={() => toggle(setCheckedTeachers, checkedTeachers, t.id)} />
                  <span>{t.name} <span className="text-gray-400">({t.email})</span></span>
                </label>
              ))}
              {teachers.filter((t) => !assignedIds.has(t.id)).length === 0 && (
                <p className="px-3 py-2 text-gray-400">All teachers assigned</p>
              )}
            </div>
            <button onClick={assignSelected} disabled={checkedTeachers.size === 0}
              className="bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-40 mb-3">
              Assign selected ({checkedTeachers.size})
            </button>
            <ul>
              {batchTeachers.map((bt) => (
                <li key={bt.id} className="flex justify-between py-1 border-b">
                  <span>{userName(bt.user_id)}</span>
                  <button onClick={() => removeTeacher(bt.id)}
                    className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
              {batchTeachers.length === 0 && <li className="text-gray-400">No teachers assigned</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
