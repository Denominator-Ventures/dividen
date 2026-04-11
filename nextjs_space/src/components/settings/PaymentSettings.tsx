'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface ConnectStatus {
  configured: boolean;
  hasAccount: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export default function PaymentSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, pmRes, connectRes] = await Promise.all([
        fetch('/api/stripe/status'),
        fetch('/api/stripe/payment-methods'),
        fetch('/api/stripe/connect/status'),
      ]);
      
      const statusData = await statusRes.json();
      setStripeConfigured(statusData.configured);
      
      if (statusData.configured) {
        const pmData = await pmRes.json();
        if (pmData.paymentMethods) setPaymentMethods(pmData.paymentMethods);
        
        const connectData = await connectRes.json();
        setConnectStatus(connectData);
      }
    } catch (e) {
      console.error('Failed to fetch payment data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddCard = async () => {
    setAddingCard(true);
    try {
      const res = await fetch('/api/stripe/payment-methods', { method: 'POST' });
      const data = await res.json();
      if (data.clientSecret) {
        // Load Stripe.js and mount card element
        const { loadStripe } = await import('@stripe/stripe-js');
        const statusRes = await fetch('/api/stripe/status');
        const { publishableKey } = await statusRes.json();
        if (!publishableKey) {
          alert('Stripe publishable key not configured');
          return;
        }
        const stripeJs = await loadStripe(publishableKey);
        if (!stripeJs) {
          alert('Failed to load Stripe');
          return;
        }

        // Use Stripe's confirmCardSetup with a card element
        // For simplicity, we'll use a prompt-based approach for the card number
        // In production, you'd use Stripe Elements
        const elements = stripeJs.elements({ clientSecret: data.clientSecret });
        
        // Create a modal to mount the card element
        const modal = document.createElement('div');
        modal.id = 'stripe-card-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
          <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;max-width:420px;width:100%;">
            <h3 style="color:white;font-size:18px;font-weight:600;margin-bottom:16px;">Add Payment Method</h3>
            <div id="stripe-card-element" style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);margin-bottom:16px;"></div>
            <div id="stripe-card-errors" style="color:#f87171;font-size:12px;margin-bottom:12px;"></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;">
              <button id="stripe-cancel" style="padding:8px 16px;border-radius:8px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);border:none;cursor:pointer;font-size:14px;">Cancel</button>
              <button id="stripe-submit" style="padding:8px 16px;border-radius:8px;background:#4f7cff;color:white;border:none;cursor:pointer;font-size:14px;font-weight:500;">Save Card</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const cardElement = elements.create('card', {
          style: {
            base: {
              color: '#ffffff',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '16px',
              '::placeholder': { color: 'rgba(255,255,255,0.4)' },
            },
            invalid: { color: '#f87171' },
          },
        });
        cardElement.mount('#stripe-card-element');

        const errorsEl = document.getElementById('stripe-card-errors');
        cardElement.on('change', (event) => {
          if (errorsEl) errorsEl.textContent = event.error?.message || '';
        });

        // Handle cancel
        document.getElementById('stripe-cancel')?.addEventListener('click', () => {
          modal.remove();
          setAddingCard(false);
        });

        // Handle submit
        document.getElementById('stripe-submit')?.addEventListener('click', async () => {
          const submitBtn = document.getElementById('stripe-submit') as HTMLButtonElement;
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';

          const { error } = await stripeJs.confirmCardSetup(data.clientSecret, {
            payment_method: { card: cardElement },
          });

          if (error) {
            if (errorsEl) errorsEl.textContent = error.message || 'Failed to save card';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Card';
          } else {
            modal.remove();
            await fetchData(); // Refresh payment methods
          }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
            setAddingCard(false);
          }
        });
      }
    } catch (e) {
      console.error('Failed to create setup intent:', e);
      alert('Failed to initialize card form');
    } finally {
      setAddingCard(false);
    }
  };

  const handleRemoveCard = async (pmId: string) => {
    if (!confirm('Remove this payment method?')) return;
    try {
      await fetch('/api/stripe/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      setPaymentMethods(prev => prev.filter(pm => pm.id !== pmId));
    } catch (e) {
      console.error('Failed to remove card:', e);
    }
  };

  const handleSetDefault = async (pmId: string) => {
    try {
      await fetch('/api/stripe/payment-methods/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === pmId })));
    } catch (e) {
      console.error('Failed to set default:', e);
    }
  };

  const handleConnectOnboard = async () => {
    setOnboarding(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert(data.error || 'Failed to start onboarding');
      }
    } catch (e) {
      console.error('Connect onboard error:', e);
    } finally {
      setOnboarding(false);
    }
  };

  const handleConnectDashboard = async () => {
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (e) {
      console.error('Connect dashboard error:', e);
    }
  };

  const getBrandIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳 Visa';
      case 'mastercard': return '💳 Mastercard';
      case 'amex': return '💳 Amex';
      case 'discover': return '💳 Discover';
      default: return '💳 Card';
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white/30">Loading payment settings...</div>;
  }

  if (!stripeConfigured) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">💳</div>
        <h3 className="text-sm font-medium text-white/60 mb-1">Stripe Not Configured</h3>
        <p className="text-xs text-white/35">Payment processing requires Stripe API keys. Contact your instance administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods Section */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-white/70">💳 Payment Methods</h3>
            <p className="text-xs text-white/35 mt-0.5">Cards on file for marketplace agent executions</p>
          </div>
          <button
            onClick={handleAddCard}
            disabled={addingCard}
            className="px-3 py-1.5 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-xs font-medium hover:bg-brand-500/30 transition-all disabled:opacity-50"
          >
            {addingCard ? 'Adding...' : '+ Add Card'}
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-xs">
            No payment methods added yet. Add a card to pay for marketplace agent executions.
          </div>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm">{getBrandIcon(pm.brand)}</span>
                  <div>
                    <span className="text-sm text-white/80">•••• {pm.last4}</span>
                    <span className="text-xs text-white/35 ml-2">Exp {pm.expMonth}/{pm.expYear}</span>
                    {pm.isDefault && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded">Default</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!pm.isDefault && (
                    <button
                      onClick={() => handleSetDefault(pm.id)}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveCard(pm.id)}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stripe Connect Section (Developer Payouts) */}
      <div className="panel">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/70">🏦 Developer Payouts (Stripe Connect)</h3>
          <p className="text-xs text-white/35 mt-0.5">Connect your bank account to receive payouts from marketplace agent sales</p>
        </div>

        {connectStatus?.onboarded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="text-emerald-400">✓</span>
              <div className="flex-1">
                <div className="text-sm text-emerald-400 font-medium">Payouts Active</div>
                <div className="text-xs text-white/40">Your Stripe Connect account is verified and ready to receive payouts.</div>
              </div>
            </div>
            <button
              onClick={handleConnectDashboard}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-white/70 hover:bg-white/[0.08] transition-all"
            >
              Open Stripe Dashboard →
            </button>
          </div>
        ) : connectStatus?.hasAccount ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-amber-400">⏳</span>
              <div className="flex-1">
                <div className="text-sm text-amber-400 font-medium">Onboarding Incomplete</div>
                <div className="text-xs text-white/40">You started Stripe Connect setup but haven&apos;t finished. Complete it to receive payouts.</div>
              </div>
            </div>
            <button
              onClick={handleConnectOnboard}
              disabled={onboarding}
              className="px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-all disabled:opacity-50"
            >
              {onboarding ? 'Loading...' : 'Continue Onboarding →'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div className="text-xs text-white/40">Set up Stripe Connect to receive payouts when users execute your paid marketplace agents. Stripe handles identity verification and bank account setup securely.</div>
            </div>
            <button
              onClick={handleConnectOnboard}
              disabled={onboarding}
              className="px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-all disabled:opacity-50"
            >
              {onboarding ? 'Setting up...' : '🏦 Set Up Payouts with Stripe'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
