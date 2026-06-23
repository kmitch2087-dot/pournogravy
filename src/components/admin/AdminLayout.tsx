import { useState, useRef, useEffect, Suspense } from "react";
import { AdminErrorBoundary } from "./AdminErrorBoundary";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  Menu,
  Moon,
  Sun,
  Monitor,
  ExternalLink,
  BookOpen,
  HelpCircle,
  BarChart2,
  LineChart,
  CalendarDays,
  Mail,
  StickyNote,
  Coins,
  Users,
  Tag,
  FileText,
  Receipt,
  FileImage,
  Sparkles,
  PieChart,
  PenLine,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { HelpPanel } from "./HelpPanel";
import { useInboxNotifications } from "@/hooks/useInboxNotifications";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end: boolean;
  badgeKey?: string;
}

const navItems: NavItem[] = [
  { to: "/admin",                label: "Dashboard",        icon: LayoutDashboard, end: true  },
  { to: "/admin/inbox",          label: "Inbox",            icon: Mail,            end: false, badgeKey: "inbox" },
  { to: "/admin/orders",         label: "Orders",           icon: ShoppingBag,     end: false },
  { to: "/admin/products",       label: "Products",         icon: Package,         end: false },
  { to: "/admin/content",        label: "Content",          icon: PenLine,         end: false },
  { to: "/admin/custom-requests",label: "Custom Requests",  icon: MessageSquare,   end: false },
  { to: "/admin/reviews",        label: "Reviews",          icon: Star,            end: false },
  { to: "/admin/settings",       label: "Settings",         icon: Settings,        end: false },
  { to: "/admin/edit-requests",  label: "Client Edit Requests", icon: StickyNote,  end: false },
  { to: "/admin/manual",         label: "Admin User Manual",icon: BookOpen,        end: false },
  { to: "/admin/analytics",      label: "Analytics",        icon: LineChart,       end: false },
  { to: "/admin/project-status", label: "Project Status",   icon: BarChart2,       end: false },
  { to: "/admin/merch-drops",    label: "Merch Drop Calendar", icon: CalendarDays,    end: false },
  { to: "/admin/loyalty",        label: "Pour Points",          icon: Coins,           end: false },
  { to: "/admin/customers",     label: "Customer Lookup",      icon: Users,           end: false },
  { to: "/admin/subscribers",   label: "Email Subscribers",    icon: Mail,            end: false },
  { to: "/admin/discount-codes",label: "Discount Codes",       icon: Tag,             end: false },
  { to: "/admin/blog",          label: "Blog",                 icon: BookOpen,        end: false },
  { to: "/admin/invoices",      label: "Invoice Tracker",      icon: Receipt,         end: false },
  { to: "/admin/financials",    label: "Financials & Taxes",   icon: PieChart,        end: false },
  { to: "/admin/bookkeeping",  label: "Bookkeeping",          icon: BookOpen,        end: false },
  { to: "/admin/easter-eggs",   label: "Easter Eggs",           icon: Sparkles,        end: false },
  { to: "/admin/print-files",    label: "Print Files",           icon: FileImage,       end: false },
];

const SidebarContent = ({
  onNavigate,
  badges,
  compact,
  navRef,
}: {
  onNavigate?: () => void;
  badges?: Record<string, number>;
  compact?: boolean;
  navRef?: React.RefObject<HTMLDivElement>;
}) => (
  <nav className="flex flex-col h-full">
    <div className="p-4 border-b border-border">
      <NavLink to="/" className="block">
        <h1 className="font-display text-xl tracking-widest">POURnogravy</h1>
        <p className="font-marker text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-0.5">
          Back of house
        </p>
      </NavLink>
    </div>

    {compact ? (
      /* ── Mobile: 2-column grid so all items fit without scrolling ── */
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="grid grid-cols-2 gap-1">
          {navItems.map((item) => {
            const count = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className="relative flex flex-col items-center gap-1.5 py-3 px-2 text-[10px] rounded-sm hover:bg-muted/50 text-muted-foreground transition text-center leading-tight"
                activeClassName="bg-[#fde047]/10 text-[#fde047] font-medium border border-[#fde047]/30"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fde047] px-1 text-[9px] font-bold text-black">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 px-2 text-[10px] rounded-sm text-muted-foreground hover:text-foreground transition text-center"
          >
            <ExternalLink className="h-5 w-5" />
            <span>View site</span>
          </a>
        </div>
      </div>
    ) : (
      /* ── Desktop: vertical list ── */
      <>
        <div ref={navRef} className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const count = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm hover:bg-muted/50 text-muted-foreground transition"
                activeClassName="bg-[#fde047]/10 text-[#fde047] font-medium border-l-2 border-[#fde047]"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fde047] px-1.5 text-[10px] font-bold text-black">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
        <div className="p-3 border-t border-border shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View public site</span>
          </a>
        </div>
      </>
    )}
  </nav>
);

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);

  const { unreadCount } = useInboxNotifications();
  const badges = { inbox: unreadCount };

  // Sidebar scroll persistence
  const sidebarRef = useRef<HTMLElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem("admin-sidebar-scroll");
    if (saved) el.scrollTop = Number(saved);
    const onScroll = () =>
      sessionStorage.setItem("admin-sidebar-scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/admin/login");
  };

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const ThemeIcon = theme === "dark" ? Sun : theme === "light" ? Monitor : Moon;
  const themeLabel =
    theme === "dark" ? "Light mode" : theme === "light" ? "System theme" : "Dark mode";

  const currentTitle =
    navItems.find((i) =>
      i.end ? location.pathname === i.to : location.pathname.startsWith(i.to),
    )?.label ?? "Admin";

  return (
    <TooltipProvider>
      <div className="h-screen flex bg-background">
        {/* Desktop sidebar — sticky full-height, scrolls independently */}
        <aside
          ref={sidebarRef}
          className="hidden md:flex w-60 border-r border-border flex-col bg-card sticky top-0 h-screen overflow-y-auto"
        >
          <SidebarContent badges={badges} navRef={navScrollRef} />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-60 p-0 bg-card">
            <SidebarContent onNavigate={() => setMobileOpen(false)} badges={badges} compact />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Menu</TooltipContent>
              </Tooltip>
              <h2 className="font-display text-lg tracking-widest">{currentTitle}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={cycleTheme}>
                    <ThemeIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{themeLabel}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHelpOpen(true)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quick reference manual</TooltipContent>
              </Tooltip>

              <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <AdminErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#fde047] border-t-transparent" />
                </div>
              }>
                <Outlet />
              </Suspense>
            </AdminErrorBoundary>
          </main>
        </div>

        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
