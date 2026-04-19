import crypto from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAdminClient, createAnonClient, setSessionCookies, storeSessionForAccount, ensureUserProfile, fetchUserProfile, mapUser } from '../lib/auth.js';

// OTP storage — in-memory with automatic cleanup
const otpStore = new Map(); // key: phone, value: { code, expiresAt, attempts }
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const OTP_CLEANUP_INTERVAL = 60 * 1000; // Clean expired entries every 60s

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(key);
  }
}, OTP_CLEANUP_INTERVAL).unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const whatsappLogsDir = path.resolve(__dirname, '..', '..', 'logs');
const whatsappLogFile = path.join(whatsappLogsDir, 'whatsapp.log');

function writeWhatsAppLog(event, payload) {
  try {
    if (!existsSync(whatsappLogsDir)) {
      mkdirSync(whatsappLogsDir, { recursive: true });
    }
    const line = `${new Date().toISOString()} ${JSON.stringify({ event, ...payload })}\n`;
    appendFileSync(whatsappLogFile, line, 'utf8');
  } catch {
    // Avoid breaking auth flow on logging errors.
  }
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function getPhoneNumberId() {
  return (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
}

function getWhatsAppToken() {
  const raw = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  return raw.replace(/^Bearer\s+/i, '');
}

function getWhatsAppTemplateName() {
  return (process.env.WHATSAPP_TEMPLATE_NAME || 'stiri_otp').trim();
}

function getWhatsAppTemplateLanguage() {
  return (process.env.WHATSAPP_TEMPLATE_LANG || 'en_US').trim();
}

function buildTemplatePayload(templateName, templateLang, code) {
  const payload = {
    name: templateName,
    language: { code: templateLang },
  };

  // Meta test template `hello_world` expects no params.
  if (templateName.toLowerCase() === 'hello_world') {
    return payload;
  }

  // Authentication templates with a URL button (OTP as URL suffix).
  // sub_type must be 'url', parameter is the OTP code appended to the button URL.
  if (templateName.toLowerCase().includes('auth')) {
    return {
      ...payload,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    };
  }

  return {
    ...payload,
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }],
      },
    ],
  };
}

/**
 * POST /auth/otp/send
 * Body: { phone: "9198XXXXXXXX" }  — full number with country code (no +)
 */
export async function sendOtpHandler(req, res) {
  try {
    const { phone } = req.body || {};
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Normalize to digits only
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    // Default to India format if 10-digit local number is provided
    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

    // Rate-limit: don't allow re-send within 30s
    const existing = otpStore.get(cleanPhone);
    if (existing && existing.expiresAt > Date.now() && existing.sentAt && (Date.now() - existing.sentAt) < 30000) {
      return res.status(429).json({ success: false, error: 'Please wait 30 seconds before requesting a new OTP' });
    }

    const code = generateOtp();
    otpStore.set(cleanPhone, {
      code,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      sentAt: Date.now(),
      attempts: 0,
    });

    const phoneNumberId = getPhoneNumberId();
    const accessToken = getWhatsAppToken();
    const templateName = getWhatsAppTemplateName();
    const templateLang = getWhatsAppTemplateLanguage();

    if (!phoneNumberId || !accessToken) {
      console.error('WhatsApp credentials not configured');
      return res.status(500).json({ success: false, error: 'OTP service not configured' });
    }

    // Send OTP via WhatsApp Business Cloud API
    const whatsappResp = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: buildTemplatePayload(templateName, templateLang, code),
        }),
      }
    );

    const whatsappData = await whatsappResp.json().catch(() => ({}));

    if (!whatsappResp.ok) {
      const errData = whatsappData;
      const metaError = errData?.error || {};
      const metaCode = metaError?.code;
      const metaSubcode = metaError?.error_subcode;
      const metaMessage = metaError?.message || 'Unknown WhatsApp API error';
      const metaDetails = metaError?.error_data?.details || null;

      console.error('WhatsApp API error:', {
        status: whatsappResp.status,
        code: metaCode,
        subcode: metaSubcode,
        message: metaMessage,
        details: metaDetails,
        templateName,
        templateLang,
        to: cleanPhone,
      });
      writeWhatsAppLog('send_error', {
        status: whatsappResp.status,
        code: metaCode,
        subcode: metaSubcode,
        message: metaMessage,
        details: metaDetails,
        templateName,
        templateLang,
        to: cleanPhone,
      });

      return res.status(502).json({
        success: false,
        error: `WhatsApp send failed${metaCode ? ` (${metaCode}${metaSubcode ? `/${metaSubcode}` : ''})` : ''}: ${metaMessage}`,
        details: metaDetails,
      });
    }

    console.log('WhatsApp send accepted:', {
      to: cleanPhone,
      templateName,
      templateLang,
      contact: whatsappData?.contacts?.[0] || null,
      messageId: whatsappData?.messages?.[0]?.id || null,
    });
    writeWhatsAppLog('send_accepted', {
      to: cleanPhone,
      templateName,
      templateLang,
      contact: whatsappData?.contacts?.[0] || null,
      messageId: whatsappData?.messages?.[0]?.id || null,
    });

    return res.status(200).json({
      success: true,
      message: 'OTP accepted by WhatsApp',
      messageId: whatsappData?.messages?.[0]?.id || null,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
}

/**
 * POST /auth/otp/verify
 * Body: { phone: "9198XXXXXXXX", code: "123456" }
 */
export async function verifyOtpHandler(req, res) {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: 'Phone and OTP code are required' });
    }

    // Normalize exactly the same way sendOtpHandler does: strip all non-digits, then 10-digit → 91XXXXXXXXXX
    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.length === 10 ? `91${digits}` : digits;
    const stored = otpStore.get(normalizedPhone);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(normalizedPhone);
      return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new OTP.' });
    }

    stored.attempts++;

    // Timing-safe comparison to prevent timing attacks
    const codeBuffer = Buffer.from(stored.code.padEnd(6, '0'));
    const inputBuffer = Buffer.from(code.trim().padEnd(6, '0'));
    if (codeBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(codeBuffer, inputBuffer)) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP verified — clean up
    otpStore.delete(normalizedPhone);

    const admin = createAdminClient();
    const anon = createAnonClient();
    if (!admin || !anon) {
      return res.status(500).json({ success: false, error: 'Server misconfigured' });
    }

    const phoneWithPlus = `+${normalizedPhone}`;
    const tempEmail = `${normalizedPhone}@phone.stiri.in`;

    // Reliable user lookup: filter by derived email (avoids pagination limits of plain listUsers())
    const { data: searchData } = await admin.auth.admin.listUsers({ filter: tempEmail });
    let supabaseUser = searchData?.users?.find(u => u.email === tempEmail)
      ?? searchData?.users?.find(u => u.phone === phoneWithPlus)
      ?? null;

    if (!supabaseUser) {
      // New user — create account
      const { data: newUserData, error: createErr } = await admin.auth.admin.createUser({
        phone: phoneWithPlus,
        email: tempEmail,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone_verified: true },
      });

      if (createErr || !newUserData?.user) {
        console.error('User creation error:', createErr);
        return res.status(500).json({ success: false, error: 'Failed to create account' });
      }

      supabaseUser = newUserData.user;
    }

    // Generate a magic link token and immediately verify it to get a real session.
    // NOTE: verifyOtp hashes the token before lookup, so we must pass email_otp (raw),
    // NOT hashed_token (which is SHA256(email_otp)) — passing hashed_token causes
    // double-hashing → SHA256(SHA256(otp)) which never matches → "otp_expired".
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: tempEmail,
    });

    if (linkErr || !linkData?.properties?.email_otp) {
      console.error('generateLink error:', linkErr);
      return res.status(500).json({ success: false, error: 'Failed to create session' });
    }

    const { data: sessionData, error: sessErr } = await anon.auth.verifyOtp({
      email: tempEmail,
      token: linkData.properties.email_otp,
      type: 'magiclink',
    });

    if (sessErr || !sessionData?.session) {
      console.error('verifyOtp session error:', sessErr);
      return res.status(500).json({ success: false, error: 'Failed to create session' });
    }

    const session = sessionData.session;
    const finalUser = sessionData.user || supabaseUser;

    setSessionCookies(res, session);
    storeSessionForAccount(req, res, session, tempEmail);

    await ensureUserProfile(admin, finalUser);
    const profile = await fetchUserProfile(admin, finalUser.id);

    return res.status(200).json({
      success: true,
      user: mapUser(finalUser, profile),
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
}

/**
 * GET /auth/webhook/whatsapp
 * Meta webhook verification (challenge-response)
 */
export function whatsappWebhookVerify(req, res) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    return res.status(503).send('Webhook not configured');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
}

/**
 * POST /auth/webhook/whatsapp
 * Meta webhook for delivery status updates (optional — log only)
 */
export function whatsappWebhookHandler(req, res) {
  const entry = req.body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value || {};
  const statuses = Array.isArray(value.statuses) ? value.statuses : [];
  const messages = Array.isArray(value.messages) ? value.messages : [];

  if (statuses.length > 0) {
    for (const status of statuses) {
      const payload = {
        id: status?.id || null,
        recipient: status?.recipient_id || null,
        status: status?.status || null,
        timestamp: status?.timestamp || null,
        conversation: status?.conversation?.id || null,
        pricingCategory: status?.pricing?.category || null,
        errors: status?.errors || null,
      };
      console.log('WhatsApp delivery status:', payload);
      writeWhatsAppLog('delivery_status', payload);
    }
  } else if (messages.length > 0) {
    for (const message of messages) {
      const payload = {
        from: message?.from || null,
        id: message?.id || null,
        type: message?.type || null,
      };
      console.log('WhatsApp inbound event:', payload);
      writeWhatsAppLog('inbound_event', payload);
    }
  } else {
    console.log('WhatsApp webhook event:', JSON.stringify(req.body).slice(0, 1000));
    writeWhatsAppLog('webhook_event', { body: req.body || null });
  }

  return res.status(200).send('OK');
}
