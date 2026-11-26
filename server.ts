import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Lightweight per-IP rate limiter for AI chat endpoint
const rateBucket = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxReq = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxReq) return false;
  entry.count += 1;
  return true;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));

  // Basic security headers (compatible with AI Studio iframe preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 1. Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      app: 'ONEORA',
      tagline: 'One App, More Possibilities',
      version: '3.0.0',
      aiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Central Monetization & Feature Configuration (Safe Public View — Zero Secrets)
  const appEnv = process.env.APP_ENV || (isProduction ? 'production' : 'development');
  const monetizationEnabled = process.env.MONETIZATION_ENABLED === 'true';
  const adsEnabled = monetizationEnabled && process.env.ADS_ENABLED === 'true';
  const subscriptionEnabled = monetizationEnabled && process.env.SUBSCRIPTION_ENABLED === 'true';
  const freePlanEnabled = process.env.FREE_PLAN_ENABLED !== 'false';
  const cloudSyncEnabled = process.env.CLOUD_SYNC_ENABLED !== 'false';
  const aiConfigured = Boolean((process.env.GEMINI_API_KEY || '').trim());
  const playBillingConfigured = Boolean(
    subscriptionEnabled &&
      (process.env.GOOGLE_PLAY_PACKAGE_NAME || '').trim() &&
      (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '').trim()
  );
  const webPaymentProvider = (process.env.WEB_PAYMENT_PROVIDER || 'none').trim().toLowerCase();
  const webPaymentsConfigured = Boolean(
    subscriptionEnabled &&
      webPaymentProvider !== 'none' &&
      (process.env.WEB_PAYMENT_WEBHOOK_SECRET || '').trim()
  );

  const pricingCatalog = {
    currency: 'INR',
    symbol: '₹',
    note: 'Launch prices are configurable placeholders. All core offline tools remain free.',
    plans: {
      free: {
        id: 'free',
        name: 'ONEORA Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        aiDailyLimit: 20,
        cloudSync: false,
        adFree: !adsEnabled,
        features: [
          'Basic & core PDF tools (Reader, Merge, Split, Compress, Sign)',
          'Basic Image tools & Passport Photo Maker',
          'Universal Office Reader (Word, Excel, PPT, ZIP)',
          'Calendar, Daily Planner, Notes, Reminders & Habits',
          'Expense Tracker, Monthly Budget & Financial Calculators',
          'Encrypted Local Document Vault & Daily Utilities',
          'Standard AI Assistant (when AI backend is configured)'
        ]
      },
      plus: {
        id: 'plus',
        name: 'ONEORA PLUS',
        monthlyPrice: Number(process.env.ONEORA_PLUS_MONTHLY_INR || 49),
        yearlyPrice: Number(process.env.ONEORA_PLUS_YEARLY_INR || 399),
        androidProductIds: {
          monthly: 'oneora_plus_monthly',
          yearly: 'oneora_plus_yearly'
        },
        aiDailyLimit: 100,
        cloudSync: false,
        adFree: true,
        features: [
          'Everything in ONEORA Free',
          'Ad-free experience across all screens',
          'Advanced PDF processing & batch workflows',
          'Advanced financial reports & exports',
          'Additional AI usage credits & priority speed',
          'Premium themes & extra home widgets'
        ]
      },
      pro: {
        id: 'pro',
        name: 'ONEORA PRO',
        monthlyPrice: Number(process.env.ONEORA_PRO_MONTHLY_INR || 99),
        yearlyPrice: Number(process.env.ONEORA_PRO_YEARLY_INR || 799),
        androidProductIds: {
          monthly: 'oneora_pro_monthly',
          yearly: 'oneora_pro_yearly'
        },
        aiDailyLimit: 500,
        cloudSync: true,
        adFree: true,
        features: [
          'Everything in ONEORA PLUS',
          'Highest AI assistant & Document Intelligence limits',
          'Automated multi-device Cloud Backup & Sync',
          'Advanced Smart Hub cross-module automation',
          'Priority batch OCR & large-file workflows'
        ]
      }
    },
    aiCreditPacks: [
      { id: 'oneora_ai_pack_100', name: '100 AI Credits', credits: 100, priceInr: Number(process.env.ONEORA_AI_PACK_100_INR || 29) },
      { id: 'oneora_ai_pack_500', name: '500 AI Credits', credits: 500, priceInr: Number(process.env.ONEORA_AI_PACK_500_INR || 99) }
    ]
  };

  app.get('/api/config/monetization', (_req: Request, res: Response) => {
    res.json({
      environment: appEnv,
      flags: {
        MONETIZATION_ENABLED: monetizationEnabled,
        ADS_ENABLED: adsEnabled,
        SUBSCRIPTION_ENABLED: subscriptionEnabled,
        FREE_PLAN_ENABLED: freePlanEnabled,
        AI_ENABLED: aiConfigured,
        CLOUD_SYNC_ENABLED: cloudSyncEnabled
      },
      providers: {
        androidPlayBillingConfigured: playBillingConfigured,
        webPaymentProvider,
        webPaymentsConfigured,
        adMobConfigured: Boolean(adsEnabled && (process.env.ADMOB_APP_ID || '').trim())
      },
      adPolicy: {
        allowAdaptiveBanner: adsEnabled,
        allowNative: adsEnabled,
        allowRewarded: adsEnabled,
        allowInterstitial: false,
        criticalBlockedZones: ['pdf_edit', 'file_save', 'digital_sign', 'payment', 'vault', 'onboarding'],
        requireConsent: true,
        neverUsePrivateDocsOrFinanceForAds: true
      },
      catalog: pricingCatalog
    });
  });

  // 2B. Server-Authoritative Entitlement Status (Never trusts frontend-only flags)
  app.get('/api/entitlements/status', (_req: Request, res: Response) => {
    res.json({
      plan: 'free',
      tierRank: 0,
      status: monetizationEnabled ? 'active_free' : 'active_free_launch',
      billingCycle: null,
      provider: 'none',
      monetizationEnabled,
      adsEnabled,
      subscriptionEnabled,
      playBillingConfigured,
      webPaymentsConfigured,
      adsDisabled: !adsEnabled,
      expiresAt: null,
      gracePeriodEndsAt: null,
      aiCreditsBalance: pricingCatalog.plans.free.aiDailyLimit,
      aiDailyLimit: pricingCatalog.plans.free.aiDailyLimit,
      purchaseHistory: [],
      entitlements: {
        coreOfflinePdf: true,
        coreImageTools: true,
        coreOfficeReader: true,
        plannerAndNotes: true,
        expenseTracking: true,
        localVault: true,
        dailyUtilities: true,
        smartHub: true,
        advancedPdfBatch: !monetizationEnabled,
        advancedFinanceReports: !monetizationEnabled,
        premiumThemes: !monetizationEnabled,
        cloudBackupSync: cloudSyncEnabled,
        advancedDocumentAi: aiConfigured
      },
      note: 'ONEORA is currently in Free-First Launch mode. Live ads and paid billing remain disabled until real credentials and configuration are activated.'
    });
  });

  // 2C. Android Google Play Billing Receipt Verification Endpoint (Server-Side Only)
  app.post('/api/billing/verify-android', (req: Request, res: Response) => {
    const body = req.body as { productId?: unknown; purchaseToken?: unknown; packageName?: unknown };
    const productId = typeof body?.productId === 'string' ? body.productId.trim().slice(0, 80) : '';
    const purchaseToken = typeof body?.purchaseToken === 'string' ? body.purchaseToken.trim().slice(0, 1024) : '';

    if (!productId || !purchaseToken) {
      res.status(400).json({
        verified: false,
        code: 'INVALID_RECEIPT_PAYLOAD',
        error: 'Both productId and purchaseToken are required for server verification.'
      });
      return;
    }

    if (!subscriptionEnabled || !playBillingConfigured) {
      res.status(503).json({
        verified: false,
        code: 'BILLING_NOT_ACTIVATED',
        error: 'Google Play Billing is prepared in Free-First Launch mode and is not active yet. No payment has been charged.'
      });
      return;
    }

    // Production hook: Verify purchaseToken via Google Play Developer API (androidpublisher.purchases.subscriptionsv2.get)
    res.status(501).json({
      verified: false,
      code: 'PLAY_API_VERIFIER_PENDING',
      error: 'Connect Google Play Developer API credentials in server environment to complete live receipt verification.'
    });
  });

  // 2D. Restore Purchases Verification Endpoint
  app.post('/api/billing/restore', (req: Request, res: Response) => {
    const body = req.body as { platform?: unknown; tokens?: unknown };
    const platform = typeof body?.platform === 'string' ? body.platform.trim().slice(0, 24) : 'web';

    if (!subscriptionEnabled) {
      res.json({
        restored: false,
        plan: 'free',
        status: 'active_free_launch',
        platform,
        message: 'Live subscriptions are not activated yet — all core ONEORA tools are already unlocked for free.'
      });
      return;
    }

    res.status(503).json({
      restored: false,
      plan: 'free',
      code: 'BILLING_PROVIDER_NOT_CONFIGURED',
      message: 'Subscription restoration requires active Google Play Billing or Web Payment provider credentials.'
    });
  });

  // 2E. Web Checkout Initiation Endpoint (Honest Gate — No Fake Payments)
  app.post('/api/billing/web-checkout', (req: Request, res: Response) => {
    const body = req.body as { planId?: unknown; billingCycle?: unknown };
    const planId = typeof body?.planId === 'string' ? body.planId.trim() : '';
    const billingCycle = typeof body?.billingCycle === 'string' ? body.billingCycle.trim() : '';

    if (!['plus', 'pro', 'ai_pack_100', 'ai_pack_500'].includes(planId)) {
      res.status(400).json({ ok: false, error: 'Invalid plan selected.' });
      return;
    }
    if (['plus', 'pro'].includes(planId) && !['monthly', 'yearly'].includes(billingCycle)) {
      res.status(400).json({ ok: false, error: 'Billing cycle must be monthly or yearly.' });
      return;
    }

    if (!subscriptionEnabled || !webPaymentsConfigured) {
      res.status(503).json({
        ok: false,
        code: 'FREE_LAUNCH_MODE',
        error: 'ONEORA is currently free at launch. Web payments will be enabled only after payment provider credentials and webhooks are configured.'
      });
      return;
    }

    res.status(501).json({
      ok: false,
      code: 'WEB_PROVIDER_PENDING',
      error: 'Configure your chosen web payment provider adapter on the server to initiate live checkout.'
    });
  });

  // 3. Server-Side ONEORA AI Assistant Proxy (/api/ai/chat)
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Too many AI requests right now. Please wait a minute and try again.',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'ONEORA AI is not configured on this server yet (GEMINI_API_KEY missing). Offline PDF, Planner, Finance, and Utility tools continue working normally.',
      });
      return;
    }

    try {
      const body = req.body as {
        message?: unknown;
        language?: unknown;
        template?: unknown;
        docContext?: unknown;
        docName?: unknown;
        imageBase64?: unknown;
        imageMimeType?: unknown;
        history?: unknown;
      };

      const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 6000) : '';
      if (!message) {
        res.status(400).json({ error: 'Please enter a message or question for ONEORA AI.' });
        return;
      }

      const langRaw = typeof body?.language === 'string' ? body.language.toLowerCase() : 'en';
      const langInstruction =
        langRaw === 'bn'
          ? 'Respond clearly in natural Bengali (বাংলা) unless the user asks for another language.'
          : langRaw === 'hi'
            ? 'Respond clearly in natural Hindi (हिन्दी) unless the user asks for another language.'
            : 'Respond clearly in concise, helpful English (or match the user language if they write in Bengali or Hindi).';

      const docName = typeof body?.docName === 'string' ? body.docName.trim().slice(0, 120) : '';
      const docContext = typeof body?.docContext === 'string' ? body.docContext.trim().slice(0, 24000) : '';
      const template = typeof body?.template === 'string' ? body.template.trim().slice(0, 60) : '';

      const systemInstruction = [
        'You are ONEORA AI, the helpful multilingual assistant inside the ONEORA all-in-one productivity, PDF, document, planner, and personal finance app.',
        langInstruction,
        'Be accurate, structured, and practical. Use clean plain text with short sections or bullet points when helpful.',
        'Never invent private user data or live external facts you do not have. For financial/medical/legal topics, provide practical informational guidance.',
      ].join(' ');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Attach recent conversation turns (bounded to last 8 messages)
      if (Array.isArray(body?.history) && body.history.length > 0) {
        const recentTurns = body.history
          .slice(-8)
          .filter(
            (item): item is { role: string; text: string } =>
              Boolean(item) &&
              typeof (item as { role?: unknown }).role === 'string' &&
              typeof (item as { text?: unknown }).text === 'string'
          )
          .map((t) => `${t.role === 'assistant' ? 'ONEORA AI' : 'User'}: ${t.text.slice(0, 1200)}`)
          .join('\n');
        if (recentTurns) {
          parts.push({ text: `Recent conversation context:\n${recentTurns}` });
        }
      }

      if (docContext) {
        parts.push({
          text: `Attached document context (${docName || 'Document'}):\n"""\n${docContext}\n"""`,
        });
      }

      if (template) {
        parts.push({ text: `Requested writing/analysis mode: ${template}` });
      }

      // Optional image attachment for multimodal analysis / text extraction
      const allowedImageMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      if (
        typeof body?.imageBase64 === 'string' &&
        typeof body?.imageMimeType === 'string' &&
        allowedImageMimes.has(body.imageMimeType) &&
        body.imageBase64.length <= 7_000_000
      ) {
        const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: body.imageMimeType,
            data: cleanBase64,
          },
        });
      }

      parts.push({ text: `User request:\n${message}` });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
        },
      });

      const reply = (response.text || '').trim();
      if (!reply) {
        res.status(502).json({ error: 'ONEORA AI returned an empty response. Please try rephrasing.' });
        return;
      }

      res.json({
        reply,
        model: 'gemini-4-hydrogen',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach ONEORA AI service right now.';
      console.error('[ONEORA AI Error]:', msg);
      res.status(500).json({
        error: `AI request failed: ${msg.slice(0, 240)}`,
      });
    }
  });

  // 4. Independent ONEORA Public Website Routes (/website, /about, /pricing, /privacy, /terms)
  const websiteRoutes = ['/website', '/about', '/pricing', '/privacy', '/terms'];
  for (const route of websiteRoutes) {
    app.get(route, (_req: Request, res: Response) => {
      const target = isProduction
        ? path.resolve(__dirname, 'dist', 'landing.html')
        : path.resolve(__dirname, 'public', 'landing.html');
      if (fs.existsSync(target)) {
        res.sendFile(target);
      } else {
        res.redirect('/landing.html');
      }
    });
  }

  // 5. Dev Vite Middleware vs Production Static Dist Serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { extensions: ['html'] }));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ONEORA server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start ONEORA server:', err);
  process.exit(1);
});
