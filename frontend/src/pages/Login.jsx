import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { loginSuccess, setError, clearError, setLoading } from '../store/slices/authSlice';
import api from '../services/api';
import axios from 'axios';
import { BrainCircuit, Lock, Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function Login() {
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSentToken, setResetSentToken] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const { register: loginReg, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm();
  const { register: forgotReg, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors } } = useForm();

  // Clear errors when switching modes
  useEffect(() => {
    dispatch(clearError());
    setLocalError('');
    setSuccessMsg('');
  }, [forgotMode, dispatch]);

  // If already logged in, send to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Login handler
  const onLogin = async (data) => {
    dispatch(setLoading(true));
    dispatch(clearError());
    setLocalError('');
    try {
      const res = await axios.post('/api/v1/auth/login', data);
      dispatch(loginSuccess(res.data));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid login details';
      dispatch(setError(msg));
      setLocalError(msg);
    }
  };

  // Forgot password handler
  const onForgot = async (data) => {
    setLocalError('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/v1/auth/forgot-password', data);
      setSuccessMsg(res.data.message);
      if (res.data.resetToken) {
        setResetSentToken(res.data.resetToken);
      }
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Error executing forgot request');
    }
  };

  return (
    <div className="min-h-screen bg-glow-grid bg-dark-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4 animate-pulse-slow">
            <BrainCircuit className="h-10 w-10 text-brand-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-white font-sans">Welcome Back</h2>
          <p className="text-dark-400 mt-2 text-center text-sm">
            AI-Powered Document Intelligence Platform
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Overlay gradient decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p>{successMsg}</p>
                {resetSentToken && (
                  <div className="mt-3 p-2 rounded bg-dark-950 font-mono text-[11px] text-dark-300 select-all border border-dark-800 break-all">
                    Reset Token: {resetSentToken}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {localError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{localError}</span>
            </div>
          )}

          {!forgotMode ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    {...loginReg('email', { required: 'Email is required' })}
                    className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-rose-500 text-xs mt-1">{loginErrors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-dark-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...loginReg('password', { required: 'Password is required' })}
                    className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                  />
                </div>
                {loginErrors.password && (
                  <p className="text-rose-500 text-xs mt-1">{loginErrors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 group text-sm shadow-lg shadow-brand-600/20"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-6">
              <p className="text-sm text-dark-400 mb-4">
                Enter your email address below. We'll generate a reset token to recover your account passwords.
              </p>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    {...forgotReg('email', { required: 'Email is required' })}
                    className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                  />
                </div>
                {forgotErrors.email && (
                  <p className="text-rose-500 text-xs mt-1">{forgotErrors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  Generate Recovery Link
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="w-full py-3.5 text-sm text-dark-400 hover:text-white transition-colors"
                >
                  Cancel and Return
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Switch to Register */}
        {!forgotMode && (
          <p className="text-center text-sm text-dark-400 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
