// Platform OAuth + Posting Connectors
import { readFileSync, writeFileSync, existsSync } from "fs";
import crypto from "crypto";

const TOKENS_PATH = "./platform-tokens.json";

// --- Token Storage ---
export function loadTokens() {
  if (existsSync(TOKENS_PATH)) return JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  return {};
}

export function saveTokens(tokens) {
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function saveToken(platform, tokenData) {
  const tokens = loadTokens();
  tokens[platform] = { ...tokenData, connectedAt: new Date().toISOString() };
  saveTokens(tokens);
}

export function getToken(platform) {
  return loadTokens()[platform] || null;
}

export function removeToken(platform) {
  const tokens = loadTokens();
  delete tokens[platform];
  saveTokens(tokens);
}

// --- OAuth URL Builders ---

export function getAuthUrl(platform) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  switch (platform) {
    case "youtube": {
      const params = new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID,
        redirect_uri: `${backendUrl}/auth/youtube/callback`,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl",
        access_type: "offline",
        prompt: "consent",
        state: crypto.randomUUID(),
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    case "x": {
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
      // Store verifier for token exchange
      const tokens = loadTokens();
      tokens._x_verifier = codeVerifier;
      saveTokens(tokens);

      const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.X_CLIENT_ID,
        redirect_uri: `${backendUrl}/auth/x/callback`,
        scope: "tweet.read tweet.write users.read offline.access",
        state: crypto.randomUUID(),
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      return `https://twitter.com/i/oauth2/authorize?${params}`;
    }

    case "instagram": {
      const params = new URLSearchParams({
        client_id: process.env.META_APP_ID,
        redirect_uri: `${backendUrl}/auth/instagram/callback`,
        response_type: "code",
        scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
        state: crypto.randomUUID(),
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }

    case "tiktok": {
      const csrfState = crypto.randomUUID();
      const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        response_type: "code",
        scope: "user.info.basic,video.publish,video.upload",
        redirect_uri: `${backendUrl}/auth/tiktok/callback`,
        state: csrfState,
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    }

    case "linkedin": {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: `${backendUrl}/auth/linkedin/callback`,
        scope: "openid profile w_member_social",
        state: crypto.randomUUID(),
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    }

    default:
      return null;
  }
}

// --- Token Exchange ---

export async function exchangeCode(platform, code) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  switch (platform) {
    case "youtube": {
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET,
          redirect_uri: `${backendUrl}/auth/youtube/callback`,
          grant_type: "authorization_code",
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        // Get channel info
        const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        }).then(r => r.json());
        const channel = ch.items?.[0];
        saveToken("youtube", {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + data.expires_in * 1000,
          channelId: channel?.id,
          channelName: channel?.snippet?.title,
        });
        return { success: true, channelName: channel?.snippet?.title };
      }
      return { success: false, error: data.error_description || data.error };
    }

    case "x": {
      const tokens = loadTokens();
      const codeVerifier = tokens._x_verifier;
      const credentials = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");

      const resp = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: `${backendUrl}/auth/x/callback`,
          code_verifier: codeVerifier,
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        // Get user info
        const user = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        }).then(r => r.json());
        saveToken("x", {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + data.expires_in * 1000,
          userId: user.data?.id,
          username: user.data?.username,
        });
        return { success: true, username: user.data?.username };
      }
      return { success: false, error: data.error_description || data.error };
    }

    case "instagram": {
      // Exchange for short-lived token
      const resp = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      // Use URL params approach
      const url = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(backendUrl + "/auth/instagram/callback")}&code=${code}`;
      const tokenResp = await fetch(url).then(r => r.json());

      if (tokenResp.access_token) {
        // Exchange for long-lived token
        const longUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenResp.access_token}`;
        const longToken = await fetch(longUrl).then(r => r.json());

        // Get Instagram Business Account
        const pages = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken.access_token}`).then(r => r.json());
        let igAccountId = null;
        let igUsername = null;
        for (const page of (pages.data || [])) {
          const ig = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${longToken.access_token}`).then(r => r.json());
          if (ig.instagram_business_account) {
            igAccountId = ig.instagram_business_account.id;
            const igInfo = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}?fields=username&access_token=${longToken.access_token}`).then(r => r.json());
            igUsername = igInfo.username;
            break;
          }
        }

        saveToken("instagram", {
          accessToken: longToken.access_token,
          expiresAt: Date.now() + (longToken.expires_in || 5184000) * 1000,
          igAccountId,
          igUsername,
          pageId: pages.data?.[0]?.id,
        });
        return { success: true, username: igUsername };
      }
      return { success: false, error: tokenResp.error?.message || "Token exchange failed" };
    }

    case "tiktok": {
      const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${backendUrl}/auth/tiktok/callback`,
        }),
      });
      const data = await resp.json();
      if (data.data?.access_token) {
        saveToken("tiktok", {
          accessToken: data.data.access_token,
          refreshToken: data.data.refresh_token,
          expiresAt: Date.now() + data.data.expires_in * 1000,
          openId: data.data.open_id,
        });
        return { success: true, openId: data.data.open_id };
      }
      return { success: false, error: data.data?.description || "Token exchange failed" };
    }

    case "linkedin": {
      const resp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: `${backendUrl}/auth/linkedin/callback`,
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        // Get user info
        const user = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        }).then(r => r.json());
        saveToken("linkedin", {
          accessToken: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
          sub: user.sub,
          name: user.name,
        });
        return { success: true, name: user.name };
      }
      return { success: false, error: data.error_description || data.error };
    }

    default:
      return { success: false, error: "Unknown platform" };
  }
}

// --- Token Refresh ---

export async function refreshToken(platform) {
  const token = getToken(platform);
  if (!token?.refreshToken) return false;

  switch (platform) {
    case "youtube": {
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET,
          refresh_token: token.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        saveToken("youtube", { ...token, accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
        return true;
      }
      return false;
    }

    case "x": {
      const credentials = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
      const resp = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
        body: new URLSearchParams({ refresh_token: token.refreshToken, grant_type: "refresh_token" }),
      });
      const data = await resp.json();
      if (data.access_token) {
        saveToken("x", { ...token, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 });
        return true;
      }
      return false;
    }

    case "tiktok": {
      const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
      });
      const data = await resp.json();
      if (data.data?.access_token) {
        saveToken("tiktok", { ...token, accessToken: data.data.access_token, refreshToken: data.data.refresh_token, expiresAt: Date.now() + data.data.expires_in * 1000 });
        return true;
      }
      return false;
    }

    default:
      return false;
  }
}

// --- Get valid access token (refresh if needed) ---

export async function getValidToken(platform) {
  const token = getToken(platform);
  if (!token) return null;

  if (token.expiresAt && Date.now() > token.expiresAt - 60000) {
    const refreshed = await refreshToken(platform);
    if (!refreshed) return null;
    return getToken(platform);
  }
  return token;
}

// --- Posting ---

export async function postContent(platform, content) {
  const token = await getValidToken(platform);
  if (!token) return { success: false, error: `${platform} not connected or token expired` };

  switch (platform) {
    case "x": {
      const resp = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content.text.slice(0, 280) }),
      });
      const data = await resp.json();
      return resp.ok
        ? { success: true, id: data.data?.id, url: `https://x.com/i/status/${data.data?.id}` }
        : { success: false, error: data.detail || data.title };
    }

    case "linkedin": {
      const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${token.sub}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content.text },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const data = await resp.json();
      return resp.ok
        ? { success: true, id: data.id }
        : { success: false, error: data.message || JSON.stringify(data) };
    }

    case "instagram": {
      // Step 1: Create media container
      const createResp = await fetch(
        `https://graph.facebook.com/v21.0/${token.igAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: content.text,
            image_url: content.imageUrl, // Required for Instagram
            access_token: token.accessToken,
          }),
        }
      );
      const createData = await createResp.json();
      if (!createData.id) return { success: false, error: createData.error?.message || "Container creation failed" };

      // Step 2: Publish
      const publishResp = await fetch(
        `https://graph.facebook.com/v21.0/${token.igAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: createData.id,
            access_token: token.accessToken,
          }),
        }
      );
      const publishData = await publishResp.json();
      return publishData.id
        ? { success: true, id: publishData.id }
        : { success: false, error: publishData.error?.message || "Publish failed" };
    }

    case "youtube": {
      // YouTube requires video upload — for community posts or video metadata
      // This posts a community post (text-only)
      // Note: Community posts API is limited; for videos, use resumable upload
      return {
        success: false,
        error: "YouTube requires video file upload. Use the scheduler to prepare content, then upload via YouTube Studio.",
        studioUrl: "https://studio.youtube.com",
      };
    }

    case "tiktok": {
      // TikTok requires video upload
      return {
        success: false,
        error: "TikTok requires video file upload. Content has been copied — open TikTok to upload.",
        uploadUrl: "https://www.tiktok.com/upload",
      };
    }

    default:
      return { success: false, error: "Platform not supported for direct posting" };
  }
}

// --- Comment / Reply ---

export async function postComment(platform, targetId, commentText) {
  const token = await getValidToken(platform);
  if (!token) return { success: false, error: `${platform} not connected` };

  switch (platform) {
    case "x": {
      const resp = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: commentText.slice(0, 280),
          reply: { in_reply_to_tweet_id: targetId },
        }),
      });
      const data = await resp.json();
      return resp.ok ? { success: true, id: data.data?.id } : { success: false, error: data.detail };
    }

    case "instagram": {
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${targetId}/comments`,
        {
          method: "POST",
          body: new URLSearchParams({
            message: commentText,
            access_token: token.accessToken,
          }),
        }
      );
      const data = await resp.json();
      return data.id ? { success: true, id: data.id } : { success: false, error: data.error?.message };
    }

    case "youtube": {
      const resp = await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            videoId: targetId,
            topLevelComment: {
              snippet: { textOriginal: commentText },
            },
          },
        }),
      });
      const data = await resp.json();
      return data.id ? { success: true, id: data.id } : { success: false, error: data.error?.message };
    }

    case "linkedin": {
      const resp = await fetch(`https://api.linkedin.com/v2/socialActions/${targetId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: `urn:li:person:${token.sub}`,
          message: { text: commentText },
        }),
      });
      const data = await resp.json();
      return resp.ok ? { success: true } : { success: false, error: data.message };
    }

    default:
      return { success: false, error: "Comments not supported for this platform" };
  }
}

// --- Like ---

export async function likePost(platform, targetId) {
  const token = await getValidToken(platform);
  if (!token) return { success: false, error: `${platform} not connected` };

  switch (platform) {
    case "x": {
      const resp = await fetch(`https://api.twitter.com/2/users/${token.userId}/likes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweet_id: targetId }),
      });
      return resp.ok ? { success: true } : { success: false, error: "Like failed" };
    }

    case "youtube": {
      const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${targetId}&rating=like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      return resp.ok ? { success: true } : { success: false, error: "Like failed" };
    }

    default:
      return { success: false, error: "Likes not supported via API for this platform" };
  }
}
