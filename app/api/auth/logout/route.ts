// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

// POST /api/auth/logout
// Clears the restockr_user_id and restockr_role cookies (demo logout).
export async function POST() {
  const res = NextResponse.json(
    { success: true, message: 'Logged out' },
    { status: 200 }
  );

  // Clear cookies by setting them with maxAge 0
  res.cookies.set('restockr_user_id', '', {
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('restockr_role', '', {
    path: '/',
    maxAge: 0,
  });

  return res;
}
