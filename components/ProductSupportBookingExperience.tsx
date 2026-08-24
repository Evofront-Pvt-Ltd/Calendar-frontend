"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clipboard, Clock, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import type { ClientBooking, ProductAvailableSlot, PublicProductBooking } from "@/types";

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

function supportWindowLabel(startTime: string, endTime: string) {
  if (startTime === endTime) {
    return "24/7 coverage";
  }
  if (endTime < startTime) {
    return `${startTime} - ${endTime} overnight`;
  }
  return `${startTime} - ${endTime}`;
}

export default function ProductSupportBookingExperience({ bookingToken }: { bookingToken: string }) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", []);
  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return toDateInput(date);
      }),
    []
  );

  const [product, setProduct] = useState<PublicProductBooking | null>(null);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [slots, setSlots] = useState<ProductAvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ProductAvailableSlot | null>(null);
  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_company: "",
    issue_category: "General",
    issue_title: "",
    issue_description: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    consent_confirmed: false
  });
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .publicProduct(bookingToken)
      .then(setProduct)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load product support page"))
      .finally(() => setLoading(false));
  }, [bookingToken]);

  useEffect(() => {
    setSlotLoading(true);
    setSelectedSlot(null);
    api
      .publicProductSlots(bookingToken, selectedDate)
      .then(setSlots)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load available times"))
      .finally(() => setSlotLoading(false));
  }, [bookingToken, selectedDate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Choose an available time first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api.bookProductSupport(bookingToken, {
        slot_key: selectedSlot.slot_key,
        client_name: form.client_name,
        client_email: form.client_email,
        client_company: form.client_company,
        issue_category: form.issue_category,
        issue_title: form.issue_title,
        issue_description: form.issue_description,
        priority: form.priority,
        client_timezone: timezone,
        consent_confirmed: form.consent_confirmed
      });
      setBooking(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to book this time");
    } finally {
      setSaving(false);
    }
  }

  async function copyConfirmationLink() {
    if (!booking?.confirmation_link) {
      return;
    }
    await navigator.clipboard.writeText(booking.confirmation_link);
    setNotice("Booking link copied");
  }

  async function copyMeetLink() {
    if (!booking?.google_meet_url) {
      return;
    }
    await navigator.clipboard.writeText(booking.google_meet_url);
    setNotice("Google Meet link copied");
  }

  if (loading) {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={28} />
        <span>Loading product support</span>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="center-state">
        <span>{error || "This product support link is not available"}</span>
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
          <p>{booking.issue_title}</p>
          <strong>
            {new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(
              new Date(booking.start_time_utc)
            )}
          </strong>
          <span>Reference: {booking.public_booking_reference}</span>
          {booking.google_meet_url ? (
            <div className="copy-field">
              <input aria-label="Google Meet link" readOnly value={booking.google_meet_url} />
              <button className="primary-action" onClick={copyMeetLink} type="button">
                <Clipboard size={18} />
                Copy Meet link
              </button>
            </div>
          ) : (
            booking.google_sync_status === "MEET_LINK_PENDING" && <p>Your Google Meet link is being prepared.</p>
          )}
          {!product.email_enabled && <p>Email delivery is not enabled yet. You can copy this booking link.</p>}
          <button className="primary-action" onClick={copyConfirmationLink} type="button">
            <Clipboard size={18} />
            Copy booking link
          </button>
          {notice && <span>{notice}</span>}
        </section>
      </main>
    );
  }

  return (
    <main className="booking-shell product-support-booking">
      <section className="booking-info">
        <div className="event-identity">
          <CalendarDays size={26} />
          <span>{product.product_name}</span>
        </div>
        <h1>{product.product_name} Support</h1>
        {product.description && <p>{product.description}</p>}
        <div className="event-facts">
          <span>
            <Clock size={17} />
            {product.appointment_duration_minutes} minutes
          </span>
          <span>
            <MapPin size={17} />
            {supportWindowLabel(product.support_start_time, product.support_end_time)} {product.timezone}
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
                  className={selectedSlot?.slot_key === slot.slot_key ? "slot-button active" : "slot-button"}
                  key={slot.slot_key}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                >
                  {slot.label}
                </button>
              ))}
              {slots.length === 0 && <p className="empty-copy">No product-support times are available on this date.</p>}
            </div>
          )}
        </div>

        <form className="invitee-form support-form" onSubmit={submit}>
          <h2>Your Details</h2>
          <label>
            Name
            <input
              value={form.client_name}
              onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.client_email}
              onChange={(event) => setForm((current) => ({ ...current, client_email: event.target.value }))}
              required
            />
          </label>
          <label>
            Company
            <input
              value={form.client_company}
              onChange={(event) => setForm((current) => ({ ...current, client_company: event.target.value }))}
            />
          </label>
          <label>
            Category
            <select
              value={form.issue_category}
              onChange={(event) => setForm((current) => ({ ...current, issue_category: event.target.value }))}
            >
              <option>General</option>
              <option>Technical</option>
              <option>Billing</option>
              <option>Setup</option>
              <option>Product question</option>
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as "low" | "normal" | "high" | "urgent"
                }))
              }
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            Issue title
            <input
              value={form.issue_title}
              onChange={(event) => setForm((current) => ({ ...current, issue_title: event.target.value }))}
              required
            />
          </label>
          <label className="wide-field">
            Description
            <textarea
              value={form.issue_description}
              onChange={(event) => setForm((current) => ({ ...current, issue_description: event.target.value }))}
            />
          </label>
          <label className="toggle-label wide-field">
            <input
              checked={form.consent_confirmed}
              onChange={(event) => setForm((current) => ({ ...current, consent_confirmed: event.target.checked }))}
              type="checkbox"
              required
            />
            <span>I confirm these details can be used to schedule this product-support booking.</span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action wide-field" disabled={!selectedSlot || saving} type="submit">
            {saving ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
            Confirm booking
          </button>
        </form>
      </section>
    </main>
  );
}
