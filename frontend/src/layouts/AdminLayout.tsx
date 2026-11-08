import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BedDouble, CalendarCheck, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Users, Wallet } from 'lucide-react';
import { useAuth } from '../auth';

const MENU = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { name: 'Kamar', path: '/admin/rooms', icon: BedDouble },
  { name: 'Fasilitas', path: '/admin/facilities', icon: ListChecks },
  { name: 'Booking', path: '/admin/bookings', icon: CalendarCheck },
  { name: 'Pembayaran', path: '/admin/payments', icon: Wallet },
  { name: 'Penyewa', path: '/admin/users', icon: Users },
  { name: 'Profil Kos', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen md:flex">
      {open && <div className="fixed inset-0 z-40 bg-stone-900/50 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-teal-950 text-teal-50 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" className="px-5 py-5 text-lg font-bold">
          Panel Admin Kos
        </Link>
        <nav className="flex-grow space-y-1 overflow-y-auto px-3">
          {MENU.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-900'
                }`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={handleLogout} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-teal-100 hover:bg-teal-900">
          <LogOut className="h-5 w-5" aria-hidden />
          Keluar
        </button>
      </aside>

      <div className="flex min-w-0 flex-grow flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 md:px-8">
          <button type="button" className="rounded-md p-2 text-stone-700 hover:bg-stone-100 md:hidden" aria-label="Buka menu" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <p className="ml-auto text-sm font-medium text-stone-800">{user?.name}</p>
        </header>
        <main className="flex-grow p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
