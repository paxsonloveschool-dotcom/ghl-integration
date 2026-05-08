import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface SiteInput {
  businessName: string;
  industry: string;
  location?: string;
  description?: string;
  phone?: string;
  email?: string;
  services?: string[];
  tone?: "professional" | "friendly" | "bold" | "luxury" | "playful";
  colorScheme?: string;
  primaryColor?: string;
}

export interface GeneratedSiteContent {
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
    ctaSecondary?: string;
  };
  about: {
    heading: string;
    body: string;
    stats?: Array<{ value: string; label: string }>;
  };
  services: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  testimonials: Array<{
    quote: string;
    author: string;
    role: string;
  }>;
  cta: {
    heading: string;
    body: string;
    button: string;
  };
  footer: {
    tagline: string;
  };
  unsplashQuery: string;
}

export async function generateSiteContent(
  input: SiteInput
): Promise<GeneratedSiteContent> {
  const prompt = `You are a world-class copywriter and web designer. Generate website content for the following business. The content must be sharp, professional, and NOT sound like generic AI. Every line should feel hand-crafted for this specific business.

Business Details:
- Name: ${input.businessName}
- Industry: ${input.industry}
- Location: ${input.location || "Not specified"}
- Description: ${input.description || "Not provided"}
- Phone: ${input.phone || "Not provided"}
- Email: ${input.email || "Not provided"}
- Services: ${input.services?.join(", ") || "Not specified"}
- Tone: ${input.tone || "professional"}

Return a JSON object with this exact structure:
{
  "meta": {
    "title": "Page title (under 60 chars, includes business name and key service)",
    "description": "Meta description (under 160 chars, compelling and specific)",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  },
  "hero": {
    "headline": "Bold, specific headline (NOT generic. E.g. not 'Welcome to our business')",
    "subheadline": "1-2 sentences that explain the unique value. Specific to their industry.",
    "cta": "Primary button text (action-oriented, 2-4 words)",
    "ctaSecondary": "Secondary button text (2-4 words)"
  },
  "about": {
    "heading": "About section heading (creative, not just 'About Us')",
    "body": "2-3 paragraph story about the business. Make it feel human and real.",
    "stats": [
      {"value": "10+", "label": "Years Experience"},
      {"value": "500+", "label": "Happy Clients"},
      {"value": "98%", "label": "Satisfaction Rate"}
    ]
  },
  "services": [
    {
      "title": "Service name",
      "description": "2-3 sentences explaining this service and its value",
      "icon": "one word emoji that represents this service"
    }
  ],
  "testimonials": [
    {
      "quote": "Specific, believable testimonial (not generic praise). 2-3 sentences.",
      "author": "Real-sounding full name",
      "role": "Their role or 'Local Resident' or their job title"
    },
    {
      "quote": "Another specific testimonial",
      "author": "Another name",
      "role": "Another role"
    },
    {
      "quote": "Third testimonial",
      "author": "Third name",
      "role": "Third role"
    }
  ],
  "cta": {
    "heading": "Compelling final call-to-action heading",
    "body": "1-2 sentences that remove hesitation and encourage action",
    "button": "Final CTA button text"
  },
  "footer": {
    "tagline": "Short brand tagline (under 10 words)"
  },
  "unsplashQuery": "2-3 word search query for Unsplash to find a hero image (e.g. 'modern dental office' or 'italian restaurant interior')"
}

Only return the JSON. No explanation. No markdown. Pure JSON.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as GeneratedSiteContent;
}

export async function generateBulkSites(
  inputs: SiteInput[]
): Promise<GeneratedSiteContent[]> {
  const results = await Promise.all(
    inputs.map((input) => generateSiteContent(input))
  );
  return results;
}
