/**
 * Seed script — Populates the database with mock data
 * Run: npm run seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.approvalStep.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.approvalRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log('✅ Cleaned existing data');

  // Hash password for all users
  const password_hash = await bcrypt.hash('demo1234', 12);

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      country: 'India',
      currency: 'INR',
      setup_complete: true,
    },
  });
  console.log(`✅ Company: ${company.name}`);

  // 2. Create Admin
  const admin = await prisma.user.create({
    data: {
      full_name: 'Admin User',
      email: 'admin@clearclaim.io',
      password_hash,
      role: 'admin',
      company_id: company.id,
      department: 'Administration',
      must_change_password: false,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // 3. Create Managers
  const manager1 = await prisma.user.create({
    data: {
      full_name: 'Vikram Singh',
      email: 'vikram@clearclaim.io',
      password_hash,
      role: 'manager',
      company_id: company.id,
      department: 'Engineering',
      must_change_password: false,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      full_name: 'Neha Gupta',
      email: 'neha@clearclaim.io',
      password_hash,
      role: 'manager',
      company_id: company.id,
      department: 'Design',
      must_change_password: false,
    },
  });
  console.log(`✅ Managers: ${manager1.email}, ${manager2.email}`);

  // 4. Create Employees
  const emp1 = await prisma.user.create({
    data: {
      full_name: 'Arjun Mehta',
      email: 'arjun@clearclaim.io',
      password_hash,
      role: 'employee',
      company_id: company.id,
      department: 'Engineering',
      manager_id: manager1.id,
      must_change_password: false,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      full_name: 'Priya Sharma',
      email: 'priya@clearclaim.io',
      password_hash,
      role: 'employee',
      company_id: company.id,
      department: 'Design',
      manager_id: manager2.id,
      must_change_password: false,
    },
  });

  const emp3 = await prisma.user.create({
    data: {
      full_name: 'Rahul Verma',
      email: 'rahul@clearclaim.io',
      password_hash,
      role: 'employee',
      company_id: company.id,
      department: 'Sales',
      manager_id: manager1.id,
      must_change_password: false,
    },
  });
  console.log(`✅ Employees: ${emp1.email}, ${emp2.email}, ${emp3.email}`);

  // 5. Create Finance
  const finance = await prisma.user.create({
    data: {
      full_name: 'Ravi Kumar',
      email: 'ravi@clearclaim.io',
      password_hash,
      role: 'finance',
      company_id: company.id,
      department: 'Finance',
      must_change_password: false,
    },
  });
  console.log(`✅ Finance: ${finance.email}`);

  // 6. Create Director
  const director = await prisma.user.create({
    data: {
      full_name: 'Sunita Patel',
      email: 'sunita@clearclaim.io',
      password_hash,
      role: 'director',
      company_id: company.id,
      department: 'Executive',
      must_change_password: false,
    },
  });
  console.log(`✅ Director: ${director.email}`);

  // 7. Create Default Approval Rule (Sequential: Manager → Finance → Director)
  const rule = await prisma.approvalRule.create({
    data: {
      company_id: company.id,
      name: 'Default Sequential',
      description: 'Standard approval chain: Manager → Finance → Director',
      type: 'sequential',
      config: JSON.stringify({
        steps: [
          { role: 'manager', label: 'Direct Manager' },
          { role: 'finance', label: 'Finance Head' },
          { role: 'director', label: 'Director' },
        ],
      }),
    },
  });
  console.log(`✅ Approval Rule: ${rule.name}`);

  // 8. Create 8 Expenses with various statuses
  const expenses = [
    {
      employee_id: emp1.id, amount: 8500, currency: 'INR', converted_amount: 8500,
      category: 'Travel', vendor: 'IndiGo Airlines',
      description: 'IndiGo Airlines - Delhi to Bangalore', date: '2026-03-28', status: 'pending',
    },
    {
      employee_id: emp2.id, amount: 2300, currency: 'INR', converted_amount: 2300,
      category: 'Food', vendor: 'Taj Palace',
      description: 'Client dinner at Taj Palace', date: '2026-03-27', status: 'pending',
    },
    {
      employee_id: emp3.id, amount: 15000, currency: 'INR', converted_amount: 15000,
      category: 'Hotel', vendor: 'Hyatt Regency',
      description: 'Hyatt Regency - 2 nights', date: '2026-03-26', status: 'approved',
    },
    {
      employee_id: emp2.id, amount: 450, currency: 'USD', converted_amount: 37800,
      category: 'Software', vendor: 'Figma Inc.',
      description: 'Annual Figma License', date: '2026-03-25', status: 'rejected',
    },
    {
      employee_id: emp1.id, amount: 3200, currency: 'INR', converted_amount: 3200,
      category: 'Transport', vendor: 'Uber',
      description: 'Uber rides - March', date: '2026-03-24', status: 'approved',
    },
    {
      employee_id: emp2.id, amount: 6800, currency: 'INR', converted_amount: 6800,
      category: 'Equipment', vendor: 'Amazon',
      description: 'Logitech MX Master 3S + Keychron K2', date: '2026-03-23', status: 'pending',
    },
    {
      employee_id: emp1.id, amount: 1200, currency: 'INR', converted_amount: 1200,
      category: 'Food', vendor: 'Zomato',
      description: 'Team lunch order', date: '2026-03-22', status: 'approved',
    },
    {
      employee_id: emp2.id, amount: 4500, currency: 'INR', converted_amount: 4500,
      category: 'Medical', vendor: 'Apollo Hospital',
      description: 'Annual health checkup', date: '2026-03-21', status: 'pending',
    },
  ];

  for (const expData of expenses) {
    const expense = await prisma.expense.create({ data: expData });

    // Create approval steps based on status
    const manager = expData.employee_id === emp1.id || expData.employee_id === emp3.id
      ? manager1 : manager2;

    const approvers = [
      { id: manager.id, role: 'manager' },
      { id: finance.id, role: 'finance' },
      { id: director.id, role: 'director' },
    ];

    if (expData.status === 'approved') {
      // All steps approved
      for (let i = 0; i < approvers.length; i++) {
        await prisma.approvalStep.create({
          data: {
            expense_id: expense.id,
            approver_id: approvers[i].id,
            step_order: i + 1,
            status: 'approved',
            comment: 'Looks good',
            timestamp: new Date(Date.now() - (3 - i) * 86400000),
          },
        });
      }
    } else if (expData.status === 'rejected') {
      // First step rejected
      await prisma.approvalStep.create({
        data: {
          expense_id: expense.id,
          approver_id: approvers[0].id,
          step_order: 1,
          status: 'rejected',
          comment: 'Not covered by policy',
          timestamp: new Date(),
        },
      });
      for (let i = 1; i < approvers.length; i++) {
        await prisma.approvalStep.create({
          data: {
            expense_id: expense.id,
            approver_id: approvers[i].id,
            step_order: i + 1,
            status: 'skipped',
          },
        });
      }
    } else {
      // Pending — first step pending, rest waiting
      for (let i = 0; i < approvers.length; i++) {
        await prisma.approvalStep.create({
          data: {
            expense_id: expense.id,
            approver_id: approvers[i].id,
            step_order: i + 1,
            status: i === 0 ? 'pending' : 'waiting',
          },
        });
      }
    }
  }
  console.log(`✅ Created ${expenses.length} expenses with approval steps`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Test Credentials (password: demo1234):');
  console.log('   Admin:    admin@clearclaim.io');
  console.log('   Manager:  vikram@clearclaim.io / neha@clearclaim.io');
  console.log('   Employee: arjun@clearclaim.io / priya@clearclaim.io / rahul@clearclaim.io');
  console.log('   Finance:  ravi@clearclaim.io');
  console.log('   Director: sunita@clearclaim.io\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
