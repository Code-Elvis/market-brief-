export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const clerkUrl = new URL(
    url.pathname.replace('/__clerk', '') + url.search,
    'https://frontend-api.clerk.dev'
  );

  const proxyHeaders = new Headers(req.headers);
  proxyHeaders.set('Clerk-Proxy-Url', 'https://marketdebriefs.com/__clerk');
  proxyHeaders.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');
  proxyHeaders.set('X-Forwarded-For', req.headers.get('x-forwarded-for') || '');
  proxyHeaders.delete('host');

  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  const response = await fetch(clerkUrl.toString(), {
    method: req.method,
    headers: proxyHeaders,
    body: body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', 'https://marketdebriefs.com');
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
