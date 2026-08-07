"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await fetchApi('/analytics/dashboard');
        setData(result);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) loadDashboard();
  }, [user]);

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  );

  const maxScore = Math.max(...(data?.scoresOverTime?.map((s: any) => s.score) || [100]), 100);

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-gray-400">Here's your interview performance overview.</p>
        </div>
        <Link href="/interviews/setup" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Start Interview
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-[40px] -z-10 group-hover:bg-primary/30 transition-all"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Interviews</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{data?.totalInterviews || 0}</p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/20 rounded-full blur-[40px] -z-10 group-hover:bg-secondary/30 transition-all"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Score</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{data?.avgScore || 0}<span className="text-lg text-gray-500">/100</span></p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full blur-[40px] -z-10 group-hover:bg-accent/30 transition-all"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">XP Earned</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{data?.totalXp || 0}</p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-[40px] -z-10 group-hover:bg-yellow-500/30 transition-all"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">🔥 Streak</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{data?.streak || 0}<span className="text-lg text-gray-500"> days</span></p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score History Chart */}
        <div className="glass-panel p-6 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4">Score Trend</h2>
          {data?.scoresOverTime && data.scoresOverTime.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {data.scoresOverTime.slice(-12).map((entry: any, i: number) => {
                const height = Math.max((entry.score / maxScore) * 100, 8);
                const color = entry.score >= 80 ? 'bg-green-500' : entry.score >= 60 ? 'bg-primary' : entry.score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {entry.score}% • {entry.type}
                    </div>
                    <div className={`w-full ${color} rounded-t-md transition-all group-hover:opacity-80`} style={{ height: `${height}%` }}></div>
                    <span className="text-[10px] text-gray-500">{new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
              Complete interviews to see your score trend
            </div>
          )}
        </div>

        {/* Type Breakdown */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold mb-4">By Category</h2>
          {data?.typeBreakdown && Object.keys(data.typeBreakdown).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(data.typeBreakdown).map(([type, info]: [string, any]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{type}</span>
                    <span className="text-gray-400">{info.avgScore}% avg · {info.count}x</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all" style={{ width: `${info.avgScore}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Interviews & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Interviews */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Recent Interviews</h2>
            <Link href="/interviews" className="text-sm text-primary-light hover:text-primary transition-colors">View all →</Link>
          </div>
          {data?.recentInterviews && data.recentInterviews.length > 0 ? (
            <div className="space-y-3">
              {data.recentInterviews.map((session: any) => (
                <Link key={session.id} href={session.status === 'COMPLETED' ? `/interviews/${session.id}` : `/interviews/room/${session.id}`}>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <h4 className="font-medium text-sm">{session.role}</h4>
                      <p className="text-xs text-gray-500">{session.type} • {new Date(session.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gradient">{session.overallScore ?? '—'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">No interviews yet.</p>
              <Link href="/interviews/setup" className="btn-primary text-sm">Take your first interview</Link>
            </div>
          )}
        </div>

        {/* Achievements / Quick Actions */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/interviews/setup" className="block p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-medium text-sm">Practice Interview</p>
                  <p className="text-xs text-gray-500">Start an AI-powered session</p>
                </div>
              </div>
            </Link>
            <Link href="/profile" className="block p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-sm">Upload Resume</p>
                  <p className="text-xs text-gray-500">Get AI-powered ATS analysis</p>
                </div>
              </div>
            </Link>
            <Link href="/interviews" className="block p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-sm">View History</p>
                  <p className="text-xs text-gray-500">Review past interviews</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Resume Score Card */}
          {data?.resumeScore && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20">
              <p className="text-xs text-gray-400 mb-1">ATS Resume Score</p>
              <p className="text-2xl font-bold">{data.resumeScore}<span className="text-sm text-gray-400">/100</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
