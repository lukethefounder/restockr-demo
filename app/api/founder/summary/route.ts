// app/api/founder/summary/route.ts
import { NextResponse } from 'next/server';

// Static founder summary per location to avoid Prisma/DB issues in build.
// We align with /api/locations and /api/orders/today.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locationId = url.searchParams.get('locationId') || 'loc-demo-1';

  // Downtown vs Uptown demo numbers
  const isUptown = locationId === 'loc-demo-2';

  // Explicitly type as number so TypeScript doesn't narrow to literal union types.
  const itemsNeedingOrder: number = isUptown ? 1 : 2;
  const missingPrices: number = 1;
  const needsUpdatePrices: number = isUptown ? 1 : 2;

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

  // Demo time/scenario
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
}
