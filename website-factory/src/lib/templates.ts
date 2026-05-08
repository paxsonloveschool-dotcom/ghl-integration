import { GeneratedSiteContent } from "./claude";

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
  fontHeading: string;
  fontBody: string;
  heroStyle: "dark-overlay" | "light-overlay" | "split" | "minimal";
}

export const TEMPLATES: Template[] = [
  {
    id: "midnight",
    name: "Midnight",
    category: "Universal",
    description: "Dark, dramatic, cinematic. Works for any premium brand.",
    preview: "#0a0a0f",
    primaryColor: "#6366f1",
    accentColor: "#a5b4fc",
    bgColor: "#0a0a0f",
    textColor: "#f8fafc",
    surfaceColor: "#13131f",
    borderColor: "rgba(255,255,255,0.08)",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    heroStyle: "dark-overlay",
  },
  {
    id: "pearl",
    name: "Pearl",
    category: "Professional",
    description: "Clean, minimal, light. Perfect for law, finance, medical.",
    preview: "#f9fafb",
    primaryColor: "#0f172a",
    accentColor: "#3b82f6",
    bgColor: "#ffffff",
    textColor: "#0f172a",
    surfaceColor: "#f8fafc",
    borderColor: "rgba(0,0,0,0.08)",
    fontHeading: "Fraunces",
    fontBody: "Inter",
    heroStyle: "light-overlay",
  },
  {
    id: "ember",
    name: "Ember",
    category: "Bold & Creative",
    description: "High energy, bold contrast. Agencies, fitness, hospitality.",
    preview: "#0f0a00",
    primaryColor: "#f97316",
    accentColor: "#fbbf24",
    bgColor: "#0a0700",
    textColor: "#fef3c7",
    surfaceColor: "#130e00",
    borderColor: "rgba(249,115,22,0.2)",
    fontHeading: "Syne",
    fontBody: "Inter",
    heroStyle: "dark-overlay",
  },
  {
    id: "sage",
    name: "Sage",
    category: "Health & Wellness",
    description: "Calm, natural, trustworthy. Wellness, beauty, nature brands.",
    preview: "#f0faf4",
    primaryColor: "#059669",
    accentColor: "#34d399",
    bgColor: "#fafffe",
    textColor: "#064e3b",
    surfaceColor: "#f0faf4",
    borderColor: "rgba(5,150,105,0.15)",
    fontHeading: "Cormorant Garamond",
    fontBody: "Inter",
    heroStyle: "dark-overlay",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    category: "Technology & SaaS",
    description: "Modern, trustworthy, sharp. Tech, software, consulting.",
    preview: "#030712",
    primaryColor: "#2563eb",
    accentColor: "#60a5fa",
    bgColor: "#030712",
    textColor: "#f1f5f9",
    surfaceColor: "#0f172a",
    borderColor: "rgba(37,99,235,0.2)",
    fontHeading: "Space Grotesk",
    fontBody: "Inter",
    heroStyle: "dark-overlay",
  },
];

function getUnsplashUrl(query: string, width = 1920, height = 1080): string {
  const encoded = encodeURIComponent(query);
  return `https://source.unsplash.com/${width}x${height}/?${encoded}`;
}

function buildStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function buildGoogleFontUrl(heading: string): string {
  const fonts: Record<string, string> = {
    "Playfair Display": "Playfair+Display:wght@400;700;900",
    Fraunces: "Fraunces:wght@400;600;700;900",
    Syne: "Syne:wght@400;600;700;800",
    "Cormorant Garamond": "Cormorant+Garamond:wght@400;500;600;700",
    "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
  };
  const headingParam = fonts[heading] || "Inter:wght@400;600;700;900";
  return `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=${headingParam}&display=swap`;
}

export function buildSiteHTML(
  content: GeneratedSiteContent,
  template: Template,
  siteInput: {
    businessName: string;
    phone?: string;
    email?: string;
    location?: string;
  },
  videoUrl?: string
): string {
  const p = template.primaryColor;
  const acc = template.accentColor;
  const bg = template.bgColor;
  const text = template.textColor;
  const surface = template.surfaceColor;
  const border = template.borderColor;
  const isLight = template.heroStyle === "light-overlay";

  const heroImageUrl = getUnsplashUrl(content.unsplashQuery, 1920, 1080);
  const aboutImageUrl = getUnsplashUrl(content.unsplashQuery + " people team", 800, 600);

  const servicesHTML = content.services
    .map(
      (s, i) => `
    <div class="service-card reveal" style="transition-delay:${i * 0.1}s">
      <div class="service-icon">${s.icon}</div>
      <h3>${s.title}</h3>
      <p>${s.description}</p>
    </div>`
    )
    .join("");

  const processHTML = content.process
    ? `
    <section class="process-section">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-label">How It Works</div>
          <h2 class="section-title">Our Process</h2>
        </div>
        <div class="process-steps">
          ${content.process
            .map(
              (p, i) => `
            <div class="process-step reveal" style="transition-delay:${i * 0.15}s">
              <div class="step-number">${p.step}</div>
              <div class="step-content">
                <h3>${p.title}</h3>
                <p>${p.description}</p>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </section>`
    : "";

  const testimonialsHTML = content.testimonials
    .map(
      (t, i) => `
    <div class="testimonial-card reveal" style="transition-delay:${i * 0.12}s">
      <div class="stars">${buildStars(t.rating)}</div>
      <p class="quote">${t.quote}</p>
      <div class="author-info">
        <div class="author-avatar">${t.author.charAt(0)}</div>
        <div>
          <strong>${t.author}</strong>
          <span>${t.role}</span>
        </div>
      </div>
    </div>`
    )
    .join("");

  const statsHTML = content.about.stats
    ? content.about.stats
        .map(
          (s) => `
      <div class="stat reveal">
        <div class="stat-value" data-target="${s.numericValue}" data-suffix="${s.suffix}">0${s.suffix}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
        )
        .join("")
    : "";

  const heroMedia = videoUrl
    ? `<video class="hero-media" autoplay muted loop playsinline poster="${heroImageUrl}">
        <source src="${videoUrl}" type="video/mp4">
       </video>`
    : `<img class="hero-media" src="${heroImageUrl}" alt="${siteInput.businessName}" fetchpriority="high">`;

  const overlayGradient = isLight
    ? "linear-gradient(to right, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0.1) 100%)"
    : "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)";

  const heroTextColor = isLight ? template.textColor : "#ffffff";
  const heroSubColor = isLight ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.8)";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.meta.title}</title>
  <meta name="description" content="${content.meta.description}">
  <meta name="keywords" content="${content.meta.keywords.join(", ")}">
  <meta property="og:title" content="${content.meta.title}">
  <meta property="og:description" content="${content.meta.description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${buildGoogleFontUrl(template.fontHeading)}" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${p};
      --accent: ${acc};
      --bg: ${bg};
      --text: ${text};
      --surface: ${surface};
      --border: ${border};
      --radius: 16px;
      --radius-sm: 10px;
      --shadow: 0 4px 24px rgba(0,0,0,0.12);
      --shadow-lg: 0 24px 64px rgba(0,0,0,0.2);
      --transition: cubic-bezier(0.16, 1, 0.3, 1);
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      overflow-x: hidden;
    }

    /* ── REVEAL ANIMATIONS ── */
    .reveal {
      opacity: 0;
      transform: translateY(50px);
      transition: opacity 0.85s var(--transition), transform 0.85s var(--transition);
    }
    .reveal.in-view { opacity: 1; transform: none; }
    .reveal-left {
      opacity: 0;
      transform: translateX(-50px);
      transition: opacity 0.85s var(--transition), transform 0.85s var(--transition);
    }
    .reveal-left.in-view { opacity: 1; transform: none; }
    .reveal-right {
      opacity: 0;
      transform: translateX(50px);
      transition: opacity 0.85s var(--transition), transform 0.85s var(--transition);
    }
    .reveal-right.in-view { opacity: 1; transform: none; }

    /* ── NAV ── */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      height: 72px;
      display: flex; align-items: center;
      padding: 0 5%;
      transition: background 0.4s ease, box-shadow 0.4s ease;
    }
    nav.scrolled {
      background: ${isLight ? "rgba(255,255,255,0.95)" : "rgba(10,10,15,0.92)"};
      backdrop-filter: blur(20px);
      box-shadow: 0 1px 0 ${border};
    }
    .nav-inner {
      width: 100%; max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
    }
    .nav-logo {
      font-family: '${template.fontHeading}', serif;
      font-size: 1.3rem; font-weight: 700;
      color: white; text-decoration: none;
      transition: color 0.3s;
    }
    nav.scrolled .nav-logo { color: var(--text); }
    .nav-links {
      display: flex; gap: 2rem; list-style: none;
    }
    .nav-links a {
      text-decoration: none; color: rgba(255,255,255,0.85); font-weight: 500;
      font-size: 0.9rem; transition: color 0.2s; letter-spacing: 0.01em;
    }
    nav.scrolled .nav-links a { color: var(--text); }
    .nav-links a:hover { color: var(--primary); }
    .nav-cta {
      background: var(--primary); color: white;
      padding: 10px 22px; border-radius: var(--radius-sm);
      text-decoration: none; font-weight: 600; font-size: 0.875rem;
      letter-spacing: 0.01em;
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      box-shadow: 0 4px 15px color-mix(in srgb, var(--primary) 40%, transparent);
    }
    .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 25px color-mix(in srgb, var(--primary) 50%, transparent); }
    .hamburger {
      display: none; flex-direction: column; gap: 5px;
      cursor: pointer; padding: 4px; background: none; border: none;
    }
    .hamburger span {
      width: 24px; height: 2px; background: white;
      transition: all 0.3s; display: block; border-radius: 2px;
    }
    nav.scrolled .hamburger span { background: var(--text); }

    /* ── HERO ── */
    .hero {
      position: relative;
      height: 100vh; min-height: 600px;
      display: flex; align-items: center;
      overflow: hidden;
    }
    .hero-media {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover; object-position: center;
      will-change: transform;
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background: ${overlayGradient};
    }
    .hero-content {
      position: relative; z-index: 1;
      max-width: 1200px; width: 100%;
      margin: 0 auto; padding: 0 5%;
      padding-top: 72px;
    }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.5rem;
      opacity: 0; animation: fadeUp 0.8s var(--transition) 0.2s forwards;
    }
    .hero-eyebrow::before {
      content: '';
      width: 32px; height: 2px;
      background: var(--accent); display: block;
    }
    .hero h1 {
      font-family: '${template.fontHeading}', serif;
      font-size: clamp(2.8rem, 7vw, 5.5rem);
      font-weight: 900; line-height: 1.05;
      color: ${heroTextColor};
      margin-bottom: 1.75rem;
      max-width: 760px;
      opacity: 0; animation: fadeUp 0.9s var(--transition) 0.35s forwards;
    }
    .hero p {
      font-size: clamp(1rem, 2vw, 1.2rem);
      color: ${heroSubColor};
      max-width: 560px; line-height: 1.75;
      margin-bottom: 2.75rem;
      opacity: 0; animation: fadeUp 0.9s var(--transition) 0.5s forwards;
    }
    .hero-buttons {
      display: flex; gap: 1rem; flex-wrap: wrap;
      opacity: 0; animation: fadeUp 0.9s var(--transition) 0.65s forwards;
    }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--primary); color: white;
      padding: 16px 34px; border-radius: var(--radius-sm);
      text-decoration: none; font-weight: 700; font-size: 1rem;
      letter-spacing: 0.01em;
      transition: transform 0.25s var(--transition), box-shadow 0.25s;
      box-shadow: 0 8px 30px color-mix(in srgb, var(--primary) 45%, transparent);
    }
    .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 55%, transparent); }
    .btn-ghost {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent; color: ${heroTextColor};
      padding: 16px 34px; border-radius: var(--radius-sm);
      text-decoration: none; font-weight: 600; font-size: 1rem;
      border: 1.5px solid ${isLight ? "rgba(15,23,42,0.3)" : "rgba(255,255,255,0.4)"};
      transition: border-color 0.25s, background 0.25s;
    }
    .btn-ghost:hover { border-color: ${heroTextColor}; background: ${isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.12)"}; }
    .hero-scroll-hint {
      position: absolute; bottom: 2.5rem; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      opacity: 0; animation: fadeUp 1s var(--transition) 1.2s forwards;
    }
    .hero-scroll-hint span { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
    .scroll-line {
      width: 1px; height: 48px; background: rgba(255,255,255,0.3);
      position: relative; overflow: hidden;
    }
    .scroll-line::after {
      content: '';
      position: absolute; top: -100%; left: 0;
      width: 100%; height: 100%;
      background: var(--accent);
      animation: scrollLine 1.8s ease-in-out infinite;
    }

    /* ── SECTIONS ── */
    section { padding: 120px 5%; }
    .container { max-width: 1200px; margin: 0 auto; }
    .section-label {
      display: inline-flex; align-items: center; gap: 10px;
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--primary); margin-bottom: 1rem;
    }
    .section-label::before {
      content: '';
      width: 28px; height: 2px; background: var(--primary); display: block;
    }
    .section-title {
      font-family: '${template.fontHeading}', serif;
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 800; line-height: 1.12;
      margin-bottom: 1.25rem; color: var(--text);
    }
    .section-subtitle {
      font-size: 1.1rem; color: ${isLight ? "rgba(15,23,42,0.6)" : "rgba(248,250,252,0.6)"};
      max-width: 580px; line-height: 1.75;
    }
    .section-header { margin-bottom: 4.5rem; }

    /* ── ABOUT ── */
    .about { background: var(--surface); }
    .about-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6rem; align-items: center;
    }
    .about-image-wrap {
      position: relative;
    }
    .about-image {
      border-radius: 24px; overflow: hidden; aspect-ratio: 4/3;
      box-shadow: var(--shadow-lg);
    }
    .about-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s var(--transition); }
    .about-image:hover img { transform: scale(1.03); }
    .about-image-accent {
      position: absolute; bottom: -24px; right: -24px;
      width: 120px; height: 120px; border-radius: 20px;
      background: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem;
      box-shadow: var(--shadow-lg);
    }
    .about-body {
      font-size: 1.05rem;
      color: ${isLight ? "rgba(15,23,42,0.72)" : "rgba(248,250,252,0.72)"};
      line-height: 1.8; margin-bottom: 2.5rem;
    }
    .about-body p { margin-bottom: 1.25rem; }
    .about-body p:last-child { margin-bottom: 0; }
    .stats-row { display: flex; gap: 2.5rem; flex-wrap: wrap; }
    .stat {}
    .stat-value {
      font-family: '${template.fontHeading}', serif;
      font-size: 3rem; font-weight: 900; color: var(--primary);
      line-height: 1;
    }
    .stat-label { font-size: 0.875rem; color: ${isLight ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.55)"}; margin-top: 6px; font-weight: 500; }

    /* ── SERVICES ── */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .service-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 2.25rem;
      transition: transform 0.3s var(--transition), box-shadow 0.3s, border-color 0.3s;
      cursor: default;
    }
    .service-card:hover {
      transform: translateY(-6px) scale(1.01);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary);
    }
    .service-icon {
      font-size: 2.75rem; margin-bottom: 1.5rem;
      display: inline-block;
      transition: transform 0.3s var(--transition);
    }
    .service-card:hover .service-icon { transform: scale(1.15) rotate(5deg); }
    .service-card h3 {
      font-family: '${template.fontHeading}', serif;
      font-size: 1.25rem; font-weight: 700; margin-bottom: 0.875rem;
    }
    .service-card p { color: ${isLight ? "rgba(15,23,42,0.62)" : "rgba(248,250,252,0.62)"}; line-height: 1.7; font-size: 0.95rem; }

    /* ── PROCESS ── */
    .process-section { background: var(--surface); }
    .process-steps { display: flex; flex-direction: column; gap: 0; }
    .process-step {
      display: grid; grid-template-columns: 80px 1fr; gap: 2rem;
      padding: 2.5rem 0;
      border-bottom: 1px solid var(--border);
      align-items: start;
    }
    .process-step:last-child { border-bottom: none; }
    .step-number {
      font-family: '${template.fontHeading}', serif;
      font-size: 3.5rem; font-weight: 900;
      color: var(--primary); opacity: 0.25; line-height: 1;
    }
    .step-content h3 {
      font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;
      font-family: '${template.fontHeading}', serif;
    }
    .step-content p { color: ${isLight ? "rgba(15,23,42,0.62)" : "rgba(248,250,252,0.62)"}; }

    /* ── TESTIMONIALS ── */
    .testimonials-section { background: var(--bg); }
    .testimonials-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;
    }
    .testimonial-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 2.25rem;
      transition: transform 0.3s var(--transition), box-shadow 0.3s;
    }
    .testimonial-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .stars { color: #f59e0b; font-size: 1rem; letter-spacing: 2px; margin-bottom: 1.25rem; }
    .quote {
      font-size: 1rem; line-height: 1.8; color: var(--text);
      margin-bottom: 1.75rem; font-style: italic;
      position: relative;
    }
    .quote::before {
      content: '"';
      font-family: '${template.fontHeading}', serif;
      font-size: 5rem; line-height: 0;
      color: var(--primary); opacity: 0.3;
      position: absolute; top: 1.5rem; left: -0.5rem;
      font-style: normal;
    }
    .author-info { display: flex; align-items: center; gap: 12px; }
    .author-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: white; font-size: 1rem; flex-shrink: 0;
    }
    .author-info strong { display: block; font-size: 0.9rem; font-weight: 700; }
    .author-info span { font-size: 0.8rem; color: ${isLight ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.55)"}; }

    /* ── CTA BAND ── */
    .cta-band {
      position: relative; overflow: hidden;
      padding: 120px 5%;
      background: var(--primary);
      text-align: center;
    }
    .cta-band::before {
      content: '';
      position: absolute; inset: -50%;
      background: radial-gradient(circle at 30% 50%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 60%),
                  radial-gradient(circle at 70% 50%, color-mix(in srgb, var(--primary) 60%, black) 0%, transparent 60%);
    }
    .cta-band .section-title { color: white; position: relative; z-index: 1; margin: 0 auto 1.25rem; max-width: 700px; }
    .cta-band .section-subtitle { color: rgba(255,255,255,0.8); position: relative; z-index: 1; margin: 0 auto 2.75rem; }
    .cta-band .btn-white {
      position: relative; z-index: 1;
      display: inline-flex; align-items: center; gap: 8px;
      background: white; color: var(--primary);
      padding: 18px 40px; border-radius: var(--radius-sm);
      text-decoration: none; font-weight: 800; font-size: 1.05rem;
      transition: transform 0.25s var(--transition), box-shadow 0.25s;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    }
    .cta-band .btn-white:hover { transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,0.35); }

    /* ── CONTACT ── */
    .contact-section { background: var(--surface); }
    .contact-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 6rem; align-items: start; }
    .contact-info-items { display: flex; flex-direction: column; gap: 1.75rem; margin-top: 2rem; }
    .contact-item { display: flex; align-items: flex-start; gap: 1rem; }
    .contact-icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; flex-shrink: 0;
    }
    .contact-item strong { display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 3px; }
    .contact-item span { font-size: 0.95rem; color: ${isLight ? "rgba(15,23,42,0.65)" : "rgba(248,250,252,0.65)"}; }
    .contact-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field label { display: block; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${isLight ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.55)"}; margin-bottom: 8px; }
    .field input, .field textarea, .field select {
      width: 100%; padding: 14px 18px;
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.95rem;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field input:focus, .field textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent);
    }
    .field textarea { min-height: 130px; resize: vertical; }
    .form-submit {
      background: var(--primary); color: white; border: none;
      padding: 16px 32px; border-radius: var(--radius-sm);
      font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 700;
      cursor: pointer; transition: transform 0.25s var(--transition), box-shadow 0.25s;
      box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 40%, transparent);
    }
    .form-submit:hover { transform: translateY(-2px); box-shadow: 0 12px 30px color-mix(in srgb, var(--primary) 50%, transparent); }
    .form-submit:active { transform: translateY(0); }

    /* ── FOOTER ── */
    footer {
      background: ${isLight ? "#0f172a" : "#000000"};
      color: rgba(255,255,255,0.5);
      padding: 4rem 5% 3rem;
    }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 3rem; margin-bottom: 3rem; flex-wrap: wrap; }
    .footer-brand {}
    .footer-logo {
      font-family: '${template.fontHeading}', serif;
      font-size: 1.5rem; font-weight: 900; color: white; margin-bottom: 0.5rem;
    }
    .footer-tagline { font-size: 0.9rem; color: rgba(255,255,255,0.4); }
    .footer-links { display: flex; gap: 2rem; flex-wrap: wrap; align-items: center; }
    .footer-links a { color: rgba(255,255,255,0.45); text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
    .footer-links a:hover { color: white; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .footer-copy { font-size: 0.8rem; color: rgba(255,255,255,0.25); }
    .footer-credit { font-size: 0.8rem; color: rgba(255,255,255,0.25); }

    /* ── MOBILE MENU ── */
    .mobile-menu {
      display: none;
      position: fixed; inset: 0; z-index: 999;
      background: var(--bg);
      flex-direction: column; align-items: center; justify-content: center; gap: 2rem;
    }
    .mobile-menu.open { display: flex; }
    .mobile-menu a { font-size: 1.5rem; font-weight: 700; color: var(--text); text-decoration: none; }
    .mobile-close {
      position: absolute; top: 1.5rem; right: 2rem;
      font-size: 2rem; cursor: pointer; background: none; border: none; color: var(--text);
    }

    /* ── KEYFRAMES ── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes scrollLine {
      0%   { top: -100%; }
      100% { top: 200%; }
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .about-grid, .contact-grid { grid-template-columns: 1fr; gap: 3.5rem; }
      .about-image-accent { display: none; }
      .form-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .nav-links, .nav-cta { display: none; }
      .hamburger { display: flex; }
      section { padding: 80px 5%; }
      .hero h1 { font-size: 2.4rem; }
      .footer-top { flex-direction: column; }
      .footer-bottom { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>

<!-- MOBILE MENU -->
<div class="mobile-menu" id="mobileMenu">
  <button class="mobile-close" onclick="closeMobileMenu()">✕</button>
  <a href="#about" onclick="closeMobileMenu()">About</a>
  <a href="#services" onclick="closeMobileMenu()">Services</a>
  <a href="#testimonials" onclick="closeMobileMenu()">Reviews</a>
  <a href="#contact" onclick="closeMobileMenu()">Contact</a>
</div>

<!-- NAV -->
<nav id="nav">
  <div class="nav-inner">
    <a href="#" class="nav-logo">${siteInput.businessName}</a>
    <ul class="nav-links">
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#testimonials">Reviews</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
    <a href="#contact" class="nav-cta">${content.hero.cta}</a>
    <button class="hamburger" onclick="openMobileMenu()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  ${heroMedia}
  <div class="hero-overlay"></div>
  <div class="hero-content">
    ${content.hero.eyebrow ? `<div class="hero-eyebrow">${content.hero.eyebrow}</div>` : ""}
    <h1>${content.hero.headline}</h1>
    <p>${content.hero.subheadline}</p>
    <div class="hero-buttons">
      <a href="#contact" class="btn-primary">${content.hero.cta} →</a>
      ${content.hero.ctaSecondary ? `<a href="#about" class="btn-ghost">${content.hero.ctaSecondary}</a>` : ""}
    </div>
  </div>
  <div class="hero-scroll-hint">
    <div class="scroll-line"></div>
    <span>Scroll</span>
  </div>
</section>

<!-- ABOUT -->
<section class="about" id="about">
  <div class="container">
    <div class="about-grid">
      <div class="reveal-left">
        <div class="about-image-wrap">
          <div class="about-image">
            <img src="${aboutImageUrl}" alt="${siteInput.businessName} team" loading="lazy">
          </div>
          <div class="about-image-accent">${content.services[0]?.icon || "✨"}</div>
        </div>
      </div>
      <div class="reveal-right">
        <div class="section-label">Our Story</div>
        <h2 class="section-title">${content.about.heading}</h2>
        <div class="about-body">
          ${content.about.body.split("\n\n").map((p) => `<p>${p}</p>`).join("")}
        </div>
        ${statsHTML ? `<div class="stats-row">${statsHTML}</div>` : ""}
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="container">
    <div class="section-header reveal">
      <div class="section-label">What We Do</div>
      <h2 class="section-title">Our Services</h2>
    </div>
    <div class="services-grid">
      ${servicesHTML}
    </div>
  </div>
</section>

${processHTML}

<!-- TESTIMONIALS -->
<section class="testimonials-section" id="testimonials">
  <div class="container">
    <div class="section-header reveal">
      <div class="section-label">Client Reviews</div>
      <h2 class="section-title">What People Say</h2>
    </div>
    <div class="testimonials-grid">
      ${testimonialsHTML}
    </div>
  </div>
</section>

<!-- CTA BAND -->
<div class="cta-band">
  <h2 class="section-title reveal">${content.cta.heading}</h2>
  <p class="section-subtitle reveal">${content.cta.body}</p>
  <a href="#contact" class="btn-white reveal">${content.cta.button} →</a>
</div>

<!-- CONTACT -->
<section class="contact-section" id="contact">
  <div class="container">
    <div class="contact-grid">
      <div class="reveal-left">
        <div class="section-label">Reach Out</div>
        <h2 class="section-title">Let's Talk</h2>
        <p class="section-subtitle">${content.footer.tagline}</p>
        <div class="contact-info-items">
          ${siteInput.phone ? `
          <div class="contact-item">
            <div class="contact-icon">📞</div>
            <div><strong>Phone</strong><span>${siteInput.phone}</span></div>
          </div>` : ""}
          ${siteInput.email ? `
          <div class="contact-item">
            <div class="contact-icon">✉️</div>
            <div><strong>Email</strong><span>${siteInput.email}</span></div>
          </div>` : ""}
          ${siteInput.location ? `
          <div class="contact-item">
            <div class="contact-icon">📍</div>
            <div><strong>Location</strong><span>${siteInput.location}</span></div>
          </div>` : ""}
        </div>
      </div>
      <div class="reveal-right">
        <form class="contact-form" onsubmit="handleSubmit(event)">
          <div class="form-row">
            <div class="field">
              <label>First Name</label>
              <input type="text" placeholder="John" required>
            </div>
            <div class="field">
              <label>Last Name</label>
              <input type="text" placeholder="Doe" required>
            </div>
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" placeholder="john@example.com" required>
          </div>
          <div class="field">
            <label>Phone</label>
            <input type="tel" placeholder="(555) 000-0000">
          </div>
          <div class="field">
            <label>Message</label>
            <textarea placeholder="Tell us how we can help..."></textarea>
          </div>
          <button type="submit" class="form-submit">${content.cta.button} →</button>
        </form>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">${siteInput.businessName}</div>
        <div class="footer-tagline">${content.footer.tagline}</div>
      </div>
      <div class="footer-links">
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#testimonials">Reviews</a>
        <a href="#contact">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-copy">© ${new Date().getFullYear()} ${siteInput.businessName}. All rights reserved.</div>
      ${siteInput.location ? `<div class="footer-credit">Serving ${siteInput.location}</div>` : ""}
    </div>
  </div>
</footer>

<script>
  // ── NAV SCROLL ──
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // ── HERO PARALLAX ──
  const heroMedia = document.querySelector('.hero-media');
  if (heroMedia) {
    window.addEventListener('scroll', () => {
      const scroll = window.scrollY;
      if (scroll < window.innerHeight) {
        heroMedia.style.transform = 'translateY(' + (scroll * 0.35) + 'px)';
      }
    }, { passive: true });
  }

  // ── SCROLL REVEAL ──
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  // ── COUNTER ANIMATION ──
  const counters = document.querySelectorAll('.stat-value[data-target]');
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      function update(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.floor(ease * target) + suffix;
        if (p < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObs.observe(c));

  // ── MOBILE MENU ──
  function openMobileMenu() { document.getElementById('mobileMenu').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeMobileMenu() { document.getElementById('mobileMenu').classList.remove('open'); document.body.style.overflow = ''; }

  // ── CONTACT FORM ──
  function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.form-submit');
    const orig = btn.textContent;
    btn.textContent = 'Message Sent ✓';
    btn.style.background = '#10b981';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; e.target.reset(); }, 4000);
  }
</script>
</body>
</html>`;
}
