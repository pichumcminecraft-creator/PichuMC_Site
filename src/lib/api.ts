const TOKEN_KEY = "pichumc_admin_token";
const USER_KEY = "pichumc_admin_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser() {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

export function setAuth(token: string, user: { id: string; username: string; role: string; permissions?: Record<string, boolean> }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function adminFetch(action: string, body?: unknown) {
  const token = getToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/admin?action=${action}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Er ging iets mis");
  return data;
}

// Use supabase client for public data
import { supabase } from "@/integrations/supabase/client";

export async function getPublicPositions() {
  const { data, error } = await supabase.from("positions").select("*").eq("is_open", true).order("sort_order");
  if (error) throw error;
  return data;
}

export async function submitApplication(application: {
  position_id: string;
  minecraft_username: string;
  age?: number;
  discord_username?: string;
  answers?: Record<string, string>;
  question_labels?: Record<string, string>;
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/admin?action=submit-application`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
    body: JSON.stringify(application),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Er ging iets mis");
  return data;
}
