"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  FilePlus2,
  Filter,
  HelpCircle,
  Link2,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  MoreVertical,
  Palette,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X
} from "lucide-react";
import EventEditorDrawer, {
  createEventEditorDraft,
  eventDraftToPayload,
  validateEventEditorDraft,
  type EventEditorDraft
} from "@/components/EventEditorDrawer";
import SchedulingPage from "@/components/SchedulingPage";
import { api } from "@/lib/api";
import type {
  Availability,
  Booking,
  Contact,
  DashboardStats,
  EventType,
  GoogleCalendarStatus,
  MemberAvailability,
  Product,
  ProductMeeting,
  ProductMember,
  TeamAvailability,
  User
} from "@/types";

type WorkspaceView =
  | "scheduling"
  | "meetings"
  | "team"
  | "availability"
  | "contacts"
  | "analytics"
  | "product-settings"
  | "profile"
  | "branding"
  | "my-link"
  | "notetaker-settings"
  | "callie-settings"
  | "all-settings"
  | "getting-started"
  | "community";

type SchedulingTab = "client-appointments" | "event-types" | "single-use" | "polls";

const selectedProductKey = "calendar_selected_product_id";
const organizationDomain = process.env.NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN || "";
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const colors = ["#7c3aed", "#006bff", "#0f8b8d", "#c2410c", "#15803d", "#be123c"];

function supportWindowLabel(startTime: string, endTime: string) {
  if (startTime === endTime) {
    return "24/7 coverage";
  }
  if (endTime < startTime) {
    return `${startTime} - ${endTime} overnight`;
  }
  return `${startTime} - ${endTime}`;
}

const emptyStats: DashboardStats = {
  event_types: 0,
  active_event_types: 0,
  scheduled_bookings: 0,
  upcoming_bookings: 0,
  team_members: 0,
  scheduled_team_meetings: 0,
  pending_invitations: 0
};

const defaultContactDraft = {
  name: "",
  email: "",
  company: "",
  job_title: "",
  notes: ""
};

const defaultProductDraft = {
  name: "",
  description: "",
  icon: "",
  color: "#006bff",
  status: "active" as "active" | "inactive",
  approvedDomainsText: "",
  controllerEmail: "",
  supportEmail: "",
  bookingMode: "instant" as "instant" | "approval",
  widgetEnabled: true,
  widgetButtonLabel: "Book Now",
  widgetActionLabel: "Schedule to connect team",
  widgetPosition: "right" as "right" | "left"
};

function parseDomainLines(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productPayloadFromDraft(draft: typeof defaultProductDraft) {
  return {
    name: draft.name,
    description: draft.description,
    icon: draft.icon,
    color: draft.color,
    status: draft.status,
    approved_domains: parseDomainLines(draft.approvedDomainsText),
    controller_email: draft.controllerEmail.trim().toLowerCase(),
    support_email: draft.supportEmail.trim().toLowerCase(),
    booking_mode: draft.bookingMode,
    widget_enabled: draft.widgetEnabled,
    widget_button_label: draft.widgetButtonLabel,
    widget_action_label: draft.widgetActionLabel,
    widget_position: draft.widgetPosition
  };
}

const defaultMemberDraft = {
  full_name: "",
  email: "",
  role: "member" as "calendar_controller" | "member" | "viewer",
  status: "active" as "active" | "inactive"
};

function defaultMeetingDraft(timezone = "Asia/Kolkata") {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    title: "",
    description: "",
    date: start.toISOString().slice(0, 10),
    start_time: start.toTimeString().slice(0, 5),
    end_time: end.toTimeString().slice(0, 5),
    timezone,
    location: "",
    meeting_url: ""
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No meetings yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function locationLabel(type: EventType["location_type"]) {
  return {
    video: "One-on-One",
    phone: "Phone",
    in_person: "In person",
    custom: "Custom"
  }[type];
}

function dateTimeToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function productInitials(product: Product | null) {
  if (!product) {
    return "P";
  }
  if (product.icon) {
    return product.icon.slice(0, 2).toUpperCase();
  }
  return product.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function can(product: Product | null, permission: string) {
  return Boolean(product?.permissions.includes(permission));
}

export default function Dashboard() {
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const productMenuRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [events, setEvents] = useState<EventType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [members, setMembers] = useState<ProductMember[]>([]);
  const [meetings, setMeetings] = useState<ProductMeeting[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [teamAvailability, setTeamAvailability] = useState<TeamAvailability | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(toDateInputValue(new Date()));
  const [availabilityPolicyDraft, setAvailabilityPolicyDraft] = useState<TeamAvailability["policy"] | null>(null);
  const [coverageDrafts, setCoverageDrafts] = useState<
    Record<string, { start_time: string; end_time: string; status: "available" | "unavailable" | "on_leave" }>
  >({});
  const [eventEditorDraft, setEventEditorDraft] = useState<EventEditorDraft>(() => createEventEditorDraft());
  const [eventEditorBaseline, setEventEditorBaseline] = useState("");
  const [eventEditorMode, setEventEditorMode] = useState<"create" | "edit">("create");
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [eventEditorError, setEventEditorError] = useState("");
  const [contactDraft, setContactDraft] = useState(defaultContactDraft);
  const [productDraft, setProductDraft] = useState(defaultProductDraft);
  const [memberDraft, setMemberDraft] = useState(defaultMemberDraft);
  const [meetingDraft, setMeetingDraft] = useState(defaultMeetingDraft());
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [inviteEntireTeam, setInviteEntireTeam] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("scheduling");
  const [schedulingTab, setSchedulingTab] = useState<SchedulingTab>("client-appointments");
  const [eventSearch, setEventSearch] = useState("");
  const [meetingSearch, setMeetingSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [showContactCreate, setShowContactCreate] = useState(false);
  const [showProductCreate, setShowProductCreate] = useState(false);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [showMemberCreate, setShowMemberCreate] = useState(false);
  const [showMeetingCreate, setShowMeetingCreate] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switchingProduct, setSwitchingProduct] = useState(false);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [publicBase, setPublicBase] = useState("");

  const activeMembers = useMemo(
    () => members.filter((member) => member.membership_status === "active"),
    [members]
  );

  const googleCalendarLabel = useMemo(() => {
    if (!googleCalendarStatus) {
      return "Unavailable";
    }
    if (!googleCalendarStatus.enabled) {
      return "Disabled";
    }
    if (!googleCalendarStatus.configured) {
      return "Configuration missing";
    }
    return googleCalendarStatus.connected ? "Connected" : "Not connected";
  }, [googleCalendarStatus]);

  const eventEditorDirty = useMemo(
    () => eventEditorOpen && eventEditorBaseline !== JSON.stringify(eventEditorDraft),
    [eventEditorBaseline, eventEditorDraft, eventEditorOpen]
  );

  const filteredEvents = useMemo(() => {
    const search = eventSearch.trim().toLowerCase();
    return search ? events.filter((item) => item.title.toLowerCase().includes(search)) : events;
  }, [eventSearch, events]);

  const filteredBookings = useMemo(() => {
    const search = meetingSearch.trim().toLowerCase();
    if (!search) {
      return bookings;
    }
    return bookings.filter(
      (item) =>
        item.event_title.toLowerCase().includes(search) ||
        item.invitee_name.toLowerCase().includes(search) ||
        item.invitee_email.toLowerCase().includes(search)
    );
  }, [bookings, meetingSearch]);

  const filteredMeetings = useMemo(() => {
    const search = meetingSearch.trim().toLowerCase();
    if (!search) {
      return meetings;
    }
    return meetings.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.invitations.some((invitation) => invitation.recipient_email.toLowerCase().includes(search))
    );
  }, [meetingSearch, meetings]);

  const filteredContacts = useMemo(() => {
    const search = contactSearch.trim().toLowerCase();
    if (!search) {
      return contacts;
    }
    return contacts.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search) ||
        item.company.toLowerCase().includes(search)
    );
  }, [contactSearch, contacts]);

  const filteredMembers = useMemo(() => {
    const search = teamSearch.trim().toLowerCase();
    if (!search) {
      return members;
    }
    return members.filter(
      (item) =>
        item.full_name.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search) ||
        item.role.toLowerCase().includes(search)
    );
  }, [members, teamSearch]);

  const canCreateProduct = products.some((product) => product.can_create_product);
  const productInactive = selectedProduct?.status === "inactive";

  useEffect(() => {
    setPublicBase(window.location.origin);
    const redirectParams = new URLSearchParams(window.location.search);
    const calendarResult = redirectParams.get("google_calendar");
    if (calendarResult === "connected") {
      setNotice("Google Calendar connected");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (calendarResult === "error") {
      setError(redirectParams.get("google_calendar_message") || "Google Calendar connection failed");
      window.history.replaceState({}, "", "/dashboard");
    }
    setMeetingDraft(defaultMeetingDraft(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"));
    const storedToken = localStorage.getItem("calendar_token");
    if (!storedToken) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
    loadInitialData(storedToken).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (productMenuRef.current && !productMenuRef.current.contains(target)) {
        setProductMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setProductMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!token || !selectedProduct) {
      return;
    }
    api
      .teamAvailability(token, selectedProduct.id, availabilityDate)
      .then(applyTeamAvailability)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load team availability"));
  }, [availabilityDate, selectedProduct?.id, token]);

  async function loadInitialData(tokenValue: string) {
    try {
      const [me, productItems, calendarStatus] = await Promise.all([
        api.me(tokenValue),
        api.products(tokenValue),
        api.googleCalendarStatus(tokenValue).catch(() => null)
      ]);
      setUser(me);
      setGoogleCalendarStatus(calendarStatus);
      setProducts(productItems);
      const storedProductId = localStorage.getItem(selectedProductKey);
      const restored = productItems.find((product) => product.id === storedProductId) || productItems[0] || null;
      setSelectedProduct(restored);
      if (restored) {
        localStorage.setItem(selectedProductKey, restored.id);
        await refreshProductData(tokenValue, restored.id);
      } else {
        localStorage.removeItem(selectedProductKey);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
      if ((caught as { status?: number }).status === 401) {
        logout();
      }
    }
  }

  async function refreshProducts(tokenValue = token, activeProductId = selectedProduct?.id) {
    const productItems = await api.products(tokenValue);
    setProducts(productItems);
    if (activeProductId) {
      const latest = productItems.find((product) => product.id === activeProductId) || productItems[0] || null;
      setSelectedProduct(latest);
      if (latest) {
        localStorage.setItem(selectedProductKey, latest.id);
      }
    }
    return productItems;
  }

  function applyTeamAvailability(nextTeamAvailability: TeamAvailability) {
    setTeamAvailability(nextTeamAvailability);
    setAvailabilityPolicyDraft(nextTeamAvailability.policy);
    setCoverageDrafts(
      nextTeamAvailability.coverage.reduce<
        Record<string, { start_time: string; end_time: string; status: "available" | "unavailable" | "on_leave" }>
      >((drafts, record) => {
        drafts[record.id] = {
          start_time: record.start_time,
          end_time: record.end_time,
          status: record.status === "on_leave" || record.status === "unavailable" ? record.status : "available"
        };
        return drafts;
      }, {})
    );
  }

  async function refreshProductData(tokenValue = token, productId = selectedProduct?.id) {
    if (!productId) {
      return;
    }
    const [
      dashboardStats,
      eventTypes,
      bookingItems,
      contactItems,
      availabilityRules,
      memberItems,
      meetingItems,
      teamAvailabilityRules
    ] =
      await Promise.all([
        api.stats(tokenValue, productId),
        api.eventTypes(tokenValue, productId),
        api.bookings(tokenValue, productId),
        api.contacts(tokenValue, "", productId),
        api.availability(tokenValue, productId),
        api.productMembers(tokenValue, productId),
        api.productMeetings(tokenValue, productId),
        api.teamAvailability(tokenValue, productId, availabilityDate)
      ]);
    setStats({ ...emptyStats, ...dashboardStats });
    setEvents(eventTypes);
    setBookings(bookingItems);
    setContacts(contactItems);
    setAvailability(availabilityRules);
    applyTeamAvailability(teamAvailabilityRules);
    setMembers(memberItems);
    setMeetings(meetingItems);
    setSelectedRecipients((current) =>
      current.filter((recipientId) =>
        memberItems.some((member) => member.user_id === recipientId && member.membership_status === "active")
      )
    );
  }

  async function selectProduct(product: Product) {
    if (product.id === selectedProduct?.id) {
      setProductMenuOpen(false);
      return;
    }
    setSelectedProduct(product);
    setProductMenuOpen(false);
    setSwitchingProduct(true);
    setError("");
    localStorage.setItem(selectedProductKey, product.id);
    try {
      await refreshProductData(token, product.id);
      setNotice(`Switched to ${product.name}`);
    } catch (caught) {
      localStorage.removeItem(selectedProductKey);
      setError(caught instanceof Error ? caught.message : "Unable to switch product");
    } finally {
      setSwitchingProduct(false);
    }
  }

  function logout() {
    localStorage.removeItem("calendar_token");
    localStorage.removeItem("calendar_user");
    localStorage.removeItem(selectedProductKey);
    router.replace("/login");
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("product");
    setError("");
    try {
      const created = await api.createProduct(token, productPayloadFromDraft(productDraft));
      setProducts((current) => [...current, created]);
      setSelectedProduct(created);
      localStorage.setItem(selectedProductKey, created.id);
      await refreshProductData(token, created.id);
      setProductDraft(defaultProductDraft);
      setShowProductCreate(false);
      setProductMenuOpen(false);
      setNotice("Product created");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create product");
    } finally {
      setSaving("");
    }
  }

  async function updateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }
    setSaving("product-update");
    setError("");
    try {
      const updated = await api.updateProduct(token, selectedProduct.id, productPayloadFromDraft(productDraft));
      setSelectedProduct(updated);
      setProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
      setShowProductEdit(false);
      setNotice("Product updated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update product");
    } finally {
      setSaving("");
    }
  }

  function openEventEditor(mode: "create" | "edit", eventType: EventType | null = null) {
    const fallbackTimezone =
      availabilityPolicyDraft?.timezone ||
      availability?.timezone ||
      user?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Asia/Kolkata";
    const nextDraft = createEventEditorDraft(eventType, fallbackTimezone);
    setEventEditorDraft(nextDraft);
    setEventEditorBaseline(JSON.stringify(nextDraft));
    setEventEditorMode(mode);
    setEditingEvent(eventType);
    setEventEditorError("");
    setEventEditorOpen(true);
  }

  function closeEventEditor() {
    setEventEditorOpen(false);
    setEditingEvent(null);
    setEventEditorError("");
    setSaving("");
  }

  async function submitEventEditor() {
    if (!selectedProduct) {
      return;
    }
    const validation = validateEventEditorDraft(eventEditorDraft, googleCalendarStatus);
    if (validation) {
      setEventEditorError(validation);
      return;
    }
    setSaving(eventEditorMode === "edit" && editingEvent ? `event-edit:${editingEvent.id}` : "event");
    setError("");
    setEventEditorError("");
    try {
      const payload = eventDraftToPayload(eventEditorDraft);
      const saved =
        eventEditorMode === "edit" && editingEvent
          ? await api.updateEventType(token, editingEvent.id, payload, selectedProduct.id)
          : await api.createEventType(token, payload, selectedProduct.id);
      setEvents((current) =>
        eventEditorMode === "edit" && editingEvent
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      );
      await refreshProductData(token, selectedProduct.id);
      setEventEditorDraft(createEventEditorDraft());
      setEventEditorBaseline("");
      setEditingEvent(null);
      setEventEditorOpen(false);
      setNotice(eventEditorMode === "edit" ? "Event type updated" : "Event type created");
    } catch (caught) {
      setEventEditorError(caught instanceof Error ? caught.message : "Unable to save event type");
    } finally {
      setSaving("");
    }
  }

  async function toggleEvent(eventType: EventType) {
    if (!selectedProduct) {
      return;
    }
    setSaving(eventType.id);
    try {
      const updated = await api.updateEventType(token, eventType.id, { active: !eventType.active }, selectedProduct.id);
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await refreshProductData(token, selectedProduct.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update event type");
    } finally {
      setSaving("");
    }
  }

  async function deleteEvent(eventType: EventType) {
    if (!selectedProduct) {
      return;
    }
    if (!window.confirm(`Delete ${eventType.title}? This removes the public booking link for this event type.`)) {
      return;
    }
    setSaving(eventType.id);
    try {
      await api.deleteEventType(token, eventType.id, selectedProduct.id);
      setEvents((current) => current.filter((item) => item.id !== eventType.id));
      await refreshProductData(token, selectedProduct.id);
      if (editingEvent?.id === eventType.id) {
        closeEventEditor();
      }
      setNotice("Event type deleted");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete event type");
    } finally {
      setSaving("");
    }
  }

  async function copyLink(path: string) {
    await navigator.clipboard.writeText(`${publicBase}${path}`);
    setNotice("Public link copied");
  }

  async function copyInvitationLink(link: string) {
    await navigator.clipboard.writeText(link);
    setNotice("Invitation link copied");
  }

  async function refreshGoogleCalendarStatus(tokenValue = token) {
    if (!tokenValue) {
      return;
    }
    try {
      setGoogleCalendarStatus(await api.googleCalendarStatus(tokenValue));
    } catch (caught) {
      setGoogleCalendarStatus(null);
    }
  }

  async function connectGoogleCalendar(reconnect = false) {
    if (!token) {
      return;
    }
    setSaving(reconnect ? "google-reconnect" : "google-connect");
    setError("");
    try {
      const response = reconnect
        ? await api.reconnectGoogleCalendar(token)
        : await api.connectGoogleCalendar(token);
      window.location.href = response.authorization_url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start Google Calendar connection");
      setSaving("");
    }
  }

  async function disconnectGoogleCalendar() {
    if (!token) {
      return;
    }
    if (!window.confirm("Disconnect Google Calendar from this account?")) {
      return;
    }
    setSaving("google-disconnect");
    setError("");
    try {
      await api.disconnectGoogleCalendar(token);
      await refreshGoogleCalendarStatus(token);
      setNotice("Google Calendar disconnected");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to disconnect Google Calendar");
    } finally {
      setSaving("");
    }
  }

  function openProfileView(view: WorkspaceView) {
    setActiveView(view);
    setProfileMenuOpen(false);
  }

  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }
    setSaving("contact");
    setError("");
    try {
      const created = await api.createContact(token, contactDraft, selectedProduct.id);
      setContacts((current) => [created, ...current]);
      setContactDraft(defaultContactDraft);
      setShowContactCreate(false);
      setNotice("Contact added");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add contact");
    } finally {
      setSaving("");
    }
  }

  async function deleteContact(contact: Contact) {
    if (!selectedProduct) {
      return;
    }
    setSaving(contact.id);
    try {
      await api.deleteContact(token, contact.id, selectedProduct.id);
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setNotice("Contact removed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove contact");
    } finally {
      setSaving("");
    }
  }

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }
    const normalizedEmail = memberDraft.email.trim().toLowerCase();
    if (organizationDomain && !normalizedEmail.endsWith(`@${organizationDomain.toLowerCase()}`)) {
      setError(`Use an organization email ending in @${organizationDomain}`);
      return;
    }
    setSaving("member");
    setError("");
    try {
      const member = await api.addProductMember(token, selectedProduct.id, { ...memberDraft, email: normalizedEmail });
      setMembers((current) => [...current, member]);
      await refreshProducts(token, selectedProduct.id);
      setMemberDraft(defaultMemberDraft);
      setShowMemberCreate(false);
      setNotice("Team member added");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add team member");
    } finally {
      setSaving("");
    }
  }

  async function removeMember(member: ProductMember) {
    if (!selectedProduct) {
      return;
    }
    if (!window.confirm(`Remove ${member.full_name} from ${selectedProduct.name}?`)) {
      return;
    }
    setSaving(member.id);
    try {
      await api.removeProductMember(token, selectedProduct.id, member.id);
      await Promise.all([refreshProductData(token, selectedProduct.id), refreshProducts(token, selectedProduct.id)]);
      setNotice("Team member removed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove team member");
    } finally {
      setSaving("");
    }
  }

  async function createMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }
    setSaving("meeting");
    setError("");
    try {
      const created = await api.createProductMeeting(token, selectedProduct.id, {
        title: meetingDraft.title,
        description: meetingDraft.description,
        start_time: dateTimeToIso(meetingDraft.date, meetingDraft.start_time),
        end_time: dateTimeToIso(meetingDraft.date, meetingDraft.end_time),
        timezone: meetingDraft.timezone,
        location: meetingDraft.location,
        meeting_url: meetingDraft.meeting_url,
        recipient_user_ids: selectedRecipients,
        invite_entire_team: inviteEntireTeam
      });
      setMeetings((current) => [created, ...current]);
      await refreshProductData(token, selectedProduct.id);
      setMeetingDraft(defaultMeetingDraft(meetingDraft.timezone));
      setSelectedRecipients([]);
      setInviteEntireTeam(false);
      setShowMeetingCreate(false);
      setNotice(
        created.pending_email_count > 0
          ? "Invitation created. Email delivery is not enabled yet."
          : "Meeting invitations created"
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create meeting");
    } finally {
      setSaving("");
    }
  }

  function updateWindow(index: number, key: "enabled" | "start" | "end", value: boolean | string) {
    setAvailability((current) => {
      if (!current) {
        return current;
      }
      const windows = current.windows.map((window, windowIndex) =>
        windowIndex === index ? { ...window, [key]: value } : window
      );
      return { ...current, windows };
    });
  }

  async function saveAvailability() {
    if (!availability || !selectedProduct) {
      return;
    }
    setSaving("availability");
    setError("");
    try {
      const updated = await api.updateAvailability(token, availability, selectedProduct.id);
      setAvailability(updated);
      setNotice("Availability saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save availability");
    } finally {
      setSaving("");
    }
  }

  async function reloadTeamAvailability() {
    if (!selectedProduct) {
      return;
    }
    const updated = await api.teamAvailability(token, selectedProduct.id, availabilityDate);
    applyTeamAvailability(updated);
  }

  async function saveAvailabilityPolicy() {
    if (!availabilityPolicyDraft || !selectedProduct) {
      return;
    }
    setSaving("availability-policy");
    setError("");
    try {
      await api.updateAvailabilityPolicy(selectedProduct ? token : "", selectedProduct.id, availabilityPolicyDraft);
      await reloadTeamAvailability();
      setNotice("Availability policy saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save availability policy");
    } finally {
      setSaving("");
    }
  }

  async function generateAvailability(forceRegenerate = false) {
    if (!selectedProduct) {
      return;
    }
    setSaving("availability-generate");
    setError("");
    try {
      await api.generateAvailability(token, selectedProduct.id, availabilityDate, forceRegenerate);
      await reloadTeamAvailability();
      setNotice(forceRegenerate ? "Schedule regenerated" : "Schedule generated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate availability");
    } finally {
      setSaving("");
    }
  }

  function updateCoverageDraft(
    recordId: string,
    key: "start_time" | "end_time" | "status",
    value: string | "available" | "unavailable" | "on_leave"
  ) {
    setCoverageDrafts((current) => ({
      ...current,
      [recordId]: {
        ...current[recordId],
        [key]: value
      }
    }));
  }

  async function saveMemberAvailability(record: MemberAvailability) {
    if (!selectedProduct) {
      return;
    }
    const draft = coverageDrafts[record.id];
    if (!draft) {
      return;
    }
    setSaving(record.id);
    setError("");
    try {
      await api.updateMemberAvailability(token, selectedProduct.id, record.member_id, {
        member_id: record.member_id,
        date: availabilityDate,
        start_time: draft.start_time,
        end_time: draft.end_time,
        timezone: availabilityPolicyDraft?.timezone || record.timezone,
        source: "MANUAL",
        status: draft.status,
        change_reason: "Manual availability override from Availability page"
      });
      await reloadTeamAvailability();
      setNotice("Member availability saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save member availability");
    } finally {
      setSaving("");
    }
  }

  async function cancelBooking(booking: Booking) {
    if (!selectedProduct) {
      return;
    }
    setSaving(booking.id);
    try {
      await api.cancelBooking(token, booking.id, "Cancelled from dashboard", selectedProduct.id);
      await refreshProductData(token, selectedProduct.id);
      setNotice("Booking cancelled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel booking");
    } finally {
      setSaving("");
    }
  }

  async function cancelClientBooking(booking: TeamAvailability["bookings"][number]) {
    if (!selectedProduct) {
      return;
    }
    if (!window.confirm(`Cancel ${booking.issue_title}?`)) {
      return;
    }
    setSaving(booking.id);
    setError("");
    try {
      await api.cancelClientBooking(token, booking.id, "Cancelled from Scheduling page", selectedProduct.id);
      await reloadTeamAvailability();
      setNotice("Client booking cancelled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel client booking");
    } finally {
      setSaving("");
    }
  }

  async function assignClientBooking(booking: TeamAvailability["bookings"][number], memberId: string) {
    if (!selectedProduct || !memberId) {
      return;
    }
    setSaving(`assign:${booking.id}`);
    setError("");
    try {
      await api.assignClientBooking(token, selectedProduct.id, booking.id, memberId, "Assigned from Scheduling page");
      await reloadTeamAvailability();
      setNotice("Booking assignment updated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign booking");
    } finally {
      setSaving("");
    }
  }

  async function approveClientBooking(booking: TeamAvailability["bookings"][number]) {
    if (!selectedProduct) {
      return;
    }
    setSaving(`approve:${booking.id}`);
    setError("");
    try {
      await api.approveClientBooking(token, selectedProduct.id, booking.id, "Approved from Scheduling page");
      await reloadTeamAvailability();
      setNotice("Booking approved and notifications triggered");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to approve booking");
    } finally {
      setSaving("");
    }
  }

  async function rejectClientBooking(booking: TeamAvailability["bookings"][number]) {
    if (!selectedProduct || !window.confirm(`Reject ${booking.issue_title}?`)) {
      return;
    }
    setSaving(`reject:${booking.id}`);
    setError("");
    try {
      await api.rejectClientBooking(token, selectedProduct.id, booking.id, "Rejected from Scheduling page");
      await reloadTeamAvailability();
      setNotice("Booking request rejected");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reject booking");
    } finally {
      setSaving("");
    }
  }

  function exportMeetings() {
    const rows = [
      ["Type", "Title", "Invitee", "Email", "Start", "Status"],
      ...filteredMeetings.flatMap((meeting) =>
        meeting.invitations.map((invitation) => [
          "Invitation",
          meeting.title,
          invitation.recipient_name || invitation.recipient_email,
          invitation.recipient_email,
          meeting.start_time,
          invitation.email_delivery_status
        ])
      ),
      ...filteredBookings.map((booking) => [
        "Booking",
        booking.event_title,
        booking.invitee_name,
        booking.invitee_email,
        booking.start_utc,
        booking.status
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedProduct?.name || "product"}-meetings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function navButton(view: WorkspaceView, icon: ReactNode, label: string) {
    return (
      <button className={activeView === view ? "active" : ""} onClick={() => setActiveView(view)} type="button">
        {icon}
        {label}
      </button>
    );
  }

  function profileMenuButton(view: WorkspaceView, icon: ReactNode, label: string) {
    return (
      <button
        className={activeView === view ? "active" : ""}
        onClick={() => openProfileView(view)}
        role="menuitem"
        type="button"
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  function beginProductEdit() {
    if (!selectedProduct) {
      return;
    }
    setProductDraft({
      name: selectedProduct.name,
      description: selectedProduct.description,
      icon: selectedProduct.icon,
      color: selectedProduct.color,
      status: selectedProduct.status,
      approvedDomainsText: (selectedProduct.approved_domains || []).join("\n"),
      controllerEmail: selectedProduct.controller_email || "",
      supportEmail: selectedProduct.support_email || "",
      bookingMode: selectedProduct.booking_mode || "instant",
      widgetEnabled: selectedProduct.widget_enabled,
      widgetButtonLabel: selectedProduct.widget_button_label || "Book Now",
      widgetActionLabel: selectedProduct.widget_action_label || "Schedule to connect team",
      widgetPosition: selectedProduct.widget_position || "right"
    });
    setShowProductEdit(true);
    setActiveView("product-settings");
  }

  function openProductCreate() {
    setProductDraft(defaultProductDraft);
    setProductMenuOpen(false);
    setShowProductCreate(true);
  }

  if (loading) {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={28} />
        <span>Loading workspace</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="center-state">
        <span>{error || "No active session"}</span>
      </main>
    );
  }

  return (
    <main className="app-frame calendly-frame">
      <aside className="cal-sidebar">
        <div className="cal-sidebar-top">
          <a className="cal-logo" href="/dashboard" aria-label="Calendar Booking dashboard">
            <CalendarCheck size={28} />
            <span>Calendar Booking</span>
          </a>

          <div className="product-selector" ref={productMenuRef}>
            <button
              aria-expanded={productMenuOpen}
              aria-haspopup="listbox"
              aria-label="Select product"
              className="product-trigger"
              onClick={() => setProductMenuOpen((current) => !current)}
              type="button"
            >
              <ProductAvatar product={selectedProduct} />
              <span>
                <small>Product</small>
                <strong>{selectedProduct?.name || "No product"}</strong>
              </span>
              {switchingProduct ? <Loader2 className="spin" size={16} /> : <ChevronDown size={16} />}
            </button>
            {productMenuOpen && (
              <div className="product-menu" role="listbox" aria-label="Available products">
                {products.length === 0 && <p className="product-empty">No authorized products found</p>}
                {products.map((product) => (
                  <button
                    aria-selected={selectedProduct?.id === product.id}
                    className={selectedProduct?.id === product.id ? "active" : ""}
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    role="option"
                    type="button"
                  >
                    <ProductAvatar product={product} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.member_count} members - {product.status}
                      </small>
                    </span>
                  </button>
                ))}
                {canCreateProduct && (
                  <button
                    className="product-menu-create"
                    onClick={openProductCreate}
                    type="button"
                  >
                    <Plus size={16} />
                    Add New Product
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            className="sidebar-create"
            disabled={!selectedProduct || productInactive}
            onClick={() => openEventEditor("create")}
            type="button"
          >
            <Plus size={18} />
            Create
          </button>
          <nav className="cal-nav" aria-label="Workspace navigation">
            {navButton("scheduling", <Link2 size={18} />, "Scheduling")}
            {navButton("meetings", <CalendarClock size={18} />, "Meetings")}
            {navButton("team", <Users size={18} />, "Team")}
            {navButton("availability", <Clock3 size={18} />, "Availability")}
            {navButton("contacts", <Users size={18} />, "Contacts")}
            {navButton("analytics", <BarChart3 size={18} />, "Analytics")}
            {navButton("product-settings", <Building2 size={18} />, "Product settings")}
          </nav>
        </div>
        <div className="cal-sidebar-bottom">
          <button type="button">Upgrade plan</button>
          <button type="button">
            <HelpCircle size={18} />
            Help
          </button>
          <button onClick={logout} type="button">
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <section className="cal-content">
        <header className="cal-topbar">
          <span className="active-product-badge">
            <ProductAvatar product={selectedProduct} />
            {selectedProduct?.name || "No active product"}
          </span>
          <a href="#" onClick={(event) => event.preventDefault()}>
            Get Notetaker
          </a>
          <button
            className="icon-button"
            disabled={!selectedProduct || !can(selectedProduct, "manage_members")}
            onClick={() => {
              setActiveView("team");
              setShowMemberCreate(true);
            }}
            title="Add teammate"
            type="button"
          >
            <UserPlus size={18} />
          </button>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              className={`account-chip compact profile-trigger ${profileMenuOpen ? "open" : ""}`}
              onClick={() => setProfileMenuOpen((current) => !current)}
              type="button"
            >
              <span>{user.name.charAt(0).toUpperCase()}</span>
              <ChevronDown size={15} />
            </button>
            {profileMenuOpen && (
              <div className="profile-menu-panel" role="menu">
                <div className="profile-menu-head">
                  <strong>{user.name}</strong>
                  <p>
                    Teams Plus free trial <button type="button">Upgrade</button>
                  </p>
                  <span>{user.email}</span>
                </div>
                <div className="profile-menu-section">
                  <small>Account settings</small>
                  {profileMenuButton("profile", <UserIcon size={18} />, "Profile")}
                  {profileMenuButton("branding", <Star size={18} />, "Branding")}
                  {profileMenuButton("my-link", <Link2 size={18} />, "My Link")}
                  {profileMenuButton("notetaker-settings", <Sparkles size={18} />, "Notetaker settings")}
                  {profileMenuButton("callie-settings", <Mail size={18} />, "Callie settings")}
                  {profileMenuButton("all-settings", <MoreVertical size={18} />, "All settings")}
                </div>
                <div className="profile-menu-section">
                  <small>Resources</small>
                  {profileMenuButton("getting-started", <BookOpen size={18} />, "Getting started guide")}
                  {profileMenuButton("community", <MessageCircle size={18} />, "Community")}
                  <button onClick={logout} role="menuitem" type="button">
                    <LogOut size={18} />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {notice && (
          <button className="toast" type="button" onClick={() => setNotice("")}>
            <Check size={16} />
            {notice}
          </button>
        )}
        {error && (
          <button className="toast error" type="button" onClick={() => setError("")}>
            <X size={16} />
            {error}
          </button>
        )}

        {showProductCreate && (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowProductCreate(false);
              }
            }}
          >
            <form
              aria-labelledby="create-product-title"
              aria-modal="true"
              className="modal-card product-modal"
              onSubmit={createProduct}
              role="dialog"
            >
              <div className="panel-heading">
                <div>
                  <h2 id="create-product-title">Add product</h2>
                  <p>Create a product workspace with its own team, meetings, and invitations.</p>
                </div>
                <button
                  aria-label="Close add product dialog"
                  className="icon-button"
                  onClick={() => setShowProductCreate(false)}
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="event-form">
                <label>
                  Product name
                  <input
                    autoFocus
                    placeholder="Product name"
                    value={productDraft.name}
                    onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Icon or initials
                  <input
                    maxLength={10}
                    placeholder="Icon or initials"
                    value={productDraft.icon}
                    onChange={(event) => setProductDraft((current) => ({ ...current, icon: event.target.value }))}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={productDraft.status}
                    onChange={(event) =>
                      setProductDraft((current) => ({
                        ...current,
                        status: event.target.value as "active" | "inactive"
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="wide-field">
                  Description
                  <textarea
                    placeholder="Optional product description"
                    value={productDraft.description}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={productDraft.color}
                    onChange={(event) => setProductDraft((current) => ({ ...current, color: event.target.value }))}
                  />
                </label>
                <label className="wide-field">
                  Approved website domains
                  <textarea
                    placeholder="https://www.example.com"
                    value={productDraft.approvedDomainsText}
                    onChange={(event) => setProductDraft((current) => ({ ...current, approvedDomainsText: event.target.value }))}
                  />
                  <small className="field-note">One domain per line. Required before embedding this widget on an external website.</small>
                </label>
                <label>
                  Controller email
                  <input
                    type="email"
                    value={productDraft.controllerEmail}
                    onChange={(event) => setProductDraft((current) => ({ ...current, controllerEmail: event.target.value }))}
                  />
                </label>
                <label>
                  Booking mode
                  <select
                    value={productDraft.bookingMode}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, bookingMode: event.target.value as "instant" | "approval" }))
                    }
                  >
                    <option value="instant">Instant booking</option>
                    <option value="approval">Approval required</option>
                  </select>
                </label>
                <label className="wide-field">
                  Widget action label
                  <input
                    value={productDraft.widgetActionLabel}
                    onChange={(event) => setProductDraft((current) => ({ ...current, widgetActionLabel: event.target.value }))}
                  />
                </label>
                <button className="blue-action full wide-field" disabled={saving === "product"} type="submit">
                  {saving === "product" ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                  Add product
                </button>
              </div>
            </form>
          </div>
        )}

        {!selectedProduct && (
          <section className="cal-page">
            <EmptyState
              icon={<Building2 size={34} />}
              title="No authorized products"
              copy="You do not currently have access to a product. Ask an administrator to add you or create a product if your role allows it."
              actionLabel={canCreateProduct ? "Add New Product" : undefined}
              onAction={canCreateProduct ? openProductCreate : undefined}
            />
          </section>
        )}

        {selectedProduct && (
          <>
            {productInactive && (
              <div className="inline-alert">
                <ShieldCheck size={18} />
                This product is inactive. You can review existing data, but creation actions are disabled.
              </div>
            )}

            {activeView === "scheduling" && (
              <SchedulingPage
                activeTab={schedulingTab}
                canManage={can(selectedProduct, "manage_event_types")}
                canManageAppointments={can(selectedProduct, "manage_availability")}
                events={events}
                productInactive={productInactive}
                publicBase={publicBase}
                search={eventSearch}
                selectedProduct={selectedProduct}
                saving={saving}
                stats={stats}
                teamAvailability={teamAvailability}
                user={user}
                onApproveClientBooking={approveClientBooking}
                onAssignClientBooking={assignClientBooking}
                onCancelClientBooking={cancelClientBooking}
                onCopyLink={copyLink}
                onCreate={() => openEventEditor("create")}
                onDelete={deleteEvent}
                onEdit={(eventType) => openEventEditor("edit", eventType)}
                onRejectClientBooking={rejectClientBooking}
                onSearchChange={setEventSearch}
                onTabChange={setSchedulingTab}
                onToggleActive={toggleEvent}
                onUseAvailability={() => setActiveView("availability")}
              />
            )}

            {activeView === "meetings" && (
              <section className="cal-page">
                <div className="cal-page-head">
                  <h1>Meetings</h1>
                  <button
                    className="blue-action"
                    disabled={productInactive || !can(selectedProduct, "create_meetings")}
                    onClick={() => setShowMeetingCreate(true)}
                    type="button"
                  >
                    <Send size={18} />
                    Invite team
                  </button>
                </div>
                <div className="cal-toolbar">
                  <button className="outline-action" type="button">
                    {selectedProduct.name}
                    <ChevronDown size={16} />
                  </button>
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      aria-label="Search meetings"
                      placeholder="Search meetings"
                      value={meetingSearch}
                      onChange={(event) => setMeetingSearch(event.target.value)}
                    />
                  </label>
                  <button className="outline-action" type="button">
                    <Filter size={16} />
                    Filter
                    <ChevronDown size={16} />
                  </button>
                  <button className="ghost-command" onClick={exportMeetings} type="button">
                    Export meetings
                  </button>
                </div>

                {showMeetingCreate && (
                  <form className="cal-create-card" onSubmit={createMeeting}>
                    <div className="panel-heading">
                      <div>
                        <h2>Create team meeting</h2>
                        <p>Recipients are validated against the active product team before invitations are saved.</p>
                      </div>
                      <button className="icon-button" onClick={() => setShowMeetingCreate(false)} type="button">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="event-form">
                      <label>
                        Title
                        <input
                          value={meetingDraft.title}
                          onChange={(event) => setMeetingDraft((current) => ({ ...current, title: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={meetingDraft.date}
                          onChange={(event) => setMeetingDraft((current) => ({ ...current, date: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Time zone
                        <input
                          value={meetingDraft.timezone}
                          onChange={(event) => setMeetingDraft((current) => ({ ...current, timezone: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Start time
                        <input
                          type="time"
                          value={meetingDraft.start_time}
                          onChange={(event) =>
                            setMeetingDraft((current) => ({ ...current, start_time: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        End time
                        <input
                          type="time"
                          value={meetingDraft.end_time}
                          onChange={(event) => setMeetingDraft((current) => ({ ...current, end_time: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Virtual URL
                        <input
                          type="url"
                          value={meetingDraft.meeting_url}
                          onChange={(event) =>
                            setMeetingDraft((current) => ({ ...current, meeting_url: event.target.value }))
                          }
                          placeholder="https://"
                        />
                      </label>
                      <label className="wide-field">
                        Description or agenda
                        <textarea
                          value={meetingDraft.description}
                          onChange={(event) =>
                            setMeetingDraft((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </label>
                      <label className="wide-field">
                        Location
                        <input
                          value={meetingDraft.location}
                          onChange={(event) =>
                            setMeetingDraft((current) => ({ ...current, location: event.target.value }))
                          }
                        />
                      </label>
                      <div className="recipient-panel wide-field">
                        <label className="toggle-label">
                          <input
                            checked={inviteEntireTeam}
                            onChange={(event) => setInviteEntireTeam(event.target.checked)}
                            type="checkbox"
                          />
                          <span>Invite entire product team</span>
                        </label>
                        {!inviteEntireTeam && (
                          <div className="recipient-grid" role="group" aria-label="Meeting recipients">
                            {activeMembers.map((member) => (
                              <label className="recipient-option" key={member.id}>
                                <input
                                  checked={selectedRecipients.includes(member.user_id)}
                                  onChange={(event) =>
                                    setSelectedRecipients((current) =>
                                      event.target.checked
                                        ? [...current, member.user_id]
                                        : current.filter((recipientId) => recipientId !== member.user_id)
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>
                                  <strong>{member.full_name}</strong>
                                  <small>{member.email}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        <small className="form-hint">
                          Review recipients before creating the meeting. Email delivery can remain disabled without blocking the meeting.
                        </small>
                      </div>
                      <button className="blue-action full wide-field" disabled={saving === "meeting"} type="submit">
                        {saving === "meeting" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                        Create meeting and invitations
                      </button>
                    </div>
                  </form>
                )}

                {filteredMeetings.length === 0 && filteredBookings.length === 0 ? (
                  <div className="hero-empty">
                    <div>
                      <h2>Prepare for your first product meeting</h2>
                      <p>
                        Invite selected team members, generate secure invitation links, and keep delivery status visible while
                        provider integration is completed.
                      </p>
                      <button className="blue-action" onClick={() => setShowMeetingCreate(true)} type="button">
                        <CalendarClock size={18} />
                        Create meeting
                      </button>
                    </div>
                    <div className="meeting-illustration">
                      <span>Pending email</span>
                      <strong>Invitation record created</strong>
                      <small>Copy secure link</small>
                    </div>
                  </div>
                ) : (
                  <div className="list-stack">
                    {filteredMeetings.map((meeting) => (
                      <article className="meeting-card" key={meeting.id}>
                        <div className="meeting-card-head">
                          <div>
                            <strong>{meeting.title}</strong>
                            <span>{formatDateTime(meeting.start_time)}</span>
                          </div>
                          <div className={`status-pill ${meeting.status}`}>{meeting.status}</div>
                        </div>
                        <p>{meeting.description || "No agenda added"}</p>
                        <div className="invitation-list">
                          {meeting.invitations.map((invitation) => (
                            <div className="invitation-row" key={invitation.id}>
                              <span>
                                <strong>{invitation.recipient_name || invitation.recipient_email}</strong>
                                <small>{invitation.recipient_email}</small>
                              </span>
                              <span className="delivery-status">{invitation.email_delivery_status}</span>
                              <button
                                className="outline-action compact"
                                onClick={() => copyInvitationLink(invitation.invitation_link)}
                                type="button"
                              >
                                <Copy size={16} />
                                Copy link
                              </button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                    {filteredBookings.map((booking) => (
                      <article className="list-item booking-item" key={booking.id}>
                        <div>
                          <strong>{booking.event_title}</strong>
                          <span>{formatDateTime(booking.start_utc)}</span>
                          <span>
                            {booking.invitee_name} - {booking.invitee_email}
                          </span>
                        </div>
                        <div className={`status-pill ${booking.status}`}>{booking.status}</div>
                        {booking.status === "scheduled" && (
                          <button className="icon-button danger" onClick={() => cancelBooking(booking)} type="button">
                            {saving === booking.id ? <Loader2 className="spin" size={16} /> : <X size={16} />}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeView === "team" && (
              <section className="cal-page">
                <div className="cal-page-head">
                  <h1>Team</h1>
                  <button
                    className="blue-action"
                    disabled={productInactive || !can(selectedProduct, "manage_members")}
                    onClick={() => setShowMemberCreate(true)}
                    type="button"
                  >
                    <UserPlus size={18} />
                    Add member
                  </button>
                </div>
                <div className="cal-toolbar">
                  <label className="search-field wide-search">
                    <Search size={18} />
                    <input
                      aria-label="Search team"
                      placeholder="Search team"
                      value={teamSearch}
                      onChange={(event) => setTeamSearch(event.target.value)}
                    />
                  </label>
                </div>

                {showMemberCreate && (
                  <form className="cal-create-card" onSubmit={addMember}>
                    <div className="panel-heading">
                      <div>
                        <h2>Add product member</h2>
                        <p>Backend validation enforces the configured organization email domain.</p>
                      </div>
                      <button className="icon-button" onClick={() => setShowMemberCreate(false)} type="button">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="event-form">
                      <label>
                        Full name
                        <input
                          value={memberDraft.full_name}
                          onChange={(event) =>
                            setMemberDraft((current) => ({ ...current, full_name: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Organization email
                        <input
                          type="email"
                          placeholder={organizationDomain ? `name@${organizationDomain}` : "name@organization-domain"}
                          value={memberDraft.email}
                          onChange={(event) => setMemberDraft((current) => ({ ...current, email: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Role
                        <select
                          value={memberDraft.role}
                          onChange={(event) =>
                            setMemberDraft((current) => ({
                              ...current,
                              role: event.target.value as "calendar_controller" | "member" | "viewer"
                            }))
                          }
                        >
                          <option value="member">Member</option>
                          <option value="calendar_controller">Calendar Controller</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </label>
                      <button className="blue-action full wide-field" disabled={saving === "member"} type="submit">
                        {saving === "member" ? <Loader2 className="spin" size={18} /> : <UserPlus size={18} />}
                        Save member
                      </button>
                    </div>
                  </form>
                )}

                {filteredMembers.length === 0 ? (
                  <EmptyState
                    icon={<Users size={34} />}
                    title="No team members found"
                    copy="Add organization members to this product so they can be selected for invitations."
                    actionLabel={can(selectedProduct, "manage_members") ? "Add member" : undefined}
                    onAction={can(selectedProduct, "manage_members") ? () => setShowMemberCreate(true) : undefined}
                  />
                ) : (
                  <div className="contacts-table team-table">
                    <div className="contacts-row head">
                      <strong>Name</strong>
                      <strong>Email</strong>
                      <strong>Role</strong>
                      <strong>Status</strong>
                      <strong>Invitation</strong>
                      <span />
                    </div>
                    {filteredMembers.map((member) => (
                      <div className="contacts-row team-row" key={member.id}>
                        <span>{member.full_name}</span>
                        <span>{member.email}</span>
                        <span>{member.role.replace("_", " ")}</span>
                        <span>{member.membership_status}</span>
                        <span>{member.invitation_status}</span>
                        <button
                          className="icon-button danger"
                          disabled={saving === member.id || member.user_id === user.id || !can(selectedProduct, "manage_members")}
                          onClick={() => removeMember(member)}
                          type="button"
                        >
                          {saving === member.id ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeView === "contacts" && (
              <section className="cal-page">
                <div className="cal-page-head">
                  <h1>Contacts</h1>
                  <button
                    className="blue-action"
                    disabled={productInactive || !can(selectedProduct, "manage_contacts")}
                    onClick={() => setShowContactCreate(true)}
                    type="button"
                  >
                    <Plus size={18} />
                    Add contact
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="gmail-banner">
                  <Mail size={42} />
                  <div>
                    <strong>Provider-ready email workflow</strong>
                    <p>Email delivery is routed through the backend provider layer, so SendGrid, SMTP, or another provider can be added safely.</p>
                  </div>
                  <button className="outline-action" type="button">
                    Configure provider
                  </button>
                </div>
                <div className="cal-toolbar">
                  <label className="search-field wide-search">
                    <Search size={18} />
                    <input
                      aria-label="Search contacts"
                      placeholder="Search contacts"
                      value={contactSearch}
                      onChange={(event) => setContactSearch(event.target.value)}
                    />
                  </label>
                </div>

                {showContactCreate && (
                  <form className="cal-create-card" onSubmit={createContact}>
                    <div className="panel-heading">
                      <div>
                        <h2>Add contact</h2>
                        <p>Contacts are scoped to the active product.</p>
                      </div>
                      <button className="icon-button" onClick={() => setShowContactCreate(false)} type="button">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="event-form">
                      <label>
                        Name
                        <input
                          value={contactDraft.name}
                          onChange={(event) => setContactDraft((current) => ({ ...current, name: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={contactDraft.email}
                          onChange={(event) =>
                            setContactDraft((current) => ({ ...current, email: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Company
                        <input
                          value={contactDraft.company}
                          onChange={(event) =>
                            setContactDraft((current) => ({ ...current, company: event.target.value }))
                          }
                        />
                      </label>
                      <label className="wide-field">
                        Notes
                        <textarea
                          value={contactDraft.notes}
                          onChange={(event) => setContactDraft((current) => ({ ...current, notes: event.target.value }))}
                        />
                      </label>
                      <button className="blue-action full wide-field" disabled={saving === "contact"} type="submit">
                        {saving === "contact" ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                        Save contact
                      </button>
                    </div>
                  </form>
                )}

                {filteredContacts.length === 0 ? (
                  <div className="hero-empty contacts-empty">
                    <div>
                      <h2>Stay organized as the product grows</h2>
                      <p>Contacts are created and updated inside the active product when invitees book meetings.</p>
                      <div className="hero-actions">
                        <button className="outline-action" onClick={() => setShowContactCreate(true)} type="button">
                          <Plus size={18} />
                          Add contact
                        </button>
                        <button className="blue-action" onClick={() => setActiveView("scheduling")} type="button">
                          Book your first meeting
                        </button>
                      </div>
                    </div>
                    <div className="contact-table-preview">
                      <strong>Name</strong>
                      <strong>Email</strong>
                      <span>Contact</span>
                      <span>person@example.com</span>
                    </div>
                  </div>
                ) : (
                  <div className="contacts-table">
                    <div className="contacts-row head">
                      <strong>Name</strong>
                      <strong>Email</strong>
                      <strong>Source</strong>
                      <strong>Last meeting</strong>
                      <span />
                    </div>
                    {filteredContacts.map((contact) => (
                      <div className="contacts-row" key={contact.id}>
                        <span>{contact.name}</span>
                        <span>{contact.email}</span>
                        <span>{contact.source}</span>
                        <span>{formatDateTime(contact.last_booking_at)}</span>
                        <button className="icon-button danger" onClick={() => deleteContact(contact)} type="button">
                          {saving === contact.id ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeView === "availability" && (
              <section className="cal-page">
                <div className="cal-page-head">
                  <div>
                    <h1>Availability</h1>
                    <p>{selectedProduct.name} team coverage, client slots, and booking notifications.</p>
                  </div>
                  <div className="head-actions">
                    <button
                      className="outline-action"
                      disabled={productInactive || !can(selectedProduct, "manage_availability")}
                      onClick={() => generateAvailability(false)}
                      type="button"
                    >
                      {saving === "availability-generate" ? <Loader2 className="spin" size={18} /> : <Clock3 size={18} />}
                      Generate schedule
                    </button>
                    <button
                      className="blue-action"
                      disabled={productInactive || !can(selectedProduct, "manage_availability")}
                      onClick={saveAvailabilityPolicy}
                      type="button"
                    >
                      {saving === "availability-policy" ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                      Save policy
                    </button>
                  </div>
                </div>

                {teamAvailability && availabilityPolicyDraft ? (
                  <div className="availability-workspace">
                    <div className="availability-summary-grid">
                      <div className="availability-summary">
                        <span>Selected product</span>
                        <strong>{teamAvailability.product_name}</strong>
                      </div>
                      <div className="availability-summary">
                        <span>Support window</span>
                        <strong>
                          {supportWindowLabel(teamAvailability.policy.support_start_time, teamAvailability.policy.support_end_time)}
                        </strong>
                      </div>
                      <div className="availability-summary">
                        <span>Active rotation</span>
                        <strong>{teamAvailability.members.filter((member) => member.included_in_rotation).length} members</strong>
                      </div>
                      <div className="availability-summary">
                        <span>Client slots</span>
                        <strong>{teamAvailability.available_slots.length}</strong>
                      </div>
                    </div>

                    <div className="panel availability-policy-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Product support policy</h2>
                          <p>Shared coverage can run during business hours, overnight, or 24/7 across eligible product team members.</p>
                        </div>
                        {selectedProduct.public_booking_path && (
                          <button
                            className="outline-action"
                            onClick={() => copyInvitationLink(`${publicBase}${selectedProduct.public_booking_path}`)}
                            type="button"
                          >
                            <Copy size={17} />
                            Copy booking link
                          </button>
                        )}
                      </div>
                      <div className="event-form">
                        <label>
                          Date
                          <input
                            type="date"
                            value={availabilityDate}
                            onChange={(event) => setAvailabilityDate(event.target.value)}
                          />
                        </label>
                        <label>
                          Time zone
                          <input
                            value={availabilityPolicyDraft.timezone}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, timezone: event.target.value }
                              )
                            }
                          />
                        </label>
                        <label>
                          Distribution
                          <select
                            value={availabilityPolicyDraft.distribution_mode}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && {
                                  ...current,
                                  distribution_mode: event.target.value as TeamAvailability["policy"]["distribution_mode"]
                                }
                              )
                            }
                          >
                            <option value="equal_sequential">Equal sequential</option>
                            <option value="manual">Manual assignment</option>
                            <option value="rotating_daily">Rotating daily</option>
                            <option value="round_robin">Round-robin booking</option>
                            <option value="overlapping">Overlapping availability</option>
                          </select>
                        </label>
                        <div className="availability-mode-actions wide-field">
                          <button
                            className={
                              availabilityPolicyDraft.support_start_time === "00:00" &&
                              availabilityPolicyDraft.support_end_time === "00:00"
                                ? "outline-action active"
                                : "outline-action"
                            }
                            onClick={() =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, support_start_time: "00:00", support_end_time: "00:00" }
                              )
                            }
                            type="button"
                          >
                            24/7 coverage
                          </button>
                          <button
                            className="outline-action"
                            onClick={() =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, support_start_time: "09:00", support_end_time: "17:00" }
                              )
                            }
                            type="button"
                          >
                            Business hours
                          </button>
                          <span>Use the same start and end time for a full-day shift. Use an earlier end time for overnight coverage, such as 22:00 - 06:00.</span>
                        </div>
                        <label>
                          Support starts
                          <input
                            type="time"
                            value={availabilityPolicyDraft.support_start_time}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, support_start_time: event.target.value }
                              )
                            }
                          />
                        </label>
                        <label>
                          Support ends
                          <input
                            type="time"
                            value={availabilityPolicyDraft.support_end_time}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, support_end_time: event.target.value }
                              )
                            }
                          />
                        </label>
                        <label>
                          Appointment minutes
                          <input
                            min={5}
                            type="number"
                            value={availabilityPolicyDraft.appointment_duration_minutes}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, appointment_duration_minutes: Number(event.target.value) }
                              )
                            }
                          />
                        </label>
                        <label>
                          Slot interval
                          <input
                            min={5}
                            type="number"
                            value={availabilityPolicyDraft.slot_interval_minutes}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, slot_interval_minutes: Number(event.target.value) }
                              )
                            }
                          />
                        </label>
                        <label>
                          Minimum notice
                          <input
                            min={0}
                            type="number"
                            value={availabilityPolicyDraft.minimum_booking_notice_minutes}
                            onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, minimum_booking_notice_minutes: Number(event.target.value) }
                              )
                            }
                          />
                        </label>
                      <label>
                          Buffer before
                        <input
                          type="number"
                          min={0}
                            value={availabilityPolicyDraft.buffer_before_minutes}
                          onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, buffer_before_minutes: Number(event.target.value) }
                              )
                          }
                        />
                      </label>
                      <label>
                          Buffer after
                        <input
                          type="number"
                            min={0}
                            value={availabilityPolicyDraft.buffer_after_minutes}
                          onChange={(event) =>
                              setAvailabilityPolicyDraft((current) =>
                                current && { ...current, buffer_after_minutes: Number(event.target.value) }
                              )
                          }
                        />
                      </label>
                      </div>
                    </div>

                    <div className="availability-grid">
                      <div className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Daily team coverage</h2>
                            <p>Generated records are system-calculated. Manual records override generated coverage.</p>
                          </div>
                          <button
                            className="outline-action"
                            disabled={productInactive || !can(selectedProduct, "manage_availability")}
                            onClick={() => {
                              if (window.confirm("Regenerate generated coverage for this date? Manual overrides can be replaced when forced.")) {
                                generateAvailability(true);
                              }
                            }}
                            type="button"
                          >
                            <Clock3 size={17} />
                            Regenerate
                          </button>
                        </div>
                        <div className="coverage-list">
                          {teamAvailability.coverage.map((record) => {
                            const draft = coverageDrafts[record.id] || {
                              start_time: record.start_time,
                              end_time: record.end_time,
                              status: "available" as const
                            };
                            const canEditRecord =
                              can(selectedProduct, "manage_availability") || record.member_id === user.id;
                            return (
                              <div className="coverage-row" key={record.id}>
                                <div>
                                  <strong>{record.member_name}</strong>
                                  <span>{record.member_role}</span>
                                </div>
                                <label>
                                  Start
                                  <input
                                    disabled={!canEditRecord || productInactive}
                                    type="time"
                                    value={draft.start_time}
                                    onChange={(event) => updateCoverageDraft(record.id, "start_time", event.target.value)}
                                  />
                                </label>
                                <label>
                                  End
                                  <input
                                    disabled={!canEditRecord || productInactive}
                                    type="time"
                                    value={draft.end_time}
                                    onChange={(event) => updateCoverageDraft(record.id, "end_time", event.target.value)}
                                  />
                                </label>
                                <label>
                                  Status
                                  <select
                                    disabled={!canEditRecord || productInactive}
                                    value={draft.status}
                                    onChange={(event) =>
                                      updateCoverageDraft(
                                        record.id,
                                        "status",
                                        event.target.value as "available" | "unavailable" | "on_leave"
                                      )
                                    }
                                  >
                                    <option value="available">Available</option>
                                    <option value="unavailable">Unavailable</option>
                                    <option value="on_leave">On leave</option>
                                  </select>
                                </label>
                                <span className={`source-pill ${record.source.toLowerCase()}`}>{record.source}</span>
                                <button
                                  className="outline-action compact"
                                  disabled={!canEditRecord || productInactive || saving === record.id}
                                  onClick={() => saveMemberAvailability(record)}
                                  type="button"
                                >
                                  {saving === record.id ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                                  Save
                                </button>
                              </div>
                            );
                          })}
                          {teamAvailability.coverage.length === 0 && (
                            <EmptyState
                              icon={<Clock3 size={30} />}
                              title="No coverage generated"
                              copy="Generate a schedule after adding active product team members."
                              actionLabel={can(selectedProduct, "manage_availability") ? "Generate schedule" : undefined}
                              onAction={can(selectedProduct, "manage_availability") ? () => generateAvailability(false) : undefined}
                            />
                          )}
                        </div>
                      </div>

                      <div className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Client slots</h2>
                            <p>Slots never cross member coverage boundaries.</p>
                          </div>
                        </div>
                        <div className="slot-chip-grid">
                          {teamAvailability.available_slots.slice(0, 18).map((slot) => (
                            <span className="slot-chip" key={slot.slot_key}>
                              <strong>{slot.label}</strong>
                              <small>{slot.member_name || "Product support team"}</small>
                            </span>
                          ))}
                          {teamAvailability.available_slots.length === 0 && (
                            <p className="empty-copy">No client slots are available for this date.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="availability-grid availability-team-grid">
                      <div className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Product team</h2>
                            <p>Only included members can receive product support bookings.</p>
                          </div>
                        </div>
                        <div className="member-rotation-list">
                          {teamAvailability.members.map((member) => (
                            <div className="member-rotation-row" key={member.member_id}>
                              <div>
                                <strong>{member.full_name}</strong>
                                <span>{member.role}</span>
                              </div>
                              <span className={member.included_in_rotation ? "status-pill scheduled" : "status-pill cancelled"}>
                                {member.included_in_rotation ? "Included" : "Excluded"}
                              </span>
                              {member.reason && <small>{member.reason}</small>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <section className="panel">
                    <Loader2 className="spin" size={22} />
                    <span>Loading product-team availability</span>
                  </section>
                )}
              </section>
            )}

            {activeView === "product-settings" && (
              <section className="cal-page">
                <div className="cal-page-head">
                  <h1>Product settings</h1>
                  <button
                    className="outline-action"
                    disabled={!can(selectedProduct, "edit_product")}
                    onClick={beginProductEdit}
                    type="button"
                  >
                    <Settings size={16} />
                    Edit
                  </button>
                </div>
                <div className="settings-card product-settings-card">
                  <ProductAvatar product={selectedProduct} large />
                  <div>
                    <h2>{selectedProduct.name}</h2>
                    <p>{selectedProduct.description || "No description added"}</p>
                    <span className={`status-pill ${selectedProduct.status}`}>{selectedProduct.status}</span>
                  </div>
                </div>
                {showProductEdit && (
                  <form className="cal-create-card" onSubmit={updateProduct}>
                    <div className="panel-heading">
                      <div>
                        <h2>Edit product</h2>
                        <p>Product details update immediately for authorized members.</p>
                      </div>
                      <button className="icon-button" onClick={() => setShowProductEdit(false)} type="button">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="event-form">
                      <label>
                        Product name
                        <input
                          value={productDraft.name}
                          onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Icon or initials
                        <input
                          maxLength={10}
                          value={productDraft.icon}
                          onChange={(event) => setProductDraft((current) => ({ ...current, icon: event.target.value }))}
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={productDraft.status}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              status: event.target.value as "active" | "inactive"
                            }))
                          }
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                      <label className="wide-field">
                        Description
                        <textarea
                          value={productDraft.description}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Color
                        <input
                          type="color"
                          value={productDraft.color}
                          onChange={(event) => setProductDraft((current) => ({ ...current, color: event.target.value }))}
                        />
                      </label>
                      <label>
                        Widget enabled
                        <select
                          value={productDraft.widgetEnabled ? "true" : "false"}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, widgetEnabled: event.target.value === "true" }))
                          }
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      </label>
                      <label>
                        Booking mode
                        <select
                          value={productDraft.bookingMode}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, bookingMode: event.target.value as "instant" | "approval" }))
                          }
                        >
                          <option value="instant">Instant booking</option>
                          <option value="approval">Approval required</option>
                        </select>
                      </label>
                      <label className="wide-field">
                        Approved website domains
                        <textarea
                          placeholder="https://www.example.com"
                          value={productDraft.approvedDomainsText}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, approvedDomainsText: event.target.value }))
                          }
                        />
                        <small className="field-note">One exact origin per line, including https:// when used by the website.</small>
                      </label>
                      <label>
                        Controller email
                        <input
                          type="email"
                          value={productDraft.controllerEmail}
                          onChange={(event) => setProductDraft((current) => ({ ...current, controllerEmail: event.target.value }))}
                        />
                      </label>
                      <label>
                        Support email
                        <input
                          type="email"
                          value={productDraft.supportEmail}
                          onChange={(event) => setProductDraft((current) => ({ ...current, supportEmail: event.target.value }))}
                        />
                      </label>
                      <label>
                        Button label
                        <input
                          value={productDraft.widgetButtonLabel}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, widgetButtonLabel: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Widget position
                        <select
                          value={productDraft.widgetPosition}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, widgetPosition: event.target.value as "right" | "left" }))
                          }
                        >
                          <option value="right">Right side</option>
                          <option value="left">Left side</option>
                        </select>
                      </label>
                      <label className="wide-field">
                        Widget action label
                        <input
                          value={productDraft.widgetActionLabel}
                          onChange={(event) =>
                            setProductDraft((current) => ({ ...current, widgetActionLabel: event.target.value }))
                          }
                        />
                      </label>
                      <div className="wide-field widget-install-box">
                        <span>Installation snippet</span>
                        <code>
                          {`<script src="${publicBase}/widget.js" data-workspace-id="${selectedProduct.public_booking_token}" data-position="${selectedProduct.widget_position || "right"}" async></script>`}
                        </code>
                      </div>
                      <button className="blue-action full wide-field" disabled={saving === "product-update"} type="submit">
                        {saving === "product-update" ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                        Save product
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </>
        )}

        <EventEditorDrawer
          dirty={eventEditorDirty}
          draft={eventEditorDraft}
          googleCalendarStatus={googleCalendarStatus}
          members={members}
          mode={eventEditorMode}
          open={eventEditorOpen && Boolean(selectedProduct)}
          products={products}
          publicBase={publicBase}
          saving={saving === "event" || Boolean(editingEvent && saving === `event-edit:${editingEvent.id}`)}
          selectedEvent={editingEvent}
          selectedProduct={selectedProduct}
          teamAvailability={teamAvailability}
          validationMessage={eventEditorError}
          onClose={closeEventEditor}
          onConnectGoogleCalendar={() => connectGoogleCalendar(false)}
          onCopyLink={copyLink}
          onDelete={deleteEvent}
          onDraftChange={setEventEditorDraft}
          onSubmit={submitEventEditor}
        />

        {activeView === "profile" && (
          <section className="cal-page">
            <div className="cal-page-head">
              <h1>Profile</h1>
            </div>
            <div className="profile-settings-grid">
              <section className="profile-card">
                <span className="profile-avatar-large">{user.name.charAt(0).toUpperCase()}</span>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  <span className="verified-pill">{user.email_verified ? "Verified" : "Not verified"}</span>
                </div>
              </section>
              <section className="profile-details-card">
                <label>
                  Name
                  <input readOnly value={user.name} />
                </label>
                <label>
                  Email
                  <input readOnly value={user.email} />
                </label>
                <label>
                  Time zone
                  <input readOnly value={user.timezone} />
                </label>
                <label>
                  Public link
                  <div className="copy-field">
                    <input readOnly value={`${publicBase}/book/${user.slug}`} />
                    <button className="outline-action" onClick={() => copyLink(`/book/${user.slug}`)} type="button">
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </label>
              </section>
              <section className="profile-details-card google-calendar-card" aria-label="Google Calendar integration">
                <div className="integration-card-head">
                  <CalendarCheck size={26} />
                  <div>
                    <h2>Google Calendar</h2>
                    <p>Create official invitations and Google Meet links from the assigned team member calendar.</p>
                  </div>
                  <span className={`status-pill ${googleCalendarStatus?.connected ? "scheduled" : "cancelled"}`}>
                    {googleCalendarLabel}
                  </span>
                </div>
                <div className="integration-status-grid">
                  <span>
                    <small>Account</small>
                    <strong>{googleCalendarStatus?.provider_email || user.email}</strong>
                  </span>
                  <span>
                    <small>Calendar</small>
                    <strong>{googleCalendarStatus?.calendar_id || "primary"}</strong>
                  </span>
                  <span>
                    <small>Last sync</small>
                    <strong>
                      {googleCalendarStatus?.last_sync_at
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                            new Date(googleCalendarStatus.last_sync_at)
                          )
                        : "Not synced"}
                    </strong>
                  </span>
                  <span>
                    <small>Scopes</small>
                    <strong>{googleCalendarStatus?.granted_scopes.length || 0}</strong>
                  </span>
                </div>
                {googleCalendarStatus?.last_error_message && (
                  <p className="inline-warning">{googleCalendarStatus.last_error_message}</p>
                )}
                {!googleCalendarStatus?.enabled && (
                  <p className="inline-warning">Set GOOGLE_CALENDAR_ENABLED=true on the backend to use Calendar and Meet.</p>
                )}
                {googleCalendarStatus?.enabled && !googleCalendarStatus.configured && (
                  <p className="inline-warning">
                    Add Google client credentials, redirect URI, and token encryption key on the backend.
                  </p>
                )}
                <div className="integration-actions">
                  {googleCalendarStatus?.connected ? (
                    <>
                      <button
                        className="outline-action"
                        disabled={saving === "google-reconnect"}
                        onClick={() => connectGoogleCalendar(true)}
                        type="button"
                      >
                        {saving === "google-reconnect" ? <Loader2 className="spin" size={17} /> : <CalendarCheck size={17} />}
                        Reconnect
                      </button>
                      <button
                        className="outline-action"
                        disabled={saving === "google-disconnect"}
                        onClick={disconnectGoogleCalendar}
                        type="button"
                      >
                        {saving === "google-disconnect" ? <Loader2 className="spin" size={17} /> : <X size={17} />}
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      className="blue-action"
                      disabled={
                        saving === "google-connect" ||
                        !googleCalendarStatus?.enabled ||
                        !googleCalendarStatus?.configured
                      }
                      onClick={() => connectGoogleCalendar(false)}
                      type="button"
                    >
                      {saving === "google-connect" ? <Loader2 className="spin" size={17} /> : <CalendarCheck size={17} />}
                      Connect Google Calendar
                    </button>
                  )}
                  <button className="outline-action" onClick={() => refreshGoogleCalendarStatus()} type="button">
                    Refresh
                  </button>
                </div>
              </section>
            </div>
          </section>
        )}

        {activeView === "branding" && (
          <section className="cal-page">
            <div className="cal-page-head">
              <h1>Branding</h1>
            </div>
            <div className="settings-card">
              <Palette size={32} />
              <div>
                <h2>Calendar Booking</h2>
                <p>Branding for public scheduling pages can be expanded from product settings.</p>
              </div>
              <div className="brand-preview-row">
                {colors.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === "my-link" && (
          <section className="cal-page">
            <div className="cal-page-head">
              <h1>My Link</h1>
            </div>
            <div className="settings-card my-link-card">
              <Link2 size={32} />
              <div>
                <h2>{`${publicBase}/book/${user.slug}`}</h2>
                <p>Your public booking profile</p>
              </div>
              <button className="blue-action" onClick={() => copyLink(`/book/${user.slug}`)} type="button">
                <Copy size={18} />
                Copy link
              </button>
            </div>
          </section>
        )}

        {[
          "analytics",
          "notetaker-settings",
          "callie-settings",
          "all-settings",
          "getting-started",
          "community"
        ].includes(activeView) && (
          <section className="cal-page">
            <div className="cal-page-head">
              <h1>{viewTitle(activeView)}</h1>
            </div>
            <EmptyState
              icon={<Settings size={34} />}
              title="Workspace module ready"
              copy="This section is wired into product context and can be expanded when this module is ready."
            />
          </section>
        )}
      </section>
    </main>
  );
}

function ProductAvatar({ product, large = false }: { product: Product | null; large?: boolean }) {
  return (
    <span
      className={large ? "product-avatar large" : "product-avatar"}
      style={{ backgroundColor: product?.color || "#006bff" }}
      aria-hidden="true"
    >
      {productInitials(product)}
    </span>
  );
}

function MetricGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="metric-grid compact-metrics">
      <div className="metric">
        <span>Event types</span>
        <strong>{stats.event_types}</strong>
      </div>
      <div className="metric">
        <span>Upcoming bookings</span>
        <strong>{stats.upcoming_bookings}</strong>
      </div>
      <div className="metric">
        <span>Team members</span>
        <strong>{stats.team_members || 0}</strong>
      </div>
      <div className="metric">
        <span>Pending invitations</span>
        <strong>{stats.pending_invitations || 0}</strong>
      </div>
    </div>
  );
}

function viewTitle(view: WorkspaceView) {
  return {
    scheduling: "Scheduling",
    meetings: "Meetings",
    team: "Team",
    availability: "Availability",
    contacts: "Contacts",
    analytics: "Analytics",
    "product-settings": "Product settings",
    profile: "Profile",
    branding: "Branding",
    "my-link": "My Link",
    "notetaker-settings": "Notetaker settings",
    "callie-settings": "Callie settings",
    "all-settings": "All settings",
    "getting-started": "Getting started guide",
    community: "Community"
  }[view];
}

function EmptyState({
  icon,
  title,
  copy,
  actionLabel,
  onAction
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      {icon}
      <strong>{title}</strong>
      <span>{copy}</span>
      {actionLabel && onAction && (
        <button className="blue-action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
