'use client';

import React, { useState, useEffect } from 'react';

type TimeMode = 'sunday' | 'monday8' | 'monday930';
type PriceStatus = 'on_time' | 'needs_update' | 'missing';

type ApiItem = {
  sku: string;
  priceCents: number | null;
  lastSubmitted: string | null;
  status: PriceStatus;
};

type DistributorMeta = {
  id: string;
  name: string;
  region: string | null;
};

type DistributorItem = {
  sku: string;
  name: string;
  priceCents: number | null;
  lastSubmitted: string | null;
  status: PriceStatus;
};

type RestockrLocation = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
};

// Local metadata for display names (since DistributorPrice only stores sku).
const skuNameMap: Record<string, string> = {
  'AVO-48': 'Avocados 48ct',
  'ROMA-25': 'Tomatoes Roma 25lb',
  'LETT-MIX': 'Spring mix 3lb',
  'RUS-50': 'Potatoes russet 50lb',
};

// Fallback demo items (matching your seeded data).
const fallbackItems: DistributorItem[] = [
  {
    sku: 'AVO-48',
    name: 'Avocados 48ct',
    priceCents: 6200,
    lastSubmitted: 'Mon 7:45am',
    status: 'on_time',
  },
  {
    sku: 'ROMA-25',
    name: 'Tomatoes Roma 25lb',
    priceCents: 3200,
    lastSubmitted: 'Sun 3:10pm',
    status: 'needs_update',
  },
  {
    sku: 'LETT-MIX',
    name: 'Spring mix 3lb',
    priceCents: null,
    lastSubmitted: null,
    status: 'missing',
  },
  {
    sku: 'RUS-50',
    name: 'Potatoes russet 50lb',
    priceCents: 2800,
    lastSubmitted: 'Mon 9:15am',
    status: 'needs_update',
  },
];

function aggregates(items: DistributorItem[]) {
  const missing = items.filter((i) => i.status === 'missing').length;
  const needsUpdate = items.filter((i) => i.status === 'needs_update').length;
  const onTime = items.filter((i) => i.status === 'on_time').length;
  const total = items.length;
  return { missing, needsUpdate, onTime, total };
}

function statusLabel(status: PriceStatus) {
  if (status === 'on_time') return 'On time';
  if (status === 'needs_update') return 'Needs update';
  return 'Missing';
}

function statusColorClasses(status: PriceStatus) {
  if (status === 'on_time') return 'border-emerald-400/70 text-emerald-200';
  if (status === 'needs_update') return 'border-amber-300/70 text-amber-200';
  return 'border-rose-300/70 text-rose-200';
}

function timeCaption(timeMode: TimeMode) {
  if (timeMode === 'sunday') {
    return 'It is Sunday. Bud is not nudging you yet; this is a calm pre-week view of your price coverage.';
  }
  if (timeMode === 'monday8') {
    return 'It is Monday 8:00am. This is the reminder window: Bud would nudge you now about missing and outdated prices.';
  }
  return 'It is Monday 9:30am. The official cutoff has passed; Bud would treat missing and outdated prices as at-risk for exclusion.';
}

export default function DistributorPage() {
  const [timeMode, setTimeMode] = useState<TimeMode>('sunday');

  const [items, setItems] = useState<DistributorItem[]>(fallbackItems);
  const [distributorMeta, setDistributorMeta] = useState<DistributorMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { missing, needsUpdate, onTime, total } = aggregates(items);

  // Locations served (for now, all locations from /api/locations)
  const [locations, setLocations] = useState<RestockrLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Load pricing from /api/distributor/prices
  useEffect(() => {
    async function loadPrices() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch('/api/distributor/prices');

        let data: any = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error('Error parsing JSON from /api/distributor/prices:', parseErr);
          data = null;
        }

        if (!data || !Array.isArray(data.items)) {
          setItems(fallbackItems);
          setLoadError('Could not interpret pricing data from database; showing demo data.');
        } else if (data.items.length === 0) {
          setItems(fallbackItems);
          setLoadError('No pricing found in database; showing demo data.');
        } else {
          const mappedItems: DistributorItem[] = data.items.map((item: ApiItem) => ({
            sku: item.sku,
            name: skuNameMap[item.sku] ?? item.sku,
            priceCents: item.priceCents,
            lastSubmitted: item.lastSubmitted,
            status: item.status,
          }));
          setItems(mappedItems);
          setLoadError(null);
        }

        if (data && data.distributor) {
          setDistributorMeta({
            id: data.distributor.id,
            name: data.distributor.name,
            region: data.distributor.region ?? null,
          });
        } else {
          setDistributorMeta(null);
        }
      } catch (err) {
        console.error('Error loading distributor prices from DB:', err);
        setItems(fallbackItems);
        setLoadError('Could not load distributor prices from database; showing demo data instead.');
      } finally {
        setLoading(false);
      }
    }

    loadPrices();
  }, []);

  // Load locations list (restaurants served)
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
        } else {
          setLocations(data.locations);
        }
      } catch (err) {
        console.error('Error loading locations for distributor view:', err);
        setLocationsError('Could not load locations from database.');
        setLocations([]);
      } finally {
        setLocationsLoading(false);
      }
    }

    loadLocations();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Distributor portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly produce pricing dashboard
          </h1>
          <p className="text-sm text-slate-400">
            This is the dedicated distributor portal. Your prices are pulled from the real database
            (Neon via Prisma). You can also see which restaurants you are currently serving.
          </p>
          {distributorMeta && (
            <p className="text-[11px] text-slate-500">
              Viewing distributor:{' '}
              <span className="text-slate-200 font-medium">
                {distributorMeta.name}
              </span>{' '}
              {distributorMeta.region && (
                <span className="text-slate-400">({distributorMeta.region})</span>
              )}
            </p>
          )}
        </header>

        {/* Locations served */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 space-y-1">
          <p className="text-[11px] text-slate-300 mb-1">Restaurants served (demo)</p>
          {locationsLoading ? (
            <p className="text-[11px] text-slate-400">Loading locations...</p>
          ) : locationsError ? (
            <p className="text-[11px] text-amber-300">{locationsError}</p>
          ) : locations.length === 0 ? (
            <p className="text-[11px] text-slate-400">No restaurants found in database.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-[11px] text-slate-100">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5"
                >
                  {loc.name}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-slate-500">
            In a future phase, you&apos;ll see only the locations that are actually linked to your
            distributor via LocationDistributor.
          </p>
        </section>

        {/* Time mode pills (demo simulation) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-300">Time of week (demo)</p>
          <div className="flex gap-2 text-[11px]">
            <TimePill mode="sunday" label="Sunday (pre-week)" timeMode={timeMode} setTimeMode={setTimeMode} />
            <TimePill mode="monday8" label="Monday 08:00" timeMode={timeMode} setTimeMode={setTimeMode} />
            <TimePill mode="monday930" label="Monday 09:30" timeMode={timeMode} setTimeMode={setTimeMode} />
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard
            title="Total items"
            value={total}
            borderColor="border-emerald-500/70"
            bg="bg-emerald-500/10"
            textColor="text-emerald-200"
          />
          <SummaryCard
            title="Needs update"
            value={needsUpdate}
            borderColor="border-amber-400/70"
            bg="bg-amber-400/10"
            textColor="text-amber-100"
          />
          <SummaryCard
            title="Missing prices"
            value={missing}
            borderColor="border-rose-400/70"
            bg="bg-rose-400/10"
            textColor="text-rose-100"
          />
        </section>

        {/* Time caption */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] text-slate-300">{timeCaption(timeMode)}</p>
          {loading && (
            <p className="text-[11px] text-slate-400 mt-1">
              Loading pricing from database...
            </p>
          )}
          {loadError && !loading && (
            <p className="text-[11px] text-amber-300 mt-1">
              {loadError}
            </p>
          )}
        </section>

        {/* Table of items */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Weekly price status
              </h2>
              <p className="text-[11px] text-slate-400">
                In the real app, you&apos;ll update prices here each week. Bud will gently nudge you
                if anything is missing or outdated as you approach Monday 9:00am.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/90 overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Item
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Last price
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Last submitted
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.sku} className="border-b border-slate-800/70">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-slate-50">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.sku}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-slate-100">
                      {item.priceCents != null
                        ? `$${(item.priceCents / 100).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-300">
                      {item.lastSubmitted
                        ? new Date(item.lastSubmitted).toLocaleString()
                        : 'No record'}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ' +
                          statusColorClasses(item.status)
                        }
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bud-style reminders */}
          <div className="text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-slate-50">Bud-style reminders (demo)</p>
            {timeMode === 'sunday' && (
              <p>
                • It&apos;s still Sunday. Bud is watching patterns. You&apos;ll get a nudge if
                missing or outdated prices remain when Monday 8:00am arrives.
              </p>
            )}
            {timeMode === 'monday8' && (
              <p>
                • It&apos;s Monday 8:00am. Bud would highlight the {missing} missing and{' '}
                {needsUpdate} outdated price(s), and ping you to update them before 9:00am.
              </p>
            )}
            {timeMode === 'monday930' && (
              <p>
                • It&apos;s Monday 9:30am. The cutoff is past. Bud would treat missing or outdated
                prices as at-risk for exclusion from the auction, and surface this in the founder
                view as a reliability signal.
              </p>
            )}
            {missing > 0 && (
              <p>
                • Missing prices for {missing} item{missing > 1 ? 's' : ''}. These items would be
                excluded from the auction until updated.
              </p>
            )}
            {needsUpdate > 0 && (
              <p>
                • {needsUpdate} item{needsUpdate > 1 ? 's' : ''} marked as &quot;Needs update&quot;.
                Refresh these before relying on the results.
              </p>
            )}
            {onTime > 0 && (
              <p>
                • {onTime} item{onTime > 1 ? 's' : ''} already updated. No action needed there.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

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

type SummaryCardProps = {
  title: string;
  value: number;
  borderColor: string;
  bg: string;
  textColor: string;
};

function SummaryCard({ title, value, borderColor, bg, textColor }: SummaryCardProps) {
  return (
    <div
      className={
        'rounded-xl border px-3 py-3 ' +
        borderColor +
        ' ' +
        bg
      }
    >
      <p className={'text-[11px] ' + textColor}>{title}</p>
      <p className={'text-xl font-semibold ' + textColor}>{value}</p>
    </div>
  );
}
