import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ABSENCE_STATUS_META: Record<string, { label: string; color: number; emoji: string }> = {
  in_afwachting: { label: "In Afwachting", color: 0xF59E0B, emoji: "⏳" },
  goedgekeurd:   { label: "Goedgekeurd",   color: 0x22C55E, emoji: "✅" },
  afgekeurd:     { label: "Afgekeurd",     color: 0xEF4444, emoji: "❌" },
  teruggekomen:  { label: "Teruggekomen",  color: 0x3B82F6, emoji: "🔙" },
};

function buildAbsenceEmbed(username: string, start: string, end: string, reason: string | null, status: string) {
  const meta = ABSENCE_STATUS_META[status] || ABSENCE_STATUS_META.in_afwachting;
  return {
    title: `${meta.emoji} Afmelding — ${meta.label}`,
    description: `**${username}** heeft zich afgemeld.`,
    color: meta.color,
    fields: [
      { name: "Periode", value: `${start} t/m ${end}`, inline: true },
      { name: "Status", value: meta.label, inline: true },
      { name: "Reden", value: reason || "Geen reden opgegeven", inline: false },
    ],
    footer: { text: "PichuMC Staff Panel" },
    timestamp: new Date().toISOString(),
  };
}

const TASK_STATUS_META: Record<string, { label: string; color: number; emoji: string }> = {
  todo:      { label: "Te Doen",   color: 0xF59E0B, emoji: "📝" },
  bezig:     { label: "Bezig",     color: 0x3B82F6, emoji: "⚙️" },
  voltooid:  { label: "Voltooid",  color: 0x22C55E, emoji: "✅" },
};

function buildTaskEmbed(title: string, description: string | null, status: string, assignedTo: string | null, creator: string | null, defaultColorHex: string) {
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.todo;
  const fields: any[] = [
    { name: "Status", value: meta.label, inline: true },
  ];
  if (assignedTo) fields.push({ name: "Toegewezen aan", value: assignedTo, inline: true });
  if (creator) fields.push({ name: "Aangemaakt door", value: creator, inline: true });
  if (description) fields.push({ name: "Beschrijving", value: description.slice(0, 1024), inline: false });
  return {
    title: `${meta.emoji} Taak: ${title}`,
    color: status === "todo" ? parseInt((defaultColorHex || "#FFD700").replace("#", ""), 16) : meta.color,
    fields,
    footer: { text: "PichuMC Taken" },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const logActivity = async (userId: string, username: string, action: string, details?: string) => {
    await supabase.from("activity_log").insert({ user_id: userId, username, action, details });
  };

  try {
    // === PUBLIC: SUBMIT APPLICATION (no auth) ===
    if (action === "submit-application" && req.method === "POST") {
      const body = await req.json();
      const { position_id, minecraft_username, age, discord_username, answers, question_labels } = body;
      if (!position_id || !minecraft_username) return jsonResponse({ error: "Vul alle verplichte velden in" }, 400);

      // Save application — map known answer keys to columns, store rest in motivation as JSON
      const insertData: any = {
        position_id,
        minecraft_username,
        age: age || null,
        discord_username: discord_username || null,
        motivation: answers?.motivation || null,
        experience: answers?.experience || null,
        availability: answers?.availability || null,
      };
      // Store extra custom answers in motivation as JSON if there are extras
      const standardKeys = ["motivation", "experience", "availability"];
      const extras: Record<string, string> = {};
      Object.keys(answers || {}).forEach((k) => {
        if (!standardKeys.includes(k)) extras[k] = answers[k];
      });
      if (Object.keys(extras).length > 0) {
        insertData.motivation = JSON.stringify({ motivation: insertData.motivation, ...extras });
      }

      const { data: app, error } = await supabase.from("applications").insert(insertData).select("*, positions(name, color, icon)").single();
      if (error) return jsonResponse({ error: error.message }, 400);

      // Discord notification
      try {
        const { data: globalSettings } = await supabase.from("discord_settings").select("bot_token").limit(1).single();
        const { data: channel } = await supabase.from("discord_channels").select("*").eq("position_id", position_id).single();
        const { data: positionData } = await supabase.from("positions").select("questions").eq("id", position_id).single();
        const botToken = globalSettings?.bot_token;
        if (botToken && channel?.enabled && channel?.channel_id) {
          const colorInt = parseInt((channel.embed_color || "#FFD700").replace("#", ""), 16);
          const fields: any[] = [
            { name: "Minecraft", value: minecraft_username, inline: true },
          ];
          if (age) fields.push({ name: "Leeftijd", value: String(age), inline: true });
          if (discord_username) fields.push({ name: "Discord", value: discord_username, inline: true });

          // Build a map of question key -> label from the position's configured questions
          const questionLabels: Record<string, string> = {
            motivation: "Motivatie",
            experience: "Ervaring",
            availability: "Beschikbaarheid",
          };
          Object.entries(question_labels || {}).forEach(([key, label]) => {
            if (typeof label === "string" && label.trim()) questionLabels[key] = label;
          });
          const posQuestions = Array.isArray(positionData?.questions) ? positionData.questions : [];
          posQuestions.forEach((q: any) => {
            if (q?.key && q?.label) questionLabels[q.key] = q.label;
          });

          Object.entries(answers || {}).forEach(([k, v]) => {
            if (v) {
              const label = questionLabels[k] || k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");
              fields.push({ name: label, value: String(v).slice(0, 1024), inline: false });
            }
          });

          const pingContent = (channel.ping_roles || []).map((r: string) => `<@&${r}>`).join(" ");

          const dRes = await fetch(`https://discord.com/api/v10/channels/${channel.channel_id}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              content: pingContent || undefined,
              embeds: [{
                title: `📋 Nieuwe Sollicitatie: ${app?.positions?.name || ""}`,
                color: colorInt,
                fields,
                footer: { text: "PichuMC Sollicitaties" },
                timestamp: new Date().toISOString(),
              }],
              allowed_mentions: { parse: ["roles"] },
            }),
          });
          if (!dRes.ok) {
            console.error("Discord application notify failed:", await dRes.text());
          }
        }
      } catch (e) {
        console.error("Discord notify error:", e);
      }

      return jsonResponse({ success: true });
    }

    // LOGIN
    if (action === "login" && req.method === "POST") {
      const { username, password } = await req.json();
      if (!username || !password) return jsonResponse({ error: "Vul alle velden in" }, 400);

      const { data: user } = await supabase
        .from("admin_users")
        .select("*, roles(id, name, color, permissions)")
        .eq("username", username)
        .single();

      if (!user) return jsonResponse({ error: "Ongeldige inloggegevens" }, 401);

      const { data: match } = await supabase.rpc("check_password", {
        _password: password,
        _hash: user.password_hash,
      });

      if (!match) return jsonResponse({ error: "Ongeldige inloggegevens" }, 401);

      await supabase.from("admin_users").update({ last_online: new Date().toISOString() }).eq("id", user.id);

      const roleName = user.roles?.name || user.role;
      const isOwner = roleName === "eigenaar";
      const allPerms = { see_passwords: true, users_manage: true, roles_manage: true, tasks_manage: true, absences_manage: true, announcements_manage: true, positions_manage: true, positions_view: true, applications_manage: true, applications_view: true, discord_manage: true, discord_view: true, content_manage: true, content_view: true, activity_view: true, stats_view: true, users_view: true, roles_view: true, owner_panel: true };
      const permissions = isOwner ? allPerms : (user.roles?.permissions || {});
      
      const token = btoa(JSON.stringify({ userId: user.id, username: user.username, role: roleName, roleId: user.role_id, permissions, exp: Date.now() + 24 * 60 * 60 * 1000 }));
      
      await logActivity(user.id, user.username, "login", "Ingelogd");
      
      return jsonResponse({ token, user: { id: user.id, username: user.username, role: roleName, role_id: user.role_id, permissions } });
    }

    // AUTH CHECK
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Niet ingelogd" }, 401);

    const token = authHeader.replace("Bearer ", "");
    let session: { userId: string; username?: string; role: string; roleId?: string; permissions?: Record<string, boolean>; exp: number };
    try {
      session = JSON.parse(atob(token));
      if (session.exp < Date.now()) return jsonResponse({ error: "Sessie verlopen" }, 401);
    } catch {
      return jsonResponse({ error: "Ongeldige sessie" }, 401);
    }

    const isOwner = session.role === "eigenaar";
    const hasPerm = (perm: string) => isOwner || session.permissions?.[perm] === true;
    const sessionUsername = session.username || "Onbekend";

    // === POSITIONS ===
    if (action === "positions") {
      const { data } = await supabase.from("positions").select("*").order("sort_order");
      return jsonResponse(data);
    }

    if (action === "update-position" && req.method === "POST") {
      if (!hasPerm("positions_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const { id, ...updates } = body;
      const { data } = await supabase.from("positions").update(updates).eq("id", id).select().single();
      await logActivity(session.userId, sessionUsername, "update-position", `Positie bijgewerkt: ${data?.name || id}`);
      return jsonResponse(data);
    }

    if (action === "add-position" && req.method === "POST") {
      if (!hasPerm("positions_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const { data, error } = await supabase.from("positions").insert(body).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-position", `Positie "${data?.name}" aangemaakt`);
      return jsonResponse(data);
    }

    if (action === "delete-position" && req.method === "POST") {
      if (!hasPerm("positions_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      const { data: pos } = await supabase.from("positions").select("name").eq("id", id).single();
      await supabase.from("positions").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-position", `Positie "${pos?.name}" verwijderd`);
      return jsonResponse({ success: true });
    }

    if (action === "reorder-positions" && req.method === "POST") {
      if (!hasPerm("positions_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { order } = await req.json();
      if (!Array.isArray(order)) return jsonResponse({ error: "Ongeldige volgorde" }, 400);
      for (const item of order) {
        await supabase.from("positions").update({ sort_order: item.sort_order }).eq("id", item.id);
      }
      await logActivity(session.userId, sessionUsername, "reorder-positions", "Posities herordend");
      return jsonResponse({ success: true });
    }

    // === APPLICATIONS ===
    if (action === "applications") {
      if (!hasPerm("applications_view") && !hasPerm("applications_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { data } = await supabase.from("applications").select("*, positions(name, color, icon)").order("created_at", { ascending: false });
      return jsonResponse(data);
    }

    if (action === "update-application" && req.method === "POST") {
      if (!hasPerm("applications_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, status } = await req.json();
      const { data } = await supabase.from("applications").update({ status }).eq("id", id).select("*, positions(name)").single();
      await logActivity(session.userId, sessionUsername, "update-application", `Sollicitatie van ${data?.minecraft_username} ${status === "geaccepteerd" ? "geaccepteerd" : status === "afgewezen" ? "afgewezen" : "bijgewerkt"}`);
      return jsonResponse(data);
    }

    if (action === "delete-application" && req.method === "POST") {
      if (!hasPerm("applications_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      const { data: app } = await supabase.from("applications").select("minecraft_username").eq("id", id).single();
      await supabase.from("applications").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-application", `Sollicitatie van ${app?.minecraft_username} verwijderd`);
      return jsonResponse({ success: true });
    }

    // === DISCORD SETTINGS ===
    if (action === "discord-settings") {
      if (!hasPerm("discord_view") && !hasPerm("discord_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { data: settings } = await supabase.from("discord_settings").select("*").limit(1).single();
      const { data: channels } = await supabase.from("discord_channels").select("*, positions(name, icon, color)").order("created_at");
      return jsonResponse({ settings, channels });
    }

    if (action === "update-discord-settings" && req.method === "POST") {
      if (!hasPerm("discord_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const { data: existing } = await supabase.from("discord_settings").select("id").limit(1).single();
      if (existing) {
        await supabase.from("discord_settings").update({ bot_token: body.bot_token, guild_id: body.guild_id }).eq("id", existing.id);
      } else {
        await supabase.from("discord_settings").insert({ bot_token: body.bot_token, guild_id: body.guild_id });
      }
      await logActivity(session.userId, sessionUsername, "update-discord", "Discord instellingen bijgewerkt");
      return jsonResponse({ success: true });
    }

    if (action === "update-discord-channel" && req.method === "POST") {
      if (!hasPerm("discord_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const allowed = {
        position_id: body.position_id,
        enabled: body.enabled,
        channel_id: body.channel_id,
        ping_roles: Array.isArray(body.ping_roles) ? body.ping_roles : [],
        embed_color: body.embed_color || "#FFD700",
      };
      const { data: existing } = await supabase.from("discord_channels").select("id").eq("position_id", body.position_id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("discord_channels").update(allowed).eq("id", existing.id);
        if (error) return jsonResponse({ error: error.message }, 400);
      } else {
        const { error } = await supabase.from("discord_channels").insert(allowed);
        if (error) return jsonResponse({ error: error.message }, 400);
      }
      return jsonResponse({ success: true });
    }

    // === SEND DISCORD MESSAGE (for testing) ===
    if (action === "test-discord" && req.method === "POST") {
      if (!hasPerm("discord_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { channel_id, embed_color, bot_token: customToken } = await req.json();
      
      // Get bot token
      let botToken = customToken;
      if (!botToken) {
        const { data: settings } = await supabase.from("discord_settings").select("bot_token").limit(1).single();
        botToken = settings?.bot_token;
      }
      if (!botToken) return jsonResponse({ error: "Geen bot token geconfigureerd" }, 400);
      if (!channel_id) return jsonResponse({ error: "Geen kanaal ID opgegeven" }, 400);

      const colorInt = parseInt((embed_color || "#FFD700").replace("#", ""), 16);
      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🔔 Test Bericht",
            description: "Dit is een test bericht van het PichuMC Staff Panel.",
            color: colorInt,
            footer: { text: "PichuMC Staff Panel" },
            timestamp: new Date().toISOString(),
          }]
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        return jsonResponse({ error: `Discord fout: ${err.message || JSON.stringify(err)}` }, 400);
      }
      return jsonResponse({ success: true });
    }

    // === TASKS ===
    if (action === "tasks") {
      const { data } = await supabase.from("tasks").select("*, assigned_user:admin_users!tasks_assigned_user_id_fkey(username), assigned_role:roles!tasks_assigned_role_id_fkey(name, color), creator:admin_users!tasks_created_by_fkey(username)").order("created_at", { ascending: false });
      return jsonResponse(data);
    }

    if (action === "task-settings") {
      const { data } = await supabase.from("task_settings").select("*").limit(1).maybeSingle();
      return jsonResponse(data || { enabled: false, bot_token: "", channel_id: "", ping_role_id: "", embed_color: "#FFD700" });
    }

    if (action === "update-task-settings" && req.method === "POST") {
      if (!hasPerm("tasks_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const allowed = {
        enabled: !!body.enabled,
        bot_token: body.bot_token || null,
        channel_id: body.channel_id || null,
        ping_role_id: body.ping_role_id || null,
        embed_color: body.embed_color || "#FFD700",
      };
      const { data: existing } = await supabase.from("task_settings").select("id").limit(1).maybeSingle();
      if (existing) {
        await supabase.from("task_settings").update(allowed).eq("id", existing.id);
      } else {
        await supabase.from("task_settings").insert(allowed);
      }
      await logActivity(session.userId, sessionUsername, "update-task-settings", "Taken Discord instellingen bijgewerkt");
      return jsonResponse({ success: true });
    }

    if (action === "add-task" && req.method === "POST") {
      if (!hasPerm("tasks_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { title, description, assigned_user_id, assigned_role_id } = await req.json();
      if (!title) return jsonResponse({ error: "Titel is vereist" }, 400);
      const { data, error } = await supabase.from("tasks").insert({ title, description, assigned_user_id, assigned_role_id, created_by: session.userId }).select("*, assigned_user:admin_users!tasks_assigned_user_id_fkey(username), assigned_role:roles!tasks_assigned_role_id_fkey(name, color), creator:admin_users!tasks_created_by_fkey(username)").single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-task", `Taak "${title}" aangemaakt`);

      // Discord notification
      try {
        const { data: ts } = await supabase.from("task_settings").select("*").limit(1).maybeSingle();
        if (ts?.enabled && ts?.bot_token && ts?.channel_id) {
          const assignedTo = data?.assigned_user?.username || data?.assigned_role?.name || null;
          const embed = buildTaskEmbed(title, description, "todo", assignedTo, data?.creator?.username || sessionUsername, ts.embed_color);
          const ping = ts.ping_role_id ? `<@&${ts.ping_role_id}>` : undefined;
          const dRes = await fetch(`https://discord.com/api/v10/channels/${ts.channel_id}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bot ${ts.bot_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content: ping, embeds: [embed], allowed_mentions: { parse: ["roles"] } }),
          });
          if (dRes.ok) {
            const msg = await dRes.json();
            if (msg?.id) await supabase.from("tasks").update({ discord_message_id: msg.id }).eq("id", data.id);
          } else {
            console.error("Task discord notify failed:", await dRes.text());
          }
        }
      } catch (e) { console.error("Task discord error:", e); }

      return jsonResponse(data);
    }

    if (action === "update-task" && req.method === "POST") {
      const { id, ...updates } = await req.json();
      const { data } = await supabase.from("tasks").update(updates).eq("id", id).select("*, assigned_user:admin_users!tasks_assigned_user_id_fkey(username), assigned_role:roles!tasks_assigned_role_id_fkey(name, color), creator:admin_users!tasks_created_by_fkey(username), discord_message_id").single();
      await logActivity(session.userId, sessionUsername, "update-task", `Taak "${data?.title}" bijgewerkt`);

      // Update Discord embed
      try {
        const { data: ts } = await supabase.from("task_settings").select("*").limit(1).maybeSingle();
        if (ts?.enabled && ts?.bot_token && ts?.channel_id && data?.discord_message_id) {
          const assignedTo = data?.assigned_user?.username || data?.assigned_role?.name || null;
          const embed = buildTaskEmbed(data.title, data.description, data.status, assignedTo, data?.creator?.username || null, ts.embed_color);
          const eRes = await fetch(`https://discord.com/api/v10/channels/${ts.channel_id}/messages/${data.discord_message_id}`, {
            method: "PATCH",
            headers: { "Authorization": `Bot ${ts.bot_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
          });
          if (!eRes.ok) console.error("Task discord edit failed:", await eRes.text());
        }
      } catch (e) { console.error("Task discord update error:", e); }

      return jsonResponse(data);
    }

    if (action === "delete-task" && req.method === "POST") {
      if (!hasPerm("tasks_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      const { data: task } = await supabase.from("tasks").select("title").eq("id", id).single();
      await supabase.from("tasks").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-task", `Taak "${task?.title}" verwijderd`);
      return jsonResponse({ success: true });
    }

    // === ABSENCES ===
    if (action === "absences") {
      const { data } = await supabase.from("absences").select("*, admin_users(username)").order("created_at", { ascending: false });
      return jsonResponse(data);
    }

    if (action === "add-absence" && req.method === "POST") {
      const { start_date, end_date, reason } = await req.json();
      if (!start_date || !end_date) return jsonResponse({ error: "Datums zijn vereist" }, 400);
      const { data, error } = await supabase.from("absences").insert({ user_id: session.userId, start_date, end_date, reason }).select("*, admin_users(username)").single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-absence", `Afmelding ingediend: ${start_date} - ${end_date}`);

      // Send to Discord if configured
      try {
        const { data: absSettings } = await supabase.from("absence_settings").select("*").limit(1).single();
        if (absSettings?.enabled && absSettings?.bot_token && absSettings?.message_channel_id) {
          const embed = buildAbsenceEmbed(sessionUsername, start_date, end_date, reason, "in_afwachting");
          const dRes = await fetch(`https://discord.com/api/v10/channels/${absSettings.message_channel_id}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bot ${absSettings.bot_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
          });
          if (dRes.ok) {
            const msg = await dRes.json();
            if (msg?.id) await supabase.from("absences").update({ discord_message_id: msg.id, discord_notified: true }).eq("id", data.id);
          } else {
            console.error("Absence discord notify failed:", await dRes.text());
          }
        }
      } catch (e) { console.error("Absence discord error:", e); }

      return jsonResponse(data);
    }

    if (action === "update-absence" && req.method === "POST") {
      if (!hasPerm("absences_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, status } = await req.json();
      const { data } = await supabase.from("absences").update({ status }).eq("id", id).select("*, admin_users(username), discord_message_id").single();
      await logActivity(session.userId, sessionUsername, "update-absence", `Afmelding ${status === "goedgekeurd" ? "goedgekeurd" : status === "afgekeurd" ? "afgekeurd" : status === "teruggekomen" ? "teruggekomen" : "bijgewerkt"}`);

      // Update Discord embed if configured
      try {
        const { data: absSettings } = await supabase.from("absence_settings").select("*").limit(1).single();
        if (absSettings?.enabled && absSettings?.bot_token && absSettings?.message_channel_id && data?.discord_message_id) {
          const embed = buildAbsenceEmbed(data.admin_users?.username || "Onbekend", data.start_date, data.end_date, data.reason, status);
          const eRes = await fetch(`https://discord.com/api/v10/channels/${absSettings.message_channel_id}/messages/${data.discord_message_id}`, {
            method: "PATCH",
            headers: { "Authorization": `Bot ${absSettings.bot_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
          });
          if (!eRes.ok) console.error("Absence discord edit failed:", await eRes.text());
        }
      } catch (e) { console.error("Absence discord update error:", e); }

      return jsonResponse(data);
    }

    if (action === "delete-absence" && req.method === "POST") {
      if (!hasPerm("absences_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      await supabase.from("absences").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-absence", "Afmelding verwijderd");
      return jsonResponse({ success: true });
    }

    // === ABSENCE SETTINGS (Discord) ===
    if (action === "absence-settings") {
      const { data } = await supabase.from("absence_settings").select("*").limit(1).single();
      return jsonResponse(data || { enabled: false, message_channel_id: "", role_channel_id: "", role_id: "", bot_token: "" });
    }

    if (action === "update-absence-settings" && req.method === "POST") {
      if (!hasPerm("absences_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const { data: existing } = await supabase.from("absence_settings").select("id").limit(1).single();
      if (existing) {
        await supabase.from("absence_settings").update(body).eq("id", existing.id);
      } else {
        await supabase.from("absence_settings").insert(body);
      }
      await logActivity(session.userId, sessionUsername, "update-absence-settings", "Afmelding Discord instellingen bijgewerkt");
      return jsonResponse({ success: true });
    }

    // === USERS ===
    if (action === "users") {
      if (!hasPerm("users_view") && !hasPerm("users_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { data } = await supabase.from("admin_users").select("id, username, role, role_id, last_online, created_at, password_hash, discord_id, roles(id, name, color, permissions)").order("created_at");
      const canSeePasswords = hasPerm("see_passwords");
      const sanitized = (data || []).map((u: any) => ({
        ...u,
        password_hash: canSeePasswords ? u.password_hash : undefined,
      }));
      return jsonResponse(sanitized);
    }

    if (action === "add-user" && req.method === "POST") {
      if (!hasPerm("users_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { username, password, role_id } = await req.json();
      if (!username || !password) return jsonResponse({ error: "Vul alle velden in" }, 400);

      let roleName = "staff";
      if (role_id) {
        const { data: roleData } = await supabase.from("roles").select("name").eq("id", role_id).single();
        if (roleData) roleName = roleData.name;
      }

      const { data: hash } = await supabase.rpc("hash_password", { _password: password });
      const { data, error } = await supabase.from("admin_users").insert({ username, password_hash: hash, role: roleName, role_id }).select("id, username, role, role_id").single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-user", `Gebruiker ${username} aangemaakt met rol ${roleName}`);
      return jsonResponse(data);
    }

    if (action === "delete-user" && req.method === "POST") {
      if (!hasPerm("users_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      if (id === session.userId) return jsonResponse({ error: "Je kunt jezelf niet verwijderen" }, 400);
      const { data: user } = await supabase.from("admin_users").select("username").eq("id", id).single();
      await supabase.from("admin_users").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-user", `Gebruiker ${user?.username} verwijderd`);
      return jsonResponse({ success: true });
    }

    if (action === "update-user-role" && req.method === "POST") {
      if (!hasPerm("users_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, role_id } = await req.json();
      let roleName = "staff";
      if (role_id) {
        const { data: roleData } = await supabase.from("roles").select("name").eq("id", role_id).single();
        if (roleData) roleName = roleData.name;
      }
      await supabase.from("admin_users").update({ role: roleName, role_id }).eq("id", id);
      await logActivity(session.userId, sessionUsername, "update-user-role", `Rol gewijzigd naar ${roleName}`);
      return jsonResponse({ success: true });
    }

    if (action === "change-password" && req.method === "POST") {
      const { current_password, new_password } = await req.json();
      if (!current_password || !new_password) return jsonResponse({ error: "Vul alle velden in" }, 400);

      const { data: user } = await supabase.from("admin_users").select("password_hash").eq("id", session.userId).single();
      if (!user) return jsonResponse({ error: "Gebruiker niet gevonden" }, 404);

      const { data: match } = await supabase.rpc("check_password", { _password: current_password, _hash: user.password_hash });
      if (!match) return jsonResponse({ error: "Huidig wachtwoord is onjuist" }, 401);

      const { data: hash } = await supabase.rpc("hash_password", { _password: new_password });
      await supabase.from("admin_users").update({ password_hash: hash }).eq("id", session.userId);
      await logActivity(session.userId, sessionUsername, "change-password", "Eigen wachtwoord gewijzigd");
      
      // Return new token so login still works
      const newToken = btoa(JSON.stringify({ ...session, exp: Date.now() + 24 * 60 * 60 * 1000 }));
      return jsonResponse({ success: true, token: newToken });
    }

    if (action === "change-user-password" && req.method === "POST") {
      if (!hasPerm("users_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { user_id, new_password } = await req.json();
      if (!user_id || !new_password) return jsonResponse({ error: "Vul alle velden in" }, 400);

      const { data: hash } = await supabase.rpc("hash_password", { _password: new_password });
      await supabase.from("admin_users").update({ password_hash: hash }).eq("id", user_id);
      const { data: targetUser } = await supabase.from("admin_users").select("username").eq("id", user_id).single();
      await logActivity(session.userId, sessionUsername, "change-user-password", `Wachtwoord gewijzigd voor ${targetUser?.username}`);
      return jsonResponse({ success: true });
    }

    // === ROLES ===
    if (action === "roles") {
      if (!hasPerm("roles_view") && !hasPerm("roles_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { data } = await supabase.from("roles").select("*").order("sort_order").order("created_at");
      const { data: users } = await supabase.from("admin_users").select("role_id");
      const counts: Record<string, number> = {};
      (users || []).forEach((u: any) => { if (u.role_id) counts[u.role_id] = (counts[u.role_id] || 0) + 1; });
      const rolesWithCounts = (data || []).map((r: any) => ({ ...r, user_count: counts[r.id] || 0 }));
      return jsonResponse(rolesWithCounts);
    }

    if (action === "add-role" && req.method === "POST") {
      if (!hasPerm("roles_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { name, color, permissions } = await req.json();
      if (!name) return jsonResponse({ error: "Vul een naam in" }, 400);
      const { data, error } = await supabase.from("roles").insert({ name, color: color || "#3B82F6", permissions: permissions || {} }).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-role", `Rol ${name} aangemaakt`);
      return jsonResponse(data);
    }

    if (action === "update-role" && req.method === "POST") {
      if (!hasPerm("roles_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, ...updates } = await req.json();
      const { data: existing } = await supabase.from("roles").select("is_system, name").eq("id", id).single();
      if (existing?.is_system && updates.name) delete updates.name;
      const { data, error } = await supabase.from("roles").update(updates).eq("id", id).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "update-role", `Rol ${existing?.name || id} bijgewerkt`);
      return jsonResponse(data);
    }

    if (action === "delete-role" && req.method === "POST") {
      if (!hasPerm("roles_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      const { data: role } = await supabase.from("roles").select("is_system, name").eq("id", id).single();
      if (role?.is_system) return jsonResponse({ error: "Systeemrollen kunnen niet verwijderd worden" }, 400);
      const { count } = await supabase.from("admin_users").select("*", { count: "exact", head: true }).eq("role_id", id);
      if (count && count > 0) return jsonResponse({ error: "Er zijn nog gebruikers met deze rol" }, 400);
      await supabase.from("roles").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-role", `Rol ${role?.name} verwijderd`);
      return jsonResponse({ success: true });
    }

    if (action === "reorder-roles" && req.method === "POST") {
      if (!hasPerm("roles_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { order } = await req.json(); // [{id, sort_order}]
      for (const item of order) {
        await supabase.from("roles").update({ sort_order: item.sort_order }).eq("id", item.id);
      }
      return jsonResponse({ success: true });
    }

    // ACTIVITY LOG
    if (action === "activity-log") {
      if (!hasPerm("activity_view")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      return jsonResponse(data);
    }

    // === SITE SETTINGS ===
    if (action === "site-settings") {
      const { data } = await supabase.from("site_settings").select("*");
      return jsonResponse(data);
    }

    if (action === "update-site-setting" && req.method === "POST") {
      if (!hasPerm("content_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { key, value } = await req.json();
      if (!key) return jsonResponse({ error: "Key is vereist" }, 400);
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).single();
      if (existing) {
        await supabase.from("site_settings").update({ value }).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value });
      }
      await logActivity(session.userId, sessionUsername, "update-setting", `Site tekst "${key}" bijgewerkt`);
      return jsonResponse({ success: true });
    }

    // === NAV ITEMS ===
    if (action === "nav-items") {
      const { data } = await supabase.from("nav_items").select("*").order("sort_order");
      return jsonResponse(data);
    }

    if (action === "add-nav-item" && req.method === "POST") {
      if (!hasPerm("content_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { title, description, icon, link, color } = await req.json();
      const { data, error } = await supabase.from("nav_items").insert({ title, description, icon, link, color }).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-nav-item", `Navigatie item "${title}" toegevoegd`);
      return jsonResponse(data);
    }

    if (action === "update-nav-item" && req.method === "POST") {
      if (!hasPerm("content_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, ...updates } = await req.json();
      const { data, error } = await supabase.from("nav_items").update(updates).eq("id", id).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "update-nav-item", `Navigatie item bijgewerkt`);
      return jsonResponse(data);
    }

    if (action === "delete-nav-item" && req.method === "POST") {
      if (!hasPerm("content_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      await supabase.from("nav_items").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-nav-item", `Navigatie item verwijderd`);
      return jsonResponse({ success: true });
    }

    // === ANNOUNCEMENTS ===
    if (action === "announcements") {
      const { data } = await supabase.from("announcements").select("*, creator:admin_users!announcements_created_by_fkey(username)").order("created_at", { ascending: false });
      return jsonResponse(data);
    }

    if (action === "add-announcement" && req.method === "POST") {
      if (!hasPerm("announcements_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { title, content, is_pinned } = await req.json();
      if (!title) return jsonResponse({ error: "Titel is vereist" }, 400);
      const { data, error } = await supabase.from("announcements").insert({ title, content: content || "", is_pinned: is_pinned || false, created_by: session.userId }).select("*, creator:admin_users!announcements_created_by_fkey(username)").single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "add-announcement", `Mededeling "${title}" geplaatst`);
      return jsonResponse(data);
    }

    if (action === "update-announcement" && req.method === "POST") {
      if (!hasPerm("announcements_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id, ...updates } = await req.json();
      const { data, error } = await supabase.from("announcements").update(updates).eq("id", id).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(session.userId, sessionUsername, "update-announcement", `Mededeling bijgewerkt`);
      return jsonResponse(data);
    }

    if (action === "delete-announcement" && req.method === "POST") {
      if (!hasPerm("announcements_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { id } = await req.json();
      await supabase.from("announcements").delete().eq("id", id);
      await logActivity(session.userId, sessionUsername, "delete-announcement", `Mededeling verwijderd`);
      return jsonResponse({ success: true });
    }

    // STATS
    if (action === "stats") {
      const { count: totalApps } = await supabase.from("applications").select("*", { count: "exact", head: true });
      const { count: pending } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "in_afwachting");
      const { count: accepted } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "geaccepteerd");
      const { count: rejected } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "afgewezen");
      const { count: openPositions } = await supabase.from("positions").select("*", { count: "exact", head: true }).eq("is_open", true);
      const { count: adminCount } = await supabase.from("admin_users").select("*", { count: "exact", head: true });
      const { count: totalRoles } = await supabase.from("roles").select("*", { count: "exact", head: true });
      const { count: activeAbsences } = await supabase.from("absences").select("*", { count: "exact", head: true }).eq("status", "goedgekeurd");

      // Echte actieve staff: laatst online < 15 minuten geleden
      const activeCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: activeStaff } = await supabase
        .from("admin_users")
        .select("id, username, last_online, role, roles(name, color)")
        .gte("last_online", activeCutoff)
        .order("last_online", { ascending: false })
        .limit(10);

      return jsonResponse({
        totalApps, pending, accepted, rejected, openPositions, adminCount, totalRoles, activeAbsences,
        activeStaff: activeStaff || [],
        activeStaffCount: (activeStaff || []).length,
      });
    }

      return jsonResponse({
        totalApps, pending, accepted, rejected, openPositions, adminCount, totalRoles, activeAbsences,
        activeStaff: activeStaff || [],
        activeStaffCount: (activeStaff || []).length,
      });
    }

    // === MC SERVER STATUS (Owner Panel) ===
    if (action === "mc-status") {
      if (!hasPerm("owner_panel")) return jsonResponse({ error: "Geen toegang" }, 403);
      const servers = [
        { key: "velocity", name: "Velocity (Proxy)", host: "node-07.bluxnetwork.eu", port: 25003 },
        { key: "lobby",    name: "Lobby",            host: "node-07.bluxnetwork.eu", port: 25001 },
        { key: "skyblock", name: "Skyblock",         host: "node-07.bluxnetwork.eu", port: 25002 },
        { key: "events",   name: "Events",           host: "node-07.bluxnetwork.eu", port: 25000 },
      ];
      const results = await Promise.all(servers.map(async (s) => {
        try {
          const r = await fetch(`https://api.mcsrvstat.us/3/${s.host}:${s.port}`, {
            headers: { "User-Agent": "PichuMC-Staff-Panel" },
          });
          const d = await r.json();
          return {
            ...s,
            online: !!d.online,
            players: d.players?.online ?? 0,
            max: d.players?.max ?? 0,
            version: d.version || null,
            motd: Array.isArray(d.motd?.clean) ? d.motd.clean.join(" ").trim() : null,
            ping: d.debug?.ping ? "ok" : null,
          };
        } catch (e) {
          return { ...s, online: false, players: 0, max: 0, version: null, motd: null, error: String(e) };
        }
      }));
      return jsonResponse({ servers: results, checkedAt: new Date().toISOString() });
    }
      if (!hasPerm("owner_panel")) return jsonResponse({ error: "Geen toegang tot Owner Panel" }, 403);
      const { action: subAction, password } = await req.json();
      if (!password) return jsonResponse({ error: "Wachtwoord vereist" }, 400);

      // Re-verify password
      const { data: me } = await supabase
        .from("admin_users").select("password_hash, username").eq("id", session.userId).single();
      if (!me) return jsonResponse({ error: "Gebruiker niet gevonden" }, 404);
      const { data: pwOk } = await supabase.rpc("check_password", {
        _password: password, _hash: me.password_hash,
      });
      if (!pwOk) return jsonResponse({ error: "Wachtwoord onjuist" }, 401);

      switch (subAction) {
        case "clear-old-activity": {
          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { error, count } = await supabase
            .from("activity_log").delete({ count: "exact" }).lt("created_at", cutoff);
          if (error) return jsonResponse({ error: error.message }, 400);
          await logActivity(session.userId, sessionUsername, "owner-clear-activity",
            `Activiteit > 30 dagen verwijderd (${count ?? 0} rijen)`);
          return jsonResponse({ success: true, deleted: count ?? 0 });
        }
        case "delete-rejected-applications": {
          const { error, count } = await supabase
            .from("applications").delete({ count: "exact" }).eq("status", "afgewezen");
          if (error) return jsonResponse({ error: error.message }, 400);
          await logActivity(session.userId, sessionUsername, "owner-delete-rejected",
            `Afgewezen sollicitaties verwijderd (${count ?? 0} rijen)`);
          return jsonResponse({ success: true, deleted: count ?? 0 });
        }
        case "close-all-positions": {
          const { error } = await supabase.from("positions").update({ is_open: false }).eq("is_open", true);
          if (error) return jsonResponse({ error: error.message }, 400);
          await logActivity(session.userId, sessionUsername, "owner-close-positions", "Alle posities gesloten");
          return jsonResponse({ success: true });
        }
        case "open-all-positions": {
          const { error } = await supabase.from("positions").update({ is_open: true }).eq("is_open", false);
          if (error) return jsonResponse({ error: error.message }, 400);
          await logActivity(session.userId, sessionUsername, "owner-open-positions", "Alle posities geopend");
          return jsonResponse({ success: true });
        }
        case "export-activity": {
          const { data } = await supabase.from("activity_log").select("*")
            .order("created_at", { ascending: false }).limit(5000);
          await logActivity(session.userId, sessionUsername, "owner-export-activity", "Activity log geëxporteerd");
          return jsonResponse({ success: true, rows: data || [] });
        }
        case "export-users": {
          const { data } = await supabase.from("admin_users")
            .select("id, username, role, role_id, created_at, last_online, roles(name)");
          await logActivity(session.userId, sessionUsername, "owner-export-users", "Gebruikers geëxporteerd");
          return jsonResponse({ success: true, rows: data || [] });
        }
        default:
          return jsonResponse({ error: "Onbekende owner actie" }, 400);
      }
    }

    return jsonResponse({ error: "Onbekende actie" }, 400);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
