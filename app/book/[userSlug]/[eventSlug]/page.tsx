"use client";

import { useParams } from "next/navigation";
import BookingExperience from "@/components/BookingExperience";

export default function BookingPage() {
  const params = useParams<{ userSlug: string; eventSlug: string }>();
  return <BookingExperience userSlug={params.userSlug} eventSlug={params.eventSlug} />;
}

