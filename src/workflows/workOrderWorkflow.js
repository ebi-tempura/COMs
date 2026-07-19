import {
    ACTIONS,
    WORK_ORDER_FLOW_TYPE,
    WORK_ORDER_STATUS,
  } from "../security/constants";
  
  import { updateRecordStatus } from "./workflowEngine";
  
  export const HIGH_VALUE_THRESHOLD = 50000;
  
  export function determineWorkOrderFlow(workOrder) {
    if (workOrder.isEmergency === true) {
      return WORK_ORDER_FLOW_TYPE.EMERGENCY;
    }
  
    if (Number(workOrder.amount || 0) >= HIGH_VALUE_THRESHOLD) {
      return WORK_ORDER_FLOW_TYPE.HIGH_VALUE;
    }
  
    return WORK_ORDER_FLOW_TYPE.NORMAL;
  }
  
  export function submitWorkOrder(workOrder, user) {
    if (workOrder.status !== WORK_ORDER_STATUS.DRAFT) {
      return workOrder;
    }
  
    const flowType =
      workOrder.flowType || determineWorkOrderFlow(workOrder);
  
    const workOrderWithFlow = {
      ...workOrder,
      flowType,
    };
  
    return updateRecordStatus({
      record: workOrderWithFlow,
      nextStatus: WORK_ORDER_STATUS.PENDING_PRESIDENT_APPROVAL,
      action: ACTIONS.SUBMIT,
      user,
    });
  }
  
  export const WorkOrderWorkflow = {
    determineFlow: determineWorkOrderFlow,
    submit: submitWorkOrder,
  };