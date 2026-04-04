// AI Image & Video Generation Engine
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, "output", "media");
if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });

// --- Image Prompt Builder ---
// Converts content topic into a visual prompt for AI image generators

export function buildImagePrompt(topic, style, context) {
  const baseStyles = {
    cinematic: "cinematic lighting, dramatic atmosphere, 8k, ultra detailed, professional photography",
    minimal: "minimalist design, clean composition, modern aesthetic, solid color background",
    vibrant: "vibrant colors, bold composition, eye-catching, high contrast, trending on artstation",
    dark: "dark moody aesthetic, neon accents, cyberpunk inspired, dramatic shadows",
    luxury: "luxury aesthetic, gold accents, premium feel, elegant composition, high-end",
    african: "African patterns, warm earth tones, cultural motifs, vibrant ankara textiles, beautiful composition",
  };

  const topicVisuals = {
    export: "global trade, shipping containers, world map, cargo ships, modern logistics",
    "africa-trade": "African marketplace, vibrant market scene, African business, cultural commerce",
    fashion: "fashion editorial, haute couture, stylish outfit flat lay, fashion photography",
    culture: "African art, cultural heritage, traditional patterns, modern African aesthetic",
    beauty: "beauty products flat lay, skincare aesthetic, luxury cosmetics, soft lighting",
    business: "modern workspace, entrepreneur lifestyle, success aesthetic, office setup",
    lifestyle: "lifestyle aesthetic, daily routine, wellness, modern living",
  };

  const visualContext = topicVisuals[topic] || context || "professional content creation";
  const styleStr = baseStyles[style] || baseStyles.cinematic;

  return `${visualContext}, ${styleStr}, no text, no watermark, no people faces, faceless content style`;
}

// --- DALL-E 3 (OpenAI) ---

export async function generateImageDalle(prompt, size = "1024x1792") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set in .env");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size, // 1024x1024, 1024x1792 (portrait), 1792x1024 (landscape)
      quality: "hd",
      style: "vivid",
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`DALL-E: ${err.error?.message || resp.status}`);
  }

  const data = await resp.json();
  const imageUrl = data.data[0]?.url;
  const revisedPrompt = data.data[0]?.revised_prompt;

  // Download and save
  const imageResp = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResp.arrayBuffer());
  const filename = `dalle-${Date.now()}.png`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return {
    provider: "dall-e-3",
    url: `/output/media/${filename}`,
    filepath,
    revisedPrompt,
  };
}

// --- Stability AI (Stable Diffusion) ---

export async function generateImageStability(prompt, aspectRatio = "9:16") {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY not set in .env");

  const resp = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "image/*",
    },
    body: (() => {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("aspect_ratio", aspectRatio);
      form.append("output_format", "png");
      form.append("model", "sd3.5-large");
      return form;
    })(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Stability AI: ${err}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  const filename = `stability-${Date.now()}.png`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return {
    provider: "stability-ai",
    url: `/output/media/${filename}`,
    filepath,
  };
}

// --- FAL.ai (Fast image + video) ---

export async function generateImageFal(prompt, imageSize = "portrait_16_9") {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set in .env");

  // Submit request
  const resp = await fetch("https://queue.fal.run/fal-ai/flux-pro/v1.1", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: imageSize, // square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
      num_images: 1,
      safety_tolerance: "5",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`FAL.ai: ${err}`);
  }

  const data = await resp.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("FAL.ai: No image returned");

  // Download and save
  const imageResp = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResp.arrayBuffer());
  const filename = `fal-${Date.now()}.png`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return {
    provider: "fal-flux-pro",
    url: `/output/media/${filename}`,
    filepath,
  };
}

// --- AI Video Generation (Replicate) ---

export async function generateVideoReplicate(prompt, imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not set in .env");

  // Use minimax video-01 or similar model
  const input = imageUrl
    ? { prompt, first_frame_image: imageUrl }
    : { prompt };

  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // minimax video generation model
      version: "c8bbbda3eaa8db820b5b659beca98d7ae09aff2ef2c1e42586de0ece48b5a72f",
      input: {
        prompt: `${prompt}, smooth camera movement, professional quality, no faces`,
        ...input,
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`Replicate: ${err.detail || resp.status}`);
  }

  const prediction = await resp.json();

  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    result = await poll.json();
  }

  if (result.status === "failed") throw new Error(`Replicate: ${result.error || "Generation failed"}`);

  const videoUrl = result.output;
  if (!videoUrl) throw new Error("Replicate: No video returned");

  // Download video
  const videoResp = await fetch(typeof videoUrl === "string" ? videoUrl : videoUrl[0]);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `ai-video-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return {
    provider: "replicate",
    url: `/output/media/${filename}`,
    filepath,
  };
}

// --- FAL.ai Video (Kling, Minimax) ---

export async function generateVideoFal(prompt, imageUrl) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set in .env");

  const input = { prompt, duration: "5" };
  if (imageUrl) input.image_url = imageUrl;

  // Submit to queue
  const resp = await fetch("https://queue.fal.run/fal-ai/minimax/video-01-live", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`FAL.ai Video: ${err}`);
  }

  const data = await resp.json();
  const videoUrl = data.video?.url;
  if (!videoUrl) throw new Error("FAL.ai: No video returned");

  const videoResp = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `fal-video-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return {
    provider: "fal-minimax",
    url: `/output/media/${filename}`,
    filepath,
  };
}

// --- FAL.ai Kling (China AI - hochwertige Videos) ---

export async function generateVideoKling(prompt, imageUrl) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set in .env");

  const input = { prompt, duration: "5", aspect_ratio: "9:16" };
  if (imageUrl) input.image_url = imageUrl;

  const resp = await fetch("https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!resp.ok) throw new Error(`Kling: ${await resp.text()}`);

  const data = await resp.json();
  const videoUrl = data.video?.url;
  if (!videoUrl) throw new Error("Kling: No video returned");

  const videoResp = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `kling-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return { provider: "kling-v1.5", url: `/output/media/${filename}`, filepath };
}

// --- FAL.ai Hailuo / MiniMax (Nana-Banana Style) ---

export async function generateVideoHailuo(prompt, imageUrl) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set in .env");

  const input = { prompt };
  if (imageUrl) input.image_url = imageUrl;

  const resp = await fetch("https://queue.fal.run/fal-ai/minimax/video-01", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `${prompt}, smooth cinematic motion, professional`, ...input }),
  });

  if (!resp.ok) throw new Error(`Hailuo/MiniMax: ${await resp.text()}`);

  const data = await resp.json();
  const videoUrl = data.video?.url;
  if (!videoUrl) throw new Error("Hailuo: No video returned");

  const videoResp = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `hailuo-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return { provider: "hailuo-minimax", url: `/output/media/${filename}`, filepath };
}

// --- FAL.ai Luma Dream Machine ---

export async function generateVideoLuma(prompt, imageUrl) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set in .env");

  const input = { prompt };
  if (imageUrl) input.image_url = imageUrl;

  const resp = await fetch("https://queue.fal.run/fal-ai/luma-dream-machine", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!resp.ok) throw new Error(`Luma: ${await resp.text()}`);

  const data = await resp.json();
  const videoUrl = data.video?.url;
  if (!videoUrl) throw new Error("Luma: No video returned");

  const videoResp = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `luma-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return { provider: "luma-dream-machine", url: `/output/media/${filename}`, filepath };
}

// --- Replicate: Runway Gen-3 Alpha ---

export async function generateVideoRunway(prompt, imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not set in .env");

  const input = { prompt: `${prompt}, cinematic, smooth motion, no faces, professional quality` };
  if (imageUrl) input.image = imageUrl;

  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "2d2dc25b68a51c2dcc5b8fee7a87e0f89b8e5e83c2e9132ea32d4ab7f3ef6eb0",
      input,
    }),
  });

  if (!resp.ok) throw new Error(`Runway: ${(await resp.json()).detail || resp.status}`);

  let result = await resp.json();
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise(r => setTimeout(r, 5000));
    result = await (await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
  }

  if (result.status === "failed") throw new Error(`Runway: ${result.error}`);

  const videoUrl = typeof result.output === "string" ? result.output : result.output?.[0];
  if (!videoUrl) throw new Error("Runway: No video returned");

  const videoResp = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResp.arrayBuffer());
  const filename = `runway-${Date.now()}.mp4`;
  const filepath = path.join(MEDIA_DIR, filename);
  writeFileSync(filepath, buffer);

  return { provider: "runway-gen3", url: `/output/media/${filename}`, filepath };
}

// --- Smart Generator: picks best available provider ---

export async function generateImage(prompt, aspectRatio = "portrait") {
  const sizeMap = {
    portrait: { dalle: "1024x1792", stability: "9:16", fal: "portrait_16_9" },
    square: { dalle: "1024x1024", stability: "1:1", fal: "square_hd" },
    landscape: { dalle: "1792x1024", stability: "16:9", fal: "landscape_16_9" },
  };
  const sizes = sizeMap[aspectRatio] || sizeMap.portrait;

  // Try providers in order of preference
  const providers = [
    { name: "fal", key: "FAL_KEY", fn: () => generateImageFal(prompt, sizes.fal) },
    { name: "dalle", key: "OPENAI_API_KEY", fn: () => generateImageDalle(prompt, sizes.dalle) },
    { name: "stability", key: "STABILITY_API_KEY", fn: () => generateImageStability(prompt, sizes.stability) },
  ];

  for (const p of providers) {
    if (process.env[p.key]) {
      try {
        return await p.fn();
      } catch (err) {
        console.error(`${p.name} failed: ${err.message}`);
      }
    }
  }

  throw new Error("Keine Bild-AI konfiguriert. Setze OPENAI_API_KEY, STABILITY_API_KEY oder FAL_KEY in .env");
}

export async function generateAIVideo(prompt, imageUrl, preferredProvider) {
  const allProviders = [
    { name: "kling", key: "FAL_KEY", fn: () => generateVideoKling(prompt, imageUrl) },
    { name: "hailuo", key: "FAL_KEY", fn: () => generateVideoHailuo(prompt, imageUrl) },
    { name: "luma", key: "FAL_KEY", fn: () => generateVideoLuma(prompt, imageUrl) },
    { name: "minimax", key: "FAL_KEY", fn: () => generateVideoFal(prompt, imageUrl) },
    { name: "runway", key: "REPLICATE_API_TOKEN", fn: () => generateVideoRunway(prompt, imageUrl) },
    { name: "replicate", key: "REPLICATE_API_TOKEN", fn: () => generateVideoReplicate(prompt, imageUrl) },
  ];

  // If preferred provider specified, try it first
  const providers = preferredProvider
    ? [
        ...allProviders.filter(p => p.name === preferredProvider),
        ...allProviders.filter(p => p.name !== preferredProvider),
      ]
    : allProviders;

  for (const p of providers) {
    if (process.env[p.key]) {
      try {
        return await p.fn();
      } catch (err) {
        console.error(`${p.name} video failed: ${err.message}`);
      }
    }
  }

  throw new Error("Keine Video-AI konfiguriert. Setze FAL_KEY oder REPLICATE_API_TOKEN in .env");
}

// --- Full Pipeline: Content → Image → Video ---

export async function generateFullMedia(content, topic, format, aspectRatio = "portrait") {
  const imagePrompt = buildImagePrompt(topic, "cinematic", content.slice(0, 200));
  const results = { image: null, video: null, errors: [] };

  // Step 1: Generate Image
  try {
    results.image = await generateImage(imagePrompt, aspectRatio);
  } catch (err) {
    results.errors.push(`Bild: ${err.message}`);
  }

  // Step 2: Generate AI Video (image-to-video if image available)
  try {
    const videoPrompt = `${content.slice(0, 100)}, cinematic, smooth, professional, faceless content`;
    const imgUrl = results.image?.filepath ? `file://${results.image.filepath}` : undefined;
    results.video = await generateAIVideo(videoPrompt, imgUrl);
  } catch (err) {
    results.errors.push(`Video: ${err.message}`);
  }

  return results;
}
