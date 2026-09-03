"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  CheckCheck,
  Info,
  PhoneMissed,
  Users
} from "lucide-react";
import type { BookingClaimAlert, MissedCall } from "@/types";

export type NotificationKind =
  | "booking_request"
  | "missed_call"
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "team_availability"
  | "system";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  actionLabel?: string;
  source: "live" | "demo";
  meta?: {
    bookingId?: string;
  };
};

type NotificationCenterProps = {
  claimAlerts?: BookingClaimAlert[];
  missedCalls?: MissedCall[];
  storageKey?: string;
  onOpenClaim?: (bookingId: string) => void;
  onOpenMissed?: () => void;
  onOpenScheduling?: () => void;
  onOpenChange?: (open: boolean) => void;
};

const READ_STORAGE_PREFIX = "calendar_notification_read_ids:";

function demoNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    {
      id: "demo-interview-scheduled",
      kind: "interview_scheduled",
      title: "Interview scheduled",
      description: "Your interview with the product team has been scheduled successfully.",
      createdAt: new Date(now - 35 * 60 * 1000).toISOString(),
      actionLabel: "View details",
      source: "demo"
    },
    {
      id: "demo-team-availability",
      kind: "team_availability",
      title: "Team availability updated",
      description: "Coverage windows were refreshed for this workspace.",
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      source: "demo"
    },
    {
      id: "demo-system",
      kind: "system",
      title: "Account tip",
      description: "Keep notification emails verified so booking requests reach your team.",
      createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      source: "demo"
    }
  ];
}

function buildLiveNotifications(
  claimAlerts: BookingClaimAlert[],
  missedCalls: MissedCall[]
): AppNotification[] {
  const fromClaims = claimAlerts.map((alert) => ({
    id: `claim:${alert.id}`,
    kind: "booking_request" as const,
    title: "New booking request",
    description: `${alert.client_name || "A client"} requested “${alert.issue_title || "a session"}”${
      alert.client_company ? ` · ${alert.client_company}` : ""
    }.`,
    createdAt: alert.created_at || alert.start_time || new Date().toISOString(),
    actionLabel: "Review request",
    source: "live" as const,
    meta: { bookingId: alert.booking_id }
  }));

  const fromMissed = missedCalls.map((item) => ({
    id: `missed:${item.id}`,
    kind: "missed_call" as const,
    title: "Missed call",
    description: `${item.client_name || "A client"} was not accepted before the scheduled start${
      item.missed_call_reason ? ` (${item.missed_call_reason.replaceAll("_", " ")})` : ""
    }.`,
    createdAt: item.missed_call_at || item.start_time || new Date().toISOString(),
    actionLabel: "View details",
    source: "live" as const,
    meta: { bookingId: item.id }
  }));

  return [...fromClaims, ...fromMissed].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function loadReadIds(storageKey: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${storageKey}`);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(storageKey: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`${READ_STORAGE_PREFIX}${storageKey}`, JSON.stringify([...ids]));
}

function notificationIcon(kind: NotificationKind) {
  switch (kind) {
    case "booking_request":
      return <CalendarClock size={16} aria-hidden="true" />;
    case "missed_call":
      return <PhoneMissed size={16} aria-hidden="true" />;
    case "interview_scheduled":
      return <CalendarCheck size={16} aria-hidden="true" />;
    case "interview_rescheduled":
      return <CalendarClock size={16} aria-hidden="true" />;
    case "interview_cancelled":
      return <CalendarX2 size={16} aria-hidden="true" />;
    case "team_availability":
      return <Users size={16} aria-hidden="true" />;
    default:
      return <Info size={16} aria-hidden="true" />;
  }
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  if (sameDay) {
    return `Today, ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Yesterday, ${time}`;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default function NotificationCenter({
  claimAlerts = [],
  missedCalls = [],
  storageKey = "default",
  onOpenClaim,
  onOpenMissed,
  onOpenScheduling,
  onOpenChange
}: NotificationCenterProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  function setPanelOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    setReadIds(loadReadIds(storageKey));
  }, [storageKey]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(target)) {
        setPanelOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const notifications = useMemo(() => {
    const live = buildLiveNotifications(claimAlerts, missedCalls);
    return live.length > 0 ? live : demoNotifications();
  }, [claimAlerts, missedCalls]);

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  function persistRead(next: Set<string>) {
    setReadIds(next);
    saveReadIds(storageKey, next);
  }

  function markAllRead() {
    persistRead(new Set(notifications.map((item) => item.id)));
  }

  function markOneRead(id: string) {
    const next = new Set(readIds);
    next.add(id);
    persistRead(next);
  }

  function handleAction(item: AppNotification) {
    markOneRead(item.id);
    if (item.kind === "booking_request" && item.meta?.bookingId && onOpenClaim) {
      onOpenClaim(item.meta.bookingId);
      setPanelOpen(false);
      return;
    }
    if (item.kind === "missed_call" && onOpenMissed) {
      onOpenMissed();
      setPanelOpen(false);
      return;
    }
    if (onOpenScheduling) {
      onOpenScheduling();
      setPanelOpen(false);
    }
  }

  return (
    <div className="notification-center" ref={wrapRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className={`icon-button notification-trigger ${open ? "open" : ""}`}
        onClick={() => setPanelOpen(!open)}
        title="Notifications"
        type="button"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          aria-label="Notifications"
          className="notification-panel"
          role="dialog"
        >
          <div className="notification-panel-head">
            <div>
              <strong>Notifications</strong>
              <p>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : notifications.length > 0
                    ? "You're all caught up"
                    : "No notifications yet"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={markAllRead} type="button">
                <CheckCheck size={15} aria-hidden="true" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={22} aria-hidden="true" />
                <strong>No notifications</strong>
                <p>Booking requests, claims, and missed calls will appear here.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const unread = !readIds.has(item.id);
                return (
                  <article
                    className={`notification-item ${unread ? "unread" : "read"}`}
                    key={item.id}
                  >
                    <button
                      className="notification-item-main"
                      onClick={() => markOneRead(item.id)}
                      type="button"
                    >
                      <span className={`notification-type-icon ${item.kind}`} aria-hidden="true">
                        {notificationIcon(item.kind)}
                      </span>
                      <span className="notification-item-copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                        <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
                      </span>
                      {unread && <span className="notification-dot" aria-label="Unread" />}
                    </button>
                    {item.actionLabel && (
                      <div className="notification-item-actions">
                        <button
                          className="outline-action compact"
                          onClick={() => handleAction(item)}
                          type="button"
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
