import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Floating decorations: drifting logo watermarks + soft blobs.
  const decor = [
    { kind: 'logo', cls: 'h-40 left-[8%] top-[12%] opacity-20', dur: '9s', delay: '0s' },
    { kind: 'logo', cls: 'h-24 right-[12%] top-[20%] opacity-15', dur: '7s', delay: '1.5s' },
    { kind: 'logo', cls: 'h-56 right-[6%] bottom-[10%] opacity-10', dur: '11s', delay: '0.8s' },
    { kind: 'logo', cls: 'h-20 left-[18%] bottom-[14%] opacity-15', dur: '8s', delay: '2s' },
    { kind: 'blob', cls: 'h-72 w-72 left-[35%] top-[-10%] bg-blue-500/40', dur: '10s', delay: '0s' },
    { kind: 'blob', cls: 'h-56 w-56 right-[30%] bottom-[-8%] bg-amber-300/20', dur: '12s', delay: '1s' },
    { kind: 'blob', cls: 'h-40 w-40 left-[5%] top-[45%] bg-white/10', dur: '8s', delay: '2.5s' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-blue-700 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {decor.map((d, i) =>
          d.kind === 'logo' ? (
            <img key={i} src="/logo.png" alt=""
              className={`animate-float absolute ${d.cls}`}
              style={{ animationDuration: d.dur, animationDelay: d.delay }} />
          ) : (
            <div key={i}
              className={`animate-float absolute rounded-full blur-3xl ${d.cls}`}
              style={{ animationDuration: d.dur, animationDelay: d.delay }} />
          )
        )}
      </div>

      <form onSubmit={submit}
        className="relative z-10 bg-amber-400 p-8 rounded-lg shadow-2xl w-96">
        <img src="/logo.png" alt="Exam Portal" className="h-28 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-blue-800 text-center">
          Exam Portal
        </h1>
        <div className="h-1 w-16 bg-blue-700 rounded mx-auto mt-2 mb-6" />

        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-100 p-2 rounded">{error}</p>
        )}

        <label className="block text-sm font-medium mb-1 text-blue-900">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-amber-500 rounded px-3 py-2 mb-4"
        />

        <label className="block text-sm font-medium mb-1 text-blue-900">Password</label>
        <input
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border border-amber-500 rounded px-3 py-2 mb-6"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
