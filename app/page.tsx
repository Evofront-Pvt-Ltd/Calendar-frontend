"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Menu,
  MousePointerClick,
  Network,
  Play,
  Route,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Video,
  Workflow,
  X,
  Zap
} from "lucide-react";
import LandingBookNowWidget from "@/components/LandingBookNowWidget";

type Icon = ComponentType<{ size?: number; className?: string }>;
type BillingMode = "yearly" | "monthly";

const navMenus = {
  product: [
    ["Scheduling automation", "Create flexible links and event types"],
    ["Meeting routing", "Send qualified leads to the right team"],
    ["Workflows", "Automate reminders and follow-ups"],
    ["Analytics", "See conversion and meeting trends"]
  ],
  platform: [
    ["Calendar sync", "Connect work and personal calendars"],
    ["Integrations", "Use 100+ connected tools"],
    ["Admin controls", "Manage teams, roles, and access"],
    ["Security", "Enterprise-grade data protection"]
  ]
};

const companyMarks = ["Northstar", "Aperture", "Summit", "BluePeak", "Vertex", "Orbit"];

const howItWorks = [
  { icon: CalendarDays, title: "Connect your calendars", copy: "Sync work and personal calendars so availability stays accurate." },
  { icon: Clock3, title: "Add your availability", copy: "Define working hours, buffers, minimum notice, and meeting limits." },
  { icon: Video, title: "Connect conferencing tools", copy: "Attach video, phone, in-person, or custom meeting locations." },
  { icon: LayoutDashboard, title: "Customize your event types", copy: "Create one-on-one, team, round robin, and collective scheduling links." },
  { icon: Send, title: "Share your scheduling link", copy: "Send links directly, embed times in email, or publish your booking page." }
];

const integrations = [
  { icon: CalendarCheck, title: "Google Calendar / Meet", copy: "Keep calendar holds and video links in sync." },
  { icon: BriefcaseBusiness, title: "Microsoft Teams / Outlook", copy: "Book meetings across Microsoft workspaces." },
  { icon: Video, title: "Zoom", copy: "Generate meeting links automatically." },
  { icon: Smartphone, title: "Slack", copy: "Send team alerts when meetings are booked." },
  { icon: Network, title: "Salesforce / CRM", copy: "Route prospects and update account records." },
  { icon: CreditCard, title: "Stripe / Payments", copy: "Collect payments before paid sessions." }
];

const featureCards = [
  { icon: MousePointerClick, title: "Browser extensions", copy: "Insert availability without leaving your inbox or browser." },
  { icon: Workflow, title: "Automated workflows", copy: "Trigger reminders, surveys, and follow-up messages." },
  { icon: Route, title: "Routing forms", copy: "Qualify visitors and route them to the best person." },
  { icon: Users, title: "Round robin events", copy: "Distribute meetings fairly across a team." },
  { icon: CalendarCheck, title: "Collective events", copy: "Show times that work for multiple hosts." },
  { icon: LockKeyhole, title: "Admin management", copy: "Control users, settings, permissions, and workspace defaults." },
  { icon: BarChart3, title: "Analytics", copy: "Measure booking volume, conversion, and team performance." },
  { icon: FileText, title: "Email and website embeds", copy: "Place available times where prospects already are." }
];

const results = [
  ["169%", "return on investment"],
  ["160%", "increase in customers reached"],
  ["20%", "decrease in scheduling errors"],
  ["8 days", "reduction in time-to-hire"],
  ["26%", "increase in website bookings"]
];

const securityItems = [
  "Enterprise admin management",
  "Security integrations",
  "Data governance",
  "Compliance audits",
  "Privacy protections"
];

const footerColumns = [
  {
    title: "Product",
    links: ["Scheduling automation", "Meeting routing", "Event types", "Reminders and follow-ups", "Analytics", "Pricing"]
  },
  {
    title: "Integrations",
    links: ["Google Calendar", "Microsoft Outlook", "Zoom", "Slack", "Salesforce", "Stripe"]
  },
  {
    title: "Company",
    links: ["Security", "Blog", "Customer stories", "Careers", "Contact us"]
  },
  {
    title: "Resources",
    links: ["Help center", "Getting started guide", "Community", "API docs", "Status"]
  },
  {
    title: "Downloads",
    links: ["App Store", "Google Play", "Chrome extension", "Desktop app"]
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Legal", "Cookie Settings", "Terms"]
  }
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"product" | "platform" | null>(null);
  const [bookingDate, setBookingDate] = useState("Wed 21");
  const [bookingTime, setBookingTime] = useState("10:30 AM");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [billing, setBilling] = useState<BillingMode>("yearly");
  const [textReminder, setTextReminder] = useState(true);
  const [emailFollowUp, setEmailFollowUp] = useState(true);

  return (
    <main className="home-shell">
      <Header
        activeMenu={activeMenu}
        mobileOpen={mobileOpen}
        onMenuChange={setActiveMenu}
        onMobileToggle={() => setMobileOpen((current) => !current)}
      />
      <LandingBookNowWidget />

      <section className="home-hero" id="top">
        <div className="hero-grid-scene" aria-hidden="true" />
        <div className="home-hero-copy">
          <span className="home-pill">
            <Sparkles size={16} />
            Scheduling automation for every team
          </span>
          <h1>Easy meeting booking ahead</h1>
          <p>
            Share scheduling links, connect calendars, reduce no-shows, and help every team book the right meeting
            without email back-and-forth.
          </p>
          <div className="home-cta-stack">
            <a className="home-button primary" href="/signup">
              <Mail size={18} />
              Sign up with email
            </a>
            <a className="home-button secondary" href="#product">
              View booking flow
              <ArrowRight size={17} />
            </a>
            {/*
            Google/Microsoft OAuth CTAs are parked for future reactivation.

            <a className="home-button primary" href="/signup?provider=google">
              <Globe2 size={18} />
              Sign up with Google
            </a>
            <a className="home-button secondary" href="/signup?provider=microsoft">
              <BriefcaseBusiness size={18} />
              Sign up with Microsoft
            </a>
            */}
            <a className="home-button text" href="/signup">
              Sign up free with email
              <ArrowRight size={17} />
            </a>
          </div>
          <span className="home-note">No credit card required</span>
        </div>
        <div className="hero-product-scene" aria-label="Booking product preview">
          <HeroProductMockup />
        </div>
      </section>

      <section className="home-section booking-section" id="product">
        <SectionHeading
          eyebrow="Booking pages"
          title="Share one page that handles the whole booking flow"
          copy="Send a scheduling link, embed availability on a website, or place available times directly into email. Invitees pick a time and your calendar stays updated."
        />
        <BookingMockup
          bookingConfirmed={bookingConfirmed}
          selectedDate={bookingDate}
          selectedTime={bookingTime}
          onConfirm={() => setBookingConfirmed(true)}
          onDate={(date) => {
            setBookingDate(date);
            setBookingConfirmed(false);
          }}
          onTime={(time) => {
            setBookingTime(time);
            setBookingConfirmed(false);
          }}
        />
      </section>

      <section className="home-section automation-section" id="solutions">
        <div className="section-split">
          <SectionHeading
            eyebrow="Automation"
            title="Reduce no-shows and keep every meeting on track"
            copy="Use automated workflows to remind invitees, prepare hosts, and follow up after the meeting ends."
            align="left"
          />
          <div className="workflow-stack">
            <WorkflowCard
              active={textReminder}
              icon={BellRing}
              title="Send text reminder"
              copy="24 hours before event starts"
              onToggle={() => setTextReminder((current) => !current)}
            />
            <WorkflowCard
              active={emailFollowUp}
              icon={Mail}
              title="Send follow-up email"
              copy="2 hours after event ends"
              onToggle={() => setEmailFollowUp((current) => !current)}
            />
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <p>Trusted by more than 100,000 leading organizations</p>
        <div className="company-row" aria-label="Placeholder company marks">
          {companyMarks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </section>

      <section className="home-section" id="platform">
        <SectionHeading
          eyebrow="How it works"
          title="Make scheduling simple from setup to booked"
          copy="Build your scheduling system once, then let every meeting flow through clean calendar rules and automation."
        />
        <div className="timeline-grid">
          {howItWorks.map((step, index) => (
            <article className="timeline-card" key={step.title}>
              <span className="timeline-index">{index + 1}</span>
              <step.icon size={24} />
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section integrations-section">
        <SectionHeading
          eyebrow="Integrations"
          title="Connect to the tools you already use"
          copy="Bring scheduling into the calendars, video tools, CRM, messaging, and payment systems your team already depends on."
        />
        <div className="integration-grid">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.title} {...integration} />
          ))}
        </div>
        <a className="home-button secondary center-action" href="#footer">
          View all integrations
          <ExternalLink size={17} />
        </a>
      </section>

      <section className="home-section product-features-section">
        <SectionHeading
          eyebrow="Product"
          title="More than a scheduling link"
          copy="Give individuals and teams a connected workspace for routing, reminders, event types, analytics, and admin management."
        />
        <div className="feature-mockup-layout">
          <div className="feature-grid">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
          <DashboardMockup />
        </div>
      </section>

      <section className="home-section pricing-section" id="pricing">
        <SectionHeading
          eyebrow="Pricing"
          title="Pick the perfect plan for your team"
          copy="Start free, then add automations, team scheduling, routing, analytics, and enterprise controls as you grow."
        />
        <div className="billing-toggle" aria-label="Billing period">
          <button className={billing === "yearly" ? "active" : ""} onClick={() => setBilling("yearly")} type="button">
            Billed yearly
          </button>
          <button className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")} type="button">
            Billed monthly
          </button>
        </div>
        <div className="pricing-grid">
          <PricingCard
            cta="Get started"
            description="Always free, personal use"
            features={["1 active event type", "Basic booking link", "Calendar connection"]}
            name="Free"
            price="$0"
          />
          <PricingCard
            cta="Try for free"
            description="For professionals who need automation"
            features={["Unlimited event types", "Automated reminders", "Email embeds"]}
            name="Standard"
            price={billing === "yearly" ? "$10" : "$12"}
            suffix="/seat/mo"
          />
          <PricingCard
            cta="Try for free"
            description="For teams that share scheduling"
            features={["Round robin events", "Team analytics", "Shared workflows"]}
            highlighted
            name="Teams"
            price={billing === "yearly" ? "$16" : "$20"}
            suffix="/seat/mo"
          />
          <PricingCard
            cta="Talk to sales"
            description="For enterprise governance"
            features={["Advanced admin", "Security reviews", "Dedicated support"]}
            name="Enterprise"
            price="$15k"
            suffix="/yr"
          />
        </div>
      </section>

      <section className="home-section results-section">
        <SectionHeading
          eyebrow="Customer results"
          title="Businesses grow faster when meetings are easier to book"
          copy="From sales calls to recruiting loops, scheduling automation helps teams move faster with fewer manual steps."
        />
        <div className="results-grid">
          {results.map(([metric, label]) => (
            <article className="result-card" key={label}>
              <strong>{metric}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        <a className="home-button secondary center-action" href="#resources">
          View customer stories
          <ArrowRight size={17} />
        </a>
      </section>

      <section className="home-section security-section">
        <div className="section-split">
          <SectionHeading
            eyebrow="Security"
            title="Keep your organization secure while scheduling stays easy"
            copy="Support enterprise teams with controls for data governance, privacy, access, and compliance review workflows."
            align="left"
          />
          <div className="security-list">
            {securityItems.map((item) => (
              <span key={item}>
                <ShieldCheck size={19} />
                {item}
              </span>
            ))}
            <a className="home-button secondary" href="#resources">
              Learn more
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <section className="final-cta" id="demo">
        <Sparkles size={28} />
        <h2>Power up your scheduling</h2>
        <p>Get started in seconds - for free.</p>
        <div>
          <a className="home-button primary" href="/signup">
            Start for free
            <ArrowRight size={17} />
          </a>
          <a className="home-button secondary light" href="/login">
            Get a demo
            <Play size={17} />
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header({
  activeMenu,
  mobileOpen,
  onMenuChange,
  onMobileToggle
}: {
  activeMenu: "product" | "platform" | null;
  mobileOpen: boolean;
  onMenuChange: (menu: "product" | "platform" | null) => void;
  onMobileToggle: () => void;
}) {
  const mobileMenuId = "home-mobile-menu";
  const closeMobileMenu = () => {
    if (mobileOpen) {
      onMobileToggle();
    }
  };

  return (
    <header className="home-header">
      <a className="home-brand" href="#top" aria-label="Calendar Booking home">
        <span>
          <CalendarCheck size={24} />
        </span>
        Calendar Booking
      </a>
      <nav className="home-nav" aria-label="Main navigation">
        <MenuButton activeMenu={activeMenu} id="product" label="Product" onMenuChange={onMenuChange} />
        <MenuButton activeMenu={activeMenu} id="platform" label="Platform" onMenuChange={onMenuChange} />
        <a href="#solutions">Solutions</a>
        <a href="#resources">Resources</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div className="home-header-actions">
        <a className="home-login-link" href="/login">Log In</a>
        <a className="home-button primary small" href="/signup">Get started for free</a>
      </div>
      <button
        aria-controls={mobileMenuId}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        className="mobile-menu-button"
        onClick={onMobileToggle}
        type="button"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && (
        <nav className="mobile-menu" id={mobileMenuId} aria-label="Mobile navigation">
          <a href="#product" onClick={closeMobileMenu}>Product</a>
          <a href="#platform" onClick={closeMobileMenu}>Platform</a>
          <a href="#solutions" onClick={closeMobileMenu}>Solutions</a>
          <a href="#resources" onClick={closeMobileMenu}>Resources</a>
          <a href="#pricing" onClick={closeMobileMenu}>Pricing</a>
          <a href="/login" onClick={closeMobileMenu}>Log In</a>
          <a className="home-button primary" href="/signup" onClick={closeMobileMenu}>Get started for free</a>
        </nav>
      )}
    </header>
  );
}

function MenuButton({
  activeMenu,
  id,
  label,
  onMenuChange
}: {
  activeMenu: "product" | "platform" | null;
  id: "product" | "platform";
  label: string;
  onMenuChange: (menu: "product" | "platform" | null) => void;
}) {
  const open = activeMenu === id;
  return (
    <div className="nav-menu-wrap" onMouseEnter={() => onMenuChange(id)} onMouseLeave={() => onMenuChange(null)}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onMenuChange(open ? null : id)}
        type="button"
      >
        {label}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="nav-mega-menu">
          {navMenus[id].map(([title, copy]) => (
            <a href={`#${id}`} key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  align = "center",
  copy,
  eyebrow,
  title
}: {
  align?: "center" | "left";
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={`home-section-heading ${align}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function HeroProductMockup() {
  return (
    <div className="hero-booking-mockup">
      <div className="mockup-toolbar">
        <span />
        <span />
        <span />
        <strong>calendarbooking.local/m/demo</strong>
      </div>
      <div className="hero-booking-body">
        <aside>
          <span className="mock-avatar">M</span>
          <h3>Product strategy call</h3>
          <p>30 min - Video meeting</p>
          <div>
            <Clock3 size={17} />
            Asia/Kolkata
          </div>
        </aside>
        <div className="hero-calendar-card">
          <strong>Select a date</strong>
          <div className="mini-month">
            {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
              <span key={day}>{day}</span>
            ))}
            {Array.from({ length: 28 }, (_, index) => (
              <button className={index === 16 ? "selected" : ""} key={index} type="button">
                {index + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-times-card">
          <strong>Wednesday, 21</strong>
          {["9:00 AM", "10:30 AM", "1:00 PM"].map((time, index) => (
            <button className={index === 1 ? "selected" : ""} key={time} type="button">
              {time}
            </button>
          ))}
          <button className="confirm-mini" type="button">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function BookingMockup({
  bookingConfirmed,
  onConfirm,
  onDate,
  onTime,
  selectedDate,
  selectedTime
}: {
  bookingConfirmed: boolean;
  onConfirm: () => void;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  selectedDate: string;
  selectedTime: string;
}) {
  const dates = ["Mon 19", "Tue 20", "Wed 21", "Thu 22", "Fri 23"];
  const times = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

  return (
    <div className="booking-mockup">
      <div className="booking-info-panel">
        <span className="mock-avatar">A</span>
        <h3>Discovery Meeting</h3>
        <p>Meet with our scheduling team to map your ideal booking flow.</p>
        <div className="booking-facts">
          <span>
            <Clock3 size={17} />
            30 min
          </span>
          <span>
            <Video size={17} />
            Video meeting
          </span>
          <span>
            <Globe2 size={17} />
            Asia/Kolkata
          </span>
        </div>
      </div>
      <div className="booking-picker-panel">
        {bookingConfirmed ? (
          <div className="booking-confirmed">
            <span>
              <Check size={28} />
            </span>
            <h3>Meeting booked</h3>
            <p>
              Discovery Meeting is confirmed for {selectedDate} at {selectedTime}.
            </p>
            <button onClick={() => onDate(selectedDate)} type="button">Pick another time</button>
          </div>
        ) : (
          <>
            <strong>Select a date and time</strong>
            <div className="date-choice-row">
              {dates.map((date) => (
                <button className={date === selectedDate ? "active" : ""} key={date} onClick={() => onDate(date)} type="button">
                  {date}
                </button>
              ))}
            </div>
            <div className="time-choice-grid">
              {times.map((time) => (
                <button className={time === selectedTime ? "active" : ""} key={time} onClick={() => onTime(time)} type="button">
                  {time}
                </button>
              ))}
            </div>
            <label className="timezone-select">
              Time zone
              <select defaultValue="Asia/Kolkata">
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="America/New_York">America/New York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </label>
            <button className="home-button primary full" onClick={onConfirm} type="button">
              Confirm booking
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({
  active,
  copy,
  icon: IconComponent,
  onToggle,
  title
}: {
  active: boolean;
  copy: string;
  icon: Icon;
  onToggle: () => void;
  title: string;
}) {
  return (
    <article className={`workflow-card ${active ? "active" : ""}`}>
      <IconComponent size={24} />
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <button aria-pressed={active} className="toggle-switch" onClick={onToggle} type="button">
        <span />
      </button>
    </article>
  );
}

function IntegrationCard({ copy, icon: IconComponent, title }: { copy: string; icon: Icon; title: string }) {
  return (
    <article className="integration-card">
      <IconComponent size={24} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function FeatureCard({ copy, icon: IconComponent, title }: { copy: string; icon: Icon; title: string }) {
  return (
    <article className="home-feature-card">
      <IconComponent size={22} />
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

function DashboardMockup() {
  return (
    <div className="dashboard-mockup" aria-label="Product dashboard preview">
      <div className="dashboard-topline">
        <strong>Scheduling</strong>
        <button type="button">
          <Zap size={16} />
          Share availability
        </button>
      </div>
      <label className="mock-search">
        <Search size={17} />
        <input aria-label="Search event types preview" readOnly value="Search event types" />
      </label>
      {["30 Minute Meeting", "Product Demo", "Candidate Screen"].map((event, index) => (
        <div className="mock-event-row" key={event}>
          <span style={{ background: ["#006bff", "#12805c", "#7c3aed"][index] }} />
          <div>
            <strong>{event}</strong>
            <small>{index === 1 ? "45 min - Video" : "30 min - One-on-one"}</small>
          </div>
          <button type="button">Book</button>
        </div>
      ))}
    </div>
  );
}

function PricingCard({
  cta,
  description,
  features,
  highlighted = false,
  name,
  price,
  suffix = ""
}: {
  cta: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  name: string;
  price: string;
  suffix?: string;
}) {
  return (
    <article className={`pricing-card ${highlighted ? "highlighted" : ""}`}>
      {highlighted && <span className="recommended-badge">Recommended</span>}
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="price-line">
        <strong>{price}</strong>
        <span>{suffix}</span>
      </div>
      <a className={`home-button ${highlighted ? "primary" : "secondary"} full`} href="/signup">
        {cta}
      </a>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <Check size={16} />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Footer() {
  return (
    <footer className="home-footer" id="footer">
      <div className="footer-brand-block">
        <a className="home-brand" href="#top" aria-label="Calendar Booking home">
          <span>
            <CalendarCheck size={24} />
          </span>
          Calendar Booking
        </a>
        <p>Scheduling automation for individuals, teams, and enterprise workflows.</p>
      </div>
      <div className="footer-grid" id="resources">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <strong>{column.title}</strong>
            {column.links.map((link) => (
              <a href="#" key={link} onClick={(event) => event.preventDefault()}>
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}
