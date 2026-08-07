"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadAdminData();
  }, [user, router, page, search]);

  const loadAdminData = async () => {
    try {
      // Use Promise.all to fetch both dashboard stats and users
      const [dash, users] = await Promise.all([
        fetchApi('/admin/dashboard'),
        fetchApi(`/admin/users?page=${page}&limit=10&search=${search}`)
      ]);
      setDashboardData(dash);
      setUsersData(users);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    loadAdminData();
  };

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading admin portal...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gradient mb-2">Admin Portal</h1>
        <p className="text-gray-400">Platform overview, system logs, and user management.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-[40px] -z-10"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{dashboardData?.totalUsers || 0}</p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/20 rounded-full blur-[40px] -z-10"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Interviews</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{dashboardData?.totalInterviews || 0}</p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/20 rounded-full blur-[40px] -z-10"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Completed</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{dashboardData?.completedInterviews || 0}</p>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full blur-[40px] -z-10"></div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Platform Score</p>
          <p className="text-3xl md:text-4xl font-bold text-white">{dashboardData?.avgScore || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Management */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">User Management</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search name or email..." 
                className="glass-input text-sm py-1.5 px-3 w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="bg-white/10 hover:bg-white/20 px-3 rounded-lg text-sm transition-colors">
                Search
              </button>
            </form>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">XP / Streak</th>
                  <th className="p-3 font-medium text-center">Interviews</th>
                  <th className="p-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.users?.map((u: any) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-secondary/20 text-secondary-light' : 'bg-primary/20 text-primary-light'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="text-white">{u.xp} XP</p>
                      <p className="text-xs text-yellow-500">{u.streak} 🔥</p>
                    </td>
                    <td className="p-3 text-center text-gray-300 font-medium">
                      {u._count?.sessions || 0}
                    </td>
                    <td className="p-3 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData?.pagination && usersData.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10 text-sm">
              <span className="text-gray-400">Page {usersData.pagination.page} of {usersData.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(usersData.pagination.totalPages, p + 1))}
                  disabled={page === usersData.pagination.totalPages}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="glass-panel p-6 flex flex-col h-[600px]">
          <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
            System Logs
            <span className="text-xs font-normal text-gray-400 px-2 py-1 bg-white/10 rounded-md">Real-time</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {dashboardData?.recentLogs?.length > 0 ? (
              dashboardData.recentLogs.map((log: any) => (
                <div key={log.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      log.action.includes('LOGIN') ? 'bg-blue-500/20 text-blue-300' :
                      log.action.includes('REGISTER') ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-1">{log.user?.email || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500 font-mono">IP: {log.ipAddress || '127.0.0.1'}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center pt-8">No recent activity logs.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
