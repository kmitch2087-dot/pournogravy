import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { RichText } from "@/components/RichText";

const DEFAULT_BODY = `<section><h2>1. WHAT WE COLLECT</h2><p>When you place an order or sign up for our email list, we collect:</p><ul><li><strong>Name and email address</strong> — so we know who you are and can send you your order info.</li><li><strong>Shipping address</strong> — because shirts don't teleport. Yet.</li><li><strong>Payment information</strong> — processed securely by Stripe. We never see or store your full card number.</li><li><strong>Order history</strong> — so you can look back at your questionable decisions with pride.</li></ul><p>If you just browse without buying anything, we collect basic analytics data (page views, general location, device type) to understand how people use the site. No creepy individual tracking.</p></section><section><h2>2. HOW WE USE IT</h2><ul><li>To process and fulfill your order.</li><li>To send you transactional emails (order confirmation, shipping updates).</li><li>To send you marketing emails <strong>if you opted in</strong>. You can unsubscribe any time — no guilt trip, just a link.</li><li>To improve the site based on how people use it.</li><li>To route your order to our print partner for fulfillment.</li></ul><p>We do not sell your data. We do not trade your data. We do not do anything weird with your data. We are a shirt company.</p></section><section><h2>3. WHO WE SHARE IT WITH</h2><p>Only the people who need it to get your shirt to you:</p><ul><li><strong>Stripe</strong> — payment processing.</li><li><strong>Our print partner</strong> — production and shipping.</li><li><strong>Resend</strong> — transactional email delivery.</li><li><strong>Loops</strong> — marketing email platform (only if you subscribed).</li></ul><p>All of these are reputable services with their own privacy policies. We're not handing your info to anyone sketchy.</p></section><section><h2>4. COOKIES</h2><p>We use minimal cookies — just enough to keep your cart working and our analytics running. We don't run a cookie wall because we find them annoying and you're already annoyed enough by the general public.</p></section><section><h2>5. YOUR RIGHTS</h2><p>You can ask us to:</p><ul><li>Tell you what data we have on you.</li><li>Delete your account and data.</li><li>Correct anything that's wrong.</li><li>Stop sending you marketing emails (there's also an unsubscribe link in every email).</li></ul><p>Just <a href="/contact">contact us</a> and we'll handle it without drama. Unlike some of your regulars.</p></section><section><h2>6. DATA SECURITY</h2><p>We use industry-standard security practices. Your data is stored in Supabase (SOC 2 compliant), payments go through Stripe (PCI-DSS compliant), and the site runs over HTTPS. We take this seriously even if our shirts don't take anything seriously.</p></section><section><h2>7. CONTACT</h2><p>Privacy questions, data requests, or just want to tell us something? <a href="/contact">Hit us up.</a> We're real people.</p></section>`;

const PrivacyPolicy = () => {
  const { getValue } = useSiteContent();

  const title       = getValue("privacy", "main", "title", "PRIVACY POLICY");
  const body        = getValue("privacy", "main", "body", DEFAULT_BODY);
  const lastUpdated = getValue("privacy", "main", "last_updated", "Last updated: June 27, 2026 — We keep this simple because we're not a data company, we're a shirt company.");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy"
        description="We're not creepy about your data. Here's exactly what we collect and why."
        url="https://pournogravy.com/privacy"
      />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] mb-4 uppercase">
          We're Not Watching You. Much.
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm mb-12">
          {lastUpdated}
        </p>
        <div className="space-y-10 text-white/80 leading-relaxed">
          <RichText html={body} />
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
