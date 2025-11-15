import * as crypto from 'crypto';

export interface VerifyResult {
  ok: boolean;
  reason?: 'bad-signature' | 'expired';
}

/**
 * Валидация Telegram initData
 * @param initData - строка initData от Telegram WebApp
 * @param botToken - токен Telegram бота
 * @param maxAgeSec - максимальный возраст данных в секундах (по умолчанию 300 = 5 минут)
 * @returns Результат валидации
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 300,
): VerifyResult {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');

  if (!hash) {
    return { ok: false, reason: 'bad-signature' };
  }

  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== hash) {
    return { ok: false, reason: 'bad-signature' };
  }

  const authDate = Number(urlParams.get('auth_date') || 0);
  const now = Math.floor(Date.now() / 1000);

  if (now - authDate > maxAgeSec) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true };
}





