import crypto from 'crypto';
import { createAdminClient, setSessionCookies, storeSessionForAccount, ensureUserProfile, fetchUserProfile, mapUser } from '../lib/auth.js';

// OTP storage — in-memory for simplicity, could use Redis (Upstash) for production
const otpStore = new Map(); // key: phone, value: { code, expiresAt, attempts }
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function getPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || '';
}

function getWhatsAppToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || '';
}

function getWhatsAppTemplateName() {
  return process.env.WHATSAPP_TEMPLATE_NAME || 'stiri_otp';
}

function getWhatsAppTemplateLanguage() {
  return process.env.WHATSAPP_TEMPLATE_LANG || 'en';
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
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: code },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!whatsappResp.ok) {
      const errData = await whatsappResp.json().catch(() => ({}));
      const metaError = errData?.error || {};
      const metaCode = metaError?.code;
      const metaMessage = metaError?.message || 'Unknown WhatsApp API error';
      const metaDetails = metaError?.error_data?.details || null;

      console.error('WhatsApp API error:', {
        status: whatsappResp.status,
        code: metaCode,
        message: metaMessage,
        details: metaDetails,
        templateName,
        templateLang,
        to: cleanPhone,
      });

      return res.status(502).json({
        success: false,
        error: `WhatsApp send failed${metaCode ? ` (${metaCode})` : ''}: ${metaMessage}`,
        details: metaDetails,
      });
    }

    return res.status(200).json({ success: true, message: 'OTP sent via WhatsApp' });
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

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(cleanPhone);
      return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new OTP.' });
    }

    stored.attempts++;

    if (stored.code !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP verified — clean up
    otpStore.delete(cleanPhone);

    // Create or sign in user via Supabase Admin
    const admin = createAdminClient();
    if (!admin) {
      return res.status(500).json({ success: false, error: 'Server misconfigured' });
    }

    // Format phone for Supabase (with +)
    const phoneWithPlus = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    // Check if user exists with this phone
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    let existingUser = existingUsers?.users?.find(u => u.phone === phoneWithPlus);

    let userId;
    let session;

    if (existingUser) {
      // User exists — generate a session
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUser.email || `${cleanPhone}@phone.stiri.in`,
      });

      if (linkErr || !linkData) {
        // Fallback: use signInWithPassword if we have an email
        // For phone-only users, create a session via admin
        const { data: sessionData, error: sessErr } = await admin.auth.admin.createSession({
          user_id: existingUser.id,
        });

        if (sessErr || !sessionData?.session) {
          console.error('Session creation error:', sessErr);
          return res.status(500).json({ success: false, error: 'Failed to create session' });
        }

        session = sessionData.session;
      } else {
        // Use the generated link properties
        const { data: sessionData, error: sessErr } = await admin.auth.admin.createSession({
          user_id: existingUser.id,
        });

        if (sessErr || !sessionData?.session) {
          return res.status(500).json({ success: false, error: 'Failed to create session' });
        }
        session = sessionData.session;
      }
      userId = existingUser.id;
    } else {
      // New user — create account
      const tempEmail = `${cleanPhone}@phone.stiri.in`;
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

      userId = newUserData.user.id;
      existingUser = newUserData.user;

      // Create session
      const { data: sessionData, error: sessErr } = await admin.auth.admin.createSession({
        user_id: userId,
      });

      if (sessErr || !sessionData?.session) {
        return res.status(500).json({ success: false, error: 'Failed to create session' });
      }
      session = sessionData.session;
    }

    // Set cookies
    setSessionCookies(res, session);
    storeSessionForAccount(req, res, session, existingUser.email || `${cleanPhone}@phone.stiri.in`);

    // Ensure profile exists
    await ensureUserProfile(admin, existingUser);
    const profile = await fetchUserProfile(admin, userId);

    return res.status(200).json({
      success: true,
      user: mapUser(existingUser, profile),
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
  // Acknowledge receipt
  console.log('WhatsApp webhook event:', JSON.stringify(req.body).slice(0, 500));
  return res.status(200).send('OK');
}
