import { GeneratedSiteContent } from "./claude";

export interface Template {
  id: string;
  name: string;
  category: string;
  preview: string;
  primaryColor: string;
  accentColor: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "modern-clean",
    name: "Modern Clean",
    category: "General",
    preview: "#1a1a2e",
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
  },
  {
    id: "bold-agency",
    name: "Bold Agency",
    category: "Agency",
    preview: "#0f0f0f",
    primaryColor: "#ef4444",
    accentColor: "#ffffff",
  },
  {
    id: "luxury-dark",
    name: "Luxury Dark",
    category: "Luxury",
    preview: "#111111",
    primaryColor: "#d4af37",
    accentColor: "#ffffff",
  },
  {
    id: "fresh-light",
    name: "Fresh Light",
    category: "Health & Wellness",
    preview: "#f8fafc",
    primaryColor: "#10b981",
    accentColor: "#064e3b",
  },
  {
    id: "professional-blue",
    name: "Professional Blue",
    category: "Finance & Legal",
    preview: "#eff6ff",
    primaryColor: "#1d4ed8",
    accentColor: "#1e293b",
  },
];

function getUnsplashUrl(query: string, width = 1920, height = 1080): string {
  const encoded = encodeURIComponent(query);
  return `https://source.unsplash.com/${width}x${height}/?${encoded}`;
}

export function buildSiteHTML(
  content: GeneratedSiteContent,
  template: Template,
  siteInput: { businessName: string; phone?: string; email?: string; location?: string }
): string {
  const heroImageUrl = getUnsplashUrl(content.unsplashQuery);
  const p = template.primaryColor;
  const a = template.accentColor;

  const servicesHTML = content.services
    .map(
      (s) => `
    <div class="service-card">
      <div class="service-icon">${s.icon}</div>
      <h3>${s.title}</h3>
      <p>${s.description}</p>
    </div>`
    )
    .join("");

  const testimonialsHTML = content.testimonials
    .map(
      (t) => `
    <div class="testimonial-card">
      <p class="quote">"${t.quote}"</p>
      <div class="author">
        <strong>${t.author}</strong>
        <span>${t.role}</span>
      </div>
    </div>`
    )
    .join("");

  const statsHTML = content.about.stats
    ? content.about.stats
        .map(
          (s) => `
      <div class="stat">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
        )
        .join("")
    : "";

  const keywordsHTML = content.meta.keywords
    .map((k) => `<meta name="keywords" content="${k}">`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.meta.title}</title>
  <meta name="description" content="${content.meta.description}">
  ${keywordsHTML}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${p};
      --accent: ${a};
      --text: #1e293b;
      --text-muted: #64748b;
      --bg: #ffffff;
      --bg-alt: #f8fafc;
      --radius: 12px;
      --shadow: 0 4px 24px rgba(0,0,0,0.08);
      --shadow-lg: 0 20px 60px rgba(0,0,0,0.15);
    }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); line-height: 1.6; }

    /* NAV */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 5%; height: 72px;
      background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    .nav-logo { font-size: 1.25rem; font-weight: 800; color: var(--primary); text-decoration: none; }
    .nav-links { display: flex; gap: 2rem; list-style: none; }
    .nav-links a { text-decoration: none; color: var(--text); font-weight: 500; font-size: 0.95rem; transition: color 0.2s; }
    .nav-links a:hover { color: var(--primary); }
    .nav-cta {
      background: var(--primary); color: white; padding: 10px 22px;
      border-radius: 8px; text-decoration: none; font-weight: 600;
      font-size: 0.9rem; transition: opacity 0.2s;
    }
    .nav-cta:hover { opacity: 0.85; }

    /* HERO */
    .hero {
      min-height: 100vh; display: flex; align-items: center;
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
    .hero-bg {
      position: absolute; inset: 0;
      background-image: url('${heroImageUrl}');
      background-size: cover; background-position: center;
      opacity: 0.25;
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%);
    }
    .hero-content {
      position: relative; z-index: 1;
      max-width: 1200px; margin: 0 auto; padding: 0 5%;
      padding-top: 72px;
    }
    .hero-badge {
      display: inline-block; background: var(--primary); color: white;
      font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 6px 16px; border-radius: 100px;
      margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 900;
      color: white; line-height: 1.1; margin-bottom: 1.5rem;
      max-width: 800px;
    }
    .hero h1 span { color: var(--primary); }
    .hero p {
      font-size: 1.2rem; color: rgba(255,255,255,0.8);
      max-width: 600px; margin-bottom: 2.5rem; line-height: 1.7;
    }
    .hero-buttons { display: flex; gap: 1rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--primary); color: white;
      padding: 16px 32px; border-radius: var(--radius);
      text-decoration: none; font-weight: 700; font-size: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 20px rgba(99,102,241,0.4);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }
    .btn-secondary {
      background: transparent; color: white;
      padding: 16px 32px; border-radius: var(--radius);
      text-decoration: none; font-weight: 600; font-size: 1rem;
      border: 2px solid rgba(255,255,255,0.4);
      transition: border-color 0.2s, background 0.2s;
    }
    .btn-secondary:hover { border-color: white; background: rgba(255,255,255,0.1); }

    /* SECTIONS */
    section { padding: 100px 5%; }
    .container { max-width: 1200px; margin: 0 auto; }
    .section-label {
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: var(--primary); margin-bottom: 1rem;
    }
    .section-title {
      font-size: clamp(2rem, 4vw, 3rem); font-weight: 800;
      line-height: 1.15; margin-bottom: 1.25rem; color: var(--text);
    }
    .section-subtitle {
      font-size: 1.1rem; color: var(--text-muted); max-width: 600px; line-height: 1.7;
    }
    .section-header { margin-bottom: 4rem; }

    /* ABOUT */
    .about { background: var(--bg-alt); }
    .about-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;
    }
    .about-image {
      border-radius: 20px; overflow: hidden; aspect-ratio: 4/3;
      box-shadow: var(--shadow-lg);
    }
    .about-image img { width: 100%; height: 100%; object-fit: cover; }
    .about-content .section-subtitle { margin-bottom: 2.5rem; max-width: 100%; }
    .stats-row { display: flex; gap: 2rem; flex-wrap: wrap; }
    .stat { text-align: left; }
    .stat-value {
      font-size: 2.5rem; font-weight: 900; color: var(--primary);
      line-height: 1;
    }
    .stat-label { font-size: 0.9rem; color: var(--text-muted); margin-top: 4px; }

    /* SERVICES */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .service-card {
      background: white; border-radius: 16px; padding: 2rem;
      border: 1px solid rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: var(--shadow);
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .service-icon { font-size: 2.5rem; margin-bottom: 1.25rem; }
    .service-card h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem; }
    .service-card p { color: var(--text-muted); line-height: 1.7; font-size: 0.95rem; }

    /* TESTIMONIALS */
    .testimonials { background: var(--bg-alt); }
    .testimonials-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
    }
    .testimonial-card {
      background: white; border-radius: 16px; padding: 2rem;
      border: 1px solid rgba(0,0,0,0.06); box-shadow: var(--shadow);
    }
    .quote {
      font-size: 1rem; color: var(--text); line-height: 1.75;
      margin-bottom: 1.5rem; font-style: italic;
    }
    .quote::before { content: '"'; font-size: 3rem; color: var(--primary); line-height: 0; vertical-align: -0.8rem; margin-right: 4px; }
    .author strong { display: block; font-size: 0.95rem; font-weight: 700; }
    .author span { font-size: 0.85rem; color: var(--text-muted); }

    /* CTA SECTION */
    .cta-section {
      background: linear-gradient(135deg, var(--primary) 0%, ${p}dd 100%);
      text-align: center; padding: 100px 5%;
    }
    .cta-section .section-title { color: white; }
    .cta-section .section-subtitle { color: rgba(255,255,255,0.85); margin: 0 auto 2.5rem; }
    .cta-section .btn-primary {
      background: white; color: var(--primary);
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    }

    /* CONTACT */
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: start; }
    .contact-info { display: flex; flex-direction: column; gap: 1.5rem; }
    .contact-item { display: flex; align-items: flex-start; gap: 1rem; }
    .contact-item-icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: var(--primary); display: flex; align-items: center;
      justify-content: center; font-size: 1.2rem; flex-shrink: 0;
    }
    .contact-item-text strong { display: block; font-weight: 600; margin-bottom: 2px; }
    .contact-item-text span { color: var(--text-muted); font-size: 0.95rem; }
    .contact-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: 0.875rem; font-weight: 600; color: var(--text); }
    .form-field input, .form-field textarea, .form-field select {
      padding: 12px 16px; border-radius: 10px;
      border: 1.5px solid #e2e8f0; font-size: 0.95rem;
      font-family: inherit; color: var(--text);
      transition: border-color 0.2s; outline: none; width: 100%;
    }
    .form-field input:focus, .form-field textarea:focus, .form-field select:focus {
      border-color: var(--primary);
    }
    .form-field textarea { resize: vertical; min-height: 120px; }
    .form-submit {
      background: var(--primary); color: white; border: none;
      padding: 14px 28px; border-radius: 10px; font-weight: 700;
      font-size: 1rem; cursor: pointer; font-family: inherit;
      transition: opacity 0.2s; width: 100%;
    }
    .form-submit:hover { opacity: 0.9; }

    /* FOOTER */
    footer {
      background: #0f172a; color: rgba(255,255,255,0.6);
      padding: 3rem 5%; text-align: center;
    }
    .footer-logo { font-size: 1.5rem; font-weight: 900; color: white; margin-bottom: 0.5rem; }
    .footer-tagline { font-size: 0.9rem; margin-bottom: 1.5rem; }
    .footer-links { display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .footer-links a { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
    .footer-links a:hover { color: white; }
    .footer-copy { font-size: 0.8rem; color: rgba(255,255,255,0.3); }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .about-grid, .contact-grid { grid-template-columns: 1fr; gap: 3rem; }
      .form-row { grid-template-columns: 1fr; }
      .nav-links { display: none; }
      .hero h1 { font-size: 2.2rem; }
      section { padding: 70px 5%; }
    }
  </style>
</head>
<body>

<nav>
  <a href="#" class="nav-logo">${siteInput.businessName}</a>
  <ul class="nav-links">
    <li><a href="#about">About</a></li>
    <li><a href="#services">Services</a></li>
    <li><a href="#testimonials">Reviews</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
  <a href="#contact" class="nav-cta">${content.hero.cta}</a>
</nav>

<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-badge">${siteInput.location || siteInput.businessName}</div>
    <h1>${content.hero.headline}</h1>
    <p>${content.hero.subheadline}</p>
    <div class="hero-buttons">
      <a href="#contact" class="btn-primary">${content.hero.cta}</a>
      ${content.hero.ctaSecondary ? `<a href="#about" class="btn-secondary">${content.hero.ctaSecondary}</a>` : ""}
    </div>
  </div>
</section>

<section class="about" id="about">
  <div class="container">
    <div class="about-grid">
      <div class="about-image">
        <img src="${getUnsplashUrl(content.unsplashQuery + " team", 800, 600)}" alt="${siteInput.businessName}" loading="lazy">
      </div>
      <div class="about-content">
        <div class="section-label">About Us</div>
        <h2 class="section-title">${content.about.heading}</h2>
        <p class="section-subtitle">${content.about.body}</p>
        ${statsHTML ? `<div class="stats-row">${statsHTML}</div>` : ""}
      </div>
    </div>
  </div>
</section>

<section id="services">
  <div class="container">
    <div class="section-header">
      <div class="section-label">What We Offer</div>
      <h2 class="section-title">Our Services</h2>
    </div>
    <div class="services-grid">
      ${servicesHTML}
    </div>
  </div>
</section>

<section class="testimonials" id="testimonials">
  <div class="container">
    <div class="section-header">
      <div class="section-label">Client Reviews</div>
      <h2 class="section-title">What People Say</h2>
    </div>
    <div class="testimonials-grid">
      ${testimonialsHTML}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="container">
    <h2 class="section-title">${content.cta.heading}</h2>
    <p class="section-subtitle">${content.cta.body}</p>
    <a href="#contact" class="btn-primary">${content.cta.button}</a>
  </div>
</section>

<section id="contact">
  <div class="container">
    <div class="section-header">
      <div class="section-label">Get In Touch</div>
      <h2 class="section-title">Contact Us</h2>
    </div>
    <div class="contact-grid">
      <div class="contact-info">
        ${siteInput.phone ? `
        <div class="contact-item">
          <div class="contact-item-icon">📞</div>
          <div class="contact-item-text">
            <strong>Phone</strong>
            <span>${siteInput.phone}</span>
          </div>
        </div>` : ""}
        ${siteInput.email ? `
        <div class="contact-item">
          <div class="contact-item-icon">✉️</div>
          <div class="contact-item-text">
            <strong>Email</strong>
            <span>${siteInput.email}</span>
          </div>
        </div>` : ""}
        ${siteInput.location ? `
        <div class="contact-item">
          <div class="contact-item-icon">📍</div>
          <div class="contact-item-text">
            <strong>Location</strong>
            <span>${siteInput.location}</span>
          </div>
        </div>` : ""}
      </div>
      <form class="contact-form" onsubmit="handleSubmit(event)">
        <div class="form-row">
          <div class="form-field">
            <label>First Name</label>
            <input type="text" placeholder="John" required>
          </div>
          <div class="form-field">
            <label>Last Name</label>
            <input type="text" placeholder="Doe" required>
          </div>
        </div>
        <div class="form-field">
          <label>Email Address</label>
          <input type="email" placeholder="john@example.com" required>
        </div>
        <div class="form-field">
          <label>Phone Number</label>
          <input type="tel" placeholder="(555) 000-0000">
        </div>
        <div class="form-field">
          <label>Message</label>
          <textarea placeholder="Tell us how we can help you..."></textarea>
        </div>
        <button type="submit" class="form-submit">${content.cta.button}</button>
      </form>
    </div>
  </div>
</section>

<footer>
  <div class="footer-logo">${siteInput.businessName}</div>
  <div class="footer-tagline">${content.footer.tagline}</div>
  <div class="footer-links">
    <a href="#about">About</a>
    <a href="#services">Services</a>
    <a href="#testimonials">Reviews</a>
    <a href="#contact">Contact</a>
  </div>
  <div class="footer-copy">© ${new Date().getFullYear()} ${siteInput.businessName}. All rights reserved.</div>
</footer>

<script>
  function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.form-submit');
    btn.textContent = 'Message Sent! ✓';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = '${content.cta.button}';
      btn.style.background = '';
      e.target.reset();
    }, 3000);
  }

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Nav scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    nav.style.boxShadow = window.scrollY > 50 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none';
  });
</script>
</body>
</html>`;
}
