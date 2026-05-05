import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutGrid,
  Globe,
  LogIn,
  Package,
  MessageSquare,
  ShoppingBag,
  CheckCircle,
  Phone,
  BookOpen,
  ArrowRight,
  ExternalLink,
  FileText,
} from "lucide-react";
import { ContactKristinModal } from "./ContactKristinModal";

interface HelpSection {
  id: string;
  icon: React.ElementType;
  title: string;
  summary: string;
  adminPath?: string;
  externalLinks?: { label: string; href: string }[];
  matchPaths?: string[];
}

const sections: HelpSection[] = [
  {
    id: "big-picture",
    icon: LayoutGrid,
    title: "The Big Picture",
    summary:
      "Your site has three parts: the storefront (pournogravy.com), the admin dashboard (/admin), and the database (Supabase). The admin dashboard is your main tool.",
    matchPaths: ["/admin"],
  },
  {
    id: "live-site",
    icon: Globe,
    title: "Viewing Your Live Site",
    summary: "Open any browser and go to pournogravy.com. If the site looks broken or blank, contact Kristin immediately.",
    externalLinks: [{ label: "pournogravy.com", href: "https://pournogravy.com" }],
  },
  {
    id: "admin-login",
    icon: LogIn,
    title: "Logging In",
    summary:
      "Go to pournogravy.com/admin. Enter aopie91@gmail.com and your password. Can't log in? Contact Kristin — access is allowlist-only.",
    adminPath: "/admin",
    matchPaths: ["/admin"],
  },
  {
    id: "products",
    icon: Package,
    title: "Managing Products",
    summary:
      "published: true → shows in shop. featured: true → shows on homepage. To add a new product or change a price, contact Kristin.",
    adminPath: "/admin/products",
    matchPaths: ["/admin/products"],
  },
  {
    id: "custom-requests",
    icon: MessageSquare,
    title: "Custom Requests",
    summary:
      "Submissions from the custom garment form. Update status: new → contacted → quoted → closed. Respond within 24–48 hours.",
    adminPath: "/admin/custom-requests",
    matchPaths: ["/admin/custom-requests"],
    externalLinks: [{ label: "Supabase backup", href: "https://supabase.com/dashboard" }],
  },
  {
    id: "orders",
    icon: ShoppingBag,
    title: "Viewing Orders",
    summary:
      "Stripe is built but not yet activated — paid orders will appear once it's live. Statuses: pending → paid → fulfilled → cancelled → refunded.",
    adminPath: "/admin/orders",
    matchPaths: ["/admin/orders"],
    externalLinks: [{ label: "Supabase backup", href: "https://supabase.com/dashboard" }],
  },
  {
    id: "can-vs-cant",
    icon: CheckCircle,
    title: "Can vs. Can't Change",
    summary:
      "You can: manage requests, view orders, edit product details. Developer needed for: new products, prices, design changes, Stripe activation.",
    matchPaths: ["/admin/settings"],
  },
  {
    id: "who-to-call",
    icon: Phone,
    title: "Who to Call",
    summary:
      "Kristin (code/site issues), Supabase support (database login), Cloudflare (domain issues), Stripe (payment questions).",
    externalLinks: [
      { label: "Supabase Support", href: "https://support.supabase.com" },
      { label: "Stripe Support", href: "https://support.stripe.com" },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const HelpPanel = ({ open, onClose }: Props) => {
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeSectionId = (() => {
    for (const s of sections) {
      if (s.matchPaths?.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"))) {
        return s.id;
      }
    }
    return null;
  })();

  const handleAdminNav = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <ContactKristinModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />

      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent
          side="right"
          className="w-80 sm:w-96 p-0 flex flex-col bg-card"
        >
          <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
            <SheetTitle className="font-display tracking-widest text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#fde047]" />
              QUICK REFERENCE
            </SheetTitle>
            <p className="text-[10px] text-muted-foreground font-marker tracking-[0.2em] uppercase">
              Owner's Manual — POURnogravy
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sections.map((s) => {
              const isActive = s.id === activeSectionId;
              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-sm border transition ${
                    isActive
                      ? "border-[#fde047]/40 bg-[#fde047]/8"
                      : "border-border/40 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <s.icon
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#fde047]" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`font-display text-[11px] tracking-widest ${isActive ? "text-[#fde047]" : "text-foreground"}`}
                    >
                      {s.title.toUpperCase()}
                    </span>
                    {isActive && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] border-[#fde047]/40 text-[#fde047] px-1.5 py-0"
                      >
                        current page
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.summary}</p>

                  {(s.adminPath || s.externalLinks?.length) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.adminPath && (
                        <button
                          onClick={() => handleAdminNav(s.adminPath!)}
                          className="inline-flex items-center gap-1 text-[10px] text-[#fde047] hover:underline"
                        >
                          Go to section <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                      {s.externalLinks?.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {link.label} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border p-3 space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate("/admin/manual");
              }}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition py-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              View full manual
            </button>
            <Separator />
            <Button
              onClick={() => setContactOpen(true)}
              className="w-full bg-[#fde047] text-black hover:bg-[#fde047]/80 font-medium text-xs h-8 gap-2"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Contact Kristin
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
