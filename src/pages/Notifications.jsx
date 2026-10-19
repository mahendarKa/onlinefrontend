import { useEffect, useState } from 'react';
import api from '../api/client';
import { apiDate } from '../utils/datetime';

const TYPE_STYLES = {
  'exam.assigned': 'bg-blue-100 text-blue-700',
  'result.published': 'bg-emerald-100 text-emerald-700',
  'notification.send': 'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
};

function fmt(dt) {
  return apiDate(dt).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// Layout listens for this to refresh the bell badge instantly.
const refreshBell = () =>
  window.dispatchEvent(new Event('notifications:refresh'));

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/notifications/my').then(({ data }) => {
      setItems(data);
      setLoading(false);
    }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setItems(items.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    refreshBell();
  };

  const markAll = async () => {
    await api.patch('/notifications/my/read-all').catch(() => {});
    setItems(items.map((n) => ({ ...n, is_read: true })));
    refreshBell();
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">
          Notifications
          {unread > 0 && (
            <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5 align-middle">
              {unread} new
            </span>
          )}
        </h1>
        {unread > 0 && (
          <button onClick={markAll}
            className="text-sm text-blue-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-500 bg-white rounded shadow p-6">
          No notifications yet.
        </p>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} onClick={() => markRead(n.id)}
            className={`bg-white rounded shadow p-4 flex gap-3 ${
              n.is_read ? 'opacity-70' : 'border-l-4 border-blue-500'
            }`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{n.title}</p>
                <span className={`text-[10px] px-1.5 rounded ${
                  TYPE_STYLES[n.notification_type] || TYPE_STYLES.general
                }`}>
                  {n.notification_type}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                {n.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">{fmt(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.id)}
                className="text-xs text-blue-600 hover:underline self-start whitespace-nowrap">
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
