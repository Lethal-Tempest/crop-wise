import React, { useState } from 'react';
import axios from 'axios';
import { Sprout, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

export default function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('farmer');
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '', address: '', govtId: '', gstNumber: '' // Added phone
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? `${API_URL}/login` : `${API_URL}/register`;
      const payload = isLogin ? { email: formData.email, password: formData.password } : { ...formData, role };

      const response = await axios.post(endpoint, payload);
      setToken(response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-green-500 p-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sprout className="w-8 h-8 text-slate-900" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 mb-6">
              <button type="button" onClick={() => setRole('farmer')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${role === 'farmer' ? 'bg-green-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Farmer</button>
              <button type="button" onClick={() => setRole('wholesaler')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${role === 'wholesaler' ? 'bg-green-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Wholesaler</button>
            </div>
          )}

          {!isLogin && (
            <>
              <input type="text" name="name" placeholder="Full Name / Company Name" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />

              {/* --- ADD PHONE INPUT HERE --- */}
              <input type="tel" name="phone" placeholder="Phone Number" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
              {/* ---------------------------- */}

              <textarea name="address" placeholder="Full Address" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white h-20" required />
              <input type="text" name="govtId" placeholder={role === 'farmer' ? "Aadhar/PAN Number" : "Company Registration ID"} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
              {role === 'wholesaler' && (
                <input type="text" name="gstNumber" placeholder="GST Number" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
              )}
            </>
          )}

          <input type="email" name="email" placeholder="Email Address" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
          <input type="password" name="password" placeholder="Password" onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />

          <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-slate-900 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 mt-6">
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        <p className="text-slate-400 text-center mt-6 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-green-400 font-bold hover:underline">
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}