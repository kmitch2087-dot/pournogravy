import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  CalendarDays,
  Mail,
  StickyNote,
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
  { to: "/admin/custom-requests",label: "Custom Requests",  icon: MessageSquare,   end: false },
  { to: "/admin/reviews",        label: "Reviews",          icon: Star,            end: false },
  { to: "/admin/settings",       label: "Settings",         icon: Settings,        end: false },
  { to: "/admin/edit-requests",  label: "Client Edit Requests", icon: StickyNote,  end: false },
  { to: "/admin/manual",         label: "Admin User Manual",icon: BookOpen,        end: false },
  { to: "/admin/project-status", label: "Project Status",   icon: BarChart2,       end: false },
  { to: "/admin/merch-drops",    label: "Merch Drop Calendar", icon: CalendarDays,    end: false },
];

const SidebarContent = ({
  onNavigate,
  badges,
}: {
  onNavigate?: () => void;
  badges?: Record<string, number>;
}) => (
  <nav className="flex flex-col h-full">
    <div className="p-6 border-b border-border">
      <NavLink to="/" className="block">
        <h1 className="font-display text-2xl tracking-widest">POURnogravy</h1>
        <p className="font-marker text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-1">
          Back of house
        </p>
      </NavLink>
    </div>
    <div className="flex-1 p-3 space-y-1">
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
    <div className="p-3 border-t border-border">
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
  </nav>
);

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme }   = useTheme();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);

  const { unreadCount } = useInboxNotifications();
  const badges = { inbox: unreadCount };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/admin/login");
  };

  const currentTitle =
    navItems.find((i) =>
      i.end ? location.pathname === i.to : location.pathname.startsWith(i.to),
    )?.label ?? "Admin";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border flex-col bg-card">
        <SidebarContent badges={badges} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-card">
          <SidebarContent onNavigate={() => setMobileOpen(false)} badges={badges} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="font-display text-lg tracking-widest">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              title="Quick reference manual"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default AdminLayout;
