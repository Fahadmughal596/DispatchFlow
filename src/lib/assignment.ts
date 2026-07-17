import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function assignRoundRobin(truckerId: number, actorId?: number) {
  const eligible = await db.user.findMany({
    where: {
      role: "CONSULTANT_DISPATCHER",
      status: "ACTIVE",
      consultantProfile: {
        is: { isPaused: false }
      }
    },
    include: {
      consultantProfile: true,
      assignedLeads: {
        where: {
          currentStatus: {
            not: "INVOICE_PAID"
          }
        },
        select: { id: true }
      }
    },
    orderBy: [
      { consultantProfile: { sequencePosition: "asc" } },
      { id: "asc" }
    ]
  });

  const underCap = eligible.filter((user) => {
    const cap = user.consultantProfile?.maxLeadCap ?? 100;
    return user.assignedLeads.length < cap;
  });

  if (!underCap.length) {
    throw new Error("No eligible Consultant / Dispatcher is available.");
  }

  const minPosition = Math.min(
    ...underCap.map((user) => user.consultantProfile?.sequencePosition ?? 0)
  );
  const candidates = underCap.filter(
    (user) => (user.consultantProfile?.sequencePosition ?? 0) === minPosition
  );
  candidates.sort(
    (a, b) =>
      (b.consultantProfile?.priorityWeight ?? 1) -
        (a.consultantProfile?.priorityWeight ?? 1) ||
      a.id - b.id
  );

  const selected = candidates[0];

  await db.$transaction(async (tx) => {
    const profile = await tx.truckerProfile.update({
      where: { id: truckerId },
      data: { assignedConsultantId: selected.id }
    });

    const lead = await tx.lead.update({
      where: { truckerId },
      data: {
        assignedToId: selected.id,
        assignedAt: new Date(),
        assignmentMethod: "ROUND_ROBIN",
        sequencePosition: selected.consultantProfile?.sequencePosition ?? 0,
        currentStatus: "LEAD_ASSIGNED"
      }
    });

    await tx.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        status: "LEAD_ASSIGNED",
        changedBy: actorId ?? selected.id,
        note: "Assigned through neutral round-robin."
      }
    });

    await tx.conversation.upsert({
      where: {
        truckerId_consultantId: {
          truckerId,
          consultantId: selected.id
        }
      },
      update: {},
      create: {
        truckerId,
        consultantId: selected.id
      }
    });

    await tx.consultantProfile.update({
      where: { userId: selected.id },
      data: { sequencePosition: { increment: 1 } }
    });

    await tx.notification.create({
      data: {
        userId: selected.id,
        title: "New lead assigned",
        message: `${profile.companyName || "A new trucker"} has been assigned to you.`,
        url: "/consultant/leads"
      }
    });
  });

  await audit(actorId ?? selected.id, "LEAD_ASSIGNED_ROUND_ROBIN", "TruckerProfile", truckerId, null, {
    consultantId: selected.id
  });

  return selected;
}

export async function reassignLead(
  leadId: number,
  newConsultantId: number,
  actorId: number,
  reason?: string
) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { trucker: true }
  });
  if (!lead) throw new Error("Lead not found.");

  const consultant = await db.user.findFirst({
    where: {
      id: newConsultantId,
      role: "CONSULTANT_DISPATCHER",
      status: "ACTIVE"
    }
  });
  if (!consultant) throw new Error("Consultant / Dispatcher not found.");

  const old = { assignedToId: lead.assignedToId };

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        assignedToId: newConsultantId,
        assignedAt: new Date(),
        assignmentMethod: "MANUAL_ADMIN"
      }
    });
    await tx.truckerProfile.update({
      where: { id: lead.truckerId },
      data: { assignedConsultantId: newConsultantId }
    });
    await tx.conversation.upsert({
      where: {
        truckerId_consultantId: {
          truckerId: lead.truckerId,
          consultantId: newConsultantId
        }
      },
      update: {},
      create: {
        truckerId: lead.truckerId,
        consultantId: newConsultantId
      }
    });
    await tx.notification.create({
      data: {
        userId: newConsultantId,
        title: "Lead reassigned to you",
        message: reason || "A lead has been manually assigned by Super Admin.",
        url: "/consultant/leads"
      }
    });
  });

  await audit(actorId, "LEAD_REASSIGNED", "Lead", leadId, old, {
    assignedToId: newConsultantId,
    reason
  });
}
