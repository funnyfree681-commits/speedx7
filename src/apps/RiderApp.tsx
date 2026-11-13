import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Navigation,
  History,
  MapPin,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  User as UserIcon,
  Wallet,
  QrCode,
  CreditCard,
  Banknote,
  Plus,
} from 'lucide-react';
import { User, Ride, Settings as AppSettings, PaymentMethod, PaymentTransaction } from '../types';
import { useSocket } from '../hooks/useSocket';
import Map from '../components/Map';
import { AppAuthForm } from '../components/AppAuthForm';
import { RidePaymentModal, WalletTopupModal } from '../components/PaymentModals';
import { cn, calculateFare, haversineDistanceKm, formatINR } from '../lib/utils';
import { INDIAN_CITIES, INDIA_OVERVIEW_CENTER, IndianCity } from '../data/indiaCities';

const RIDER_STORAGE_KEY = 'swiftride_rider_session';

export const RiderApp: React.FC<{
  onNotify: (message: string, type?: 'success' | 'error') => void;
}> = ({ onNotify }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(RIDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const location = useLocation();

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem(RIDER_STORAGE_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/users/${user.id}`)
      .then((res) => res.json())
      .then((fresh) => {
        if (fresh?.id) updateUser(fresh);
      })
      .catch(() => {});
  }, [user?.id]);

  const handleLogin = (u: User) => {
    updateUser(u);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(RIDER_STORAGE_KEY);
  };

  if (!user) {
    return (
      <AppAuthForm
        role="user"
        appTitle="Speedx Rider"
        appSubtitle="Book city rides across India with live INR fares"
        headerBgClass="bg-[#06281E]"
        iconBgClass="bg-emerald-500 text-slate-950"
        buttonClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        pageBgClass="bg-[#F2FBF7]"
        icon={<Navigation className="w-6 h-6" />}
        defaultEmailPlaceholder="aarav.rider@example.in"
        onLogin={handleLogin}
        onNotify={onNotify}
      />
    );
  }

  const navItems = [
    { to: '/rider', label: 'Book Ride', icon: Navigation },
    { to: '/rider/history', label: 'My Trips', icon: History },
    { to: '/rider/wallet', label: 'Wallet & Payments', icon: Wallet },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-5 bg-[#06281E] text-white">
      <div className="flex items-center justify-between mb-6">
        <Link to="/rider" className="flex items-center gap-2.5 whitespace-nowrap">
          <div className="p-2 bg-emerald-500 text-slate-950 rounded-lg">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-display block leading-none">
              Speedx
            </span>
            <span className="text-[11px] font-medium text-emerald-300">Rider App</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-emerald-200 hover:text-white"
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
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
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
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-emerald-200/70 truncate">{user.email}</p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 w-full rounded-lg text-xs font-medium text-emerald-100/80 hover:bg-white/10 hover:text-white"
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
    <div className="flex h-screen bg-[#F2FBF7] text-slate-900 overflow-hidden">
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
              Speedx Rider / {navItems.find((n) => n.to === location.pathname)?.label || 'Book Ride'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 hidden sm:inline">Wallet</span>
            <span className="font-mono tabular-nums font-semibold text-emerald-700">
              {formatINR(user.balance)}
            </span>
            <button
              type="button"
              onClick={() => setShowTopup(true)}
              className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Money
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route
              index
              element={
                <RiderBookingView
                  user={user}
                  onUserUpdated={updateUser}
                  onOpenTopup={() => setShowTopup(true)}
                  onNotify={onNotify}
                />
              }
            />
            <Route
              path="history"
              element={<RiderHistoryView user={user} onUserUpdated={updateUser} onNotify={onNotify} />}
            />
            <Route
              path="wallet"
              element={
                <RiderWalletView
                  user={user}
                  onOpenTopup={() => setShowTopup(true)}
                />
              }
            />
          </Routes>
        </main>
      </div>

      {showTopup && (
        <WalletTopupModal
          user={user}
          onClose={() => setShowTopup(false)}
          onSuccess={(u) => {
            updateUser(u);
            setShowTopup(false);
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};

const RiderBookingView: React.FC<{
  user: User;
  onUserUpdated: (u: User) => void;
  onOpenTopup: () => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, onUserUpdated, onOpenTopup, onNotify }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('delhi');
  const [viewAllIndia, setViewAllIndia] = useState(false);
  const [pickup, setPickup] = useState<[number, number] | null>(null);
  const [dropoff, setDropoff] = useState<[number, number] | null>(null);
  const [pickupLabel, setPickupLabel] = useState('');
  const [dropoffLabel, setDropoffLabel] = useState('');
  const [selecting, setSelecting] = useState<'pickup' | 'dropoff'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [payingRide, setPayingRide] = useState<Ride | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    base_fare: 30,
    per_km: 12,
    per_minute: 2,
  });
  const [drivers, setDrivers] = useState<{ id: string; lat: number; lng: number }[]>([]);
  const socket = useSocket(user.id);

  const selectedCity: IndianCity = useMemo(
    () => INDIAN_CITIES.find((c) => c.id === selectedCityId) || INDIAN_CITIES[0],
    [selectedCityId]
  );

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const s: any = {};
        data.forEach((item: any) => (s[item.key] = parseFloat(item.value)));
        setSettings((prev) => ({
          base_fare: s.base_fare ?? prev.base_fare,
          per_km: s.per_km ?? prev.per_km,
          per_minute: s.per_minute ?? prev.per_minute,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('driver_location_updated', (data) => {
      setDrivers((prev) => {
        const idx = prev.findIndex((d) => d.id === data.userId);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { id: data.userId, lat: data.lat, lng: data.lng };
          return updated;
        }
        return [...prev, { id: data.userId, lat: data.lat, lng: data.lng }];
      });
    });

    socket.on('ride_status_updated', (ride: Ride) => {
      if (ride.user_id === user.id) {
        setCurrentRide(ride);
        if (ride.status === 'completed') {
          fetch(`/api/users/${user.id}`)
            .then((r) => r.json())
            .then((fresh) => {
              if (fresh?.id) onUserUpdated(fresh);
            })
            .catch(() => {});

          if (ride.payment_status === 'paid') {
            onNotify(
              `Ride completed & paid (${formatINR(ride.fare)} via ${ride.payment_method?.toUpperCase()}).`,
              'success'
            );
            setCurrentRide(null);
            setPickup(null);
            setDropoff(null);
            setPickupLabel('');
            setDropoffLabel('');
          } else {
            onNotify(`Ride completed! Please pay ${formatINR(ride.fare)} to finish checkout.`, 'success');
            setPayingRide(ride);
          }
        } else if (ride.status === 'cancelled') {
          onNotify('Ride request cancelled.', 'success');
          setCurrentRide(null);
        }
      }
    });

    return () => {
      socket.off('driver_location_updated');
      socket.off('ride_status_updated');
    };
  }, [socket, user.id, onNotify, onUserUpdated]);

  const setPoint = (lat: number, lng: number, label?: string) => {
    const target = selecting;
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (target === 'pickup') {
      setPickup([lat, lng]);
      setPickupLabel(label || fallback);
      setSelecting('dropoff');
    } else {
      setDropoff([lat, lng]);
      setDropoffLabel(label || fallback);
    }

    if (!label) {
      fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data?.label) return;
          if (target === 'pickup') {
            setPickupLabel(data.label);
          } else {
            setDropoffLabel(data.label);
          }
        })
        .catch(() => {});
    }
  };

  const distanceKm = useMemo(() => {
    if (!pickup || !dropoff) return 0;
    return haversineDistanceKm(pickup[0], pickup[1], dropoff[0], dropoff[1]);
  }, [pickup, dropoff]);

  const estimatedDurationMin = useMemo(() => {
    if (!distanceKm) return 0;
    return Math.max(5, Math.round(distanceKm * 2.5));
  }, [distanceKm]);

  const estimatedFare = useMemo(() => {
    if (!pickup || !dropoff) return 0;
    return calculateFare(distanceKm, estimatedDurationMin, settings);
  }, [pickup, dropoff, distanceKm, estimatedDurationMin, settings]);

  const handleRequestRide = () => {
    if (!pickup || !dropoff || !socket) return;
    if (paymentMethod === 'wallet' && user.balance < estimatedFare) {
      onNotify('Insufficient Speedx Wallet balance. Top up or choose UPI / Card / Cash.', 'error');
      onOpenTopup();
      return;
    }

    const rideData = {
      id: `rd_${Math.random().toString(36).slice(2, 9)}`,
      userId: user.id,
      pickup: { lat: pickup[0], lng: pickup[1] },
      dropoff: { lat: dropoff[0], lng: dropoff[1] },
      fare: Number(estimatedFare.toFixed(2)),
      pickupAddress: pickupLabel || `${selectedCity.name} Pickup`,
      dropoffAddress: dropoffLabel || `${selectedCity.name} Dropoff`,
      paymentMethod,
    };

    socket.emit('request_ride', rideData);
    setCurrentRide({
      id: rideData.id,
      user_id: user.id,
      pickup_lat: pickup[0],
      pickup_lng: pickup[1],
      dropoff_lat: dropoff[0],
      dropoff_lng: dropoff[1],
      pickup_address: rideData.pickupAddress,
      dropoff_address: rideData.dropoffAddress,
      fare: rideData.fare,
      payment_method: paymentMethod,
      payment_status: 'pending',
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    onNotify('Ride requested. Waiting for a Speedx Partner to accept.', 'success');
  };

  const handleCancelRide = async () => {
    if (!currentRide) return;
    try {
      await fetch(`/api/rides/${currentRide.id}/cancel`, { method: 'POST' });
      socket?.emit('cancel_ride', currentRide.id);
      setCurrentRide(null);
      onNotify('Ride cancelled.', 'success');
    } catch {
      onNotify('Failed to cancel ride.', 'error');
    }
  };

  const citiesByState = useMemo(() => {
    const groups: Record<string, IndianCity[]> = {};
    for (const city of INDIAN_CITIES) {
      if (!groups[city.state]) groups[city.state] = [];
      groups[city.state].push(city);
    }
    return Object.entries(groups);
  }, []);

  const handleCityChange = (value: string) => {
    if (value === 'all') {
      setViewAllIndia(true);
    } else {
      setViewAllIndia(false);
      setSelectedCityId(value);
      if (!currentRide) {
        setPickup(null);
        setDropoff(null);
        setPickupLabel('');
        setDropoffLabel('');
        setSelecting('pickup');
      }
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'upi', label: 'UPI', icon: QrCode },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'cash', label: 'Cash', icon: Banknote },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="rider-city" className="text-xs font-semibold text-slate-600">
                Select City
              </label>
              <select
                id="rider-city"
                value={viewAllIndia ? 'all' : selectedCityId}
                onChange={(e) => handleCityChange(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">All India Overview</option>
                {citiesByState.map(([state, cities]) => (
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

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSelecting('pickup')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap',
                  selecting === 'pickup'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Set Pickup
              </button>
              <button
                type="button"
                onClick={() => setSelecting('dropoff')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap',
                  selecting === 'dropoff'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Set Dropoff
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Pickup</p>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {pickupLabel || `Click ${selectedCity.name} map or hub`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-red-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Dropoff</p>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {dropoffLabel || `Click ${selectedCity.name} map or hub`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[420px]">
          <Map
            center={viewAllIndia ? INDIA_OVERVIEW_CENTER : selectedCity.center}
            zoom={viewAllIndia ? 5 : selectedCity.zoom}
            selectedCity={viewAllIndia ? undefined : selectedCity}
            pickup={pickup || undefined}
            dropoff={dropoff || undefined}
            pickupLabel={pickupLabel}
            dropoffLabel={dropoffLabel}
            drivers={drivers}
            showCityHubs
            onSelectHub={(name, lat, lng) => setPoint(lat, lng, name)}
            onMapClick={(lat, lng) => setPoint(lat, lng)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Book a Ride</h2>
            {(pickup || dropoff) && !currentRide && (
              <button
                type="button"
                onClick={() => {
                  setPickup(null);
                  setDropoff(null);
                  setPickupLabel('');
                  setDropoffLabel('');
                  setSelecting('pickup');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {!currentRide ? (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Popular {selectedCity.name} Landmarks (sets {selecting})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCity.landmarks.map((lm) => (
                    <button
                      key={lm.name}
                      type="button"
                      onClick={() => setPoint(lm.lat, lm.lng, lm.name)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-left"
                    >
                      {lm.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Payment Mode</span>
                  {paymentMethod === 'wallet' && (
                    <span className="text-[11px] font-mono text-emerald-700">
                      Bal: {formatINR(user.balance)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {paymentOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={cn(
                          'py-2 px-1 rounded-md text-xs font-semibold flex flex-col items-center gap-1 transition-colors',
                          paymentMethod === opt.id
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Distance</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Est. Time</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {estimatedDurationMin > 0 ? `${estimatedDurationMin} min` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">Estimated Fare</span>
                  <span className="text-lg font-mono tabular-nums font-bold text-emerald-700">
                    {formatINR(estimatedFare)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={!pickup || !dropoff}
                onClick={handleRequestRide}
                className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                Request Speedx Ride
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                {currentRide.status === 'pending' ? (
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {currentRide.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {currentRide.status === 'pending'
                      ? 'Searching for nearby drivers...'
                      : currentRide.status === 'accepted'
                      ? 'Driver accepted and is heading to pickup.'
                      : currentRide.status === 'ongoing'
                      ? 'Trip is currently ongoing.'
                      : 'Trip completed.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ride ID</span>
                  <span className="font-mono text-slate-900">{currentRide.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup</span>
                  <span className="text-slate-900 font-medium truncate max-w-[180px]">
                    {currentRide.pickup_address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dropoff</span>
                  <span className="text-slate-900 font-medium truncate max-w-[180px]">
                    {currentRide.dropoff_address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment</span>
                  <span className="text-xs font-semibold uppercase text-slate-800">
                    {currentRide.payment_method || 'UPI'} ·{' '}
                    <span
                      className={
                        currentRide.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {currentRide.payment_status || 'pending'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Fare</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatINR(currentRide.fare)}
                  </span>
                </div>
              </div>

              {currentRide.payment_status !== 'paid' && currentRide.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => setPayingRide(currentRide)}
                  className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Pay {formatINR(currentRide.fare)} Now
                </button>
              )}

              {currentRide.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleCancelRide}
                  className="w-full py-2.5 px-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#06281E] p-5 rounded-xl text-white">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Instant UPI & Wallet Checkout</span>
          </div>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            Pay seamlessly via UPI QR (GPay, PhonePe, Paytm), Speedx Wallet, Card, or Cash.
          </p>
        </div>
      </div>

      {payingRide && (
        <RidePaymentModal
          ride={payingRide}
          user={user}
          onClose={() => setPayingRide(null)}
          onSuccess={(updatedRide, updatedUser) => {
            if (updatedUser) onUserUpdated(updatedUser);
            setPayingRide(null);
            if (updatedRide.status === 'completed') {
              setCurrentRide(null);
              setPickup(null);
              setDropoff(null);
              setPickupLabel('');
              setDropoffLabel('');
            } else {
              setCurrentRide(updatedRide);
            }
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};

const RiderHistoryView: React.FC<{
  user: User;
  onUserUpdated: (u: User) => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, onUserUpdated, onNotify }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingRide, setPayingRide] = useState<Ride | null>(null);

  const loadRides = () => {
    fetch(`/api/rides?userId=${user.id}&role=user`)
      .then((res) => res.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRides();
  }, [user.id]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Trip History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Trips booked by {user.name}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading trips...</div>
        ) : rides.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">No trips booked yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a pickup and dropoff on the city map to book your first ride.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Ride ID</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Trip Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Fare</th>
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
                    <td className="py-3 px-4 capitalize text-xs font-semibold">
                      <span
                        className={cn(
                          ride.status === 'completed'
                            ? 'text-emerald-700'
                            : ride.status === 'cancelled'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        )}
                      >
                        {ride.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {ride.payment_status === 'paid' ? (
                        <span className="font-semibold text-emerald-700 uppercase">
                          Paid · {ride.payment_method}
                        </span>
                      ) : ride.status === 'cancelled' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPayingRide(ride)}
                          className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700"
                        >
                          Pay Now
                        </button>
                      )}
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

      {payingRide && (
        <RidePaymentModal
          ride={payingRide}
          user={user}
          onClose={() => setPayingRide(null)}
          onSuccess={(_updatedRide, updatedUser) => {
            if (updatedUser) onUserUpdated(updatedUser);
            setPayingRide(null);
            loadRides();
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};

const RiderWalletView: React.FC<{
  user: User;
  onOpenTopup: () => void;
}> = ({ user, onOpenTopup }) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payments?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [user.id, user.balance]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Speedx Wallet Balance</p>
          <p className="text-3xl font-mono tabular-nums font-bold text-emerald-700 mt-1">
            {formatINR(user.balance)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTopup}
          className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Money via UPI / Card
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Payment Transactions</h2>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No wallet top-ups or ride payments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {tx.transaction_ref}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-900 font-medium">
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-700">
                      {tx.method}
                      {tx.upi_id ? ` · ${tx.upi_id}` : ''}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 text-right font-mono tabular-nums font-semibold',
                        tx.type === 'wallet_topup' ? 'text-emerald-700' : 'text-slate-900'
                      )}
                    >
                      {tx.type === 'wallet_topup' ? '+' : '-'}
                      {formatINR(tx.amount)}
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
