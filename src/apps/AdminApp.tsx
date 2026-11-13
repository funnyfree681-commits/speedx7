import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  FileCheck2,
  Car,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { User, Ride, DriverDocument, PaymentTransaction } from '../types';
import { AppAuthForm } from '../components/AppAuthForm';
import { cn, formatINR } from '../lib/utils';

const ADMIN_STORAGE_KEY = 'swiftride_admin_session';

interface AdminStats {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalRevenue: number;
  pendingDocs: number;
  verifiedDrivers: number;
  paidVolume?: number;
}

export const AdminApp: React.FC<{
  onNotify: (message: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  };

  if (!user) {
    return (
      <AppAuthForm
        role="admin"
        appTitle="Speedx Admin"
        appSubtitle="Driver KYC Verification, INR Tariffs & Rides Monitor"
        headerBgClass="bg-[#1E1B4B]"
        iconBgClass="bg-indigo-500 text-white"
        buttonClass="bg-indigo-600 hover:bg-indigo-700 text-white"
        pageBgClass="bg-[#F4F6FB]"
        icon={<ShieldCheck className="w-6 h-6" />}
        defaultEmailPlaceholder="ops.admin@speedx.in"
        onLogin={handleLogin}
        onNotify={onNotify}
      />
    );
  }

  const navItems = [
    { to: '/admin', label: 'KYC Verification', icon: FileCheck2 },
    { to: '/admin/rides', label: 'Rides Ledger', icon: Car },
    { to: '/admin/payments', label: 'Payments Ledger', icon: Wallet },
    { to: '/admin/settings', label: 'INR Fare Config', icon: SettingsIcon },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-5 bg-[#1E1B4B] text-white">
      <div className="flex items-center justify-between mb-6">
        <Link to="/admin" className="flex items-center gap-2.5 whitespace-nowrap">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-display block leading-none">
              Speedx
            </span>
            <span className="text-[11px] font-medium text-indigo-300">Admin Console</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-indigo-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-indigo-500 text-white font-semibold'
                  : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-5 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-indigo-200" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-indigo-200/70 truncate">{user.email}</p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 w-full rounded-lg text-xs font-medium text-indigo-100/80 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch App</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-2 w-full rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/15"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F6FB] text-slate-900 overflow-hidden">
      <aside className="hidden md:block w-64 shrink-0 h-full">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-500">
              Speedx Admin / {navItems.find((n) => n.to === location.pathname)?.label || 'Console'}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500">Operations · India</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AdminOverviewStrip />
          <div className="mt-6">
            <Routes>
              <Route index element={<AdminKycView onNotify={onNotify} />} />
              <Route path="rides" element={<AdminRidesView />} />
              <Route path="payments" element={<AdminPaymentsView />} />
              <Route path="settings" element={<AdminSettingsView onNotify={onNotify} />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminOverviewStrip: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalRides: 0,
    activeRides: 0,
    completedRides: 0,
    totalRevenue: 0,
    pendingDocs: 0,
    verifiedDrivers: 0,
    paidVolume: 0,
  });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.totalRides === 'number') setStats(data);
      })
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Rides', value: String(stats.totalRides), valueClass: 'text-slate-900' },
    { label: 'Active Rides', value: String(stats.activeRides), valueClass: 'text-indigo-600' },
    { label: 'Pending KYC Docs', value: String(stats.pendingDocs), valueClass: 'text-amber-600' },
    { label: 'Completed Revenue', value: formatINR(stats.totalRevenue), valueClass: 'text-emerald-700' },
    { label: 'Paid Volume', value: formatINR(stats.paidVolume || 0), valueClass: 'text-indigo-700' },
  ];

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">{c.label}</p>
          <p className={cn('text-xl font-mono tabular-nums font-bold mt-1', c.valueClass)}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
};

const AdminKycView: React.FC<{
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [previewDoc, setPreviewDoc] = useState<DriverDocument | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadDocs = () => {
    fetch('/api/admin/documents')
      .then((res) => res.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleVerify = async (docId: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      const res = await fetch(`/api/admin/documents/${docId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason }),
      });
      if (!res.ok) {
        onNotify('Could not update document status.', 'error');
        return;
      }
      setRejectingId(null);
      setRejectReason('');
      loadDocs();
      onNotify(`Document marked as ${status}.`, 'success');
    } catch {
      onNotify('Network error updating document.', 'error');
    }
  };

  const filtered = documents.filter((d) => (filter === 'all' ? true : d.status === filter));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Driver KYC Document Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify Aadhaar Card, PAN Card, Driving License & Vehicle RC submissions
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          {(['all', 'pending', 'verified', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors',
                filter === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">No documents in this view</p>
            <p className="text-xs text-slate-500 mt-1">
              Drivers upload Aadhaar, PAN, Driving License, and Vehicle RC in the Driver Partner app.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Number & Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">
                        {doc.driver_name || doc.holder_name}
                      </p>
                      <p className="text-xs text-slate-500">{doc.driver_email || doc.driver_id}</p>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-xs font-semibold text-slate-700">
                      {doc.doc_type === 'rc' ? 'Vehicle RC' : doc.doc_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-xs font-semibold text-slate-900">
                        {doc.doc_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        {doc.holder_name}
                        {doc.vehicle_model ? ` · ${doc.vehicle_model}` : ''}
                        {doc.expiry_date ? ` · Exp ${doc.expiry_date}` : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold capitalize">
                      {doc.status === 'verified' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                      {doc.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {doc.file_data && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md"
                            title="Inspect document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleVerify(doc.id, 'verified')}
                          className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(doc.id);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-md hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Document</h3>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (e.g. Blur image / Number mismatch)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerify(rejectingId, 'rejected', rejectReason)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  {previewDoc.doc_type} · {previewDoc.holder_name}
                </h3>
                <p className="text-xs font-mono text-slate-500">{previewDoc.doc_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewDoc.file_data?.startsWith('data:image/') ? (
              <img
                src={previewDoc.file_data}
                alt={`${previewDoc.doc_type} copy`}
                className="w-full max-h-[60vh] object-contain rounded-lg bg-slate-50 border border-slate-200"
              />
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                File: {previewDoc.file_name || 'Uploaded document'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminRidesView: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    fetch('/api/rides')
      .then((res) => res.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">All Rides Ledger</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rides.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No rides recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Ride ID</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Fare</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rides.map((ride) => (
                  <tr key={ride.id}>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{ride.id}</td>
                    <td className="py-3 px-4 text-slate-900">
                      {ride.pickup_address} → {ride.dropoff_address}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs font-semibold">{ride.status}</td>
                    <td className="py-3 px-4 text-xs font-mono uppercase">
                      <span
                        className={
                          ride.payment_status === 'paid'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700'
                        }
                      >
                        {ride.payment_method || 'upi'} · {ride.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {formatINR(ride.fare)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                      {new Date(ride.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminSettingsView: React.FC<{
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [settings, setSettings] = useState({
    base_fare: '30.00',
    per_km: '12.00',
    per_minute: '2.00',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const s: any = {};
        data.forEach((item: any) => (s[item.key] = item.value));
        setSettings((prev) => ({ ...prev, ...s }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      onNotify('INR fare configuration saved.', 'success');
    } catch {
      onNotify('Failed to save settings.', 'error');
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200 space-y-6"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900">India Fare Configuration (INR ₹)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Fare Formula: Base Fare + (Distance km × Per KM) + (Duration min × Per Minute)
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Base Fare (₹)
          </label>
          <input
            type="number"
            step="0.5"
            value={settings.base_fare}
            onChange={(e) => setSettings({ ...settings, base_fare: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Per KM Rate (₹)
          </label>
          <input
            type="number"
            step="0.5"
            value={settings.per_km}
            onChange={(e) => setSettings({ ...settings, per_km: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Per Minute Rate (₹)
          </label>
          <input
            type="number"
            step="0.5"
            value={settings.per_minute}
            onChange={(e) => setSettings({ ...settings, per_minute: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        Save Configuration
      </button>
    </form>
  );
};

const AdminPaymentsView: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'ride_payment' | 'wallet_topup' | 'driver_payout'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments')
      .then((res) => res.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter((t) => (filter === 'all' ? true : t.type === filter));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments & Payouts Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            All UPI, Card, Speedx Wallet top-ups, ride checkouts, and partner UPI withdrawals
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start flex-wrap">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'ride_payment', label: 'Ride Payment' },
              { id: 'wallet_topup', label: 'Wallet Top-up' },
              { id: 'driver_payout', label: 'Driver Payout' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                filter === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading payments ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No payment transactions recorded in this category yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Method & UPI/Card</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{tx.transaction_ref}</td>
                    <td className="py-3 px-4 capitalize text-xs font-semibold text-slate-800">
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{tx.user_name || tx.user_id}</p>
                      {tx.user_email && <p className="text-xs text-slate-500">{tx.user_email}</p>}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {tx.method.toUpperCase()}
                      {tx.upi_id ? ` · ${tx.upi_id}` : ''}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize text-emerald-700">
                      {tx.status}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
