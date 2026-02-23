const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllData() {
  console.log('📋 DATE REALE DIN BAZA DE DATE:\n');
  
  // Utilizatori
  console.log('👥 UTILIZATORI:');
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true }
  });
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.role}: ${user.email} (${user.name})`);
  });
  
  // Voucher-uri
  console.log('\n🎟️ VOUCHER-URI:');
  const vouchers = await prisma.voucher.findMany({
    select: { code: true, discountType: true, discountValue: true, isActive: true }
  });
  vouchers.forEach((v, index) => {
    const discount = v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : `${v.discountValue} RON`;
    const status = v.isActive ? '✅ Activ' : '❌ Inactiv';
    console.log(`${index + 1}. ${v.code} - ${discount} ${status}`);
  });
  
  // Metode de plată
  console.log('\n💳 METODE DE PLATĂ:');
  const paymentMethods = await prisma.paymentMethod.findMany({
    select: { name: true, isActive: true }
  });
  paymentMethods.forEach((pm, index) => {
    const status = pm.isActive ? '✅ Activ' : '❌ Inactiv';
    console.log(`${index + 1}. ${pm.name} ${status}`);
  });
  
  // Categorii
  console.log('\n📦 CATEGORII:');
  const categories = await prisma.category.findMany({
    select: { nameRo: true, isActive: true }
  });
  categories.forEach((cat, index) => {
    const status = cat.isActive ? '✅ Activ' : '❌ Inactiv';
    console.log(`${index + 1}. ${cat.nameRo} ${status}`);
  });
  
  // Produse
  console.log('\n🛍️ PRODUSE (primele 10):');
  const products = await prisma.dataItem.findMany({
    select: { title: true, price: true, status: true },
    take: 10
  });
  products.forEach((p, index) => {
    const cleanTitle = p.title.replace(/<[^>]*>/g, '').trim();
    const status = p.status === 'PUBLISHED' ? '✅' : '❌';
    console.log(`${index + 1}. ${cleanTitle} - ${p.price} RON ${status}`);
  });
  
  // Total produse
  const totalProducts = await prisma.dataItem.count();
  console.log(`\n📊 Total produse: ${totalProducts}`);
  
  await prisma.$disconnect();
}

checkAllData().catch(console.error);
