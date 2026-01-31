'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type InviteInfo = {
  id: string;
  email: string;
  name: string;
  tenantName: string;
  status: string;
};

export default function DistributorOnboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function verifyInvite() {
      if (!token) {
        setVerifyError('No token provided in the URL.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setVerifyError(null);

        const res = await fetch(`/api/distributor/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          const msg = data?.error || 'Failed to verify invite.';
          setVerifyError(msg);
          setInvite(null);
        } else {
          setInvite(data);
          setDisplayName(data.name || '');
        }
      } catch (err) {
        console.error('Error verifying invite:', err);
        setVerifyError('Network or server error while verifying invite.');
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    verifyInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setOnboardError('No token provided.');
      return;
    }

    try {
      setOnboarding(true);
      setOnboardError(null);
      setOnboardSuccess(null);

      const res = await fetch('/api/distributor/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          displayName: displayName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        const msg = data?.error || 'Failed to onboard distributor from invite.';
        setOnboardError(msg);
        return;
      }

      setOnboardSuccess(
        `Success! You can now log in using ${data.email} on the main Restockr page.`
      );

      // Optionally redirect to home after a delay
      // setTimeout(() => router.push('/'), 4000);
    } catch (err) {
      console.error('Error onboarding distributor:', err);
      setOnboardError('Network or server error while onboarding distributor.');
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Distributor onboarding
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Join Restockr as a distributor
          </h1>
          <p className="text-sm text-slate-400">
            This page completes the onboarding flow for distributor invites. In a production setup,
            your rep would arrive here by clicking an email link that includes the invite token.
          </p>
        </header>

        {loading && (
          <p className="text-[11px] text-slate-400">Verifying invite token...</p>
        )}

        {!loading && verifyError && (
          <div className="rounded-lg border border-rose-500/70 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            {verifyError}
          </div>
        )}

        {!loading && invite && (
          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <div className="space-y-1">
              <p className="text-[11px] text-slate-300">
                Invited distributor: <span className="font-semibold text-slate-50">{invite.name}</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Email: <span className="font-mono text-emerald-200">{invite.email}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Tenant: <span className="text-slate-200">{invite.tenantName}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Display name (optional)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={invite.name || 'Your name or company name'}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
                />
              </div>
              <button
                type="submit"
                disabled={onboarding}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60"
              >
                {onboarding ? 'Creating account...' : 'Create distributor account'}
              </button>
            </form>

            {onboardError && (
              <p className="text-[11px] text-amber-300">{onboardError}</p>
            )}
            {onboardSuccess && (
              <p className="text-[11px] text-emerald-300">{onboardSuccess}</p>
            )}
          </section>
        )}

        <p className="text-[11px] text-slate-500">
          Once onboarded, you can go to the main Restockr page and log in using your distributor
          email. In a future phase, the login flow will also show which invitations you&apos;ve
          accepted.
        </p>
      </div>
    </main>
  );
}
