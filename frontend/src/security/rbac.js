import { ACTIONS, MODULES, ROLES } from "./constants";

export const permissionMatrix = {
  [ROLES.SUPER_ADMIN]: {
    [MODULES.SUPPLIERS]: Object.values(ACTIONS),
    [MODULES.WORK_ORDERS]: Object.values(ACTIONS),
  },

  [ROLES.ADMIN]: {
    [MODULES.SUPPLIERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT,
      ACTIONS.SUBMIT,
      ACTIONS.RESUBMIT,
      ACTIONS.CANCEL,
      ACTIONS.DELETE_INACTIVE,
    ],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT,
      ACTIONS.SUBMIT,
      ACTIONS.RESUBMIT,
      ACTIONS.CANCEL,
      ACTIONS.DELETE_INACTIVE,
      ACTIONS.START_WORK,
      ACTIONS.COMPLETE_WORK,
    ],
  },

  [ROLES.PRESIDENT]: {
    [MODULES.SUPPLIERS]: [
      ACTIONS.VIEW,
      ACTIONS.APPROVE,
      ACTIONS.REJECT,
    ],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.APPROVE,
      ACTIONS.REJECT,
    ],
  },

  [ROLES.TREASURER]: {
    [MODULES.SUPPLIERS]: [ACTIONS.VIEW],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.APPROVE,
      ACTIONS.REJECT,
    ],
  },

  [ROLES.BOARD_MEMBER]: {
    [MODULES.SUPPLIERS]: [
      ACTIONS.VIEW,
      ACTIONS.APPROVE,
      ACTIONS.REJECT,
    ],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.APPROVE,
      ACTIONS.REJECT,
    ],
  },

  [ROLES.RESIDENT]: {
    [MODULES.SUPPLIERS]: [],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      /* ACTIONS.EDIT,*/
      /* ACTIONS.SUBMIT,*/
      /* ACTIONS.RESUBMIT,*/
      /*ACTIONS.CANCEL,*/
    ],
  },

  [ROLES.MANAGER]: {
    [MODULES.SUPPLIERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT,
      ACTIONS.SUBMIT,
      ACTIONS.RESUBMIT,
      ACTIONS.CANCEL,
      ACTIONS.DELETE_INACTIVE,
    ],
    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT,
      ACTIONS.SUBMIT,
      ACTIONS.RESUBMIT,
      ACTIONS.CANCEL,
      ACTIONS.DELETE_INACTIVE,
      ACTIONS.START_WORK,
      ACTIONS.COMPLETE_WORK,
    ],
  },

  [ROLES.STAFF]: {
    [MODULES.SUPPLIERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT],

    [MODULES.WORK_ORDERS]: [
      ACTIONS.VIEW,
      ACTIONS.CREATE,
      ACTIONS.EDIT,
      ACTIONS.START_WORK,
      ACTIONS.COMPLETE_WORK,
    ],
  },
};

export function hasPermission(user, module, action) {
  if (!user?.role) return false;

  return Boolean(
    permissionMatrix[user.role]?.[module]?.includes(action)
  );
}

export function canAccessModule(user, module) {
  if (!user?.role) return false;

  return Boolean(permissionMatrix[user.role]?.[module]?.length);
}