// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/auth/login
// Body: { email: string }
// Demo login: finds user by email, sets cookies with userId + role.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim?.();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up user in the DB
        let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // DEMO BEHAVIOR: auto-create a buyer user if none exists.
      // In a real app, you would NOT auto-create like this.
      user = await prisma.user.create({
        data: {
          email,
          name: email,
          role: 'buyer', // default demo role
          tenant: {
            connectOrCreate: {
              where: { id: 'demo-tenant-id' }, // or use an existing tenant
              create: { name: 'Restockr Demo Tenant' },
            },
          },
        },
      });
    }


    // In a future phase, we would check a password here.
    // For now, email alone authenticates the demo user.

    const res = NextResponse.json(
      { role: user.role },
      { status: 200 }
    );

    // Set simple demo cookies for session & role.
    res.cookies.set('restockr_user_id', user.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    res.cookies.set('restockr_role', user.role, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    return res;
  } catch (err) {
    console.error('Error in /api/auth/login:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
