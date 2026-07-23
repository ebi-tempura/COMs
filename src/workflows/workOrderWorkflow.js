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

export const WORK_ORDER_OPERATOR_ROLES = Object.freeze([
    ROLES.STAFF,
    ROLES.MANAGER,
]);

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

const COMPLETION_STATUS_BY_APPROVER_ROLE = Object.freeze({
    [WORK_ORDER_APPROVER_ROLES.PRESIDENT]:
        WORK_ORDER_STATUS.PENDING_COMPLETION_PRESIDENT_APPROVAL,

    [WORK_ORDER_APPROVER_ROLES.TREASURER]:
        WORK_ORDER_STATUS.PENDING_COMPLETION_TREASURER_APPROVAL,

    [WORK_ORDER_APPROVER_ROLES.BOARD_MEMBER]:
        WORK_ORDER_STATUS.PENDING_COMPLETION_BOARD_MEMBER_APPROVAL,
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


function validateWorkOrderOperator(user) {
    if (
        !user?.id ||
        !WORK_ORDER_OPERATOR_ROLES.includes(user.role)
    ) {
        throw new Error(
            "Only Staff or Manager can start work or submit completion."
        );
    }
}

export function startWorkOrder(workOrder, user) {
    validateWorkOrderOperator(user);

    if (workOrder.status !== WORK_ORDER_STATUS.APPROVED) {
        throw new Error(
            "Only an approved Work Order can be started."
        );
    }

    return updateRecordStatus({
        record: workOrder,
        nextStatus: WORK_ORDER_STATUS.IN_PROGRESS,
        action: ACTIONS.START_WORK,
        user,
    });
}

export function calculateWorkOrderCompletionApproval(
    workOrder
) {
    const originallyApprovedAmount =
        normalizeWorkOrderAmount(
            workOrder.approvalAmount ??
                workOrder.amount
        );

    /*
     * Later, the completion form can provide actualAmount.
     * Until then, it falls back to the original amount.
     */
    const reportedCompletionAmount =
        normalizeWorkOrderAmount(
            workOrder.actualAmount ??
                workOrder.finalAmount ??
                workOrder.amount
        );

    /*
     * The completion route cannot become weaker.
     *
     * Example:
     * Original amount: 4,000
     * Final amount: 900
     * Completion approval still uses 4,000.
     */
    const completionApprovalAmount = Math.max(
        originallyApprovedAmount,
        reportedCompletionAmount
    );

    return {
        reportedCompletionAmount,
        completionApprovalAmount,
        completionApprovalCurrency: "MXN",
        completionApprovalRoute:
            getWorkOrderApprovalRoute(
                completionApprovalAmount
            ),
    };
}

export function lockWorkOrderCompletionApprovalRoute(
    workOrder
) {
    const completionApproval =
        calculateWorkOrderCompletionApproval(
            workOrder
        );

    const completionVersion =
        (Number.isInteger(
            workOrder.completionVersion
        )
            ? workOrder.completionVersion
            : 0) + 1;

    return {
        ...workOrder,
        ...completionApproval,

        completionVersion,

        completionApprovalRouteLabel:
            formatWorkOrderApprovalRoute(
                completionApproval
                    .completionApprovalRoute
            ),

        completionApprovalRouteCalculatedAt:
            new Date().toISOString(),

        completionApprovalRouteLocked: true,
        currentCompletionApprovalStep: 0,
    };
}

export function submitWorkOrderCompletion(
    workOrder,
    user
) {
    validateWorkOrderOperator(user);

    const canSubmitCompletion = [
        WORK_ORDER_STATUS.IN_PROGRESS,
        WORK_ORDER_STATUS.COMPLETION_REJECTED,
    ].includes(workOrder.status);

    if (!canSubmitCompletion) {
        throw new Error(
            "Only an in-progress or completion-rejected Work Order can be submitted for completion approval."
        );
    }

    const lockedWorkOrder =
        lockWorkOrderCompletionApprovalRoute(
            workOrder
        );

    return updateRecordStatus({
        record: {
            ...lockedWorkOrder,

            completionSubmittedBy: {
                userId: user.id,
                userName: user.name,
                role: user.role,
            },
        },

        nextStatus:
            WORK_ORDER_STATUS
                .PENDING_COMPLETION_PRESIDENT_APPROVAL,

        action: ACTIONS.COMPLETE_WORK,
        user,
    });
}

function getCurrentCompletionApprovalStep(
    workOrder
) {
    if (
        !Array.isArray(
            workOrder.completionApprovalRoute
        )
    ) {
        throw new Error(
            "The Work Order does not have a locked completion approval route."
        );
    }

    const currentStep =
        workOrder.completionApprovalRoute[
            workOrder
                .currentCompletionApprovalStep
        ];

    if (!currentStep) {
        throw new Error(
            "The Work Order does not have a current completion approval step."
        );
    }

    return currentStep;
}

function validateWorkOrderCompletionApprover(
    workOrder,
    user
) {
    if (isCreator(workOrder, user)) {
        throw new Error(
            "You cannot approve or reject completion of your own Work Order."
        );
    }

    const currentStep =
        getCurrentCompletionApprovalStep(
            workOrder
        );

    const expectedStatus =
        COMPLETION_STATUS_BY_APPROVER_ROLE[
            currentStep.role
        ];

    if (workOrder.status !== expectedStatus) {
        throw new Error(
            "This Work Order is not awaiting the current completion approval step."
        );
    }

    if (user.role !== currentStep.role) {
        throw new Error(
            `Only the ${currentStep.role} can act on this completion step.`
        );
    }
}

export function approveWorkOrderCompletion(
    workOrder,
    user
) {
    validateWorkOrderCompletionApprover(
        workOrder,
        user
    );

    const nextStepIndex =
        workOrder.currentCompletionApprovalStep +
        1;

    const nextStep =
        workOrder.completionApprovalRoute[
            nextStepIndex
        ];

    return updateRecordStatus({
        record: {
            ...workOrder,

            currentCompletionApprovalStep:
                nextStep
                    ? nextStepIndex
                    : null,
        },

        nextStatus: nextStep
            ? COMPLETION_STATUS_BY_APPROVER_ROLE[
                  nextStep.role
              ]
            : WORK_ORDER_STATUS.COMPLETED,

        action: ACTIONS.APPROVE,
        user,
    });
}

export function rejectWorkOrderCompletion(
    workOrder,
    user,
    comment
) {
    if (!comment?.trim()) {
        throw new Error(
            "Completion rejection requires a comment."
        );
    }

    validateWorkOrderCompletionApprover(
        workOrder,
        user
    );

    return updateRecordStatus({
        record: {
            ...workOrder,

            currentCompletionApprovalStep: null,
            completionApprovalRouteLocked: false,
        },

        nextStatus:
            WORK_ORDER_STATUS
                .COMPLETION_REJECTED,

        action: ACTIONS.REJECT,
        user,
        comment: comment.trim(),
    });
}

const workOrderWorkflow = Object.freeze({
    submit: submitWorkOrder,
    approve: approveWorkOrder,
    reject: rejectWorkOrder,

    startWork: startWorkOrder,
    submitCompletion:
        submitWorkOrderCompletion,
    approveCompletion:
        approveWorkOrderCompletion,
    rejectCompletion:
        rejectWorkOrderCompletion,

    getApprovalRoute:
        getWorkOrderApprovalRoute,

    calculateApproval:
        calculateWorkOrderApproval,

    lockApprovalRoute:
        lockWorkOrderApprovalRoute,

    calculateCompletionApproval:
        calculateWorkOrderCompletionApproval,

    lockCompletionApprovalRoute:
        lockWorkOrderCompletionApprovalRoute,

    formatApprovalRoute:
        formatWorkOrderApprovalRoute,
});

export default workOrderWorkflow;