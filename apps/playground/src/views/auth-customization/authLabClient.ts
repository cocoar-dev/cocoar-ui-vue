export interface AuthLabResponse {
  ok: boolean;
  outcome: string;
  message: string;
}

interface ProblemDetails {
  detail?: string;
  title?: string;
}

export async function postAuthLab(
  endpoint: 'login' | 'forgot-password',
  values: Record<string, unknown>,
): Promise<AuthLabResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1_800);
  try {
    const response = await fetch(`/api/auth-lab/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as AuthLabResponse & ProblemDetails;
    if (!response.ok) {
      throw new Error(payload.detail || payload.title || `Request failed (${response.status}).`);
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'The request timed out. The page stays open and all entered values are preserved.',
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        'The connection was interrupted. The page stays open so the request can be retried.',
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
