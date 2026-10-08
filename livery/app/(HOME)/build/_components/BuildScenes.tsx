import { Box, Callout, Cylinder, IsoScene, Plane, Ticks, Wire } from "@/components/iso/Iso";
import { PageFace } from "@/components/iso/scenes";
import type { BuildStage } from "@/lib/extract/types";

// One isometric scene per build stage, each a small machine doing that
// stage's job. Mounted when its stage starts, so its lines draw in then; the
// moving parts (a radar, a calliper, a cursor, a press, a globe) keep it
// alive until the next stage.

const at = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function Plate({ w, d }: { w: number; d: number }) {
  return <Box x={0} y={0} w={w} d={d} h={3} tone="soft" />;
}

/** Checking: LiveryBot's radar finds the site; robots.txt and livery.json are read. */
function Checking({ host }: { host: string }) {
  const plate: [number, number] = [150, 96];
  return (
    <IsoScene plate={plate} top={40} label={`Checking ${host}`} pulses={2}>
      <Plate w={150} d={96} />
      <Plane at={[44, 50, 3]} style={at(150)}>
        {[14, 28, 40].map((r) => <circle key={r} cx={0} cy={0} r={r} className="p-faint" />)}
        <g className="iso-turn-fast">
          <path d="M0,0 L40,0 A40 40 0 0 0 28.3,-28.3 Z" className="p-faint" />
          <line x1={0} y1={0} x2={40} y2={0} className="p-hot" />
        </g>
      </Plane>
      <Cylinder x={44} y={50} z={3} r={6} h={9} delay={250} />
      <Box x={43.2} y={49.2} w={1.6} d={1.6} h={10} z={12} delay={300} tone="hot" />
      <Box x={96} y={22} w={44} d={3} h={36} z={3} delay={200} pulse={0} />
      <Plane at={[96, 25, 39]} face="left" style={at(400)}>
        <PageFace w={44} h={36} hot />
      </Plane>
      <Box x={100} y={62} w={28} d={3} h={20} z={3} delay={350} tone="hot" pulse={1} />
      <Plane at={[100, 65, 23]} face="left" style={at(600)}>
        <text x={3} y={7} className="p-text-hot">livery.json</text>
        <line x1={3} y1={12} x2={18} y2={12} className="p-faint" />
      </Plane>
      <Wire points={[[44, 50, 12], [96, 36, 20]]} tone="hot" dashed delay={700} />
      <Callout at={[38, 50, 12]} plate={plate} side="left" label="LiveryBot" delay={900} />
      <Callout at={[140, 25, 30]} plate={plate} label="robots.txt" dy={-6} delay={1100} />
      <Callout at={[128, 65, 12]} plate={plate} label="livery.json" tone="hot" dy={6} delay={1300} />
    </IsoScene>
  );
}

/** Rendering: three screens stand up, one per width, each drawing its page. */
function Rendering() {
  const plate: [number, number] = [164, 90];
  const screens = [
    { x: 8, w: 70, h: 46, label: "1440px" },
    { x: 88, w: 40, h: 46, label: "820px" },
    { x: 138, w: 20, h: 40, label: "390px" },
  ];
  return (
    <IsoScene plate={plate} top={52} label="Rendering at three screen sizes" pulses={3}>
      <Plate w={164} d={90} />
      {screens.map((s, i) => (
        <g key={s.label}>
          <Box x={s.x} y={50} w={s.w} d={3} h={s.h} z={3} delay={100 + i * 600} pulse={i} tone={i === 2 ? "hot" : "plain"} />
          <Plane at={[s.x, 53, 3 + s.h]} face="left" style={at(400 + i * 600)}>
            <PageFace w={s.w} h={s.h} hot={i === 2} />
          </Plane>
        </g>
      ))}
      <Callout at={[8, 53, 40]} plate={plate} side="left" label="1440px" delay={600} />
      <Callout at={[128, 53, 44]} plate={plate} label="820px" dy={-8} delay={1300} />
      <Callout at={[158, 53, 30]} plate={plate} label="390px" tone="hot" dy={6} delay={1900} />
    </IsoScene>
  );
}

/** Measuring: a calliper on the page, a dial reading, colours filling wells. */
function Measuring() {
  const plate: [number, number] = [160, 96];
  return (
    <IsoScene plate={plate} top={66} label="Measuring the design" pulses={5}>
      <Plate w={160} d={96} />
      <Box x={10} y={46} w={74} d={3} h={50} z={3} delay={100} />
      <Plane at={[10, 49, 53]} face="left" style={at(300)}>
        <PageFace w={74} h={50} hot />
        <line x1={2} y1={-9} x2={72} y2={-9} className="p-hot" />
        <line x1={6} y1={-12} x2={6} y2={13} className="p-hot" />
        <g className="iso-slide-x" style={{ "--dx": "40px" } as React.CSSProperties}>
          <line x1={6} y1={-12} x2={6} y2={13} className="p-hot" />
          <rect x={3} y={-14} width={6} height={4} rx={1} className="p-accent" />
        </g>
      </Plane>
      <Cylinder x={122} y={30} z={3} r={18} h={5} delay={300} />
      <Plane at={[122, 30, 8]} style={at(500)}>
        <Ticks r={16} count={40} />
        <g className="iso-turn-fast">
          <line x1={0} y1={0} x2={0} y2={-13} className="p-hot" />
        </g>
      </Plane>
      {[0, 1, 2, 3, 4].map((i) => (
        <Cylinder key={i} x={104 + i * 11} y={74} z={3} r={4.5} h={3 + ((i * 3) % 5)} delay={700 + i * 220} pulse={i} tone={i === 2 ? "hot" : "plain"} />
      ))}
      <Callout at={[10, 49, 40]} plate={plate} side="left" label="spacing · type" delay={900} />
      <Callout at={[140, 30, 8]} plate={plate} label="motion" dy={-6} delay={1100} />
      <Callout at={[148, 74, 6]} plate={plate} label="colour" tone="hot" dy={6} delay={1400} />
    </IsoScene>
  );
}

/** Writing: a document stands up and its rules type themselves in. */
function Writing() {
  const plate: [number, number] = [140, 96];
  const lines = [52, 40, 46, 0, 30, 44, 36];
  return (
    <IsoScene plate={plate} top={70} label="Writing the rules" pulses={2}>
      <Plate w={140} d={96} />
      <Box x={22} y={20} w={64} d={3} h={66} z={3} delay={100} pulse={0} />
      <Plane at={[22, 23, 69]} face="left" style={at(300)}>
        <text x={5} y={9} className="p-text-hot">rules.md</text>
        <line x1={5} y1={13} x2={59} y2={13} className="p-faint" />
        {lines.map((w, i) =>
          w ? <line key={i} x1={8} y1={20 + i * 6} x2={8 + w} y2={20 + i * 6} pathLength={1} className="iso-draw p-faint" style={at(600 + i * 450)} /> : null,
        )}
        <text x={5} y={39} className="p-text">never</text>
        <rect x={8} y={60} width={2.5} height={5} className="p-accent iso-blink" />
      </Plane>
      <Box x={96} y={56} w={30} d={26} h={4} z={3} delay={250} />
      <Box x={98} y={58} w={26} d={22} h={4} z={7} delay={320} tone="hot" pulse={1} />
      <Callout at={[86, 23, 60]} plate={plate} label="principles" tone="hot" delay={1000} />
      <Callout at={[22, 23, 30]} plate={plate} side="left" label="never" delay={1300} />
    </IsoScene>
  );
}

/** Packaging: the files drop into a crate under a press; the hash is sealed. */
function Packaging() {
  const plate: [number, number] = [140, 96];
  const files = ["SKILL.md", "tokens.json", "components.md", "motion.md"];
  return (
    <IsoScene plate={plate} top={70} label="Packaging the kit" pulses={4}>
      <Plate w={140} d={96} />
      <Box x={36} y={26} w={56} d={50} h={14} z={3} delay={100} tone="soft" />
      {files.map((f, i) => (
        <Box key={f} x={42} y={32} w={44} d={38} h={3} z={17 + i * 5} delay={350 + i * 280} pulse={i} tone={i === files.length - 1 ? "hot" : "plain"} />
      ))}
      <Plane at={[42, 32, 35]} style={at(1500)}>
        <text x={4} y={9} className="p-text-hot">kit.tar.gz</text>
        <text x={4} y={17} className="p-text">sha256 ✓</text>
      </Plane>
      <Box x={32} y={22} w={3} d={3} h={67} z={3} delay={200} />
      <Box x={93} y={22} w={3} d={3} h={67} z={3} delay={220} />
      <g className="iso-press" style={{ "--dy": "8px" } as React.CSSProperties}>
        <Box x={40} y={30} w={48} d={42} h={4} z={56} delay={260} />
      </g>
      <Box x={30} y={20} w={68} d={56} h={4} z={70} delay={300} tone="soft" />
      <Callout at={[86, 32, 35]} plate={plate} label="kit.tar.gz" tone="hot" delay={1700} />
      <Callout at={[36, 76, 10]} plate={plate} side="left" label="sha256 verified" delay={1900} />
    </IsoScene>
  );
}

/** Publishing: the kit goes out on a wire to a turning globe: a permanent link. */
function Publishing({ host }: { host: string }) {
  const plate: [number, number] = [150, 90];
  return (
    <IsoScene plate={plate} top={56} label="Publishing the kit" pulses={1}>
      <Plate w={150} d={90} />
      <Box x={12} y={34} w={40} d={36} h={14} z={3} delay={100} />
      <Box x={12} y={34} w={40} d={36} h={4} z={17} delay={220} tone="hot" pulse={0} />
      <Wire points={[[52, 52, 10], [86, 52, 10], [100, 46, 14]]} tone="hot" dashed delay={500} />
      <Cylinder x={114} y={44} z={3} r={14} h={4} delay={300} />
      <Box x={113.2} y={43.2} w={1.6} d={1.6} h={10} z={7} delay={350} />
      <Plane at={[114, 44, 41]} face="left" style={at(500)}>
        <circle cx={0} cy={0} r={17} className="p-fill" />
        <ellipse cx={0} cy={0} rx={17} ry={6} className="p-faint" />
        <line x1={-17} y1={0} x2={17} y2={0} className="p-faint" />
        <g className="iso-slide-x" style={{ "--dx": "-14px" } as React.CSSProperties}>
          <ellipse cx={7} cy={0} rx={6} ry={17} className="p-hot" />
        </g>
        <ellipse cx={0} cy={0} rx={10} ry={17} className="p-faint" />
      </Plane>
      <Callout at={[131, 44, 41]} plate={plate} label={`/k/${host.replace(/\./g, "-")}`} tone="hot" delay={900} />
      <Callout at={[12, 70, 12]} plate={plate} side="left" label="permanent" delay={1100} />
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
