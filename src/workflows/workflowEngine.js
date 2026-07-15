export function createHistoryEntry({
    action,
    fromStatus,
    toStatus,
    user,
    comment = "",
  }) {
    return {
      action,
      fromStatus,
      toStatus,
      byUserId: user.id,
      byUserName: user.name,
      byRole: user.role,
      at: new Date().toISOString(),
      comment,
    };
  }
  
  export function updateRecordStatus({
    record,
    nextStatus,
    action,
    user,
    comment = "",
  }) {
    return {
      ...record,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
  
      approvalHistory: [
        ...(record.approvalHistory || []),
        createHistoryEntry({
          action,
          fromStatus: record.status,
          toStatus: nextStatus,
          user,
          comment,
        }),
      ],
    };
  }
  
  export function isCreator(record, user) {
    return record.createdBy === user.id;
  }