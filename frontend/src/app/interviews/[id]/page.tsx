"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import Link from 'next/link';

export default function InterviewFeedbackPage() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showXpToast, setShowXpToast] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        let data;
        try {
          data = await fetchApi(`/interviews/${id}`);
        } catch {
          data = await fetchApi(`/analytics/interviews/${id}`);
        }
        setSession(data);
        
        // Show XP celebration if xpEarned exists
        if (data && data.xpEarned > 0) {
          setTimeout(() => setShowXpToast(true), 1000);
          setTimeout(() => setShowXpToast(false), 6000); // Hide after 5 seconds
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load interview feedback');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) loadSession();
  }, [id]);

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 font-medium">Analyzing Interview Performance...</p>
      </div>
    </div>
  );
  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!session) return <div className="p-8">Interview not found.</div>;

  const feedback = session.feedback;

  const getRecommendationColor = (rec: string) => {
    if (!rec) return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    if (rec.includes('STRONG_HIRE')) return 'text-green-400 border-green-500/30 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]';
    if (rec.includes('HIRE')) return 'text-primary border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]';
    if (rec.includes('MAYBE')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto relative overflow-hidden">
      
      {/* XP Toast Notification */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-700 transform ${showXpToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="glass-panel p-4 pr-12 rounded-xl border border-yellow-500/30 shadow-[0_10px_40px_rgba(234,179,8,0.2)] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>
          <div className="text-4xl relative z-10">🌟</div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">Interview Completed!</p>
            <p className="text-lg font-bold text-white">+{session.xpEarned} XP Earned</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 relative z-10">
        <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </Link>
        <div className="flex gap-4 text-sm text-gray-400 font-medium">
          <span className="flex items-center gap-1">⏱️ {formatDuration(session.duration)}</span>
          <span className="flex items-center gap-1">🏆 {session.xpEarned || 0} XP</span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="glass-panel p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
        
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10">
              {session.type}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10">
              {session.experienceLevel}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{session.role}</h1>
          <p className="text-gray-400">Completed on {new Date(session.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Overall Score</p>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-6xl md:text-7xl font-black text-gradient">
              {session.overallScore ?? feedback?.overallScore ?? '0'}
            </span>
            <span className="text-2xl text-gray-500 font-bold">/100</span>
          </div>
        </div>
      </div>

      {feedback && (
        <>
          {/* Recommendation Banner */}
          {feedback.hiringRecommendation && (
            <div className={`p-6 rounded-xl border ${getRecommendationColor(feedback.hiringRecommendation)} flex items-center justify-between`}>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-1 opacity-80">AI Hiring Decision</h3>
                <p className="text-2xl font-black">{feedback.hiringRecommendation.replace('_', ' ')}</p>
              </div>
              <div className="text-4xl opacity-50">⚖️</div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { label: 'Technical Accuracy', score: feedback.technicalAccuracy, icon: '💻', color: 'border-blue-500/30', suffix: '/100' },
              { label: 'Problem Solving', score: feedback.problemSolving, icon: '🧩', color: 'border-purple-500/30', suffix: '/100' },
              { label: 'Communication', score: feedback.communication, icon: '🗣️', color: 'border-green-500/30', suffix: '/100' },
              { label: 'Confidence', score: feedback.confidence, icon: '⭐', color: 'border-yellow-500/30', suffix: '/100' },
              { label: 'Filler Words', score: feedback.fillerWordsCount ?? 0, icon: '⚠️', color: 'border-orange-500/30', suffix: ' used' },
            ].map((metric, i) => (
              <div key={i} className={`glass-panel p-5 border-t-2 ${metric.color}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-medium text-gray-300">{metric.label}</h3>
                  <span className="text-xl opacity-80">{metric.icon}</span>
                </div>
                <p className="text-3xl font-bold text-white">{metric.score ?? 'N/A'}<span className="text-sm text-gray-500 ml-1">{metric.suffix}</span></p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Detailed Feedback */}
              <div className="glass-panel p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span>📝</span> Comprehensive Assessment
                </h2>
                <div className="prose prose-invert max-w-none text-gray-300">
                  <p className="leading-relaxed text-lg">{feedback.detailedFeedback}</p>
                </div>
              </div>

              {/* Q&A History */}
              {session.questions && session.questions.length > 0 && (
                <div className="glass-panel p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span>💬</span> Interview Transcript
                  </h2>
                  <div className="space-y-8">
                    {session.questions.map((q: any, i: number) => (
                      <div key={i} className="space-y-4 pb-8 border-b border-white/5 last:border-0 last:pb-0">
                        <div>
                          <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block">Question {q.orderIndex}</span>
                          <p className="text-lg font-medium text-white">{q.questionText}</p>
                        </div>
                        <div className="bg-white/5 p-5 rounded-lg border border-white/5">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Your Answer</span>
                          <p className="text-gray-300 italic">{q.answerText || 'No answer provided.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* Strengths & Weaknesses */}
              <div className="glass-panel p-6">
                <h2 className="text-xl font-bold mb-6 text-white">Performance Breakdown</h2>
                
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-green-400 mb-4 flex items-center uppercase tracking-wider"><span className="mr-2 text-lg">✓</span> Strengths</h3>
                  <ul className="space-y-3">
                    {(feedback.strengths || []).map((strength: string, i: number) => (
                      <li key={i} className="flex items-start bg-green-500/5 p-3 rounded-md border border-green-500/10">
                        <span className="text-sm text-gray-200">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-yellow-400 mb-4 flex items-center uppercase tracking-wider"><span className="mr-2 text-lg">△</span> Areas to Improve</h3>
                  <ul className="space-y-3">
                    {(feedback.weaknesses || []).map((area: string, i: number) => (
                      <li key={i} className="flex items-start bg-yellow-500/5 p-3 rounded-md border border-yellow-500/10">
                        <span className="text-sm text-gray-200">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Topics */}
              {feedback.recommendedTopics && feedback.recommendedTopics.length > 0 && (
                <div className="glass-panel p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>📚</span> Study Guide
                  </h2>
                  <p className="text-sm text-gray-400 mb-4">Focus on these topics before your next interview:</p>
                  <div className="flex flex-wrap gap-2">
                    {feedback.recommendedTopics.map((topic: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary-light border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors cursor-default">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!feedback && (
        <div className="glass-panel p-12 text-center text-gray-400 flex flex-col items-center justify-center">
          <span className="text-4xl mb-4">⏳</span>
          <h2 className="text-xl font-bold text-white mb-2">Evaluation Pending</h2>
          <p>This interview is still in progress or the AI is currently finalizing your evaluation.</p>
        </div>
      )}
    </div>
  );
}
