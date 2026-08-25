"use client";

import LandingBookNowWidget from "@/components/LandingBookNowWidget";

export default function EmbeddedWidgetPage({ widgetId }: { widgetId: string }) {
  return (
    <main className="embedded-widget-shell">
      <LandingBookNowWidget embedded widgetId={widgetId} />
    </main>
  );
}
