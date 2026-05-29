import { Router } from "express";

let linkedInAccessToken: string | null = null;
let linkedInOauthState: string | null = null;

export function createLinkedInRouter() {
  const router = Router();

  router.get("/auth", (_req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res
        .status(500)
        .json({ error: "Missing LinkedIn OAuth configuration" });
    }

    linkedInOauthState = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: linkedInOauthState,
      scope: "w_organization_social"
    });

    return res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
    );
  });

  router.get("/callback", (req, res) => {
    const { code, state, error, error_description } = req.query;

    console.log(
      JSON.stringify({
        type: "linkedin_callback",
        hasCode: Boolean(code),
        hasState: Boolean(state),
        error,
        errorDescription: error_description
      })
    );

    if (error) {
      return res
        .status(400)
        .json({ error, errorDescription: error_description });
    }

    if (!state || state !== linkedInOauthState) {
      return res.status(400).json({
        error: "Invalid OAuth state"
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "Missing authorization code"
      });
    }

    linkedInAccessToken = code as string;
    linkedInOauthState = null;

    return res.json({
      status: "LinkedIn auth flow completed (MVP placeholder)"
    });
  });

  return router;
}

export function getLinkedInAccessToken() {
  return linkedInAccessToken;
}
