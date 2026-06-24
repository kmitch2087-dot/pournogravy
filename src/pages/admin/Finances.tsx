import { useState, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminTabBar } from "@/components/admin/AdminTabBar";

const FinancialsPage         = lazy(() => import("./Financials"));
const InvoiceTrackerPage     = lazy(() => import("./InvoiceTracker"));
const BookkeepingOverviewPage = lazy(() => import("./BookkeepingOverview"));

const TAB_LOADER = (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-6 w-6 animate-spin text-[#fde047]" />
  </div>
);

const PLACEHOLDER = (
  <p className="text-sm text-muted-foreground py-12 text-center">Coming soon.</p>
);

const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "invoices",   label: "Invoices" },
  { id: "expenses",   label: "Expenses" },
  { id: "products",   label: "Products" },
  { id: "reports",    label: "Reports" },
  { id: "tax-packet", label: "Tax Packet" },
];

type TabId = "overview" | "invoices" | "expenses" | "products" | "reports" | "tax-packet";

export default function Finances() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-0">
      <AdminTabBar
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {activeTab === "overview" && (
        <Suspense fallback={TAB_LOADER}>
          <FinancialsPage />
        </Suspense>
      )}
      {activeTab === "invoices" && (
        <Suspense fallback={TAB_LOADER}>
          <InvoiceTrackerPage />
        </Suspense>
      )}
      {activeTab === "expenses" && (
        <Suspense fallback={TAB_LOADER}>
          <BookkeepingOverviewPage />
        </Suspense>
      )}
      {activeTab === "products" && PLACEHOLDER}
      {activeTab === "reports" && PLACEHOLDER}
      {activeTab === "tax-packet" && PLACEHOLDER}
    </div>
  );
}
