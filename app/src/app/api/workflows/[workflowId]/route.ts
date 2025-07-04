// src/app/api/workflows/[workflowId]/route.ts
import { NextResponse } from 'next/server';
import { getWorkflowById, updateWorkflow, deleteWorkflow } from '@/services/workflow-service';
import type { Workflow } from '@/types/workflow-types';

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const workflow = await getWorkflowById(params.workflowId);
    if (!workflow) {
      return NextResponse.json({ message: 'Workflow not found.' }, { status: 404 });
    }
    return NextResponse.json(workflow);
  } catch (error: any) {
    console.error(`[API/Workflows GET] Error fetching workflow ${params.workflowId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch workflow.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const updatedData = await request.json() as Partial<Omit<Workflow, 'id'>>;
    const updatedWorkflow = await updateWorkflow(params.workflowId, updatedData);
     if (!updatedWorkflow) {
      return NextResponse.json({ message: 'Workflow not found.' }, { status: 404 });
    }
    return NextResponse.json(updatedWorkflow);
  } catch (error: any) {
    console.error(`[API/Workflows PUT] Error updating workflow ${params.workflowId}:`, error);
    return NextResponse.json({ message: error.message || 'Failed to update workflow.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    await deleteWorkflow(params.workflowId);
    return NextResponse.json({ message: 'Workflow deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error(`[API/Workflows DELETE] Error deleting workflow ${params.workflowId}:`, error);
    const errorMessage = (error instanceof Error && error.message.includes('CANNOT_DELETE')) 
        ? "This workflow cannot be deleted." 
        : 'Failed to delete workflow.';
    const statusCode = (error instanceof Error && error.message.includes('CANNOT_DELETE')) ? 403 : 500;
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
