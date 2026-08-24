"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  HelpCircle,
  Link2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users
} from "lucide-react";
import type { DashboardStats, EventType, Product, User } from "@/types";

type SchedulingTab = "event-types" | "single-use" | "polls";

type SchedulingPageProps = {
  activeTab: SchedulingTab;
  canManage: boolean;
  events: EventType[];
  productInactive: boolean;
  publicBase: string;
  search: string;
  selectedProduct: Product;
  saving: string;
  stats: DashboardStats;
  user: User;
  onCopyLink: (path: string) => void;
  onCreate: () => void;
  onDelete: (eventType: EventType) => void;
  onEdit: (eventType: EventType) => void;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: SchedulingTab) => void;
  onToggleActive: (eventType: EventType) => void;
  onUseAvailability: () => void;
};

const scopeOptions = ["My Calendar", "Product", "Team", "Team member", "Organization"];

export default function SchedulingPage({
  activeTab,
  canManage,
  events,
  productInactive,
  publicBase,
  search,
  selectedProduct,
  saving,
  stats,
  user,
  onCopyLink,
  onCreate,
  onDelete,
  onEdit,
  onSearchChange,
  onTabChange,
  onToggleActive,
  onUseAvailability
}: SchedulingPageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scope, setScope] = useState("Product");

  const selectedCount = selectedIds.length;
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return events;
    }
    return events.filter(
      (eventType) =>
        eventType.title.toLowerCase().includes(query) ||
        eventType.location_detail.toLowerCase().includes(query) ||
        eventType.slug.toLowerCase().includes(query)
    );
  }, [events, search]);

  function toggleSelected(eventType: EventType) {
    setSelectedIds((current) =>
      current.includes(eventType.id) ? current.filter((id) => id !== eventType.id) : [...current, eventType.id]
    );
  }

  return (
    <section className="cal-page scheduling-surface">
      <div className="scheduling-header">
        <div>
          <span className="scheduling-kicker">
            Scheduling
            <HelpCircle size={15} />
          </span>
          <h1>Scheduling</h1>
        </div>
        <button className="blue-action create-split-button" disabled={productInactive || !canManage} onClick={onCreate} type="button">
          <Plus size={18} />
          Create
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="scheduling-tabs" role="tablist" aria-label="Scheduling sections">
        <button
          aria-selected={activeTab === "event-types"}
          className={activeTab === "event-types" ? "active" : ""}
          onClick={() => onTabChange("event-types")}
          role="tab"
          type="button"
        >
          Event types
        </button>
        <button
          aria-selected={activeTab === "single-use"}
          className={activeTab === "single-use" ? "active" : ""}
          onClick={() => onTabChange("single-use")}
          role="tab"
          type="button"
        >
          Single-use links
        </button>
        <button
          aria-selected={activeTab === "polls"}
          className={activeTab === "polls" ? "active" : ""}
          onClick={() => onTabChange("polls")}
          role="tab"
          type="button"
        >
          Meeting polls
        </button>
      </div>

      {activeTab === "event-types" && (
        <div className="scheduling-panel" role="tabpanel">
          <MetricStrip stats={stats} />

          <div className="scheduling-toolbar">
            <label className="toolbar-select">
              <span>Filter by</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                {scopeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field scheduling-search">
              <Search size={18} />
              <input
                aria-label="Search event types"
                placeholder="Search event types"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
            <button className="outline-action" type="button">
              <Filter size={16} />
              Filter
            </button>
          </div>

          <div className="scheduling-owner-row">
            <ProductBadge product={selectedProduct} />
            <div>
              <strong>{selectedProduct.name}</strong>
              <span>{selectedProduct.member_count} product members</span>
            </div>
            <a href={`/book/${user.slug}`} target="_blank" rel="noreferrer">
              View landing page
              <ExternalLink size={15} />
            </a>
            <button className="icon-button" aria-label="More product actions" type="button">
              <MoreVertical size={17} />
            </button>
          </div>

          {selectedCount > 0 && (
            <div className="selection-banner">
              <Checkmark />
              {selectedCount} selected
            </div>
          )}

          <div className="event-type-list">
            {visibleEvents.map((eventType) => (
              <EventTypeCard
                checked={selectedIds.includes(eventType.id)}
                eventType={eventType}
                key={eventType.id}
                publicBase={publicBase}
                saving={saving}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onToggleSelected={toggleSelected}
              />
            ))}
            {visibleEvents.length === 0 && (
              <EmptySchedulingState
                icon={<Link2 size={34} />}
                title="No event types found"
                copy="Create an event type to publish a product-specific scheduling link."
                actionLabel={canManage && !productInactive ? "Create event type" : undefined}
                onAction={canManage && !productInactive ? onCreate : undefined}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "single-use" && (
        <EmptySchedulingState
          icon={<CalendarCheck size={34} />}
          title="Create focused one-time links"
          copy="Single-use links can be generated from an event type when you want one invitee to book once."
          actionLabel="Create event type"
          onAction={onCreate}
        />
      )}

      {activeTab === "polls" && (
        <EmptySchedulingState
          icon={<Users size={34} />}
          title="Find the best group meeting time"
          copy="Meeting polls help multiple invitees vote on available times before a meeting is confirmed."
          actionLabel="Use availability"
          onAction={onUseAvailability}
        />
      )}
    </section>
  );
}

function MetricStrip({ stats }: { stats: DashboardStats }) {
  return (
    <div className="scheduling-metric-strip" aria-label="Scheduling metrics">
      <div>
        <span>Event types</span>
        <strong>{stats.event_types}</strong>
      </div>
      <div>
        <span>Active</span>
        <strong>{stats.active_event_types}</strong>
      </div>
      <div>
        <span>Upcoming</span>
        <strong>{stats.upcoming_bookings}</strong>
      </div>
      <div>
        <span>Team members</span>
        <strong>{stats.team_members || 0}</strong>
      </div>
    </div>
  );
}

function EventTypeCard({
  checked,
  eventType,
  publicBase,
  saving,
  onCopyLink,
  onDelete,
  onEdit,
  onToggleActive,
  onToggleSelected
}: {
  checked: boolean;
  eventType: EventType;
  publicBase: string;
  saving: string;
  onCopyLink: (path: string) => void;
  onDelete: (eventType: EventType) => void;
  onEdit: (eventType: EventType) => void;
  onToggleActive: (eventType: EventType) => void;
  onToggleSelected: (eventType: EventType) => void;
}) {
  const location = eventType.location_type === "video" ? "Google Meet" : locationTitle(eventType.location_type);
  const stateClass = eventType.active ? "active" : "draft";

  return (
    <article
      className={`event-type-row ${checked ? "selected" : ""} ${!eventType.active ? "is-disabled" : ""}`}
      onClick={() => onEdit(eventType)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(eventType);
        }
      }}
    >
      <span className="event-type-color" style={{ background: eventType.color }} />
      <label className="event-select-box" onClick={(event) => event.stopPropagation()}>
        <input checked={checked} onChange={() => onToggleSelected(eventType)} type="checkbox" />
        <span className="sr-only">Select {eventType.title}</span>
      </label>
      <div className="event-type-main">
        <strong>{eventType.title}</strong>
        <span>
          <Clock3 size={15} />
          {eventType.duration_minutes} min
          <span className="dot-separator" />
          {location}
          <span className="dot-separator" />
          One-on-One
        </span>
        <small>Availability follows the selected product schedule and team rules.</small>
        <a href={eventType.public_path} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          {publicBase}
          {eventType.public_path}
        </a>
      </div>
      <div className="event-status-area">
        <button
          className={`status-pill event-state ${stateClass}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleActive(eventType);
          }}
          type="button"
        >
          {eventType.active ? "Active" : "Draft"}
        </button>
      </div>
      <div className="event-card-actions" onClick={(event) => event.stopPropagation()}>
        <button className="outline-action compact" onClick={() => onCopyLink(eventType.public_path)} type="button">
          <Copy size={16} />
          Copy link
        </button>
        <a className="icon-button" href={eventType.public_path} target="_blank" rel="noreferrer" aria-label="Open public link">
          <ExternalLink size={16} />
        </a>
        <button className="icon-button" aria-label="Edit event type" onClick={() => onEdit(eventType)} type="button">
          <MoreVertical size={16} />
        </button>
        <button className="icon-button danger" aria-label="Delete event type" onClick={() => onDelete(eventType)} type="button">
          {saving === eventType.id ? <Clock3 size={16} /> : <Trash2 size={16} />}
        </button>
      </div>
    </article>
  );
}

function ProductBadge({ product }: { product: Product }) {
  const initials = product.icon || product.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("");
  return (
    <span className="product-avatar" style={{ backgroundColor: product.color }}>
      {initials.toUpperCase()}
    </span>
  );
}

function EmptySchedulingState({
  actionLabel,
  copy,
  icon,
  title,
  onAction
}: {
  actionLabel?: string;
  copy: string;
  icon: ReactNode;
  title: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state scheduling-empty">
      {icon}
      <strong>{title}</strong>
      <p>{copy}</p>
      {actionLabel && onAction && (
        <button className="blue-action" onClick={onAction} type="button">
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function locationTitle(type: EventType["location_type"]) {
  return {
    phone: "Phone call",
    video: "Video meeting",
    in_person: "In-person",
    custom: "Custom location"
  }[type];
}

function Checkmark() {
  return <span className="selection-check" aria-hidden="true" />;
}
