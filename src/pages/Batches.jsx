import { useEffect, useState } from 'react';
import api from '../api/client';

// Read-only view for teachers: their batches and the students
// enrolled in each one (list is already scoped by the backend).
export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchTeachers, setBatchTeachers] = useState([]);
  const [error, setError] = useState('');

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

  useEffect(() => { load().catch(() => setError('Failed to load batches')); }, []);

  const selectBatch = async (batch) => {
    setSelected(batch);
    setError('');
    try {
      const [bs, bt] = await Promise.all([
        api.get(`/batch-students/batch/${batch.id}`),
        api.get(`/batch-teachers/batch/${batch.id}`),
      ]);
      setBatchStudents(bs.data);
      setBatchTeachers(bt.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load batch members');
    }
  };

  const userName = (id) => {
    const u = [...students, ...teachers].find((x) => x.id === id);
    return u ? u.name : `#${id}`;
  };

  const userEmail = (id) => {
    const u = [...students, ...teachers].find((x) => x.id === id);
    return u ? u.email : '';
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">My Batches</h1>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="self-start overflow-x-auto">
          <table className="bg-white rounded shadow text-sm w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">ID</th><th>Name</th><th>Course</th><th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className={`border-b ${selected?.id === b.id ? 'bg-blue-50' : ''}`}>
                  <td className="p-3">{b.id}</td>
                  <td>{b.name}</td>
                  <td>{courses.find((c) => c.id === b.course_id)?.name || b.course_id}</td>
                  <td>
                    <button onClick={() => selectBatch(b)}
                      className="text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan="4" className="p-3 text-gray-400">No batches assigned to you</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white rounded shadow p-4 text-sm self-start">
            <h2 className="font-bold mb-3">{selected.name}</h2>

            <h3 className="font-semibold mb-2">Students ({batchStudents.length})</h3>
            <ul className="mb-4 max-h-64 overflow-auto border rounded">
              {batchStudents.map((bs) => (
                <li key={bs.id} className="px-3 py-1.5 border-b last:border-b-0 flex justify-between">
                  <span>{userName(bs.user_id)}</span>
                  <span className="text-gray-400">{userEmail(bs.user_id)}</span>
                </li>
              ))}
              {batchStudents.length === 0 && (
                <li className="px-3 py-2 text-gray-400">No students enrolled</li>
              )}
            </ul>

            <h3 className="font-semibold mb-2">Teachers ({batchTeachers.length})</h3>
            <ul className="max-h-40 overflow-auto border rounded">
              {batchTeachers.map((bt) => (
                <li key={bt.id} className="px-3 py-1.5 border-b last:border-b-0 flex justify-between">
                  <span>{userName(bt.user_id)}</span>
                  <span className="text-gray-400">{userEmail(bt.user_id)}</span>
                </li>
              ))}
              {batchTeachers.length === 0 && (
                <li className="px-3 py-2 text-gray-400">No teachers assigned</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
