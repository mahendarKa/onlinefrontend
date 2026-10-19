import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-blue-800', 'bg-amber-500',
  'bg-sky-500', 'bg-slate-700', 'bg-amber-600',
];

const initials = (first, last) =>
  (
    (first || '').trim().charAt(0) +
    (last || '').trim().charAt(0)
  ).toUpperCase() || '?';

function Avatar({ first, last, pic, size = 'h-20 w-20 text-2xl' }) {
  const fullName = [first, last].filter(Boolean).join(' ');
  if (pic) {
    return (
      <img src={fileUrl(pic)} alt={fullName}
        className={`${size} rounded-full object-cover border-2 border-blue-200`} />
    );
  }
  const init = initials(first, last);
  const color = AVATAR_COLORS[init.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`${size} rounded-full ${color} text-white flex items-center justify-center font-bold`}>
      {init}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex border-b last:border-0 py-3">
      <span className="w-40 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

export default function Profile() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => setMe(data))
      .catch(() => setError('Could not load your profile'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!me) return <p className="text-sm text-gray-500">Loading…</p>;

  const fullName = [me.first_name, me.last_name]
    .filter(Boolean).join(' ');

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-4">My Profile</h1>
      <div className="bg-white rounded shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar first={me.first_name} last={me.last_name}
            pic={me.profile_pic} />
          <div>
            <p className="font-semibold text-lg">{fullName}</p>
            <p className="text-sm text-gray-500 capitalize">{me.role}</p>
          </div>
        </div>
        <Row label="Name" value={fullName} />
        <Row label="Email" value={me.email} />
        <Row label="Mobile number" value={me.mobile_number} />
        <Row label="Role" value={<span className="capitalize">{me.role}</span>} />
        <Row label="Account status" value={me.is_active ? 'Active' : 'Inactive'} />
      </div>
    </div>
  );
}
