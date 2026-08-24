"use client";

import { useParams } from "next/navigation";
import PublicProfile from "@/components/PublicProfile";

export default function PublicProfilePage() {
  const params = useParams<{ userSlug: string }>();
  return <PublicProfile userSlug={params.userSlug} />;
}

