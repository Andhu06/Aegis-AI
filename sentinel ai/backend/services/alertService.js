// ============================================================
//  services/alertService.js
//  Sends disaster alert SMS via MSG91 Flow API
// ============================================================

/**
 * sendAlertSMS(hospitals, lat, lng, type)
 * Sends one MSG91 flow SMS per hospital to ALERT_PHONE.
 * Returns array of { success, hospital, requestId } objects.
 */
async function sendAlertSMS(hospitals, lat, lng, type = "Unknown") {
  // ── Read ALL env vars inside function (never top-level) ───
  const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY;
  const MSG91_FLOW_ID   = process.env.MSG91_FLOW_ID;
  const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
  const ALERT_PHONE     = process.env.ALERT_PHONE;

  // ── ENV CHECK ─────────────────────────────────────────────
  console.log("[AlertService] === MSG91 ENV CHECK ===");
  console.log("[AlertService] MSG91_AUTH_KEY  :", MSG91_AUTH_KEY  ? "LOADED ✅" : "MISSING ❌");
  console.log("[AlertService] MSG91_FLOW_ID   :", MSG91_FLOW_ID   ? "LOADED ✅" : "MISSING ❌");
  console.log("[AlertService] MSG91_SENDER_ID :", MSG91_SENDER_ID ? "LOADED ✅" : "MISSING ❌");
  console.log("[AlertService] ALERT_PHONE     :", ALERT_PHONE     ? ALERT_PHONE  : "MISSING ❌");
  console.log("[AlertService] ======================");

  // ── Guards ────────────────────────────────────────────────
  if (!MSG91_AUTH_KEY)  throw new Error("[AlertService] Missing env var: MSG91_AUTH_KEY");
  if (!MSG91_FLOW_ID)   throw new Error("[AlertService] Missing env var: MSG91_FLOW_ID");
  if (!MSG91_SENDER_ID) throw new Error("[AlertService] Missing env var: MSG91_SENDER_ID");
  if (!ALERT_PHONE)     throw new Error("[AlertService] Missing env var: ALERT_PHONE");

  const results = [];
  const mobile  = "91" + ALERT_PHONE.trim();

  console.log(`[AlertService] Sending MSG91 SMS for ${hospitals.length} hospital(s) → ${mobile}`);

  for (const hospital of hospitals) {
    const payload = {
      flow_id:   MSG91_FLOW_ID,
      sender:    MSG91_SENDER_ID,
      mobiles:   mobile,
      VAR1:      hospital.name,
      VAR2:      type,
    };

    console.log(`[AlertService] → Calling MSG91 for hospital: "${hospital.name}"`);
    console.log("[AlertService] Request payload:", JSON.stringify(payload));

    try {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey:        MSG91_AUTH_KEY,
          "Content-Type": "application/json",
          accept:         "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log(`[AlertService] MSG91 raw response for "${hospital.name}":`, JSON.stringify(data));

      if (!res.ok || data.type === "error") {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }

      console.log(`[AlertService] ✅ SMS sent — "${hospital.name}" | requestId: ${data.request_id ?? "N/A"}`);

      results.push({
        success:    true,
        to:         mobile,
        status:     "sent",
        request_id: data.request_id ?? null,
        hospital:   hospital.name,
      });

    } catch (err) {
      console.error(`[AlertService] ❌ SMS FAILED — "${hospital.name}" | error: ${err.message}`);

      results.push({
        success:  false,
        hospital: hospital.name,
        error:    err.message,
      });
    }
  }

  const sent = results.filter(r => r.success).length;
  console.log(`[AlertService] Done. ${sent}/${results.length} SMS sent successfully.`);

  return results;
}

module.exports = { sendAlertSMS };
