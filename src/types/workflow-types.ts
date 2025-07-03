
// src/types/workflow-types.ts

export interface WorkflowStepTransition {
  targetStatus: string;
  targetAssignedDivision: string;
  targetNextActionDescription: string | null;
  targetProgress: number;
  notification?: {
    division: string | string[] | null;
    message: string;
  };
}

export interface WorkflowStep {
  stepName: string;
  status: string;
  assignedDivision: string;
  progress: number;
  nextActionDescription: string | null;
  transitions: {
    [action: string]: WorkflowStepTransition;
  } | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}
