export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const API_BASE = "/api";
export const WS_URL = `ws://${window.location.hostname}:8000/ws/updates`;
