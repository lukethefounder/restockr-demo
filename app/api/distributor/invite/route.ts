// app/api/distributor/invite/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple in-memory store for invites (demo only).
// This resets when the dev server restarts.
type Invite = {
  token: string;
  name: string;
  email: string;
  createdAt: string;
};

const invites: Invite[] = [];

// POST /api/distributor/invite
// Body: { name: string; email: string }
// DEMO VERSION: no Prisma. Just stores invites in memory and returns a token.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = body?.name?.trim?.();
    const email = body?.email?.trim?.();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(24).toString('hex');

    const invite: Invite = {
      token,
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    invites.push(invite);

    console.log('✅ In-memory DistributorInvite created:', invite);

    return NextResponse.json(
      {
        success: true,
        token,
        message:
          'Distributor invite created in memory (demo only). In a future phase, this token will be persisted and sent via email.',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error in /api/distributor/invite:', err);
    return NextResponse.json(
      { error: 'Failed to create distributor invite (internal error).' },
      { status: 500 }
    );
  }
}

// GET /api/distributor/invite?token=...
// DEMO: Verify an invite from the in-memory store.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const invite = invites.find((i) => i.token === token);

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found (in-memory demo only).' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        token: invite.token,
        name: invite.name,
        email: invite.email,
        createdAt: invite.createdAt,
        status: 'pending',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error verifying in-memory invite:', err);
    return NextResponse.json(
      { error: 'Failed to verify invite (internal error).' },
      { status: 500 }
    );
  }
}
