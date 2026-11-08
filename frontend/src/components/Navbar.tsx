import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X } from 'lucide-react';
import { kosQuery } from '../api';
import { useAuth } from '../auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-50 text-teal-800' : 'text-stone-700 hover:bg-stone-100'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { data: kos } = useQuery(kosQuery);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={close}>
        Beranda
      </NavLink>
      <NavLink to="/rooms" className={linkClass} onClick={close}>
        Kamar
      </NavLink>
      {user?.role === 'user' && (
        <NavLink to="/my/bookings" className={linkClass} onClick={close}>
          Booking Saya
        </NavLink>
      )}
      {user?.role === 'admin' && (
        <NavLink to="/admin" className={linkClass} onClick={close}>
          Panel Admin
        </NavLink>
      )}
      {user ? (
        <button type="button" onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50">
          Keluar
        </button>
      ) : (
        <>
          <NavLink to="/login" className={linkClass} onClick={close}>
            Masuk
          </NavLink>
          <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>
            Daftar
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold text-teal-800">
          {kos?.name ?? 'Kos'}
        </Link>
        <div className="hidden items-center gap-1 md:flex">{links}</div>
        <button
          type="button"
          className="rounded-md p-2 text-stone-700 hover:bg-stone-100 md:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>
      {open && <div className="flex flex-col gap-1 border-t border-stone-200 p-3 md:hidden">{links}</div>}
    </nav>
  );
}
