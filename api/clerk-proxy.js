export default async function handler(req, res) {
const path = req.url.replace(’/api/clerk-proxy’, ‘’).replace(’/__clerk’, ‘’) || ‘/’;
const clerkUrl = `https://frontend-api.clerk.dev${path}`;

const proxyHeaders = {
‘host’: ‘frontend-api.clerk.dev’,
‘content-type’: req.headers[‘content-type’] || ‘application/json’,
‘accept’: req.headers[‘accept’] || ‘*/*’,
‘user-agent’: req.headers[‘user-agent’] || ‘’,
‘origin’: ‘https://marketdebriefs.com’,
‘Clerk-Proxy-Url’: ‘https://marketdebriefs.com/__clerk’,
‘Clerk-Secret-Key’: process.env.CLERK_SECRET_KEY || ‘’,
‘X-Forwarded-For’: req.headers[‘x-forwarded-for’] || ‘’,
};

try {
const body = req.method !== ‘GET’ && req.method !== ‘HEAD’
? JSON.stringify(req.body)
: undefined;

```
const response = await fetch(clerkUrl, {
  method: req.method,
  headers: proxyHeaders,
  body,
  redirect: 'manual',
});

const data = await response.text();

res.setHeader('Access-Control-Allow-Origin', 'https://marketdebriefs.com');
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');

response.headers.forEach((value, key) => {
  if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
    res.setHeader(key, value);
  }
});

res.status(response.status).send(data);
```

} catch (err) {
res.status(500).json({ error: err.message });
}
}
