import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutSuccess } from '../store/slices/authSlice';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Search, 
  ShieldAlert, 
  LogOut, 
  BrainCircuit, 
  Menu, 
  X,
  FileText,
  UserCheck
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      dispatch(logoutSuccess());
      navigate('/login');
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Semantic Search', path: '/search', icon: Search }
  ];

  if (user && user.role === 'admin') {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-glow-grid bg-dark-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-dark-800/80 border-b border-dark-700/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-brand-500 animate-pulse-slow" />
          <span className="font-extrabold text-lg bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
            DocuMind AI
          </span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-dark-300 hover:text-white p-2 rounded-lg bg-dark-700/30 border border-dark-700/50"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-dark-900/90 border-r border-dark-800/60 backdrop-blur-xl flex flex-col justify-between p-6 transition-transform duration-300 md:translate-x-0 md:static md:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-8 w-8 text-brand-500 animate-pulse-slow" />
              <span className="font-extrabold text-2xl bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
                DocuMind AI
              </span>
            </div>
            <button 
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-dark-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 border border-dark-800/50 backdrop-blur-md">
            <img 
              src={user?.avatar || 'https://via.placeholder.com/150'} 
              alt={user?.fullName} 
              className="w-12 h-12 rounded-full border-2 border-brand-500/30 object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate text-sm">{user?.fullName}</h4>
              <p className="text-xs text-dark-400 truncate flex items-center gap-1">
                {user?.role === 'admin' ? (
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20">
                    ADMIN
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-dark-700 text-dark-300 border border-dark-700">
                    USER
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 border
                    ${isActive 
                      ? 'bg-brand-500/10 border-brand-500/20 text-brand-400 shadow-[inset_0_0_12px_rgba(139,92,246,0.1)]' 
                      : 'border-transparent text-dark-300 hover:text-white hover:bg-dark-800/40 hover:border-dark-800/50'
                    }
                  `}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-brand-400' : 'text-dark-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3.5 text-red-400 hover:text-red-300 hover:bg-red-500/5 hover:border-red-500/10 border border-transparent rounded-xl font-medium transition-all duration-200 w-full mt-auto"
        >
          <LogOut className="h-5 w-5 text-red-400" />
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Email verification warning if not verified */}
        {user && !user.isVerified && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-6 py-3 text-amber-300 flex items-center justify-between gap-4 text-sm font-medium animate-pulse">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Please verify your email address to unlock all premium AI operations. Check your registration dashboard.</span>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
