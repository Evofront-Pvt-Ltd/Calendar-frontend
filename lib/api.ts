import type {
  AuthResponse,
  Availability,
  Booking,
  BookingClaimAlert,
  ClientBooking,
  Contact,
  DashboardStats,
  EventType,
  GoogleCalendarConnect,
  GoogleCalendarStatus,
  MemberAvailability,
  MissedCall,
  Product,
  ProductAvailabilityPolicy,
  ProductAvailableSlot,
  ProductController,
  ProductMeeting,
  ProductMember,
  PublicLandingProduct,
  PublicMeetingInvitation,
  PublicProductBooking,
  Slot,
  TeamAvailability,
  WidgetConfig,
  User
} from "@/types";
import { clearSession, getAccessToken, getRefreshToken, saveRenewedTokens } from "@/lib/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

type RequestOptions = RequestInit & {
  token?: string | null;
};

type RefreshedSession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
};

type RegistrationDelivery = {
  email: string;
  expires_in_minutes: number;
  resend_available_in_seconds: number;
  delivery_provider: "console" | "sendgrid";
  message: string;
};

type ForgotPasswordResult = {
  success: boolean;
  expires_in_minutes: number;
  message: string;
};

type PasswordResetCheck = {
  valid: boolean;
  email: string;
  expires_in_minutes: number;
  message: string;
};

type PublicBookingPayload = {
  slot_key: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company: string;
  product_reference_number?: string;
  issue_category: string;
  issue_title: string;
  issue_description: string;
  priority: "low" | "normal" | "high" | "urgent";
  client_timezone: string;
  consent_confirmed: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  nextAction?: string;

  constructor(message: string, status: number, code?: string, nextAction?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.nextAction = nextAction;
  }
}

async function execute<T>(path: string, options: RequestOptions, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = typeof options.body !== "undefined";
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail?.message === "string"
          ? detail.message
          : "Something went wrong";
    throw new ApiError(message, response.status, detail?.code, detail?.nextAction);
  }
  return data as T;
}

// One refresh at a time, so a burst of parallel 401s cannot rotate the refresh token repeatedly.
let renewal: Promise<string> | null = null;

async function renewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return "";
  }
  if (!renewal) {
    renewal = (async () => {
      try {
        const renewed = await execute<RefreshedSession>("/api/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        saveRenewedTokens(renewed.access_token, renewed.refresh_token);
        return renewed.access_token;
      } catch {
        clearSession();
        return "";
      } finally {
        renewal = null;
      }
    })();
  }
  return renewal;
}

// Callers hold the token in component state, which goes stale the moment a background
// renewal rotates it, so the stored token always wins for the same session.
function freshestToken(token?: string | null): string | null | undefined {
  if (!token) {
    return token;
  }
  return getAccessToken() || token;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await execute<T>(path, options, freshestToken(options.token));
  } catch (caught) {
    const isExpiredSession = caught instanceof ApiError && caught.status === 401 && Boolean(options.token);
    if (!isExpiredSession) {
      throw caught;
    }
    // A single retry only: renewAccessToken never recurses through request().
    const token = await renewAccessToken();
    if (!token) {
      clearSession();
      throw caught;
    }
    return execute<T>(path, options, token);
  }
}

function withProduct(path: string, productId?: string) {
  if (!productId) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}product_id=${encodeURIComponent(productId)}`;
}

export const api = {
  register(payload: { name: string; email: string; password: string; timezone: string }) {
    return request<RegistrationDelivery>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  startRegistration(payload: { name: string; email: string; password: string; timezone: string }) {
    return request<RegistrationDelivery>("/api/auth/register/start", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resendRegistration(payload: { email: string }) {
    return request<RegistrationDelivery>("/api/auth/register/resend", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  verifyRegistration(payload: { email: string; otp: string }) {
    return request<AuthResponse>("/api/auth/register/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  // Google OAuth config call is parked for future reactivation.
  // googleConfig() {
  //   return request<{ enabled: boolean; redirect_uri: string }>("/api/auth/google/config");
  // },
  logout(token: string, payload: { refresh_token?: string; all_sessions?: boolean } = {}) {
    return request<{ success: boolean; message: string }>("/api/auth/logout", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  forgotPassword(payload: { email: string }) {
    return request<ForgotPasswordResult>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  checkResetToken(token: string) {
    return request<PasswordResetCheck>(`/api/auth/reset-password/${encodeURIComponent(token)}`);
  },
  resetPassword(payload: { token: string; password: string }) {
    return request<{ success: boolean; message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me(token: string) {
    return request<User>("/api/auth/me", { token });
  },
  googleCalendarStatus(token: string) {
    return request<GoogleCalendarStatus>("/api/integrations/google/status", { token });
  },
  connectGoogleCalendar(token: string) {
    return request<GoogleCalendarConnect>("/api/integrations/google/connect", { token });
  },
  reconnectGoogleCalendar(token: string) {
    return request<GoogleCalendarConnect>("/api/integrations/google/reconnect", {
      method: "POST",
      token
    });
  },
  disconnectGoogleCalendar(token: string) {
    return request<void>("/api/integrations/google/disconnect", {
      method: "DELETE",
      token
    });
  },
  products(token: string) {
    return request<Product[]>("/api/products", { token });
  },
  createProduct(
    token: string,
    payload: {
      name: string;
      description: string;
      icon: string;
      color: string;
      status: "active" | "inactive";
      approved_domains?: string[];
      controller_email?: string;
      support_email?: string;
      booking_mode?: "instant" | "approval";
      widget_enabled?: boolean;
      widget_button_label?: string;
      widget_action_label?: string;
      widget_position?: "right" | "left";
    }
  ) {
    return request<Product>("/api/products", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  updateProduct(
    token: string,
    productId: string,
    payload: Partial<{
      name: string;
      description: string;
      icon: string;
      color: string;
      status: "active" | "inactive";
      approved_domains: string[];
      controller_email: string;
      support_email: string;
      booking_mode: "instant" | "approval";
      widget_enabled: boolean;
      widget_button_label: string;
      widget_action_label: string;
      widget_position: "right" | "left";
    }>
  ) {
    return request<Product>(`/api/products/${productId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },
  productMembers(token: string, productId: string) {
    return request<ProductMember[]>(`/api/products/${productId}/members`, { token });
  },
  addProductMember(
    token: string,
    productId: string,
    payload: { full_name: string; email: string; role: "calendar_controller" | "member" | "viewer"; status: "active" | "inactive" }
  ) {
    return request<ProductMember>(`/api/products/${productId}/members`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  updateProductMember(
    token: string,
    productId: string,
    membershipId: string,
    payload: Partial<{ role: "calendar_controller" | "member" | "viewer"; status: "active" | "inactive" }>
  ) {
    return request<ProductMember>(`/api/products/${productId}/members/${membershipId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },
  resendMemberVerification(token: string, productId: string, membershipId: string) {
    return request<ProductMember>(`/api/products/${productId}/members/${membershipId}/resend-verification`, {
      method: "POST",
      token
    });
  },
  verifyMemberPublic(token: string) {
    return request<{ status: string; email: string; product_name: string; has_login: boolean; message: string }>(
      `/api/public/member-verify/${encodeURIComponent(token)}`
    );
  },
  removeProductMember(token: string, productId: string, membershipId: string) {
    return request<void>(`/api/products/${productId}/members/${membershipId}`, {
      method: "DELETE",
      token
    });
  },
  productControllers(token: string, productId: string) {
    return request<ProductController[]>(`/api/products/${productId}/controllers`, { token });
  },
  addProductController(token: string, productId: string, email: string) {
    return request<ProductController>(`/api/products/${productId}/controllers`, {
      method: "POST",
      token,
      body: JSON.stringify({ email })
    });
  },
  resendProductController(token: string, productId: string, controllerId: string) {
    return request<ProductController>(`/api/products/${productId}/controllers/${controllerId}/resend`, {
      method: "POST",
      token
    });
  },
  removeProductController(token: string, productId: string, controllerId: string) {
    return request<void>(`/api/products/${productId}/controllers/${controllerId}`, {
      method: "DELETE",
      token
    });
  },
  claimAlerts(token: string, productId: string) {
    return request<BookingClaimAlert[]>(`/api/products/${productId}/claim-alerts`, { token });
  },
  missedCalls(token: string, productId: string) {
    return request<MissedCall[]>(`/api/products/${productId}/missed-calls`, { token });
  },
  scanMissedCalls(token: string, productId: string) {
    return request<MissedCall[]>(`/api/products/${productId}/missed-calls/scan`, {
      method: "POST",
      token
    });
  },
  claimClientBooking(token: string, productId: string, bookingId: string) {
    return request<ClientBooking>(`/api/products/${productId}/bookings/${bookingId}/claim`, {
      method: "POST",
      token
    });
  },
  verifyControllerPublic(token: string) {
    return request<{ status: string; email: string; product_id: string; message: string }>(
      `/api/public/controller-verify/${encodeURIComponent(token)}`
    );
  },
  bookingClaimPreview(token: string) {
    return request<{
      token: string;
      status: string;
      booking_status: string;
      product_name: string;
      client_name: string;
      issue_title: string;
      issue_category: string;
      priority: string;
      start_time: string | null;
      end_time: string | null;
      timezone: string;
      can_accept: boolean;
    }>(`/api/public/booking-claim/${encodeURIComponent(token)}`);
  },
  acceptBookingClaimPublic(token: string) {
    return request<ClientBooking>(`/api/public/booking-claim/${encodeURIComponent(token)}`, {
      method: "POST"
    });
  },
  productMeetings(token: string, productId: string) {
    return request<ProductMeeting[]>(`/api/products/${productId}/meetings`, { token });
  },
  createProductMeeting(
    token: string,
    productId: string,
    payload: {
      title: string;
      description: string;
      start_time: string;
      end_time: string;
      timezone: string;
      location: string;
      meeting_url: string;
      recipient_user_ids: string[];
      invite_entire_team: boolean;
    }
  ) {
    return request<ProductMeeting>(`/api/products/${productId}/meetings`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  stats(token: string, productId?: string) {
    return request<DashboardStats>(withProduct("/api/dashboard/stats", productId), { token });
  },
  availability(token: string, productId?: string) {
    return request<Availability>(withProduct("/api/availability", productId), { token });
  },
  updateAvailability(token: string, payload: Availability, productId?: string) {
    return request<Availability>(withProduct("/api/availability", productId), {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  teamAvailability(token: string, productId: string, date: string) {
    return request<TeamAvailability>(
      `/api/availability/team?product_id=${encodeURIComponent(productId)}&date=${encodeURIComponent(date)}`,
      { token }
    );
  },
  updateAvailabilityPolicy(token: string, productId: string, payload: Partial<ProductAvailabilityPolicy>) {
    return request<ProductAvailabilityPolicy>(`/api/availability/policy?product_id=${encodeURIComponent(productId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  generateAvailability(token: string, productId: string, date: string, forceRegenerate = false) {
    return request<MemberAvailability[]>(`/api/availability/generate?product_id=${encodeURIComponent(productId)}`, {
      method: "POST",
      token,
      body: JSON.stringify({
        date,
        preserve_manual_overrides: !forceRegenerate,
        force_regenerate: forceRegenerate
      })
    });
  },
  updateMemberAvailability(
    token: string,
    productId: string,
    memberId: string,
    payload: {
      member_id: string;
      date: string;
      start_time: string;
      end_time: string;
      timezone: string;
      source: "MANUAL";
      status: "available" | "unavailable" | "on_leave";
      change_reason: string;
    }
  ) {
    return request<MemberAvailability>(
      `/api/availability/members/${encodeURIComponent(memberId)}?product_id=${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        token,
        body: JSON.stringify(payload)
      }
    );
  },
  eventTypes(token: string, productId?: string) {
    return request<EventType[]>(withProduct("/api/event-types", productId), { token });
  },
  createEventType(token: string, payload: Partial<EventType>, productId?: string) {
    return request<EventType>(withProduct("/api/event-types", productId), {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  updateEventType(token: string, id: string, payload: Partial<EventType>, productId?: string) {
    return request<EventType>(withProduct(`/api/event-types/${id}`, productId), {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },
  deleteEventType(token: string, id: string, productId?: string) {
    return request<void>(withProduct(`/api/event-types/${id}`, productId), {
      method: "DELETE",
      token
    });
  },
  bookings(token: string, productId?: string) {
    return request<Booking[]>(withProduct("/api/bookings", productId), { token });
  },
  cancelBooking(token: string, id: string, reason: string, productId?: string) {
    return request<Booking>(withProduct(`/api/bookings/${id}/cancel`, productId), {
      method: "PATCH",
      token,
      body: JSON.stringify({ reason })
    });
  },
  cancelClientBooking(token: string, id: string, reason: string, productId: string) {
    return request<ClientBooking>(`/api/availability/bookings/${id}/cancel?product_id=${encodeURIComponent(productId)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ reason })
    });
  },
  assignClientBooking(token: string, productId: string, bookingId: string, memberId: string, reason: string) {
    return request<ClientBooking>(
      `/api/availability/bookings/${encodeURIComponent(bookingId)}/assignment?product_id=${encodeURIComponent(productId)}`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ member_id: memberId, reason })
      }
    );
  },
  approveClientBooking(token: string, productId: string, bookingId: string, reason: string) {
    return request<ClientBooking>(
      `/api/availability/bookings/${encodeURIComponent(bookingId)}/approve?product_id=${encodeURIComponent(productId)}`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ reason })
      }
    );
  },
  rejectClientBooking(token: string, productId: string, bookingId: string, reason: string) {
    return request<ClientBooking>(
      `/api/availability/bookings/${encodeURIComponent(bookingId)}/reject?product_id=${encodeURIComponent(productId)}`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ reason })
      }
    );
  },
  contacts(token: string, search = "", productId?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Contact[]>(withProduct(`/api/contacts${query}`, productId), { token });
  },
  createContact(
    token: string,
    payload: {
      name: string;
      email: string;
      company: string;
      job_title: string;
      notes: string;
    },
    productId?: string
  ) {
    return request<Contact>(withProduct("/api/contacts", productId), {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  deleteContact(token: string, id: string, productId?: string) {
    return request<void>(withProduct(`/api/contacts/${id}`, productId), {
      method: "DELETE",
      token
    });
  },
  publicEvent(userSlug: string, eventSlug: string) {
    return request<EventType>(`/api/public/${userSlug}/${eventSlug}`);
  },
  publicProfile(userSlug: string) {
    return request<{
      user: { name: string; slug: string; timezone: string };
      event_types: EventType[];
    }>(`/api/public/${userSlug}`);
  },
  publicInvitation(token: string) {
    return request<PublicMeetingInvitation>(`/api/public/invitations/${encodeURIComponent(token)}`);
  },
  publicProducts(origin = "") {
    const query = origin ? `?origin=${encodeURIComponent(origin)}` : "";
    return request<PublicLandingProduct[]>(`/api/public/products${query}`);
  },
  publicProduct(bookingToken: string) {
    return request<PublicProductBooking>(`/api/public/products/${encodeURIComponent(bookingToken)}`);
  },
  publicProductSlots(bookingToken: string, date: string) {
    return request<ProductAvailableSlot[]>(
      `/api/public/products/${encodeURIComponent(bookingToken)}/slots?date=${encodeURIComponent(date)}`
    );
  },
  bookProductSupport(
    bookingToken: string,
    payload: PublicBookingPayload
  ) {
    return request<ClientBooking>(`/api/public/products/${encodeURIComponent(bookingToken)}/book`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  widgetConfig(publicWidgetId: string, hostOrigin = "") {
    return request<WidgetConfig>(`/api/widget/${encodeURIComponent(publicWidgetId)}/config`, {
      headers: hostOrigin ? { "X-Widget-Origin": hostOrigin } : undefined
    });
  },
  widgetProducts(publicWidgetId: string, hostOrigin = "") {
    return request<PublicLandingProduct[]>(`/api/widget/${encodeURIComponent(publicWidgetId)}/products`, {
      headers: hostOrigin ? { "X-Widget-Origin": hostOrigin } : undefined
    });
  },
  widgetAvailability(publicWidgetId: string, date: string, hostOrigin = "") {
    return request<ProductAvailableSlot[]>(
      `/api/widget/${encodeURIComponent(publicWidgetId)}/availability?date=${encodeURIComponent(date)}`,
      {
        headers: hostOrigin ? { "X-Widget-Origin": hostOrigin } : undefined
      }
    );
  },
  bookWidget(publicWidgetId: string, hostOrigin: string, payload: PublicBookingPayload) {
    return request<ClientBooking>(`/api/widget/${encodeURIComponent(publicWidgetId)}/bookings`, {
      method: "POST",
      headers: hostOrigin ? { "X-Widget-Origin": hostOrigin } : undefined,
      body: JSON.stringify(payload)
    });
  },
  slots(userSlug: string, eventSlug: string, startDate: string) {
    return request<Slot[]>(`/api/public/${userSlug}/${eventSlug}/slots?start_date=${startDate}`);
  },
  book(
    userSlug: string,
    eventSlug: string,
    payload: {
      start_utc: string;
      invitee_name: string;
      invitee_email: string;
      invitee_timezone: string;
      invitee_message: string;
      answers: Record<string, string>;
    }
  ) {
    return request<Booking>(`/api/public/${userSlug}/${eventSlug}/book`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}
