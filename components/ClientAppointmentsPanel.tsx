"use client";

import {
  CalendarCheck,
  Check,
  Clock3,
  ExternalLink,
  History,
  Loader2,
  Mail,
  UserCheck,
  Video,
  X
} from "lucide-react";
import type { ClientBooking, Product, ProductMemberAvailabilitySummary, TeamAvailability, User } from "@/types";

type ClientAppointmentsPanelProps = {
  canManageBooking: boolean;
  productInactive: boolean;
  selectedProduct: Product;
  saving: string;
  teamAvailability: TeamAvailability | null;
  user: User;
  onApprove: (booking: ClientBooking) => void;
  onAssign: (booking: ClientBooking, memberId: string) => void;
  onCancel: (booking: ClientBooking) => void;
  onReject: (booking: ClientBooking) => void;
};

export default function ClientAppointmentsPanel({
  canManageBooking,
  productInactive,
  selectedProduct,
  saving,
  teamAvailability,
  user,
  onApprove,
  onAssign,
  onCancel,
  onReject
}: ClientAppointmentsPanelProps) {
  const bookings = teamAvailability?.bookings || [];
  const members = teamAvailability?.members || [];
  const pendingCount = bookings.filter((booking) => booking.status === "pending_approval").length;
  const scheduledCount = bookings.filter((booking) => booking.status === "scheduled").length;

  return (
    <section className="panel client-appointments-panel" aria-labelledby="client-appointments-title">
      <div className="panel-heading appointments-heading">
        <div>
          <h2 id="client-appointments-title">Client appointments</h2>
          <p>Website booking requests for this workspace. Pending approvals stay visible even if you change the availability date. Approve with this product’s team only.</p>
        </div>
        <div className="appointment-counts" aria-label="Client appointment summary">
          <span>{pendingCount} pending</span>
          <span>{scheduledCount} scheduled</span>
        </div>
      </div>

      {!teamAvailability ? (
        <div className="appointments-loading">
          <Loader2 className="spin" size={18} />
          <span>Loading client appointments</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="appointments-empty">
          <CalendarCheck size={22} />
          <div>
            <strong>No client appointments yet</strong>
            <p>Bookings from the embedded Book Now widget for {selectedProduct.name} will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="client-appointment-board">
          {bookings.map((booking) => (
            <AppointmentCard
              booking={booking}
              canManageBooking={canManageBooking}
              key={booking.id}
              members={members}
              productInactive={productInactive}
              saving={saving}
              teamAvailability={teamAvailability}
              user={user}
              onApprove={onApprove}
              onAssign={onAssign}
              onCancel={onCancel}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AppointmentCard({
  booking,
  canManageBooking,
  members,
  productInactive,
  saving,
  teamAvailability,
  user,
  onApprove,
  onAssign,
  onCancel,
  onReject
}: {
  booking: ClientBooking;
  canManageBooking: boolean;
  members: ProductMemberAvailabilitySummary[];
  productInactive: boolean;
  saving: string;
  teamAvailability: TeamAvailability;
  user: User;
  onApprove: (booking: ClientBooking) => void;
  onAssign: (booking: ClientBooking, memberId: string) => void;
  onCancel: (booking: ClientBooking) => void;
  onReject: (booking: ClientBooking) => void;
}) {
  const notifications = teamAvailability.notifications.filter((item) => item.booking_id === booking.id);
  const history = (teamAvailability.assignment_history || []).filter((item) => item.booking_id === booking.id);
  const latestHistory = history[0];
  const canCancel =
    !productInactive &&
    booking.status !== "cancelled" &&
    booking.status !== "rejected" &&
    (canManageBooking || booking.assigned_member_id === user.id);

  return (
    <article className={`client-appointment-card ${booking.status}`}>
      <div className="appointment-card-top">
        <div className="appointment-title-block">
          <strong>{booking.issue_title}</strong>
          <span>
            {booking.client_name} - {booking.priority}
          </span>
        </div>
        <span className={`status-pill ${booking.status}`}>{statusLabel(booking.status)}</span>
      </div>

      <div className="appointment-detail-grid">
        <Detail label="When" value={`${formatDateTime(booking.start_time_utc)} - ${formatTime(booking.end_time_utc)}`} />
        <Detail label="Website origin" value={booking.source_domain || "Not captured"} />
        <Detail label="Client email" value={booking.client_email} />
        <Detail label="Company" value={booking.client_company || "Not provided"} />
        <Detail label="Reference" value={booking.product_reference_number || booking.public_booking_reference} />
        <Detail label="Category" value={booking.issue_category} />
        <Detail label="Timezone" value={booking.client_timezone} />
      </div>

      {booking.issue_description && (
        <p className="appointment-description">
          <strong>Reason:</strong> {booking.issue_description}
        </p>
      )}

      <div className="appointment-ops-grid">
        {canManageBooking ? (
          <label className="booking-assignee-select">
            Assign
            <select
              disabled={productInactive || saving === `assign:${booking.id}` || booking.status !== "pending_approval"}
              value={booking.assigned_member_id}
              onChange={(event) => onAssign(booking, event.target.value)}
            >
              {members
                .filter((member) => member.included_in_rotation)
                .map((member) => (
                  <option key={member.member_id} value={member.member_id}>
                    {member.full_name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <div className="appointment-mini-stat">
            <UserCheck size={15} />
            <span>{booking.assigned_member_name || "Assigned member"}</span>
          </div>
        )}

        <div className="appointment-mini-stat">
          <Mail size={15} />
          <span>{notificationSummary(notifications)}</span>
        </div>

        <div className="appointment-mini-stat">
          <Video size={15} />
          <span>{booking.google_sync_status || "DISABLED"}</span>
        </div>

        {booking.google_meet_url ? (
          <a className="outline-action compact appointment-link-action" href={booking.google_meet_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Meet link
          </a>
        ) : (
          <span className="appointment-link-muted">No Meet link yet</span>
        )}
      </div>

      <div className="appointment-history">
        <History size={15} />
        <span>
          {latestHistory
            ? `${latestHistory.reason || "Assignment updated"} - ${formatDateTime(latestHistory.changed_at)}`
            : `Created - ${formatDateTime(booking.created_at)}`}
        </span>
      </div>

      <div className="appointment-actions">
        {canManageBooking && booking.status === "pending_approval" && (
          <>
            <button
              className="outline-action compact"
              disabled={productInactive || saving === `reject:${booking.id}`}
              onClick={() => onReject(booking)}
              type="button"
            >
              Reject
            </button>
            <button
              className="blue-action compact"
              disabled={productInactive || saving === `approve:${booking.id}`}
              onClick={() => onApprove(booking)}
              type="button"
            >
              {saving === `approve:${booking.id}` ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
              Approve
            </button>
          </>
        )}
        <button className="outline-action compact" disabled={!canCancel || saving === booking.id} onClick={() => onCancel(booking)} type="button">
          {saving === booking.id ? <Loader2 className="spin" size={16} /> : <X size={16} />}
          Cancel
        </button>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="appointment-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function notificationSummary(notifications: TeamAvailability["notifications"]) {
  if (notifications.length === 0) {
    return "No notification";
  }
  const failed = notifications.find((item) => item.status.includes("FAILED"));
  if (failed) {
    return `${failed.channel} ${failed.status}`;
  }
  const queued = notifications.find((item) => item.status === "QUEUED");
  if (queued) {
    return `${queued.channel} queued`;
  }
  return notifications[0].status;
}

function statusLabel(status: ClientBooking["status"]) {
  return status.replace("_", " ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short"
  }).format(new Date(value));
}
