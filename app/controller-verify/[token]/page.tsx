"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";

export default function ControllerVerifyPage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: string; email: string; message: string } | null>(null);

  useEffect(() => {
    api
      .verifyControllerPublic(params.token)
      .then((payload) => setResult(payload))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to verify mailbox"))
      .finally(() => setLoading(false));
  }, [params.token]);

  return (
    <main className="public-action-shell">
      <section className="public-action-card">
        {loading ? (
          <>
            <Loader2 className="spin" size={28} />
            <h1>Verifying mailbox</h1>
            <p>Confirming this controller email…</p>
          </>
        ) : error ? (
          <>
            <Mail size={28} />
            <h1>Verification failed</h1>
            <p>{error}</p>
          </>
        ) : (
          <>
            <Check size={28} />
            <h1>Mailbox verified</h1>
            <p>
              <strong>{result?.email}</strong>
            </p>
            <p>{result?.message}</p>
          </>
        )}
      </section>
    </main>
  );
}
