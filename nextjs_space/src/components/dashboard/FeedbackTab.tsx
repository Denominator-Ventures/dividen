'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'general', label: 'General', icon: '💬' },
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '💡' },
  { value: 'ux', label: 'UX / Design', icon: '🎨' },
  { value: 'onboarding', label: 'Onboarding', icon: '🚀' },
];

const RATINGS = [1, 2, 3, 4, 5];

export function FeedbackTab() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setError('Please enter your feedback');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          category,
          rating,
          page: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setMessage('');
        setCategory('general');
        setRating(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }, [message, category, rating]);

  return (
    <>
      {/* Floating tab button - right edge */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-50',
          'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white',
          'px-1.5 py-3 rounded-l-lg shadow-lg transition-all duration-200',
          'text-[10px] font-medium tracking-wide',
          'writing-mode-vertical',
          open && 'opacity-0 pointer-events-none',
        )}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        title="Send Feedback"
      >
        💬 Feedback
      </button>

      {/* Feedback panel */}
      <div
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-50',
          'w-[320px] max-h-[480px] bg-[var(--bg-primary)] border border-[var(--border-color)]',
          'rounded-l-xl shadow-2xl transition-all duration-300 ease-out overflow-hidden',
          open
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Send Feedback</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Thank you!</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Your feedback has been received.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(480px - 52px)' }}>
            {/* Category pills */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                      category === cat.value
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]',
                    )}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                Your Feedback
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think, what's broken, or what you'd love to see..."
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40 resize-none transition-colors"
              />
              <p className="text-[9px] text-[var(--text-muted)] text-right mt-0.5">
                {message.length}/5000
              </p>
            </div>

            {/* Rating */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                Satisfaction (optional)
              </label>
              <div className="flex gap-1">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(rating === r ? null : r)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                      rating === r
                        ? 'bg-[var(--brand-primary)] text-white scale-110'
                        : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]',
                    )}
                  >
                    {r === 1 ? '😟' : r === 2 ? '😐' : r === 3 ? '🙂' : r === 4 ? '😊' : '🤩'}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
