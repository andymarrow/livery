import { Box, Callout, Cylinder, IsoScene, TopLines, Wire } from "@/components/iso/Iso";
import type { BuildStage } from "@/lib/extract/types";

// One isometric scene per build stage, in the site's hairline style. Each is
// mounted when its stage starts, so its lines draw in then; a slow highlight,
// marching paths and a sweeping scan keep it alive until the next stage.

const PAGE = (w: number, d: number): [number, number, number, number][] => [
  [4, 4, w * 0.35, 4],
  [w - 14, 4, w - 4, 4],
  [4, 11, w * 0.7, 11],
  [4, 16, w * 0.5, 16],
  [4, d - 9, w * 0.3, d - 9],
  [w * 0.38, d - 9, w * 0.64, d - 9],
  [w * 0.72, d - 9, w - 4, d - 9],
];

function Plate({ w, d }: { w: number; d: number }) {
  return <Box x={0} y={0} w={w} d={d} h={3} tone="soft" />;
}

function Checking({ host }: { host: string }) {
  const plate: [number, number] = [150, 96];
  return (
    <IsoScene plate={plate} top={30} label={`Checking ${host}`} pulses={3}>
      <Plate w={150} d={96} />
      <Box x={70} y={18} w={66} d={56} h={18} z={3} delay={100} />
      <TopLines x={70} y={18} z={21} lines={PAGE(66, 56)} delay={400} />
      <Box x={58} y={14} w={4} d={64} h={12} z={3} tone="hot" delay={250} pulse={0} />
      <Cylinder x={18} y={46} z={3} r={9} h={14} delay={200} pulse={1} />
      <Wire points={[[18, 46, 17], [40, 46, 17], [56, 46, 15]]} tone="hot" dashed delay={700} />
      <Box x={110} y={78} w={18} d={12} h={3} z={3} tone="hot" delay={500} pulse={2} />
      <Callout at={[18, 37, 17]} plate={plate} side="left" label="LiveryBot" delay={900} />
      <Callout at={[62, 14, 15]} plate={plate} label="robots.txt" tone="hot" dy={-6} delay={1100} />
      <Callout at={[128, 78, 6]} plate={plate} label="livery.json" dy={6} delay={1300} />
    </IsoScene>
  );
}

function Rendering() {
  const plate: [number, number] = [160, 96];
  return (
    <IsoScene plate={plate} top={14} label="Rendering at three screen sizes" pulses={3}>
      <Plate w={160} d={96} />
      <Box x={8} y={34} w={70} d={54} h={5} z={3} delay={100} pulse={0} />
      <TopLines x={8} y={34} z={8} lines={PAGE(70, 54)} delay={500} />
      <Box x={88} y={40} w={38} d={48} h={5} z={3} delay={900} pulse={1} />
      <TopLines x={88} y={40} z={8} lines={PAGE(38, 48)} delay={1300} />
      <Box x={136} y={52} w={18} d={36} h={5} z={3} delay={1700} tone="hot" pulse={2} />
      <TopLines x={136} y={52} z={8} lines={[[3, 4, 12, 4], [3, 10, 15, 10], [3, 15, 10, 15], [3, 28, 15, 28]]} tone="hot" delay={2100} />
      <Callout at={[8, 34, 8]} plate={plate} side="left" label="1440px" delay={700} />
      <Callout at={[126, 40, 8]} plate={plate} label="820px" dy={-6} delay={1500} />
      <Callout at={[154, 52, 8]} plate={plate} label="390px" tone="hot" dy={6} delay={2300} />
    </IsoScene>
  );
}

function Measuring() {
  const plate: [number, number] = [150, 96];
  return (
    <IsoScene plate={plate} top={34} label="Measuring the design" pulses={5}>
      <Plate w={150} d={96} />
      <Box x={8} y={20} w={84} d={68} h={5} z={3} delay={100} />
      <TopLines x={8} y={20} z={8} lines={PAGE(84, 68)} delay={300} />
      <g className="iso-sweep">
        <Wire points={[[8, 22, 9], [92, 22, 9]]} tone="hot" delay={200} />
      </g>
      {[0, 1, 2, 3, 4].map((i) => (
        <Cylinder key={i} x={112 + (i % 2) * 18} y={18 + i * 15} z={3} r={6} h={6 + ((i * 7) % 5) * 4} delay={600 + i * 220} pulse={i} tone={i === 2 ? "hot" : "plain"} />
      ))}
      <Callout at={[8, 20, 8]} plate={plate} side="left" label="spacing · type" delay={900} />
      <Callout at={[92, 88, 8]} plate={plate} side="left" label="corners · motion" dy={8} delay={1200} />
      <Callout at={[130, 48, 21]} plate={plate} label="colour" tone="hot" delay={1700} />
    </IsoScene>
  );
}

function Writing() {
  const plate: [number, number] = [130, 96];
  return (
    <IsoScene plate={plate} top={30} label="Writing the rules" pulses={3}>
      <Plate w={130} d={96} />
      {[0, 1, 2].map((i) => (
        <Box key={i} x={24 + i * 4} y={18 - i * 4} w={60} d={66} h={3} z={3 + i * 6} delay={150 + i * 200} pulse={i} tone={i === 2 ? "hot" : "plain"} />
      ))}
      <TopLines
        x={32}
        y={10}
        z={18}
        tone="hot"
        delay={800}
        lines={[[5, 6, 26, 6], [5, 13, 52, 13], [5, 19, 46, 19], [5, 25, 50, 25], [5, 36, 20, 36], [5, 43, 44, 43], [5, 49, 38, 49], [5, 58, 30, 58]]}
      />
      <Callout at={[92, 10, 18]} plate={plate} label="rules.md" tone="hot" delay={1200} />
      <Callout at={[24, 84, 6]} plate={plate} side="left" label="principles · never" delay={1500} />
    </IsoScene>
  );
}

function Packaging() {
  const plate: [number, number] = [130, 96];
  const files = ["SKILL.md", "tokens.json", "components.md", "motion.md", "frames/"];
  return (
    <IsoScene plate={plate} top={46} label="Packaging the kit" pulses={5}>
      <Plate w={130} d={96} />
      <Box x={30} y={22} w={56} d={50} h={8} z={3} delay={100} tone="soft" />
      {files.map((file, i) => (
        <Box key={file} x={36} y={28} w={44} d={38} h={4} z={11 + i * 6} delay={400 + i * 320} pulse={i} tone={i === files.length - 1 ? "hot" : "plain"} />
      ))}
      <Callout at={[80, 28, 39]} plate={plate} label="SKILL.md · tokens.json" tone="hot" delay={2100} />
      <Callout at={[30, 72, 7]} plate={plate} side="left" label="sha256 verified" delay={2400} />
    </IsoScene>
  );
}

function Publishing({ host }: { host: string }) {
  const plate: [number, number] = [150, 90];
  return (
    <IsoScene plate={plate} top={30} label="Publishing the kit" pulses={2}>
      <Plate w={150} d={90} />
      <Box x={14} y={30} w={44} d={40} h={16} z={3} delay={100} pulse={0} />
      <Box x={14} y={30} w={44} d={40} h={4} z={19} delay={250} tone="hot" />
      <Wire points={[[58, 50, 12], [96, 50, 12], [112, 50, 8]]} tone="hot" dashed delay={600} />
      <Cylinder x={122} y={50} z={3} r={14} h={6} delay={500} pulse={1} />
      <Cylinder x={122} y={50} z={9} r={9} h={4} delay={650} tone="hot" />
      <Callout at={[136, 50, 13]} plate={plate} label={`/k/${host.replace(/\./g, "-")}`} tone="hot" delay={900} />
      <Callout at={[14, 70, 11]} plate={plate} side="left" label="permanent · versioned" delay={1100} />
    </IsoScene>
  );
}

export function BuildScene({ stage, host }: { stage: BuildStage; host: string }) {
  switch (stage) {
    case "checking":
      return <Checking host={host} />;
    case "rendering":
      return <Rendering />;
    case "extracting":
      return <Measuring />;
    case "writing":
      return <Writing />;
    case "packaging":
      return <Packaging />;
    default:
      return <Publishing host={host} />;
  }
}
