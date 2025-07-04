// src/app/api/projects/update/route.ts
import { NextResponse } from 'next/server';
import { 
    updateProject, 
    reviseProject, 
    markParallelUploadsAsCompleteByDivision,
    updateProjectTitle,
    manuallyUpdateProjectStatusAndAssignment
} from '@/services/project-service';
import type { UpdateProjectParams } from '@/types/project-types';

interface SpecialActionBody extends UpdateProjectParams {
    specialAction?: 'revise' | 'markDivisionComplete' | 'manualUpdate' | 'updateTitle';
    newStatus?: string;
    newAssignedDivision?: string;
    newNextAction?: string | null;
    newProgress?: number;
    adminUsername?: string;
    reasonNote?: string;
    title?: string;
}


export async function POST(request: Request) {
  try {
    const body: SpecialActionBody = await request.json();
    
    let updatedProject;

    switch (body.specialAction) {
        case 'revise':
            updatedProject = await reviseProject(
                body.projectId,
                body.updaterUsername,
                body.updaterRole,
                body.note,
                body.actionTaken
            );
            break;
        case 'markDivisionComplete':
            updatedProject = await markParallelUploadsAsCompleteByDivision(
                body.projectId,
                body.updaterRole,
                body.updaterUsername
            );
            break;
        case 'manualUpdate':
             if (!body.newStatus || !body.adminUsername || !body.reasonNote || typeof body.newProgress === 'undefined') {
                return NextResponse.json({ message: 'Missing required fields for manual update.' }, { status: 400 });
            }
            updatedProject = await manuallyUpdateProjectStatusAndAssignment({
                projectId: body.projectId,
                newStatus: body.newStatus,
                newAssignedDivision: body.newAssignedDivision || '',
                newNextAction: body.newNextAction || null,
                newProgress: body.newProgress,
                adminUsername: body.adminUsername,
                reasonNote: body.reasonNote,
            });
            break;
        case 'updateTitle':
             if (!body.title || !body.updaterUsername) {
                 return NextResponse.json({ message: 'Missing title for update.' }, { status: 400 });
             }
             await updateProjectTitle(body.projectId, body.title, body.updaterUsername);
             updatedProject = await updateProject(body); // a bit redundant, but gets the updated project
             break;
        default:
            updatedProject = await updateProject(body);
            break;
    }


    if (!updatedProject) {
        return NextResponse.json({ message: 'Failed to update project or project not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedProject);

  } catch (error: any) {
    console.error('[API/Projects/Update] Error:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.message.includes('REVISION_NOT_SUPPORTED')) {
        errorMessage = 'Revision is not supported for the current project step.';
    } else if (error.message.includes('PROJECT_NOT_FOUND')) {
        errorMessage = 'Project not found.';
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
