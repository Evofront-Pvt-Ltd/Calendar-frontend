"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarCheck, Clock3, Loader2, MapPin, Video } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicMeetingInvitation } from "@/types";

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<PublicMeetingInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .publicInvitation(params.token)
      .then(setInvitation)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load invitation"))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={28} />
        <span>Loading invitation</span>
      </main>
    );
  }

  if (!invitation) {
    return (
      <main className="center-state">
        <span>{error || "Invitation not found"}</span>
      </main>
    );
  }

  return (
    <main className="booking-shell invite-shell">
      <section className="booking-info">
        <span className="event-identity" style={{ borderColor: "#006bff" }}>
          <CalendarCheck size={18} />
          {invitation.product_name}
        </span>
        <h1>{invitation.meeting_title}</h1>
        <p>{invitation.description || "You have been invited to this product meeting."}</p>
        <div className="event-facts">
          <span>
            <Clock3 size={18} />
            {formatInvitationTime(invitation.start_time)} to {formatInvitationTime(invitation.end_time)}
          </span>
          <span>
            <MapPin size={18} />
            {invitation.location || invitation.timezone}
          </span>
          <span>
            <Video size={18} />
            {invitation.meeting_url ? "Virtual meeting link available" : "No virtual link added"}
          </span>
        </div>
      </section>

      <section className="booking-panel invite-panel">
        <div>
          <h2>Invitation status</h2>
          <p>{invitation.recipient_email}</p>
        </div>
        <span className="delivery-status">{invitation.email_delivery_status}</span>
        <span className="status-pill scheduled">{invitation.invitation_status}</span>
        {invitation.meeting_url && (
          <a className="blue-action full" href={invitation.meeting_url} rel="noreferrer" target="_blank">
            Join meeting
          </a>
        )}
      </section>
    </main>
  );
}

function formatInvitationTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
