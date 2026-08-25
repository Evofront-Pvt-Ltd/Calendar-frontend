import EmbeddedWidgetPage from "@/components/EmbeddedWidgetPage";

type WidgetPageProps = {
  params: Promise<{ widgetId: string }>;
};

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { widgetId } = await params;
  return <EmbeddedWidgetPage widgetId={widgetId} />;
}
