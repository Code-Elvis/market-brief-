export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  
  // Strip /__clerk prefix and forward to Clerk's Frontend API
  const clerkUrl = new URL(
    url.pathname.replace('/__clerk', '') + url.search,
    'https://frontend-api.clerk.dev'
  );

  const headers = new Headers(req.headers);
  headers.set('Clerk-Proxy-Url', 'https://marketdebriefs.com/__clerk');
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY);
  headers.set('X-Forwarded-For', req.headers.get('x-forwarded-for') || '');

  const response = await fetch(clerkUrl.toString(), {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    redirect: 'manual',
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
