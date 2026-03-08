export const config = { runtime: ‘edge’ };

export default async function handler(req) {
const url = new URL(req.url);

const clerkPath = url.pathname.replace(’/__clerk’, ‘’) || ‘/’;
const clerkUrl = `https://frontend-api.clerk.dev${clerkPath}${url.search}`;

// Required Clerk proxy headers
const proxyHeaders = {
‘host’: ‘frontend-api.clerk.dev’,
‘content-type’: req.headers.get(‘content-type’) || ‘application/json’,
‘accept’: req.headers.get(‘accept’) || ‘*/*’,
‘user-agent’: req.headers.get(‘user-agent’) || ‘’,
‘origin’: ‘https://marketdebriefs.com’,
‘Clerk-Proxy-Url’: ‘https://marketdebriefs.com/__clerk’,
‘Clerk-Secret-Key’: process.env.CLERK_SECRET_KEY || ‘’,
‘X-Forwarded-For’: req.headers.get(‘x-forwarded-for’) || ‘’,
‘X-Forwarded-Host’: ‘marketdebriefs.com’,
};

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

return new Response(response.body, {
status: response.status,
headers: {
…Object.fromEntries(response.headers.entries()),
‘Access-Control-Allow-Origin’: ‘https://marketdebriefs.com’,
‘Access-Control-Allow-Credentials’: ‘true’,
},
});
}
