// src/types/workflow-types.ts

// This file contains type definitions related to workflows,
// separated from the server-side logic to comply with 'use server' module constraints.

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
