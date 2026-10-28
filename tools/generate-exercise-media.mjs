// Original, editable SVG movement diagrams. No external images or image API.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXERCISES } from "../cloudflare-worker/src/exercise-library.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = `${root}assets/exercises`;
mkdirSync(out, { recursive: true });
const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const P = (head, s, h, a, l, extra = {}) => ({ head, s, h, a, l, ...extra });
const stand = P([120, 66], [120, 95], [120, 154], [[[101, 126], [101, 157]], [[139, 126], [139, 157]]], [[[109, 195], [106, 234]], [[134, 195], [140, 234]]], { front: true });
const squat = P([150, 111], [137, 137], [96, 178], [[[163, 135], [190, 125]], [[163, 145], [195, 140]]], [[[139, 199], [111, 234]], [[157, 199], [136, 234]]]);
const split = P([120, 66], [120, 95], [120, 154], stand.a, [[[108, 194], [75, 234]], [[153, 190], [185, 234]]]);
const lunge = P([126, 88], [126, 117], [120, 167], [[[107, 145], [106, 171]], [[143, 146], [143, 173]]], [[[164, 192], [180, 234]], [[87, 219], [52, 234]]]);
const wide = P([120, 66], [120, 95], [120, 154], stand.a, [[[86, 195], [57, 234]], [[155, 195], [190, 234]]], { front: true });
const lateral = P([105, 94], [105, 123], [104, 170], [[[82, 136], [111, 145]], [[141, 136], [113, 145]]], [[[64, 194], [50, 234]], [[158, 201], [202, 234]]], { front: true });
const hinge = P([185, 105], [159, 129], [104, 158], [[[151, 164], [146, 200]], [[171, 163], [169, 199]]], [[[114, 195], [105, 234]], [[137, 196], [137, 234]]]);
const bridgeDown = P([37, 219], [67, 226], [128, 229], [[[94, 232], [126, 234]], [[93, 238], [120, 240]]], [[[175, 188], [210, 234]], [[160, 192], [194, 234]]], { floor: true });
const bridgeUp = P([37, 219], [67, 226], [127, 186], bridgeDown.a, [[[175, 188], [210, 234]], [[160, 192], [194, 234]]], { floor: true });
const kneePushUp = P([51, 156], [78, 178], [139, 205], [[[80, 205], [80, 234]], [[94, 205], [94, 234]]], [[[181, 234], [219, 215]], [[183, 234], [220, 221]]], { floor: true });
const kneePushDown = P([48, 206], [78, 216], [140, 224], [[[111, 224], [80, 234]], [[115, 230], [94, 234]]], kneePushUp.l, { floor: true });
const pushUp = P([49, 161], [77, 183], [142, 207], [[[77, 208], [77, 234]], [[91, 208], [91, 234]]], [[[182, 221], [225, 234]], [[184, 217], [229, 230]]], { floor: true });
const pushDown = P([48, 205], [77, 216], [144, 225], [[[110, 224], [77, 234]], [[115, 230], [91, 234]]], pushUp.l, { floor: true });
const pikeUp = P([61, 197], [84, 180], [137, 123], [[[90, 207], [96, 234]], [[103, 209], [111, 234]]], [[[179, 179], [211, 234]], [[190, 183], [226, 234]]], { floor: true });
const pikeDown = P([82, 214], [100, 195], [138, 140], [[[126, 218], [96, 234]], [[137, 219], [111, 234]]], pikeUp.l, { floor: true });
const armsOut = { ...stand, a: [[[76, 95], [33, 95]], [[164, 95], [207, 95]]] };
const wStand = { ...stand, a: [[[77, 114], [77, 77]], [[163, 114], [163, 77]]] };
const wSqueeze = { ...wStand, a: [[[69, 107], [69, 69]], [[171, 107], [171, 69]]] };
const prone = P([120, 99], [120, 129], [120, 192], [[[80, 148], [80, 109]], [[160, 148], [160, 109]]], [[[110, 219], [107, 244]], [[134, 219], [137, 244]]], { front: true, top: true });
const proneLift = { ...prone, a: [[[70, 141], [70, 99]], [[170, 141], [170, 99]]] };
const angelStart = { ...prone, a: [[[83, 166], [68, 193]], [[157, 166], [172, 193]]] };
const angelEnd = { ...prone, a: [[[76, 103], [74, 65]], [[164, 103], [166, 65]]] };
const deadStart = P([42, 215], [71, 226], [138, 228], [[[75, 190], [77, 156]], [[86, 190], [87, 156]]], [[[138, 179], [188, 179]], [[151, 185], [199, 185]]], { floor: true });
const deadEnd = { ...deadStart, a: [[[41, 201], [14, 183]], [[86, 190], [87, 156]]], l: [[[179, 215], [226, 231]], [[151, 185], [199, 185]]] };
const birdStart = P([48, 163], [78, 184], [145, 184], [[[76, 209], [75, 234]], [[90, 209], [90, 234]]], [[[146, 234], [190, 234]], [[160, 234], [205, 234]]], { floor: true });
const birdEnd = { ...birdStart, a: [[[46, 181], [14, 176]], [[90, 209], [90, 234]]], l: [[[181, 179], [225, 174]], [[160, 234], [205, 234]]] };
const forearmPlank = { ...pushUp, a: [[[77, 234], [37, 234]], [[91, 234], [52, 234]]] };
const sidePlank = P([52, 151], [77, 176], [139, 204], [[[77, 234], [38, 234]], [[102, 148], [121, 126]]], [[[181, 220], [224, 234]], [[178, 212], [223, 226]]], { floor: true });
const kneeSide = { ...sidePlank, l: [[[181, 234], [221, 213]], [[182, 229], [219, 208]]] };
const crunchStart = { ...stand, a: [[[80, 109], [106, 76]], [[160, 109], [134, 76]]] };
const sideCrunch = { ...crunchStart, head: [104, 75], s: [108, 104], a: [[[78, 127], [91, 89]], [[153, 113], [123, 83]]], l: [[[79, 168], [108, 203]], [[134, 195], [140, 234]]] };
const crossCrunch = { ...crunchStart, head: [110, 73], s: [114, 103], a: [[[128, 137], [119, 97]], [[154, 116], [133, 81]]], l: [[[109, 195], [106, 234]], [[151, 166], [119, 201]]] };
const march = { ...stand, a: [[[91, 117], [103, 91]], [[148, 128], [140, 156]]], l: [[[101, 167], [105, 205]], [[134, 195], [140, 234]]] };
const jackOpen = P([120, 88], [120, 117], [120, 167], [[[78, 91], [74, 52]], [[162, 91], [166, 52]]], [[[86, 203], [55, 234]], [[155, 203], [190, 234]]], { front: true });
const stepReach = { ...wide, a: [[[94, 110], [115, 115]], [[163, 106], [199, 107]]] };
const skater = P([147, 102], [134, 128], [109, 174], [[[168, 149], [190, 157]], [[99, 148], [73, 157]]], [[[145, 203], [160, 234]], [[86, 198], [59, 218]]]);
const climber = { ...pushUp, l: [[[125, 225], [170, 231]], [[184, 217], [229, 230]]] };
const rowEnd = { ...hinge, a: [[[112, 129], [135, 157]], [[130, 135], [154, 162]]] };
const pressStart = P([120, 89], [120, 118], [120, 171], [[[82, 139], [81, 102]], [[158, 139], [159, 102]]], [[[109, 204], [106, 234]], [[134, 204], [140, 234]]], { front: true });
const pressEnd = { ...pressStart, a: [[[99, 87], [100, 54]], [[141, 87], [140, 54]]] };
const curlEnd = { ...stand, a: [[[100, 126], [108, 97]], [[140, 126], [132, 97]]] };
const floorPressStart = { ...bridgeDown, a: [[[94, 234], [94, 190]], [[108, 230], [108, 186]]] };
const floorPressEnd = { ...bridgeDown, a: [[[77, 190], [77, 151]], [[91, 188], [91, 149]]] };
const gobletStart = { ...stand, a: [[[144, 126], [140, 103]], [[154, 129], [145, 105]]] };
const gobletDown = { ...squat, a: [[[159, 157], [165, 132]], [[170, 164], [169, 134]]] };
const seatedRowStart = P([63, 119], [72, 148], [89, 228], [[[119, 172], [166, 200]], [[130, 178], [175, 205]]], [[[147, 226], [211, 227]], [[149, 234], [213, 235]]], { floor: true });
const seatedRowEnd = { ...seatedRowStart, a: [[[61, 180], [109, 183]], [[75, 190], [121, 192]]] };
const bandPressStart = { ...stand, front: false, a: [[[84, 121], [130, 106]], [[102, 130], [148, 115]]] };
const bandPressEnd = { ...stand, front: false, a: [[[163, 102], [205, 106]], [[171, 116], [212, 120]]] };
const raisedCalf = { ...stand, head: [120, 56], s: [120, 85], h: [120, 144], a: stand.a.map((arm) => arm.map(([x, y]) => [x, y - 10])), l: [[[109, 185], [106, 224]], [[134, 185], [140, 224]]], toes: true };
const hipAbduct = { ...stand, l: [[[109, 195], [106, 234]], [[164, 186], [196, 213]]] };

// A card's two states depict its own variation; static holds use two views or
// a cue rather than falsely implying an animated demonstration.
const cards = {
  "bw-squat": [stand, squat, "Stand", "Lower with control"],
  "bw-tempo-squat": [stand, squat, "Stand", "Lower for 3 seconds"],
  "bw-reverse-lunge": [stand, lunge, "Stand", "Step back · alternate"],
  "bw-split-squat": [split, lunge, "Staggered stance", "Lower · switch halfway"],
  "bw-lateral-lunge": [wide, lateral, "Wide stance", "Shift hips · alternate"],
  "bw-hip-hinge": [stand, hinge, "Stand tall", "Push hips back"],
  "bw-glute-bridge": [bridgeDown, bridgeUp, "Feet planted", "Lift hips"],
  "bw-single-bridge": [{ ...bridgeDown, l: [[[151, 171], [190, 142]], bridgeDown.l[1]] }, { ...bridgeUp, l: [[[151, 147], [187, 119]], bridgeUp.l[1]] }, "One foot planted", "Lift · switch halfway"],
  "bw-calf-raise": [stand, raisedCalf, "Heels down", "Rise onto toes"],
  "bw-hip-abduction": [stand, hipAbduct, "Stand tall", "Lift to side · alternate"],
  "bw-knee-push-up": [kneePushUp, kneePushDown, "Knees grounded", "Lower chest"],
  "bw-push-up": [pushUp, pushDown, "Straight body line", "Lower chest"],
  "bw-close-push-up": [pushUp, { ...pushDown, a: [[[106, 217], [82, 234]], [[110, 224], [89, 234]]] }, "Hands slightly narrower", "Keep elbows close"],
  "bw-pike-push-up": [pikeUp, pikeDown, "Hips lifted", "Lower head with control"],
  "bw-arm-circles": [armsOut, { ...armsOut, a: [[[76, 91], [35, 84]], [[164, 91], [205, 84]]] }, "Arms out", "Small controlled circles"],
  "bw-prone-w": [prone, proneLift, "Face down · top view", "Gently lift arms"],
  "bw-standing-w": [wStand, wSqueeze, "Stand tall", "Draw shoulders back"],
  "bw-snow-angel": [angelStart, angelEnd, "Face down · top view", "Sweep arms comfortably"],
  "bw-dead-bug": [deadStart, deadEnd, "Arms up · knees bent", "Opposite arm and leg"],
  "bw-bird-dog": [birdStart, birdEnd, "Hands and knees", "Opposite arm and leg"],
  "bw-forearm-plank": [forearmPlank, forearmPlank, "Elbows under shoulders", "Hold · keep breathing"],
  "bw-knee-side-plank": [kneeSide, kneeSide, "Support on bent knees", "Hold · switch halfway"],
  "bw-side-plank": [sidePlank, sidePlank, "Support on forearm", "Hold · switch halfway"],
  "bw-standing-side-bend": [crunchStart, sideCrunch, "Stand tall", "Same-side knee and elbow"],
  "bw-cross-crunch": [crunchStart, crossCrunch, "Stand tall", "Opposite knee and elbow"],
  "bw-step-jack": [stand, jackOpen, "Stand", "Step out · do not jump"],
  "bw-march": [stand, march, "Stand tall", "Lift knee · alternate"],
  "bw-step-touch": [stand, stepReach, "Start together", "Step sideways and reach"],
  "bw-skater-step": [wide, skater, "Soft knees", "Step diagonally · no jump"],
  "bw-jumping-jack": [stand, { ...jackOpen, l: jackOpen.l.map((leg) => leg.map(([x, y]) => [x, y - 12])) }, "Feet together", "Jump out · land softly"],
  "bw-mountain-climber": [pushUp, climber, "High plank", "Knee forward · alternate"],
  "db-goblet-squat": [gobletStart, gobletDown, "Hold at chest", "Lower with control", "goblet"],
  "db-reverse-lunge": [stand, lunge, "Weights at sides", "Step back · alternate", "dumbbells"],
  "db-split-squat": [split, lunge, "Staggered stance", "Lower · switch halfway", "dumbbells"],
  "db-rdl": [stand, hinge, "Weights near legs", "Hinge · keep spine long", "dumbbells"],
  "db-kickstand-rdl": [{ ...stand, l: [[[109, 195], [106, 234]], [[145, 196], [165, 234]]] }, { ...hinge, l: [[[114, 195], [105, 234]], [[157, 197], [177, 234]]] }, "Rear toes for balance", "Hinge · switch halfway", "dumbbells"],
  "db-floor-press": [floorPressStart, floorPressEnd, "Upper arms near floor", "Press above chest", "dumbbells"],
  "db-row": [hinge, rowEnd, "Stable hip hinge", "Pull toward ribs", "dumbbells"],
  "db-alternating-row": [hinge, { ...rowEnd, a: [rowEnd.a[0], hinge.a[1]] }, "Stable hip hinge", "Row one arm · alternate", "dumbbells"],
  "db-shoulder-press": [pressStart, pressEnd, "Weights at shoulders", "Press overhead", "dumbbells"],
  "db-lateral-raise": [stand, armsOut, "Light weights at sides", "Raise to shoulder level", "dumbbells"],
  "db-calf-raise": [stand, raisedCalf, "Weights at sides", "Rise onto toes", "dumbbells"],
  "db-suitcase-march": [stand, { ...march, a: [stand.a[0], march.a[1]] }, "Weight in one hand", "March · switch hands", "suitcase"],
  "db-curl": [stand, curlEnd, "Elbows by sides", "Curl · lower slowly", "dumbbells"],
  "band-squat": [{ ...stand, a: pressStart.a }, { ...squat, a: [[[126, 160], [136, 131]], [[147, 161], [155, 135]]] }, "Band secured under feet", "Squat with control", "band-feet"],
  "band-deadlift": [stand, hinge, "Band secured under feet", "Hinge and stand", "band-feet"],
  "band-row": [seatedRowStart, seatedRowEnd, "Band around midfeet", "Pull toward ribs", "band-row"],
  "band-pull-apart": [{ ...stand, a: [[[98, 99], [98, 105]], [[142, 99], [142, 105]]] }, armsOut, "Light band in front", "Pull hands apart", "band-hands"],
  "band-chest-press": [bandPressStart, bandPressEnd, "Band behind upper back", "Press forward", "band-back"],
  "band-press": [pressStart, pressEnd, "Band secured under feet", "Press overhead", "band-feet"],
  "band-curl": [stand, curlEnd, "Band secured under feet", "Curl · lower slowly", "band-feet"],
};

function path(points, color, width) {
  return `<path d="M${points.map((point) => point.join(",")).join(" L")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const skin = "#bb8162", farSkin = "#9f715b", navy = "#17342e", mint = "#a6e3b7", band = "#c16427";
function weight([x, y]) {
  return `<g transform="translate(${x} ${y})">${path([[-13, 0], [13, 0]], navy, 5)}<rect x="-18" y="-10" width="8" height="20" rx="3" fill="${navy}"/><rect x="10" y="-10" width="8" height="20" rx="3" fill="${navy}"/></g>`;
}
function equipment(pose, type, layer) {
  const hands = pose.a.map((arm) => arm[1]);
  const feet = pose.l.map((leg) => leg[1]);
  // Draw elastic in front so it stays legible at thumbnail size. The dashed
  // line on the back-wrap variant indicates the hidden route behind the torso.
  if (type?.startsWith("band") && layer === "front") {
    if (type === "band-hands") return path(hands, band, 4);
    if (type === "band-row") return hands.map((hand, i) => path([hand, feet[i]], band, 4)).join("");
    if (type === "band-back") return path([hands[0], [pose.s[0] - 19, pose.s[1] + 4], hands[1]], band, 4).replace('fill="none"', 'fill="none" stroke-dasharray="5 3"');
    return hands.map((hand, i) => path([hand, feet[i]], band, 4)).join("") + path(feet, band, 4);
  }
  if (layer !== "front") return "";
  if (type === "goblet") return weight([(hands[0][0] + hands[1][0]) / 2, (hands[0][1] + hands[1][1]) / 2]);
  if (type === "suitcase") return weight(hands[0]);
  return type === "dumbbells" ? hands.map(weight).join("") : "";
}
function person(pose, type) {
  const { head, s, h, a, l } = pose;
  let svg = pose.top
    ? '<rect x="46" y="52" width="149" height="202" rx="24" fill="#dce9e1"/>'
    : pose.floor ? '<path d="M16 246 H242" stroke="#b8cdbf" stroke-width="5" stroke-linecap="round"/>' : "";
  svg += equipment(pose, type, "back");
  // Back limbs precede torso and near limbs for readable overlap.
  for (const i of [1, 0]) {
    const leg = l[i];
    const hip = [h[0] + (pose.front ? (i ? 7 : -7) : 0), h[1]];
    svg += path([hip, ...leg], i ? farSkin : skin, 13);
    svg += path([hip, [hip[0] + (leg[0][0] - hip[0]) * .4, hip[1] + (leg[0][1] - hip[1]) * .4]], navy, 18);
    const ankle = leg[1];
    svg += path([[ankle[0] - 6, ankle[1]], [ankle[0] + 9, ankle[1] + (pose.toes ? 9 : 0)]], navy, 9);
  }
  svg += path([s, h], mint, 30);
  svg += path([[h[0] - 8, h[1]], [h[0] + 8, h[1]]], navy, 16);
  svg += path([s, head], skin, 10);
  for (const i of [1, 0]) {
    const shoulder = [s[0] + (pose.front ? (i ? 11 : -11) : 0), s[1]];
    svg += path([shoulder, ...a[i]], i ? farSkin : skin, 11);
    svg += `<circle cx="${shoulder[0]}" cy="${shoulder[1]}" r="7" fill="${mint}"/>`;
    svg += `<circle cx="${a[i][1][0]}" cy="${a[i][1][1]}" r="6" fill="${i ? farSkin : skin}"/>`;
  }
  svg += `<circle cx="${head[0]}" cy="${head[1]}" r="15" fill="${skin}"/><path d="M${head[0] - 13},${head[1] - 3} a13,13 0 0 1 25,-2" fill="none" stroke="${navy}" stroke-width="7" stroke-linecap="round"/><circle cx="${head[0] + 5}" cy="${head[1]}" r="1.5" fill="${navy}"/>`;
  return svg + equipment(pose, type, "front");
}

const media = {};
for (const exercise of EXERCISES) {
  const card = cards[exercise.id];
  if (!card) throw new Error(`Missing original illustration: ${exercise.id}`);
  const [first, second, firstCue, secondCue, type] = card;
  const title = `${exercise.name}: ${firstCue}; ${secondCue}.`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="310" viewBox="0 0 560 310" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">Two static schematic positions. ${escape(exercise.instructions)}</desc><rect width="560" height="310" rx="20" fill="#f2f6ef"/><rect x="287" y="10" width="263" height="290" rx="15" fill="#e5eedf"/><text x="24" y="31" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#355449">A · SET UP</text><text x="306" y="31" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#355449">B · MOVEMENT / HOLD</text><g transform="translate(7 0)">${person(first, type)}</g><g transform="translate(295 0)">${person(second, type)}</g><text x="137" y="282" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#355449">${escape(firstCue)}</text><text x="423" y="282" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#355449">${escape(secondCue)}</text></svg>\n`;
  writeFileSync(`${out}/${exercise.id}.svg`, svg);
  media[exercise.id] = { src: `./assets/exercises/${exercise.id}.svg?v=65`, alt: title, name: exercise.name };
}
writeFileSync(`${root}exercise-media.js`, `// Generated by tools/generate-exercise-media.mjs; original diagrams, not third-party photos.\nself.CIRCUIT_TIMER_MEDIA = Object.freeze(${JSON.stringify(media, null, 2)});\n`);
console.log(`Generated ${Object.keys(media).length} exercise diagrams and exercise-media.js.`);
