// src/app/dashboard/settings/page.tsx
import SettingsPageClient from '@/components/dashboard/SettingsPageClient';

// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function SettingsPage() {
  return <SettingsPageClient />;
}
