'use client';

import React, { useEffect, useState } from 'react';

type TimeMode = 'sunday' | 'monday8' | 'monday930';
type ScenarioMode = 'normal' | 'slammed' | 'shortstaff';

type ApiFounderSummary = {
  timeMode: TimeMode;
  scenarioMode: ScenarioMode;
  readinessLabel: 'Green' | 'Yellow' | 'Red';
  itemsNeedingOrder: number;
  missingPrices: number;
  needsUpdatePrices: number;
  budActions: string[];
};

type RestockrLocation = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
};

// For the items-below-par list and fallback demo logic
type OrderLine = {
  sku: string;
  name: string;
  par: number;
  onHand: number;
  unit: string;
};

const demoOrderLines: OrderLine[] = [
  { sku: 'AVO-48', name: 'Avocados 48ct', par: 4, onHand: 1.5, unit: 'cases' },
  { sku: 'ROMA-25', name: 'Tomatoes Roma 25lb', par: 3, onHand: 0.5, unit: 'cases' },
  { sku: 'LETT-MIX', name: 'Spring mix 3lb', par: 5, onHand: 4, unit: 'boxes' },
  { sku: 'RUS-50', name: 'Potatoes russet 50lb', par: 2, onHand: 0.2, unit: 'sacks' }
];

function computeDemoItemsNeeding(orderLines: OrderLine[]): OrderLine[] {
  return orderLines.filter((line) => line.par - line.onHand > 0.01);
}

function computeTimeCaption(timeMode: TimeMode): string {
  if (timeMode === 'sunday') {
    return 'Sunday perspective: there is still time to adjust inventory and pricing before the Monday cutoff.';
  }
  if (timeMode === 'monday8') {
    return 'Monday 8:00am perspective: this is the crucial reminder window. Check missing and outdated prices and make sure buyers have refreshed their pars.';
  }
  return 'Monday 9:30am perspective: the cutoff has passed. Any gaps here are now part of your reliability story with distributors and buyers.';
}

function scenarioLabel(mode: ScenarioMode): string {
  if (mode === 'slammed') return 'Slammed service';
  if (mode === 'shortstaff') return 'Short-staffed service';
  return 'Normal night';
}

function computeBudMessage(
  readinessLabel: 'Green' | 'Yellow' | 'Red',
  timeMode: TimeMode
): string {
  if (readinessLabel === 'Green' && timeMode === 'sunday') {
    return "You’re in a great spot heading into the week. If we keep this coverage through Monday morning, tonight’s auction should run smoothly.";
  }
  if (readinessLabel === 'Green') {
    return "Everything looks solid for the auction: inventory and pricing are both in good shape. I’d still give your highest-cost items one last glance.";
  }
  if (readinessLabel === 'Yellow' && timeMode === 'monday8') {
    return "We’re close, but there are a couple of loose ends. I’d fix the missing or outdated prices I’ve flagged, then you’ll be in a strong position before 9:00am.";
  }
  if (readinessLabel === 'Yellow') {
    return "Auction readiness is mostly okay, but a few issues stand out. I’d double-check the flagged items before you lean on these results.";
  }
  if (readinessLabel === 'Red' && timeMode === 'monday930') {
    return "Auction reliability is at risk. I’d treat these results cautiously and consider a backup plan or a tighter shortlist of items/providers for tonight.";
  }
  return "There are material gaps in either inventory or pricing. Before you trust the auction output, I’d resolve as many of these issues as possible or narrow the scope.";
}

export default function FounderPage() {
  const [timeMode, setTimeMode] = useState<TimeMode>('sunday');
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('normal');
  const [budEnabled, setBudEnabled] = useState(true);

  // Locations state
  const [locations, setLocations] = useState<RestockrLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // API-based founder summary
  const [apiSummary, setApiSummary] = useState<ApiFounderSummary | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  // Bud Q&A state
  const [budQuestion, setBudQuestion] = useState('');
  const [budAnswer, setBudAnswer] = useState<string | null>(null);
  const [budSuggestions, setBudSuggestions] = useState<string[]>([]);
  const [budChatLoading, setBudChatLoading] = useState(false);
  const [budChatError, setBudChatError] = useState<string | null>(null);

  // Mintsy ledger state
  const [mintsyEntries, setMintsyEntries] = useState<any[]>([]);
  const [mintsyLoading, setMintsyLoading] = useState<boolean>(true);
  const [mintsyError, setMintsyError] = useState<string | null>(null);

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        setLocationsLoading(true);
        setLocationsError(null);

        const res = await fetch('/api/locations');
        const data = await res.json();

        if (!res.ok || !Array.isArray(data.locations) || data.locations.length === 0) {
          const msg = data?.error || 'No locations found in database.';
          setLocationsError(msg);
          setLocations([]);
          setSelectedLocationId(null);
        } else {
          setLocations(data.locations);
          setSelectedLocationId((prev) => prev ?? data.locations[0].id);
        }
      } catch (err) {
        console.error('Error loading locations in founder view:', err);
        setLocationsError('Could not load locations from database.');
        setLocations([]);
        setSelectedLocationId(null);
      } finally {
        setLocationsLoading(false);
      }
    }

    loadLocations();
  }, []);

  // Load founder summary from API when location changes
  useEffect(() => {
    async function loadSummary(locationId: string | null) {
      try {
        setApiLoading(true);
        setApiError(null);

        const url = locationId
          ? `/api/founder/summary?locationId=${encodeURIComponent(locationId)}`
          : '/api/founder/summary';

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          const msg = data?.error || 'Failed to load founder summary.';
          setApiError(msg);
          setApiSummary(null);
        } else {
          setApiSummary(data as ApiFounderSummary);
        }
      } catch (err) {
        console.error('Error loading /api/founder/summary:', err);
        setApiError('Could not load founder summary from API (demo only).');
        setApiSummary(null);
      } finally {
        setApiLoading(false);
      }
    }

    if (!locationsLoading) {
      loadSummary(selectedLocationId);
    }
  }, [selectedLocationId, locationsLoading]);

  // Load Mintsy ledger entries on mount
  useEffect(() => {
    async function loadMintsy() {
      try {
        setMintsyLoading(true);
        setMintsyError(null);

        const res = await fetch('/api/mintsy/ledger?limit=20');
        const data = await res.json();

        if (!res.ok) {
          const msg = data?.error || 'Failed to load Mintsy ledger.';
          setMintsyError(msg);
          setMintsyEntries([]);
        } else {
          setMintsyEntries(Array.isArray(data.entries) ? data.entries : []);
        }
      } catch (err) {
        console.error('Error loading Mintsy ledger:', err);
        setMintsyError('Could not load Mintsy ledger (demo).');
        setMintsyEntries([]);
      } finally {
        setMintsyLoading(false);
      }
    }

    loadMintsy();
  }, []);

  const currentLocation =
    locations.find((loc) => loc.id === selectedLocationId) ?? null;

  // Values for cards, using API summary if available, else fallback demo
  const fallbackItemsNeeding = computeDemoItemsNeeding(demoOrderLines);
  const fallbackItemsNeedingCount = fallbackItemsNeeding.length;

  const readinessLabelFromApi =
    apiSummary?.readinessLabel ?? 'Yellow';
  const itemsNeedingOrderFromApi =
    apiSummary?.itemsNeedingOrder ?? fallbackItemsNeedingCount;
  const missingPricesFromApi =
    apiSummary?.missingPrices ?? 0;
  const needsUpdatePricesFromApi =
    apiSummary?.needsUpdatePrices ?? 0;

  const readinessColor =
    readinessLabelFromApi === 'Green'
      ? '#22c55e'
      : readinessLabelFromApi === 'Yellow'
      ? '#facc15'
      : '#fb7185';

  const timeCaption = computeTimeCaption(timeMode);

  const baseBudMessage = computeBudMessage(readinessLabelFromApi, timeMode);
  const budScenarioPrefix =
    scenarioMode === 'slammed'
      ? 'Given tonight is slammed service, '
      : scenarioMode === 'shortstaff'
      ? 'Given the team is short-staffed, '
      : '';

  const budMessage =
    budScenarioPrefix.length > 0
      ? budScenarioPrefix + baseBudMessage.charAt(0).toLowerCase() + baseBudMessage.slice(1)
      : baseBudMessage;

  const timeLabel =
    timeMode === 'sunday'
      ? 'Sunday (pre-week)'
      : timeMode === 'monday8'
      ? 'Monday 08:00'
      : 'Monday 09:30';

  const scenarioText = scenarioLabel(scenarioMode);

  const plainSummary = `Scenario: ${scenarioText}. Time: ${timeLabel}. Auction readiness: ${readinessLabelFromApi}. Items needing order: ${itemsNeedingOrderFromApi}. Missing prices: ${missingPricesFromApi}. Needs-update prices: ${needsUpdatePricesFromApi}.`;

  const apiBudActions = apiSummary?.budActions ?? [
    'This is a fallback demo summary. In a real setup, Bud will provide tailored actions per location.'
  ];

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(plainSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleBudAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budQuestion.trim()) return;

    try {
      setBudChatLoading(true);
      setBudChatError(null);
      setBudAnswer(null);
      setBudSuggestions([]);

      const res = await fetch('/api/bud/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'founder',
          locationName: currentLocation?.name ?? 'this restaurant',
          question: budQuestion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        const msg = data?.error || 'Bud could not answer right now.';
        setBudChatError(msg);
        return;
      }

      setBudAnswer(data.answer || null);
      setBudSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (err) {
      console.error('Error calling /api/bud/chat:', err);
      setBudChatError('Network or server error when contacting Bud.');
    } finally {
      setBudChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Founder portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Multi-location readiness, Bud & Mintsy
          </h1>
          <p className="text-sm text-slate-400">
            This is the dedicated founder portal. You can switch between restaurants and see
            per-location readiness, Bud summaries, Mintsy ledger entries, and distributor reliability signals.
          </p>
        </header>

        {/* Location selector + time/scenario/Bud toggle */}
        <section className="grid gap-3 md:grid-cols-3">
          {/* Location selector */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 space-y-2">
            <p className="text-[11px] text-slate-300 mb-1">Location</p>
            {locationsLoading ? (
              <p className="text-[11px] text-slate-400">Loading locations...</p>
            ) : locationsError ? (
              <p className="text-[11px] text-amber-300">{locationsError}</p>
            ) : (
              <div className="space-y-1">
                {currentLocation ? (
                  <>
                    <p className="text-sm font-semibold text-slate-50">
                      {currentLocation.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentLocation.city || 'Unknown city'} ·{' '}
                      {currentLocation.region || 'Unknown region'}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400">No location selected.</p>
                )}
                {locations.length > 0 && (
                  <select
                    value={selectedLocationId ?? ''}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="mt-1 w-full rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/80"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Time mode */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 space-y-2">
            <p className="text-[11px] text-slate-300 mb-1">Time of week (demo)</p>
            <div className="flex flex-wrap gap-1 text-[11px]">
              <TimePill mode="sunday" label="Sunday" timeMode={timeMode} setTimeMode={setTimeMode} />
              <TimePill mode="monday8" label="Mon 08:00" timeMode={timeMode} setTimeMode={setTimeMode} />
              <TimePill mode="monday930" label="Mon 09:30" timeMode={timeMode} setTimeMode={setTimeMode} />
            </div>
          </div>

          {/* Scenario + Bud toggle */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 flex flex-col justify-between space-y-2">
            <div>
              <p className="text-[11px] text-slate-300 mb-1">Tonight&apos;s scenario</p>
              <div className="flex flex-wrap gap-1 text-[11px] mb-2">
                <ScenarioPill mode="normal" label="Normal" scenarioMode={scenarioMode} setScenarioMode={setScenarioMode} />
                <ScenarioPill mode="slammed" label="Slammed" scenarioMode={scenarioMode} setScenarioMode={setScenarioMode} />
                <ScenarioPill mode="shortstaff" label="Short-staffed" scenarioMode={scenarioMode} setScenarioMode={setScenarioMode} />
              </div>
              <p className="text-[11px] text-slate-500">
                Adjust the scenario to see how Bud&apos;s summary changes for this location.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBudEnabled((prev) => !prev)}
              className={
                'mt-2 inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] ' +
                (budEnabled
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 bg-slate-950 text-slate-300')
              }
            >
              Bud panels: {budEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </section>

        {/* Time caption */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] text-slate-300">{timeCaption}</p>
          {apiLoading && (
            <p className="text-[11px] text-slate-400 mt-1">
              Loading founder summary from database...
            </p>
          )}
          {apiError && !apiLoading && (
            <p className="text-[11px] text-amber-300 mt-1">{apiError}</p>
          )}
        </section>

        {/* Readiness + key metrics */}
        <section className="grid gap-3 sm:grid-cols-3">
          {/* Auction readiness */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-3 space-y-1">
            <p className="text-[11px] text-slate-300">Auction readiness</p>
            <p
              className="text-2xl font-semibold"
              style={{ color: readinessColor }}
            >
              {readinessLabelFromApi}
            </p>
            <p className="text-[11px] text-slate-400">
              Derived from items below par and pricing coverage for this location.
            </p>
          </div>

          {/* Items needing order */}
          <div className="rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-3 py-3 space-y-1">
            <p className="text-[11px] text-emerald-100">Items needing order</p>
            <p className="text-2xl font-semibold text-emerald-200">
              {itemsNeedingOrderFromApi}
            </p>
            <p className="text-[11px] text-emerald-100/80">
              Buyer-side risk from par levels and on-hand counts for this restaurant.
            </p>
          </div>

          {/* Pricing coverage */}
          <div className="rounded-xl border border-sky-500/70 bg-sky-500/10 px-3 py-3 space-y-1">
            <p className="text-[11px] text-sky-100">Pricing coverage</p>
            <p className="text-[11px] text-sky-100">
              Missing: {missingPricesFromApi} · Needs update: {needsUpdatePricesFromApi}
            </p>
            <p className="text-[11px] text-sky-100/80">
              This will evolve into a reliability score Bud can track over weeks and months.
            </p>
          </div>
        </section>

        {/* Items below par list (demo) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          {fallbackItemsNeeding.length > 0 ? (
            <>
              <p className="text-[11px] text-slate-300 mb-2">
                Items below par (demo list):
              </p>
              <ul className="space-y-1 text-[11px] text-slate-100">
                {fallbackItemsNeeding.map((line) => {
                  const suggested = Math.max(line.par - line.onHand, 0);
                  return (
                    <li key={line.sku}>
                      {line.name} –{' '}
                      <span className="text-emerald-200">
                        {suggested.toFixed(1)} {line.unit}
                      </span>{' '}
                      suggested
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-[11px] text-slate-400">
              All tracked items are at or above par levels. (In a real system, Bud would mark this as
              low-risk for tonight.)
            </p>
          )}
        </section>

        {/* Bud recommended actions (from API) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 space-y-2">
          <p className="text-[11px] text-slate-200 font-semibold">
            Bud recommended actions (location-aware)
          </p>
          <ul className="space-y-1 text-[11px] text-slate-100">
            {apiBudActions.map((action, idx) => (
              <li key={idx}>• {action}</li>
            ))}
          </ul>
        </section>

        {/* Copy-ready summary */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-200 font-semibold">
              Founder summary (copy-ready)
            </p>
            <button
              type="button"
              onClick={handleCopySummary}
              className={
                'rounded-full border px-3 py-1 text-[11px] ' +
                (copied
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                  : 'border-sky-500 bg-sky-500/10 text-sky-100')
              }
            >
              {copied ? 'Copied!' : 'Copy summary'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            This is a one-line summary suitable for sending to a partner, investor, or your own notes.
            In a real app, Bud could generate a richer variant or email it automatically.
          </p>
          <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-mono text-slate-100">
            {plainSummary}
          </div>
        </section>

        {/* Founder summary via API (raw view) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-200 font-semibold">
              Founder summary (via API)
            </p>
          </div>
          {apiLoading && (
            <p className="text-[11px] text-slate-400">
              Loading /api/founder/summary...
            </p>
          )}
          {apiError && !apiLoading && (
            <p className="text-[11px] text-amber-300">
              {apiError}
            </p>
          )}
          {!apiLoading && !apiError && apiSummary && (
            <div className="space-y-1 text-[11px] text-slate-100">
              <p>
                API timeMode:{' '}
                <span className="font-mono text-sky-200">
                  {apiSummary.timeMode}
                </span>{' '}
                · scenario:{' '}
                <span className="font-mono text-sky-200">
                  {apiSummary.scenarioMode}
                </span>
              </p>
              <p>
                API readiness:{' '}
                <span className="font-mono text-emerald-200">
                  {apiSummary.readinessLabel}
                </span>{' '}
                · items needing order:{' '}
                <span className="font-mono text-emerald-200">
                  {apiSummary.itemsNeedingOrder}
                </span>{' '}
                · missing prices:{' '}
                <span className="font-mono text-emerald-200">
                  {apiSummary.missingPrices}
                </span>{' '}
                · needs-update prices:{' '}
                <span className="font-mono text-emerald-200">
                  {apiSummary.needsUpdatePrices}
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Mintsy ledger (demo) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-200 font-semibold">
              Mintsy ledger (demo)
            </p>
          </div>
          {mintsyLoading && (
            <p className="text-[11px] text-slate-400">
              Loading Mintsy ledger...
            </p>
          )}
          {mintsyError && !mintsyLoading && (
            <p className="text-[11px] text-amber-300">
              {mintsyError}
            </p>
          )}
          {!mintsyLoading && !mintsyError && mintsyEntries.length === 0 && (
            <p className="text-[11px] text-slate-400">
              No Mintsy events have been logged yet. Try saving a draft order as a buyer to generate events.
            </p>
          )}
          {!mintsyLoading && !mintsyError && mintsyEntries.length > 0 && (
            <div className="space-y-1 text-[11px] text-slate-100">
              <ul className="space-y-1">
                {mintsyEntries.map((entry: any) => {
                  const payload = entry.payload ?? {};
                  const locName =
                    payload.locationName ||
                    payload.location ||
                    'Unknown location';
                  const lines = Array.isArray(payload.lines) ? payload.lines : [];
                  return (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-emerald-300">
                          {entry.eventType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-100 mt-1">
                        Location: <span className="font-medium">{locName}</span>
                      </p>
                      {lines.length > 0 && (
                        <p className="text-[10px] text-slate-400">
                          Lines snapshot: {lines.length} item
                          {lines.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-slate-500">
                Mintsy currently holds these events in memory for demo purposes.
                In a future phase, this ledger can be persisted and cryptographically chained.
              </p>
            </div>
          )}
        </section>

        {/* Ask Bud (beta) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 space-y-2">
          <p className="text-[11px] text-slate-200 font-semibold">
            Ask Bud (beta)
          </p>
          <p className="text-[11px] text-slate-400">
            Ask Bud a question about tonight&apos;s risk, readiness, or strategy for this location. This uses
            the Bud API stub and can later be upgraded to a full AI integration.
          </p>
          <form onSubmit={handleBudAsk} className="space-y-2">
            <textarea
              value={budQuestion}
              onChange={(e) => setBudQuestion(e.target.value)}
              placeholder="Example: What should I double-check for this location before service tonight?"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/80"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={budChatLoading || !budQuestion.trim()}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-medium text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60"
              >
                {budChatLoading ? 'Asking Bud…' : 'Ask Bud'}
              </button>
              {currentLocation && (
                <p className="text-[11px] text-slate-500">
                  Context: <span className="text-slate-200">{currentLocation.name}</span>
                </p>
              )}
            </div>
          </form>
          {budChatError && (
            <p className="text-[11px] text-amber-300">{budChatError}</p>
          )}
          {budAnswer && (
            <div className="mt-2 space-y-1 text-[11px] text-slate-100">
              <p className="font-semibold text-slate-50">Bud&apos;s answer:</p>
              <p>{budAnswer}</p>
              {budSuggestions.length > 0 && (
                <div className="mt-1">
                  <p className="text-[11px] text-slate-200 font-semibold">
                    Bud&apos;s suggestions:
                  </p>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-[11px] text-slate-100">
                    {budSuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bud chat bubble */}
        {budEnabled && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 flex gap-3 items-start shadow-lg shadow-slate-950/70">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-sky-500 to-emerald-500 shadow-lg shadow-sky-500/60 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-sky-200">
                Bud summary
              </p>
              <p className="text-[11px] text-slate-100 leading-relaxed">
                {budMessage}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ===== Small UI helper components for pills =====

type TimePillProps = {
  mode: TimeMode;
  label: string;
  timeMode: TimeMode;
  setTimeMode: (m: TimeMode) => void;
};

function TimePill({ mode, label, timeMode, setTimeMode }: TimePillProps) {
  const isActive = timeMode === mode;
  return (
    <button
      type="button"
      onClick={() => setTimeMode(mode)}
      className={
        'rounded-full border px-3 py-1 ' +
        (isActive
          ? 'border-sky-500 bg-sky-500/15 text-sky-100'
          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500')
      }
    >
      {label}
    </button>
  );
}

type ScenarioPillProps = {
  mode: ScenarioMode;
  label: string;
  scenarioMode: ScenarioMode;
  setScenarioMode: (m: ScenarioMode) => void;
};

function ScenarioPill({ mode, label, scenarioMode, setScenarioMode }: ScenarioPillProps) {
  const isActive = scenarioMode === mode;
  return (
    <button
      type="button"
      onClick={() => setScenarioMode(mode)}
      className={
        'rounded-full border px-3 py-1 ' +
        (isActive
          ? 'border-amber-500 bg-amber-500/15 text-amber-100'
          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500')
      }
    >
      {label}
    </button>
  );
}
