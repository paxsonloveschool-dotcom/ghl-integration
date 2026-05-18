export interface DeployResult {
  url: string;
  scriptName: string;
}

export async function deployToCloudflare(
  siteName: string,
  html: string
): Promise<DeployResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required");
  }

  // Sanitize script name: lowercase, hyphens only, max 63 chars
  const scriptName = siteName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);

  // Worker script that serves the HTML directly
  const workerScript = `const HTML = ${JSON.stringify(html)};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }
    return new Response(HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};`;

  // Upload the Worker script
  const uploadRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/javascript",
      },
      body: workerScript,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`Worker upload failed: ${JSON.stringify(err)}`);
  }

  // Enable workers.dev subdomain routing
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: true }),
    }
  );

  // Get the account's workers.dev subdomain
  const subdomainRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  );

  let workersDomain = "workers.dev";
  if (subdomainRes.ok) {
    const subData = await subdomainRes.json();
    if (subData.result?.subdomain) {
      workersDomain = `${subData.result.subdomain}.workers.dev`;
    }
  }

  return {
    url: `https://${scriptName}.${workersDomain}`,
    scriptName,
  };
}
