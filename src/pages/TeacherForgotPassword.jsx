import { useState, useEffect } from 'react';
import api from '../api/axios';

const TeacherForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Email is invalid');
      return;
    }
    setError('');
    setLoading(true);
    try {
      console.log('Sending OTP request:', { email });
      const response = await api.post('/auth/teacher-send-otp', { email });
      console.log('OTP send response:', response.data);
      setStep(2);
      setTimer(60);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      console.log('Resending OTP request:', { email });
      const response = await api.post('/auth/teacher-send-otp', { email });
      console.log('OTP resend response:', response.data);
      setTimer(60);
    } catch (err) {
      console.error('OTP resend error:', err);
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }
    if (!newPassword.trim()) {
      setError('Password is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      console.log('Reset password request:', { email, otp, newPassword });
      const response = await api.post('/auth/teacher-reset-password', {
        email,
        otp,
        newPassword,
      });
      console.log('Reset password response:', response.data);
      setSuccessMessage('Password reset successful! Redirecting...');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0c0-1.657-1.343-3-3-3s-3 1.343-3 3m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={!email.trim() || loading || timer > 0}
            className="w-full rounded-3xl bg-sky-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-lg"
          >
            {loading ? 'Sending OTP...' : timer > 0 ? `Resend in ${timer}s` : 'Send OTP'}
          </button>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-600">
              Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email || 'your email'}</span>
            </p>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">OTP Code</label>
            <div className="flex justify-between gap-3">
              {Array.from({ length: 6 }, (_, idx) => (
                <input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[idx] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/^[0-9]?$/.test(value)) return;
                    const newOtp = otp.split('');
                    newOtp[idx] = value;
                    setOtp(newOtp.join(''));
                    if (value && idx < 5) {
                      document.getElementById(`otp-${idx + 1}`)?.focus();
                    }
                  }}
                  id={`otp-${idx}`}
                  className="h-14 w-full min-w-[3rem] rounded-3xl border border-slate-200 bg-slate-50 text-center text-xl font-semibold text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              ))}
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || timer > 0}
              className="flex-1 rounded-3xl border border-slate-200 bg-slate-100 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Resending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
            </button>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
              className="flex-1 rounded-3xl bg-sky-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        {successMessage ? (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Success!</h3>
              <p className="mt-2 text-sm text-slate-600">{successMessage}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-14 text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!newPassword.trim() || otp.length !== 6 || loading}
              className="w-full rounded-3xl bg-sky-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-lg"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 py-10">
      <div className="w-full max-w-7xl rounded-3xl bg-white shadow-[0_35px_90px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex items-center justify-center bg-gradient-to-br from-sky-950 via-sky-800 to-sky-600 px-10 py-14">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute right-10 bottom-10 h-36 w-36 rounded-full bg-blue-200/10 blur-3xl"></div>
            </div>
            <div className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center text-center text-white">
              <div className="mb-12 flex items-center justify-center">
                <div className="h-64 w-64 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-[0_30px_80px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
                  <img
                    src="/aclc-admin.png"
                    alt="ACLC Logo"
                    className="h-62 w-100 rounded-full object-cover"
                  />
                </div>
              </div>
              <p className="text-lg font-medium tracking-wide text-blue-100 leading-relaxed max-w-xs">
                Empowering teachers. Building better futures.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center px-8 py-12 sm:px-12 bg-white">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-semibold text-slate-900">Forgot Password</h2>
                <p className="mt-3 text-sm text-slate-500">Enter your email and we’ll send you a reset code</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                {renderStepContent()}

                <button
                  type="button"
                  onClick={onBack}
                  className="mt-6 w-full rounded-3xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-sky-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherForgotPassword;
