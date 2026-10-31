// Στέλνει web push. Καλείται μόνο από τη βάση (Supabase pg_cron/pg_net) με κοινό μυστικό.
const webpush = require("web-push");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!process.env.NOTIFY_SECRET || req.headers["x-notify-secret"] !== process.env.NOTIFY_SECRET)
    return res.status(401).json({ error: "unauthorized" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { subscription, title, body: text, tag, url } = body || {};
  if (!subscription || !subscription.endpoint) return res.status(400).json({ error: "subscription" });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:plh-matrix@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body: text, tag, url }), { TTL: 6 * 3600, urgency: "normal" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.statusCode === 404 || e.statusCode === 410 ? 410 : 502).json({ ok: false, status: e.statusCode || null });
  }
};
