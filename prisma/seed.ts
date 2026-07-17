import bcrypt from "bcryptjs";
import {
  BillingMethod,
  InvoiceStatus,
  LeadStatus,
  PaymentStatus,
  PrismaClient,
  Role,
  TruckerStatus
} from "@prisma/client";

const db = new PrismaClient();

const requiredDocuments = [
  "MC Permit",
  "Certificate of Insurance (COI)",
  "Driver's License"
];

async function main() {
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.loadDocument.deleteMany();
  await db.document.deleteMany();
  await db.documentRequest.deleteMany();
  await db.load.deleteMany();
  await db.agreement.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.messageAttachment.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.leadStatusHistory.deleteMany();
  await db.lead.deleteMany();
  await db.truckerProfile.deleteMany();
  await db.equipmentCategory.deleteMany();
  await db.consultantProfile.deleteMany();
  await db.session.deleteMany();
  await db.appSetting.deleteMany();
  await db.user.deleteMany();

  const password = await bcrypt.hash("password", 12);
  const adminPassword = await bcrypt.hash("superadmin123", 12);
  const now = new Date();

  const dryVan = await db.equipmentCategory.create({ data: { name: "Dry Van", commissionBps: 500, displayOrder: 1 } });
  const reefer = await db.equipmentCategory.create({ data: { name: "Reefer", commissionBps: 600, displayOrder: 2 } });
  await db.equipmentCategory.createMany({
    data: [
      { name: "Flatbed", commissionBps: 700, displayOrder: 3 },
      { name: "Power Only", commissionBps: 800, displayOrder: 4 },
      { name: "Box Truck", commissionBps: 1000, displayOrder: 5 }
    ]
  });

  const admin = await db.user.create({
    data: {
      role: Role.SUPER_ADMIN,
      name: "Super Admin",
      email: "superadmin@unionenterprises.pk",
      phone: "+92 300 0000000",
      passwordHash: adminPassword,
      authProvider: "EMAIL"
    }
  });

  const dispatcher1 = await db.user.create({
    data: {
      role: Role.CONSULTANT_DISPATCHER,
      name: "Alex Morgan",
      email: "dispatcher1@unionenterprises.pk",
      phone: "+1 214 555 0111",
      passwordHash: password,
      authProvider: "EMAIL",
      consultantProfile: {
        create: {
          bio: "Dispatch onboarding and dry-van operations specialist.",
          specialty: "Dry Van & General Freight",
          workingHours: "Mon-Fri, 8:00 AM-6:00 PM",
          timeZone: "America/Chicago",
          sequencePosition: 1,
          commissionRateBps: 500,
          profileCompletedAt: now
        }
      }
    }
  });

  const dispatcher2 = await db.user.create({
    data: {
      role: Role.CONSULTANT_DISPATCHER,
      name: "Sarah Blake",
      email: "dispatcher2@unionenterprises.pk",
      phone: "+1 469 555 0182",
      passwordHash: password,
      authProvider: "EMAIL",
      consultantProfile: {
        create: {
          bio: "Reefer and active-client load coordination specialist.",
          specialty: "Reefer & Load Operations",
          workingHours: "Mon-Sat, 7:00 AM-5:00 PM",
          timeZone: "America/Chicago",
          sequencePosition: 2,
          commissionRateBps: 600,
          profileCompletedAt: now
        }
      }
    }
  });

  const trucker1User = await db.user.create({
    data: {
      role: Role.TRUCKER,
      name: "Michael Carter",
      email: "trucker@example.com",
      phone: "+1 214 555 0199",
      passwordHash: password,
      authProvider: "EMAIL"
    }
  });

  const trucker1 = await db.truckerProfile.create({
    data: {
      userId: trucker1User.id,
      equipmentType: "Dry Van",
      equipmentCategoryId: dryVan.id,
      selectedCommissionBps: dryVan.commissionBps,
      packageType: "Weekly Dispatch",
      billingMethod: BillingMethod.FIXED,
      truckCurrentLocation: "Dallas, TX",
      companyName: "Carter Logistics LLC",
      mcDot: "MC-100200",
      assignedConsultantId: dispatcher1.id,
      accountStatus: TruckerStatus.LEAD,
      availability: "Available now",
      preferredLanes: "TX, GA, FL",
      mainProblem: "Needs consistent loads and portal onboarding.",
      profileCompletedAt: now,
      onboardingCompletedAt: now
    }
  });

  const lead1 = await db.lead.create({
    data: {
      truckerId: trucker1.id,
      assignedToId: dispatcher1.id,
      assignedAt: now,
      assignmentMethod: "ROUND_ROBIN",
      currentStatus: LeadStatus.INVOICE_SENT
    }
  });

  await db.leadStatusHistory.createMany({
    data: [
      { leadId: lead1.id, status: LeadStatus.LEAD_SIGNED_UP, changedBy: trucker1User.id, note: "Demo signup." },
      { leadId: lead1.id, status: LeadStatus.LEAD_ASSIGNED, changedBy: dispatcher1.id, note: "Round-robin assignment." },
      { leadId: lead1.id, status: LeadStatus.CONTACT_MADE, changedBy: dispatcher1.id, note: "Two-sided portal chat validated." },
      { leadId: lead1.id, status: LeadStatus.PENDING_INVOICE, changedBy: dispatcher1.id, note: "Invoice submitted for approval." },
      { leadId: lead1.id, status: LeadStatus.INVOICE_SENT, changedBy: admin.id, note: "Demo invoice sent." }
    ]
  });

  const conversation1 = await db.conversation.create({
    data: {
      truckerId: trucker1.id,
      consultantId: dispatcher1.id,
      twoSidedContactValidated: true,
      lastMessageAt: now
    }
  });

  await db.message.createMany({
    data: [
      { conversationId: conversation1.id, senderId: trucker1User.id, body: "Hello, I completed my portal setup." },
      { conversationId: conversation1.id, senderId: dispatcher1.id, body: "Welcome Michael. Upload the mandatory documents and I will help with your first invoice." }
    ]
  });

  const invoice1 = await db.invoice.create({
    data: {
      invoiceNumber: "INV-DEMO-000001",
      truckerId: trucker1.id,
      consultantId: dispatcher1.id,
      amountCents: 35000,
      description: "Weekly Dispatch Service",
      status: InvoiceStatus.SENT,
      sentAt: now,
      dueDate: new Date(Date.now() + 7 * 86400000),
      isFirstInvoice: true,
      agingStartsAt: new Date(Date.now() + 30 * 86400000),
      items: {
        create: {
          description: "Weekly Dispatch Service",
          quantity: 1,
          unitCents: 35000,
          totalCents: 35000
        }
      }
    }
  });

  const trucker2User = await db.user.create({
    data: {
      role: Role.TRUCKER,
      name: "Emily Johnson",
      email: "active.trucker@example.com",
      phone: "+1 469 555 0144",
      passwordHash: password,
      authProvider: "EMAIL"
    }
  });

  const trucker2 = await db.truckerProfile.create({
    data: {
      userId: trucker2User.id,
      equipmentType: "Reefer",
      equipmentCategoryId: reefer.id,
      selectedCommissionBps: reefer.commissionBps,
      packageType: "Percentage Dispatch",
      billingMethod: BillingMethod.PERCENTAGE,
      ratePercentageBps: 700,
      truckCurrentLocation: "Houston, TX",
      companyName: "Johnson Freight Inc.",
      mcDot: "MC-998811",
      assignedConsultantId: dispatcher2.id,
      accountStatus: TruckerStatus.ACTIVE,
      activatedAt: new Date(Date.now() - 14 * 86400000),
      availability: "Active",
      profileCompletedAt: now,
      onboardingCompletedAt: now
    }
  });

  const lead2 = await db.lead.create({
    data: {
      truckerId: trucker2.id,
      assignedToId: dispatcher2.id,
      assignedAt: new Date(Date.now() - 20 * 86400000),
      assignmentMethod: "ROUND_ROBIN",
      currentStatus: LeadStatus.INVOICE_PAID
    }
  });

  await db.leadStatusHistory.createMany({
    data: [
      { leadId: lead2.id, status: LeadStatus.CONTRACT_MADE, changedBy: trucker2User.id, note: "Agreement acknowledged." },
      { leadId: lead2.id, status: LeadStatus.INVOICE_PAID, changedBy: trucker2User.id, note: "Demo active client." }
    ]
  });

  const conversation2 = await db.conversation.create({
    data: {
      truckerId: trucker2.id,
      consultantId: dispatcher2.id,
      twoSidedContactValidated: true,
      lastMessageAt: now
    }
  });

  await db.message.createMany({
    data: [
      { conversationId: conversation2.id, senderId: trucker2User.id, body: "Please add my next load when ready." },
      { conversationId: conversation2.id, senderId: dispatcher2.id, body: "Absolutely. Your account is active." }
    ]
  });

  const invoice2 = await db.invoice.create({
    data: {
      invoiceNumber: "INV-DEMO-000002",
      truckerId: trucker2.id,
      consultantId: dispatcher2.id,
      amountCents: 40000,
      description: "Dispatch Service",
      status: InvoiceStatus.PAID,
      sentAt: new Date(Date.now() - 15 * 86400000),
      paidAt: new Date(Date.now() - 14 * 86400000),
      isFirstInvoice: true,
      agingStartsAt: new Date(Date.now() + 15 * 86400000),
      items: {
        create: {
          description: "Dispatch Service",
          quantity: 1,
          unitCents: 40000,
          totalCents: 40000
        }
      }
    }
  });

  const payment2 = await db.payment.create({
    data: {
      invoiceId: invoice2.id,
      truckerId: trucker2.id,
      amountCents: 40000,
      processorFeeCents: 1190,
      dispatcherCommissionCents: 2400,
      companyNetCents: 36410,
      paymentMethod: "DEMO_GATEWAY",
      transactionId: "demo_active_payment",
      receiptNumber: "RCT-DEMO-000002",
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(Date.now() - 14 * 86400000)
    }
  });

  await db.agreement.create({
    data: {
      truckerId: trucker2.id,
      invoiceId: invoice2.id,
      signerName: "Emily Johnson",
      acceptanceCode: "AGR-DEMO-ACTIVE-001",
      signedAt: new Date(Date.now() - 14 * 86400000)
    }
  });

  await db.load.createMany({
    data: [
      {
        truckerId: trucker2.id,
        consultantId: dispatcher2.id,
        loadRef: "LOAD-1001",
        pickupLocation: "Houston, TX",
        deliveryLocation: "Atlanta, GA",
        pickupAt: new Date(Date.now() + 86400000),
        deliveryAt: new Date(Date.now() + 3 * 86400000),
        rateCents: 245000,
        broker: "Demo Freight Brokers",
        status: "BOOKED",
        notes: "Scheduled demo load."
      },
      {
        truckerId: trucker2.id,
        consultantId: dispatcher2.id,
        loadRef: "LOAD-1000",
        pickupLocation: "Dallas, TX",
        deliveryLocation: "Miami, FL",
        pickupAt: new Date(Date.now() - 7 * 86400000),
        deliveryAt: new Date(Date.now() - 4 * 86400000),
        rateCents: 280000,
        broker: "Southline Brokers",
        status: "DROPPED_OFF",
        notes: "Completed demo load."
      }
    ]
  });

  for (const trucker of [trucker1, trucker2]) {
    for (const type of requiredDocuments) {
      await db.documentRequest.create({
        data: {
          truckerId: trucker.id,
          requestedBy: trucker.assignedConsultantId || admin.id,
          type,
          instructions: "Mandatory portal document.",
          status: "REQUESTED"
        }
      });
    }
  }

  await db.appSetting.createMany({
    data: [
      { key: "t2f_url", value: "https://truck2fleet.com/public/" },
      { key: "invoice_approval", value: "1" }
    ]
  });

  await db.notification.createMany({
    data: [
      {
        userId: trucker1User.id,
        title: "Invoice ready",
        message: `${invoice1.invoiceNumber} is ready for Acknowledge & Pay.`,
        url: `/portal/invoices/${invoice1.id}/pay`
      },
      {
        userId: dispatcher2.id,
        title: "Payment received",
        message: `${invoice2.invoiceNumber} was paid.`,
        url: "/consultant/payments"
      },
      {
        userId: admin.id,
        title: "Demo data ready",
        message: "The Next.js requirements upgrade seed completed successfully.",
        url: "/super-admin/dashboard"
      }
    ]
  });

  console.log("DispatchFlow requirements demo data created.");
  console.log("Super Admin: superadmin@unionenterprises.pk / superadmin123");
  console.log("Dispatcher: dispatcher1@unionenterprises.pk / password");
  console.log("Trucker: trucker@example.com / password");
  console.log("Active Trucker: active.trucker@example.com / password");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
