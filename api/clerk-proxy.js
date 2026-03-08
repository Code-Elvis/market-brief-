export default async function handler(req, res) {
const url = new URL(req.url, ‘https://marketdebriefs.com’);
const path = url.pathname.replace(’/api/clerk-proxy’, ‘’).replace(’/__clerk’, ‘’) || ‘/’;
const clerkUrl = `https://frontend-api.clerk.dev${path}${url.search}`;

const proxyHeaders = {
‘host’: ‘frontend-api.clerk.dev’,
‘content-type’: req.headers[‘content-type’] || ‘application/json’,
‘accept’: req.headers[‘accept’] || ‘*/*’,
‘user-agent’: req.headers[‘user-agent’] || ‘’,
‘origin’: ‘https://marketdebriefs.com’,
‘Clerk-Proxy-Url’: ‘https://marketdebriefs.com/__clerk’,
‘Clerk-Secret-Key’: process.env.CLERK_SECRET_KEY || ‘’,
‘X-Forwarded-For’: req.headers[‘x-forwarded-for’] || ‘’,
‘X-Forwarded-Proto’: ‘https’,
};

// Forward cookies from browser to Clerk
if (req.headers[‘cookie’]) {
proxyHeaders[‘cookie’] = req.headers[‘cookie’];
}

try {
const body = req.method !== ‘GET’ && req.method !== ‘HEAD’
? JSON.stringify(req.body)
: undefined;

```
const response = await fetch(clerkUrl, {
  method: req.method,
  headers: proxyHeaders,
  body,
  redirect: 'follow',
});

// Forward ALL response headers including Set-Cookie
response.headers.forEach((value, key) => {
  const lower = key.toLowerCase();
  if (['content-encoding', 'transfer-encoding', 'connection'].includes(lower)) return;
  
  // Rewrite cookie domain to marketdebriefs.com
  if (lower === 'set-cookie') {
    const rewritten = value
      .replace(/domain=[^;]+/gi, 'domain=marketdebriefs.com')
      .replace(/secure;?/gi, 'Secure;')
      .replace(/samesite=none/gi, 'SameSite=Lax');
    res.setHeader(key, rewritten);
  } else {
    res.setHeader(key, value);
  }
});

res.setHeader('Access-Control-Allow-Origin', 'https://marketdebriefs.com');
res.setHeader('Access-Control-Allow-Credentials', 'true');

const data = await response.text();
res.status(response.status).send(data);
```

} catch (err) {
res.status(500).json({ error: err.message });
}
}
