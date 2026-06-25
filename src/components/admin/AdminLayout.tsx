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
  ExternalLink,
  BookOpen,
  HelpCircle,
  BarChart2,
  LineChart,
  CalendarDays,
  Mail,
  Coins,
  Users,
  Tag,
  FileImage,
  Sparkles,
  PieChart,
  PenLine,
  GripVertical,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { HelpPanel } from "./HelpPanel";
import { useInboxNotifications } from "@/hooks/useInboxNotifications";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end: boolean;
  badgeKey?: string;
  description?: string;
}

const navItems: NavItem[] = [
  { to: "/admin",                label: "Dashboard",            icon: LayoutDashboard, end: true,  description: "Overview of orders, revenue, and quick stats" },
  { to: "/admin/inbox",          label: "Inbox",                icon: Mail,            end: false, badgeKey: "inbox", description: "Notifications, messages, and email templates" },
  { to: "/admin/orders",         label: "Orders",               icon: ShoppingBag,     end: false, description: "View and manage customer orders" },
  { to: "/admin/products",       label: "Products",             icon: Package,         end: false, description: "Manage the product catalog and listings" },
  { to: "/admin/content",        label: "Content",              icon: PenLine,         end: false, description: "Edit homepage, announcements, and site copy" },
  { to: "/admin/custom-requests",label: "Custom Requests",      icon: MessageSquare,   end: false, description: "Custom garment inquiry submissions from customers" },
  { to: "/admin/reviews",        label: "Reviews",              icon: Star,            end: false, description: "Manage customer reviews and ratings" },
  { to: "/admin/settings",       label: "Settings",             icon: Settings,        end: false, description: "Business info, fulfillment, and email settings" },
  { to: "/admin/manual",         label: "Admin User Manual",    icon: BookOpen,        end: false, description: "How-to guide for operating the admin dashboard" },
  { to: "/admin/analytics",      label: "Analytics",            icon: LineChart,       end: false, description: "Site traffic, page views, and visitor data" },
  { to: "/admin/project-status", label: "Project Status",       icon: BarChart2,       end: false, description: "Build progress and developer task tracker" },
  { to: "/admin/merch-drops",    label: "Merch Drop Calendar",  icon: CalendarDays,    end: false, description: "Plan and schedule upcoming product drops" },
  { to: "/admin/loyalty",        label: "Pour Points",          icon: Coins,           end: false, description: "Customer loyalty rewards and point balances" },
  { to: "/admin/customers",      label: "Customer Lookup",      icon: Users,           end: false, description: "Search and view individual customer records" },
  { to: "/admin/subscribers",    label: "Email Subscribers",    icon: Mail,            end: false, description: "Newsletter subscriber list and export" },
  { to: "/admin/discount-codes", label: "Discount Codes",       icon: Tag,             end: false, description: "Create and manage promotional discount codes" },
  { to: "/admin/blog",           label: "Blog",                 icon: BookOpen,        end: false, description: "Write and publish blog posts (The Shift Log)" },
  { to: "/admin/finances",       label: "Finances",             icon: PieChart,        end: false, description: "Revenue, invoices, expenses, and tax estimates" },
  { to: "/admin/easter-eggs",    label: "Easter Eggs",          icon: Sparkles,        end: false, description: "Hidden features and fun surprises on the site" },
  { to: "/admin/print-files",    label: "Print Files",          icon: FileImage,       end: false, description: "Manage printable design files for fulfillment" },
];

// ─── Sortable nav item (desktop only) ────────────────────────────────────────

const SortableNavItem = ({
  item,
  badges,
  onNavigate,
}: {
  item: NavItem;
  badges?: Record<string, number>;
  onNavigate?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.to });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const count = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-center group">
      {/* Drag handle — invisible until hover */}
      <span
        {...attributes}
        {...listeners}
        className="absolute -left-1 flex items-center justify-center w-5 h-8 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm hover:bg-muted/50 text-muted-foreground transition"
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
        </TooltipTrigger>
        {item.description && (
          <TooltipContent side="right" className="max-w-48 text-xs">
            {item.description}
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
};

// ─── Sidebar content ──────────────────────────────────────────────────────────

const SidebarContent = ({
  onNavigate,
  badges,
  compact,
  navRef,
  sortedNavItems,
  navOrder,
}: {
  onNavigate?: () => void;
  badges?: Record<string, number>;
  compact?: boolean;
  navRef?: React.RefObject<HTMLDivElement>;
  sortedNavItems?: NavItem[];
  navOrder?: string[];
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
      /* ── Desktop: sortable vertical list ── */
      <>
        <div ref={navRef} className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <SortableContext
            items={navOrder ?? navItems.map((i) => i.to)}
            strategy={verticalListSortingStrategy}
          >
            {(sortedNavItems ?? navItems).map((item) => (
              <SortableNavItem
                key={item.to}
                item={item}
                badges={badges}
                onNavigate={onNavigate}
              />
            ))}
          </SortableContext>
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

  // ── Drag-to-reorder state (desktop only) ──
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("admin-nav-order");
      return saved ? JSON.parse(saved) : navItems.map((i) => i.to);
    } catch {
      return navItems.map((i) => i.to);
    }
  });

  // Derive sorted nav items from navOrder — include any new items not yet in saved order
  const sortedNavItems: NavItem[] = [
    ...navOrder
      .map((to) => navItems.find((i) => i.to === to))
      .filter((i): i is NavItem => i != null),
    ...navItems.filter((i) => !navOrder.includes(i.to)),
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navOrder.indexOf(String(active.id));
    const newIndex = navOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(navOrder, oldIndex, newIndex);
    setNavOrder(newOrder);
    localStorage.setItem("admin-nav-order", JSON.stringify(newOrder));
  };

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

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const ThemeIcon = resolvedTheme === "dark" ? Sun : Moon;
  const themeLabel = resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SidebarContent
              badges={badges}
              navRef={navScrollRef}
              sortedNavItems={sortedNavItems}
              navOrder={navOrder}
            />
          </DndContext>
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
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
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
