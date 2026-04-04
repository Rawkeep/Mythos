import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";

// --- Faceless Video Templates ---

// Text slide with animated entrance
function AnimatedText({ text, color = "#fff", fontSize = 48, delay = 0, style = "fadeUp" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animFrame = frame - delay;
  if (animFrame < 0) return null;

  let opacity, translateY, scale;

  if (style === "fadeUp") {
    opacity = interpolate(animFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
    translateY = interpolate(animFrame, [0, 15], [40, 0], { extrapolateRight: "clamp" });
    scale = 1;
  } else if (style === "pop") {
    const sp = spring({ frame: animFrame, fps, config: { damping: 12, stiffness: 200 } });
    opacity = sp;
    scale = interpolate(sp, [0, 1], [0.5, 1]);
    translateY = 0;
  } else if (style === "typewriter") {
    const charsToShow = Math.floor(interpolate(animFrame, [0, text.length * 2], [0, text.length], { extrapolateRight: "clamp" }));
    return (
      <div style={{
        color, fontSize, fontWeight: 800, fontFamily: "'DM Sans', sans-serif",
        textAlign: "center", padding: "0 40px", lineHeight: 1.3,
        textShadow: "0 2px 20px rgba(0,0,0,0.8)",
      }}>
        {text.slice(0, charsToShow)}
        <span style={{ opacity: animFrame % 20 < 10 ? 1 : 0 }}>|</span>
      </div>
    );
  }

  return (
    <div style={{
      color, fontSize, fontWeight: 800, fontFamily: "'DM Sans', sans-serif",
      textAlign: "center", padding: "0 40px", lineHeight: 1.3,
      opacity, transform: `translateY(${translateY}px) scale(${scale})`,
      textShadow: "0 2px 20px rgba(0,0,0,0.8)",
    }}>
      {text}
    </div>
  );
}

// Animated gradient background
function GradientBG({ colors = ["#0A0A0F", "#1a1a2e", "#16213e"] }) {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 300], [0, 360]);
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${angle}deg, ${colors.join(", ")})`,
    }} />
  );
}

// Particle effect overlay
function Particles({ count = 30, color = "#E8A838" }) {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: count }, (_, i) => {
    const x = ((i * 37 + frame * (0.3 + i * 0.02)) % 110) - 5;
    const y = ((i * 53 + frame * (0.2 + i * 0.015)) % 110) - 5;
    const size = 2 + (i % 4);
    const opacity = 0.1 + (i % 5) * 0.08;
    return (
      <div key={i} style={{
        position: "absolute",
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        borderRadius: "50%",
        background: color,
        opacity,
      }} />
    );
  });
  return <AbsoluteFill>{particles}</AbsoluteFill>;
}

// Progress bar at bottom
function ProgressBar({ color = "#E8A838" }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = (frame / durationInFrames) * 100;
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
      background: "rgba(255,255,255,0.1)",
    }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />
    </div>
  );
}

// --- Main Compositions ---

// Hook Video (YouTube Short / Reel / TikTok)
export function HookVideo({ slides, accentColor = "#E8A838", bgColors }) {
  const { fps } = useVideoConfig();
  const slideDuration = 3 * fps; // 3 seconds per slide

  return (
    <AbsoluteFill>
      <GradientBG colors={bgColors || ["#0A0A0F", "#1a1a2e", "#0A0A0F"]} />
      <Particles color={accentColor} />

      {slides.map((slide, i) => (
        <Sequence key={i} from={i * slideDuration} durationInFrames={slideDuration}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: 20 }}>
            {slide.emoji && (
              <AnimatedText text={slide.emoji} fontSize={64} delay={0} style="pop" />
            )}
            <AnimatedText
              text={slide.text}
              color="#fff"
              fontSize={slide.fontSize || 42}
              delay={5}
              style={i === 0 ? "pop" : "fadeUp"}
            />
            {slide.subtitle && (
              <AnimatedText
                text={slide.subtitle}
                color={accentColor}
                fontSize={24}
                delay={15}
                style="fadeUp"
              />
            )}
          </AbsoluteFill>
        </Sequence>
      ))}

      <ProgressBar color={accentColor} />
    </AbsoluteFill>
  );
}

// Quote Card Video
export function QuoteVideo({ quote, author, accentColor = "#E8A838", bgColors }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame, fps, config: { damping: 15 } });
  const authorDelay = 20;
  const authorOpacity = interpolate(frame - authorDelay, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBG colors={bgColors || ["#0A0A0F", "#1a0a2e", "#0A0A0F"]} />
      <Particles color={accentColor} count={20} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", padding: 40 }}>
        {/* Quote marks */}
        <div style={{
          fontSize: 120, color: accentColor, opacity: 0.3, fontFamily: "Georgia, serif",
          transform: `scale(${quoteSpring})`, lineHeight: 0.5, marginBottom: 20,
        }}>"</div>

        <div style={{
          color: "#fff", fontSize: 36, fontWeight: 700, textAlign: "center",
          fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [30, 0])}px)`,
          opacity: quoteSpring, padding: "0 20px",
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}>
          {quote}
        </div>

        {author && (
          <div style={{
            color: accentColor, fontSize: 22, marginTop: 30,
            fontFamily: "'Space Mono', monospace", fontWeight: 400,
            opacity: authorOpacity,
          }}>
            — {author}
          </div>
        )}
      </AbsoluteFill>

      <ProgressBar color={accentColor} />
    </AbsoluteFill>
  );
}

// Listicle / Carousel Video
export function ListicleVideo({ title, items, accentColor = "#E8A838", bgColors }) {
  const { fps } = useVideoConfig();

  const titleDuration = 2.5 * fps;
  const itemDuration = 3 * fps;

  return (
    <AbsoluteFill>
      <GradientBG colors={bgColors || ["#0A0A0F", "#0a1a2e", "#0A0A0F"]} />
      <Particles color={accentColor} count={15} />

      {/* Title */}
      <Sequence from={0} durationInFrames={titleDuration}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
          <AnimatedText text={title} color={accentColor} fontSize={38} style="pop" />
        </AbsoluteFill>
      </Sequence>

      {/* Items */}
      {items.map((item, i) => (
        <Sequence key={i} from={titleDuration + i * itemDuration} durationInFrames={itemDuration}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              color: accentColor, fontSize: 64, fontWeight: 900,
              fontFamily: "'Space Mono', monospace",
            }}>
              {i + 1}
            </div>
            <AnimatedText text={item} color="#fff" fontSize={32} delay={5} style="fadeUp" />
          </AbsoluteFill>
        </Sequence>
      ))}

      <ProgressBar color={accentColor} />
    </AbsoluteFill>
  );
}

// CTA End Screen
export function CTAVideo({ mainText, subText, accentColor = "#E8A838", bgColors }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame / 10) * 0.05 + 1;

  return (
    <AbsoluteFill>
      <GradientBG colors={bgColors || ["#0A0A0F", "#1a1a0e", "#0A0A0F"]} />
      <Particles color={accentColor} count={40} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: 24 }}>
        <AnimatedText text={mainText} color="#fff" fontSize={44} style="pop" />
        {subText && <AnimatedText text={subText} color={accentColor} fontSize={26} delay={15} style="fadeUp" />}

        <div style={{
          marginTop: 30, padding: "16px 40px", borderRadius: 30,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}BB)`,
          color: "#0A0A0F", fontSize: 22, fontWeight: 800,
          fontFamily: "'DM Sans', sans-serif",
          transform: `scale(${pulse})`,
          boxShadow: `0 0 40px ${accentColor}44`,
        }}>
          JETZT FOLGEN
        </div>
      </AbsoluteFill>

      <ProgressBar color={accentColor} />
    </AbsoluteFill>
  );
}
