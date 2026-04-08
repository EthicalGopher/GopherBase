import { GopherBaseClient } from 'gopherbase';

const getApiRoot = () => {
  const envApiUrl = (import.meta as any).env.VITE_API_URL;
  if (envApiUrl) return envApiUrl.replace(/\/rest\/v1\/?$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // If we're on Vite dev (5173) or preview (4173), 
    // point to the backend on port 8080 of the SAME host.
    if (port === '5173' || port === '4173') {
      return `${protocol}//${hostname}:8080`;
    }
  }
  // In production (embedded), or if we can't detect, use relative paths.
  return '';
};

export const API_ROOT = getApiRoot();

// Export a singleton instance of the client
// We use "admin" as the default key for the dashboard interface
export const gb = new GopherBaseClient(API_ROOT, "admin");
