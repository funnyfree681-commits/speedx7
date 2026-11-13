import React, { useState } from 'react';
import {
  X,
  QrCode,
  Wallet,
  CreditCard,
  Banknote,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { PaymentMethod, Ride, User } from '../types';
import { cn, formatINR } from '../lib/utils';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

export const RidePaymentModal: React.FC<{
  ride: Ride;
  user: User;
  onClose: () => void;
  onSuccess: (updatedRide: Ride, updatedUser?: User) => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ ride, user, onClose, onSuccess, onNotify }) => {
  const [method, setMethod] = useState<PaymentMethod>(ride.payment_method || 'upi');
  const [processing, setProcessing] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    if (method === 'wallet' || method === 'cash') {
      try {
        const res = await fetch(`/api/rides/${ride.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method }),
        });
        const data = await res.json();
        if (!res.ok) {
          onNotify(data.error || 'Payment failed.', 'error');
          setProcessing(false);
          return;
        }
        onNotify(
          `Payment of ${formatINR(ride.fare)} confirmed via ${method.toUpperCase()}.`,
          'success'
        );
        onSuccess(data.ride, data.user);
      } catch {
        onNotify('Network error processing payment.', 'error');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Razorpay Checkout for UPI & Card
    try {
      if (!window.Razorpay) {
        onNotify('Razorpay Checkout script failed to load. Check internet connection.', 'error');
        setProcessing(false);
        return;
      }

      const orderRes = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: ride.fare,
          purpose: 'ride_payment',
          rideId: ride.id,
          userId: user.id,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        onNotify(orderData.error || 'Could not initialize Razorpay order.', 'error');
        setProcessing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Speedx',
        description: `Ride Fare · ${ride.id}`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        notes: {
          rideId: ride.id,
          preferredMethod: method,
        },
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => setProcessing(false),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                purpose: 'ride_payment',
                rideId: ride.id,
                userId: user.id,
                amount: ride.fare,
                method,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              onNotify(verifyData.error || 'Signature verification failed.', 'error');
              setProcessing(false);
              return;
            }
            onNotify(
              `Razorpay payment verified (${response.razorpay_payment_id}).`,
              'success'
            );
            onSuccess(verifyData.ride, verifyData.user);
          } catch {
            onNotify('Network error verifying Razorpay payment.', 'error');
          } finally {
            setProcessing(false);
          }
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        onNotify(resp?.error?.description || 'Razorpay payment failed.', 'error');
        setProcessing(false);
      });

      rzp.open();
    } catch {
      onNotify('Unable to start Razorpay checkout.', 'error');
      setProcessing(false);
    }
  };

  const methods: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'upi', label: 'UPI / QR', icon: QrCode },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'cash', label: 'Cash', icon: Banknote },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="bg-[#06281E] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display">Speedx Ride Checkout</h3>
            <p className="text-xs text-emerald-300 font-mono">
              Ride {ride.id} · {formatINR(ride.fare)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePay} className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'py-2 px-1 rounded-md text-xs font-semibold flex flex-col items-center gap-1 transition-colors',
                    method === m.id
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {(method === 'upi' || method === 'card') && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Razorpay Secure Checkout
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  Test Mode
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pay <strong className="font-mono">{formatINR(ride.fare)}</strong> securely via{' '}
                {method === 'upi'
                  ? 'GPay, PhonePe, Paytm, BHIM UPI ID or QR code'
                  : 'RuPay, Visa, or Mastercard Debit / Credit Card'}{' '}
                through Razorpay.
              </p>
            </div>
          )}

          {method === 'wallet' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Speedx Wallet Balance</span>
                <span className="font-mono tabular-nums font-bold text-emerald-800">
                  {formatINR(user.balance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Trip Deduction</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  - {formatINR(ride.fare)}
                </span>
              </div>
              {user.balance < ride.fare && (
                <p className="text-xs text-red-600 pt-1">
                  Insufficient balance. Top up your wallet or select UPI / Card.
                </p>
              )}
            </div>
          )}

          {method === 'cash' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Confirm handing over <strong className="font-mono">{formatINR(ride.fare)}</strong> in
              cash to your Speedx Partner.
            </div>
          )}

          <button
            type="submit"
            disabled={processing || (method === 'wallet' && user.balance < ride.fare)}
            className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {processing
                ? 'Opening Razorpay...'
                : method === 'upi' || method === 'card'
                ? `Pay ${formatINR(ride.fare)} via Razorpay`
                : `Pay ${formatINR(ride.fare)}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export const WalletTopupModal: React.FC<{
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, onClose, onSuccess, onNotify }) => {
  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'upi' | 'card'>('upi');
  const [processing, setProcessing] = useState(false);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (Number.isNaN(num) || num < 1 || num > 50000) {
      onNotify('Enter a valid amount between ₹1 and ₹50,000.', 'error');
      return;
    }

    if (!window.Razorpay) {
      onNotify('Razorpay Checkout script failed to load. Check internet connection.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const orderRes = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: num,
          purpose: 'wallet_topup',
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        onNotify(orderData.error || 'Could not create Razorpay top-up order.', 'error');
        setProcessing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Speedx Wallet',
        description: `Add ${formatINR(num)} to Speedx Wallet`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => setProcessing(false),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                purpose: 'wallet_topup',
                userId: user.id,
                amount: num,
                method,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              onNotify(verifyData.error || 'Payment verification failed.', 'error');
              setProcessing(false);
              return;
            }
            onNotify(`${formatINR(num)} added via Razorpay (${response.razorpay_payment_id}).`, 'success');
            onSuccess(verifyData.user);
          } catch {
            onNotify('Network error verifying wallet top-up.', 'error');
          } finally {
            setProcessing(false);
          }
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        onNotify(resp?.error?.description || 'Razorpay payment failed.', 'error');
        setProcessing(false);
      });

      rzp.open();
    } catch {
      onNotify('Unable to open Razorpay checkout.', 'error');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="bg-[#06281E] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display">Add Money to Speedx Wallet</h3>
            <p className="text-xs text-emerald-300 font-mono">
              Current Balance: {formatINR(user.balance)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTopup} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Amount (INR ₹)
            </label>
            <input
              type="number"
              min="1"
              max="50000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-base font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <div className="flex items-center gap-2 mt-2">
              {['200', '500', '1000', '2000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors',
                    amount === preset
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMethod('upi')}
              className={cn(
                'py-2 rounded-md text-xs font-semibold transition-colors',
                method === 'upi' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
              )}
            >
              UPI (GPay / PhonePe)
            </button>
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={cn(
                'py-2 rounded-md text-xs font-semibold transition-colors',
                method === 'card' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
              )}
            >
              Debit / Credit Card
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Powered by <strong className="text-slate-900">Razorpay</strong> · Instant UPI, QR,
            RuPay, Visa, Mastercard & Netbanking.
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {processing ? 'Connecting Razorpay...' : `Add ${formatINR(Number(amount) || 0)} via Razorpay`}
          </button>
        </form>
      </div>
    </div>
  );
};

export const DriverWithdrawModal: React.FC<{
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  onNotify: (m: string, t?: 'success' | 'error') => void;
}> = ({ user, onClose, onSuccess, onNotify }) => {
  const [amount, setAmount] = useState(String(Math.min(500, Math.floor(user.balance))));
  const [upiId, setUpiId] = useState('ramesh.driver@okaxis');
  const [processing, setProcessing] = useState(false);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0 || num > user.balance) {
      onNotify('Enter an amount within your available balance.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/drivers/${user.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num, upiId }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Withdrawal failed.', 'error');
        return;
      }
      onNotify(`Payout of ${formatINR(num)} sent to ${upiId}.`, 'success');
      onSuccess(data.user);
    } catch {
      onNotify('Network error processing payout.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display">Withdraw Earnings to UPI</h3>
            <p className="text-xs text-amber-300 font-mono">
              Available Balance: {formatINR(user.balance)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleWithdraw} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Withdrawal Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              max={user.balance}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-base font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Driver Bank / UPI ID
            </label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="name@okaxis"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={processing || user.balance <= 0}
            className="w-full py-2.5 px-4 bg-amber-400 text-slate-950 rounded-lg text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{processing ? 'Transferring...' : 'Instant UPI Withdraw'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
