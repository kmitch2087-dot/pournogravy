import { lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SiteContentProvider } from "@/context/SiteContentContext";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { Loader2 } from "lucide-react";

// ─── EAGER: always-on chrome ─────────────────────────────────────────────────
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import Index from "./pages/Index";
import { DropAnnouncementBar } from "./components/DropAnnouncementBar";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import { useAnalytics } from "@/hooks/useAnalytics";

// ─── LAZY: public pages ───────────────────────────────────────────────────────
const Shop          = lazy(() => import("./pages/Shop"));
const Wishlist      = lazy(() => import("./pages/Wishlist"));
const Collections   = lazy(() => import("./pages/Collections"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const About         = lazy(() => import("./pages/About"));
const FAQ           = lazy(() => import("./pages/FAQ"));
const Contact       = lazy(() => import("./pages/Contact"));
const Proposal      = lazy(() => import("./pages/Proposal"));
const Login         = lazy(() => import("./pages/Login"));
const Account       = lazy(() => import("./pages/Account"));
const Checkout      = lazy(() => import("./pages/Checkout"));
const CheckoutReturn= lazy(() => import("./pages/CheckoutReturn"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy  = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Blog           = lazy(() => import("./pages/Blog"));
const BlogPost       = lazy(() => import("./pages/BlogPost"));
const ShipOrder      = lazy(() => import("./pages/ShipOrder"));
const Fulfillment    = lazy(() => import("./pages/Fulfillment"));
const Rewards        = lazy(() => import("./pages/Rewards"));
const PublicMerchDrops = lazy(() => import("./pages/MerchDrops"));

// ─── LAZY: admin pages ────────────────────────────────────────────────────────
const AdminLayout    = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard      = lazy(() => import("./pages/admin/Dashboard"));
const Orders         = lazy(() => import("./pages/admin/Orders"));
const Products       = lazy(() => import("./pages/admin/Products"));
const ProductEdit    = lazy(() => import("./pages/admin/ProductEdit"));
const CustomRequests = lazy(() => import("./pages/admin/CustomRequests"));
const Reviews        = lazy(() => import("./pages/admin/Reviews"));
const PublicReviews  = lazy(() => import("./pages/Reviews"));
const ReviewSubmit   = lazy(() => import("./pages/ReviewSubmit"));
const Settings       = lazy(() => import("./pages/admin/Settings"));
const UserManual     = lazy(() => import("./pages/admin/UserManual"));
const ProjectStatus  = lazy(() => import("./pages/admin/ProjectStatus"));
const Inbox          = lazy(() => import("./pages/admin/Inbox"));
const Finances        = lazy(() => import("./pages/admin/Finances"));
const MerchDrops     = lazy(() => import("./pages/admin/MerchDrops"));
const Analytics      = lazy(() => import("./pages/admin/Analytics"));
const Loyalty        = lazy(() => import("./pages/admin/Loyalty"));
const Customers      = lazy(() => import("./pages/admin/Customers"));
const Subscribers    = lazy(() => import("./pages/admin/Subscribers"));
const DiscountCodes  = lazy(() => import("./pages/admin/DiscountCodes"));
const Advertise      = lazy(() => import("./pages/Advertise"));
const AdminSponsors  = lazy(() => import("./pages/admin/Sponsors"));
const Content        = lazy(() => import("./pages/admin/Content"));
const BlogAdmin      = lazy(() => import("./pages/admin/BlogAdmin"));
const EmailTemplates  = lazy(() => import("./pages/admin/EmailTemplates"));
const EasterEggs      = lazy(() => import("./pages/admin/EasterEggs"));
const PrintFiles      = lazy(() => import("./pages/admin/PrintFiles"));

// ─── Analytics: auto page_view on every route change ─────────────────────────
const AnalyticsTracker = () => {
  useAnalytics(); // mounts once inside Router; fires page_view on pathname changes
  return null;
};

// ─── Suspense fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Guard: don't jump the outer page when a modal/dialog is open
    const hasOpenDialog = document.querySelector('[role="dialog"]') !== null;
    if (!hasOpenDialog) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
};

const queryClient = new QueryClient();

const PublicChrome = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <DropAnnouncementBar />}
      {!isAdmin && <Navbar />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <SiteEditor />}
      {isAdmin ? children : <main id="main-content">{children}</main>}
      {!isAdmin && <Footer />}
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <SiteContentProvider>
            <WishlistProvider>
            <AnalyticsTracker />
          <CartProvider>
              <PublicChrome>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/"                element={<Index />} />
                    <Route path="/shop"            element={<Shop />} />
                    <Route path="/collections"     element={<Collections />} />
                    <Route path="/product/:id"     element={<ProductDetail />} />
                    <Route path="/about"           element={<About />} />
                    <Route path="/faq"             element={<FAQ />} />
                    <Route path="/contact"         element={<Contact />} />
                    <Route path="/proposal"        element={<Proposal />} />
                    <Route path="/login"           element={<Login />} />
                    <Route path="/account"         element={<Account />} />
                    <Route path="/wishlist"        element={<Wishlist />} />
                    <Route path="/rewards"         element={<Rewards />} />
                    <Route path="/merch-drops"     element={<PublicMerchDrops />} />
                    <Route path="/checkout"        element={<Checkout />} />
                    <Route path="/checkout/return" element={<CheckoutReturn />} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <AdminLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index                    element={<Dashboard />} />
                      <Route path="orders"            element={<Orders />} />
                      <Route path="products"          element={<Products />} />
                      <Route path="products/new"      element={<ProductEdit />} />
                      <Route path="products/:id"      element={<ProductEdit />} />
                      <Route path="custom-requests"   element={<CustomRequests />} />
                      <Route path="reviews"           element={<Reviews />} />
                      <Route path="settings"          element={<Settings />} />
                      <Route path="manual"            element={<UserManual />} />
                      <Route path="project-status"    element={<ProjectStatus />} />
                      <Route path="inbox"             element={<Inbox />} />
                      <Route path="merch-drops"       element={<MerchDrops />} />
                      <Route path="analytics"         element={<Analytics />} />
                      <Route path="loyalty"           element={<Loyalty />} />
                      <Route path="customers"         element={<Customers />} />
                      <Route path="subscribers"       element={<Subscribers />} />
                      <Route path="discount-codes"    element={<DiscountCodes />} />
                      <Route path="content"           element={<Content />} />
                      <Route path="blog"              element={<BlogAdmin />} />
                      <Route path="email-templates"   element={<Navigate to="/admin/inbox?tab=templates" replace />} />
                      <Route path="easter-eggs"       element={<EasterEggs />} />
                      <Route path="print-files"       element={<PrintFiles />} />
                      <Route path="sponsors"          element={<AdminSponsors />} />
                      <Route path="finances"          element={<Finances />} />
                      <Route path="financials"        element={<Navigate to="/admin/finances" replace />} />
                      <Route path="invoices"          element={<Navigate to="/admin/finances" replace />} />
                      <Route path="bookkeeping"             element={<Navigate to="/admin/finances" replace />} />
                      <Route path="bookkeeping/expenses"    element={<Navigate to="/admin/finances" replace />} />
                      <Route path="bookkeeping/products"    element={<Navigate to="/admin/finances" replace />} />
                      <Route path="bookkeeping/reports"     element={<Navigate to="/admin/finances" replace />} />
                      <Route path="bookkeeping/tax-packet"  element={<Navigate to="/admin/finances" replace />} />
                    </Route>
                    <Route path="/reviews"     element={<PublicReviews />} />
                    <Route path="/review"      element={<ReviewSubmit />} />
                    <Route path="/blog"        element={<Blog />} />
                    <Route path="/blog/:slug"  element={<BlogPost />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms"   element={<TermsOfService />} />
                    <Route path="/advertise"      element={<Advertise />} />
                    <Route path="/ship/:orderId"  element={<ShipOrder />} />
                    <Route path="/fulfillment"    element={<Fulfillment />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </PublicChrome>
            </CartProvider>
            </WishlistProvider>
            </SiteContentProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
