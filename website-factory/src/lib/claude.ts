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
    eyebrow?: string;
  };
  about: {
    heading: string;
    body: string;
    stats?: Array<{ value: string; numericValue: number; suffix: string; label: string }>;
  };
  services: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  process?: Array<{
    step: string;
    title: string;
    description: string;
  }>;
  testimonials: Array<{
    quote: string;
    author: string;
    role: string;
    rating: number;
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
  videoQuery: string;
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
    "eyebrow": "3-5 word category or trust signal (e.g. 'Austin's #1 Family Dentist' or 'Award-Winning Creative Agency')",
    "headline": "Bold, specific headline — maximum impact, maximum specificity. NOT generic. Split into 2 lines mentally. Make it punchy.",
    "subheadline": "1-2 sentences of specific value. What pain do they solve? What transformation do they create?",
    "cta": "Primary button (action verb + object, 2-4 words)",
    "ctaSecondary": "Secondary button (softer action, 2-4 words)"
  },
  "about": {
    "heading": "About section heading — creative and specific to their story, NOT 'About Us'",
    "body": "3 short paragraphs separated by \\n\\n. First: their founding story or mission. Second: what makes them different. Third: community connection or values. Write like a human, not an AI.",
    "stats": [
      {"value": "10+", "numericValue": 10, "suffix": "+", "label": "Years in Business"},
      {"value": "500+", "numericValue": 500, "suffix": "+", "label": "Happy Clients"},
      {"value": "98%", "numericValue": 98, "suffix": "%", "label": "5-Star Reviews"}
    ]
  },
  "services": [
    {
      "title": "Service name (specific, not generic)",
      "description": "2-3 sentences. Lead with the benefit, not the feature. Why does this matter to the client?",
      "icon": "single relevant emoji"
    }
  ],
  "process": [
    {"step": "01", "title": "Step name", "description": "One sentence explaining this step"},
    {"step": "02", "title": "Step name", "description": "One sentence explaining this step"},
    {"step": "03", "title": "Step name", "description": "One sentence explaining this step"}
  ],
  "testimonials": [
    {
      "quote": "Specific, detailed testimonial. Mention a concrete outcome or detail. NOT 'Great service!' — make it feel real. 2-3 sentences.",
      "author": "Full realistic name",
      "role": "Specific role or relationship (e.g. 'Owner, Rivera Landscaping' or 'Austin Homeowner')",
      "rating": 5
    },
    {
      "quote": "Different specific testimonial with different details",
      "author": "Different name",
      "role": "Different role",
      "rating": 5
    },
    {
      "quote": "Third distinct testimonial",
      "author": "Third name",
      "role": "Third role",
      "rating": 5
    }
  ],
  "cta": {
    "heading": "Final CTA headline — urgency or transformation. Make them feel something.",
    "body": "1-2 sentences that eliminate the last objection. Make taking action feel easy and safe.",
    "button": "Final CTA button text (specific and action-oriented)"
  },
  "footer": {
    "tagline": "Brand tagline under 8 words — memorable and specific to their value"
  },
  "unsplashQuery": "3-4 words for Unsplash image search. Be specific to the industry and vibe (e.g. 'modern dental office interior' or 'luxury restaurant evening ambiance')",
  "videoQuery": "2-3 words for Pexels video search. Focus on the environment/atmosphere, not the logo (e.g. 'dental office' or 'restaurant kitchen' or 'gym workout')"
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
