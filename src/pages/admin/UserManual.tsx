import { useState } from "react";
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
  XCircle,
  Clock,
  AlertTriangle,
  Columns2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ContactKristinModal } from "@/components/admin/ContactKristinModal";

const tocSections = [
  { id: "big-picture", num: 1, icon: LayoutGrid, title: "The Big Picture" },
  { id: "live-site", num: 2, icon: Globe, title: "Viewing Your Live Site" },
  { id: "admin-login", num: 3, icon: LogIn, title: "Logging In" },
  { id: "products", num: 4, icon: Package, title: "Managing Products" },
  { id: "custom-requests", num: 5, icon: MessageSquare, title: "Custom Requests" },
  { id: "orders", num: 6, icon: ShoppingBag, title: "Viewing Orders" },
  { id: "can-vs-cant", num: 7, icon: CheckCircle, title: "Can vs. Can't Change" },
  { id: "who-to-call", num: 8, icon: Phone, title: "Who to Call" },
  { id: "glossary", num: 9, icon: BookOpen, title: "Glossary" },
];

const SectionCard = ({
  id,
  num,
  icon: Icon,
  title,
  adminPath,
  children,
}: {
  id: string;
  num: number;
  icon: React.ElementType;
  title: string;
  adminPath?: string;
  children: React.ReactNode;
}) => (
  <Card id={id} className="scroll-mt-6 border-border/60">
    <CardContent className="pt-6 pb-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#fde047]/15 text-[#fde047] font-display text-sm font-bold shrink-0">
            {num}
          </span>
          <Icon className="h-5 w-5 text-[#fde047] shrink-0" />
          <h2 className="font-display text-lg tracking-widest truncate">
            {title.toUpperCase()}
          </h2>
        </div>
        {adminPath && (
          <a href={adminPath} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-[#fde047]/40 text-[#fde047] hover:bg-[#fde047]/10"
            >
              Open <ArrowRight className="h-3 w-3" />
            </Button>
          </a>
        )}
      </div>
      <div className="text-sm text-foreground/90 space-y-3 leading-relaxed">
        {children}
      </div>
    </CardContent>
  </Card>
);

const InfoTable = ({ rows }: { rows: [string, string][] }) => (
  <div className="overflow-x-auto rounded-sm border border-border/50 mt-3">
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap w-2/5">{a}</td>
            <td className="px-3 py-2 text-muted-foreground">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">
      {n}
    </span>
    <span className="text-muted-foreground">{children}</span>
  </div>
);

const Callout = ({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning" | "tip";
}) => {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    tip: "bg-[#fde047]/10 border-[#fde047]/30 text-[#fde047]",
  };
  return (
    <div className={`border-l-2 pl-3 py-2 rounded-r-sm text-xs leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
};

const ExternalBtn = ({ href, label }: { href: string; label: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    <Button size="sm" variant="outline" className="gap-1.5 text-xs mt-2">
      {label} <ExternalLink className="h-3 w-3" />
    </Button>
  </a>
);

const UserManual = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <ContactKristinModal open={contactOpen} onClose={() => setContactOpen(false)} />

      <div className="flex gap-6 lg:gap-10 min-h-full">
        {/* Sticky TOC sidebar */}
        <aside className="hidden lg:block w-44 xl:w-48 shrink-0">
          <div className="sticky top-0 pt-1 space-y-1">
            <p className="font-marker text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3 px-2">
              Contents
            </p>
            {tocSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition group"
              >
                <s.icon className="h-3 w-3 shrink-0 group-hover:text-[#fde047] transition" />
                <span>{s.num}. {s.title}</span>
              </a>
            ))}
            <Separator className="my-3" />
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-[#fde047] hover:bg-[#fde047]/10 transition w-full text-left"
            >
              <Phone className="h-3 w-3 shrink-0" />
              Contact Kristin
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5 pb-10">

          {/* Page header */}
          <div className="pb-5 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-6 w-6 text-[#fde047]" />
              <h1 className="font-display text-2xl xl:text-3xl tracking-widest">OWNER'S MANUAL</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Your quick-reference guide for running POURnogravy.{" "}
              <span className="text-foreground/60">Prepared by Kristin Mitchell — Aethyx.</span>
            </p>
            <div className="mt-4 flex items-start gap-2 p-3 bg-[#fde047]/8 border border-[#fde047]/25 rounded-sm text-xs text-[#fde047]/90 leading-relaxed">
              <Columns2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Side-by-side tip:</strong> Click any "Open →" button to launch that admin section in a new
                tab. Drag it to half your screen, keep this manual on the other half, and follow along as you go.
              </span>
            </div>
            <div className="mt-3 flex items-start gap-2 p-3 bg-muted/30 border border-border/50 rounded-sm text-xs text-muted-foreground leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
              Not a tech person? That's fine. If something isn't working or you're unsure, contact Kristin
              before touching anything.
            </div>
          </div>

          {/* Section 1 */}
          <SectionCard id="big-picture" num={1} icon={LayoutGrid} title="The Big Picture">
            <p className="text-muted-foreground">Your website has three main parts:</p>
            <InfoTable
              rows={[
                ["The storefront", "What customers see at pournogravy.com — any web browser"],
                ["Admin dashboard", "Where YOU manage orders and requests — pournogravy.com/admin"],
                ["The database", "Behind-the-scenes storage (backup access via Supabase)"],
                ["The code", "Files that make the site work — GitHub (you don't touch this)"],
              ]}
            />
            <Callout variant="tip">
              Your admin dashboard at <strong>/admin</strong> is your main tool. Supabase is the backup
              if you ever need to look at raw data.
            </Callout>
          </SectionCard>

          {/* Section 2 */}
          <SectionCard id="live-site" num={2} icon={Globe} title="Viewing Your Live Site">
            <div className="space-y-2">
              <Step n={1}>Open any browser — Chrome, Safari, Firefox.</Step>
              <Step n={2}>Go to <strong>pournogravy.com</strong></Step>
              <Step n={3}>Check the homepage, the shop, and a couple of product pages.</Step>
            </div>
            <Callout variant="warning">
              If the site looks broken or blank, contact Kristin immediately. Do not try to fix it yourself.
            </Callout>
            <ExternalBtn href="https://pournogravy.com" label="Open pournogravy.com" />
          </SectionCard>

          {/* Section 3 */}
          <SectionCard id="admin-login" num={3} icon={LogIn} title="Logging Into Your Admin Dashboard" adminPath="/admin">
            <div className="space-y-2">
              <Step n={1}>Go to <strong>pournogravy.com/admin</strong></Step>
              <Step n={2}>Enter your admin email (aopie91@gmail.com) and your password.</Step>
              <Step n={3}>You'll be redirected to the dashboard.</Step>
            </div>
            <Callout variant="info">
              Can't log in? Contact Kristin. Admin access is controlled by an allowlist — only your
              email and Kristin's emails are permitted. Nobody else can ever get in, even with the
              right password.
            </Callout>
            <p className="text-muted-foreground pt-1">Once in, you'll see:</p>
            <InfoTable
              rows={[
                ["Orders", "All orders and their status (pending, paid, fulfilled, cancelled)"],
                ["Custom Requests", "All custom garment form submissions"],
                ["Products", "Product management — edit details, upload images"],
                ["Settings", "Site-wide configuration"],
              ]}
            />
          </SectionCard>

          {/* Section 4 */}
          <SectionCard id="products" num={4} icon={Package} title="Managing Products" adminPath="/admin/products">
            <p className="text-muted-foreground">
              Products currently live in the code. The admin product editor lets you edit info and
              upload images. A developer is needed to add brand-new products until the full DB-backed
              system is activated.
            </p>
            <p className="text-muted-foreground pt-1">What the product flags do:</p>
            <InfoTable
              rows={[
                ["published: true", "Product shows in the shop and can be purchased"],
                ["featured: true", "Product also shows on the homepage hero and featured row"],
                ["Neither flag", "Product exists but is hidden — a \"draft\""],
              ]}
            />
            <Callout variant="info">
              To add or change a product, contact Kristin with: product name, price, description,
              tagline, sizes, images (hi-res PNG/JPG), and whether it should be featured on the homepage.
            </Callout>
          </SectionCard>

          {/* Section 5 */}
          <SectionCard id="custom-requests" num={5} icon={MessageSquare} title="Viewing Custom Garment Requests" adminPath="/admin/custom-requests">
            <p className="text-muted-foreground">
              When a customer fills out the "Request a Custom Garment" form, their info appears here.
            </p>
            <div className="space-y-2 pt-1">
              <Step n={1}>Go to your admin dashboard.</Step>
              <Step n={2}>Click "Custom Requests" in the left sidebar.</Step>
              <Step n={3}>Click any request to see the full details.</Step>
            </div>
            <p className="text-muted-foreground pt-2">You'll see: name, email, phone, garment description,
              design reference, notes, and status.</p>
            <p className="text-muted-foreground pt-2 font-medium">Updating the status:</p>
            <InfoTable
              rows={[
                ["new", "They just submitted — needs your attention"],
                ["contacted", "You've reached out to them"],
                ["quoted", "You've sent a price"],
                ["closed", "Done — completed or declined"],
              ]}
            />
            <Callout variant="tip">
              Respond to new requests within 24–48 hours while interest is hot. Custom orders are a
              premium revenue opportunity.
            </Callout>
            <div className="pt-1">
              <p className="text-muted-foreground text-xs mb-2">Backup — view raw data in Supabase:</p>
              <ExternalBtn href="https://supabase.com/dashboard" label="Open Supabase dashboard" />
            </div>
          </SectionCard>

          {/* Section 6 */}
          <SectionCard id="orders" num={6} icon={ShoppingBag} title="Viewing Orders" adminPath="/admin/orders">
            <Callout variant="warning">
              Payment processing (Stripe) is built but not yet fully activated. Once it's live, paid
              orders will appear here automatically.
            </Callout>
            <div className="space-y-2 pt-2">
              <Step n={1}>Go to your admin dashboard.</Step>
              <Step n={2}>Click "Orders" in the left sidebar.</Step>
            </div>
            <p className="text-muted-foreground pt-2">Order status meanings:</p>
            <InfoTable
              rows={[
                ["pending", "Cart was created, payment not yet processed"],
                ["paid", "Payment confirmed — needs to be fulfilled"],
                ["fulfilled", "Order shipped"],
                ["cancelled", "Order cancelled"],
                ["refunded", "Refund issued"],
              ]}
            />
            <div className="pt-1">
              <p className="text-muted-foreground text-xs mb-2">Backup — view raw data in Supabase:</p>
              <ExternalBtn href="https://supabase.com/dashboard" label="Open Supabase dashboard" />
            </div>
          </SectionCard>

          {/* Section 7 */}
          <SectionCard id="can-vs-cant" num={7} icon={CheckCircle} title="What You Can vs. Cannot Change">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium text-emerald-400 text-xs tracking-wider uppercase">
                    You can do these yourself
                  </span>
                </div>
                <ul className="space-y-2 text-muted-foreground text-xs">
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> View and manage custom garment requests</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Update request status (new → contacted → quoted → closed)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> View orders (once payment is active)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Edit product details and upload product images</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="font-medium text-red-400 text-xs tracking-wider uppercase">
                    These need a developer
                  </span>
                </div>
                <ul className="space-y-2 text-muted-foreground text-xs">
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Adding brand new products to the catalog</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Changing prices</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Changing site design or layout</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Activating Stripe payment processing</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Connecting a fulfillment partner (Printful/Printify)</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">✗</span> Changing the domain or hosting</li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-blue-400 text-xs tracking-wider uppercase">
                  Coming soon
                </span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">→</span> Fully DB-backed product management (add products without a deploy)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">→</span> Discount / promo codes</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">→</span> Email marketing integration</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">→</span> Automatic fulfillment via Printful/Printify</li>
              </ul>
            </div>
          </SectionCard>

          {/* Section 8 */}
          <SectionCard id="who-to-call" num={8} icon={Phone} title="Who to Call When Things Break">
            <div className="space-y-4">
              {/* Kristin */}
              <div className="p-4 bg-[#fde047]/8 border border-[#fde047]/30 rounded-sm">
                <p className="font-display tracking-widest text-[#fde047] text-sm mb-1">KRISTIN MITCHELL — AETHYX</p>
                <p className="text-muted-foreground text-xs mb-3">
                  For: anything related to the code, site going down, a feature not working, adding products.
                </p>
                <Button
                  onClick={() => setContactOpen(true)}
                  className="bg-[#fde047] text-black hover:bg-[#fde047]/80 font-medium gap-2 text-xs h-8"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Send Kristin a message
                </Button>
              </div>

              <InfoTable
                rows={[
                  ["Supabase Support", "Can't log into the Supabase dashboard itself — support.supabase.com"],
                  ["Cloudflare Support", "Domain stops resolving or shows a security error — cloudflare.com/support"],
                  ["Stripe Support", "Questions about payments once Stripe is active — support.stripe.com"],
                ]}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <ExternalBtn href="https://support.supabase.com" label="Supabase Support" />
                <ExternalBtn href="https://cloudflare.com/support" label="Cloudflare Support" />
                <ExternalBtn href="https://support.stripe.com" label="Stripe Support" />
              </div>

              <Callout variant="warning">
                <strong>Golden Rule:</strong> If you're not 100% sure what you're doing, don't do it.
                One wrong click in the database can affect real customers. Always ask first.
              </Callout>
            </div>
          </SectionCard>

          {/* Section 9 */}
          <SectionCard id="glossary" num={9} icon={BookOpen} title="Glossary — Terms You'll See">
            <InfoTable
              rows={[
                ["Frontend", "The part of the website customers see and interact with"],
                ["Backend / Database", "Behind-the-scenes storage for orders, customers, requests"],
                ["Supabase", "The service that hosts your database (like a secure cloud spreadsheet)"],
                ["GitHub", "Where your website's code lives — like Google Drive but for code"],
                ["Cloudflare Pages", "The service that hosts and delivers your website to visitors worldwide"],
                ["Edge Functions", "Small programs that run in the cloud to handle payments, emails, etc."],
                ["RLS", "Row-Level Security — rules ensuring customers only see their own data"],
                ["Deploy", "Publishing a new version of the site so changes go live"],
                ["Stripe", "The payment processor (like Square or PayPal, but better for online stores)"],
                ["Resend", "The email service that sends order confirmation emails"],
                ["Printful / Printify", "Print-on-demand partners that print and ship orders automatically"],
                ["CDN", "Content Delivery Network — servers worldwide that make your site load fast"],
                ["published", "Product flag that makes it visible in the shop"],
                ["featured", "Product flag that puts it on the homepage"],
                ["custom_requests", "Where custom garment form submissions are stored"],
                ["Admin Dashboard", "Your private management area at pournogravy.com/admin"],
              ]}
            />
          </SectionCard>

          {/* Footer */}
          <div className="pt-4 text-center text-xs text-muted-foreground border-t border-border/50">
            <p>Document maintained by <strong>Aethyx</strong>. Last updated May 2026.</p>
            <button
              onClick={() => setContactOpen(true)}
              className="mt-2 text-[#fde047] hover:underline"
            >
              Need something that isn't covered here? Contact Kristin →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserManual;
