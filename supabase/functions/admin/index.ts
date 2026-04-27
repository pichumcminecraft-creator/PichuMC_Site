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

// Edge function v4 — force redeploy (dm-ticket-invite, discord-broadcast, bulk-applications)
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

          const prettify = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const prettyFields = fields.map((f: any) => ({ ...f, name: prettify(String(f.name)) }));

          const dRes = await fetch(`https://discord.com/api/v10/channels/${channel.channel_id}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              content: pingContent || undefined,
              embeds: [{
                author: { name: `PichuMC • Sollicitatie` },
                title: `✨ Nieuwe sollicitatie — ${app?.positions?.name || ""}`,
                description: `Er is een nieuwe sollicitatie binnengekomen van **${minecraft_username}**.\nBekijk de antwoorden hieronder en reageer in het staff panel.`,
                color: colorInt,
                fields: prettyFields,
                footer: { text: `PichuMC Sollicitaties • ID ${app?.id?.slice(0, 8) || ""}` },
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

    // === DM TICKET INVITE ===
    // Looks up a Discord user by username in the configured guild and sends them a DM
    // asking them to open a ticket regarding their application.
    if (action === "dm-ticket-invite" && req.method === "POST") {
      if (!hasPerm("applications_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const body = await req.json();
      const { application_id, custom_title, custom_description, custom_color, custom_content } = body;
      if (!application_id) return jsonResponse({ error: "application_id ontbreekt" }, 400);

      const { data: app } = await supabase
        .from("applications")
        .select("*, positions(name, color)")
        .eq("id", application_id)
        .single();
      if (!app) return jsonResponse({ error: "Sollicitatie niet gevonden" }, 404);
      if (!app.discord_username) return jsonResponse({ error: "Geen Discord gebruikersnaam/ID opgegeven" }, 400);

      const { data: dSettings } = await supabase.from("discord_settings").select("bot_token, guild_id").limit(1).single();
      const botToken = dSettings?.bot_token;
      const guildId = dSettings?.guild_id;
      if (!botToken) return jsonResponse({ error: "Discord bot token niet geconfigureerd (Owner Panel → Discord)" }, 400);

      // Allow override via body, OR auto-detect Discord User ID (purely numeric, 17-20 digits)
      const rawInput = String(body.discord_user_id || app.discord_username).trim().replace(/^@/, "");
      const idMatch = rawInput.match(/^\d{17,20}$/);
      let resolvedUserId: string | null = idMatch ? rawInput : null;

      if (!resolvedUserId) {
        // Fallback: lookup by username in guild
        if (!guildId) return jsonResponse({ error: "Geen Discord User ID opgegeven en guild_id niet geconfigureerd. Vul een Discord User ID in." }, 400);
        const cleanName = rawInput.split("#")[0].toLowerCase();
        const searchRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(cleanName)}&limit=10`, {
          headers: { "Authorization": `Bot ${botToken}` },
        });
        if (!searchRes.ok) {
          const t = await searchRes.text();
          return jsonResponse({ error: `Discord zoek-fout (vul een Discord User ID in): ${t}` }, 400);
        }
        const members: any[] = await searchRes.json();
        const m = members.find((mm) =>
          (mm.user?.username || "").toLowerCase() === cleanName ||
          (mm.user?.global_name || "").toLowerCase() === cleanName ||
          (mm.nick || "").toLowerCase() === cleanName
        ) || members[0];
        if (!m?.user?.id) return jsonResponse({ error: `Gebruiker '${app.discord_username}' niet gevonden. Tip: gebruik een Discord User ID i.p.v. naam.` }, 404);
        resolvedUserId = m.user.id;
      }

      const match: any = { user: { id: resolvedUserId } };

      // Open DM channel
      const dmRes = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
        method: "POST",
        headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: match.user.id }),
      });
      if (!dmRes.ok) {
        const t = await dmRes.text();
        return jsonResponse({ error: `DM kanaal openen mislukt: ${t}` }, 400);
      }
      const dm = await dmRes.json();

      // Allow simple template variables in custom text
      const fillVars = (s: string) => s
        .replace(/\{minecraft\}/gi, app.minecraft_username || "")
        .replace(/\{discord\}/gi, app.discord_username || "")
        .replace(/\{positie\}/gi, app.positions?.name || "")
        .replace(/\{position\}/gi, app.positions?.name || "")
        .replace(/\{user\}/gi, `<@${match.user.id}>`);

      const defaultDesc = `Bedankt voor je sollicitatie voor **${app.positions?.name || "een positie"}**!\n\nOm verder te gaan vragen we je een **ticket** te openen in onze Discord server. Een staff lid neemt daar zo snel mogelijk contact met je op.\n\n**Stappen:**\n1. Ga naar het \`#tickets\` kanaal in de PichuMC Discord\n2. Klik op de knop "Maak een ticket"\n3. Vermeld dat het over je **${app.positions?.name || "sollicitatie"}** gaat`;

      const colorHex = (custom_color || app.positions?.color || "#FFD700").toString();
      const colorInt = parseInt(colorHex.replace("#", ""), 16);

      const sendRes = await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: custom_content ? fillVars(custom_content) : `Hey <@${match.user.id}> 👋`,
          embeds: [{
            author: { name: "PichuMC Staff Team" },
            title: custom_title ? fillVars(custom_title) : "🎫 Maak een ticket aan",
            description: custom_description ? fillVars(custom_description) : defaultDesc,
            color: isNaN(colorInt) ? 0xFFD700 : colorInt,
            fields: [
              { name: "Minecraft", value: app.minecraft_username, inline: true },
              { name: "Positie", value: app.positions?.name || "—", inline: true },
            ],
            footer: { text: "PichuMC • Sollicitaties" },
            timestamp: new Date().toISOString(),
          }],
        }),
      });
      if (!sendRes.ok) {
        const t = await sendRes.text();
        return jsonResponse({ error: `DM versturen mislukt (gebruiker DMs uit?): ${t}` }, 400);
      }

      await logActivity(session.userId, sessionUsername, "dm-ticket-invite", `Ticket-DM gestuurd naar ${app.discord_username} voor sollicitatie van ${app.minecraft_username}`);
      return jsonResponse({ success: true, discord_user_id: match.user.id });
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

    // === DISCORD BROADCAST (send embed/message to a channel via bot) ===
    if (action === "discord-broadcast" && req.method === "POST") {
      if (!hasPerm("discord_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { channel_id, content, title, description, color, mention_role } = await req.json();
      if (!channel_id) return jsonResponse({ error: "channel_id ontbreekt" }, 400);
      if (!content && !description && !title) return jsonResponse({ error: "Geef content, titel of beschrijving" }, 400);

      const { data: dSettings } = await supabase.from("discord_settings").select("bot_token").limit(1).single();
      const botToken = dSettings?.bot_token;
      if (!botToken) return jsonResponse({ error: "Discord bot token niet geconfigureerd" }, 400);

      const colorInt = parseInt(String(color || "#FFD700").replace("#", ""), 16);
      const mention = mention_role ? `<@&${mention_role}> ` : "";
      const body: any = {
        content: (mention + (content || "")).trim() || undefined,
        allowed_mentions: { parse: ["roles"] },
      };
      if (title || description) {
        body.embeds = [{
          title: title || undefined,
          description: description || undefined,
          color: isNaN(colorInt) ? 0xFFD700 : colorInt,
          footer: { text: `Verzonden door ${sessionUsername} • PichuMC Staff` },
          timestamp: new Date().toISOString(),
        }];
      }
      const r = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        return jsonResponse({ error: `Discord verstuur fout: ${t}` }, 400);
      }
      await logActivity(session.userId, sessionUsername, "discord-broadcast", `Bericht verstuurd naar kanaal ${channel_id}`);
      return jsonResponse({ success: true });
    }

    // === BULK APPLICATION ACTIONS ===
    if (action === "bulk-applications" && req.method === "POST") {
      if (!hasPerm("applications_manage")) return jsonResponse({ error: "Geen toegang" }, 403);
      const { ids, op, status } = await req.json();
      if (!Array.isArray(ids) || ids.length === 0) return jsonResponse({ error: "Geen sollicitaties geselecteerd" }, 400);
      if (op === "delete") {
        const { error } = await supabase.from("applications").delete().in("id", ids);
        if (error) return jsonResponse({ error: error.message }, 400);
        await logActivity(session.userId, sessionUsername, "bulk-delete-applications", `${ids.length} sollicitaties verwijderd`);
        return jsonResponse({ success: true, count: ids.length });
      }
      if (op === "status" && status) {
        const { error } = await supabase.from("applications").update({ status }).in("id", ids);
        if (error) return jsonResponse({ error: error.message }, 400);
        await logActivity(session.userId, sessionUsername, "bulk-update-applications", `${ids.length} sollicitaties → ${status}`);
        return jsonResponse({ success: true, count: ids.length });
      }
      return jsonResponse({ error: "Ongeldige bulk operatie" }, 400);
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
          };
        } catch (e) {
          return { ...s, online: false, players: 0, max: 0, version: null, motd: null, error: String(e) };
        }
      }));
      return jsonResponse({ servers: results, checkedAt: new Date().toISOString() });
    }

    // === OWNER PANEL ACTIONS (password re-confirmation required) ===
    if (action === "owner-action" && req.method === "POST") {
      console.log("[owner-action] hit, user:", session.username, "isOwner:", isOwner);
      if (!hasPerm("owner_panel")) return jsonResponse({ error: "Geen toegang tot Owner Panel" }, 403);
      const body = await req.json();
      const subAction: string = body.subAction || body.action;
      const password: string = body.password;
      if (!subAction) return jsonResponse({ error: "Geen sub-actie opgegeven" }, 400);
      if (!password) return jsonResponse({ error: "Wachtwoord vereist" }, 400);
      console.log("[owner-action] subAction:", subAction);

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

    // ============================================================
    // === PTERODACTYL SERVER MANAGEMENT (Client API) =============
    // ============================================================
    const ptero = async (path: string, method: string = "GET", body?: unknown) => {
      const base = (Deno.env.get("PTERODACTYL_PANEL_URL") || "").replace(/\/+$/, "");
      const tok = Deno.env.get("PTERODACTYL_CLIENT_TOKEN");
      if (!base || !tok) throw new Error("Pterodactyl niet geconfigureerd (PTERODACTYL_PANEL_URL / PTERODACTYL_CLIENT_TOKEN)");
      const url = base.startsWith("http") ? `${base}${path}` : `https://${base}${path}`;
      const r = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${tok}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`Pterodactyl ${r.status}: ${text.slice(0, 300)}`);
      return text ? (text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : text) : null;
    };

    // Per-server permissions stored as flat keys: srv_<serverId>_<perm>
    // perms: view, power, console, whitelist, players
    const canServer = (serverId: string, perm: "view" | "power" | "console" | "whitelist" | "players") => {
      if (isOwner) return true;
      const p: any = session.permissions || {};
      // backward compat with the older nested ptero_servers shape
      const nested = p.ptero_servers?.[serverId];
      if (perm !== "view" && !p[`srv_${serverId}_view`] && !nested?.view) return false;
      return !!p[`srv_${serverId}_${perm}`] || !!nested?.[perm];
    };

    if (action === "ptero-servers") {
      try {
        const data = await ptero("/api/client?per_page=100");
        const servers = (data?.data || []).map((s: any) => ({
          identifier: s.attributes?.identifier,
          uuid: s.attributes?.uuid,
          name: s.attributes?.name,
          description: s.attributes?.description,
          node: s.attributes?.node,
          limits: s.attributes?.limits,
          is_owner: s.attributes?.server_owner,
          status: s.attributes?.status,
        }));
        // Filter: owners see all, others see only servers they have at least 'view' on
        const visible = isOwner ? servers : servers.filter((s: any) => canServer(s.identifier, "view"));
        return jsonResponse({ servers: visible });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    if (action === "ptero-resources") {
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ error: "id ontbreekt" }, 400);
      if (!canServer(id, "view")) return jsonResponse({ error: "Geen toegang tot deze server" }, 403);
      try {
        const data = await ptero(`/api/client/servers/${id}/resources`);
        return jsonResponse(data?.attributes || {});
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    if (action === "ptero-power" && req.method === "POST") {
      const { id, signal } = await req.json();
      if (!id || !signal) return jsonResponse({ error: "id en signal vereist" }, 400);
      if (!["start", "stop", "restart", "kill"].includes(signal)) return jsonResponse({ error: "Ongeldig signal" }, 400);
      if (!canServer(id, "power")) return jsonResponse({ error: "Geen power-permissie voor deze server" }, 403);
      try {
        await ptero(`/api/client/servers/${id}/power`, "POST", { signal });
        await logActivity(session.userId, sessionUsername, "ptero-power", `Server ${id}: ${signal}`);
        return jsonResponse({ success: true });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    if (action === "ptero-command" && req.method === "POST") {
      const { id, command } = await req.json();
      if (!id || !command) return jsonResponse({ error: "id en command vereist" }, 400);
      // Whitelist commands need 'whitelist'; rest need 'console'
      const isWhitelistCmd = /^(whitelist|wl)\s+/i.test(command);
      const requiredPerm: "console" | "whitelist" = isWhitelistCmd ? "whitelist" : "console";
      if (!canServer(id, requiredPerm)) return jsonResponse({ error: `Geen ${requiredPerm}-permissie voor deze server` }, 403);
      try {
        await ptero(`/api/client/servers/${id}/command`, "POST", { command });
        await logActivity(session.userId, sessionUsername, "ptero-command", `Server ${id}: \`${command}\``);
        return jsonResponse({ success: true });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    // Read whitelist.json from server file
    if (action === "ptero-whitelist") {
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ error: "id ontbreekt" }, 400);
      if (!canServer(id, "whitelist")) return jsonResponse({ error: "Geen whitelist-permissie" }, 403);
      try {
        const raw = await ptero(`/api/client/servers/${id}/files/contents?file=${encodeURIComponent("/whitelist.json")}`);
        let list: Array<{ uuid?: string; name: string }> = [];
        try {
          list = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          list = [];
        }
        return jsonResponse({ whitelist: Array.isArray(list) ? list : [] });
      } catch (e: any) {
        // No whitelist file yet
        return jsonResponse({ whitelist: [], note: e.message });
      }
    }

    if (action === "ptero-list-files") {
      const id = url.searchParams.get("id");
      const dir = url.searchParams.get("dir") || "/";
      if (!id) return jsonResponse({ error: "id ontbreekt" }, 400);
      if (!canServer(id, "view")) return jsonResponse({ error: "Geen toegang" }, 403);
      try {
        const data = await ptero(`/api/client/servers/${id}/files/list?directory=${encodeURIComponent(dir)}`);
        return jsonResponse({ files: data?.data || [] });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    // Get a one-time websocket token to view live console
    if (action === "ptero-console-ws") {
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ error: "id ontbreekt" }, 400);
      if (!canServer(id, "console")) return jsonResponse({ error: "Geen console-permissie" }, 403);
      try {
        const data = await ptero(`/api/client/servers/${id}/websocket`);
        return jsonResponse(data?.data || {});
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
      }
    }

    return jsonResponse({ error: `Onbekende actie: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
