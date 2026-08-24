"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Globe2,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  X
} from "lucide-react";
import type { EventQuestion, EventType, GoogleCalendarStatus, Product, ProductMember, TeamAvailability } from "@/types";

export type EventKind = "one_on_one" | "group" | "round_robin" | "collective";
export type LocationOption = "google_meet" | "zoom" | "phone" | "in_person" | "custom" | "ask_invitee" | "all_options";
export type AssignmentStrategy = "specific_member" | "round_robin" | "collective" | "pooled";

export type EventEditorDraft = {
  title: string;
  description: string;
  duration_minutes: number;
  color: string;
  active: boolean;
  questions: EventQuestion[];
  event_kind: EventKind;
  location_option: LocationOption;
  location_detail: string;
  phone_direction: "host_calls_invitee" | "invitee_calls_host";
  phone_number: string;
  assignment_strategy: AssignmentStrategy;
  selected_member_id: string;
  timezone: string;
  weekdays: number[];
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  minimum_notice_minutes: number;
  maximum_booking_days: number;
  invitee_phone_required: boolean;
  consent_required: boolean;
  allow_reschedule: boolean;
  allow_cancel: boolean;
  reminders_enabled: boolean;
  payment_enabled: boolean;
  payment_provider: string;
  payment_amount: string;
  payment_currency: string;
  confirmation_message: string;
  redirect_url: string;
};

export const eventColorPalette = ["#7c3aed", "#006bff", "#0f8b8d", "#c2410c", "#15803d", "#be123c"];

const eventKindLabels: Record<EventKind, string> = {
  one_on_one: "One-on-One",
  group: "Group",
  round_robin: "Round Robin",
  collective: "Collective"
};

const assignmentLabels: Record<AssignmentStrategy, string> = {
  specific_member: "Specific team member",
  round_robin: "Round Robin",
  collective: "Collective",
  pooled: "Pooled team availability"
};

function supportWindowLabel(startTime: string, endTime: string) {
  if (startTime === endTime) {
    return "24/7 coverage";
  }
  if (endTime < startTime) {
    return `${startTime} - ${endTime} overnight`;
  }
  return `${startTime} - ${endTime}`;
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function createEventEditorDraft(eventType?: EventType | null, fallbackTimezone = "Asia/Kolkata"): EventEditorDraft {
  const locationOption: LocationOption =
    eventType?.location_type === "phone"
      ? "phone"
      : eventType?.location_type === "in_person"
        ? "in_person"
        : eventType?.location_type === "custom"
          ? "custom"
          : "google_meet";

  return {
    title: eventType?.title || "30 Minute Meeting",
    description: eventType?.description || "",
    duration_minutes: eventType?.duration_minutes || 30,
    color: eventType?.color || eventColorPalette[0],
    active: eventType?.active ?? true,
    questions: eventType?.questions?.length ? eventType.questions : [],
    event_kind: "one_on_one",
    location_option: locationOption,
    location_detail: eventType?.location_detail || "",
    phone_direction: "host_calls_invitee",
    phone_number: "",
    assignment_strategy: "round_robin",
    selected_member_id: "",
    timezone: fallbackTimezone,
    weekdays: [0, 1, 2, 3, 4],
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    minimum_notice_minutes: 60,
    maximum_booking_days: 30,
    invitee_phone_required: false,
    consent_required: true,
    allow_reschedule: true,
    allow_cancel: true,
    reminders_enabled: true,
    payment_enabled: false,
    payment_provider: "",
    payment_amount: "",
    payment_currency: "INR",
    confirmation_message: "Your meeting is confirmed.",
    redirect_url: ""
  };
}

export function eventDraftToPayload(draft: EventEditorDraft): Partial<EventType> {
  const locationType: EventType["location_type"] =
    draft.location_option === "phone"
      ? "phone"
      : draft.location_option === "in_person"
        ? "in_person"
        : draft.location_option === "google_meet"
          ? "video"
          : "custom";

  const locationDetail =
    draft.location_option === "google_meet"
      ? "Google Meet"
      : draft.location_option === "phone"
        ? draft.phone_number.trim() || (draft.phone_direction === "host_calls_invitee" ? "Host will call invitee" : "Invitee will call host")
      : draft.location_option === "ask_invitee"
        ? "Ask invitee"
        : draft.location_option === "all_options"
          ? "All location options"
          : draft.location_detail.trim();

  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    duration_minutes: Number(draft.duration_minutes),
    location_type: locationType,
    location_detail: locationDetail,
    color: draft.color,
    active: draft.active,
    questions: draft.questions.filter((question) => question.label.trim()).slice(0, 5)
  };
}

export function validateEventEditorDraft(draft: EventEditorDraft, googleCalendarStatus: GoogleCalendarStatus | null) {
  if (draft.title.trim().length < 2) {
    return "Event name must be at least 2 characters.";
  }
  if (draft.title.trim().length > 100) {
    return "Event name must be 100 characters or fewer.";
  }
  if (draft.duration_minutes < 5 || draft.duration_minutes > 480) {
    return "Duration must be between 5 and 480 minutes.";
  }
  if (draft.description.length > 600) {
    return "Description must be 600 characters or fewer.";
  }
  if (draft.location_detail.length > 200) {
    return "Location detail must be 200 characters or fewer.";
  }
  if (draft.location_option === "google_meet") {
    if (!googleCalendarStatus?.enabled || !googleCalendarStatus.configured) {
      return "Google Calendar must be configured before Google Meet can be used.";
    }
    if (!googleCalendarStatus.connected) {
      return "Connect Google Calendar before creating a Google Meet event type.";
    }
  }
  if (draft.location_option === "phone" && draft.phone_number && !/^\+[1-9]\d{7,14}$/.test(draft.phone_number.trim())) {
    return "Use an international phone number such as +919876543210.";
  }
  if (draft.location_option === "custom" && /<script|javascript:/i.test(draft.location_detail)) {
    return "Custom location cannot contain scripts or unsafe URLs.";
  }
  if (draft.questions.some((question) => question.label.trim().length === 1)) {
    return "Custom question labels must be at least 2 characters.";
  }
  return "";
}

type EventEditorDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  dirty: boolean;
  draft: EventEditorDraft;
  selectedEvent: EventType | null;
  selectedProduct: Product | null;
  products: Product[];
  members: ProductMember[];
  teamAvailability: TeamAvailability | null;
  googleCalendarStatus: GoogleCalendarStatus | null;
  publicBase: string;
  saving: boolean;
  validationMessage: string;
  onDraftChange: (draft: EventEditorDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  onConnectGoogleCalendar: () => void;
  onCopyLink: (path: string) => void;
  onDelete: (eventType: EventType) => void;
};

export default function EventEditorDrawer({
  open,
  mode,
  dirty,
  draft,
  selectedEvent,
  selectedProduct,
  products,
  members,
  teamAvailability,
  googleCalendarStatus,
  publicBase,
  saving,
  validationMessage,
  onDraftChange,
  onClose,
  onSubmit,
  onConnectGoogleCalendar,
  onCopyLink,
  onDelete
}: EventEditorDrawerProps) {
  const drawerRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    duration: true,
    location: true,
    availability: false,
    invitee: false,
    payment: false,
    notifications: false,
    booking: false
  });

  const activeMembers = useMemo(
    () => members.filter((member) => member.membership_status === "active"),
    [members]
  );
  const googleReady = Boolean(googleCalendarStatus?.enabled && googleCalendarStatus.configured && googleCalendarStatus.connected);
  const publicUrl = selectedEvent ? `${publicBase}${selectedEvent.public_path}` : "Generated after creation";
  const primaryLabel = mode === "edit" ? "Save changes" : "Create";

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => titleRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) {
    return null;
  }

  function patch(next: Partial<EventEditorDraft>) {
    onDraftChange({ ...draft, ...next });
  }

  function requestClose() {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) {
      return;
    }
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function toggleSection(id: string) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  function showMoreOptions() {
    setOpenSections((current) => ({
      ...current,
      invitee: true,
      payment: true,
      notifications: true,
      booking: true
    }));
  }

  function updateQuestion(index: number, patchValue: Partial<EventQuestion>) {
    const questions = draft.questions.map((question, questionIndex) =>
      questionIndex === index ? { ...question, ...patchValue } : question
    );
    patch({ questions });
  }

  function addQuestion() {
    if (draft.questions.length >= 5) {
      return;
    }
    patch({ questions: [...draft.questions, { label: "", required: false }] });
  }

  function removeQuestion(index: number) {
    patch({ questions: draft.questions.filter((_question, questionIndex) => questionIndex !== index) });
  }

  return (
    <div className="event-drawer-layer" aria-live="polite">
      <button className="event-drawer-scrim" aria-label="Close event editor" onClick={requestClose} type="button" />
      <form
        aria-label={mode === "edit" ? "Edit event type" : "Create event type"}
        aria-modal="true"
        className="event-editor-drawer"
        onKeyDown={handleKeyDown}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        ref={drawerRef}
        role="dialog"
      >
        <header className="event-drawer-header">
          <div className="drawer-title-row">
            <span>Event type</span>
            <button className="icon-button" aria-label="Close event editor" onClick={requestClose} type="button">
              <X size={17} />
            </button>
          </div>
          <label className="event-name-field">
            <span>Event name</span>
            <input
              aria-invalid={Boolean(validationMessage && draft.title.trim().length < 2)}
              maxLength={100}
              onChange={(event) => patch({ title: event.target.value })}
              ref={titleRef}
              value={draft.title}
            />
          </label>
          <div className="event-classification-row">
            <select
              aria-label="Event classification"
              value={draft.event_kind}
              onChange={(event) => patch({ event_kind: event.target.value as EventKind })}
            >
              {Object.entries(eventKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ColorPicker value={draft.color} onChange={(color) => patch({ color })} />
          </div>
          {validationMessage && (
            <p className="drawer-validation" role="alert">
              <AlertCircle size={15} />
              {validationMessage}
            </p>
          )}
        </header>

        <div className="event-drawer-body">
          <AccordionSection
            icon={<Clock3 size={18} />}
            id="duration"
            open={openSections.duration}
            summary={`${draft.duration_minutes} min`}
            title="Duration"
            onToggle={() => toggleSection("duration")}
          >
            <DurationEditor draft={draft} onChange={patch} />
          </AccordionSection>

          <AccordionSection
            icon={<MapPin size={18} />}
            id="location"
            open={openSections.location}
            summary={locationSummary(draft, googleReady)}
            title="Location"
            onToggle={() => toggleSection("location")}
          >
            <LocationSelector
              draft={draft}
              googleCalendarStatus={googleCalendarStatus}
              googleReady={googleReady}
              onChange={patch}
              onConnectGoogleCalendar={onConnectGoogleCalendar}
            />
          </AccordionSection>

          <AccordionSection
            icon={<CalendarDays size={18} />}
            id="availability"
            open={openSections.availability}
            summary={availabilitySummary(draft, teamAvailability)}
            title="Availability"
            onToggle={() => toggleSection("availability")}
          >
            <ProductTeamSelector
              activeMembers={activeMembers}
              draft={draft}
              products={products}
              selectedProduct={selectedProduct}
              teamAvailability={teamAvailability}
              onChange={patch}
            />
          </AccordionSection>

          <AccordionSection
            icon={<MessageSquare size={18} />}
            id="invitee"
            open={openSections.invitee}
            summary={`${draft.questions.length} custom questions`}
            title="Invitee settings"
            onToggle={() => toggleSection("invitee")}
          >
            <InviteeSettings
              addQuestion={addQuestion}
              draft={draft}
              onChange={patch}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
            />
          </AccordionSection>

          <AccordionSection
            icon={<CreditCard size={18} />}
            id="payment"
            open={openSections.payment}
            summary={draft.payment_enabled ? "Payment configured" : "Collect payment for your event"}
            title="Payment"
            onToggle={() => toggleSection("payment")}
          >
            <PaymentSettings draft={draft} onChange={patch} />
          </AccordionSection>

          <AccordionSection
            icon={<Bell size={18} />}
            id="notifications"
            open={openSections.notifications}
            summary={draft.reminders_enabled ? "Confirmations and reminders on" : "Confirmations only"}
            title="Notifications and workflows"
            onToggle={() => toggleSection("notifications")}
          >
            <NotificationSettings draft={draft} onChange={patch} />
          </AccordionSection>

          <AccordionSection
            icon={<Link2 size={18} />}
            id="booking"
            open={openSections.booking}
            summary={selectedEvent ? selectedEvent.public_path : "Booking page preview"}
            title="Booking-page settings"
            onToggle={() => toggleSection("booking")}
          >
            <BookingPageSettings
              draft={draft}
              publicUrl={publicUrl}
              selectedEvent={selectedEvent}
              onChange={patch}
              onCopyLink={onCopyLink}
              onDelete={onDelete}
            />
          </AccordionSection>
        </div>

        <footer className="event-drawer-footer">
          <button className="outline-action" onClick={showMoreOptions} type="button">
            More options
          </button>
          <button className="blue-action" disabled={saving} type="submit">
            {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
            {primaryLabel}
          </button>
        </footer>

        {confirmClose && (
          <div className="drawer-confirm-backdrop" role="alertdialog" aria-modal="true" aria-label="Unsaved changes">
            <div className="drawer-confirm-card">
              <strong>Discard unsaved changes?</strong>
              <p>Your event edits have not been saved.</p>
              <div>
                <button className="outline-action compact" onClick={() => setConfirmClose(false)} type="button">
                  Keep editing
                </button>
                <button
                  className="blue-action compact-danger"
                  onClick={() => {
                    setConfirmClose(false);
                    onClose();
                  }}
                  type="button"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="drawer-color-picker" aria-label="Event color">
      {eventColorPalette.map((color) => (
        <button
          aria-label={`Use event color ${color}`}
          aria-pressed={value === color}
          className={value === color ? "swatch active" : "swatch"}
          key={color}
          onClick={() => onChange(color)}
          style={{ background: color }}
          type="button"
        />
      ))}
    </div>
  );
}

function AccordionSection({
  children,
  icon,
  id,
  open,
  summary,
  title,
  onToggle
}: {
  children: ReactNode;
  icon: ReactNode;
  id: string;
  open: boolean;
  summary: string;
  title: string;
  onToggle: () => void;
}) {
  return (
    <section className="event-accordion">
      <button
        aria-controls={`event-section-${id}`}
        aria-expanded={open}
        className="event-accordion-trigger"
        onClick={onToggle}
        type="button"
      >
        <span className="event-section-icon">{icon}</span>
        <span>
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        <ChevronDown className={open ? "open" : ""} size={17} />
      </button>
      {open && (
        <div className="event-accordion-panel" id={`event-section-${id}`}>
          {children}
        </div>
      )}
    </section>
  );
}

function DurationEditor({ draft, onChange }: { draft: EventEditorDraft; onChange: (patch: Partial<EventEditorDraft>) => void }) {
  return (
    <div className="drawer-field-stack">
      <div className="duration-preset-grid" role="group" aria-label="Duration presets">
        {[15, 30, 45, 60].map((minutes) => (
          <button
            aria-pressed={draft.duration_minutes === minutes}
            className={draft.duration_minutes === minutes ? "duration-pill active" : "duration-pill"}
            key={minutes}
            onClick={() => onChange({ duration_minutes: minutes })}
            type="button"
          >
            {minutes} min
          </button>
        ))}
      </div>
      <label>
        Custom duration
        <input
          min={5}
          max={480}
          onChange={(event) => onChange({ duration_minutes: Number(event.target.value) })}
          type="number"
          value={draft.duration_minutes}
        />
      </label>
      <div className="drawer-two-columns">
        <label>
          Buffer before
          <input
            min={0}
            max={120}
            onChange={(event) => onChange({ buffer_before_minutes: Number(event.target.value) })}
            type="number"
            value={draft.buffer_before_minutes}
          />
        </label>
        <label>
          Buffer after
          <input
            min={0}
            max={120}
            onChange={(event) => onChange({ buffer_after_minutes: Number(event.target.value) })}
            type="number"
            value={draft.buffer_after_minutes}
          />
        </label>
      </div>
    </div>
  );
}

function LocationSelector({
  draft,
  googleCalendarStatus,
  googleReady,
  onChange,
  onConnectGoogleCalendar
}: {
  draft: EventEditorDraft;
  googleCalendarStatus: GoogleCalendarStatus | null;
  googleReady: boolean;
  onChange: (patch: Partial<EventEditorDraft>) => void;
  onConnectGoogleCalendar: () => void;
}) {
  const options: Array<{
    value: LocationOption;
    label: string;
    copy: string;
    icon: ReactNode;
    disabled?: boolean;
  }> = [
    { value: "google_meet", label: "Google Meet", copy: googleReady ? "Connected calendar" : "Calendar connection required", icon: <Video size={18} /> },
    { value: "zoom", label: "Zoom", copy: "Provider not enabled", icon: <Video size={18} />, disabled: true },
    { value: "phone", label: "Phone call", copy: "Host or invitee phone flow", icon: <Phone size={18} /> },
    { value: "in_person", label: "In-person", copy: "Office, room, or instructions", icon: <MapPin size={18} /> },
    { value: "custom", label: "Custom location", copy: "Secure URL or instructions", icon: <Globe2 size={18} /> },
    { value: "ask_invitee", label: "Ask invitee", copy: "Collect preference while booking", icon: <MessageSquare size={18} /> },
    { value: "all_options", label: "All options", copy: "Show every supported option", icon: <Check size={18} /> }
  ];

  return (
    <div className="drawer-field-stack">
      <div className="location-option-grid" role="radiogroup" aria-label="Location options">
        {options.map((option) => (
          <button
            aria-checked={draft.location_option === option.value}
            className={draft.location_option === option.value ? "location-card active" : "location-card"}
            disabled={option.disabled}
            key={option.value}
            onClick={() => onChange({ location_option: option.value })}
            role="radio"
            type="button"
          >
            <span>{option.icon}</span>
            <strong>{option.label}</strong>
            <small>{option.copy}</small>
          </button>
        ))}
      </div>

      {draft.location_option === "google_meet" && (
        <div className={googleReady ? "connection-callout ready" : "connection-callout"}>
          <ShieldCheck size={17} />
          <span>
            {googleReady
              ? `Google Calendar connected as ${googleCalendarStatus?.provider_email || "your account"}. Meet links are generated by the backend.`
              : "Connect Google Calendar to create official calendar invitations and Google Meet links."}
          </span>
          {!googleReady && (
            <button className="outline-action compact" onClick={onConnectGoogleCalendar} type="button">
              Connect
            </button>
          )}
        </div>
      )}

      {draft.location_option === "phone" && (
        <>
          <label>
            Phone behavior
            <select
              value={draft.phone_direction}
              onChange={(event) => onChange({ phone_direction: event.target.value as EventEditorDraft["phone_direction"] })}
            >
              <option value="host_calls_invitee">I will call the invitee</option>
              <option value="invitee_calls_host">Invitee will call me</option>
            </select>
          </label>
          <label>
            Public phone number, optional
            <input
              inputMode="tel"
              onChange={(event) => onChange({ phone_number: event.target.value })}
              placeholder="+919876543210"
              value={draft.phone_number}
            />
          </label>
        </>
      )}

      {["in_person", "custom"].includes(draft.location_option) && (
        <label>
          Location detail
          <textarea
            maxLength={200}
            onChange={(event) => onChange({ location_detail: event.target.value })}
            placeholder={draft.location_option === "in_person" ? "Office address, room, or arrival notes" : "Paste a secure URL or instructions"}
            value={draft.location_detail}
          />
        </label>
      )}
    </div>
  );
}

function ProductTeamSelector({
  activeMembers,
  draft,
  products,
  selectedProduct,
  teamAvailability,
  onChange
}: {
  activeMembers: ProductMember[];
  draft: EventEditorDraft;
  products: Product[];
  selectedProduct: Product | null;
  teamAvailability: TeamAvailability | null;
  onChange: (patch: Partial<EventEditorDraft>) => void;
}) {
  return (
    <div className="drawer-field-stack">
      <label>
        Product context
        <select value={selectedProduct?.id || ""} disabled>
          {products.length === 0 && <option>No products available</option>}
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
      <small className="field-note">Switch products from the global product selector to keep backend authorization enforced.</small>

      <label>
        Assignment strategy
        <select
          value={draft.assignment_strategy}
          onChange={(event) => onChange({ assignment_strategy: event.target.value as AssignmentStrategy })}
        >
          {Object.entries(assignmentLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {draft.assignment_strategy === "specific_member" && (
        <label>
          Team member
          <select
            value={draft.selected_member_id}
            onChange={(event) => onChange({ selected_member_id: event.target.value })}
          >
            <option value="">Select a team member</option>
            {activeMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name} - {member.role}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="drawer-two-columns">
        <label>
          Timezone
          <input onChange={(event) => onChange({ timezone: event.target.value })} value={draft.timezone} />
        </label>
        <label>
          Max booking range
          <input
            min={1}
            max={365}
            onChange={(event) => onChange({ maximum_booking_days: Number(event.target.value) })}
            type="number"
            value={draft.maximum_booking_days}
          />
        </label>
      </div>

      <div className="weekday-toggle-grid" role="group" aria-label="Bookable days">
        {weekdayLabels.map((label, index) => (
          <button
            aria-pressed={draft.weekdays.includes(index)}
            className={draft.weekdays.includes(index) ? "weekday-toggle active" : "weekday-toggle"}
            key={label}
            onClick={() => {
              const weekdays = draft.weekdays.includes(index)
                ? draft.weekdays.filter((day) => day !== index)
                : [...draft.weekdays, index].sort();
              onChange({ weekdays });
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="team-preview-panel">
        <strong>Team availability preview</strong>
        <p>
          {teamAvailability
            ? `${teamAvailability.members.filter((member) => member.included_in_rotation).length} eligible members, ${teamAvailability.available_slots.length} slots on the selected availability date.`
            : "Load a product to preview team availability."}
        </p>
        {teamAvailability?.policy && (
          <small>
            {supportWindowLabel(teamAvailability.policy.support_start_time, teamAvailability.policy.support_end_time)} {teamAvailability.policy.timezone}
          </small>
        )}
      </div>
    </div>
  );
}

function InviteeSettings({
  addQuestion,
  draft,
  onChange,
  removeQuestion,
  updateQuestion
}: {
  addQuestion: () => void;
  draft: EventEditorDraft;
  onChange: (patch: Partial<EventEditorDraft>) => void;
  removeQuestion: (index: number) => void;
  updateQuestion: (index: number, patch: Partial<EventQuestion>) => void;
}) {
  return (
    <div className="drawer-field-stack">
      <div className="checkbox-stack">
        <label>
          <input
            checked={draft.invitee_phone_required}
            onChange={(event) => onChange({ invitee_phone_required: event.target.checked })}
            type="checkbox"
          />
          Require phone number
        </label>
        <label>
          <input
            checked={draft.consent_required}
            onChange={(event) => onChange({ consent_required: event.target.checked })}
            type="checkbox"
          />
          Require invitee confirmation checkbox
        </label>
        <label>
          <input
            checked={draft.allow_reschedule}
            onChange={(event) => onChange({ allow_reschedule: event.target.checked })}
            type="checkbox"
          />
          Allow rescheduling
        </label>
        <label>
          <input checked={draft.allow_cancel} onChange={(event) => onChange({ allow_cancel: event.target.checked })} type="checkbox" />
          Allow cancellation
        </label>
      </div>

      <div className="question-list">
        {draft.questions.map((question, index) => (
          <div className="question-row" key={index}>
            <input
              aria-label={`Question ${index + 1}`}
              maxLength={120}
              onChange={(event) => updateQuestion(index, { label: event.target.value })}
              placeholder="Question label"
              value={question.label}
            />
            <label>
              <input
                checked={question.required}
                onChange={(event) => updateQuestion(index, { required: event.target.checked })}
                type="checkbox"
              />
              Required
            </label>
            <button aria-label="Remove question" className="icon-button danger" onClick={() => removeQuestion(index)} type="button">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button className="outline-action compact" disabled={draft.questions.length >= 5} onClick={addQuestion} type="button">
          <Plus size={16} />
          Add question
        </button>
      </div>
    </div>
  );
}

function PaymentSettings({ draft, onChange }: { draft: EventEditorDraft; onChange: (patch: Partial<EventEditorDraft>) => void }) {
  return (
    <div className="drawer-field-stack">
      <div className="connection-callout">
        <AlertCircle size={17} />
        <span>Payment collection is feature-controlled. This UI stores intent only after backend payment support is added.</span>
      </div>
      <label className="toggle-row">
        <span>Enable payment</span>
        <input checked={draft.payment_enabled} onChange={(event) => onChange({ payment_enabled: event.target.checked })} type="checkbox" />
      </label>
      <div className="drawer-two-columns">
        <label>
          Amount
          <input onChange={(event) => onChange({ payment_amount: event.target.value })} placeholder="0.00" value={draft.payment_amount} />
        </label>
        <label>
          Currency
          <select value={draft.payment_currency} onChange={(event) => onChange({ payment_currency: event.target.value })}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function NotificationSettings({ draft, onChange }: { draft: EventEditorDraft; onChange: (patch: Partial<EventEditorDraft>) => void }) {
  return (
    <div className="drawer-field-stack">
      <div className="notification-row">
        <Bell size={17} />
        <span>Google Calendar sends official invitations. SendGrid sends branded confirmations and reminders.</span>
      </div>
      <div className="checkbox-stack">
        <label>
          <input checked readOnly type="checkbox" />
          Booking confirmation email
        </label>
        <label>
          <input checked readOnly type="checkbox" />
          Team-member notification
        </label>
        <label>
          <input checked={draft.reminders_enabled} onChange={(event) => onChange({ reminders_enabled: event.target.checked })} type="checkbox" />
          Reminder schedule
        </label>
      </div>
    </div>
  );
}

function BookingPageSettings({
  draft,
  publicUrl,
  selectedEvent,
  onChange,
  onCopyLink,
  onDelete
}: {
  draft: EventEditorDraft;
  publicUrl: string;
  selectedEvent: EventType | null;
  onChange: (patch: Partial<EventEditorDraft>) => void;
  onCopyLink: (path: string) => void;
  onDelete: (eventType: EventType) => void;
}) {
  return (
    <div className="drawer-field-stack">
      <label>
        Event description
        <textarea
          maxLength={600}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Describe what invitees can expect."
          value={draft.description}
        />
      </label>
      <label className="toggle-row">
        <span>Show event on booking page</span>
        <input checked={draft.active} onChange={(event) => onChange({ active: event.target.checked })} type="checkbox" />
      </label>
      <label>
        Confirmation message
        <input
          maxLength={140}
          onChange={(event) => onChange({ confirmation_message: event.target.value })}
          value={draft.confirmation_message}
        />
      </label>
      <label>
        Redirect URL, optional
        <input onChange={(event) => onChange({ redirect_url: event.target.value })} placeholder="https://example.com/thanks" value={draft.redirect_url} />
      </label>
      <div className="copy-field drawer-copy-field">
        <input aria-label="Public booking URL" readOnly value={publicUrl} />
        {selectedEvent && (
          <button className="outline-action compact" onClick={() => onCopyLink(selectedEvent.public_path)} type="button">
            <Copy size={16} />
            Copy
          </button>
        )}
      </div>
      {selectedEvent && (
        <div className="drawer-danger-zone">
          <button className="outline-action compact" onClick={() => window.open(selectedEvent.public_path, "_blank", "noopener,noreferrer")} type="button">
            <ExternalLink size={16} />
            View page
          </button>
          <button className="outline-action compact danger-text" onClick={() => onDelete(selectedEvent)} type="button">
            <Trash2 size={16} />
            Delete event
          </button>
        </div>
      )}
    </div>
  );
}

function locationSummary(draft: EventEditorDraft, googleReady: boolean) {
  if (draft.location_option === "google_meet") {
    return googleReady ? "Google Meet connected" : "Google Meet needs connection";
  }
  if (draft.location_option === "phone") {
    return "Phone call";
  }
  if (draft.location_option === "in_person") {
    return "In-person";
  }
  if (draft.location_option === "ask_invitee") {
    return "Ask invitee";
  }
  if (draft.location_option === "all_options") {
    return "All options";
  }
  if (draft.location_option === "zoom") {
    return "Zoom not enabled";
  }
  return draft.location_detail || "Custom location";
}

function availabilitySummary(draft: EventEditorDraft, teamAvailability: TeamAvailability | null) {
  if (teamAvailability?.policy) {
    return `${assignmentLabels[draft.assignment_strategy]}, ${supportWindowLabel(teamAvailability.policy.support_start_time, teamAvailability.policy.support_end_time)}`;
  }
  return `${draft.weekdays.length} days, ${assignmentLabels[draft.assignment_strategy]}`;
}
