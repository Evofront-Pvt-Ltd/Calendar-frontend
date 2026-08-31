export type AvailabilityWindow = {
  day: number;
  start: string;
  end: string;
  enabled: boolean;
};

export type Availability = {
  timezone: string;
  windows: AvailabilityWindow[];
  min_notice_minutes: number;
  slot_interval_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
};

export type ProductAvailabilityPolicy = {
  id: string;
  organization_id: string;
  product_id: string;
  support_start_time: string;
  support_end_time: string;
  timezone: string;
  distribution_mode: "equal_sequential" | "manual" | "rotating_daily" | "round_robin" | "overlapping";
  appointment_duration_minutes: number;
  slot_interval_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_advance_booking_days: number;
  maximum_concurrent_bookings: number;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ProductMemberAvailabilitySummary = {
  member_id: string;
  membership_id: string;
  full_name: string;
  role: string;
  status: string;
  included_in_rotation: boolean;
  reason: string;
};

export type MemberAvailability = {
  id: string;
  organization_id: string;
  product_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  day_of_week: number;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule: string;
  source: "GENERATED" | "MANUAL";
  status: string;
  effective_from: string | null;
  effective_until: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilityException = {
  id: string;
  organization_id: string;
  product_id: string;
  member_id: string;
  exception_date: string;
  start_time: string;
  end_time: string;
  type: "break" | "leave" | "unavailable" | "holiday";
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProductAvailableSlot = {
  start_time_utc: string;
  end_time_utc: string;
  local_date: string;
  local_time: string;
  label: string;
  slot_key: string;
  member_id?: string;
  member_name?: string;
  source?: string;
};

export type ClientBooking = {
  id: string;
  organization_id: string;
  product_id: string;
  assigned_member_id: string;
  assigned_member_name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  product_reference_number: string;
  issue_category: string;
  issue_title: string;
  issue_description: string;
  priority: string;
  start_time_utc: string;
  end_time_utc: string;
  client_timezone: string;
  product_timezone: string;
  status: "pending_approval" | "scheduled" | "cancelled" | "rescheduled" | "rejected";
  assignment_strategy: string;
  assignment_reason: string;
  public_booking_reference: string;
  confirmation_link: string;
  source_domain?: string;
  widget_id?: string;
  booking_mode?: string;
  google_meet_url: string;
  google_event_url: string;
  google_sync_status: string;
  google_conference_status: string;
  created_at: string;
  updated_at: string;
};

export type GoogleCalendarStatus = {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  connection_status: string;
  provider_email: string;
  calendar_id: string;
  granted_scopes: string[];
  token_expiry: string | null;
  last_sync_at: string | null;
  last_error_code: string;
  last_error_message: string;
};

export type GoogleCalendarConnect = {
  authorization_url: string;
};

export type BookingNotification = {
  id: string;
  organization_id: string;
  product_id: string;
  booking_id: string;
  recipient_user_id: string;
  recipient_email: string | null;
  channel: "in_app" | "email" | "sms" | "push" | "calendar";
  type: string;
  status: string;
  provider: string;
  provider_message_id: string;
  attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export type BookingAssignmentHistory = {
  id: string;
  booking_id: string;
  organization_id: string;
  product_id: string;
  previous_product_id: string;
  new_product_id: string;
  previous_team_id: string;
  new_team_id: string;
  previous_member_id: string;
  new_member_id: string;
  changed_by: string;
  reason: string;
  changed_at: string;
};

export type TeamAvailability = {
  product_id: string;
  product_name: string;
  date: string;
  timezone: string;
  policy: ProductAvailabilityPolicy;
  members: ProductMemberAvailabilitySummary[];
  coverage: MemberAvailability[];
  available_slots: ProductAvailableSlot[];
  bookings: ClientBooking[];
  notifications: BookingNotification[];
  assignment_history?: BookingAssignmentHistory[];
  exceptions: AvailabilityException[];
};

export type PublicProductBooking = {
  product_name: string;
  description: string;
  timezone: string;
  support_start_time: string;
  support_end_time: string;
  appointment_duration_minutes: number;
  email_enabled: boolean;
};

export type PublicLandingProduct = {
  name: string;
  description: string;
  icon: string;
  color: string;
  booking_token: string;
  timezone: string;
  support_start_time: string;
  support_end_time: string;
  appointment_duration_minutes: number;
  booking_mode: "instant" | "approval" | string;
  widget_button_label: string;
  widget_action_label: string;
};

export type WidgetConfig = {
  workspace_name: string;
  public_widget_id: string;
  enabled: boolean;
  button_label: string;
  action_label: string;
  position: "right" | "left";
  primary_color: string;
  booking_mode: "instant" | "approval" | string;
  timezone: string;
  product: PublicLandingProduct;
};

export type User = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  email_verified_at: string | null;
  auth_provider: string;
  profile_image: string;
  role: "organization_admin" | "calendar_controller" | "member" | "viewer" | string;
  organization_id: string;
  status: string;
  slug: string;
  timezone: string;
  availability?: Availability;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
};

export type EventQuestion = {
  label: string;
  required: boolean;
};

export type EventType = {
  id: string;
  product_id: string;
  owner_id: string;
  owner_slug: string;
  slug: string;
  public_path: string;
  title: string;
  description: string;
  duration_minutes: number;
  location_type: "phone" | "video" | "in_person" | "custom";
  location_detail: string;
  color: string;
  active: boolean;
  questions: EventQuestion[];
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  booking_code: string;
  product_id: string;
  owner_id: string;
  event_type_id: string;
  event_title: string;
  event_slug: string;
  status: "scheduled" | "cancelled";
  start_utc: string;
  end_utc: string;
  invitee_name: string;
  invitee_email: string;
  invitee_timezone: string;
  invitee_message: string;
  answers: Record<string, string>;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
};

export type Slot = {
  start_utc: string;
  end_utc: string;
  local_date: string;
  local_time: string;
  label: string;
};

export type DashboardStats = {
  event_types: number;
  active_event_types: number;
  scheduled_bookings: number;
  upcoming_bookings: number;
  team_members?: number;
  scheduled_team_meetings?: number;
  pending_invitations?: number;
  pending_client_bookings?: number;
};

export type Contact = {
  id: string;
  product_id: string;
  owner_id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  notes: string;
  source: "manual" | "booking";
  booking_count: number;
  last_booking_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "active" | "inactive";
  created_by: string;
  membership_role: string;
  permissions: string[];
  can_create_product: boolean;
  member_count: number;
  public_booking_token: string;
  public_booking_path: string;
  approved_domains: string[];
  controller_email: string;
  support_email: string;
  booking_mode: "instant" | "approval";
  widget_enabled: boolean;
  widget_button_label: string;
  widget_action_label: string;
  widget_position: "right" | "left";
  created_at: string;
  updated_at: string;
};

export type ProductController = {
  id: string;
  product_id: string;
  email: string;
  status: "pending" | "verified" | "expired" | "revoked";
  added_by: string;
  verified_at: string | null;
  verification_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BookingClaimAlert = {
  id: string;
  product_id: string;
  booking_id: string;
  status: string;
  audience: string;
  claim_token: string;
  created_at: string | null;
  client_name: string;
  client_email: string;
  client_company: string;
  issue_title: string;
  issue_category: string;
  priority: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  issue_description: string;
};

export type ProductMember = {
  id: string;
  product_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "calendar_controller" | "member" | "viewer" | string;
  membership_status: "active" | "inactive" | string;
  invitation_status: string;
  verification_status: "pending" | "verified" | "expired";
  verified_at: string | null;
  verification_expires_at: string | null;
  has_login: boolean;
  added_by: string;
  added_by_name: string;
  date_added: string;
  joined_at: string | null;
  last_invitation_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingInvitation = {
  id: string;
  meeting_id: string;
  product_id: string;
  recipient_user_id: string;
  recipient_name: string;
  recipient_email: string;
  invitation_status: string;
  email_delivery_status: string;
  provider_message_id: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string;
  invitation_link: string;
  created_at: string;
  updated_at: string;
};

export type ProductMeeting = {
  id: string;
  product_id: string;
  organizer_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location: string;
  meeting_url: string;
  status: "scheduled" | "cancelled";
  invitation_count: number;
  pending_email_count: number;
  invitations: MeetingInvitation[];
  created_at: string;
  updated_at: string;
};

export type PublicMeetingInvitation = {
  product_name: string;
  meeting_title: string;
  description: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location: string;
  meeting_url: string;
  recipient_email: string;
  invitation_status: string;
  email_delivery_status: string;
};
