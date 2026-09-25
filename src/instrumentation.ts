/**
 * Runs once when the Next.js server starts.
 *
 * Node's fetch tries IPv6 and IPv4 addresses in turn ("happy eyeballs") and gives each connection
 * attempt only 250 ms by default. On high-latency networks every attempt times out and fetch fails
 * with ETIMEDOUT even though the host is reachable — breaking calls to Groq and to the font service.
 * A longer per-attempt timeout fixes that and changes nothing on fast networks.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const net = await import("node:net");
    net.setDefaultAutoSelectFamilyAttemptTimeout(2000);
  }
}
