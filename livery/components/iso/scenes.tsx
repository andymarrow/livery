import { Box, Callout, Cone, Cylinder, IsoScene, Plane, Ticks, Wire } from "./Iso";

// One illustration per page, each a small object with a story: a calliper
// measuring a page, a bookshelf of kits, a palette of sites, a staircase of
// commits, a radar finding pages. World units: x runs down-right, y
// down-left, z up. Everything stands on a base plate; nothing floats.

const at = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function Plate({ w, d }: { w: number; d: number }) {
  return <Box x={0} y={0} w={w} d={d} h={3} tone="soft" />;
}

/** A page drawn on a standing face: header, heading, text, three cards. */
export function PageFace({ w, h, hot = false }: { w: number; h: number; hot?: boolean }) {
  const card = (w - 16) / 3;
  return (
    <>
      <line x1={4} y1={5} x2={w * 0.28} y2={5} />
      {[0, 1, 2].map((i) => <circle key={i} cx={w - 12 + i * 4} cy={5} r={0.9} className="p-faint" />)}
      <line x1={6} y1={h * 0.3} x2={w * 0.62} y2={h * 0.3} className={hot ? "p-hot" : ""} />
      <line x1={6} y1={h * 0.3 + 6} x2={w * 0.46} y2={h * 0.3 + 6} className="p-faint" />
      <line x1={6} y1={h * 0.3 + 10} x2={w * 0.38} y2={h * 0.3 + 10} className="p-faint" />
      {[0, 1, 2].map((i) => <rect key={i} x={5 + i * (card + 3)} y={h * 0.6} width={card} height={h * 0.3} rx={1.5} className="p-fill2" />)}
    </>
  );
}

/** Create: a calliper measures a standing page; the readings become kit layers. */
export function CreateScene() {
  const plate: [number, number] = [164, 100];
  return (
    <IsoScene plate={plate} top={66} label="A calliper measuring a web page, the readings stacking into kit files" pulses={3}>
      <Plate w={164} d={100} />
      <Box x={14} y={50} w={74} d={3} h={52} z={3} delay={100} />
      <Plane at={[14, 53, 55]} face="left" style={at(300)}>
        <PageFace w={74} h={52} hot />
        <line x1={2} y1={-9} x2={72} y2={-9} className="p-hot" />
        <line x1={6} y1={-12} x2={6} y2={13} className="p-hot" />
        <g className="iso-slide-x" style={{ "--dx": "40px" } as React.CSSProperties}>
          <line x1={6} y1={-12} x2={6} y2={13} className="p-hot" />
          <rect x={3} y={-14} width={6} height={4} rx={1} className="p-accent" />
        </g>
      </Plane>
      <Wire points={[[88, 76, 22], [102, 76, 22], [102, 40, 12], [116, 40, 12]]} tone="hot" dashed delay={700} />
      <Box x={116} y={22} w={42} d={36} h={5} z={3} delay={260} pulse={0} />
      <Box x={116} y={22} w={42} d={36} h={5} z={9} delay={340} pulse={1} />
      <Box x={116} y={22} w={42} d={36} h={5} z={15} delay={420} tone="hot" pulse={2} />
      <Plane at={[116, 22, 20]} style={at(600)}>
        <text x={5} y={10} className="p-text-hot">tokens.json</text>
        <line x1={5} y1={16} x2={30} y2={16} className="p-faint" />
        <line x1={5} y1={21} x2={24} y2={21} className="p-faint" />
      </Plane>
      <Callout at={[14, 53, 40]} plate={plate} side="left" label="your-site.com" delay={900} />
      <Callout at={[158, 58, 13]} plate={plate} label="components.md" dy={-4} delay={1100} />
      <Callout at={[158, 58, 7]} plate={plate} label="motion.md" dy={6} delay={1250} />
    </IsoScene>
  );
}

/** Explore: a bookshelf of kits, one pulled out, a magnifier on the floor. */
export function ExploreScene() {
  const plate: [number, number] = [150, 96];
  const lower = [6, 5, 8, 5, 7, 6, 5, 8, 6, 5, 7, 6];
  const upper = [5, 7, 6, 8, 5, 6, 7, 5, 6, 8];
  const place = (widths: number[]) => widths.reduce<number[]>((xs, w, i) => [...xs, i ? xs[i - 1] + widths[i - 1] + 1.5 : 16], []);
  const lx = place(lower);
  const ux = place(upper);
  return (
    <IsoScene plate={plate} top={70} label="A bookshelf of design kits with one pulled out" pulses={3}>
      <Plate w={150} d={96} />
      <Box x={10} y={18} w={4} d={26} h={64} z={3} delay={80} />
      <Box x={14} y={18} w={112} d={26} h={3} z={3} delay={120} />
      {lower.map((w, i) => (
        <Box key={`l${i}`} x={lx[i]} y={i === 7 ? 34 : 21} w={w} d={20} h={20 + ((i * 5) % 9)} z={6} delay={200 + i * 40} tone={i === 7 ? "hot" : "plain"} pulse={i === 7 ? 0 : undefined} />
      ))}
      <Box x={14} y={18} w={112} d={26} h={3} z={34} delay={300} />
      {upper.map((w, i) => (
        <Box key={`u${i}`} x={ux[i]} y={21} w={w} d={20} h={18 + ((i * 7) % 9)} z={37} delay={420 + i * 40} pulse={i === 3 ? 1 : i === 7 ? 2 : undefined} />
      ))}
      <Box x={14} y={18} w={112} d={26} h={3} z={64} delay={500} />
      <Box x={126} y={18} w={4} d={26} h={64} z={3} delay={540} />
      <Plane at={[44, 76, 3]} style={at(800)}>
        <circle cx={0} cy={0} r={10} className="p-hot" />
        <circle cx={0} cy={0} r={7} className="p-faint" />
        <line x1={7} y1={7} x2={18} y2={18} className="p-hot" />
        <g className="iso-ping">
          <circle cx={0} cy={0} r={6} className="p-hot" />
        </g>
      </Plane>
      <Callout at={[76, 54, 30]} plate={plate} label="this kit" tone="hot" delay={1000} />
      <Callout at={[10, 30, 60]} plate={plate} side="left" label="pages · tastes" delay={1100} />
      <Callout at={[44, 66, 3]} plate={plate} side="left" label="search" dy={8} delay={1250} />
    </IsoScene>
  );
}

/** Tastes: three sites drip into the wells of one palette. */
export function TastesScene() {
  const plate: [number, number] = [156, 104];
  const wells: [number, number][] = [
    [-14, -20],
    [6, -26],
    [24, -14],
    [26, 8],
    [10, 22],
  ];
  return (
    <IsoScene plate={plate} top={40} label="Three sites mixed on one palette into a taste" pulses={5}>
      <Plate w={156} d={104} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Box x={8 + i * 34} y={8} w={26} d={3} h={32} z={3} delay={120 + i * 100} />
          <Plane at={[8 + i * 34, 11, 35]} face="left" style={at(300 + i * 100)}>
            <PageFace w={26} h={32} />
          </Plane>
        </g>
      ))}
      <Cylinder x={100} y={66} z={3} r={34} h={4} delay={300} />
      <Plane at={[100, 66, 7]} style={at(500)}>
        <circle cx={-18} cy={12} r={6} className="p-fill2" />
        <circle cx={0} cy={0} r={30} className="p-faint" />
        <path d="M-6,6 C2,14 14,10 18,2" className="p-hot" />
      </Plane>
      {wells.map(([u, v], i) => (
        <Cylinder key={i} x={100 + u} y={66 + v} z={7} r={5} h={3} delay={600 + i * 120} pulse={i} tone={i === 2 ? "hot" : "plain"} />
      ))}
      {[0, 1, 2].map((i) => (
        <Wire key={`w${i}`} points={[[21 + i * 34, 11, 6], [21 + i * 34, 30 + i * 4, 6], [86 + i * 12, 46 + i * 2, 10]]} tone="hot" dashed delay={900 + i * 120} />
      ))}
      <Callout at={[8, 11, 25]} plate={plate} side="left" label="three sites" delay={1100} />
      <Callout at={[134, 66, 7]} plate={plate} label="one taste" tone="hot" delay={1250} />
    </IsoScene>
  );
}

/** Agents: a terminal, a staircase of commits, a flag at the top. */
export function AgentsScene() {
  const plate: [number, number] = [156, 100];
  return (
    <IsoScene plate={plate} top={70} label="A terminal and a staircase of commits, one per area" pulses={4}>
      <Plate w={156} d={100} />
      <Box x={8} y={10} w={60} d={3} h={44} z={3} delay={100} />
      <Plane at={[8, 13, 47]} face="left" style={at(300)}>
        <rect x={2} y={2} width={56} height={40} rx={2} className="p-fill2" />
        <text x={5} y={10} className="p-text-hot">$ apply kit</text>
        <line x1={5} y1={16} x2={40} y2={16} className="p-faint" />
        <line x1={5} y1={21} x2={32} y2={21} className="p-faint" />
        <line x1={5} y1={26} x2={44} y2={26} className="p-faint" />
        <rect x={5} y={31} width={4} height={5} className="p-accent iso-blink" />
      </Plane>
      {[3, 2, 1, 0].map((i) => {
        const x = 110 - i * 22;
        return (
          <g key={i}>
            <Box x={x} y={44} w={22} d={40} h={10 * (i + 1)} z={3} delay={260 + (3 - i) * 120} pulse={i} tone={i === 3 ? "hot" : "plain"} />
            <Plane at={[x, 44, 3 + 10 * (i + 1)]} style={at(500 + (3 - i) * 120)}>
              <text x={4} y={10} className={i === 3 ? "p-text-hot" : "p-text"}>{String(i + 1).padStart(2, "0")}</text>
            </Plane>
          </g>
        );
      })}
      <Box x={60} y={54} w={1.6} d={1.6} h={24} z={43} delay={900} tone="hot" />
      <Plane at={[61.6, 55.6, 67]} face="left" style={at(1000)}>
        <path d="M0,0 L16,2 L13,6 L16,10 L0,9 Z" className="p-accent iso-wave-a" />
        <path d="M0,0 L16,0 L13,5 L16,9 L0,9 Z" className="p-accent iso-wave-b" />
      </Plane>
      <Callout at={[8, 13, 40]} plate={plate} side="left" label="your agent" delay={1100} />
      <Callout at={[132, 84, 13]} plate={plate} label="tokens first" delay={1200} />
      <Callout at={[62, 54, 67]} plate={plate} label="one commit per area" tone="hot" delay={1350} />
    </IsoScene>
  );
}

/** How it works: a page rides a belt under a press and comes out a kit. */
export function HowItWorksScene() {
  const plate: [number, number] = [176, 84];
  return (
    <IsoScene plate={plate} top={64} label="A production line: a page is pressed into a kit and applied" pulses={3}>
      <Plate w={176} d={84} />
      <Box x={4} y={30} w={168} d={24} h={6} z={3} delay={80} />
      <Plane at={[4, 30, 9]} style={at(200)}>
        <g className="iso-belt">
          {Array.from({ length: 16 }, (_, i) => <line key={i} x1={6 + i * 12} y1={2} x2={6 + i * 12} y2={22} className="p-faint" />)}
        </g>
      </Plane>
      <Box x={16} y={36} w={26} d={3} h={30} z={9} delay={200} pulse={0} />
      <Plane at={[16, 39, 39]} face="left" style={at(400)}>
        <PageFace w={26} h={30} />
      </Plane>
      <Box x={70} y={26} w={3} d={3} h={44} z={9} delay={260} />
      <Box x={70} y={55} w={3} d={3} h={44} z={9} delay={280} />
      <Box x={70} y={34} w={18} d={16} h={6} z={9} delay={320} tone="hot" pulse={1} />
      <g className="iso-press" style={{ "--dy": "9px" } as React.CSSProperties}>
        <Box x={72} y={36} w={14} d={12} h={8} z={24} delay={360} />
      </g>
      <Box x={66} y={24} w={26} d={36} h={6} z={53} delay={400} />
      <Box x={128} y={36} w={36} d={3} h={38} z={9} delay={460} pulse={2} />
      <Plane at={[128, 39, 47]} face="left" style={at(600)}>
        <rect x={2} y={2} width={32} height={34} rx={2} className="p-fill2" />
        {[6, 11, 16, 21, 26].map((v, i) => <line key={v} x1={5 + (i % 3) * 4} y1={v} x2={20 + ((i * 7) % 10)} y2={v} className={i === 2 ? "p-hot" : "p-faint"} />)}
      </Plane>
      <Callout at={[16, 39, 30]} plate={plate} side="left" label="measured" delay={900} />
      <Callout at={[92, 24, 59]} plate={plate} label="written down" tone="hot" dy={-4} delay={1050} />
      <Callout at={[164, 39, 30]} plate={plate} label="applied with you" delay={1200} />
    </IsoScene>
  );
}

/** Owners: a building, its flag, its livery.json, and the opt-in switch. */
export function OwnersScene() {
  const plate: [number, number] = [156, 100];
  return (
    <IsoScene plate={plate} top={66} label="A website as a building with its owner's flag, livery.json and an opt-in switch" pulses={1}>
      <Plate w={156} d={100} />
      <Box x={18} y={18} w={62} d={50} h={32} z={3} delay={100} />
      <Plane at={[18, 68, 35]} face="left" style={at(300)}>
        {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={6 + c * 13} y={5 + r * 10} width={8} height={6} rx={1} className="p-fill2" />))}
        <rect x={26} y={22} width={10} height={10} rx={1} className="p-hot" />
      </Plane>
      <Box x={66} y={24} w={2} d={2} h={28} z={35} delay={500} tone="hot" />
      <Plane at={[68, 26, 63]} face="left" style={at(700)}>
        <path d="M0,0 L18,2 L14,7 L18,12 L0,11 Z" className="p-accent iso-wave-a" />
        <path d="M0,0 L18,0 L14,6 L18,11 L0,11 Z" className="p-accent iso-wave-b" />
      </Plane>
      <Box x={100} y={62} w={34} d={3} h={36} z={3} delay={300} pulse={0} />
      <Plane at={[100, 65, 39]} face="left" style={at(500)}>
        <text x={4} y={8} className="p-text-hot">livery.json</text>
        <line x1={4} y1={14} x2={22} y2={14} className="p-faint" />
        <line x1={8} y1={19} x2={28} y2={19} className="p-faint" />
        <line x1={8} y1={24} x2={24} y2={24} className="p-faint" />
        <line x1={4} y1={29} x2={12} y2={29} className="p-faint" />
      </Plane>
      <Plane at={[106, 20, 3]} style={at(600)}>
        <rect x={0} y={0} width={30} height={12} rx={6} className="p-fill" />
        <g className="iso-slide-x" style={{ "--dx": "18px" } as React.CSSProperties}>
          <circle cx={6} cy={6} r={4.2} className="p-accent" />
        </g>
      </Plane>
      <Callout at={[134, 65, 30]} plate={plate} label="livery.json" tone="hot" dy={10} delay={1000} />
      <Callout at={[136, 26, 3]} plate={plate} label="opt in · opt out" dy={-16} delay={1150} />
      <Callout at={[18, 50, 30]} plate={plate} side="left" label="your site" delay={1300} />
    </IsoScene>
  );
}

/** FAQ: a shield on a pedestal behind a guardrail; a page it refused. */
export function FaqScene() {
  const plate: [number, number] = [156, 100];
  return (
    <IsoScene plate={plate} top={56} label="A shield behind a guardrail, keeping refused pages out" pulses={3}>
      <Plate w={156} d={100} />
      <Box x={110} y={10} w={30} d={3} h={34} z={3} delay={120} />
      <Plane at={[110, 13, 37]} face="left" style={at(300)}>
        <PageFace w={30} h={34} />
        <path d="M6,6 L24,28 M24,6 L6,28" className="p-hot" />
      </Plane>
      <Box x={54} y={36} w={34} d={32} h={8} z={3} delay={200} />
      <Box x={58} y={52} w={26} d={3} h={42} z={11} delay={300} tone="hot" pulse={0} />
      <Plane at={[58, 55, 53]} face="left" style={at(500)}>
        <path d="M13,3 L23,7 L23,18 C23,28 13,36 13,36 C13,36 3,28 3,18 L3,7 Z" className="p-hot" />
        <path d="M8,19 L12,23 L19,14" className="p-hot" />
      </Plane>
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} x={8 + i * 18} y={88} w={2.5} d={2.5} h={16} z={3} tone="soft" delay={400 + i * 40} pulse={i === 3 ? 1 : i === 6 ? 2 : undefined} />
      ))}
      <Wire points={[[8, 89, 16], [136, 89, 16]]} tone="hot" delay={800} />
      <Wire points={[[8, 89, 10], [136, 89, 10]]} tone="soft" delay={900} />
      <Callout at={[140, 13, 25]} plate={plate} label="refused" tone="hot" delay={1100} />
      <Callout at={[8, 88, 16]} plate={plate} side="left" label="never signs in" delay={1250} />
    </IsoScene>
  );
}

/** Extension: a signed-in browser window, a scan passing over it, a padlock. */
export function ExtensionScene() {
  const plate: [number, number] = [164, 100];
  return (
    <IsoScene plate={plate} top={64} label="A signed-in browser window scanned by the extension, with a padlock" pulses={2}>
      <Plate w={164} d={100} />
      <Box x={10} y={36} w={100} d={3} h={58} z={3} delay={100} />
      <Plane at={[10, 39, 61]} face="left" style={at(300)}>
        <line x1={0} y1={8} x2={100} y2={8} />
        {[0, 1, 2].map((i) => <circle key={i} cx={5 + i * 4} cy={4} r={1} className="p-faint" />)}
        <rect x={22} y={2} width={46} height={4} rx={2} className="p-fill2" />
        <rect x={4} y={14} width={18} height={38} rx={1.5} className="p-fill2" />
        {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={28 + c * 24} y={14 + r * 20} width={20} height={16} rx={1.5} className={r === 0 && c === 1 ? "p-hot" : "p-fill2"} />))}
        <g className="iso-slide-y" style={{ "--dy": "40px" } as React.CSSProperties}>
          <line x1={0} y1={12} x2={100} y2={12} className="p-hot" />
        </g>
      </Plane>
      <Box x={92} y={58} w={26} d={3} h={34} z={3} delay={420} pulse={0} />
      <Plane at={[92, 61, 37]} face="left" style={at(600)}>
        <line x1={3} y1={4} x2={14} y2={4} />
        <rect x={3} y={8} width={20} height={6} rx={1.5} className="p-hot" />
        <rect x={3} y={16} width={20} height={6} rx={1.5} className="p-fill2" />
        <rect x={3} y={26} width={20} height={5} rx={2.5} className="p-accent" />
      </Plane>
      <Box x={130} y={30} w={20} d={14} h={14} z={3} delay={300} pulse={1} />
      <Plane at={[130, 44, 17]} face="left" style={at(500)}>
        <path d="M3,0 V-6 A7 7 0 0 1 17,-6 V0" className="p-hot" />
        <circle cx={10} cy={6} r={1.6} className="p-ink" />
        <line x1={10} y1={7} x2={10} y2={10} />
      </Plane>
      <Callout at={[10, 39, 50]} plate={plate} side="left" label="behind your login" delay={1000} />
      <Callout at={[118, 61, 25]} plate={plate} label="check · send" tone="hot" dy={12} delay={1150} />
      <Callout at={[150, 30, 17]} plate={plate} label="private" dy={-12} delay={1300} />
    </IsoScene>
  );
}

/** About: a dial of decisions, its hands turning slowly. */
export function AboutScene() {
  const plate: [number, number] = [140, 104];
  return (
    <IsoScene plate={plate} top={20} label="A dial of design decisions" pulses={1}>
      <Plate w={140} d={104} />
      <Cylinder x={70} y={52} z={3} r={42} h={8} delay={120} />
      <Plane at={[70, 52, 11]} style={at(300)}>
        <circle cx={0} cy={0} r={40} className="p-faint" />
        <Ticks r={38} count={60} />
        <circle cx={0} cy={0} r={24} className="p-faint" />
        <text x={0} y={-27} textAnchor="middle" className="p-text-hot">accent</text>
        <text x={27} y={2} textAnchor="middle" className="p-text">type</text>
        <text x={0} y={31} textAnchor="middle" className="p-text">rhythm</text>
        <text x={-27} y={2} textAnchor="middle" className="p-text">depth</text>
        <g className="iso-turn">
          <line x1={0} y1={0} x2={0} y2={-33} className="p-hot" />
          <circle cx={0} cy={-33} r={1.6} className="p-accent" />
        </g>
        <g className="iso-turn-back">
          <line x1={0} y1={0} x2={18} y2={0} />
        </g>
      </Plane>
      <Cylinder x={70} y={52} z={11} r={4} h={3} delay={600} tone="hot" pulse={0} />
      <Callout at={[100, 22, 11]} plate={plate} label="one accent" tone="hot" delay={1000} />
      <Callout at={[40, 82, 11]} plate={plate} side="left" label="never a shadow" delay={1150} />
    </IsoScene>
  );
}

/** LiveryBot: a radar sweep finding pages at three screen sizes. */
export function BotScene() {
  const plate: [number, number] = [150, 100];
  const pages = [
    { x: 18, y: 16, w: 28, h: 20 },
    { x: 116, y: 30, w: 16, h: 20 },
    { x: 102, y: 80, w: 9, h: 18 },
  ];
  return (
    <IsoScene plate={plate} top={34} label="A radar sweep finding pages at three screen sizes" pulses={3}>
      <Plate w={150} d={100} />
      <Plane at={[75, 50, 3]} style={at(200)}>
        {[16, 32, 46].map((r) => <circle key={r} cx={0} cy={0} r={r} className="p-faint" />)}
        <line x1={-46} y1={0} x2={46} y2={0} className="p-faint" />
        <line x1={0} y1={-46} x2={0} y2={46} className="p-faint" />
        <g className="iso-turn-fast">
          <path d="M0,0 L46,0 A46 46 0 0 0 32.5,-32.5 Z" className="p-faint" />
          <line x1={0} y1={0} x2={46} y2={0} className="p-hot" />
        </g>
      </Plane>
      {pages.map((p, i) => (
        <g key={i}>
          <Plane at={[p.x + p.w / 2, p.y + 1.5, 3]}>
            <g className="iso-ping" style={{ animationDelay: `${i * 800}ms` }}>
              <circle cx={0} cy={0} r={6} className="p-hot" />
            </g>
          </Plane>
          <Box x={p.x} y={p.y} w={p.w} d={3} h={p.h} z={3} delay={300 + i * 120} pulse={i} />
        </g>
      ))}
      <Cylinder x={75} y={50} z={3} r={7} h={10} delay={500} />
      <Box x={74.2} y={49.2} w={1.6} d={1.6} h={12} z={13} delay={600} tone="hot" />
      <Cylinder x={75} y={50} z={25} r={2.2} h={2} delay={700} tone="hot" />
      <Callout at={[75, 43, 27]} plate={plate} label="LiveryBot" tone="hot" dy={-8} delay={1000} />
      <Callout at={[18, 19, 16]} plate={plate} side="left" label="1440 · 768 · 390" delay={1150} />
    </IsoScene>
  );
}

/** Signing in: a safe with a turning combination dial; your kits beside it. */
export function AccountScene() {
  const plate: [number, number] = [124, 90];
  return (
    <IsoScene plate={plate} top={52} label="A safe holding your private kits" pulses={3}>
      <Plate w={124} d={90} />
      <Box x={14} y={14} w={58} d={52} h={48} z={3} delay={120} />
      <Plane at={[14, 66, 51]} face="left" style={at(300)}>
        <rect x={4} y={4} width={50} height={40} rx={2} className="p-faint" />
        <g transform="translate(26 22)">
          <circle cx={0} cy={0} r={11} className="p-fill" />
          <Ticks r={11} count={24} long={6} inner={2} outer={3.5} />
          <g className="iso-turn">
            <line x1={0} y1={0} x2={0} y2={-8} className="p-hot" />
          </g>
          <circle cx={0} cy={0} r={2} className="p-accent" />
        </g>
        <line x1={46} y1={16} x2={46} y2={28} className="p-hot" />
      </Plane>
      <Box x={88} y={44} w={24} d={22} h={5} z={3} delay={400} pulse={0} />
      <Box x={88} y={44} w={24} d={22} h={5} z={9} delay={480} pulse={1} />
      <Box x={88} y={44} w={24} d={22} h={5} z={15} delay={560} tone="hot" pulse={2} />
      <Callout at={[72, 14, 51]} plate={plate} label="private until you publish" tone="hot" delay={1000} />
      <Callout at={[14, 50, 30]} plate={plate} side="left" label="your kits" delay={1150} />
    </IsoScene>
  );
}

/** 404: a missing tile, fenced off with a traffic cone. */
export function MissingScene() {
  const plate: [number, number] = [124, 88];
  return (
    <IsoScene plate={plate} top={24} label="A missing tile with a traffic cone" pulses={3}>
      <Plate w={124} d={88} />
      <Box x={8} y={8} w={50} d={34} h={5} z={3} delay={120} pulse={0} />
      <Box x={8} y={46} w={50} d={34} h={5} z={3} delay={180} pulse={1} />
      <Box x={66} y={46} w={50} d={34} h={5} z={3} delay={240} pulse={2} />
      <Wire points={[[66, 8, 4], [116, 8, 4], [116, 42, 4], [66, 42, 4], [66, 8, 4]]} tone="hot" dashed delay={500} />
      <Cone x={91} y={25} z={3} r={8} h={20} stripes={2} tone="hot" delay={700} />
      <Callout at={[116, 8, 4]} plate={plate} label="404 · nothing here" tone="hot" delay={1000} />
    </IsoScene>
  );
}
