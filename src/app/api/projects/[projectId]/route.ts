// src/app/api/projects/[projectId]/route.ts
'use server';

import { NextResponse } from 'next/server';
import { deleteProject, getProjectById } from '@/services/project-service';
import { findUserById } from '@/services/user-service';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required.' }, { status: 400 });
    }
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error: any) {
    console.error(`[API/Projects GET] Error fetching project ${params.projectId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch project.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const { deleterUserId } = await request.json();

    if (!projectId || !deleterUserId) {
      return NextResponse.json({ message: 'Project ID and Deleter User ID are required.' }, { status: 400 });
    }
    
    const deleter = await findUserById(deleterUserId);
    if (!deleter) {
      return NextResponse.json({ message: 'Deleter user not found.' }, { status: 404 });
    }
     if (!['Owner', 'Akuntan', 'Admin Developer'].includes(deleter.role.trim())) {
       return NextResponse.json({ message: "You do not have permission to delete projects." }, { status: 403 });
     }
    
    const deletedProjectTitle = await deleteProject(projectId, deleter.username);
    return NextResponse.json({ message: `Project "${deletedProjectTitle}" deleted successfully.` });

  } catch (error: any) {
    console.error(`[API/Projects DELETE] Error deleting project ${params.projectId}:`, error);
    let errorMessage = 'Failed to delete project.';
    let statusCode = 500;
    if (error instanceof Error && error.message.includes('NOT_FOUND')) {
        errorMessage = 'Project not found.';
        statusCode = 404;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
