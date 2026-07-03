// Helper for Next.js API routes to broadcast events via the
// telemedicine socket.io mini-service on port 3003.
// Fire-and-forget: never throws, never blocks the response on errors.

const TELEMED_SERVICE_URL =
  process.env.TELEMED_SERVICE_URL ?? "http://localhost:3003";

const INTERNAL_SECRET = "telemedicine";

export async function broadcastTelemedicine(
  jamaahId: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    await fetch(`${TELEMED_SERVICE_URL}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal": INTERNAL_SECRET,
      },
      body: JSON.stringify({ event, jamaahId, payload }),
    });
  } catch {
    // Mini-service may not be running in dev; fail silently.
  }
}
