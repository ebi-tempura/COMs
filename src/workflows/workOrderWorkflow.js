import {
    ACTIONS,
    ROLES,
    WORK_ORDER_STATUS,
} from "../security/constants";

import { isCreator, updateRecordStatus } from "./workflowEngine";

export const WORK_ORDER_APPROVER_ROLES = Object.freeze({
    PRESIDENT: ROLES.PRESIDENT,
    TREASURER: ROLES.TREASURER,
    BOARD_MEMBER: ROLES.BOARD_MEMBER,
});

export const WORK_ORDER_APPROVAL_THRESHOLDS = Object.freeze({
    PRESIDENT_ONLY_MAX: 1000,
    PRESIDENT_TREASURER_MAX: 5000,
});

const ROLE_LABELS = Object.freeze({
    [WORK_ORDER_APPROVER_ROLES.PRESIDENT]: "President",
    [WORK_ORDER_APPROVER_ROLES.TREASURER]: "Treasurer",
    [WORK_ORDER_APPROVER_ROLES.BOARD_MEMBER]: "Board Member",
});

/**
 * Converts the Work Order amount into a valid number.
 * Throws an error when the amount is missing or invalid.
 */
export function normalizeWorkOrderAmount(value) {
    if (typeof value === "string" && value.trim() === "") {
        throw new Error("Work Order amount is required.");
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        throw new Error("Work Order amount must be a valid number.");
    }

    if (amount <= 0) {
        throw new Error("Work Order amount must be greater than zero.");
    }

    return amount;
}

/**
 * Rule 3:
 * Automatically calculates the required approval route.
 */
export function getWorkOrderApprovalRoute(value) {
    const amount = normalizeWorkOrderAmount(value);

    let roles;

    if (amount <= WORK_ORDER_APPROVAL_THRESHOLDS.PRESIDENT_ONLY_MAX) {
        roles = [WORK_ORDER_APPROVER_ROLES.PRESIDENT];
    } else if (
        amount <= WORK_ORDER_APPROVAL_THRESHOLDS.PRESIDENT_TREASURER_MAX
    ) {
        roles = [
            WORK_ORDER_APPROVER_ROLES.PRESIDENT,
            WORK_ORDER_APPROVER_ROLES.TREASURER,
        ];
    } else {
        roles = [
            WORK_ORDER_APPROVER_ROLES.PRESIDENT,
            WORK_ORDER_APPROVER_ROLES.TREASURER,
            WORK_ORDER_APPROVER_ROLES.BOARD_MEMBER,
        ];
    }

    return roles.map((role, index) => ({
        role,
        order: index + 1,
    }));
}

/**
 * Converts the route into readable text for the interface.
 */
export function formatWorkOrderApprovalRoute(route) {
    if (!Array.isArray(route) || route.length === 0) {
        return "No approval route";
    }

    return route
        .map((step) => ROLE_LABELS[step.role] ?? step.role)
        .join(" → ");
}

/**
 * Calculates all approval information for a Work Order.
 */
export function calculateWorkOrderApproval(workOrder) {
    if (!workOrder || typeof workOrder !== "object") {
        throw new Error("A Work Order is required.");
    }

    /*
     * `amount` is the current MVP field.
     *
     * `totalAmount` is also supported for later, when the form has
     * separate tax, labor, material, transport, and fee fields.
     */
    const approvalAmount = normalizeWorkOrderAmount(
        workOrder.totalAmount ?? workOrder.amount
    );

    return {
        approvalAmount,
        approvalCurrency: "MXN",
        approvalRoute: getWorkOrderApprovalRoute(approvalAmount),
    };
}

/**
 * Creates the approval-route snapshot at submission.
 *
 * This ties the calculated route to the current Work Order version.
 */
export function lockWorkOrderApprovalRoute(workOrder) {
    const approval = calculateWorkOrderApproval(workOrder);

    const workOrderVersion = Number.isInteger(workOrder.version)
        ? workOrder.version
        : 1;

    return {
        ...workOrder,
        ...approval,
        approvalRouteVersion: workOrderVersion,
        approvalRouteCalculatedAt: new Date().toISOString(),
        approvalRouteLocked: true,
    };
}

export function submitWorkOrder(workOrder, user) {
    if (workOrder.status !== WORK_ORDER_STATUS.DRAFT) {
        return workOrder;
    }

    const lockedWorkOrder = lockWorkOrderApprovalRoute(workOrder);

    return updateRecordStatus({
        record: {
            ...lockedWorkOrder,
            approvalRouteLabel: formatWorkOrderApprovalRoute(
                lockedWorkOrder.approvalRoute
            ),
            currentApprovalStep: 0,
            version: lockedWorkOrder.approvalRouteVersion,
        },
        nextStatus: WORK_ORDER_STATUS.PENDING_PRESIDENT_APPROVAL,
        action: ACTIONS.SUBMIT,
        user,
    });
}

const STATUS_BY_APPROVER_ROLE = Object.freeze({
    [WORK_ORDER_APPROVER_ROLES.PRESIDENT]:
        WORK_ORDER_STATUS.PENDING_PRESIDENT_APPROVAL,
    [WORK_ORDER_APPROVER_ROLES.TREASURER]:
        WORK_ORDER_STATUS.PENDING_TREASURER_APPROVAL,
    [WORK_ORDER_APPROVER_ROLES.BOARD_MEMBER]:
        WORK_ORDER_STATUS.PENDING_BOARD_MEMBER_APPROVAL,
});

function getCurrentApprovalStep(workOrder) {
    if (!Array.isArray(workOrder.approvalRoute)) {
        throw new Error(
            "The Work Order does not have a locked approval route."
        );
    }

    const currentStep =
        workOrder.approvalRoute[workOrder.currentApprovalStep];

    if (!currentStep) {
        throw new Error(
            "The Work Order does not have a current approval step."
        );
    }

    return currentStep;
}

function validateWorkOrderApprover(workOrder, user) {
    if (isCreator(workOrder, user)) {
        throw new Error(
            "You cannot approve or reject your own Work Order."
        );
    }

    const currentStep = getCurrentApprovalStep(workOrder);
    const expectedStatus = STATUS_BY_APPROVER_ROLE[currentStep.role];

    if (workOrder.status !== expectedStatus) {
        throw new Error(
            "This Work Order is not awaiting the current approval step."
        );
    }

    if (user.role !== currentStep.role) {
        throw new Error(
            `Only the ${ROLE_LABELS[currentStep.role]} can act on this step.`
        );
    }
}

export function approveWorkOrder(workOrder, user) {
    validateWorkOrderApprover(workOrder, user);

    const nextStepIndex = workOrder.currentApprovalStep + 1;
    const nextStep = workOrder.approvalRoute[nextStepIndex];

    return updateRecordStatus({
        record: {
            ...workOrder,
            currentApprovalStep: nextStep ? nextStepIndex : null,
        },
        nextStatus: nextStep
            ? STATUS_BY_APPROVER_ROLE[nextStep.role]
            : WORK_ORDER_STATUS.APPROVED,
        action: ACTIONS.APPROVE,
        user,
    });
}

export function rejectWorkOrder(workOrder, user, comment) {
    if (!comment?.trim()) {
        throw new Error("Rejection requires a comment.");
    }

    validateWorkOrderApprover(workOrder, user);

    return updateRecordStatus({
        record: {
            ...workOrder,
            currentApprovalStep: null,
        },
        nextStatus: WORK_ORDER_STATUS.REJECTED,
        action: ACTIONS.REJECT,
        user,
        comment: comment.trim(),
    });
}

const workOrderWorkflow = Object.freeze({
    submit: submitWorkOrder,
    approve: approveWorkOrder,
    reject: rejectWorkOrder,
    getApprovalRoute: getWorkOrderApprovalRoute,
    calculateApproval: calculateWorkOrderApproval,
    lockApprovalRoute: lockWorkOrderApprovalRoute,
    formatApprovalRoute: formatWorkOrderApprovalRoute,
});

export default workOrderWorkflow;