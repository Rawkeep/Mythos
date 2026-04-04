import React from "react";
import { Composition } from "remotion";
import { HookVideo, QuoteVideo, ListicleVideo, CTAVideo } from "./compositions.jsx";

// Default props for preview
const defaultSlides = [
  { emoji: "🚢", text: "5 Export-Geheimnisse", subtitle: "die niemand dir verrät", fontSize: 40 },
  { text: "1. Kenne deinen Markt", subtitle: "Recherche ist alles", fontSize: 36 },
  { text: "2. Starte klein, denke groß", fontSize: 36 },
  { text: "3. Netzwerk > Kapital", fontSize: 36 },
  { text: "4. Logistik ist King", fontSize: 36 },
  { emoji: "🔥", text: "Folge für mehr!", subtitle: "@deinaccount", fontSize: 42 },
];

export function RemotionRoot() {
  return (
    <>
      {/* 9:16 Vertical (Reels, Shorts, TikTok) */}
      <Composition
        id="HookVertical"
        component={HookVideo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          slides: defaultSlides,
          accentColor: "#E8A838",
        }}
      />

      {/* 1:1 Square (Instagram Feed, Facebook) */}
      <Composition
        id="HookSquare"
        component={HookVideo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          slides: defaultSlides,
          accentColor: "#E8A838",
        }}
      />

      {/* 16:9 Landscape (YouTube) */}
      <Composition
        id="HookLandscape"
        component={HookVideo}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          slides: defaultSlides,
          accentColor: "#E8A838",
        }}
      />

      <Composition
        id="QuoteVertical"
        component={QuoteVideo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          quote: "Der beste Zeitpunkt zu starten war gestern. Der zweitbeste ist jetzt.",
          author: "Afrikanisches Sprichwort",
          accentColor: "#E8A838",
        }}
      />

      <Composition
        id="ListicleVertical"
        component={ListicleVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Top 5 Export-Tipps",
          items: [
            "Kenne deinen Zielmarkt",
            "Starte mit einem Produkt",
            "Finde lokale Partner",
            "Logistik früh planen",
            "Cashflow im Blick behalten",
          ],
          accentColor: "#2ECC71",
        }}
      />

      <Composition
        id="CTAVertical"
        component={CTAVideo}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          mainText: "Mehr Export-Tipps?",
          subText: "Folge für täglichen Content",
          accentColor: "#E8A838",
        }}
      />
    </>
  );
}
