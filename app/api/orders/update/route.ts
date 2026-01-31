// app/api/orders/update/route.ts
import { NextResponse } from 'next/server';

// Helper: only load PrismaClient when we actually want to use it.
// This prevents Prisma from initializing during Vercel builds if we short-circuit.
async function getPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient();
}

// POST /api/orders/update
// Body: { orderId: string; lines: { sku: string; onHand: number }[] }
export async function POST(req: Request) {
  // On Vercel (demo), skip DB writes entirely and just pretend success.
  // Vercel sets process.env.VERCEL = '1' in both build and runtime.
  if (process.env.VERCEL === '1') {
    console.log('[orders/update] Skipping DB update on Vercel demo.');
    return NextResponse.json(
      {
        success: true,
        message:
          'DB updates are disabled in the Vercel demo environment. Changes are local to this session.',
      },
      { status: 200 }
    );
  }

  // Local dev / non-Vercel: use Prisma and update the real DB.
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

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update each line's onHand
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
