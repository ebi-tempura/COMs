function createAuditEventId() {
    const uuid = globalThis.crypto?.randomUUID?.();

    if (uuid) {
        return `AUD-${uuid}`;
    }

    return `AUD-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

export function createAuditEvent({
    action,
    entityType = "Record",
    entityId,
    entityVersion = 1,
    fromStatus = null,
    toStatus = null,
    user,
    comment = "",
    changes = [],
    timestamp = new Date().toISOString(),
}) {
    if (!entityId) {
        throw new Error("Audit event requires an entity ID.");
    }

    if (!user?.id) {
        throw new Error("Audit event requires a valid user.");
    }

    return {
        id: createAuditEventId(),
        action,
        entityType,
        entityId,
        entityVersion,
        fromStatus,
        toStatus,

        performedBy: {
            userId: user.id,
            userName: user.name,
            role: user.role,
        },

        timestamp,
        comment,
        changes,
    };
}

export function updateRecordStatus({
    record,
    nextStatus,
    action,
    user,
    comment = "",
    changes = [],
}) {
    const timestamp = new Date().toISOString();

    const existingAuditTrail =
        record.auditTrail ??
        record.approvalHistory ??
        [];

    const auditTrail = [
        ...existingAuditTrail,
        createAuditEvent({
            action,
            entityType: record.entityType ?? "Record",
            entityId: record.id,
            entityVersion: record.version ?? 1,
            fromStatus: record.status,
            toStatus: nextStatus,
            user,
            comment,
            changes,
            timestamp,
        }),
    ];

    return {
        ...record,
        status: nextStatus,
        updatedAt: timestamp,
        auditTrail,

        // Temporary compatibility with the Supplier workflow.
        approvalHistory: auditTrail,
    };
}

export function isCreator(record, user) {
    return record.createdBy === user.id;
}