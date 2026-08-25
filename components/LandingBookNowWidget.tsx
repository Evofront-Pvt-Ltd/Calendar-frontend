"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Clock3,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Video,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import type { ClientBooking, ProductAvailableSlot, PublicLandingProduct } from "@/types";

type BookingStep = 0 | 1 | 2;

type InterviewForm = {
  name: string;
  email: string;
  company: string;
  phone: string;
  productReference: string;
  subject: string;
  description: string;
  timezone: string;
  consent: boolean;
};

type LandingBookNowWidgetProps = {
  widgetId?: string;
  embedded?: boolean;
  hostOrigin?: string;
  singleWorkspaceMode?: boolean;
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toDateInput(date);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(new Date(value));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(new Date(value));
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

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isFocusable(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && !element.hasAttribute("disabled") && element.tabIndex !== -1;
}

function currentHostOrigin(explicitOrigin = "") {
  if (explicitOrigin) {
    return explicitOrigin;
  }
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  const queryOrigin = params.get("host_origin") || "";
  if (queryOrigin) {
    return queryOrigin;
  }
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      return "";
    }
  }
  return window.location.origin;
}

export default function LandingBookNowWidget({
  widgetId = "",
  embedded = false,
  hostOrigin = "",
  singleWorkspaceMode = false
}: LandingBookNowWidgetProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const localTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", []);
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(index)), []);

  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<PublicLandingProduct[]>([]);
  const [selectedProductToken, setSelectedProductToken] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productError, setProductError] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Book Now");
  const [actionLabel, setActionLabel] = useState("Schedule to connect team");
  const [step, setStep] = useState<BookingStep>(0);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [slots, setSlots] = useState<ProductAvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ProductAvailableSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<InterviewForm>({
    name: "",
    email: "",
    company: "",
    phone: "",
    productReference: "",
    subject: "",
    description: "",
    timezone: localTimezone,
    consent: false
  });

  const selectedProduct = products.find((product) => product.booking_token === selectedProductToken) || null;
  const detailsValid =
    form.name.trim().length >= 2 &&
    emailLooksValid(form.email) &&
    form.subject.trim().length >= 2 &&
    form.description.trim().length >= 2 &&
    Boolean(selectedProduct);
  const canSubmit = detailsValid && Boolean(selectedSlot) && form.consent && !submitting;

  async function loadProducts() {
    if (productsLoaded || productsLoading) {
      return;
    }
    setProductsLoading(true);
    setProductError("");
    try {
      if (widgetId) {
        const config = await api.widgetConfig(widgetId, currentHostOrigin(hostOrigin));
        setButtonLabel(config.button_label || "Book Now");
        setActionLabel(config.action_label || "Schedule to connect team");
        if (!config.enabled) {
          throw new Error("This booking widget is not active");
        }
        const loaded = [config.product];
        setProducts(loaded);
        setProductsLoaded(true);
        setSelectedProductToken((current) => current || loaded[0].booking_token);
        return;
      }
      const loadedProducts = await api.publicProducts();
      const loaded = singleWorkspaceMode && loadedProducts.length > 0 ? [loadedProducts[0]] : loadedProducts;
      setProducts(loaded);
      setProductsLoaded(true);
      if (loaded.length > 0) {
        setSelectedProductToken((current) => current || loaded[0].booking_token);
      }
    } catch (caught) {
      setProductError(caught instanceof Error ? caught.message : "Unable to load products");
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadSlots(productToken: string, date: string) {
    setSlotsLoading(true);
    setSlotError("");
      setSelectedSlot(null);
    try {
      const loaded = widgetId
        ? await api.widgetAvailability(widgetId, date, currentHostOrigin(hostOrigin))
        : await api.publicProductSlots(productToken, date);
      setSlots(loaded);
    } catch (caught) {
      setSlots([]);
      setSlotError(caught instanceof Error ? caught.message : "Unable to load available times");
    } finally {
      setSlotsLoading(false);
    }
  }

  function openScheduler() {
    setExpanded(false);
    setModalOpen(true);
    void loadProducts();
  }

  function closeScheduler() {
    if (submitting) {
      return;
    }
    setModalOpen(false);
    setNotice("");
    setSubmitError("");
    triggerRef.current?.focus();
  }

  function resetFlow() {
    setStep(0);
    setSelectedDate(dates[0]);
    setSelectedSlot(null);
    setBooking(null);
    setSubmitError("");
    setNotice("");
  }

  function updateForm<K extends keyof InterviewForm>(key: K, value: InterviewForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    setSubmitError("");
    if (step === 0 && !detailsValid) {
      setSubmitError("Please complete the required visitor and product details.");
      return;
    }
    if (step === 1 && !selectedSlot) {
      setSubmitError("Please choose an available time.");
      return;
    }
    setStep((current) => Math.min(current + 1, 2) as BookingStep);
  }

  function goBack() {
    setSubmitError("");
    setStep((current) => Math.max(current - 1, 0) as BookingStep);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct || !selectedSlot || !canSubmit) {
      setSubmitError("Please review the required fields before confirming.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        slot_key: selectedSlot.slot_key,
        client_name: form.name.trim(),
        client_email: form.email.trim().toLowerCase(),
        client_phone: form.phone.trim(),
        client_company: form.company.trim(),
        product_reference_number: form.productReference.trim(),
        issue_category: "Team connection",
        issue_title: form.subject.trim(),
        issue_description: form.description.trim(),
        priority: "normal",
        client_timezone: form.timezone,
        consent_confirmed: form.consent
      } as const;
      const created = widgetId
        ? await api.bookWidget(widgetId, currentHostOrigin(hostOrigin), payload)
        : await api.bookProductSupport(selectedProduct.booking_token, payload);
      setBooking(created);
      setNotice(
        created.status === "pending_approval"
          ? "Your request was sent to the workspace controller for review."
          : "Your team connection booking was submitted successfully."
      );
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Unable to confirm this booking");
      if (selectedProduct) {
        void loadSlots(selectedProduct.booking_token, selectedDate);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyMeetLink() {
    if (!booking?.google_meet_url) {
      return;
    }
    await navigator.clipboard.writeText(booking.google_meet_url);
    setNotice("Google Meet link copied.");
  }

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])"
      );
      first?.focus();
    }, 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeScheduler();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }
      const focusable = Array.from(
        modalRef.current.querySelectorAll("input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])")
      ).filter(isFocusable);
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen, submitting]);

  useEffect(() => {
    if (modalOpen && selectedProductToken) {
      void loadSlots(selectedProductToken, selectedDate);
    }
  }, [modalOpen, selectedProductToken, selectedDate]);

  useEffect(() => {
    if (!embedded || typeof window === "undefined") {
      return;
    }
    const message = {
      type: "calendar-booking:resize",
      width: modalOpen ? 880 : expanded ? 360 : 96,
      height: modalOpen ? 720 : expanded ? 190 : 176,
      expanded,
      modalOpen
    };
    window.parent?.postMessage(message, "*");
  }, [embedded, expanded, modalOpen]);

  return (
    <>
      <aside className={`book-now-widget${expanded ? " expanded" : ""}${embedded ? " embedded" : ""}`} aria-label="Booking shortcuts">
        <button
          ref={triggerRef}
          aria-expanded={expanded}
          className="book-now-tab"
          onClick={() => {
            setExpanded((current) => !current);
            void loadProducts();
          }}
          type="button"
        >
          <CalendarCheck size={20} />
          <span>{buttonLabel}</span>
          <ChevronLeft className="book-now-tab-chevron" size={17} />
        </button>
        {expanded && (
          <div ref={panelRef} className="book-now-panel">
            <button aria-label="Close booking shortcuts" className="book-panel-close" onClick={() => setExpanded(false)} type="button">
              <X size={17} />
            </button>
            <button className="book-panel-option" onClick={openScheduler} type="button">
              <span className="book-panel-icon">
                <CalendarDays size={21} />
              </span>
              <span>
                <strong>{actionLabel}</strong>
                <small>Choose a convenient date and time</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </aside>

      {modalOpen && (
        <div className="interview-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeScheduler();
          }
        }}>
          <section
            ref={modalRef}
            aria-describedby="interview-modal-description"
            aria-labelledby="interview-modal-title"
            aria-modal="true"
            className="interview-modal"
            role="dialog"
          >
            <header className="interview-modal-header">
              <button aria-label={`Close ${actionLabel}`} className="modal-icon-button" onClick={closeScheduler} type="button">
                <X size={20} />
              </button>
              <div>
                <span>Public booking</span>
                <h2 id="interview-modal-title">{actionLabel}</h2>
                <p id="interview-modal-description">Share a few details and choose a time that works for you.</p>
              </div>
              <ol className="interview-stepper" aria-label="Booking progress">
                {["Details", "Time", "Review"].map((label, index) => (
                  <li className={step === index ? "active" : step > index ? "done" : ""} key={label}>
                    <span>{index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
            </header>

            <form className="interview-modal-body" onSubmit={submitBooking}>
              {booking ? (
                <SuccessState booking={booking} product={selectedProduct} notice={notice} onCopyMeetLink={copyMeetLink} />
              ) : (
                <>
                  <div className="interview-step-region" aria-live="polite">
                    {step === 0 && (
                      <DetailsStep
                        form={form}
                        productError={productError}
                        products={products}
                        productsLoading={productsLoading}
                        selectedProduct={selectedProduct}
                        selectedProductToken={selectedProductToken}
                        hideProductSelector={embedded || Boolean(widgetId) || singleWorkspaceMode || products.length <= 1}
                        updateForm={updateForm}
                        onProductChange={(token) => {
                          setSelectedProductToken(token);
                          setSelectedSlot(null);
                          setSlots([]);
                        }}
                      />
                    )}
                    {step === 1 && selectedProduct && (
                      <TimeStep
                        dates={dates}
                        product={selectedProduct}
                        selectedDate={selectedDate}
                        selectedSlot={selectedSlot}
                        slotError={slotError}
                        slots={slots}
                        slotsLoading={slotsLoading}
                        timezone={form.timezone}
                        onDate={setSelectedDate}
                        onSlot={setSelectedSlot}
                        onTimezone={(timezone) => updateForm("timezone", timezone)}
                      />
                    )}
                    {step === 2 && selectedProduct && selectedSlot && (
                      <ReviewStep form={form} product={selectedProduct} selectedSlot={selectedSlot} updateForm={updateForm} />
                    )}
                  </div>

                  {(submitError || productError) && (
                    <p className="interview-error" role="alert">
                      {submitError || productError}
                    </p>
                  )}
                </>
              )}

              <footer className="interview-modal-footer">
                {booking ? (
                  <>
                    <button className="booking-secondary-action" onClick={resetFlow} type="button">
                      Book another time
                    </button>
                    <button className="booking-primary-action" onClick={closeScheduler} type="button">
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button className="booking-secondary-action" disabled={step === 0 || submitting} onClick={goBack} type="button">
                      <ArrowLeft size={17} />
                      Back
                    </button>
                    {step < 2 ? (
                      <button
                        className="booking-primary-action"
                        disabled={(step === 0 && !detailsValid) || (step === 1 && !selectedSlot)}
                        onClick={goNext}
                        type="button"
                      >
                        Continue
                        <ChevronsRight size={17} />
                      </button>
                    ) : (
                      <button className="booking-primary-action" disabled={!canSubmit} type="submit">
                        {submitting ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                        {selectedProduct?.booking_mode === "approval" ? "Confirm Request" : "Confirm Booking"}
                      </button>
                    )}
                  </>
                )}
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function DetailsStep({
  form,
  hideProductSelector,
  productError,
  products,
  productsLoading,
  selectedProduct,
  selectedProductToken,
  updateForm,
  onProductChange
}: {
  form: InterviewForm;
  hideProductSelector: boolean;
  productError: string;
  products: PublicLandingProduct[];
  productsLoading: boolean;
  selectedProduct: PublicLandingProduct | null;
  selectedProductToken: string;
  updateForm: <K extends keyof InterviewForm>(key: K, value: InterviewForm[K]) => void;
  onProductChange: (token: string) => void;
}) {
  return (
    <div className="interview-form-grid">
      <label>
        Full name
        <input autoComplete="name" required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
      </label>
      <label>
        Email address
        <input
          autoComplete="email"
          required
          type="email"
          value={form.email}
          onChange={(event) => updateForm("email", event.target.value)}
        />
      </label>
      <label>
        Company
        <input autoComplete="organization" value={form.company} onChange={(event) => updateForm("company", event.target.value)} />
      </label>
      <label>
        Phone
        <input
          autoComplete="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={(event) => updateForm("phone", event.target.value)}
        />
      </label>
      {hideProductSelector ? (
        <div className="wide-field selected-workspace-note" aria-live="polite">
          <span>Booking with</span>
          <strong>{productsLoading ? "Loading workspace..." : selectedProduct?.name || "Workspace"}</strong>
          {productError && <small className="field-note error">{productError}</small>}
        </div>
      ) : (
        <label className="wide-field">
          Product
          <select
            disabled={productsLoading || products.length <= 1}
            required
            value={selectedProductToken}
            onChange={(event) => onProductChange(event.target.value)}
          >
            {productsLoading && <option>Loading products...</option>}
            {!productsLoading && products.length === 0 && <option value="">No active products available</option>}
            {products.map((product) => (
              <option key={product.booking_token} value={product.booking_token}>
                {product.name}
              </option>
            ))}
          </select>
          {productError && <small className="field-note error">{productError}</small>}
        </label>
      )}
      <label className="wide-field">
        Product, account, or reference number
        <input value={form.productReference} onChange={(event) => updateForm("productReference", event.target.value)} />
      </label>
      <label className="wide-field">
        Meeting subject
        <input required value={form.subject} onChange={(event) => updateForm("subject", event.target.value)} />
      </label>
      <label className="wide-field">
        Short description or reason for the call
        <textarea required value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
      </label>
    </div>
  );
}

function TimeStep({
  dates,
  product,
  selectedDate,
  selectedSlot,
  slotError,
  slots,
  slotsLoading,
  timezone,
  onDate,
  onSlot,
  onTimezone
}: {
  dates: string[];
  product: PublicLandingProduct;
  selectedDate: string;
  selectedSlot: ProductAvailableSlot | null;
  slotError: string;
  slots: ProductAvailableSlot[];
  slotsLoading: boolean;
  timezone: string;
  onDate: (date: string) => void;
  onSlot: (slot: ProductAvailableSlot) => void;
  onTimezone: (timezone: string) => void;
}) {
  return (
    <div className="interview-time-layout">
      <aside className="interview-product-card">
        <span className="product-avatar" style={{ background: product.color || "#006bff" }}>
          {product.icon || product.name.slice(0, 1).toUpperCase()}
        </span>
        <h3>{product.name}</h3>
        {product.description && <p>{product.description}</p>}
        <div>
          <span>
            <Clock3 size={16} />
            {product.appointment_duration_minutes} min
          </span>
          <span>
            <Video size={16} />
            Google Meet when connected
          </span>
          <span>
            <ShieldCheck size={16} />
            {supportWindowLabel(product.support_start_time, product.support_end_time)} {product.timezone}
          </span>
        </div>
      </aside>
      <div className="interview-slots-panel">
        <label>
          Preferred timezone
          <input list="interview-timezone-options" value={timezone} onChange={(event) => onTimezone(event.target.value)} />
          <datalist id="interview-timezone-options">
            {[timezone, product.timezone, "Asia/Kolkata", "UTC", "America/New_York", "Europe/London"].filter(
              (value, index, values) => value && values.indexOf(value) === index
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </datalist>
        </label>

        <div>
          <h3>Select a date</h3>
          <div className="interview-date-grid">
            {dates.map((date) => (
              <button
                className={selectedDate === date ? "active" : ""}
                key={date}
                onClick={() => onDate(date)}
                type="button"
              >
                <span>{formatDate(date, { weekday: "short" })}</span>
                <strong>{formatDate(date, { day: "numeric", month: "short" })}</strong>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3>Available times</h3>
          {slotsLoading ? (
            <div className="slot-loading-row">
              <Loader2 className="spin" size={18} />
              Loading available times
            </div>
          ) : (
            <div className="interview-slot-grid">
              {slots.map((slot) => (
                <button
                  className={selectedSlot?.slot_key === slot.slot_key ? "active" : ""}
                  key={slot.slot_key}
                  onClick={() => onSlot(slot)}
                  type="button"
                >
                  {formatTime(slot.start_time_utc, timezone)}
                </button>
              ))}
              {slots.length === 0 && <p>No team connection times are available for this date. Please choose another date.</p>}
            </div>
          )}
          {slotError && <p className="interview-error compact">{slotError}</p>}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  form,
  product,
  selectedSlot,
  updateForm
}: {
  form: InterviewForm;
  product: PublicLandingProduct;
  selectedSlot: ProductAvailableSlot;
  updateForm: <K extends keyof InterviewForm>(key: K, value: InterviewForm[K]) => void;
}) {
  const items = [
    ["Name", form.name],
    ["Email", form.email],
    ["Company", form.company || "Not provided"],
    ["Product", product.name],
    ["Reference", form.productReference || "Not provided"],
    ["Subject", form.subject],
    ["Date and time", `${formatDateTime(selectedSlot.start_time_utc, form.timezone)} (${form.timezone})`],
    ["Duration", `${product.appointment_duration_minutes} minutes`],
    ["Location", "Google Meet when calendar is connected"]
  ];

  return (
    <div className="interview-review">
      <div className="review-card">
        {items.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <label className="consent-row">
        <input checked={form.consent} onChange={(event) => updateForm("consent", event.target.checked)} type="checkbox" />
        <span>Confirm and allow the organization to contact me about this booking.</span>
      </label>
    </div>
  );
}

function SuccessState({
  booking,
  product,
  notice,
  onCopyMeetLink
}: {
  booking: ClientBooking;
  product: PublicLandingProduct | null;
  notice: string;
  onCopyMeetLink: () => void;
}) {
  const pendingApproval = booking.status === "pending_approval";
  return (
    <div className="interview-success">
      <span className="success-mark">
        <Check size={28} />
      </span>
      <h3>{pendingApproval ? "Your team connection request has been received" : "Your team connection has been scheduled"}</h3>
      <p>Reference: {booking.public_booking_reference}</p>
      <div className="review-card">
        <div>
          <span>Product</span>
          <strong>{product?.name || "Selected product"}</strong>
        </div>
        <div>
          <span>Date and time</span>
          <strong>{formatDateTime(booking.start_time_utc, booking.client_timezone)} ({booking.client_timezone})</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>
            {Math.round((new Date(booking.end_time_utc).getTime() - new Date(booking.start_time_utc).getTime()) / 60000)} minutes
          </strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{pendingApproval ? "Pending controller approval" : booking.status === "scheduled" ? "Confirmed" : booking.status}</strong>
        </div>
      </div>
      {pendingApproval && <p>The workspace controller will review this request and send the final meeting invitation after approval.</p>}
      {booking.google_meet_url ? (
        <button className="booking-primary-action inline-action" onClick={onCopyMeetLink} type="button">
          <Video size={18} />
          Copy Google Meet link
        </button>
      ) : (
        <p className="field-note">Google Meet will appear when Calendar integration is enabled and connected.</p>
      )}
      {notice && <p className="field-note success">{notice}</p>}
    </div>
  );
}
