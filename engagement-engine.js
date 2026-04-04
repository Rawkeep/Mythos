// Autonomous Engagement Engine
// Generates natural, human-like interactions with configurable personality

const DEFAULT_PERSONALITY = {
  tone: "friendly-professional", // friendly-professional | casual | authoritative | witty
  emojiFrequency: 0.3,          // 0 = never, 1 = every message
  responseLength: "medium",      // short | medium | long
  typoRate: 0.02,               // subtle typos to appear human
  responseDelay: { min: 30, max: 300 }, // seconds before responding
  activeHours: { start: 8, end: 22 },  // only engage during these hours
  timezone: "Europe/Berlin",
  language: "de",
};

const ENGAGEMENT_RULES_TEMPLATE = [
  {
    id: "thank-followers",
    trigger: "new_follower",
    action: "send_dm",
    enabled: true,
    templates: [
      "Hey, danke fürs Folgen! Schau gerne mal in meine letzten Posts rein 🙌",
      "Willkommen! Freut mich dass du dabei bist ✌️",
      "Hey! Danke dir — stay tuned für neuen Content 🔥",
    ],
  },
  {
    id: "reply-comments",
    trigger: "comment_received",
    action: "reply_comment",
    enabled: true,
    keywords: ["*"], // * = all comments
    aiGenerated: true, // use AI to generate contextual reply
  },
  {
    id: "engage-niche",
    trigger: "hashtag_match",
    action: "like_and_comment",
    enabled: true,
    hashtags: ["#export", "#africanfashion", "#business", "#hustle"],
    maxPerHour: 15,
    commentTemplates: [
      "Mega Content! 🔥",
      "Das ist so wahr 💯",
      "Spannende Perspektive! 👏",
      "Danke fürs Teilen 🙌",
    ],
    aiGenerated: true,
  },
  {
    id: "auto-like",
    trigger: "feed_scroll",
    action: "like",
    enabled: true,
    maxPerHour: 30,
    likeRatio: 0.4, // like 40% of seen posts
  },
];

// Natural timing — adds human-like randomness
export function naturalDelay(minSeconds, maxSeconds) {
  // Gaussian-ish distribution (more likely near the middle)
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const normalized = (gaussian + 3) / 6; // roughly 0-1
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.floor(minSeconds + clamped * (maxSeconds - minSeconds));
}

// Add subtle human imperfections to text
export function humanize(text, typoRate = 0.02) {
  if (Math.random() > 0.3) return text; // 70% of the time, no changes

  const variations = [];

  // Sometimes skip capitalization
  if (Math.random() < 0.15) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
    variations.push("lowercase-start");
  }

  // Sometimes add trailing dots variation
  if (Math.random() < 0.1 && text.endsWith("!")) {
    text = text.slice(0, -1) + "!!";
    variations.push("double-exclaim");
  }

  // Rare subtle typo
  if (Math.random() < typoRate && text.length > 10) {
    const pos = Math.floor(Math.random() * (text.length - 2)) + 1;
    // Swap two adjacent characters
    text = text.slice(0, pos) + text[pos + 1] + text[pos] + text.slice(pos + 2);
    variations.push("typo");
  }

  return text;
}

// Pick a random template with variation
export function pickTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

// Build AI prompt for contextual engagement response
export function buildEngagementPrompt(context, personality) {
  const toneMap = {
    "friendly-professional": "freundlich und professionell, wie ein echter Mensch der sich auskennt",
    "casual": "locker und entspannt, wie ein Freund",
    "authoritative": "kompetent und selbstbewusst, wie ein Experte",
    "witty": "witzig und clever, mit einer Prise Humor",
  };

  const lengthMap = {
    short: "1 kurzen Satz (max 15 Wörter)",
    medium: "1-2 Sätze (max 30 Wörter)",
    long: "2-3 Sätze (max 50 Wörter)",
  };

  return `Du bist ein echter Social-Media-Nutzer. Schreibe eine authentische Reaktion.

KONTEXT:
- Plattform: ${context.platform}
- Original-Post: "${context.postContent}"
${context.commentToReply ? `- Kommentar auf den du antwortest: "${context.commentToReply}"` : ""}

PERSÖNLICHKEIT:
- Ton: ${toneMap[personality.tone]}
- Länge: ${lengthMap[personality.responseLength]}
- Sprache: ${personality.language === "de" ? "Deutsch" : "English"}
- Emoji: ${personality.emojiFrequency > 0.5 ? "Nutze gerne Emojis" : personality.emojiFrequency > 0.1 ? "Gelegentlich ein Emoji" : "Keine Emojis"}

WICHTIGE REGELN:
- Schreibe NUR den Kommentar, keine Erklärung
- Klingt wie ein echter Mensch, NICHT wie ein Bot
- Beziehe dich auf den konkreten Inhalt
- Keine generischen Floskeln wie "Toller Post!"
- Variiere deinen Stil natürlich
- Keine Hashtags im Kommentar`;
}

// Schedule posts with natural timing
export function generatePostSchedule(posts, config) {
  const schedule = [];
  const { activeHours, timezone } = config;

  // Optimal posting times per platform
  const optimalTimes = {
    instagram: [9, 12, 17, 20],
    youtube: [14, 17, 20],
    tiktok: [7, 10, 15, 19, 21],
    x: [8, 12, 17, 21],
    linkedin: [8, 10, 12, 17],
    xing: [8, 10, 12],
  };

  posts.forEach((post, i) => {
    const platform = post.platform || "instagram";
    const times = optimalTimes[platform] || [10, 14, 18];

    // Pick an optimal time + add natural jitter (±30 min)
    const baseHour = times[i % times.length];
    const jitterMinutes = Math.floor(Math.random() * 60) - 30;
    const hour = Math.max(activeHours.start, Math.min(activeHours.end - 1, baseHour));
    const minute = Math.max(0, Math.min(59, 0 + jitterMinutes));

    schedule.push({
      ...post,
      scheduledHour: hour,
      scheduledMinute: minute,
      timezone,
      jitter: jitterMinutes,
    });
  });

  return schedule;
}

export { DEFAULT_PERSONALITY, ENGAGEMENT_RULES_TEMPLATE };
