export type Route = { name: 'landing'; accessToken: string } | { name: 'app-flow' };

export function parseRoute(): Route {
  const match = window.location.pathname.match(/^\/a\/([^/]+)/);
  if (match) return { name: 'landing', accessToken: match[1] };
  return { name: 'app-flow' };
}
