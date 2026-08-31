"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";

export default function MemberVerifyPage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    status: string;
    email: string;
    product_name: string;
    has_login: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    api
      .verifyMemberPublic(params.token)
      .then(setResult)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to verify work email"))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card">
          <Loader2 className="spin" size={28} />
          <h1>Verifying work email</h1>
          <p>Confirming this address…</p>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card">
          <Mail size={28} />
          <h1>Verification failed</h1>
          <p>{error || "This verification link is invalid or expired."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-action-shell">
      <section className="public-action-card">
        <Check size={28} />
        <h1>Work email verified</h1>
        <p>
          <strong>{result.email}</strong>
          {result.product_name ? ` · ${result.product_name}` : ""}
        </p>
        <p>{result.message}</p>
        <p>
          {result.has_login
            ? "Booking alerts will appear on your dashboard and in your inbox."
            : "You do not need an account. Booking alerts arrive by email, and you can accept a request straight from the email."}
        </p>
      </section>
    </main>
  );
}
