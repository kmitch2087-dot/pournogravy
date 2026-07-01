import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Placement =
  | "shop_banner"
  | "home_banner"
  | "shop_sidebar"
  | "product_detail"
  | "footer_strip"
  | "between_products";

interface Sponsor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  link_url: string;
  tagline: string | null;
  ad_format: "banner" | "logo_strip" | "inline_card";
}

interface SponsorAdProps {
  placement: Placement;
}

export function SponsorAd({ placement }: SponsorAdProps) {
  const impressionFired = useRef(false);

  const { data: sponsor } = useQuery<Sponsor | null>({
    queryKey: ["sponsor-ad", placement],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("sponsors")
        .select("id, brand_name, logo_url, link_url, tagline, ad_format")
        .eq("is_active", true)
        .eq("placement", placement)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (sponsor && !impressionFired.current) {
      impressionFired.current = true;
      supabase.rpc("increment_sponsor_impression" as any, { sponsor_id: sponsor.id }).then(() => {});
    }
  }, [sponsor]);

  if (!sponsor) return null;

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    supabase.rpc("increment_sponsor_click" as any, { sponsor_id: sponsor.id }).then(() => {});
    window.open(sponsor.link_url, "_blank", "noopener,noreferrer");
  };

  if (sponsor.ad_format === "logo_strip") {
    return (
      <div className="relative flex justify-center py-3">
        <a href={sponsor.link_url} onClick={handleClick} target="_blank" rel="noopener noreferrer" aria-label={`Sponsored by ${sponsor.brand_name}`}>
          {sponsor.logo_url
            ? <img src={sponsor.logo_url} alt={sponsor.brand_name} className="h-8 object-contain opacity-70 hover:opacity-100 transition-opacity" />
            : <span className="text-xs text-muted-foreground font-display tracking-wider">{sponsor.brand_name}</span>
          }
        </a>
        <span className="absolute top-1 right-2 text-[9px] text-muted-foreground/40 tracking-widest uppercase">Sponsored</span>
      </div>
    );
  }

  if (sponsor.ad_format === "inline_card") {
    return (
      <div className="relative col-span-full">
        <a
          href={sponsor.link_url}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 border border-border bg-card rounded-lg px-5 py-4 hover:border-[#fde047]/30 transition-colors group"
          aria-label={`Sponsored by ${sponsor.brand_name}`}
        >
          {sponsor.logo_url && (
            <img src={sponsor.logo_url} alt={sponsor.brand_name} className="h-10 w-auto object-contain shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm tracking-wider text-foreground">{sponsor.brand_name}</p>
            {sponsor.tagline && <p className="text-xs text-muted-foreground mt-0.5">{sponsor.tagline}</p>}
          </div>
          <span className="text-[9px] text-muted-foreground/40 tracking-widest uppercase shrink-0 self-start">Sponsored</span>
        </a>
      </div>
    );
  }

  // Default: banner
  return (
    <div className="relative w-full">
      <a
        href={sponsor.link_url}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
        aria-label={`Sponsored by ${sponsor.brand_name}`}
      >
        {sponsor.logo_url
          ? (
            <img
              src={sponsor.logo_url}
              alt={sponsor.brand_name}
              className="w-full h-20 object-cover"
            />
          )
          : (
            <div className="w-full h-20 bg-card border border-border flex items-center justify-center gap-3">
              <span className="font-display tracking-widest text-foreground">{sponsor.brand_name}</span>
              {sponsor.tagline && (
                <span className="text-xs text-muted-foreground">— {sponsor.tagline}</span>
              )}
            </div>
          )
        }
      </a>
      <span className="absolute top-1 right-2 text-[9px] text-muted-foreground/50 tracking-widest uppercase bg-background/80 px-1 rounded">Sponsored</span>
    </div>
  );
}
