// app/api/distributor/onboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/distributor/onboard
// Body: { token: string; displayName?: string }
// - Validates the invite token
// - Creates a distributor user & distributor record if needed
// - Marks invite as accepted
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = body?.token?.trim?.();
    const displayName = body?.displayName?.trim?.();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const invite = await prisma.distributorInvite.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite is not pending', status: invite.status },
        { status: 400 }
      );
    }

    // 1. Check if a user already exists for this email
    let user = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      // Create a new distributor user
      user = await prisma.user.create({
        data: {
          email: invite.email,
          name: displayName || invite.name || invite.email,
          role: 'distributor',
          tenantId: invite.tenantId,
        },
      });
    } else {
      // If user exists with a different role, optionally we could
      // update or reject. For demo, we just log it.
      console.log(
        `Existing user found for invite email (${invite.email}) with role ${user.role}`
      );
    }

    // 2. Check if a Distributor record already exists with this email
    let distributor = await prisma.distributor.findUnique({
      where: { email: invite.email },
    });

    if (!distributor) {
      distributor = await prisma.distributor.create({
        data: {
          tenantId: invite.tenantId,
          name: invite.name || displayName || 'New Distributor',
          email: invite.email,
          region: 'Unknown',
          userId: user.id,
        },
      });
    } else {
      // If distributor exists, ensure userId is linked
      if (!distributor.userId) {
        await prisma.distributor.update({
          where: { id: distributor.id },
          data: { userId: user.id },
        });
      }
    }

    // 3. Mark the invite as accepted
    await prisma.distributorInvite.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    console.log('✅ Distributor onboarded from invite:', {
      inviteId: invite.id,
      userId: user.id,
      distributorId: distributor.id,
    });

    return NextResponse.json(
      {
        success: true,
        email: invite.email,
        message:
          'Distributor account created/linked. You can now log in using this email on the main Restockr page.',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error in /api/distributor/onboard:', err);
    return NextResponse.json(
      { error: 'Failed to onboard distributor (internal error).' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
