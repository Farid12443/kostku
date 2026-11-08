import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { LogOut, User, Home, Building2, Calendar, CreditCard, Users, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = user
    ? user.role === 'admin'
      ? [
          { name: 'Dashboard', path: '/admin', icon: Home },
          { name: 'Kamar', path: '/admin/rooms', icon: Building2 },
          { name: 'Pemesanan', path: '/admin/bookings', icon: Calendar },
          { name: 'Pembayaran', path: '/admin/payments', icon: CreditCard },
          { name: 'Fasilitas', path: '/admin/facilities', icon: Users },
          { name: 'Pengguna', path: '/admin/users', icon: Users },
          { name: 'Pengaturan', path: '/admin/settings', icon: Settings },
        ]
      : [
          { name: 'Beranda', path: '/', icon: Home },
          { name: 'Kamar', path: '/rooms', icon: Building2 },
          { name: 'Pemesanan Saya', path: '/my/bookings', icon: Calendar },
        ]
    : [
        { name: 'Beranda', path: '/', icon: Home },
        { name: 'Kamar', path: '/rooms', icon: Building2 },
      ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-teal-600" />
              <span className="font-bold text-xl text-gray-900">Kos<span className="text-teal-600">Ku</span></span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <link.icon className="h-4 w-4" />
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user.name} ({user.role})
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-md text-sm font-medium text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-teal-600 hover:bg-teal-50"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-teal-50"
              >
                <link.icon className="h-5 w-5" />
                {link.name}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Keluar
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-teal-600 hover:bg-teal-50"
                >
                  <User className="h-5 w-5" />
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-white bg-teal-600 hover:bg-teal-700"
                >
                  <User className="h-5 w-5" />
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
