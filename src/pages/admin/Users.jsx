import { useEffect, useState } from 'react';
import api, { fileUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { first_name: '', last_name: '', email: '', password: '', role: 'student', mobile_number: '', picFile: null };
const ROLES = ['student', 'teacher', 'admin', 'superadmin'];

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(null);

  const isSuper = me?.role === 'superadmin';

  const load = async () => {
    const { data } = await api.get('/users/', {
      params: roleFilter ? { role: roleFilter } : {},
    });
    setUsers(data);
  };

  useEffect(() => { load(); }, [roleFilter]);

  const uploadPic = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/uploads', fd);
    return data.image_url;
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        email: form.email,
        password: form.password,
        role: form.role,
        mobile_number: form.mobile_number.trim() || null,
      };
      if (form.picFile) payload.profile_pic = await uploadPic(form.picFile);
      await api.post('/users/admin/create', payload);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({
      first_name: u.first_name || '', last_name: u.last_name || '',
      email: u.email, role: u.role, password: '',
      mobile_number: u.mobile_number || '', picFile: null,
      profile_pic: u.profile_pic || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim() || null,
        email: editForm.email,
        role: editForm.role,
        mobile_number: editForm.mobile_number.trim() || null,
      };
      if (editForm.password) payload.password = editForm.password;
      if (editForm.picFile) payload.profile_pic = await uploadPic(editForm.picFile);
      await api.put(`/users/${editId}`, payload);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed');
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.put(`/users/admin/${id}/status`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Status change failed');
    }
  };

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
      const { data } = await api.post('/users/admin/bulk-upload', fd, {
        onUploadProgress: (e) => {
          setUploadPct(
            e.total ? Math.round((e.loaded / e.total) * 100) : null
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
    const csv = [
      'first_name,last_name,email,password,role,mobile_number',
      'Alice,Student,alice@example.com,pass123,student,9876543210',
      'Bob,Teacher,bob@example.com,secret1,teacher,',
      'Carol,,carol@example.com,welcome1,,',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Users</h1>
        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <button
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); setBulkResult(null); }}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm"
          >
            {showBulk ? 'Close' : 'Bulk Upload'}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulk(false); }}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm"
          >
            {showForm ? 'Cancel' : 'New User'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

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
            CSV columns: <code className="bg-gray-100 px-1 rounded">first_name,last_name,email,password,role,mobile_number</code>
            {' '}&mdash; last_name, role and mobile_number are optional (role defaults to student).
            Duplicate emails are skipped.
          </p>

          {bulkResult && (
            <div className="mt-3 text-sm">
              <p>
                <span className="text-green-700 font-medium">{bulkResult.created_count} created</span>
                {' \u00b7 '}
                <span className="text-amber-600">{bulkResult.skipped_count} skipped</span>
                {' \u00b7 '}
                <span className="text-red-600">{bulkResult.error_count} errors</span>
              </p>
              {(bulkResult.skipped.length > 0 || bulkResult.errors.length > 0) && (
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-0.5 text-xs">
                  {bulkResult.skipped.map((s) => (
                    <li key={`s${s.row}`} className="text-amber-700">
                      Row {s.row}: {s.email} &mdash; {s.reason}
                    </li>
                  ))}
                  {bulkResult.errors.map((e2) => (
                    <li key={`e${e2.row}`} className="text-red-600">
                      Row {e2.row}: {e2.email} &mdash; {e2.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={createUser} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-4 gap-3">
          <input required placeholder="First name" value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="border rounded px-3 py-2" />
          <input placeholder="Last name (optional)" value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="border rounded px-3 py-2" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded px-3 py-2" />
          <input required type="password" minLength={6} placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border rounded px-3 py-2" />
          <select value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="border rounded px-3 py-2">
            {ROLES.filter((r) => r !== 'superadmin' || isSuper).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input placeholder="Mobile number (optional)" value={form.mobile_number}
            onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            className="border rounded px-3 py-2" />
          <label className="col-span-3 flex items-center gap-2 text-sm text-gray-500 border rounded px-3 py-2">
            Profile pic (optional):
            <input type="file" accept="image/*" className="text-xs"
              onChange={(e) => setForm({ ...form, picFile: e.target.files?.[0] || null })} />
          </label>
          <button className="col-span-4 bg-green-600 text-white py-2 rounded">Create</button>
        </form>
      )}

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">ID</th><th>Name</th><th>Email</th>
            <th>Mobile</th><th>Role</th><th>Active</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b align-top">
              <td className="p-3">{u.id}</td>
              <td>
                <span className="flex items-center gap-2">
                  {u.profile_pic ? (
                    <img src={fileUrl(u.profile_pic)} alt=""
                      className="h-7 w-7 rounded-full object-cover border" />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {((u.first_name || '').charAt(0) + (u.last_name || '').charAt(0)).toUpperCase() || '?'}
                    </span>
                  )}
                  {u.name}
                </span>
              </td>
              <td>{u.email}</td>
              <td>{u.mobile_number || '—'}</td>
              <td className="capitalize">{u.role}</td>
              <td>{u.is_active ? 'Yes' : 'No'}</td>
              <td className="space-x-2">
                <button onClick={() => startEdit(u)}
                  className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => toggleStatus(u.id)}
                  className="text-gray-600 hover:underline">
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(u.id)}
                  className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center" onClick={() => setEditId(null)}>
          <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded shadow-lg p-6 w-96">
            <h2 className="font-bold mb-4">Edit User {editId}</h2>
            <label className="block text-xs text-gray-500 mb-1">First name</label>
            <input required value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3" />
            <label className="block text-xs text-gray-500 mb-1">Last name (optional)</label>
            <input value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3" />
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input required type="email" value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3" />
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <select value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3">
              {ROLES.filter((r) => r !== 'superadmin' || isSuper).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <label className="block text-xs text-gray-500 mb-1">Mobile number</label>
            <input value={editForm.mobile_number}
              onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3" />
            <label className="block text-xs text-gray-500 mb-1">Profile picture</label>
            <div className="flex items-center gap-3 mb-3">
              {editForm.profile_pic && !editForm.picFile && (
                <img src={fileUrl(editForm.profile_pic)} alt=""
                  className="h-10 w-10 rounded-full object-cover border" />
              )}
              <input type="file" accept="image/*" className="text-xs"
                onChange={(e) => setEditForm({ ...editForm, picFile: e.target.files?.[0] || null })} />
            </div>
            <label className="block text-xs text-gray-500 mb-1">New password (leave blank to keep)</label>
            <input type="password" minLength={6} value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-4" />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
              <button type="button" onClick={() => setEditId(null)}
                className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
