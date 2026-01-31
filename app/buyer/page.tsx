'use client';

import React, { useState, useEffect } from 'react';

type Distributor = {
  id: string;
  name: string;
  region: string;
  email: string;
};

type RestockrLocation = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
};

type OrderLine = {
  sku: string;
  name: string;
  par: number;
  onHand: number;
  unit: string;
};

type ChecklistItem = {
  type: 'ok' | 'warn' | 'alert';
  text: string;
};

type SaveStatus = 'idle' | 'saved' | 'sent';

// Voice ordering parsed suggestion
type VoiceSuggestion = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
};

const demoDistributors: Distributor[] = [
  { id: 'dist1', name: 'Valley Produce Co.', region: 'Phoenix', email: 'rep@valleyproduce.com' },
  { id: 'dist2', name: 'Sonoran Fresh Foods', region: 'Phoenix', email: 'hello@sonoranfresh.com' },
  { id: 'dist3', name: 'Desert Greens Supply', region: 'Tempe', email: 'sales@desertgreens.com' }
];

// Fallback order lines (same as you seeded in the DB)
const fallbackOrderLines: OrderLine[] = [
  { sku: 'AVO-48', name: 'Avocados 48ct', par: 4, onHand: 1.5, unit: 'cases' },
  { sku: 'ROMA-25', name: 'Tomatoes Roma 25lb', par: 3, onHand: 0.5, unit: 'cases' },
  { sku: 'LETT-MIX', name: 'Spring mix 3lb', par: 5, onHand: 4, unit: 'boxes' },
  { sku: 'RUS-50', name: 'Potatoes russet 50lb', par: 2, onHand: 0.2, unit: 'sacks' }
];

function computeBuyerChecklist(
  orderLines: OrderLine[]
): { checklistItems: ChecklistItem[]; itemsNeedingOrder: number; totalSuggestedUnits: number } {
  const itemsNeedingOrder = orderLines.filter((line) => line.par - line.onHand > 0.01).length;

  const criticallyLow = orderLines.filter((line) => line.par - line.onHand > line.par * 0.75);
  const completelyOut = orderLines.filter((line) => line.onHand <= 0.01);

  let totalSuggestedUnits = 0;
  for (const line of orderLines) {
    const suggested = Math.max(line.par - line.onHand, 0);
    totalSuggestedUnits += suggested;
  }

  const checklistItems: ChecklistItem[] = [];

  if (itemsNeedingOrder === 0) {
    checklistItems.push({
      type: 'ok',
      text: 'All tracked items are at or above par.'
    });
  } else {
    checklistItems.push({
      type: 'warn',
      text: `${itemsNeedingOrder} item${itemsNeedingOrder > 1 ? 's' : ''} below par. Double-check quantities before sending.`
    });
  }

  if (completelyOut.length > 0) {
    const names = completelyOut.map((l) => l.name).join(', ');
    checklistItems.push({
      type: 'alert',
      text: `You are completely out of: ${names}. Confirm delivery timing.`
    });
  }

  if (criticallyLow.length > 0 && itemsNeedingOrder > 0) {
    const names = criticallyLow.map((l) => l.name).join(', ');
    checklistItems.push({
      type: 'warn',
      text: `Critical low stock on: ${names}. Consider ordering a bit extra.`
    });
  }

  checklistItems.push({
    type: 'ok',
    text: 'Scan high-dollar items for mistakes (proteins, liquor, high-end produce).'
  });

  return { checklistItems, itemsNeedingOrder, totalSuggestedUnits };
}

// Simple mapping from item keywords to SKUs (for voice stub)
const nameToSkuMap: { keyword: string; sku: string }[] = [
  { keyword: 'avocado', sku: 'AVO-48' },
  { keyword: 'avocados', sku: 'AVO-48' },
  { keyword: 'avo', sku: 'AVO-48' },
  { keyword: 'roma', sku: 'ROMA-25' },
  { keyword: 'tomato', sku: 'ROMA-25' },
  { keyword: 'tomatoes', sku: 'ROMA-25' },
  { keyword: 'spring mix', sku: 'LETT-MIX' },
  { keyword: 'lettuce', sku: 'LETT-MIX' },
  { keyword: 'potato', sku: 'RUS-50' },
  { keyword: 'potatoes', sku: 'RUS-50' },
  { keyword: 'russet', sku: 'RUS-50' },
];

function findSkuForPhrase(phrase: string): string | null {
  const lower = phrase.toLowerCase();
  for (const entry of nameToSkuMap) {
    if (lower.includes(entry.keyword)) {
      return entry.sku;
    }
  }
  return null;
}

// Basic parser for voice text like "3 cases avocados and 2 boxes spring mix"
function parseVoiceTranscript(
  transcript: string,
  orderLines: OrderLine[]
): VoiceSuggestion[] {
  const results: VoiceSuggestion[] = [];
  const tokens = transcript
    .replace(/[,\.]/g, ' ')
    .split(/\band\b/gi)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  // We'll walk tokens and look for patterns: number + unit? + name keywords
  for (let i = 0; i < tokens.length; i++) {
    const maybeQty = parseFloat(tokens[i]);
    if (!Number.isNaN(maybeQty) && maybeQty > 0) {
      const quantity = maybeQty;

      // Try to see if the next token is a unit (cases, boxes, sacks)
      const possibleUnit = tokens[i + 1]?.toLowerCase() ?? '';
      let unit = 'units';
      let nameStartIndex = i + 1;

      if (/case|cases/.test(possibleUnit)) {
        unit = 'cases';
        nameStartIndex = i + 2;
      } else if (/box|boxes/.test(possibleUnit)) {
        unit = 'boxes';
        nameStartIndex = i + 2;
      } else if (/sack|sacks/.test(possibleUnit)) {
        unit = 'sacks';
        nameStartIndex = i + 2;
      }

      // Build a short phrase from the next few tokens for item name detection
      const nameTokens = tokens.slice(nameStartIndex, nameStartIndex + 3);
      const namePhrase = nameTokens.join(' ');
      const sku = findSkuForPhrase(namePhrase);

      if (sku) {
        const line = orderLines.find((l) => l.sku === sku);
        const name = line?.name ?? sku;
        results.push({ sku, name, quantity, unit });
      }
    }
  }

  return results;
}

export default function BuyerPage() {
  // Local distributors (demo for now)
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(
    demoDistributors.length > 0 ? demoDistributors[0].id : null
  );

  const selectedDistributor =
    demoDistributors.find((d) => d.id === selectedDistributorId) ?? null;

  // Invite distributor form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent'>('idle');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Locations state
  const [locations, setLocations] = useState<RestockrLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Tonight's order, DB-backed with fallback
  const [orderLines, setOrderLines] = useState<OrderLine[]>(fallbackOrderLines);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  // DB orderId (not used for writes in this demo)
  const [orderId, setOrderId] = useState<string | null>(null);

  // Save / send status (demo only)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const { checklistItems, itemsNeedingOrder, totalSuggestedUnits } =
    computeBuyerChecklist(orderLines);

  // ⭐ Favorites (pinned items) – stored in localStorage
  const [favoriteSkus, setFavoriteSkus] = useState<string[]>([]);

  // Voice ordering state
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceSuggestions, setVoiceSuggestions] = useState<VoiceSuggestion[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('restockr_buyer_favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavoriteSkus(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading favorites from localStorage:', err);
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    try {
      window.localStorage.setItem(
        'restockr_buyer_favorites',
        JSON.stringify(favoriteSkus)
      );
    } catch (err) {
      console.error('Error saving favorites to localStorage:', err);
    }
  }, [favoriteSkus]);

  const toggleFavorite = (sku: string) => {
    setFavoriteSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  // Load locations from /api/locations on mount
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
        console.error('Error loading locations:', err);
        setLocationsError('Could not load locations from database.');
        setLocations([]);
        setSelectedLocationId(null);
      } finally {
        setLocationsLoading(false);
      }
    }

    loadLocations();
  }, []);

  // Load the order when selectedLocationId changes
  useEffect(() => {
    async function loadOrderForLocation(locationId: string) {
      try {
        setOrderLoading(true);
        setOrderError(null);

        const url = `/api/orders/today?locationId=${encodeURIComponent(locationId)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !Array.isArray(data.lines) || data.lines.length === 0) {
          const msg = data?.error || 'No order found for this location; showing demo data.';
          setOrderError(msg);
          setOrderLines(fallbackOrderLines);
          setOrderId(null);
        } else {
          setOrderLines(
            data.lines.map((line: any) => ({
              sku: line.sku,
              name: line.name,
              par: line.par,
              onHand: line.onHand,
              unit: line.unit,
            }))
          );
          setOrderId(data.order?.id ?? null);
          setOrderError(null);
        }
      } catch (err) {
        console.error('Error loading order from DB:', err);
        setOrderLines(fallbackOrderLines);
        setOrderId(null);
        setOrderError('Could not load order from database; showing demo data instead.');
      } finally {
        setOrderLoading(false);
      }
    }

    if (selectedLocationId) {
      loadOrderForLocation(selectedLocationId);
    }
  }, [selectedLocationId]);

  const currentLocation =
    locations.find((loc) => loc.id === selectedLocationId) ?? null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteMessage(null);
    setInviteStatus('idle');

    if (!inviteName.trim() || !inviteEmail.trim()) {
      alert('Please enter both a name and email for the distributor.');
      return;
    }

    try {
      const res = await fetch('/api/distributor/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const msg =
          data?.error ??
          'Failed to create distributor invite. Make sure the server is running.';
        setInviteError(msg);
        alert(msg);
        return;
      }

      setInviteStatus('sent');
      setInviteMessage(
        'Distributor invite created in memory (demo only). In a future phase, this will send a real email to the rep.'
      );
      setInviteName('');
      setInviteEmail('');
    } catch (err) {
      console.error('Error sending invite:', err);
      const msg =
        'Network or server error while creating distributor invite (demo).';
      setInviteError(msg);
      alert(msg);
    }
  };

  const handleOnHandChange = (sku: string, value: string) => {
    const parsed = parseFloat(value);
    const safe = isNaN(parsed) ? 0 : parsed;
    setOrderLines((prev) =>
      prev.map((line) =>
        line.sku === sku ? { ...line, onHand: safe } : line
      )
    );
  };

 const handleSaveDraft = () => {
  // DEMO: Treat this as a local draft save only.
  console.log('[Buyer] Save draft clicked. Current order lines:', orderLines);
  setSaveStatus('saved');

  // Mintsy logging (fire-and-forget, demo only)
  try {
    void fetch('/api/mintsy/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'BUYER_SAVE_DRAFT',
        payload: {
          locationId: currentLocation?.id ?? null,
          locationName: currentLocation?.name ?? null,
          lines: orderLines.map((line) => ({
            sku: line.sku,
            name: line.name,
            par: line.par,
            onHand: line.onHand,
            unit: line.unit,
          })),
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => {
      // Swallow errors in demo mode; logging failures should not affect the UI.
    });
  } catch {
    // Ignore any unexpected errors in demo mode
  }
};

  const handleSendOrder = () => {
    // DEMO: treat as a "sent" status in UI only.
    setSaveStatus('sent');
  };

  const statusText =
    saveStatus === 'saved'
      ? 'Draft saved locally (demo).'
      : saveStatus === 'sent'
      ? 'Order sent (demo only, not actually transmitted).'
      : 'No recent actions yet.';

  const handleProcessVoice = (e: React.FormEvent) => {
    e.preventDefault();
    setVoiceError(null);
    setVoiceSuggestions([]);

    if (!voiceTranscript.trim()) {
      setVoiceError('Please provide a simulated voice transcript first.');
      return;
    }

    const suggestions = parseVoiceTranscript(voiceTranscript, orderLines);
    if (suggestions.length === 0) {
      setVoiceError(
        'Could not recognize any items from this transcript. Try including both quantity and item name, e.g., "3 cases avocados and 2 boxes romas".'
      );
    } else {
      setVoiceSuggestions(suggestions);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Buyer portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Tonight&apos;s ordering hub</h1>
          <p className="text-sm text-slate-400">
            This is the dedicated buyer portal. Here, buyers review tonight&apos;s order per
            location, choose distributors, invite new reps into Restockr, pin their most important items,
            and even simulate voice ordering.
          </p>
        </header>

        {/* Location context with selector */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Location</p>
              {locationsLoading ? (
                <p className="text-sm text-slate-300">Loading locations...</p>
              ) : locationsError ? (
                <p className="text-sm text-amber-300">{locationsError}</p>
              ) : currentLocation ? (
                <>
                  <p className="text-sm font-medium text-slate-50">{currentLocation.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {currentLocation.city || 'Unknown city'} ·{' '}
                    {currentLocation.region || 'Unknown region'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-300">No location selected.</p>
              )}
            </div>
            {!locationsLoading && locations.length > 0 && (
              <div className="text-[11px] text-slate-300">
                <label className="mr-2">Switch restaurant:</label>
                <select
                  value={selectedLocationId ?? ''}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/80"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Local distributors selection (still demo) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Local distributors (demo)
              </h2>
              <p className="text-[11px] text-slate-400">
                These are demo distributors. In the real app, this will be filtered by the selected
                location and region.
              </p>
            </div>
          </div>

          {demoDistributors.length === 0 ? (
            <p className="text-xs text-slate-400">
              No local distributors found for this region yet.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300">
                Choose your distributor for tonight&apos;s order
              </label>
              <select
                value={selectedDistributorId ?? ''}
                onChange={(e) => setSelectedDistributorId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              >
                {demoDistributors.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name} ({dist.region})
                  </option>
                ))}
              </select>

              {selectedDistributor && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                  <p>
                    <span className="font-semibold text-slate-50">Selected distributor:</span>{' '}
                    {selectedDistributor.name}
                  </p>
                  <p>
                    Contact email:{' '}
                    <span className="text-emerald-200">{selectedDistributor.email}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Invite distributor form */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Invite a distributor
            </h2>
            <p className="text-[11px] text-slate-400">
              If your rep isn&apos;t in the list yet, you can invite them to join Restockr. This
              currently stores invites in memory for demo; later, we will persist and email them.
            </p>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Distributor name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Phoenix Produce Group"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Distributor rep email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="rep@distributor.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Send invite
            </button>
          </form>

          {inviteStatus === 'sent' && inviteMessage && (
            <p className="text-[11px] text-emerald-300">
              {inviteMessage}
            </p>
          )}
          {inviteError && (
            <p className="text-[11px] text-amber-300">
              {inviteError}
            </p>
          )}
        </section>

        {/* Voice ordering (beta) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Voice ordering (beta)
            </h2>
            <p className="text-[11px] text-slate-400">
              Paste or type a simulated voice transcript and I&apos;ll parse the quantities and items.
              Example: &quot;3 cases avocados and 2 boxes spring mix and 1 sack russets&quot;.
            </p>
          </div>

          <form onSubmit={handleProcessVoice} className="space-y-2 text-[11px]">
            <textarea
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder="Example: 3 cases avocados and 2 boxes roma tomatoes and 1 sack russets"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/80"
              rows={3}
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Process voice input
            </button>
          </form>

          {voiceError && (
            <p className="text-[11px] text-amber-300">
              {voiceError}
            </p>
          )}
          {voiceSuggestions.length > 0 && (
            <div className="space-y-1 text-[11px] text-slate-100">
              <p className="font-semibold text-slate-50">
                Parsed voice suggestions (demo only):
              </p>
              <ul className="space-y-1 list-disc list-inside">
                {voiceSuggestions.map((s, idx) => (
                  <li key={idx}>
                    {s.quantity} {s.unit} of {s.name} ({s.sku})
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500">
                In a future phase, these suggestions can be applied directly to tonight&apos;s order and logged to Mintsy.
              </p>
            </div>
          )}
        </section>

        {/* Tonight's order + Bud checklist */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-50">Tonight&apos;s order</h2>
            <p className="text-[11px] text-slate-400">
              Powered by your real database (Neon via Prisma) per location. If the database is empty or unreachable,
              we fall back to the demo data you&apos;ve been using.
            </p>
            {orderLoading && (
              <p className="text-[11px] text-slate-400">
                Loading order from database...
              </p>
            )}
            {orderError && !orderLoading && (
              <p className="text-[11px] text-amber-300">
                {orderError}
              </p>
            )}
          </div>

          {/* Order table */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Item
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Par
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    On hand
                  </th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium border-b border-slate-800">
                    Suggested order
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderLines.map((line) => {
                  const suggested = Math.max(line.par - line.onHand, 0);
                  const needsOrder = suggested > 0.01;
                  const isFavorite = favoriteSkus.includes(line.sku);
                  return (
                    <tr key={line.sku} className="border-b border-slate-800/70">
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-start gap-1">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(line.sku)}
                            className="mt-[1px] text-xs"
                            aria-label={isFavorite ? 'Unpin item' : 'Pin item'}
                          >
                            <span
                              className={
                                'inline-block ' +
                                (isFavorite ? 'text-amber-300' : 'text-slate-600')
                              }
                            >
                              ★
                            </span>
                          </button>
                          <div>
                            <div className="font-medium text-slate-50">{line.name}</div>
                            <div className="text-[10px] text-slate-500">{line.sku}</div>
                            {isFavorite && (
                              <div className="text-[9px] text-amber-300 uppercase tracking-[0.12em]">
                                Pinned
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-100">
                        {line.par} {line.unit}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          step="0.1"
                          value={line.onHand}
                          onChange={(e) => handleOnHandChange(line.sku, e.target.value)}
                          className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/80"
                        />{' '}
                        <span className="text-[10px] text-slate-500">{line.unit}</span>
                      </td>
                      <td
                        className={
                          'px-3 py-2 align-top text-[11px] ' +
                          (needsOrder ? 'text-emerald-300 font-semibold' : 'text-slate-500')
                        }
                      >
                        {needsOrder
                          ? `${suggested.toFixed(1)} ${line.unit}`
                          : 'No order needed'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total suggested summary */}
          <div className="text-right text-[11px] text-slate-400">
            Total suggested quantity across all items (demo units):{' '}
            <span className="text-slate-50 font-medium">
              {totalSuggestedUnits.toFixed(1)}
            </span>
          </div>

          {/* Bud checklist */}
          <div className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                  Bud checklist
                </p>
                <p className="text-xs font-semibold text-slate-50">
                  Pre-send review suggestions
                </p>
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                Demo Bud logic — no real AI yet.
              </p>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-100">
              {checklistItems.map((item, idx) => {
                const color =
                  item.type === 'ok'
                    ? 'text-emerald-300 border-emerald-400/70'
                    : item.type === 'warn'
                    ? 'text-amber-200 border-amber-300/70'
                    : 'text-rose-200 border-rose-300/70';
                const badge =
                  item.type === 'ok'
                    ? '✓'
                    : item.type === 'warn'
                    ? '⚠'
                    : '!';
                return (
                  <li key={idx} className="flex gap-2 items-start">
                    <span
                      className={
                        'inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ' +
                        color
                      }
                    >
                      {badge}
                    </span>
                    <span>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Review & send row */}
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-full border border-slate-500 bg-slate-950 px-3 py-1 text-slate-100 hover:border-slate-300"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20"
              >
                Send order
              </button>
            </div>
            <p className="text-right text-slate-400">{statusText}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
