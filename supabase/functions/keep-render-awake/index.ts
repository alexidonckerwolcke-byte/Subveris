// Keep your Render app awake by pinging it from a scheduled external monitor.
// Deploy with `npx supabase@latest functions deploy keep-render-awake`
// Set the target URL as a secret: `npx supabase@latest secrets set KEEP_RENDER_AWAKE_URL=https://your-render-app-url`

export async function serve(req: Request) {
  const url = Deno.env.get('KEEP_RENDER_AWAKE_URL');
  if (!url) {
    return new Response('Missing KEEP_RENDER_AWAKE_URL', { status: 500 });
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase-Keep-Render-Awake/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const text = await res.text();
    return new Response(`Pinged ${url} => ${res.status} ${res.statusText}`, {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new Response(`Ping failed: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
