"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  // Simple password strength calculator
  useEffect(() => {
    let strength = 0;
    if (password.length > 7) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (passwordStrength < 50) {
      setError('Password is too weak. Please use a mix of letters, numbers, and symbols.');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      login(response.token, response.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 50) return 'bg-red-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (password.length === 0) return '';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Fair';
    return 'Strong';
  };

  return (
    <div className="flex min-h-screen -m-4 bg-[#0f111a] items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] -z-10"></div>

      <div className="w-full max-w-md glass-panel p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <span className="text-2xl font-black tracking-tighter text-white">HIRE<span className="text-primary-light">PILOT</span></span>
          </Link>
          <h1 className="text-3xl font-bold text-gradient mb-2">Create Account</h1>
          <p className="text-gray-400">Join the AI interview revolution</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <span className="text-red-400 mt-0.5">⚠</span>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              required
              className="glass-input transition-colors focus:bg-white/5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="glass-input transition-colors focus:bg-white/5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <span className={`text-xs font-medium ${
                passwordStrength < 50 ? 'text-red-400' : passwordStrength < 75 ? 'text-yellow-400' : 'text-green-400'
              }`}>{getStrengthText()}</span>
            </div>
            <input
              type="password"
              required
              className="glass-input transition-colors focus:bg-white/5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            
            {/* Password Strength Meter */}
            <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-300 ease-out ${getStrengthColor()}`}
                style={{ width: `${passwordStrength}%` }}
              ></div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3.5 text-lg shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-light font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
