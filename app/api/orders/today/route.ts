// app/api/orders/today/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/orders/today
// Optional query param: ?locationId=...
// If locationId is provided, returns the most recent order for that location.
// Otherwise, returns the most recent order for the first location found with an order.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationIdParam = url.searchParams.get('locationId');

    let locationWithOrder = null;

    if (locationIdParam) {
      // Attempt to find that specific location with its latest order
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
      // Fallback: first location that has at least one order
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

    if (!locationWithOrder || !locationWithOrder.orders.length) {
      // No orders anywhere
      return NextResponse.json(
        { error: 'No orders found in database' },
        { status: 404 }
      );
    }

    const order = locationWithOrder.orders[0];

    const lines = order.lines.map((line) => ({
      sku: line.sku,
      name: line.name,
      par: line.par,
      onHand: line.onHand,
      unit: line.unit,
    }));

    return NextResponse.json(
      {
        location: {
          id: locationWithOrder.id,
          name: locationWithOrder.name,
          city: locationWithOrder.city,
          region: locationWithOrder.region,
        },
        order: {
          id: order.id,
          status: order.status,
          createdAt: order.createdAt,
        },
        lines,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/orders/today:', err);
    return NextResponse.json(
      { error: 'Failed to load order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
