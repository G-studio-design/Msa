
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowStepTransition {
  targetStatus: string;
  targetAssignedDivision: string;
  targetNextActionDescription: string | null;
  targetProgress: number;
  notification?: {
    division: string | null; // Target division for notification, null if no specific division
    message: string; // Message template, e.g., "Project '{projectName}' is now at {newStatus}."
  };
}

export interface WorkflowStep {
  stepName: string;
  status: string; // The project status during this step
  assignedDivision: string; // The division responsible for completing this step
  progress: number; // The project's progress percentage upon entering this step
  nextActionDescription: string | null; // User-facing description of the next action
  transitions: {
    // Key is the action taken (e.g., "submitted", "approved", "rejected")
    [action: string]: WorkflowStepTransition;
  } | null; // Null if this is a terminal step (e.g., Completed, Canceled)
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const WORKFLOWS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'workflows.json');

async function readWorkflows(): Promise<Workflow[]> {
  try {
    await fs.access(WORKFLOWS_DB_PATH);
  } catch (error) {
    console.warn("Workflows database file not found (workflows.json). Creating with an empty array.");
    // If you have default workflows, you can populate them here.
    await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  try {
    const data = await fs.readFile(WORKFLOWS_DB_PATH, 'utf8');
    if (data.trim() === "") {
        console.warn("Workflows database file is empty. Returning empty array.");
        return [];
    }
    return JSON.parse(data) as Workflow[];
  } catch (parseError) {
      console.error("Error parsing workflows.json. Returning empty array.", parseError);
      // Optionally, backup the corrupted file and create a new empty one.
      // await fs.rename(WORKFLOWS_DB_PATH, `${WORKFLOWS_DB_PATH}.corrupted.${Date.now()}`);
      // await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify([], null, 2), 'utf8');
      return [];
  }
}

async function writeWorkflows(workflows: Workflow[]): Promise<void> {
  await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify(workflows, null, 2), 'utf8');
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  return await readWorkflows();
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await readWorkflows();
  return workflows.find(wf => wf.id === id) || null;
}

export async function getFirstStep(workflowId: string): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (workflow && workflow.steps.length > 0) {
    return workflow.steps[0];
  }
  console.warn(`Workflow with ID ${workflowId} not found or has no steps.`);
  return null;
}

export async function getCurrentStepDetails(
  workflowId: string,
  currentStatus: string,
  currentProgress: number // Added progress to differentiate steps with same status
): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.warn(`Workflow with ID ${workflowId} not found when trying to get current step details.`);
    return null;
  }
  // Find step matching both status and progress for more accuracy
  const step = workflow.steps.find(s => s.status === currentStatus && s.progress === currentProgress);
  if (!step) {
      console.warn(`Step with status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
  }
  return step || null;
}


export async function getTransitionInfo(
  workflowId: string,
  currentStatus: string,
  currentProgress: number,
  actionTaken: string = 'submitted' // 'submitted' for standard progression, 'approved', 'rejected', 'revise' for decisions
): Promise<WorkflowStepTransition | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.error(`Workflow with ID ${workflowId} not found.`);
    return null;
  }

  // Find the current step based on status AND progress to differentiate same status names at different points
  const currentStep = workflow.steps.find(step => step.status === currentStatus && step.progress === currentProgress);

  if (!currentStep) {
    console.error(`Current step for status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
    return null;
  }

  if (!currentStep.transitions) {
    console.log(`Step "${currentStep.stepName}" in workflow "${workflowId}" is a terminal step.`);
    return null; // Terminal step
  }

  const transition = currentStep.transitions[actionTaken];
  if (!transition) {
    console.warn(`No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}) in workflow "${workflowId}". Trying 'default'.`);
    // Fallback to 'default' or 'submitted' if a specific action transition isn't found
    const fallbackAction = currentStep.transitions['default'] ? 'default' : (currentStep.transitions['submitted'] ? 'submitted' : null);
    if (fallbackAction) {
      return currentStep.transitions[fallbackAction];
    }
    console.error(`No fallback ('default' or 'submitted') transition found for step "${currentStep.stepName}" in workflow "${workflowId}".`);
    return null;
  }
  return transition;
}

export async function addWorkflow(newWorkflowData: Omit<Workflow, 'id'>): Promise<Workflow> {
  const workflows = await readWorkflows();
  const newWorkflow: Workflow = {
    ...newWorkflowData,
    id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
  workflows.push(newWorkflow);
  await writeWorkflows(workflows);
  return newWorkflow;
}

export async function updateWorkflow(workflowId: string, updatedWorkflowData: Partial<Omit<Workflow, 'id'>>): Promise<Workflow | null> {
  const workflows = await readWorkflows();
  const index = workflows.findIndex(wf => wf.id === workflowId);
  if (index === -1) {
    console.error(`Workflow with ID ${workflowId} not found for update.`);
    return null;
  }
  // Ensure ID is not changed
  const { id, ...dataToUpdate } = updatedWorkflowData as Partial<Workflow>;
  workflows[index] = { ...workflows[index], ...dataToUpdate };
  await writeWorkflows(workflows);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  let workflows = await readWorkflows();
  const initialLength = workflows.length;
  workflows = workflows.filter(wf => wf.id !== workflowId);
  if (workflows.length === initialLength) {
      console.warn(`Workflow with ID ${workflowId} not found for deletion.`);
      throw new Error('WORKFLOW_NOT_FOUND');
  }
  await writeWorkflows(workflows);
}

// Function to get all unique statuses from all workflows (for manual status change dropdown)
export async function getAllUniqueStatuses(): Promise<string[]> {
    const workflows = await readWorkflows();
    const allStatuses = new Set<string>();
    workflows.forEach(wf => {
        wf.steps.forEach(step => {
            allStatuses.add(step.status);
        });
    });
    return Array.from(allStatuses);
}

