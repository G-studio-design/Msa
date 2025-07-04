// src/app/api/upload-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeForPath } from '@/lib/path-utils'; 
import { getAllUsers } from '@/services/data-access/user-data';

// Define the allowed roles for file upload
const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  // Define base directory safely within the handler
  const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');
  
  try {
    // Ensure the base directory for all project files exists
    await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const userId = formData.get('userId') as string | null;
    
    if (!file || !projectId || !userId) {
      return NextResponse.json({ message: 'Project ID, User ID and file are required.' }, { status: 400 });
    }
    
    // --- Role Check ---
    const users = await getAllUsers();
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 });
    }
    // --- End Role Check ---

    // The directory name is now ONLY the project ID for robustness.
    const projectSpecificDirRelative = projectId;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    // Ensure the project-specific directory exists
    await fs.mkdir(projectSpecificDirAbsolute, { recursive: true });
    
    const originalFilename = file.name;
    const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`;

    // The relative path is now simpler and more robust
    const relativeFilePath = path.join(projectSpecificDirRelative, safeFilenameForPath);
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);

    // Convert ArrayBuffer to Buffer and write file
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
