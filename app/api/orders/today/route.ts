// app/api/orders/today/route.ts
import { NextResponse } from 'next/server';

// Static orders for two demo locations.
// We align with /api/locations IDs:
//   - loc-demo-1 => Phoenix – Downtown Demo
//   - loc-demo-2 => Phoenix – Uptown Demo
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get('locationId') || 'loc-demo-1';

  const isUptown = locationId === 'loc-demo-2';

  const location = isUptown
    ? {
        id: 'loc-demo-2',
        name: 'Phoenix – Uptown Demo',
        city: 'Phoenix',
        region: 'Phoenix Metro',
      }
    : {
        id: 'loc-demo-1',
        name: 'Phoenix – Downtown Demo',
        city: 'Phoenix',
        region: 'Phoenix Metro',
      };

  const lines = isUptown
    ? [
        {
          sku: 'AVO-48',
          name: 'Avocados 48ct',
          par: 4,
          onHand: 2.0,
          unit: 'cases',
        },
        {
          sku: 'ROMA-25',
          name: 'Tomatoes Roma 25lb',
          par: 3,
          onHand: 1.0,
          unit: 'cases',
        },
        {
          sku: 'LETT-MIX',
          name: 'Spring mix 3lb',
          par: 5,
          onHand: 3.0,
          unit: 'boxes',
        },
        {
          sku: 'RUS-50',
          name: 'Potatoes russet 50lb',
          par: 2,
          onHand: 0.8,
          unit: 'sacks',
        },
      ]
    : [
        {
          sku: 'AVO-48',
          name: 'Avocados 48ct',
          par: 4,
          onHand: 1.5,
          unit: 'cases',
        },
        {
          sku: 'ROMA-25',
          name: 'Tomatoes Roma 25lb',
          par: 3,
          onHand: 0.5,
          unit: 'cases',
        },
        {
          sku: 'LETT-MIX',
          name: 'Spring mix 3lb',
          par: 5,
          onHand: 4.0,
          unit: 'boxes',
        },
        {
          sku: 'RUS-50',
          name: 'Potatoes russet 50lb',
          par: 2,
          onHand: 0.2,
          unit: 'sacks',
        },
      ];

  return NextResponse.json(
    {
      location,
      order: {
        id: isUptown ? 'order-demo-uptown' : 'order-demo-downtown',
        status: 'submitted',
        createdAt: new Date().toISOString(),
      },
      lines,
    },
    { status: 200 }
  );
}
