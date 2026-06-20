import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_URL = "https://pournogravy.com";
const DEFAULT_IMAGE = `${BASE_URL}/pournogravy_back_logo_full.png`;

// Ensure image URL is always absolute for OG crawlers
const toAbsolute = (img: string) =>
  img.startsWith('http') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;

export default function SEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  url = BASE_URL,
  type = "website",
  jsonLd,
}: SEOProps) {
  const fullTitle = `${title} — Pournogravy`;
  const ogImage = toAbsolute(image);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Pournogravy" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
