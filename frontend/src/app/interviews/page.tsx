"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function InterviewsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await fetchApi('/interviews');
        setSessions(data);
      } catch (err) {
        console.error("Failed to load interviews", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) loadSessions();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'ONGOING': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    }
  };

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading interviews...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Interview History</h1>
          <p className="text-gray-400">{sessions.length} interview{sessions.length !== 1 ? 's' : ''} completed</p>
        </div>
        <Link href="/interviews/setup" className="btn-primary">
          + New Interview
        </Link>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session: any) => (
            <Link key={session.id} href={session.status === 'COMPLETED' ? `/interviews/${session.id}` : `/interviews/room/${session.id}`}>
              <div className="glass-panel p-6 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary-light transition-colors">{session.role}</h3>
                      <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {session.type} Interview • {session.experienceLevel} • {new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    {session.overallScore !== null && session.overallScore !== undefined ? (
                      <>
                        <p className="text-xs text-gray-400">Score</p>
                        <p className="text-2xl font-bold text-gradient">{session.overallScore}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">—</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2">No Interviews Yet</h3>
          <p className="text-gray-400 mb-6">Start your first AI-powered interview to see your results here.</p>
          <Link href="/interviews/setup" className="btn-primary">Take Your First Interview</Link>
        </div>
      )}
    </div>
  );
}
