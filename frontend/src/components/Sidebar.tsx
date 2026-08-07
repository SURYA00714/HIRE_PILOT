"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Interviews', path: '/interviews', icon: '🎤' },
    { name: 'Profile', path: '/profile', icon: '👤' },
  ];

  if (user.role === 'ADMIN') {
    links.push({ name: 'Admin', path: '/admin', icon: '⚙️' });
  }

  return (
    <aside className="w-64 glass-panel m-4 flex flex-col justify-between h-[calc(100vh-2rem)] sticky top-4 left-4">
      <div>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold text-gradient tracking-wider">HIRE PILOT</h1>
        </div>
        <nav className="p-4 space-y-2">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{link.icon}</span>
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3 mb-4 px-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full btn-secondary text-sm flex items-center justify-center space-x-2"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
