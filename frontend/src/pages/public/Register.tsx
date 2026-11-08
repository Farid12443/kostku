import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../utils';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (field: keyof typeof form, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/register', { ...form, phone: form.phone || null });
      toast.success('Akun berhasil dibuat, silakan masuk');
      navigate('/login', { state: location.state });
    } catch (err) {
      setError(errorMessage(err, 'Pendaftaran gagal.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900">Buat akun baru</h1>
        <p className="mt-1 text-sm text-stone-600">
          Sudah punya akun?{' '}
          <Link to="/login" state={location.state} className="font-medium text-teal-800 underline">
            Masuk di sini
          </Link>
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="name">Nama lengkap</label>
            <input id="name" required maxLength={100} autoComplete="name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password (minimal 8 karakter)</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="phone">No. HP (opsional)</label>
            <input id="phone" type="tel" maxLength={30} autoComplete="tel" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
      </div>
    </div>
  );
}
