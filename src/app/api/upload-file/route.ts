// src/app/api/upload-file/route.ts
'use server';
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeForPath } from '@/lib/path-utils'; 
import { getAllUsers } from '@/services/data-access/user-data';

// This route is now primarily for single-file uploads outside the project creation flow.
// For project creation, file handling is integrated into POST /api/projects.
const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');
  
  try {
    await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const userId = formData.get('userId') as string | null;
    
    if (!file || !projectId || !userId) {
      return NextResponse.json({ message: 'Project ID, User ID and file are required.' }, { status: 400 });
    }
    
    const users = await getAllUsers();
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 });
    }

    const projectSpecificDirRelative = projectId;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    await fs.mkdir(projectSpecificDirAbsolute, { recursive: true });
    
    const originalFilename = file.name;
    const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`;

    const relativeFilePath = path.join(projectSpecificDirRelative, safeFilenameForPath);
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(absoluteFilePath, buffer);

    console.log(`[API Upload] File uploaded successfully to: ${absoluteFilePath}`);
    return NextResponse.json({ 
      message: 'File uploaded successfully.', 
      relativePath: relativeFilePath.replace(/\\/g, '/'), // Ensure forward slashes for consistency
      originalName: originalFilename,
    }, { status: 200 });

  } catch (error) {
    console.error('[API Upload] Unhandled error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}
