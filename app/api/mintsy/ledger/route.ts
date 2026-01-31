// app/api/mintsy/ledger/route.ts
import { NextResponse } from 'next/server';
import { ledgerEntries } from '../log/route';

// GET /api/mintsy/ledger
// Optional query param: ?limit=number (default 50)
// Returns the most recent Mintsy ledger entries (in-memory demo).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    let limit = 50;

    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }

    const entries = [...ledgerEntries]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, limit);

    return NextResponse.json(
      {
        entries,
        count: entries.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error in /api/mintsy/ledger:', err);
    return NextResponse.json(
      { error: 'Failed to read Mintsy ledger (internal error).' },
      { status: 500 }
    );
  }
}
