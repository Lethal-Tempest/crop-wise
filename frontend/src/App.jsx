import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Auth from './components/Auth';
import FarmerDashboard from './components/FarmerDashboard';
import WholesalerDashboard from './components/WholesalerDashboard';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        localStorage.setItem('token', token);
      } catch (error) {
        handleLogout();
      }
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  if (!token || !user) {
    return <Auth setToken={setToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans selection:bg-green-500/30">
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CropWise <span className="text-green-400">Market</span>
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest">{user.role} Portal</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">Welcome, {user.name}</span>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="p-6 md:p-12 max-w-7xl mx-auto">
        {user.role === 'farmer' ? (
          <FarmerDashboard user={user} />
        ) : (
          <WholesalerDashboard user={user} />
        )}
      </main>
    </div>
  );
}