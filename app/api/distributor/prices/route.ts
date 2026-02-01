// app/api/distributor/prices/route.ts
import { NextResponse } from 'next/server';

// Static weekly prices for the demo distributor.
// Avoids Prisma/DB in dev and build.
export async function GET() {
  const now = new Date().toISOString();

  const items = [
    {
      sku: 'AVO-48',
      priceCents: 6200,
      lastSubmitted: now,
      status: 'on_time',
    },
    {
      sku: 'ROMA-25',
      priceCents: 3200,
      lastSubmitted: now,
      status: 'needs_update',
    },
    {
      sku: 'LETT-MIX',
      priceCents: null,
      lastSubmitted: null,
      status: 'missing',
    },
    {
      sku: 'RUS-50',
      priceCents: 2800,
      lastSubmitted: now,
      status: 'needs_update',
    },
  ];

  return NextResponse.json(
    {
      distributor: {
        id: 'dist-demo',
        name: 'Valley Produce Co.',
        region: 'Phoenix',
      },
      items,
    },
    { status: 200 }
  );
}
