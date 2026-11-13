import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface AppAuthFormProps {
  role: 'user' | 'driver' | 'admin';
  appTitle: string;
  appSubtitle: string;
  headerBgClass: string;
  iconBgClass: string;
  buttonClass: string;
  pageBgClass: string;
  icon: React.ReactNode;
  defaultEmailPlaceholder: string;
  onLogin: (user: User) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const AppAuthForm: React.FC<AppAuthFormProps> = ({
  role,
  appTitle,
  appSubtitle,
  headerBgClass,
  iconBgClass,
  buttonClass,
  pageBgClass,
  icon,
  defaultEmailPlaceholder,
  onLogin,
  onNotify,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const generatedId = `${role}_${Math.random().toString(36).slice(2, 10)}`;
      const displayName = name.trim() || email.split('@')[0];

      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId,
          name: displayName,
          email: email.trim().toLowerCase(),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        onNotify(data.error || 'Could not sign in.', 'error');
        return;
      }
      onLogin(data.user);
    } catch {
      onNotify('Network error while signing in.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', pageBgClass)}>
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={cn('p-6 text-white space-y-4', headerBgClass)}>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Speedx Apps
          </Link>

          <div className="flex items-center gap-3.5">
            <div className={cn('p-3 rounded-xl shrink-0', iconBgClass)}>{icon}</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display">{appTitle}</h1>
              <p className="text-white/80 text-xs mt-0.5">{appSubtitle}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              placeholder={
                role === 'driver'
                  ? 'Ramesh Kumar'
                  : role === 'admin'
                  ? 'Priya Verma'
                  : 'Aarav Sharma'
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              placeholder={defaultEmailPlaceholder}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50',
              buttonClass
            )}
          >
            {submitting ? 'Signing in...' : `Sign in to ${appTitle}`}
          </button>
        </form>
      </div>
    </div>
  );
};
