// app/api/mintsy/log/route.ts
import { NextResponse } from 'next/server';

type MintsyEntry = {
  id: string;
  timestamp: string;
  eventType: string;
  payload: any;
};

// Simple in-memory ledger for Mintsy (demo only).
// This lives in memory and resets when the dev server restarts.
const ledgerEntries: MintsyEntry[] = [];

// Helper to create a simple ID
function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// POST /api/mintsy/log
// Body: { eventType: string; payload: any }
// DEMO: logs the event into an in-memory ledger array.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const eventType = body?.eventType?.toString?.();
    const payload = body?.payload ?? null;

    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      );
    }

    const entry: MintsyEntry = {
      id: createId(),
      timestamp: new Date().toISOString(),
      eventType,
      payload,
    };

    ledgerEntries.push(entry);

    console.log('🪙 Mintsy log entry created:', entry);

    return NextResponse.json(
      {
        success: true,
        entry,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error in /api/mintsy/log:', err);
    return NextResponse.json(
      { error: 'Failed to log Mintsy event (internal error).' },
      { status: 500 }
    );
  }
}

// For convenience, expose the ledger array here so other routes
// in this module (e.g., /api/mintsy/ledger) can reuse it.
export { ledgerEntries };
