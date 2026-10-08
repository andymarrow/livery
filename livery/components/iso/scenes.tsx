import { Box, Callout, Cylinder, IsoScene, TopLines, Wire } from "./Iso";

// One illustration per page, each built from what the page is about.
// World units: x runs down-right, y down-left, z up. Every scene stands on a
// base plate: nothing floats.

// A page seen from above: a header bar, a heading, text lines and cards.
const PAGE_LINES = (w: number, d: number): [number, number, number, number][] => [
  [4, 4, w * 0.35, 4],
  [w - 14, 4, w - 4, 4],
  [4, 11, w * 0.7, 11],
  [4, 16, w * 0.5, 16],
  [4, d - 9, w * 0.3, d - 9],
  [w * 0.38, d - 9, w * 0.64, d - 9],
  [w * 0.72, d - 9, w - 4, d - 9],
];

function Plate({ w, d, delay = 0 }: { w: number; d: number; delay?: number }) {
  return <Box x={0} y={0} w={w} d={d} h={3} tone="soft" delay={delay} />;
}

/** Create: a link is measured and becomes a stack of kit files. */
export function CreateScene() {
  return (
    <IsoScene plate={[150, 100]} top={26} label="A web page measured into a stack of kit files" pulses={3}>
      <Plate w={150} d={100} />
      <Box x={8} y={52} w={56} d={40} h={5} z={3} delay={120} />
      <TopLines x={8} y={52} z={8} lines={PAGE_LINES(56, 40)} delay={500} />
      <Wire points={[[64, 72, 8], [80, 72, 8], [80, 26, 8], [94, 26, 8]]} tone="hot" delay={700} />
      <Box x={96} y={12} w={44} d={30} h={5} z={3} delay={260} pulse={0} />
      <Box x={96} y={12} w={44} d={30} h={5} z={9} delay={340} pulse={1} />
      <Box x={96} y={12} w={44} d={30} h={5} z={15} delay={420} tone="hot" pulse={2} />
      <Callout at={[8, 52, 8]} plate={[150, 100]} side="left" label="your-site.com" delay={900} />
      <Callout at={[140, 12, 20]} plate={[150, 100]} label="tokens.json" dy={-8} tone="hot" delay={1000} />
      <Callout at={[140, 42, 14]} plate={[150, 100]} label="components.md" dy={2} delay={1100} />
      <Callout at={[140, 42, 8]} plate={[150, 100]} label="motion.md" dy={12} delay={1200} />
    </IsoScene>
  );
}

/** Explore: a shelf of kits, pages, multi-page kits and tastes. */
export function ExploreScene() {
  return (
    <IsoScene plate={[150, 96]} top={16} label="A shelf of design kits" pulses={6}>
      <Plate w={150} d={96} />
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => {
          const i = row * 2 + col;
          const x = 10 + row * 46;
          const y = 12 + col * 44;
          return (
            <g key={i}>
              <Box x={x} y={y} w={36} d={32} h={4 + (i % 3) * 3} z={3} delay={120 + i * 70} pulse={i} tone={i === 4 ? "hot" : "plain"} />
              <TopLines x={x} y={y} z={7 + (i % 3) * 3} lines={[[4, 5, 20, 5], [4, 10, 28, 10], [4, 25, 12, 25], [15, 25, 22, 25]]} delay={600 + i * 60} />
            </g>
          );
        }),
      )}
      <Callout at={[10, 12, 7]} plate={[150, 96]} side="left" label="Page" delay={1000} />
      <Callout at={[102, 12, 13]} plate={[150, 96]} label="Taste" tone="hot" delay={1100} />
      <Callout at={[56, 88, 10]} plate={[150, 96]} side="left" label="Multi-page" delay={1200} />
    </IsoScene>
  );
}

/** Tastes: several sites by one person meet in one kit. */
export function TastesScene() {
  return (
    <IsoScene plate={[150, 100]} top={24} label="Several sites combining into one taste" pulses={3}>
      <Plate w={150} d={100} />
      {[
        [8, 8],
        [8, 40],
        [8, 72],
      ].map(([x, y], i) => (
        <g key={i}>
          <Box x={x} y={y} w={34} d={22} h={5} z={3} delay={120 + i * 90} pulse={i} />
          <TopLines x={x} y={y} z={8} lines={[[3, 4, 14, 4], [3, 9, 26, 9], [3, 17, 10, 17], [13, 17, 20, 17]]} delay={500 + i * 70} />
          <Wire points={[[42, y + 11, 8], [70, y + 11, 8], [70, 50, 8], [92, 50, 8]]} tone="soft" delay={700 + i * 100} />
        </g>
      ))}
      <Cylinder x={116} y={50} z={3} r={22} h={8} delay={420} />
      <Cylinder x={116} y={50} z={11} r={22} h={8} delay={500} tone="hot" />
      <Callout at={[8, 8, 8]} plate={[150, 100]} side="left" label="site one" delay={1000} />
      <Callout at={[8, 72, 8]} plate={[150, 100]} side="left" label="site three" delay={1100} />
      <Callout at={[116, 28, 19]} plate={[150, 100]} label="one taste" tone="hot" delay={1200} />
    </IsoScene>
  );
}

/** Agents: a kit drops into a project's skills folder; a terminal applies it. */
export function AgentsScene() {
  return (
    <IsoScene plate={[150, 96]} top={20} label="A kit installed into a coding agent's project" pulses={3}>
      <Plate w={150} d={96} />
      <Box x={10} y={46} w={64} d={42} h={5} z={3} delay={120} />
      <TopLines x={10} y={46} z={8} lines={[[5, 6, 24, 6], [5, 13, 46, 13], [5, 20, 38, 20], [5, 27, 52, 27], [5, 34, 18, 34]]} tone="plain" delay={500} />
      <Box x={92} y={14} w={46} d={36} h={4} z={3} delay={220} pulse={0} />
      <Box x={98} y={20} w={34} d={24} h={10} z={7} delay={320} tone="hot" pulse={1} />
      <Box x={92} y={60} w={46} d={28} h={4} z={3} delay={260} pulse={2} />
      <Wire points={[[115, 44, 17], [115, 60, 7]]} tone="hot" delay={900} />
      <Callout at={[10, 46, 8]} plate={[150, 96]} side="left" label="$ apply the kit" delay={1000} />
      <Callout at={[132, 20, 17]} plate={[150, 96]} label=".claude/skills/" tone="hot" delay={1100} />
      <Callout at={[138, 60, 7]} plate={[150, 96]} label="one commit per area" delay={1200} />
    </IsoScene>
  );
}

/** How it works: link, kit, codebase, in a row. */
export function HowItWorksScene() {
  return (
    <IsoScene plate={[160, 90]} top={20} label="From a site to a kit to your codebase" pulses={3}>
      <Plate w={160} d={90} />
      <Box x={8} y={50} w={42} d={32} h={5} z={3} delay={100} pulse={0} />
      <TopLines x={8} y={50} z={8} lines={PAGE_LINES(42, 32)} delay={500} />
      <Box x={62} y={30} w={34} d={30} h={14} z={3} delay={200} tone="hot" pulse={1} />
      <Box x={108} y={8} w={44} d={34} h={5} z={3} delay={300} pulse={2} />
      <TopLines x={108} y={8} z={8} lines={[[4, 6, 30, 6], [8, 12, 36, 12], [8, 18, 26, 18], [4, 24, 20, 24]]} delay={600} />
      <Wire points={[[50, 66, 8], [62, 66, 8], [62, 52, 10]]} tone="soft" delay={800} />
      <Wire points={[[96, 40, 12], [108, 40, 12], [108, 30, 8]]} tone="soft" delay={900} />
      <Callout at={[8, 50, 8]} plate={[160, 90]} side="left" label="measured" delay={1000} />
      <Callout at={[96, 30, 17]} plate={[160, 90]} label="written down" tone="hot" delay={1100} />
      <Callout at={[152, 42, 8]} plate={[160, 90]} label="applied with you" delay={1200} />
    </IsoScene>
  );
}

/** Owners: a site with its livery.json, deciding what is shared. */
export function OwnersScene() {
  return (
    <IsoScene plate={[150, 96]} top={28} label="A website with its owner's livery.json file" pulses={3}>
      <Plate w={150} d={96} />
      <Box x={14} y={20} w={70} d={60} h={22} z={3} delay={120} />
      <TopLines x={14} y={20} z={25} lines={PAGE_LINES(70, 60)} delay={500} />
      <Box x={100} y={18} w={34} d={26} h={3} z={3} delay={260} tone="hot" pulse={0} />
      <TopLines x={100} y={18} z={6} lines={[[4, 5, 26, 5], [8, 10, 22, 10], [8, 15, 28, 15], [4, 20, 12, 20]]} tone="hot" delay={700} />
      <Box x={100} y={56} w={14} d={14} h={6} z={3} delay={340} pulse={1} />
      <Box x={120} y={56} w={14} d={14} h={6} z={3} delay={380} pulse={2} />
      <Callout at={[134, 18, 6]} plate={[150, 96]} label="/.well-known/livery.json" tone="hot" delay={1000} />
      <Callout at={[14, 20, 25]} plate={[150, 96]} side="left" label="your site" delay={1100} />
      <Callout at={[134, 70, 9]} plate={[150, 96]} label="opt in · opt out" delay={1200} />
    </IsoScene>
  );
}

/** FAQ and guardrails: blocks behind a low rail. */
export function FaqScene() {
  return (
    <IsoScene plate={[150, 96]} top={22} label="Kits kept inside guardrails" pulses={4}>
      <Plate w={150} d={96} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} x={30 + (i % 2) * 40} y={22 + Math.floor(i / 2) * 36} w={28} d={24} h={6 + i * 3} z={3} delay={160 + i * 80} pulse={i} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={`p${i}`} x={8 + i * 18} y={88} w={3} d={3} h={14} z={3} tone="soft" delay={400 + i * 40} />
      ))}
      <Wire points={[[8, 89, 15], [137, 89, 15]]} tone="hot" delay={900} />
      <Callout at={[110, 22, 18]} plate={[150, 96]} label="never copies assets" delay={1100} />
      <Callout at={[8, 88, 15]} plate={[150, 96]} side="left" label="never signs in" tone="hot" delay={1200} />
    </IsoScene>
  );
}

/** Extension: a signed-in page in a browser, measured in place. */
export function ExtensionScene() {
  return (
    <IsoScene plate={[150, 96]} top={22} label="A signed-in dashboard measured by the browser extension" pulses={3}>
      <Plate w={150} d={96} />
      <Box x={10} y={14} w={96} d={74} h={5} z={3} delay={120} />
      <TopLines x={10} y={14} z={8} lines={[[0, 8, 96, 8], [4, 4, 12, 4], [20, 4, 56, 4], [4, 14, 20, 14], [4, 20, 18, 20], [4, 26, 22, 26], [28, 16, 90, 16], [28, 30, 90, 30], [28, 44, 58, 44], [62, 44, 90, 44], [28, 60, 90, 60]]} delay={500} />
      <Box x={78} y={12} w={24} d={30} h={10} z={8} delay={400} tone="hot" pulse={0} />
      <Box x={116} y={50} w={22} d={22} h={8} z={3} delay={300} pulse={1} />
      <Cylinder x={127} y={30} z={3} r={8} h={6} delay={360} pulse={2} />
      <Wire points={[[102, 30, 13], [116, 30, 13], [116, 56, 11]]} tone="hot" delay={900} />
      <Callout at={[10, 14, 8]} plate={[150, 96]} side="left" label="behind your login" delay={1000} />
      <Callout at={[102, 12, 18]} plate={[150, 96]} label="measure · check · send" tone="hot" delay={1100} />
      <Callout at={[138, 72, 11]} plate={[150, 96]} label="private kit" delay={1200} />
    </IsoScene>
  );
}

/** About: design as a stack of decisions, each with its reason. */
export function AboutScene() {
  return (
    <IsoScene plate={[140, 96]} top={40} label="A design as a stack of decisions" pulses={4}>
      <Plate w={140} d={96} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} x={30} y={24} w={60} d={48} h={6} z={3 + i * 8} delay={140 + i * 90} pulse={i} tone={i === 3 ? "hot" : "plain"} />
      ))}
      <Callout at={[90, 24, 35]} plate={[140, 96]} label="one accent" dy={-5} tone="hot" delay={1000} />
      <Callout at={[90, 24, 27]} plate={[140, 96]} label="never a shadow" dy={5} delay={1080} />
      <Callout at={[30, 72, 19]} plate={[140, 96]} side="left" label="type tightens as it grows" dy={-5} delay={1160} />
      <Callout at={[30, 72, 11]} plate={[140, 96]} side="left" label="8px rhythm" dy={5} delay={1240} />
    </IsoScene>
  );
}

/** LiveryBot: one visit, three screen sizes. */
export function BotScene() {
  return (
    <IsoScene plate={[150, 96]} top={22} label="One visit measuring a page at three screen sizes" pulses={3}>
      <Plate w={150} d={96} />
      <Box x={8} y={40} w={60} d={48} h={4} z={3} delay={120} pulse={0} />
      <TopLines x={8} y={40} z={7} lines={PAGE_LINES(60, 48)} delay={500} />
      <Box x={78} y={46} w={34} d={42} h={4} z={3} delay={200} pulse={1} />
      <TopLines x={78} y={46} z={7} lines={PAGE_LINES(34, 42)} delay={600} />
      <Box x={122} y={58} w={18} d={30} h={4} z={3} delay={280} pulse={2} />
      <Cylinder x={70} y={14} z={3} r={9} h={14} delay={360} tone="hot" />
      <Wire points={[[70, 14, 17], [38, 40, 7]]} tone="hot" dashed delay={900} />
      <Wire points={[[70, 14, 17], [95, 46, 7]]} tone="hot" dashed delay={1000} />
      <Wire points={[[70, 14, 17], [131, 58, 7]]} tone="hot" dashed delay={1100} />
      <Callout at={[70, 5, 17]} plate={[150, 96]} label="LiveryBot/1.0" tone="hot" delay={1200} />
      <Callout at={[8, 40, 7]} plate={[150, 96]} side="left" label="1440 · 768 · 390" delay={1300} />
    </IsoScene>
  );
}

/** Signing in: a key and a private shelf. */
export function AccountScene() {
  return (
    <IsoScene plate={[120, 84]} top={36} label="Your private kits, kept in your account" pulses={3}>
      <Plate w={120} d={84} />
      <Box x={10} y={14} w={60} d={56} h={26} z={3} delay={120} />
      <Box x={18} y={22} w={44} d={40} h={4} z={29} delay={220} tone="hot" pulse={0} />
      <Box x={84} y={20} w={26} d={22} h={8} z={3} delay={300} pulse={1} />
      <Box x={84} y={50} w={26} d={22} h={12} z={3} delay={360} pulse={2} />
      <Callout at={[62, 22, 33]} plate={[120, 84]} label="private until you publish" tone="hot" delay={1000} />
      <Callout at={[10, 70, 15]} plate={[120, 84]} side="left" label="your kits" delay={1100} />
    </IsoScene>
  );
}

/** 404: a gap in the plate where a page should be. */
export function MissingScene() {
  return (
    <IsoScene plate={[120, 84]} top={12} label="A missing page" pulses={2}>
      <Plate w={120} d={84} />
      <Box x={10} y={12} w={40} d={30} h={5} z={3} delay={120} pulse={0} />
      <Box x={10} y={46} w={40} d={30} h={5} z={3} delay={180} pulse={1} />
      <Box x={66} y={46} w={40} d={30} h={5} z={3} delay={240} />
      <Wire points={[[66, 12, 4], [106, 12, 4], [106, 42, 4], [66, 42, 4], [66, 12, 4]]} tone="hot" dashed delay={600} />
      <Callout at={[106, 12, 4]} plate={[120, 84]} label="404 · nothing here" tone="hot" delay={1000} />
    </IsoScene>
  );
}
