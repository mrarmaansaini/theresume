const transientStatuses = new Set([408, 429, 500, 502, 503, 504]);

export function isTransientAiError(error) {
  const status = Number(error?.status ?? error?.statusCode);
  const message = String(error?.message || error || '');
  return transientStatuses.has(status)
    || /\[(?:408|429|500|502|503|504)\]/.test(message)
    || /currently experiencing high demand|temporarily unavailable|overloaded/i.test(message);
}

export async function retryTransientAiRequest(request, wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (attempt === 2 || !isTransientAiError(error)) throw error;
      await wait(1000 * (2 ** attempt));
    }
  }
}