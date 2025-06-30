
import { ImageResponse } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A237E', // Corrected from 'background'
          color: 'white',
          fontSize: 20,
          fontWeight: 'bold',
          borderRadius: '4px',
        }}
      >
        M
      </div>
    ),
    {
      ...size,
    }
  )
}
