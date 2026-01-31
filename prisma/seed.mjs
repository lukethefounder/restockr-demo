// prisma/seed.mjs
// Seed script for Restockr demo (two locations).
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Restockr demo data (two locations)...');

  // 1. Clean up existing data (for re-runs in dev)
  // NOTE: Order matters due to foreign key constraints.
  await prisma.distributorInvite.deleteMany().catch(() => {});
  await prisma.distributorPrice.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.locationDistributor.deleteMany();
  await prisma.buyerLocation.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Create a Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Restockr Demo Tenant',
    },
  });
  console.log('  ➜ Tenant created:', tenant.name);

  // 3. Create Users: founder, buyer1, buyer2, distributor
  const founderUser = await prisma.user.create({
    data: {
      email: 'founder@demo.com',
      name: 'Demo Founder',
      role: 'founder',
      tenantId: tenant.id,
    },
  });

  const buyer1User = await prisma.user.create({
    data: {
      email: 'buyer1@demo.com',
      name: 'Buyer One',
      role: 'buyer',
      tenantId: tenant.id,
    },
  });

  const buyer2User = await prisma.user.create({
    data: {
      email: 'buyer2@demo.com',
      name: 'Buyer Two',
      role: 'buyer',
      tenantId: tenant.id,
    },
  });

  const distributorUser = await prisma.user.create({
    data: {
      email: 'dist@demo.com',
      name: 'Demo Distributor Rep',
      role: 'distributor',
      tenantId: tenant.id,
    },
  });

  console.log('  ➜ Users created: founder, buyer1, buyer2, distributor');

  // 4. Create two Locations
  const location1 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Phoenix – Downtown Demo',
      city: 'Phoenix',
      region: 'Phoenix Metro',
    },
  });

  const location2 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Phoenix – Uptown Demo',
      city: 'Phoenix',
      region: 'Phoenix Metro',
    },
  });

  console.log('  ➜ Locations created:', location1.name, 'and', location2.name);

  // 5. Link Buyers to Locations
  await prisma.buyerLocation.create({
    data: {
      userId: buyer1User.id,
      locationId: location1.id,
    },
  });

  await prisma.buyerLocation.create({
    data: {
      userId: buyer2User.id,
      locationId: location2.id,
    },
  });

  console.log('  ➜ Buyers linked to locations');

  // 6. Create a Distributor (Valley Produce Co) linked to distributorUser
  const distributor = await prisma.distributor.create({
    data: {
      tenantId: tenant.id,
      name: 'Valley Produce Co.',
      email: 'rep@valleyproduce.com',
      region: 'Phoenix',
      userId: distributorUser.id,
    },
  });
  console.log('  ➜ Distributor created:', distributor.name);

  // 7. Link Distributor to both Locations
  await prisma.locationDistributor.create({
    data: {
      locationId: location1.id,
      distributorId: distributor.id,
      status: 'active',
    },
  });

  await prisma.locationDistributor.create({
    data: {
      locationId: location2.id,
      distributorId: distributor.id,
      status: 'active',
    },
  });

  console.log('  ➜ Distributor linked to both locations');

  // 8. Create demo Orders for each location
  const now = new Date();
  const order1 = await prisma.order.create({
    data: {
      locationId: location1.id,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      locationId: location2.id,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log('  ➜ Orders created for both locations');

  // 9. Add OrderLines for both orders (similar SKUs, different onHand)
  const order1LinesData = [
    {
      sku: 'AVO-48',
      name: 'Avocados 48ct',
      unit: 'cases',
      par: 4,
      onHand: 1.5,
      orderId: order1.id,
    },
    {
      sku: 'ROMA-25',
      name: 'Tomatoes Roma 25lb',
      unit: 'cases',
      par: 3,
      onHand: 0.5,
      orderId: order1.id,
    },
    {
      sku: 'LETT-MIX',
      name: 'Spring mix 3lb',
      unit: 'boxes',
      par: 5,
      onHand: 4,
      orderId: order1.id,
    },
    {
      sku: 'RUS-50',
      name: 'Potatoes russet 50lb',
      unit: 'sacks',
      par: 2,
      onHand: 0.2,
      orderId: order1.id,
    },
  ];

  const order2LinesData = [
    {
      sku: 'AVO-48',
      name: 'Avocados 48ct',
      unit: 'cases',
      par: 4,
      onHand: 2.0,
      orderId: order2.id,
    },
    {
      sku: 'ROMA-25',
      name: 'Tomatoes Roma 25lb',
      unit: 'cases',
      par: 3,
      onHand: 1.0,
      orderId: order2.id,
    },
    {
      sku: 'LETT-MIX',
      name: 'Spring mix 3lb',
      unit: 'boxes',
      par: 5,
      onHand: 3.0,
      orderId: order2.id,
    },
    {
      sku: 'RUS-50',
      name: 'Potatoes russet 50lb',
      unit: 'sacks',
      par: 2,
      onHand: 0.8,
      orderId: order2.id,
    },
  ];

  await prisma.orderLine.createMany({ data: order1LinesData });
  await prisma.orderLine.createMany({ data: order2LinesData });

  console.log('  ➜ Order lines created for both orders');

  // 10. Create DistributorPrice rows for the demo items for the current week
  // Compute Monday of the current week (weekStart)
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = (day + 6) % 7; // distance back to Monday
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - diffToMonday
  );
  monday.setHours(0, 0, 0, 0);

  const priceItems = [
    {
      sku: 'AVO-48',
      name: 'Avocados 48ct',
      priceCents: 6200,
      status: 'on_time',
    },
    {
      sku: 'ROMA-25',
      name: 'Tomatoes Roma 25lb',
      priceCents: 3200,
      status: 'needs_update',
    },
    {
      sku: 'LETT-MIX',
      name: 'Spring mix 3lb',
      priceCents: null,
      status: 'missing',
    },
    {
      sku: 'RUS-50',
      name: 'Potatoes russet 50lb',
      priceCents: 2800,
      status: 'needs_update',
    },
  ];

  for (const item of priceItems) {
    await prisma.distributorPrice.create({
      data: {
        distributorId: distributor.id,
        sku: item.sku,
        weekStart: monday,
        priceCents: item.priceCents,
        submittedAt:
          item.status === 'missing' ? null : new Date(monday.getTime() + 8 * 60 * 60 * 1000),
        status: item.status,
      },
    });
  }
  console.log('  ➜ Distributor prices created:', priceItems.length);

  console.log('✅ Seeding complete (two locations).');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
