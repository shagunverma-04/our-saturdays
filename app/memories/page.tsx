"use client";

import { EmptyState, ScreenHeader } from "@/components/ui/bits";

export default function MemoriesPage() {
  return (
    <main>
      <ScreenHeader title="memories" subtitle="the photo wall of us" />
      <EmptyState emoji="📸" title="we haven't made enough memories yet." body="the photo journal is coming next. go do something worth remembering." />
    </main>
  );
}
