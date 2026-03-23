// Redirect /mc to /mc/ — catch-all is at /mc/[...path]/route.ts
export async function GET() {
  return new Response(null, { status: 308, headers: { Location: "/" } });
}
