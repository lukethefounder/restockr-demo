// app/api/locations/route.ts
import { NextResponse } from 'next/server';

// Static locations for demo purposes.
// This avoids Prisma/DB issues in Vercel builds.
export async function GET() {
  const locations = [
    {
      id: 'loc-demo-1',
      name: 'Phoenix – Downtown Demo',
      city: 'Phoenix',
      region: 'Phoenix Metro',
    },
    {
      id: 'loc-demo-2',
      name: 'Phoenix – Uptown Demo',
      city: 'Phoenix',
      region: 'Phoenix Metro',
    },
  ];

  return NextResponse.json(
    { locations },
    { status: 200 }
  );
}
