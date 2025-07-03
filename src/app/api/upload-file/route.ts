
// src/app/api/upload-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ensureProjectFilesBaseDirExists } from '@/services/project-service'; 
import { sanitizeForPath } from '@/lib/path-utils'; 
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';
import { getAllUsers } from '@/services/data-access/user-data';

const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await ensureProjectFilesBaseDirExists();

    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const projectTitle = formData.get('projectTitle') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !projectId || !projectTitle || !userId) {
      return NextResponse.json({ message: 'Project ID, title, user ID, and file are required.' }, { status: 400 });
    }
    
    const users = await getAllUsers();
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 });
    }

    const projectTitleSanitized = sanitizeForPath(projectTitle);
    const projectSpecificDirRelative = `${projectId}-${projectTitleSanitized}`;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    await fs.mkdir(projectSpecificDirAbsolute, { recursive: true });
    
    const originalFilename = file.name;
    const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`;
    const relativeFilePath = `${projectSpecificDirRelative}/${safeFilenameForPath}`;
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(absoluteFilePath, buffer);

    return NextResponse.json({ 
      message: 'File uploaded successfully.', 
      relativePath: relativeFilePath, 
      originalName: originalFilename,
    }, { status: 200 });

  } catch (error) {
    console.error('[API Upload] Unhandled error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}
