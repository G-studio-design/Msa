// src/app/api/projects/update/route.ts
import { NextResponse } from 'next/server';
import { updateProject, reviseProject, markParallelUploadsAsCompleteByDivision } from '@/services/project-service';
import type { UpdateProjectParams } from '@/types/project-types';

export async function POST(request: Request) {
  try {
    const body: UpdateProjectParams & { specialAction?: 'revise' | 'markDivisionComplete' } = await request.json();
    
    let updatedProject;

    if (body.specialAction === 'revise') {
        updatedProject = await reviseProject(
            body.projectId,
            body.updaterUsername,
            body.updaterRole,
            body.note,
            body.actionTaken
        );
    } else if (body.specialAction === 'markDivisionComplete') {
        updatedProject = await markParallelUploadsAsCompleteByDivision(
            body.projectId,
            body.updaterRole,
            body.updaterUsername
        );
    } else {
        updatedProject = await updateProject(body);
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
