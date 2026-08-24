"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { EventType } from "@/types";

type Profile = {
  user: { name: string; slug: string; timezone: string };
  event_types: EventType[];
};

export default function PublicProfile({ userSlug }: { userSlug: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .publicProfile(userSlug)
      .then(setProfile)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load scheduling profile"))
      .finally(() => setLoading(false));
  }, [userSlug]);

  if (loading) {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={28} />
        <span>Loading scheduling profile</span>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="center-state">
        <span>{error || "This scheduling profile is not available"}</span>
      </main>
    );
  }

  return (
    <main className="profile-shell">
      <section className="profile-heading">
        <CalendarDays size={30} />
        <div>
          <span className="eyebrow">Book time with</span>
          <h1>{profile.user.name}</h1>
          <p>{profile.user.timezone}</p>
        </div>
      </section>

      <section className="profile-event-list">
        {profile.event_types.map((eventType) => (
          <a className="profile-event" href={eventType.public_path} key={eventType.id}>
            <span className="event-color" style={{ background: eventType.color }} />
            <div>
              <strong>{eventType.title}</strong>
              {eventType.description && <p>{eventType.description}</p>}
              <small>
                <Clock size={15} />
                {eventType.duration_minutes} minutes
              </small>
            </div>
          </a>
        ))}
        {profile.event_types.length === 0 && <p className="empty-copy">No active scheduling links are available.</p>}
      </section>
    </main>
  );
}

