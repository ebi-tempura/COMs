export const ROLES = Object.freeze({
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    PRESIDENT: "President",
    TREASURER: "Treasurer",
    BOARD_MEMBER: "Board Member",
    RESIDENT: "Resident",
    MANAGER: "Manager",
    STAFF: "Staff",
  });
  
  export const MODULES = Object.freeze({
    SUPPLIERS: "suppliers",
    WORK_ORDERS: "workOrders",
  });
  
  export const ACTIONS = Object.freeze({
    VIEW: "view",
    CREATE: "create",
    EDIT: "edit",
    SUBMIT: "submit",
    APPROVE: "approve",
    REJECT: "reject",
    RESUBMIT: "resubmit",
    CANCEL: "cancel",
    DELETE_INACTIVE: "deleteInactive",
    START_WORK: "startWork",
    COMPLETE_WORK: "completeWork",
  });
  
  export const SUPPLIER_STATUS = Object.freeze({
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    PENDING_RFC_VALIDATION: "Pending RFC Validation",
    RFC_VALIDATED: "RFC Validated",
    PENDING_PRESIDENT_APPROVAL: "Pending President Approval",
    PENDING_BOARD_MEMBER_APPROVAL: "Pending Board Member Approval",
    APPROVED: "Approved",
    RFC_VALIDATION_FAILED: "RFC Validation Failed",
    MANUAL_RFC_REVIEW_REQUIRED: "Manual RFC Review Required",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    INACTIVE: "Inactive",
    DELETED: "Deleted",
  });
  
  export const WORK_ORDER_STATUS = Object.freeze({
    DRAFT: "Draft",
    SUBMITTED: "Submitted",

    PENDING_PRESIDENT_APPROVAL:
        "Pending President Approval",
    PENDING_TREASURER_APPROVAL:
        "Pending Treasurer Approval",
    PENDING_BOARD_MEMBER_APPROVAL:
        "Pending Board Member Approval",

    APPROVED: "Approved",
    IN_PROGRESS: "In Progress",

    PENDING_COMPLETION_PRESIDENT_APPROVAL:
        "Pending Completion President Approval",
    PENDING_COMPLETION_TREASURER_APPROVAL:
        "Pending Completion Treasurer Approval",
    PENDING_COMPLETION_BOARD_MEMBER_APPROVAL:
        "Pending Completion Board Member Approval",

    COMPLETION_REJECTED: "Completion Rejected",
    COMPLETED: "Completed",

    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    INACTIVE: "Inactive",
    DELETED: "Deleted",
  });
  
  export const WORK_ORDER_FLOW_TYPE = Object.freeze({
    NORMAL: "normal",
    HIGH_VALUE: "highValue",
    EMERGENCY: "emergency",
  });