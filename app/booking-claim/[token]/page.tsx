"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type ClaimPreview = {
  token: string;
  status: string;
  booking_status: string;
  product_name: string;
  client_name: string;
  issue_title: string;
  issue_category: string;
  priority: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  can_accept: boolean;
};

export default function BookingClaimPage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ClaimPreview | null>(null);

  useEffect(() => {
    api
      .bookingClaimPreview(params.token)
      .then(setPreview)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load claim"))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function acceptClaim() {
    setSaving(true);
    setError("");
    try {
      await api.acceptBookingClaimPublic(params.token);
      setNotice("Request accepted. Meeting invite has been sent to you and the client.");
      setPreview((current) => (current ? { ...current, can_accept: false, status: "claimed", booking_status: "scheduled" } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to accept this request");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card">
          <Loader2 className="spin" size={28} />
          <h1>Loading request</h1>
        </section>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card">
          <h1>Claim unavailable</h1>
          <p>{error || "This claim link is invalid or expired."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-action-shell">
      <section className="public-action-card">
        <CalendarCheck size={28} />
        <h1>{preview.product_name}</h1>
        <p>
          <strong>{preview.issue_title}</strong>
        </p>
        <p>
          Client: {preview.client_name} · {preview.priority} · {preview.issue_category}
        </p>
        <p>
          {preview.start_time
            ? new Date(preview.start_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
            : "Time pending"}
          {preview.timezone ? ` (${preview.timezone})` : ""}
        </p>
        {error && <p className="inline-warning">{error}</p>}
        {notice && <p>{notice}</p>}
        {preview.can_accept ? (
          <button className="blue-action" disabled={saving} onClick={acceptClaim} type="button">
            {saving ? <Loader2 className="spin" size={18} /> : null}
            Accept this request
          </button>
        ) : (
          <p>This request is no longer open for claim.</p>
        )}
      </section>
    </main>
  );
}
