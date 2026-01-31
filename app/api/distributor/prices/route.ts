// app/api/distributor/prices/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/distributor/prices
// Now backed by the real database (Neon via Prisma),
// with a shape compatible with the Distributor UI.
export async function GET() {
  try {
    // 1. Pick the first distributor in the DB (for now).
    const distributor = await prisma.distributor.findFirst();

    if (!distributor) {
      // No distributors in DB; return empty list instead of error.
      return NextResponse.json(
        {
          distributor: null,
          items: [],
        },
        { status: 200 }
      );
    }

    // 2. Compute Monday of the current week (weekStart),
    // exactly like in your seed script.
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = (day + 6) % 7; // distance back to Monday
    const monday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - diffToMonday
    );
    monday.setHours(0, 0, 0, 0);

    // 3. Fetch DistributorPrice rows for this distributor + this week.
    const prices = await prisma.distributorPrice.findMany({
      where: {
        distributorId: distributor.id,
        weekStart: monday,
      },
      orderBy: { sku: 'asc' },
    });

    // 4. Map them into the shape the front-end expects.
    const items = prices.map((p) => ({
      sku: p.sku,
      priceCents: p.priceCents,
      lastSubmitted: p.submittedAt,
      status: p.status, // "on_time" | "needs_update" | "missing"
    }));

    return NextResponse.json(
      {
        distributor: {
          id: distributor.id,
          name: distributor.name,
          region: distributor.region,
        },
        items,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/distributor/prices:', err);
    // Return a safe empty payload so the UI can fall back gracefully.
    return NextResponse.json(
      {
        distributor: null,
        items: [],
        error: 'Failed to load distributor prices from database',
      },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
