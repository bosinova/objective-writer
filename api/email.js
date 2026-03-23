/**
 * Vercel serverless function: send objectives (and optional activities) via Resend.
 * POST body: { to, plainContent?, title?, subject? } for dashboard items, or
 * { to, objectives: [{ text }], activities?: [...] } for Objective Writer flow.
 * Requires RESEND_API_KEY. From address: hello@trenwalker.com (domain must be verified in Resend).
 */

import { Resend } from "resend";

const FROM = "Prism Learning Design <hello@trenwalker.com>";
const SUBJECT = "Your Learning Objectives from Objective Writer";

function buildDashboardPlainEmail(title, plainContent) {
  const safeTitle = escapeHtml(typeof title === "string" && title.trim() ? title.trim() : "Your content");
  const escapedBody = escapeHtml(typeof plainContent === "string" ? plainContent : "")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "<br/>");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);">
    <div style="padding:20px 24px;background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Prism</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Prism Learning Design</p>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#0f172a;">${safeTitle}</h1>
      <div style="margin:0;font-size:13px;color:#374151;line-height:1.55;word-break:break-word;">${escapedBody}</div>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#6b7280;">Saved from your Prism project dashboard.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function buildHtmlEmail(body) {
  const { objectives = [], activities = [] } = body;

  const objectivesHtml = objectives
    .map(
      (obj, i) => `
    <tr><td style="padding:8px 0 4px 0;font-size:13px;color:#0f172a;line-height:1.5;">${i + 1}. ${escapeHtml(obj.text)}</td></tr>
  `
    )
    .join("");

  let activitiesHtml = "";
  if (activities.length > 0) {
    activitiesHtml = activities
      .map(
        (block) => `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#4b5563;">Objective ${block.objectiveIndex + 1}</p>
      <p style="margin:0 0 10px 0;font-size:12px;color:#374151;line-height:1.45;">${escapeHtml(block.objectiveText)}</p>
      ${(block.activities || [])
        .map(
          (a) => `
      <div style="margin:0 0 12px 0;padding:10px 12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#06b6d4;">${escapeHtml(a.activityType)}</p>
        <p style="margin:0 0 4px 0;font-size:12px;color:#374151;line-height:1.45;">${escapeHtml(a.description)}</p>
        <p style="margin:0;font-size:11px;color:#6b7280;font-style:italic;">${escapeHtml(a.whyItFits)}</p>
      </div>
      `
        )
        .join("")}
    </div>
    `
      )
      .join("");
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(SUBJECT)}</title>
</head>
<body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);">
    <div style="padding:20px 24px;background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Objective Writer</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Prism Learning Design</p>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 20px 0;font-size:16px;font-weight:700;color:#0f172a;">Your learning objectives</h1>
      <table style="width:100%;border-collapse:collapse;">
        ${objectivesHtml}
      </table>
      ${activitiesHtml ? `<h2 style="margin:24px 0 12px 0;font-size:14px;font-weight:700;color:#0f172a;">Suggested activities</h2>${activitiesHtml}` : ""}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#6b7280;">Refine wording as needed before publishing. — Prism Learning Design</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Email is not configured (RESEND_API_KEY missing)." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: "Valid email address (to) is required." });
  }

  const plainContent = typeof body.plainContent === "string" ? body.plainContent.trim() : "";
  if (plainContent) {
    const title =
      typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Your Prism content";
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "Your Prism project content";
    const resend = new Resend(apiKey);
    const html = buildDashboardPlainEmail(title, plainContent);
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [to],
        subject,
        html,
      });
      if (error) {
        console.error("[api/email] Resend error:", error);
        return res.status(500).json({ error: error.message || "Failed to send email." });
      }
      return res.status(200).json({ success: true, id: data?.id });
    } catch (err) {
      console.error("[api/email] Send error:", err);
      return res.status(500).json({ error: err.message || "Failed to send email." });
    }
  }

  const objectives = Array.isArray(body.objectives) ? body.objectives : [];
  const activities = Array.isArray(body.activities) ? body.activities : [];

  if (objectives.length === 0) {
    return res.status(400).json({ error: "objectives or plainContent is required." });
  }

  const resend = new Resend(apiKey);
  const html = buildHtmlEmail({ objectives, activities });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: SUBJECT,
      html,
    });

    if (error) {
      console.error("[api/email] Resend error:", error);
      return res.status(500).json({ error: error.message || "Failed to send email." });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error("[api/email] Send error:", err);
    return res.status(500).json({ error: err.message || "Failed to send email." });
  }
}
