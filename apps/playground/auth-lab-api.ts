import type { Connect, Plugin } from 'vite';

type JsonRecord = Record<string, unknown>;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readJson(req: Connect.IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > 64 * 1024) throw new Error('Request body too large');
    chunks.push(bytes);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as JsonRecord;
}

function json(res: Connect.ServerResponse, status: number, body: JsonRecord): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function problem(res: Connect.ServerResponse, status: number, detail: string): void {
  json(res, status, {
    type: 'about:blank',
    title: status >= 500 ? 'Demo server error' : 'Authentication failed',
    status,
    detail,
  });
}

async function handleAuthLabApi(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  const url = new URL(req.url || '/', 'http://auth-lab.local');
  if (!url.pathname.startsWith('/api/auth-lab/')) {
    next();
    return;
  }

  if (req.method !== 'POST') {
    problem(res, 405, 'POST required.');
    return;
  }

  let body: JsonRecord;
  try {
    body = await readJson(req);
  } catch {
    problem(res, 400, 'Invalid JSON body.');
    return;
  }

  const identifier = String(body.username ?? body.scenario ?? '')
    .trim()
    .toLowerCase();

  // Deterministic failure vocabulary for the hand-off demo. It makes every
  // async edge case reproducible without a database or a real identity store.
  if (identifier === 'slow') {
    await wait(6_000);
    if (req.destroyed || res.destroyed) return;
  }
  if (identifier === 'disconnect') {
    req.socket.destroy();
    return;
  }
  if (identifier === 'server-error') {
    problem(res, 500, 'The demo identity service is temporarily unavailable.');
    return;
  }

  if (url.pathname === '/api/auth-lab/login') {
    if (identifier === 'invalid') {
      problem(res, 401, 'Invalid username or password.');
      return;
    }
    if (identifier === 'locked') {
      problem(res, 423, 'This account is locked. Try again later.');
      return;
    }
    await wait(350);
    json(res, 200, {
      ok: true,
      outcome: identifier === 'mfa' ? 'mfa-required' : 'authenticated',
      message:
        identifier === 'mfa'
          ? 'Credentials accepted; the real application would continue with MFA.'
          : 'Credentials accepted; navigation is intentionally suppressed in the lab.',
    });
    return;
  }

  if (url.pathname === '/api/auth-lab/forgot-password') {
    if (identifier === 'invalid') {
      problem(res, 422, 'Enter a username or email address in the expected format.');
      return;
    }
    await wait(350);
    json(res, 202, {
      ok: true,
      outcome: 'accepted',
      message: 'If the account exists, a reset link has been queued.',
    });
    return;
  }

  if (url.pathname === '/api/auth-lab/consent') {
    if (identifier === 'expired') {
      problem(res, 409, 'This consent request has expired. Restart the authorization flow.');
      return;
    }
    const decision = body.decision === 'deny' ? 'deny' : 'allow';
    const approvedScopes = Array.isArray(body.approvedScopes)
      ? body.approvedScopes.filter((scope): scope is string => typeof scope === 'string')
      : [];
    await wait(350);
    json(res, 200, {
      ok: true,
      outcome: decision === 'allow' ? 'approved' : 'denied',
      approvedScopes,
      message:
        decision === 'allow'
          ? `Consent accepted with ${approvedScopes.length} approved scope(s); redirect suppressed in the lab.`
          : 'Consent denied; the OAuth client redirect is intentionally suppressed in the lab.',
    });
    return;
  }

  problem(res, 404, 'Unknown auth-lab endpoint.');
}

function install(middlewares: Connect.Server): void {
  middlewares.use((req, res, next) => {
    void handleAuthLabApi(req, res, next).catch((error: unknown) => {
      if (res.headersSent || res.destroyed) return;
      problem(res, 500, error instanceof Error ? error.message : 'Unexpected demo server error.');
    });
  });
}

/** A tiny Node-only API mounted into both Vite dev and preview servers. */
export function authLabApi(): Plugin {
  return {
    name: 'auth-customization-lab-api',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}
