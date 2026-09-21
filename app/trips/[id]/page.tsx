"use client";

import { useParams } from "next/navigation";
import { TripScreen } from "@/components/trips/TripScreen";

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  return <TripScreen key={id} id={id} />;
}
