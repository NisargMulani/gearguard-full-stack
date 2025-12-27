// API Base URL - points to backend server
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// Helper to parse response
async function parseRes(res) {
  let data = null;
  try { 
    data = await res.json(); 
  } catch { 
    data = null; 
  }
  if (!res.ok) {
    const msg = (data && data.message) ? data.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Get auth token from localStorage
function getAuthToken() {
  const userStr = localStorage.getItem("gg_user");
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    // Get session token (stored after login)
    const sessionStr = localStorage.getItem("gg_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return session?.access_token || null;
    }
  } catch {
    return null;
  }
  return null;
}

// Helper to make authenticated requests
async function makeRequest(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(API_BASE + url, {
    ...options,
    headers
  });
  
  return parseRes(res);
}

// =========================================================
// API FUNCTIONS
// =========================================================

export async function apiGet(path) {
  return makeRequest(path, { method: 'GET' });
}

export async function apiPost(path, body) {
  return makeRequest(path, {
    method: 'POST',
    body: JSON.stringify(body || {})
  });
}

export async function apiPut(path, body) {
  return makeRequest(path, {
    method: 'PUT',
    body: JSON.stringify(body || {})
  });
}

export async function apiDelete(path) {
  return makeRequest(path, { method: 'DELETE' });
}

