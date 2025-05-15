
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowStepTransition {
  targetStatus: string;
  targetAssignedDivision: string;
  targetNextActionDescription: string | null;
  targetProgress: number;
  notification?: {
    division: string | null;
    message: string; // Message template, e.g., "Project '{projectName}' is now at {newStatus}."
  };
}

export interface WorkflowStep {
  stepName: string;
  status: string;
  assignedDivision: string;
  progress: number;
  nextActionDescription: string | null;
  transitions: {
    [action: string]: WorkflowStepTransition; // "default", "submitted", "approved", "rejected", "revise" etc.
  } | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const WORKFLOWS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'workflows.json');

// Struktur Alur Kerja Default yang LENGKAP (sebelumnya FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)
const DEFAULT_STANDARD_WORKFLOW_STRUCTURE: WorkflowStep[] = [
    {
        stepName: "Offer Submission",
        status: "Pending Offer",
        assignedDivision: "Admin Proyek",
        progress: 10,
        nextActionDescription: "Unggah Dokumen Penawaran",
        transitions: {
          "submitted": {
            targetStatus: "Pending Approval",
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Setujui Dokumen Penawaran",
            targetProgress: 20,
            notification: {
              division: "Owner",
              message: "Penawaran untuk proyek '{projectName}' telah diajukan dan menunggu persetujuan Anda."
            }
          }
        }
      },
      {
        stepName: "Offer Approval",
        status: "Pending Approval",
        assignedDivision: "Owner",
        progress: 20,
        nextActionDescription: "Tinjau dan setujui/tolak penawaran",
        transitions: {
          "approved": {
            targetStatus: "Pending DP Invoice",
            targetAssignedDivision: "General Admin",
            targetNextActionDescription: "Buat Faktur DP",
            targetProgress: 25,
            notification: {
              division: "General Admin",
              message: "Penawaran untuk proyek '{projectName}' telah disetujui. Mohon buat faktur DP."
            }
          },
          "rejected": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 20,
            notification: {
              division: "Admin Proyek",
              message: "Penawaran untuk proyek '{projectName}' ditolak oleh Owner."
            }
          }
        }
      },
      {
        stepName: "DP Invoice Submission",
        status: "Pending DP Invoice",
        assignedDivision: "General Admin",
        progress: 25,
        nextActionDescription: "Unggah Faktur DP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Approval", // Kembali ke Owner untuk persetujuan DP
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Setujui Faktur DP",
            targetProgress: 30,
            notification: {
              division: "Owner",
              message: "Faktur DP untuk proyek '{projectName}' telah diajukan dan menunggu persetujuan Anda."
            }
          }
        }
      },
      {
        stepName: "DP Invoice Approval",
        status: "Pending Approval", // Status ini digunakan lagi, tapi progres beda
        assignedDivision: "Owner",
        progress: 30, // Progres ini menandakan ini persetujuan DP
        nextActionDescription: "Tinjau dan setujui/tolak Faktur DP",
        transitions: {
          "approved": {
            targetStatus: "Pending Admin Files",
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Unggah Berkas Administrasi",
            targetProgress: 40,
            notification: {
              division: "Admin Proyek",
              message: "Faktur DP untuk proyek '{projectName}' telah disetujui. Mohon unggah berkas administrasi."
            }
          },
          "rejected": { // Jika DP ditolak, mungkin kembali ke General Admin untuk revisi
            targetStatus: "Pending DP Invoice",
            targetAssignedDivision: "General Admin",
            targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP",
            targetProgress: 25, // Kembali ke progres DP invoice
            notification: {
              division: "General Admin",
              message: "Faktur DP untuk proyek '{projectName}' ditolak oleh Owner. Mohon direvisi."
            }
          }
        }
      },
      {
        stepName: "Admin Files Submission",
        status: "Pending Admin Files",
        assignedDivision: "Admin Proyek",
        progress: 40,
        nextActionDescription: "Unggah Berkas Administrasi",
        transitions: {
          "submitted": {
            targetStatus: "Pending Architect Files",
            targetAssignedDivision: "Arsitek",
            targetNextActionDescription: "Unggah Berkas Arsitektur",
            targetProgress: 50,
            notification: {
              division: "Arsitek",
              message: "Berkas administrasi untuk '{projectName}' lengkap. Mohon unggah berkas arsitektur."
            }
          }
        }
      },
      {
        stepName: "Architect Files Submission",
        status: "Pending Architect Files",
        assignedDivision: "Arsitek",
        progress: 50,
        nextActionDescription: "Unggah Berkas Arsitektur",
        transitions: {
          "submitted": {
            targetStatus: "Pending Structure Files",
            targetAssignedDivision: "Struktur",
            targetNextActionDescription: "Unggah Berkas Struktur",
            targetProgress: 70,
            notification: {
              division: "Struktur",
              message: "Berkas arsitektur untuk '{projectName}' lengkap. Mohon unggah berkas struktur."
            }
          }
        }
      },
      {
        stepName: "Structure Files Submission",
        status: "Pending Structure Files",
        assignedDivision: "Struktur",
        progress: 70,
        nextActionDescription: "Unggah Berkas Struktur",
        transitions: {
          "submitted": {
            targetStatus: "Pending MEP Files",
            targetAssignedDivision: "MEP",
            targetNextActionDescription: "Unggah Berkas MEP",
            targetProgress: 80,
            notification: {
              division: "MEP",
              message: "Berkas struktur untuk '{projectName}' lengkap. Mohon unggah berkas MEP."
            }
          }
        }
      },
      {
        stepName: "MEP Files Submission",
        status: "Pending MEP Files",
        assignedDivision: "MEP",
        progress: 80,
        nextActionDescription: "Unggah Berkas MEP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Scheduling",
            targetAssignedDivision: "General Admin",
            targetNextActionDescription: "Jadwalkan Sidang",
            targetProgress: 90,
            notification: {
              division: "General Admin",
              message: "Semua berkas teknis untuk '{projectName}' lengkap. Mohon jadwalkan sidang."
            }
          }
        }
      },
      {
        stepName: "Sidang Scheduling",
        status: "Pending Scheduling",
        assignedDivision: "General Admin",
        progress: 90,
        nextActionDescription: "Jadwalkan Sidang",
        transitions: {
          "scheduled": { // Ini tindakan khusus, bukan "submitted" standar
            targetStatus: "Scheduled",
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Nyatakan Hasil Sidang",
            targetProgress: 95,
            notification: {
              division: "Owner",
              message: "Sidang untuk proyek '{projectName}' telah dijadwalkan. Mohon nyatakan hasilnya setelah selesai."
            }
          }
        }
      },
      {
        stepName: "Sidang Outcome Declaration",
        status: "Scheduled",
        assignedDivision: "Owner",
        progress: 95,
        nextActionDescription: "Nyatakan Hasil Sidang (Sukses/Revisi/Batal)",
        transitions: {
          "completed": {
            targetStatus: "Completed",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 100,
            notification: null
          },
          "revise_after_sidang": { // Contoh jika perlu revisi setelah sidang
            targetStatus: "Pending Final Check", // Atau status revisi lain
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Lakukan Revisi Pasca Sidang",
            targetProgress: 85, // Kembali ke progres sebelum sidang
            notification: {
              division: "Admin Proyek",
              message: "Proyek '{projectName}' memerlukan revisi setelah sidang."
            }
          },
          "canceled_after_sidang": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 95,
            notification: null
          }
        }
      },
      {
        stepName: "Project Completed",
        status: "Completed",
        assignedDivision: "",
        progress: 100,
        nextActionDescription: null,
        transitions: null // Terminal
      },
      {
        stepName: "Project Canceled",
        status: "Canceled",
        assignedDivision: "",
        progress: 0, // Atau progres terakhir saat dibatalkan
        nextActionDescription: null,
        transitions: null // Terminal
      }
];


const DEFAULT_WORKFLOW_ID = 'default_standard_workflow';
const DEFAULT_WORKFLOW_NAME = "Standard Project Workflow";
const DEFAULT_WORKFLOW_DESCRIPTION = "The standard, multi-stage project workflow.";


async function _readWorkflowsFromFile(): Promise<Workflow[]> {
  try {
    await fs.access(WORKFLOWS_DB_PATH);
    const data = await fs.readFile(WORKFLOWS_DB_PATH, 'utf8');
    if (data.trim() === "") {
      console.log("Workflows.json is empty. Returning empty array for initialization.");
      return [];
    }
    try {
        const workflows = JSON.parse(data) as Workflow[];
        console.log(`Successfully read ${workflows.length} workflows from file.`);
        return workflows;
    } catch (parseError) {
        console.error("Error parsing workflows.json, returning empty array. File might be corrupted.", parseError);
        return []; 
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log("Workflows.json not found. Returning empty array for initialization.");
      return []; 
    }
    console.error("Error reading workflows.json. Returning empty array.", error);
    return []; 
  }
}

async function writeWorkflows(workflows: Workflow[]): Promise<void> {
  try {
    await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify(workflows, null, 2), 'utf8');
    console.log(`Workflows data successfully written to: ${WORKFLOWS_DB_PATH}. Total: ${workflows.length}`);
  } catch (error) {
    console.error("Error writing workflows database:", WORKFLOWS_DB_PATH, error);
    throw new Error('Failed to save workflow data.');
  }
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  let workflows = await _readWorkflowsFromFile();
  let saveNeeded = false;

  const defaultWorkflowExists = workflows.some(wf => wf.id === DEFAULT_WORKFLOW_ID);

  if (!defaultWorkflowExists) {
    console.log(`Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) not found. Adding it with FULL structure.`);
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: DEFAULT_STANDARD_WORKFLOW_STRUCTURE, // Menggunakan struktur lengkap
    };
    workflows.unshift(defaultWorkflow); 
    saveNeeded = true;
  } else {
    // Optional: Ensure the default workflow in the file uses the latest FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE
    // This can be useful if you update the default structure in code later.
    const defaultWorkflowIndex = workflows.findIndex(wf => wf.id === DEFAULT_WORKFLOW_ID);
    if (defaultWorkflowIndex !== -1) {
        // For simplicity, we can just overwrite its steps. More complex merging could be done.
        // This ensures if a user manually edits the default workflow's steps in JSON, 
        // it will be 'corrected' to the code's definition of default on next load if you want that behavior.
        // Or, you might decide to let manual JSON edits persist. For now, let's assume code definition is master for the default.
        if (JSON.stringify(workflows[defaultWorkflowIndex].steps) !== JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)) {
            console.log(`Updating steps for existing default workflow (ID: ${DEFAULT_WORKFLOW_ID}) to match current code definition.`);
            workflows[defaultWorkflowIndex].steps = DEFAULT_STANDARD_WORKFLOW_STRUCTURE;
            saveNeeded = true;
        }
    }
  }


  if (saveNeeded) {
    try {
      await writeWorkflows(workflows);
      console.log("Workflows.json persisted after ensuring/updating default workflow.");
    } catch (writeError) {
      console.error("Failed to persist workflows.json after ensuring/updating default workflow:", writeError);
    }
  }
  return workflows;
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await getAllWorkflows(); // Ensures default is loaded if needed
  return workflows.find(wf => wf.id === id) || null;
}

export async function getFirstStep(workflowId: string): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (workflow && workflow.steps.length > 0) {
    return workflow.steps[0];
  }
  return null;
}

export async function getCurrentStepDetails(
  workflowId: string,
  currentStatus: string,
  currentProgress: number 
): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.warn(`Workflow with ID ${workflowId} not found when trying to get current step details.`);
    return null;
  }
  
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
  actionTaken: string = 'submitted' 
): Promise<WorkflowStepTransition | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.error(`Workflow with ID ${workflowId} not found.`);
    return null;
  }

  const currentStep = workflow.steps.find(step => step.status === currentStatus && step.progress === currentProgress);

  if (!currentStep) {
    console.error(`Current step for status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
    return null;
  }

  if (!currentStep.transitions) {
    console.log(`Step "${currentStep.stepName}" in workflow "${workflowId}" is a terminal step.`);
    return null; 
  }

  const transition = currentStep.transitions[actionTaken];
  if (!transition) {
    console.warn(`No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}) in workflow "${workflowId}". Trying 'default' or 'submitted'.`);
    const fallbackAction = currentStep.transitions['default'] ? 'default' : (currentStep.transitions['submitted'] ? 'submitted' : null);
    if (fallbackAction) {
      return currentStep.transitions[fallbackAction];
    }
    console.error(`No fallback ('default' or 'submitted') transition found for step "${currentStep.stepName}" in workflow "${workflowId}".`);
    return null;
  }
  return transition;
}

export async function addWorkflow(name: string, description: string): Promise<Workflow> {
  let workflows = await _readWorkflowsFromFile(); // Read without ensuring default first

  const newWorkflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newWorkflow: Workflow = {
    id: newWorkflowId,
    name,
    description: description || '',
    steps: DEFAULT_STANDARD_WORKFLOW_STRUCTURE, // New workflows get the full default structure as a template
  };

  workflows.push(newWorkflow);
  await writeWorkflows(workflows);
  console.log(`New workflow "${name}" added with ID ${newWorkflowId} using FULL default steps structure.`);
  return newWorkflow;
}

export async function updateWorkflow(workflowId: string, updatedWorkflowData: Partial<Omit<Workflow, 'id' | 'steps'>> & { steps?: WorkflowStep[] }): Promise<Workflow | null> {
  let workflows = await _readWorkflowsFromFile();
  const index = workflows.findIndex(wf => wf.id === workflowId);
  if (index === -1) {
    console.error(`Workflow with ID ${workflowId} not found for update.`);
    return null;
  }

  // Prevent changing ID of the default workflow to something else
  if (workflowId === DEFAULT_WORKFLOW_ID && updatedWorkflowData.id && updatedWorkflowData.id !== DEFAULT_WORKFLOW_ID) {
      console.warn(`Attempted to change ID of the default workflow. This is not allowed. ID will remain ${DEFAULT_WORKFLOW_ID}.`);
      delete updatedWorkflowData.id; 
  }
  
  // Prevent changing name of the default workflow if you want it fixed
  // For now, let's allow name and description changes for default as well.
  // if (workflowId === DEFAULT_WORKFLOW_ID && updatedWorkflowData.name && updatedWorkflowData.name !== DEFAULT_WORKFLOW_NAME) {
  //   console.warn(`Attempted to change name of the default workflow. Name will remain "${DEFAULT_WORKFLOW_NAME}".`);
  //   updatedWorkflowData.name = DEFAULT_WORKFLOW_NAME;
  // }


  workflows[index] = {
    ...workflows[index],
    name: updatedWorkflowData.name || workflows[index].name,
    description: typeof updatedWorkflowData.description === 'string' ? updatedWorkflowData.description : workflows[index].description, // Ensure description is handled if undefined
    steps: updatedWorkflowData.steps || workflows[index].steps
  };

  await writeWorkflows(workflows);
  console.log(`Workflow "${workflows[index].name}" (ID: ${workflowId}) updated.`);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  let workflows = await _readWorkflowsFromFile();
  const initialLength = workflows.length;

  if (workflowId === DEFAULT_WORKFLOW_ID && workflows.length <= 1) {
      console.warn(`Cannot delete the default workflow (ID: ${DEFAULT_WORKFLOW_ID}) as it's the only workflow remaining.`);
      throw new Error('CANNOT_DELETE_LAST_WORKFLOW');
  }

  workflows = workflows.filter(wf => wf.id !== workflowId);

  if (workflows.length === initialLength) {
      console.warn(`Workflow with ID ${workflowId} not found for deletion.`);
      // Don't throw an error if it's not found, just log it.
  } else {
    console.log(`Workflow with ID ${workflowId} deleted. Remaining workflows: ${workflows.length}`);
  }
  
  // Ensure default workflow is re-added if no workflows are left (should not happen if deletion of last default is prevented)
  // or if the deleted one was the default and others exist. This logic is now part of getAllWorkflows.
  await writeWorkflows(workflows);
}

export async function getAllUniqueStatuses(): Promise<string[]> {
    const workflows = await getAllWorkflows();
    const allStatuses = new Set<string>();
    workflows.forEach(wf => {
        wf.steps.forEach(step => {
            allStatuses.add(step.status);
        });
    });
    return Array.from(allStatuses);
}
