import { NextResponse } from 'next/server';

/**
 * Health check endpoint for ALB/Load Balancer
 * 
 * This endpoint is used by AWS ALB to monitor the health of the frontend service.
 * It returns a simple JSON response indicating the service is operational.
 * 
 * ALB will periodically call this endpoint to ensure the frontend is healthy.
 * If this endpoint fails to respond or returns non-200 status, ALB will mark
 * the instance as unhealthy and stop routing traffic to it.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      version: process.env.npm_package_version || '1.0.0',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
