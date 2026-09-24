import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const FIREBASE_PROJECT_ID = "umbracodex-80934";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

const allowedOrigins = new Set([
  "https://umbra-codex.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST" || !origin || !allowedOrigins.has(origin)) {
    return json({ error: "Origem ou método não permitido." }, 403, origin);
  }

  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";
    if (idToken.length < 100 || idToken.length > 10_000) {
      return json({ error: "Token Google inválido." }, 400, origin);
    }

    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: FIREBASE_PROJECT_ID,
      issuer: FIREBASE_ISSUER,
    });

    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (!email || payload.email_verified !== true || !payload.sub) {
      return json({ error: "A conta Google precisa ter e-mail verificado." }, 401, origin);
    }

    const provider = payload.firebase as { sign_in_provider?: string } | undefined;
    if (provider?.sign_in_provider !== "google.com") {
      return json({ error: "Use uma conta autenticada pelo Google." }, 401, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração interna indisponível.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const displayName =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim().slice(0, 80)
        : email.split("@")[0];
    const avatarUrl =
      typeof payload.picture === "string" ? payload.picture.slice(0, 2_000) : undefined;

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        data: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: avatarUrl,
          picture: avatarUrl,
          firebase_uid: payload.sub,
          source_provider: "google",
        },
      },
    });

    if (error || !data.properties?.hashed_token) {
      throw new Error(error?.message ?? "Não foi possível criar a sessão.");
    }

    return json({ tokenHash: data.properties.hashed_token }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar o login Google.";
    console.error("[google-auth-bridge] login failed", {
      message,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: message }, 401, origin);
  }
});
