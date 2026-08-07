"use client";

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    college: '',
    degree: '',
    skills: '',
    experience: 0,
    preferredLang: '',
    targetRole: '',
    targetCompany: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeFeedback, setResumeFeedback] = useState<any>(null);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');

  useEffect(() => {
    loadProfile();
    const savedVoice = localStorage.getItem('preferredVoiceGender');
    if (savedVoice === 'male' || savedVoice === 'female') {
      setVoiceGender(savedVoice);
    }
  }, []);

  const handleVoiceChange = (gender: 'female' | 'male') => {
    setVoiceGender(gender);
    localStorage.setItem('preferredVoiceGender', gender);
  };

  const loadProfile = async () => {
    try {
      const data = await fetchApi('/profiles/me');
      setProfile(data);
      if (data) {
        setFormData({
          college: data.college || '',
          degree: data.degree || '',
          skills: data.skills ? data.skills.join(', ') : '',
          experience: data.experience || 0,
          preferredLang: data.preferredLang || '',
          targetRole: data.targetRole || '',
          targetCompany: data.targetCompany || '',
          bio: data.bio || ''
        });
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Convert comma separated skills to array
      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      const payload = {
        ...formData,
        experience: Number(formData.experience),
        skills: skillsArray
      };

      const data = await fetchApi('/profiles/me', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setProfile(data);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingResume(true);
    const form = new FormData();
    form.append('resume', file);
    form.append('jobRole', formData.targetRole || 'Software Engineer');

    try {
      const data = await fetchApi('/resumes/upload', {
        method: 'POST',
        body: form
      });
      
      let parsedFeedback;
      try {
        parsedFeedback = typeof data.resume.feedback === 'string' ? JSON.parse(data.resume.feedback) : data.resume.feedback;
      } catch (e) {
        parsedFeedback = { atsScore: data.resume.atsScore || 0, improvementSuggestions: 'Analysis completed.' };
      }
      
      setResumeFeedback(parsedFeedback);
      // Reload profile to get any extracted skills
      loadProfile();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploadingResume(false);
    }
  };

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your profile...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="glass-panel p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-[0_0_30px_rgba(139,92,246,0.3)] border-2 border-white/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{user?.name}</h1>
              <p className="text-primary-light font-medium">{profile?.targetRole || 'Candidate'}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">✉️ {user?.email}</span>
                <span className="flex items-center gap-1">⭐ {user?.xp || 0} XP</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="btn-secondary whitespace-nowrap"
          >
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & AI Memory */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8">
            <h2 className="text-xl font-bold border-b border-white/10 pb-4 mb-6">Professional Details</h2>
            
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Target Role</label>
                    <input className="glass-input" value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})} placeholder="e.g. Full Stack Developer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Target Company</label>
                    <input className="glass-input" value={formData.targetCompany} onChange={e => setFormData({...formData, targetCompany: e.target.value})} placeholder="e.g. Google" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Experience (Years)</label>
                    <input type="number" min="0" className="glass-input" value={formData.experience} onChange={e => setFormData({...formData, experience: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Preferred Language</label>
                    <input className="glass-input" value={formData.preferredLang} onChange={e => setFormData({...formData, preferredLang: e.target.value})} placeholder="e.g. Python, TypeScript" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">College / University</label>
                    <input className="glass-input" value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Degree</label>
                    <input className="glass-input" value={formData.degree} onChange={e => setFormData({...formData, degree: e.target.value})} placeholder="e.g. B.S. Computer Science" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Bio / Summary</label>
                  <textarea className="glass-input h-24" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Tell us about yourself..."></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Skills (comma separated)</label>
                  <textarea className="glass-input h-20" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="React, Node.js, Python, AWS..."></textarea>
                </div>
                
                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                {profile?.bio && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">About</h3>
                    <p className="text-gray-200 leading-relaxed">{profile.bio}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Experience</h3>
                    <p className="text-lg text-white">{profile?.experience || '0'} Years</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Target Company</h3>
                    <p className="text-lg text-white">{profile?.targetCompany || 'Not set'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Language</h3>
                    <p className="text-lg text-white">{profile?.preferredLang || 'Not set'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <h3 className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Education</h3>
                    <p className="text-lg text-white">{profile?.degree ? `${profile.degree} at ` : ''}{profile?.college || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Skills</h3>
                  {profile?.skills && profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/10 border border-white/20 rounded-md text-sm text-gray-200 hover:bg-white/20 transition-colors">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No skills added yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* AI Memory Box */}
          <div className="glass-panel p-8 border-l-4 border-primary">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>🧠</span> AI Memory Map
            </h2>
            <p className="text-sm text-gray-400 mb-6">Our AI tracks your performance across all interviews to provide personalized questions.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <span>📈</span> Strong Topics
                </h3>
                {profile?.strongTopics && profile.strongTopics.length > 0 ? (
                  <ul className="space-y-2">
                    {profile.strongTopics.map((topic: string, i: number) => (
                      <li key={i} className="text-sm text-green-200">• {topic}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">Complete more interviews to build your strong topics profile.</p>
                )}
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <span>🎯</span> Focus Areas
                </h3>
                {profile?.weakTopics && profile.weakTopics.length > 0 ? (
                  <ul className="space-y-2">
                    {profile.weakTopics.map((topic: string, i: number) => (
                      <li key={i} className="text-sm text-yellow-200">• {topic}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No weak areas identified yet. Keep up the good work!</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Resume Upload */}
        <div className="space-y-8">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>📄</span> Resume Analysis
            </h2>
            <p className="text-sm text-gray-400 mb-6">Upload your PDF resume for instant ATS scoring and AI feedback.</p>
            
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group relative mb-6">
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📤</span>
              <p className="text-sm font-medium mb-1">Click to upload PDF</p>
              <p className="text-xs text-gray-500">Max file size 5MB</p>
              
              <input 
                type="file" 
                accept=".pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleResumeUpload} 
                disabled={uploadingResume} 
              />
              
              {uploadingResume && (
                <div className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-sm rounded-xl flex items-center justify-center flex-col">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-2"></div>
                  <span className="text-xs text-primary-light">Analyzing...</span>
                </div>
              )}
            </div>

            {resumeFeedback && (
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 rounded-lg p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Latest Results</h3>
                
                <div className="flex items-end justify-between mb-4 pb-4 border-b border-white/10">
                  <span className="text-gray-300">ATS Score</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-white">{resumeFeedback.atsScore || resumeFeedback.resumeScore || 'N/A'}</span>
                    <span className="text-gray-500 text-sm">/100</span>
                  </div>
                </div>
                
                <div>
                  <span className="block text-sm font-medium text-gray-300 mb-2">AI Suggestions:</span>
                  <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-md border border-white/5">
                    {resumeFeedback.improvementSuggestions || 'No suggestions available.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Voice Settings Panel */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>🎙️</span> Global Voice Settings
            </h2>
            <p className="text-sm text-gray-400 mb-6">Choose your preferred AI interviewer voice persona for all future interviews.</p>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleVoiceChange('female')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  voiceGender === 'female'
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-2 ring-primary/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>👩</span> Female Voice (Fluent)
              </button>
              <button
                type="button"
                onClick={() => handleVoiceChange('male')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  voiceGender === 'male'
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-2 ring-primary/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>👨</span> Male Voice
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
