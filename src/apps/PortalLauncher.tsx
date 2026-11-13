import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Navigation, ShieldCheck, ArrowRight, MapPin } from 'lucide-react';
import { User } from '../types';

export const PortalLauncher: React.FC = () => {
  const getSavedSession = (key: string): User | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const riderUser = getSavedSession('swiftride_rider_session');
  const driverUser = getSavedSession('swiftride_driver_session');
  const adminUser = getSavedSession('swiftride_admin_session');

  const apps = [
    {
      id: 'rider',
      title: 'Speedx Rider',
      subtitle: 'Passenger Booking App',
      themeLabel: 'Electric Emerald Theme',
      path: '/rider',
      icon: Navigation,
      cardHeaderBg: 'bg-[#06281E] text-white',
      iconWrap: 'bg-emerald-500 text-slate-950',
      subtitleColor: 'text-emerald-300',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      session: riderUser,
      features: [
        'India Map with 8+ major cities & landmarks',
        'Live INR (₹) fare estimate before booking',
        'Real-time driver tracking & trip history',
      ],
    },
    {
      id: 'driver',
      title: 'Speedx Partner',
      subtitle: 'Driver & KYC App',
      themeLabel: 'Saffron & Midnight Theme',
      path: '/driver',
      icon: Car,
      cardHeaderBg: 'bg-slate-900 text-white',
      iconWrap: 'bg-amber-400 text-slate-950',
      subtitleColor: 'text-amber-300',
      buttonClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950',
      session: driverUser,
      features: [
        'Online / Offline duty toggle & live ride alerts',
        'Aadhaar, PAN, Driving License & RC KYC upload',
        'Accept, start, complete trips & track earnings',
      ],
    },
    {
      id: 'admin',
      title: 'Speedx Admin',
      subtitle: 'Operations & Compliance Console',
      themeLabel: 'Royal Cobalt Theme',
      path: '/admin',
      icon: ShieldCheck,
      cardHeaderBg: 'bg-[#1E1B4B] text-white',
      iconWrap: 'bg-indigo-500 text-white',
      subtitleColor: 'text-indigo-300',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      session: adminUser,
      features: [
        'Approve or reject Driver Aadhaar, PAN, DL & RC',
        'Configure India INR base fare, per km & minute',
        'Monitor live rides, revenue & fleet metrics',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col">
      <header className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display">
              Speedx India
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>3 Independent Apps · Shared Real-Time Backend</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="max-w-2xl mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-display">
            Choose Your Speedx App
          </h1>
          <p className="text-slate-600 text-base mt-2 leading-relaxed">
            Rider, Driver Partner, and Admin each run with their own dedicated interface, color identity, and login session on top of one shared live India dispatch backend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className={`p-6 space-y-4 ${app.cardHeaderBg}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className={`p-3 rounded-xl ${app.iconWrap}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {app.session && (
                        <span className="text-xs font-medium text-white/90">
                          Signed in · {app.session.name}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-display">{app.title}</h2>
                      <p className={`text-xs font-medium mt-0.5 ${app.subtitleColor}`}>
                        {app.subtitle} · {app.themeLabel}
                      </p>
                    </div>
                  </div>

                  <ul className="p-6 space-y-2.5 text-sm text-slate-600">
                    {app.features.map((feat) => (
                      <li key={feat} className="leading-snug">
                        · {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  <Link
                    to={app.path}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${app.buttonClass}`}
                  >
                    <span>{app.session ? `Continue to ${app.title}` : `Open ${app.title}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
