"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';

export default function InterviewSetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    type: 'Behavioral',
    role: 'Software Engineer',
    experienceLevel: 'Mid-Level',
    inputMode: 'text'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchApi('/interviews/setup', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      // Navigate to the live room with the generated session ID
      router.push(`/interviews/room/${response.sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize interview session');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Configure Your Interview</h1>
        <p className="text-gray-400">Tailor the AI interviewer to your target role and experience.</p>
      </div>

      <div className="glass-panel p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Target Role</label>
              <input
                type="text"
                required
                className="glass-input"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                placeholder="e.g. Frontend Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Experience Level</label>
              <select
                className="glass-input"
                value={formData.experienceLevel}
                onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})}
              >
                <option value="Junior">Junior (0-2 years)</option>
                <option value="Mid-Level">Mid-Level (3-5 years)</option>
                <option value="Senior">Senior (6+ years)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Interview Type</label>
            <div className="grid grid-cols-3 gap-4">
              {['Behavioral', 'Technical', 'System Design'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, type})}
                  className={`p-4 rounded-lg border transition-all ${
                    formData.type === type 
                      ? 'border-primary bg-primary/20 text-white' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Input Mode (Future Support)</label>
            <div className="flex space-x-4">
              <button
                type="button"
                className="flex-1 p-3 rounded-lg border border-primary bg-primary/20 text-white"
              >
                📝 Text Chat
              </button>
              <button
                type="button"
                disabled
                className="flex-1 p-3 rounded-lg border border-white/5 bg-white/5 text-gray-500 cursor-not-allowed opacity-50"
              >
                🎙️ Voice (Coming Soon)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-4 text-lg mt-8"
          >
            {isLoading ? 'Initializing AI Engine...' : 'Start Interview Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
