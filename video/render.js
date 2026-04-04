// Video Rendering Engine
// Parses AI-generated content into video slides, then renders with Remotion

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse AI content into slide data for video
export function parseContentToSlides(content, format) {
  const lines = content.split("\n").filter(l => l.trim());
  const slides = [];

  if (format === "reel-script" || format === "yt-short") {
    // Extract hook, body points, CTA
    let currentSection = "";
    for (const line of lines) {
      const clean = line.replace(/^[#*\-\d.]+\s*/, "").trim();
      if (!clean) continue;

      if (/hook/i.test(line)) {
        currentSection = "hook";
        continue;
      }
      if (/body|key point|scene/i.test(line)) {
        currentSection = "body";
        continue;
      }
      if (/cta|call to action/i.test(line)) {
        currentSection = "cta";
        continue;
      }
      if (/hashtag|music|thumbnail/i.test(line)) continue;

      if (currentSection === "hook" && clean.length > 3) {
        slides.push({ text: clean, fontSize: 44, emoji: "🔥" });
      } else if (currentSection === "body" && clean.length > 3 && clean.length < 80) {
        slides.push({ text: clean, fontSize: 34 });
      } else if (currentSection === "cta" && clean.length > 3) {
        slides.push({ text: clean, fontSize: 38, emoji: "👆" });
      } else if (slides.length < 8 && clean.length > 5 && clean.length < 60) {
        slides.push({ text: clean, fontSize: 34 });
      }
    }
  } else if (format === "carousel") {
    // Each slide becomes a video segment
    let slideNum = 0;
    for (const line of lines) {
      const clean = line.replace(/^[#*\-\d.]+\s*/, "").replace(/slide\s*\d+:?\s*/i, "").trim();
      if (/slide/i.test(line) || (/^\d/.test(line) && clean.length > 5)) {
        if (clean.length > 3 && clean.length < 80) {
          slides.push({
            text: clean,
            fontSize: slideNum === 0 ? 42 : 34,
            emoji: slideNum === 0 ? "📑" : undefined,
          });
          slideNum++;
        }
      }
    }
  } else if (format === "quote-card") {
    // Extract quotes
    for (const line of lines) {
      const clean = line.replace(/^[#*\-\d.]+\s*/, "").trim();
      if (clean.length > 10 && clean.length < 100 && !(/caption|hashtag|subtitle/i.test(line))) {
        slides.push({ text: clean, fontSize: 36 });
      }
    }
  } else {
    // Generic: split into chunks
    const sentences = content.match(/[^.!?]+[.!?]+/g) || content.split("\n").filter(l => l.trim());
    for (const s of sentences.slice(0, 8)) {
      const clean = s.replace(/^[#*\-\d.]+\s*/, "").trim();
      if (clean.length > 5 && clean.length < 80) {
        slides.push({ text: clean, fontSize: 34 });
      }
    }
  }

  // Ensure we have at least 2 slides, max 8
  if (slides.length === 0) {
    slides.push({ text: content.slice(0, 60), fontSize: 36, emoji: "⚡" });
  }
  return slides.slice(0, 8);
}

// Get composition ID based on format and aspect ratio
export function getCompositionId(aspectRatio = "vertical", videoType = "hook") {
  const typeMap = {
    hook: "Hook",
    quote: "Quote",
    listicle: "Listicle",
    cta: "CTA",
  };
  const ratioMap = {
    vertical: "Vertical",
    square: "Square",
    landscape: "Landscape",
  };

  const type = typeMap[videoType] || "Hook";
  const ratio = ratioMap[aspectRatio] || "Vertical";
  return `${type}${ratio}`;
}

// Determine video type from content format
export function formatToVideoType(format) {
  if (format === "quote-card") return "quote";
  if (format === "listicle" || format === "carousel") return "listicle";
  return "hook";
}

// Determine best aspect ratio for platform
export function platformToAspectRatio(platform) {
  const map = {
    youtube: "landscape",
    "yt-short": "vertical",
    tiktok: "vertical",
    instagram: "vertical",
    "instagram-feed": "square",
    linkedin: "landscape",
    x: "landscape",
  };
  return map[platform] || "vertical";
}

// Render video
export async function renderVideo({
  slides,
  compositionId = "HookVertical",
  accentColor = "#E8A838",
  outputPath,
  bgColors,
  // For quote type
  quote,
  author,
  // For listicle type
  title,
  items,
  // For CTA type
  mainText,
  subText,
}) {
  const entryPoint = path.join(__dirname, "index.js");

  console.log(`Bundling video (${compositionId})...`);
  const bundleLocation = await bundle({ entryPoint });

  // Build input props based on composition type
  let inputProps = { accentColor };
  if (bgColors) inputProps.bgColors = bgColors;

  if (compositionId.startsWith("Hook")) {
    inputProps.slides = slides;
    // Duration = 3s per slide at 30fps
    inputProps.durationInFrames = slides.length * 90;
  } else if (compositionId.startsWith("Quote")) {
    inputProps.quote = quote || slides?.[0]?.text || "";
    inputProps.author = author || "";
  } else if (compositionId.startsWith("Listicle")) {
    inputProps.title = title || slides?.[0]?.text || "Top Liste";
    inputProps.items = items || slides?.slice(1).map(s => s.text) || [];
    inputProps.durationInFrames = (1 + (inputProps.items.length)) * 90;
  } else if (compositionId.startsWith("CTA")) {
    inputProps.mainText = mainText || slides?.[0]?.text || "";
    inputProps.subText = subText || "";
  }

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  // Override duration if we calculated it
  if (inputProps.durationInFrames) {
    composition.durationInFrames = inputProps.durationInFrames;
  }

  const finalOutput = outputPath || path.join(__dirname, "..", "output", `${compositionId}-${Date.now()}.mp4`);

  console.log(`Rendering ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames...`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: finalOutput,
    inputProps,
  });

  console.log(`Video rendered: ${finalOutput}`);
  return finalOutput;
}
