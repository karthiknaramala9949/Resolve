import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'RESOLVE-ONE Convex Production Backend',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }),
});

export default http;

