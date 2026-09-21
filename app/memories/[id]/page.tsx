"use client";

import { useParams } from "next/navigation";
import { MemoriesScreen } from "@/components/memories/MemoriesScreen";

// /memories/<id> opens the swipe view at that memory (links from the feed, Home, and a find all land here)
export default function MemoryPage() {
  const { id } = useParams<{ id: string }>();
  return <MemoriesScreen key={id} startId={id} />;
}
