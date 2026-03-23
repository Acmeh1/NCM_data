import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, permissions, __caller_supabase_url, __caller_supabase_key } = body;

    // Use caller's Supabase project to verify auth
    const callerUrl = __caller_supabase_url || Deno.env.get("SUPABASE_URL")!;
    const callerKey = __caller_supabase_key || Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(callerUrl, callerKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await callerClient.auth.getUser(jwt);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create user directly with password (no invitation email needed)
    let userId: string;
    const { data: createData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: full_name || "" },
      });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        // User exists – look them up
        const { data: listData, error: listError } =
          await adminClient.auth.admin.listUsers();
        if (listError) {
          return new Response(JSON.stringify({ error: listError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const existing = listData.users.find((u: any) => u.email === email);
        if (!existing) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;

        // Update password for existing user
        await adminClient.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = createData.user.id;
    }

    // Create or update profile on caller's project (approved = true)
    const { data: existingProfile } = await callerClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      await callerClient.from("profiles").update({
        email,
        full_name: full_name || "",
        approved: true,
      }).eq("id", userId);
    } else {
      await callerClient.from("profiles").insert({
        id: userId,
        email,
        full_name: full_name || "",
        approved: true,
      });
    }

    // Set permissions on the caller's project
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        const { data: existingPerm } = await callerClient
          .from("user_permissions")
          .select("id")
          .eq("user_id", userId)
          .eq("permission_key", perm.key)
          .maybeSingle();

        if (existingPerm) {
          await callerClient.from("user_permissions").update({
            can_view: perm.can_view ?? false,
            can_edit: perm.can_edit ?? false,
          }).eq("user_id", userId).eq("permission_key", perm.key);
        } else {
          await callerClient.from("user_permissions").insert({
            id: crypto.randomUUID(),
            user_id: userId,
            permission_key: perm.key,
            can_view: perm.can_view ?? false,
            can_edit: perm.can_edit ?? false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
