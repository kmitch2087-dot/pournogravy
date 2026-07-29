import { useState } from "react";
import { Instagram, Facebook, Mail, Globe } from "lucide-react";
import {
  Shoutout, normalizeUrl, domainOf, faviconUrl, instagramUrl, facebookUrl, stripAt,
} from "@/lib/shoutouts";

const chip =
  "inline-flex items-center gap-1.5 border border-border/70 bg-background/40 px-3 py-1.5 text-xs text-foreground hover:border-[#fde047] hover:text-[#fde047] transition-colors";

function Favicon({ website }: { website: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Globe className="h-4 w-4 text-[#fde047]" />;
  return (
    <img
      src={faviconUrl(website)}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 rounded-sm"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ShoutoutCard({ s }: { s: Shoutout }) {
  const hasLinks = s.website || s.instagram || s.facebook || s.email;

  return (
    <div className="border border-border/60 bg-black/20 p-5 md:p-6 flex flex-col h-full">
      <h3 className="font-display text-xl md:text-2xl tracking-wide text-foreground">
        {s.name}
      </h3>

      {s.blurb && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line flex-1">
          {s.blurb}
        </p>
      )}

      {hasLinks && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.website && (
            <a href={normalizeUrl(s.website)} target="_blank" rel="noopener noreferrer" className={chip}>
              <Favicon website={s.website} />
              {domainOf(s.website)}
            </a>
          )}
          {s.instagram && (
            <a href={instagramUrl(s.instagram)} target="_blank" rel="noopener noreferrer" className={chip}>
              <Instagram className="h-3.5 w-3.5" />
              @{stripAt(s.instagram)}
            </a>
          )}
          {s.facebook && (
            <a href={facebookUrl(s.facebook)} target="_blank" rel="noopener noreferrer" className={chip}>
              <Facebook className="h-3.5 w-3.5" />
              {stripAt(s.facebook)}
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className={chip}>
              <Mail className="h-3.5 w-3.5" />
              {s.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
