import {
    ACTIONS,
    ROLES,
    SUPPLIER_STATUS,
  } from "../security/constants";
  
  import {
    isCreator,
    updateRecordStatus,
  } from "./workflowEngine";
  
  export function submitSupplier(supplier, user) {
    if (supplier.status !== SUPPLIER_STATUS.DRAFT) {
      return supplier;
    }
  
    return updateRecordStatus({
      record: supplier,
      nextStatus: SUPPLIER_STATUS.PENDING_RFC_VALIDATION,
      action: ACTIONS.SUBMIT,
      user,
    });
  }
  
  export function applyRfcValidation(supplier, result) {
    if (supplier.status !== SUPPLIER_STATUS.PENDING_RFC_VALIDATION) {
      return supplier;
    }
  
    const systemUser = {
      id: "system",
      name: "System",
      role: "System",
    };
  
    if (result === "valid") {
      return updateRecordStatus({
        record: supplier,
        nextStatus: SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL,
        action: "rfcValidated",
        user: systemUser,
      });
    }
  
    if (result === "failed") {
      return updateRecordStatus({
        record: supplier,
        nextStatus: SUPPLIER_STATUS.RFC_VALIDATION_FAILED,
        action: "rfcValidationFailed",
        user: systemUser,
      });
    }
  
    if (result === "manualReview") {
      return updateRecordStatus({
        record: supplier,
        nextStatus: SUPPLIER_STATUS.MANUAL_RFC_REVIEW_REQUIRED,
        action: "manualRfcReviewRequired",
        user: systemUser,
      });
    }
  
    return supplier;
  }
  
  export function approveSupplier(supplier, user) {
    if (isCreator(supplier, user)) {
      throw new Error("You cannot approve your own supplier request.");
    }
  
    if (
      supplier.status === SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL
    ) {
      if (user.role !== ROLES.PRESIDENT) {
        throw new Error("Only the President can approve this step.");
      }
  
      return updateRecordStatus({
        record: supplier,
        nextStatus: SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL,
        action: ACTIONS.APPROVE,
        user,
      });
    }
  
    if (
      supplier.status ===
      SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL
    ) {
      if (user.role !== ROLES.BOARD_MEMBER) {
        throw new Error("Only a Board Member can approve this step.");
      }
  
      return updateRecordStatus({
        record: supplier,
        nextStatus: SUPPLIER_STATUS.APPROVED,
        action: ACTIONS.APPROVE,
        user,
      });
    }
  
    return supplier;
  }
  
  export function rejectSupplier(supplier, user, comment) {
    if (!comment?.trim()) {
      throw new Error("Rejection requires a comment.");
    }
  
    if (isCreator(supplier, user)) {
      throw new Error("You cannot reject your own supplier request.");
    }
  
    const isPresidentStep =
      supplier.status === SUPPLIER_STATUS.PENDING_PRESIDENT_APPROVAL;
  
    const isBoardMemberStep =
      supplier.status ===
      SUPPLIER_STATUS.PENDING_BOARD_MEMBER_APPROVAL;
  
    if (!isPresidentStep && !isBoardMemberStep) {
      return supplier;
    }
  
    if (isPresidentStep && user.role !== ROLES.PRESIDENT) {
      throw new Error("Only the President can reject this step.");
    }
  
    if (isBoardMemberStep && user.role !== ROLES.BOARD_MEMBER) {
      throw new Error("Only a Board Member can reject this step.");
    }
  
    return updateRecordStatus({
      record: supplier,
      nextStatus: SUPPLIER_STATUS.REJECTED,
      action: ACTIONS.REJECT,
      user,
      comment: comment.trim(),
    });
  }
  
  export function resubmitSupplier(supplier, user) {
    const allowedStatuses = [
      SUPPLIER_STATUS.REJECTED,
      SUPPLIER_STATUS.RFC_VALIDATION_FAILED,
      SUPPLIER_STATUS.MANUAL_RFC_REVIEW_REQUIRED,
    ];
  
    if (!allowedStatuses.includes(supplier.status)) {
      return supplier;
    }
  
    return updateRecordStatus({
      record: supplier,
      nextStatus: SUPPLIER_STATUS.PENDING_RFC_VALIDATION,
      action: ACTIONS.RESUBMIT,
      user,
    });
  }