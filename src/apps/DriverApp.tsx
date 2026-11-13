import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  FileCheck2,
  IndianRupee,
  Navigation,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Power,
  User as UserIcon,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { User, Ride, DriverDocument, PaymentTransaction } from '../types';
import { useSocket } from '../hooks/useSocket';
import Map from '../components/Map';
import { DriverDocuments } from '../components/DriverDocuments';
import { AppAuthForm } from '../components/AppAuthForm';
import { DriverWithdrawModal } from '../components/PaymentModals';
import { cn, formatINR } from '../lib/utils';
import { INDIAN_CITIES } from '../data/indiaCities';

const DRIVER_STORAGE_KEY = 'swiftride_driver_session';

export const DriverApp: React.FC<{
  onNotify: (message: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(DRIVER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(Boolean(user?.is_online ?? true));
  const location = useLocation();
  const socket = useSocket(user?.id);

  const syncUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));
  };

  const refreshUser = () => {
    if (!user?.id) return;
    fetch(`/api/users/${user.id}`)
      .then((res) => res.json())
      .then((fresh) => {
        if (fresh && fresh.id) syncUser(fresh);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshUser();
  }, [user?.id]);

  const handleLogin = (u: User) => {
    setUser(u);
    setIsOnline(true);
    localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(u));
    fetch(`/api/drivers/${u.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: true }),
    }).catch(() => {});
  };

  const handleLogout = () => {
    if (user) {
      fetch(`/api/drivers/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: false }),
      }).catch(() => {});
    }
    setUser(null);
    localStorage.removeItem(DRIVER_STORAGE_KEY);
  };

  const toggleDuty = async () => {
    if (!user) return;
    const next = !isOnline;
    setIsOnline(next);
    try {
      await fetch(`/api/drivers/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: next }),
      });
      onNotify(next ? 'You are now Online and accepting rides.' : 'You are now Offline.', 'success');
    } catch {
      onNotify('Could not update duty status.', 'error');
    }
  };

  if (!user) {
    return (
      <AppAuthForm
        role="driver"
        appTitle="Speedx Partner"
        appSubtitle="Driver Duty Console & Aadhaar / PAN / DL / RC KYC"
        headerBgClass="bg-slate-900"
        iconBgClass="bg-amber-400 text-slate-950"
        buttonClass="bg-amber-400 hover:bg-amber-300 text-slate-950"
        pageBgClass="bg-[#FAF8F2]"
        icon={<Car className="w-6 h-6" />}
        defaultEmailPlaceholder="ramesh.partner@example.in"
        onLogin={handleLogin}
        onNotify={onNotify}
      />
    );
  }

  const navItems = [
    { to: '/driver', label: 'Duty & Requests', icon: Navigation },
    { to: '/driver/documents', label: 'KYC Documents', icon: FileCheck2 },
    { to: '/driver/earnings', label: 'Earnings & Trips', icon: IndianRupee },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-5 bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-6">
        <Link to="/driver" className="flex items-center gap-2.5 whitespace-nowrap">
          <div className="p-2 bg-amber-400 text-slate-950 rounded-lg">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-display block leading-none">
              Speedx
            </span>
            <span className="text-[11px] font-medium text-amber-300">Driver Partner</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-slate-300 hover:text-white"
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
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
          <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 w-full rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
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
    <div className="flex h-screen bg-[#FAF8F2] text-slate-900 overflow-hidden">
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
              Speedx Partner / {navItems.find((n) => n.to === location.pathname)?.label || 'Duty'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/driver/earnings"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-700" />
              <span>Balance:</span>
              <span className="font-mono tabular-nums font-bold">{formatINR(user.balance)}</span>
            </Link>
            <button
              type="button"
              onClick={toggleDuty}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap',
                isOnline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              )}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Online · On Duty' : 'Offline'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route
              index
              element={
                <DriverDutyView
                  user={user}
                  isOnline={isOnline}
                  socket={socket}
                  onRefreshUser={refreshUser}
                  onNotify={onNotify}
                />
              }
            />
            <Route
              path="documents"
              element={<DriverDocuments user={user} socket={socket} onNotify={onNotify} />}
            />
            <Route
              path="earnings"
              element={
                <DriverEarningsView
                  user={user}
                  onUserUpdated={syncUser}
                  onNotify={onNotify}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const DriverDutyView: React.FC<{
  user: User;
  isOnline: boolean;
  socket: ReturnType<typeof useSocket>;
  onRefreshUser: () => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, isOnline, socket, onRefreshUser, onNotify }) => {
  const navigate = useNavigate();
  const [selectedCityId, setSelectedCityId] = useState('delhi');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [docs, setDocs] = useState<DriverDocument[]>([]);
  const [completedRides, setCompletedRides] = useState<Ride[]>([]);

  const selectedCity = useMemo(
    () => INDIAN_CITIES.find((c) => c.id === selectedCityId) || INDIAN_CITIES[0],
    [selectedCityId]
  );

  useEffect(() => {
    fetch(`/api/drivers/${user.id}/documents`)
      .then((res) => res.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch(`/api/rides?userId=${user.id}&role=driver`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompletedRides(data.filter((r) => r.status === 'completed'));
          const ongoing = data.find((r) => r.status === 'accepted' || r.status === 'ongoing');
          if (ongoing) setActiveRide(ongoing);
        }
      })
      .catch(() => {});
  }, [user.id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_ride_request', (request) => {
      if (!isOnline) return;
      setRequests((prev) => (prev.some((r) => r.id === request.id) ? prev : [request, ...prev]));
    });

    socket.on('ride_status_updated', (ride: Ride) => {
      if (ride.status !== 'pending') {
        setRequests((prev) => prev.filter((r) => r.id !== ride.id));
      }
      if (ride.driver_id === user.id) {
        if (ride.status === 'completed') {
          setActiveRide(null);
          setCompletedRides((prev) =>
            prev.some((r) => r.id === ride.id)
              ? prev.map((r) => (r.id === ride.id ? ride : r))
              : [ride, ...prev]
          );
          onRefreshUser();
          onNotify(`Trip completed! ${formatINR(ride.fare)} added to your payout balance.`, 'success');
        } else {
          setActiveRide(ride);
        }
      }
    });

    return () => {
      socket.off('new_ride_request');
      socket.off('ride_status_updated');
    };
  }, [socket, user.id, isOnline, onRefreshUser, onNotify]);

  const handleAccept = (rideId: string) => {
    socket?.emit('accept_ride', { rideId, driverId: user.id });
    setRequests((prev) => prev.filter((r) => r.id !== rideId));
  };

  const handleStart = () => {
    if (activeRide) socket?.emit('start_ride', activeRide.id);
  };

  const handleComplete = () => {
    if (activeRide) socket?.emit('complete_ride', activeRide.id);
  };

  const verifiedCount = docs.filter((d) => d.status === 'verified').length;
  const totalEarnings = completedRides.reduce((sum, r) => sum + r.fare, 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-400 text-slate-950 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Driver KYC Verification (Aadhaar · PAN · Driving License · Vehicle RC)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {docs.length}/4 documents uploaded · {verifiedCount}/4 verified by admin
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/driver/documents')}
          className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
        >
          {docs.length < 4 ? 'Upload KYC Documents' : 'Manage KYC Documents'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Incoming Ride Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isOnline
                    ? `${requests.length} live request(s) across India`
                    : 'Switch Online in the top bar to receive ride requests'}
                </p>
              </div>
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
              >
                {Object.entries(
                  INDIAN_CITIES.reduce<Record<string, typeof INDIAN_CITIES>>((acc, city) => {
                    if (!acc[city.state]) acc[city.state] = [];
                    acc[city.state].push(city);
                    return acc;
                  }, {})
                ).map(([state, cities]) => (
                  <optgroup key={state} label={state}>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {requests.length === 0 && !activeRide && (
                <div className="flex flex-col items-center py-10 text-slate-400">
                  <Navigation className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">
                    {isOnline ? 'Waiting for rider requests...' : 'You are currently Offline'}
                  </p>
                </div>
              )}

              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {req.pickupAddress} → {req.dropoffAddress}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      ID: {req.id} · Mode: {(req.paymentMethod || 'upi').toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-mono tabular-nums font-bold text-emerald-700">
                      {formatINR(req.fare)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAccept(req.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Accept Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-[380px] h-[380px]">
            <Map
              center={selectedCity.center}
              zoom={selectedCity.zoom}
              selectedCity={selectedCity}
              pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : undefined}
              dropoff={activeRide ? [activeRide.dropoff_lat, activeRide.dropoff_lng] : undefined}
              pickupLabel={activeRide?.pickup_address}
              dropoffLabel={activeRide?.dropoff_address}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {activeRide ? (
            <div className="bg-white p-6 rounded-xl border-2 border-emerald-600 space-y-5">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Active Ride</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Pickup</p>
                  <p className="font-medium text-slate-900">{activeRide.pickup_address}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dropoff</p>
                  <p className="font-medium text-slate-900">{activeRide.dropoff_address}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-slate-500">Trip Fare</span>
                  <span className="text-lg font-mono tabular-nums font-bold text-emerald-700">
                    {formatINR(activeRide.fare)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Payment</span>
                  <span
                    className={cn(
                      'font-semibold inline-flex items-center gap-1',
                      activeRide.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                    )}
                  >
                    {activeRide.payment_status === 'paid' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {(activeRide.payment_method || 'upi').toUpperCase()} ·{' '}
                    {activeRide.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              {activeRide.status === 'accepted' && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                >
                  Start Ride
                </button>
              )}

              {activeRide.status === 'ongoing' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                >
                  Complete Ride
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Partner Summary</h2>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Completed Trips</p>
                  <p className="text-2xl font-mono tabular-nums font-bold text-slate-900 mt-1">
                    {completedRides.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Available Balance</p>
                  <p className="text-2xl font-mono tabular-nums font-bold text-emerald-700 mt-1">
                    {formatINR(user.balance)}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Lifetime Trip Fare: {formatINR(totalEarnings)}</span>
                <button
                  type="button"
                  onClick={() => navigate('/driver/earnings')}
                  className="font-semibold text-amber-700 hover:text-amber-800"
                >
                  Withdraw →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DriverEarningsView: React.FC<{
  user: User;
  onUserUpdated: (u: User) => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, onUserUpdated, onNotify }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadData = () => {
    Promise.all([
      fetch(`/api/rides?userId=${user.id}&role=driver`).then((r) => r.json()),
      fetch(`/api/payments?driverId=${user.id}`).then((r) => r.json()),
    ])
      .then(([ridesData, paymentsData]) => {
        setRides(Array.isArray(ridesData) ? ridesData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const total = rides
    .filter((r) => r.status === 'completed')
    .reduce((acc, r) => acc + r.fare, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings, Payouts & Trips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Partner ledger for {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="text-xs text-slate-500 block">Available Balance</span>
            <span className="text-lg font-mono tabular-nums font-bold text-emerald-700">
              {formatINR(user.balance)}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="text-xs text-slate-500 block">Total Trip Earnings</span>
            <span className="text-lg font-mono tabular-nums font-bold text-slate-900">
              {formatINR(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={user.balance <= 0}
            onClick={() => setShowWithdraw(true)}
            className="px-4 py-3 bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw to UPI</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Trip History & Settlement</h2>
          <span className="text-xs font-mono text-slate-500">{rides.length} trips</span>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading trips...</div>
        ) : rides.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No trips driven yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Accept incoming rides from Duty & Requests to start earning.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Ride ID</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Earnings</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{ride.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {ride.pickup_address} → {ride.dropoff_address}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs font-semibold text-emerald-700">
                      {ride.status}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono uppercase">
                      <span
                        className={
                          ride.payment_status === 'paid' ? 'text-emerald-700 font-semibold' : 'text-amber-700'
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">UPI Payouts & Ride Collections Ledger</h2>
          <span className="text-xs font-mono text-slate-500">{payments.length} entries</span>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No payout or ride payment entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Mode / UPI ID</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{tx.transaction_ref}</td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-800">
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {tx.method.toUpperCase()}
                      {tx.upi_id ? ` · ${tx.upi_id}` : ''}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 text-right font-mono tabular-nums font-semibold',
                        tx.type === 'driver_payout' ? 'text-amber-700' : 'text-emerald-700'
                      )}
                    >
                      {tx.type === 'driver_payout' ? `- ${formatINR(tx.amount)}` : `+ ${formatINR(tx.amount)}`}
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

      {showWithdraw && (
        <DriverWithdrawModal
          user={user}
          onClose={() => setShowWithdraw(false)}
          onSuccess={(updatedUser) => {
            onUserUpdated(updatedUser);
            setShowWithdraw(false);
            loadData();
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
