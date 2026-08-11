const DERIV_OAUTH_BASE = 'https://oauth.binary.com/oauth2/authorize';

export const DERIV_APP_ID = '1089';

export function getOauthUrl(): string {
  const redirectUri = `${window.location.origin}/login`;
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'EN',
  });
  return `${DERIV_OAUTH_BASE}?${params.toString()}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function redirectToDerivLogin(): void {
  window.location.href = getOauthUrl();
}

export function extractOauthToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token1') || params.get('token');
  return token;
}

export function cleanOauthParamsFromUrl(): void {
  if (window.location.search || window.location.hash) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}
