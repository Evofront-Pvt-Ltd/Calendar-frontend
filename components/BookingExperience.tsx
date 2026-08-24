"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import type { Booking, EventType, Slot } from "@/types";

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}

function locationText(eventType: EventType) {
  if (eventType.location_detail) {
    return eventType.location_detail;
  }
  return {
    video: "Video meeting",
    phone: "Phone call",
    in_person: "In-person meeting",
    custom: "Meeting details shared after booking"
  }[eventType.location_type];
}

export default function BookingExperience({ userSlug, eventSlug }: { userSlug: string; eventSlug: string }) {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    []
  );
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return toDateInput(date);
      }),
    []
  );

  const [eventType, setEventType] = useState<EventType | null>(null);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    invitee_name: "",
    invitee_email: "",
    invitee_message: ""
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .publicEvent(userSlug, eventSlug)
      .then(setEventType)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load event"))
      .finally(() => setLoading(false));
  }, [eventSlug, userSlug]);

  useEffect(() => {
    setSlotLoading(true);
    setSelectedSlot(null);
    api
      .slots(userSlug, eventSlug, selectedDate)
      .then(setSlots)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load slots"))
      .finally(() => setSlotLoading(false));
  }, [eventSlug, selectedDate, userSlug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Choose a time first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api.book(userSlug, eventSlug, {
        start_utc: selectedSlot.start_utc,
        invitee_name: form.invitee_name,
        invitee_email: form.invitee_email,
        invitee_timezone: timezone,
        invitee_message: form.invitee_message,
        answers
      });
      setBooking(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to book this time");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={28} />
        <span>Loading scheduling page</span>
      </main>
    );
  }

  if (!eventType) {
    return (
      <main className="center-state">
        <span>{error || "This scheduling link is not available"}</span>
      </main>
    );
  }

  if (booking) {
    return (
      <main className="booking-shell">
        <section className="confirmation-panel">
          <div className="success-mark">
            <Check size={30} />
          </div>
          <h1>Booking confirmed</h1>
          <p>{booking.event_title}</p>
          <strong>{new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date(booking.start_utc))}</strong>
          <span>Confirmation code: {booking.booking_code}</span>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-shell">
      <section className="booking-info">
        <div className="event-identity" style={{ borderColor: eventType.color }}>
          <CalendarDays size={26} />
          <span>{eventType.owner_slug}</span>
        </div>
        <h1>{eventType.title}</h1>
        {eventType.description && <p>{eventType.description}</p>}
        <div className="event-facts">
          <span>
            <Clock size={17} />
            {eventType.duration_minutes} minutes
          </span>
          <span>
            <MapPin size={17} />
            {locationText(eventType)}
          </span>
        </div>
      </section>

      <section className="booking-panel">
        <div>
          <h2>Select a Date</h2>
          <div className="date-strip">
            {dates.map((date) => (
              <button
                className={selectedDate === date ? "date-button active" : "date-button"}
                key={date}
                onClick={() => setSelectedDate(date)}
                type="button"
              >
                {friendlyDay(date)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2>Select a Time</h2>
          {slotLoading ? (
            <div className="slot-loading">
              <Loader2 className="spin" size={20} />
              Loading times
            </div>
          ) : (
            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  className={selectedSlot?.start_utc === slot.start_utc ? "slot-button active" : "slot-button"}
                  key={slot.start_utc}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                >
                  {slot.label}
                </button>
              ))}
              {slots.length === 0 && <p className="empty-copy">No times are available on this date.</p>}
            </div>
          )}
        </div>

        <form className="invitee-form" onSubmit={submit}>
          <h2>Your Details</h2>
          <label>
            Name
            <input
              value={form.invitee_name}
              onChange={(event) => setForm((current) => ({ ...current, invitee_name: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.invitee_email}
              onChange={(event) => setForm((current) => ({ ...current, invitee_email: event.target.value }))}
              required
            />
          </label>
          {eventType.questions.map((question) => (
            <label key={question.label}>
              {question.label}
              <input
                onChange={(event) => setAnswers((current) => ({ ...current, [question.label]: event.target.value }))}
                required={question.required}
                value={answers[question.label] || ""}
              />
            </label>
          ))}
          <label>
            Message
            <textarea
              value={form.invitee_message}
              onChange={(event) => setForm((current) => ({ ...current, invitee_message: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action" disabled={!selectedSlot || saving} type="submit">
            {saving ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
            Confirm booking
          </button>
        </form>
      </section>
    </main>
  );
}
