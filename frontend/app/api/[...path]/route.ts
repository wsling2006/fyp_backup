import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin API proxy for Next.js frontend
 * 
 * This proxy forwards all /api/* requests from the browser to the NestJS backend
 * running on localhost:3000 (on the same EC2 instance).
 * 
 * Architecture:
 * - Browser → http://<public-ip>:3001/api/... (Next.js)
 * - Next.js → http://localhost:3000/api/... (NestJS backend)
 * 
 * Benefits:
 * - No hardcoded IPs in frontend code
 * - Works after every EC2 restart without changes
 * - Simplifies CORS (backend only needs to allow localhost:3001)
 * - Frontend uses relative paths like /api/auth/login
 * 
 * IMPORTANT: Backend must run on port 3000 (configured in ecosystem.config.js)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

console.log('[API Proxy] Using backend URL:', BACKEND_URL);

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extract the path after /api/
    const { path } = params;
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    
    // Build the backend URL (strip /api prefix)
    // Frontend calls: /api/revenue/123
    // Proxy extracts: revenue/123
    // Proxy forwards: http://localhost:3000/revenue/123 (backend doesn't use /api prefix)
    const backendUrl = `${BACKEND_URL}/${apiPath}`;
    
    // Preserve query parameters
    const url = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Log the proxy request for debugging
    console.log(`[API Proxy] ${request.method} /api/${apiPath} → ${url.toString()}`);

    // Forward the request to the backend
    const headers = new Headers();
    
    // Copy relevant headers (exclude host-related headers)
    const headersToForward = [
      'content-type',
      'authorization',
      'accept',
      'accept-language',
      'cache-control',
      'pragma',
      'user-agent',
    ];
    
    headersToForward.forEach((headerName) => {
      const value = request.headers.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    });

    // Forward client IP headers for audit logging
    // Get real client IP from the incoming request
    const clientIp = 
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      request.ip ||
      'unknown';

    // Forward IP information to backend
    headers.set('x-forwarded-for', clientIp);
    headers.set('x-real-ip', clientIp);

    // Get request body if present
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const text = await request.text();
        body = text || undefined;
      } catch {
        // No body or already consumed
      }
    }

    // Make the proxied request
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
      credentials: 'include', // Forward cookies
    });

    // Get response body - handle both text and binary data
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    
    // For binary/blob responses (files, images, etc.), stream the response directly
    // This preserves binary data integrity and works with axios responseType: 'blob'
    if (
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/pdf') ||
      contentType.includes('image/') ||
      response.headers.get('content-disposition')?.includes('attachment')
    ) {
      // Use response.body directly to stream binary data without conversion
      console.log('[API Proxy] Streaming binary response:', {
        contentType,
        contentLength: response.headers.get('content-length'),
        contentDisposition: response.headers.get('content-disposition')
      });
      
      // Return the response body as-is (streaming)
      const proxyResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
      });

      // Copy response headers
      response.headers.forEach((value, key) => {
        // Skip headers that Next.js manages automatically
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          proxyResponse.headers.set(key, value);
        }
      });

      return proxyResponse;
    }
    
    // For JSON/text responses, use text
    responseData = await response.text();

    // Create response with same status and headers
    const proxyResponse = new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      // Skip headers that Next.js manages automatically
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        proxyResponse.headers.set(key, value);
      }
    });

    return proxyResponse;
  } catch (error) {
    console.error('[API Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { 
        error: 'Proxy error', 
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
