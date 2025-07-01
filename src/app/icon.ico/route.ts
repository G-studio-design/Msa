
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// This route handler forces the browser to use the correct logo as the favicon,
// bypassing aggressive caching issues with traditional favicon methods.
export async function GET() {
  try {
    // Construct the absolute path to the logo in the public directory
    const imagePath = path.join(process.cwd(), 'public', 'msarch-logo.png');
    
    // Read the image file from the filesystem
    const imageBuffer = await fs.readFile(imagePath);

    // Return the image as a response with the correct content type and cache control headers.
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Tell browsers not to cache this route aggressively
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Error serving favicon (icon.ico/route.ts):", error);
    // If the file is not found or another error occurs, return a 404 response.
    return new NextResponse('Icon not found', { status: 404 });
  }
}
