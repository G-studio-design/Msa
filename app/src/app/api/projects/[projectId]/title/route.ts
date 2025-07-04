// src/app/api/projects/[projectId]/title/route.ts
import { NextResponse } from 'next/server';
import { updateProjectTitle } from '@/services/project-service';

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await request.json();
    const { title } = body;

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required.' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ message: 'New title is required.' }, { status: 400 });
    }

    await updateProjectTitle(projectId, title);
    return NextResponse.json({ message: 'Project title updated successfully.' });

  } catch (error: any) {
    console.error(`[API/Projects/Title] Error updating title for project ${params.projectId}:`, error);
    let errorMessage = 'Failed to update project title.';
    if (error.message === 'PROJECT_NOT_FOUND') {
      errorMessage = 'Project not found.';
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
