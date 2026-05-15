import SEO from "@/components/SEO";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Terms of Service"
        description="The legal stuff. We tried to make it readable. No promises."
        url="https://pournogravy.com/terms"
      />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] mb-4 uppercase">
          The Fine Print
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
          TERMS OF SERVICE
        </h1>
        <p className="text-muted-foreground text-sm mb-12">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          — Yes, you actually have to read this. It's short, we promise.
        </p>

        <div className="space-y-10 text-white/80 leading-relaxed">

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              1. WHO WE ARE
            </h2>
            <p>
              POURnogravy is a bartender-humor apparel brand run by actual humans who have dealt with
              actual Karens. By using this site and purchasing our products, you agree to these terms.
              If you don't agree, no hard feelings — but also, no shirt for you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              2. WHAT YOU'RE BUYING
            </h2>
            <p>
              You're buying a physical T-shirt. It will arrive at your door. It will say something
              that makes your coworkers laugh and your manager slightly nervous. That's the whole deal.
            </p>
            <p className="mt-3">
              All products are made-to-order through our print partner. Production typically takes
              3–7 business days before your order ships. We are not responsible for your excitement
              level during the wait.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              3. PRICING & PAYMENT
            </h2>
            <p>
              All prices are listed in USD. We accept all major credit cards, Apple Pay, and Google
              Pay via Stripe. Payment is processed at the time of purchase. We do not store your
              payment information — that's Stripe's job and they're very good at it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              4. SHIPPING
            </h2>
            <p>
              We currently ship to the <strong>United States and Canada only</strong>. No
              international shipping yet — we're working on world domination, it just takes time.
            </p>
            <p className="mt-3">
              Shipping times vary by carrier and location. Once your order ships, we'll send you a
              tracking number. After that, it's between you and the postal service — we don't control
              their chaos any more than you control the Saturday night rush.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              5. RETURNS & REFUNDS
            </h2>
            <p>We want you to love your shirt. If something's wrong, we'll make it right.</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                Returns accepted within <strong>30 days</strong> of delivery.
              </li>
              <li>
                Item must be <strong>unworn and undamaged</strong>. We can't resell a shirt that
                smells like a well gin martini and regret.
              </li>
              <li>
                To start a return, contact us via our{" "}
                <a href="/contact" className="text-[#fde047] hover:underline">
                  contact page
                </a>{" "}
                with your order number and reason.
              </li>
              <li>
                Refunds are issued to your original payment method once we receive and inspect the
                item.
              </li>
            </ul>
            <p className="mt-3">
              We do not accept returns on items damaged by misuse, improper washing, or being worn
              during a Karen encounter. That one's on you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              6. INTELLECTUAL PROPERTY
            </h2>
            <p>
              All designs, copy, and brand assets are owned by POURnogravy. Don't steal our stuff.
              We mean it — it's even in the footer. If you'd like to collaborate or license
              something, reach out. We're friendlier than the shirts suggest.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              7. LIMITATION OF LIABILITY
            </h2>
            <p>
              We are not liable for any injury, emotional damage, or loss of tips resulting from
              wearing our apparel at work. Wear at your own professional risk. Results may include:
              unsolicited high-fives from coworkers, complaints from pretentious guests, and one guy
              who definitely doesn't get it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              8. CHANGES TO THESE TERMS
            </h2>
            <p>
              We may update these terms occasionally. When we do, we'll update the date at the top
              of this page. Continued use of the site after changes means you accept the updated
              terms. Revolutionary stuff, we know.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wider text-white mb-3">
              9. CONTACT
            </h2>
            <p>
              Questions? Complaints? Unsolicited bar stories? Find us on our{" "}
              <a href="/contact" className="text-[#fde047] hover:underline">
                contact page
              </a>
              . We read everything. We respond to most things. We laugh at some things. That's life.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
