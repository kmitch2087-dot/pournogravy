import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"];

export default function ShipOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [carrier, setCarrier] = useState("USPS");
  const [tracking, setTracking] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tracking.trim()) return;
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("submit-tracking", {
        body: { orderId, token, trackingNumber: tracking.trim(), trackingCarrier: carrier },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setTrackingUrl(data?.trackingUrl ?? "");
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const short = orderId?.slice(0, 8).toUpperCase() ?? "";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <p className="text-amber-400 font-bold text-3xl tracking-widest uppercase">POURnogravy</p>
          <p className="text-zinc-400 text-sm mt-1">Fulfillment Portal</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {status === "success" ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📦</div>
              <h2 className="text-white text-xl font-bold">Tracking Submitted</h2>
              <p className="text-zinc-400 text-sm">
                Order <span className="text-amber-400 font-mono">{short}</span> marked as shipped.
                The customer has been notified.
              </p>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-amber-400 underline text-sm"
                >
                  Verify tracking link →
                </a>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-white text-lg font-bold mb-1">
                Ship Order <span className="text-amber-400 font-mono">{short}</span>
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                Enter the tracking info below. We'll notify the customer automatically.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-1">Carrier</label>
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  >
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={tracking}
                    onChange={e => setTracking(e.target.value)}
                    placeholder="e.g. 9400111899223397622902"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                    required
                    autoFocus
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? "Submitting…" : "Mark as Shipped & Notify Customer"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          This link is unique to this order. Questions? Reply to the order email.
        </p>
      </div>
    </div>
  );
}
