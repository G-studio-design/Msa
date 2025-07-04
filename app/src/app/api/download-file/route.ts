// src/app/api/download-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as fsSync from 'fs'; // For existsSync
import * as path from 'path';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Define base directory safely within the handler
  const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');

  const searchParams = request.nextUrl.searchParams;
  const filePathParam = searchParams.get('filePath');

  if (!filePathParam) {
    return NextResponse.json({ message: 'File path is required.' }, { status: 400 });
  }

  try {
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, filePathParam);

    if (!absoluteFilePath.startsWith(PROJECT_FILES_BASE_DIR)) {
        console.error(`Attempt to access file outside base directory: ${filePathParam}`);
        return NextResponse.json({ message: 'Invalid file path.' }, { status: 403 });
    }
    
    try {
        await fs.access(absoluteFilePath, fsSync.constants.F_OK);
    } catch (accessError) {
        console.error(`File not found at path: ${absoluteFilePath}`);
        return NextResponse.json({ message: 'File not found.' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(absoluteFilePath);
    const filename = path.basename(absoluteFilePath);

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);
    headers.append('Content-Type', 'application/octet-stream'); 

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error) {
    console.error('File download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file download.';
    return NextResponse.json({ message: `File download failed: ${errorMessage}` }, { status: 500 });
  }
}
