import { Share2, Facebook, Instagram, Link } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  className?: string;
}

export function ShareButton({ productName, productUrl, productImage, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = productUrl.startsWith('http')
    ? productUrl
    : `https://pournogravy.com${productUrl}`;

  const encodedUrl = encodeURIComponent(fullUrl);
  const shareText = `Check out ${productName} from POURnogravy — apparel for bartenders who have seen some shit.`;

  const facebookFallback = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const handleFacebook = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb://share?href=${encodedUrl}`;
      setTimeout(() => { window.open(facebookFallback, '_blank'); }, 500);
    } else {
      window.open(facebookFallback, '_blank', 'width=600,height=400');
    }
    setOpen(false);
  };

  const handleInstagramFeed = () => {
    if (navigator.share) {
      navigator.share({ title: productName, text: shareText, url: fullUrl }).catch(() => {});
    } else {
      copyLink();
    }
    setOpen(false);
  };

  const handleInstagramStory = () => {
    const igUrl = `instagram-stories://share?source_application=pournogravy&media=${encodeURIComponent(productImage ?? fullUrl)}`;
    window.location.href = igUrl;
    setTimeout(() => {
      if (navigator.share) navigator.share({ title: productName, url: fullUrl }).catch(() => {});
    }, 500);
    setOpen(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Share this product"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-[#fde047] transition-colors font-display tracking-widest uppercase"
      >
        <Share2 className="h-4 w-4" />
        {copied ? '✓ Copied!' : 'Share'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 z-50 bg-background border border-border rounded-md shadow-lg overflow-hidden min-w-[180px]">
            <button
              type="button"
              onClick={handleFacebook}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <Facebook className="h-4 w-4 text-[#1877f2]" />
              Facebook
            </button>
            <button
              type="button"
              onClick={handleInstagramFeed}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left border-t border-border"
            >
              <Instagram className="h-4 w-4 text-[#e1306c]" />
              Instagram Feed
            </button>
            <button
              type="button"
              onClick={handleInstagramStory}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left border-t border-border"
            >
              <Instagram className="h-4 w-4 text-[#e1306c]" />
              Instagram Story
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left border-t border-border"
            >
              <Link className="h-4 w-4" />
              Copy Link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
