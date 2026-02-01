import { NextResponse } from 'next/server';

// Helper: only load PrismaClient when we actually want to use it.
async function getPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient();
}

// POST /api/orders/update
// Body: { orderId: string; lines: { sku: string; onHand: number }[] }
export async function POST(req: Request) {
  const isDemo = process.env.DEMO_MODE === 'true';

  // In demo mode (e.g., Vercel), skip DB writes and just return success.
  if (isDemo) {
    console.log('[orders/update] DEMO_MODE=true, skipping DB update.');
    return NextResponse.json(
      {
        success: true,
        message:
          'DB updates are disabled in demo mode. Changes are local to this session.',
      },
      { status: 200 }
    );
  }

  // In real mode (local/dev), use Prisma to update the DB.
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId as string | undefined;
    const lines = body?.lines as { sku?: string; onHand?: number }[] | undefined;

    if (!orderId || !Array.isArray(lines)) {
      return NextResponse.json(
        { error: 'orderId and lines array are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    for (const line of lines) {
      if (!line.sku) continue;

      const onHandValue =
        typeof line.onHand === 'number' && !Number.isNaN(line.onHand)
          ? line.onHand
          : 0;

      await prisma.orderLine.updateMany({
        where: {
          orderId,
          sku: line.sku,
        },
        data: {
          onHand: onHandValue,
        },
      });
    }

    await prisma.$disconnect();

    return NextResponse.json(
      {
        success: true,
        message: 'Order lines updated successfully (local DB).',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/orders/update (local dev):', err);
    return NextResponse.json(
      { error: 'Failed to update order lines (internal error).' },
      { status: 500 }
    );
  }
}
