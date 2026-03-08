export const config = { runtime: ‘edge’ };

export default async function handler(req) {
const url = new URL(req.url);

const clerkPath = url.pathname.replace(’/__clerk’, ‘’) || ‘/’;
const clerkUrl = `https://frontend-api.clerk.dev${clerkPath}${url.search}`;

const proxyHeaders = new Headers();

// Copy safe headers from original request
for (const [key, value] of req.headers.entries()) {
const lower = key.toLowerCase();
if (![‘host’, ‘connection’, ‘transfer-encoding’].includes(lower)) {
proxyHeaders.set(key, value);
}
}

// Required Clerk proxy headers
proxyHeaders.set(‘host’, ‘frontend-api.clerk.dev’);
proxyHeaders.set(‘Clerk-Proxy-Url’, ‘https://marketdebriefs.com/__clerk’);
proxyHeaders.set(‘Clerk-Secret-Key’, process.env.CLERK_SECRET_KEY || ‘’);
proxyHeaders.set(‘X-Forwarded-For’, req.headers.get(‘x-forwarded-for’) || ‘’);
proxyHeaders.set(‘X-Forwarded-Host’, ‘marketdebriefs.com’);

let body = undefined;
if (req.method !== ‘GET’ && req.method !== ‘HEAD’) {
body = await req.arrayBuffer();
}

const response = await fetch(clerkUrl, {
method: req.method,
headers: proxyHeaders,
body,
redirect: ‘manual’,
});

const responseHeaders = new Headers(response.headers);
responseHeaders.set(‘Access-Control-Allow-Origin’, ‘https://marketdebriefs.com’);
responseHeaders.set(‘Access-Control-Allow-Credentials’, ‘true’);

return new Response(response.body, {
status: response.status,
headers: responseHeaders,
});
}
