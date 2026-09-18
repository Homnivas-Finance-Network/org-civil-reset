export type Route = { name: 'landing'; accessToken: string } | { name: 'admin' } | { name: 'app-flow' };

export function parseRoute(): Route {
  const path = window.location.pathname;
  const match = path.match(/^\/a\/([^/]+)/);
  if (match) return { name: 'landing', accessToken: match[1] };
  if (path.startsWith('/admin')) return { name: 'admin' };
  return { name: 'app-flow' };
}
