import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminTabBar } from "@/components/admin/AdminTabBar";

const OverviewPage  = lazy(() => import("./Financials"));
const ReportsPage   = lazy(() => import("./BookkeepingReports"));
const PayoutsPage   = lazy(() => import("./Payouts"));
const ExpensesPage  = lazy(() => import("./BookkeepingExpenses"));
const ProductsPage  = lazy(() => import("./BookkeepingProducts"));
const InvoicesPage  = lazy(() => import("./InvoiceTracker"));
const TaxPacketPage = lazy(() => import("./BookkeepingTaxPacket"));

const TAB_LOADER = (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-6 w-6 animate-spin text-[#fde047]" />
  </div>
);

const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "reports",    label: "Reports" },
  { id: "payouts",    label: "Payouts" },
  { id: "expenses",   label: "Expenses" },
  { id: "products",   label: "Products" },
  { id: "invoices",   label: "Invoices" },
  { id: "tax-packet", label: "Tax Packet" },
];

type TabId = "overview" | "reports" | "payouts" | "expenses" | "products" | "invoices" | "tax-packet";

const TAB_IDS = TABS.map((t) => t.id);

function isTabId(value: string | null): value is TabId {
  return !!value && TAB_IDS.includes(value);
}

export default function Finances() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabId = isTabId(rawTab) ? rawTab : "overview";

  const handleChange = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", id);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      <AdminTabBar
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleChange}
      />

      {activeTab === "overview" && (
        <Suspense fallback={TAB_LOADER}>
          <OverviewPage />
        </Suspense>
      )}
      {activeTab === "reports" && (
        <Suspense fallback={TAB_LOADER}>
          <ReportsPage />
        </Suspense>
      )}
      {activeTab === "payouts" && (
        <Suspense fallback={TAB_LOADER}>
          <PayoutsPage />
        </Suspense>
      )}
      {activeTab === "expenses" && (
        <Suspense fallback={TAB_LOADER}>
          <ExpensesPage />
        </Suspense>
      )}
      {activeTab === "products" && (
        <Suspense fallback={TAB_LOADER}>
          <ProductsPage />
        </Suspense>
      )}
      {activeTab === "invoices" && (
        <Suspense fallback={TAB_LOADER}>
          <InvoicesPage />
        </Suspense>
      )}
      {activeTab === "tax-packet" && (
        <Suspense fallback={TAB_LOADER}>
          <TaxPacketPage />
        </Suspense>
      )}
    </div>
  );
}
