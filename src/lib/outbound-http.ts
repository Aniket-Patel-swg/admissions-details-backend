import type { AxiosRequestConfig } from 'axios';
import randomIpv4 from 'random-ipv4';

function parseProxyFromEnv(): AxiosRequestConfig['proxy'] | undefined {
  const raw =
    process.env.OUTBOUND_HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
    const auth =
      u.username || u.password
        ? {
            username: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
          }
        : undefined;
    return {
      protocol: (u.protocol.replace(':', '') || 'http') as 'http' | 'https',
      host: u.hostname,
      port,
      ...(auth && Object.keys(auth).length ? { auth } : {}),
    };
  } catch {
    return undefined;
  }
}

/**
 * Optional outbound behaviour (env-driven):
 * - OUTBOUND_HTTP_PROXY, HTTPS_PROXY, or HTTP_PROXY: route the request through an HTTP(S) proxy (real different egress IP if the proxy provides it).
 * - OUTBOUND_RANDOM_X_FORWARDED_FOR=true: set X-Forwarded-For to a random IPv4 on each request (many origins ignore this; it does not spoof TCP source IP).
 */
export function withOutboundOptions(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  const headers: Record<string, string> = {
    ...(config.headers as Record<string, string> | undefined),
  };
  if (process.env.OUTBOUND_RANDOM_X_FORWARDED_FOR === 'true') {
    headers['X-Forwarded-For'] = randomIpv4();
  }
  const proxy = parseProxyFromEnv();
  return {
    ...config,
    headers,
    ...(proxy ? { proxy } : {}),
  };
}
