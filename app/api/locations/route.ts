// app/api/locations/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/locations
// Returns all locations for the demo tenant.
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });

    const data = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      city: loc.city,
      region: loc.region,
    }));

    return NextResponse.json(
      { locations: data },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in /api/locations:', err);
    return NextResponse.json(
      { error: 'Failed to load locations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
