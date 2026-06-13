import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { BrainCircuit, Lock, Mail, User, ArrowRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function Register() {
  const [successMsg, setSuccessMsg] = useState('');
  const [simToken, setSimToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Handle register submission
  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSimToken('');
    try {
      const res = await axios.post('/api/v1/auth/register', data);
      setSuccessMsg(res.data.message);
      if (res.data.verificationToken) {
        setSimToken(res.data.verificationToken);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Simulate verification link click
  const handleSimulateVerification = async () => {
    if (!simToken) return;
    setVerifying(true);
    try {
      await axios.get(`/api/v1/auth/verify-email?token=${simToken}`);
      setSuccessMsg('Email verified successfully! Redirecting to login in 3 seconds...');
      setSimToken('');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
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
          <h2 className="text-3xl font-extrabold text-white">Create Account</h2>
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
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
              
              {simToken && (
                <div className="p-3 rounded-lg bg-dark-950/60 border border-dark-800 flex flex-col gap-2">
                  <p className="text-xs text-dark-300">
                    <strong>Developer Simulator:</strong> Rather than setting up SMTP, click below to verify email instantly.
                  </p>
                  <button
                    onClick={handleSimulateVerification}
                    disabled={verifying}
                    className="py-1.5 px-3 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded text-xs font-semibold hover:bg-brand-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {verifying ? 'Verifying...' : 'Simulate Email Verification Link'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2 font-sans">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  {...register('fullName', { required: 'Name is required' })}
                  className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                />
              </div>
              {errors.fullName && (
                <p className="text-rose-500 text-xs mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', { 
                    required: 'Password is required', 
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  className="w-full bg-dark-900/50 border border-dark-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 transition-colors text-sm"
                />
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 group text-sm shadow-lg shadow-brand-600/20"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </div>

        {/* Switch to Login */}
        <p className="text-center text-sm text-dark-400 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
