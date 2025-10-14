export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response('URL parameter is required', { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'text/plain' }
      });
    }

    console.log('🔄 Proxying request to:', targetUrl);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return new Response(response.body, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Content-Length': response.headers.get('content-length') || '',
      }
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  }
}
