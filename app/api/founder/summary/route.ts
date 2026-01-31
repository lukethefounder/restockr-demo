// app/api/founder/summary/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to compute Monday of current week
function getCurrentWeekMonday(): Date {
  const today = new Date();
  const day = today.getDay(); // 0 Sunday, 1 Monday, ...
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - diffToMonday
  );
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// GET /api/founder/summary
// Optional query param: ?locationId=...
// Computes a simple readiness summary from the real DB, per location when provided.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationIdParam = url.searchParams.get('locationId');

    // ---------- 1. itemsNeedingOrder from latest order for a given location ----------
    let itemsNeedingOrder = 0;

    let locationWithOrder = null;

    if (locationIdParam) {
      locationWithOrder = await prisma.location.findUnique({
        where: { id: locationIdParam },
        include: {
          orders: {
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!locationWithOrder || !locationWithOrder.orders.length) {
      // Fallback to first location that has at least one order
      locationWithOrder = await prisma.location.findFirst({
        include: {
          orders: {
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (locationWithOrder && locationWithOrder.orders.length > 0) {
      const latestOrder = locationWithOrder.orders[0];
      itemsNeedingOrder = latestOrder.lines.filter(
        (line) => line.par - line.onHand > 0.01
      ).length;
    }

    // ---------- 2. missingPrices & needsUpdatePrices from DistributorPrice ----------
    let missingPrices = 0;
    let needsUpdatePrices = 0;

    const distributor = await prisma.distributor.findFirst();

    if (distributor) {
      const monday = getCurrentWeekMonday();

      const prices = await prisma.distributorPrice.findMany({
        where: {
          distributorId: distributor.id,
          weekStart: monday,
        },
      });

      for (const p of prices) {
        if (p.status === 'missing') {
          missingPrices += 1;
        } else if (p.status === 'needs_update') {
          needsUpdatePrices += 1;
        }
      }
    }

    // ---------- 3. Derive readinessLabel from counts ----------
    let readinessLabel: 'Green' | 'Yellow' | 'Red' = 'Green';

    if (
      itemsNeedingOrder === 0 &&
      missingPrices === 0 &&
      needsUpdatePrices === 0
    ) {
      readinessLabel = 'Green';
    } else if (
      missingPrices === 0 &&
      needsUpdatePrices <= 1 &&
      itemsNeedingOrder <= 1
    ) {
      readinessLabel = 'Yellow';
    } else {
      readinessLabel = 'Red';
    }

    // ---------- 4. Build Bud actions based on computed values ----------
    const budActions: string[] = [];

    if (itemsNeedingOrder > 0) {
      budActions.push(
        `There are ${itemsNeedingOrder} item${itemsNeedingOrder > 1 ? 's' : ''} below par in the most recent order. Confirm quantities for the highest-risk items before sending.`
      );
    } else {
      budActions.push(
        'No items are currently below par in the most recent order. This is a low-risk starting point.'
      );
    }

    if (missingPrices > 0) {
      budActions.push(
        `Resolve ${missingPrices} missing price${missingPrices > 1 ? 's' : ''} with your distributor so those items can participate in the auction.`
      );
    }

    if (needsUpdatePrices > 0) {
      budActions.push(
        `Refresh weekly pricing for ${needsUpdatePrices} item${needsUpdatePrices > 1 ? 's' : ''} marked as "Needs update" before relying on tonight's results.`
      );
    }

    if (missingPrices === 0 && needsUpdatePrices === 0) {
      budActions.push(
        'All tracked items have pricing. You can focus attention on high-dollar items and outliers.'
      );
    }

    // For now, we keep timeMode & scenarioMode static; later these could come
    // from query params or the DB if you want.
    const timeMode: 'sunday' | 'monday8' | 'monday930' = 'sunday';
    const scenarioMode: 'normal' | 'slammed' | 'shortstaff' = 'normal';

    return NextResponse.json(
      {
        timeMode,
        scenarioMode,
        readinessLabel,
        itemsNeedingOrder,
        missingPrices,
        needsUpdatePrices,
        budActions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/founder/summary:', err);
    // On error, provide a safe fallback so the frontend doesn't crash.
    return NextResponse.json(
      {
        timeMode: 'sunday',
        scenarioMode: 'normal',
        readinessLabel: 'Yellow',
        itemsNeedingOrder: 0,
        missingPrices: 0,
        needsUpdatePrices: 0,
        budActions: [
          'An error occurred while loading live founder summary data. Using a default demo summary instead.',
        ],
        error: 'Failed to compute founder summary from database',
      },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
