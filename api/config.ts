// Tells the app which providers this deployment has keys for (never the keys themselves).
import { UPSTREAMS, accessCode, checkAccess, json, serverKey, type Upstream } from "./_shared"

export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  const required = !!accessCode()
  const denied = checkAccess(req)
  const providers = Object.fromEntries((Object.keys(UPSTREAMS) as Upstream[]).map((u) => [u, !!serverKey(u)]))
  return json({
    deployed: true,
    accessRequired: required,
    // With a wrong or missing code, say what's configured but not that access is granted.
    authorized: !denied,
    providers,
  })
}
