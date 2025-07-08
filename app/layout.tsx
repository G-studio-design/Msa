
// This file is a bridge to the actual layout in app/src/app
// It is required because of the non-standard project structure.
import RootLayout, { metadata } from '@/app/layout';
import './globals.css';

export { metadata };

// We just re-export the default layout from the correct location.
export default RootLayout;
