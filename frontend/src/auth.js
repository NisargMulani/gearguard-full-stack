// Auth helpers - now using backend API
const KEY = "gg_user";

export async function saveUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export async function getUser() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { 
    return JSON.parse(raw);
  } catch { 
    return null;
  }
}

export async function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("gg_session");
}

