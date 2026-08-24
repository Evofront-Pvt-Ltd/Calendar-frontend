"use client";

import { use } from "react";
import ProductSupportBookingExperience from "@/components/ProductSupportBookingExperience";

export default function ProductSupportPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  return <ProductSupportBookingExperience bookingToken={resolvedParams.token} />;
}
