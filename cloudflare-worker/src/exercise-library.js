// Catalog IDs are the contract between AI selection, validation, and future media.
// No benches, chairs, pull-up bars, or band anchors are assumed.
function exercise(id, name, pattern, muscles, level, equipment, tags, instructions) {
  return Object.freeze({ id, name, pattern, muscles: muscles.split(","), level,
    equipment: equipment ? [equipment] : [], tags: tags ? tags.split(",") : [], instructions });
}

export const EXERCISES = Object.freeze([
  exercise("bw-squat", "Bodyweight squat", "knee", "Quads,Glutes", 1, "", "squat", "Sit your hips back and down within a comfortable range. Keep your feet planted and stand tall."),
  exercise("bw-tempo-squat", "Slow lowering squat", "knee", "Quads,Glutes", 2, "", "squat", "Lower for three seconds, pause briefly, then stand smoothly. Keep your knees tracking with your toes."),
  exercise("bw-reverse-lunge", "Alternating reverse lunge", "knee", "Quads,Glutes", 2, "", "lunge", "Step back into a comfortable lunge, press through the front foot, and alternate sides with control."),
  exercise("bw-split-squat", "Split squat", "knee", "Quads,Glutes", 2, "", "lunge", "Use a staggered stance and lower straight down within a comfortable range. Switch lead legs halfway through."),
  exercise("bw-lateral-lunge", "Alternating lateral lunge", "knee", "Quads,Glutes,Inner thighs", 2, "", "lunge", "Step to the side, bend that knee and sit your hips back. Return to center and alternate sides."),
  exercise("bw-hip-hinge", "Bodyweight hip hinge", "hip", "Hamstrings,Glutes", 1, "", "", "Soften your knees and push your hips back with a long spine. Squeeze your glutes to stand; do not round your back."),
  exercise("bw-glute-bridge", "Glute bridge", "hip", "Glutes,Hamstrings", 1, "", "floor", "Lie on your back with feet planted. Lift your hips by squeezing your glutes, then lower without arching your back."),
  exercise("bw-single-bridge", "Single-leg glute bridge", "hip", "Glutes,Hamstrings", 3, "", "floor", "Keep one foot planted and lift your hips without twisting. Lower with control and switch sides halfway through."),
  exercise("bw-calf-raise", "Standing calf raise", "calf", "Calves", 1, "", "", "Rise onto the balls of both feet, pause, and lower slowly. Use a comfortable range and keep your balance."),
  exercise("bw-hip-abduction", "Standing side leg raise", "hip", "Side glutes", 1, "", "", "Stand tall and lift one leg a short distance to the side without leaning. Alternate sides with control."),
  exercise("bw-knee-push-up", "Knee push-up", "push", "Chest,Triceps,Shoulders", 1, "", "floor,kneeling,wrist-load,push-up", "Keep a straight line from knees to shoulders. Lower your chest with elbows angled back, then press up smoothly."),
  exercise("bw-push-up", "Push-up", "push", "Chest,Triceps,Shoulders", 2, "", "floor,wrist-load,push-up", "Brace your trunk and keep your body in one line. Lower under control and press up without letting your hips sag."),
  exercise("bw-close-push-up", "Close-grip push-up", "push", "Triceps,Chest,Shoulders", 3, "", "floor,wrist-load,push-up", "Place hands a little narrower than shoulder width. Keep elbows close and your trunk steady as you lower and press."),
  exercise("bw-pike-push-up", "Pike push-up", "shoulder", "Shoulders,Triceps", 3, "", "floor,wrist-load,overhead,push-up", "Raise your hips into an inverted V. Bend elbows to lower your head between your hands, then press up with control."),
  exercise("bw-arm-circles", "Controlled arm circles", "shoulder", "Shoulders", 1, "", "", "Hold arms out to the sides below shoulder height. Make small controlled circles and reverse direction halfway through."),
  exercise("bw-prone-w", "Prone W raise", "pull", "Upper back,Rear shoulders", 1, "", "floor", "Lie face down with elbows bent into a W. Gently lift your arms and draw shoulder blades back without lifting your chest high."),
  exercise("bw-standing-w", "Standing W squeeze", "pull", "Upper back,Rear shoulders", 1, "", "", "Stand tall with elbows bent into a W. Gently squeeze shoulder blades together, pause, and release without shrugging."),
  exercise("bw-snow-angel", "Prone reverse snow angel", "pull", "Upper back,Rear shoulders", 2, "", "floor,overhead", "Lie face down and gently hover your arms. Sweep from your sides toward overhead only as far as comfortable; keep your neck neutral."),
  exercise("bw-dead-bug", "Dead bug", "core-brace", "Abs", 1, "", "floor", "Lie on your back with knees bent and arms raised. Slowly extend opposite arm and leg without arching your lower back; alternate sides."),
  exercise("bw-bird-dog", "Bird dog", "core-brace", "Abs,Back stabilizers,Glutes", 1, "", "floor,kneeling,wrist-load", "From hands and knees, extend opposite arm and leg without rotating your hips. Return slowly and alternate sides."),
  exercise("bw-forearm-plank", "Forearm plank", "core-brace", "Abs", 2, "", "floor,plank", "Set elbows beneath shoulders, brace your abdomen, and hold a straight body line. Breathe steadily; stop before your hips sag."),
  exercise("bw-knee-side-plank", "Kneeling side plank", "core-lateral", "Obliques", 1, "", "floor,kneeling,plank", "Rest on one forearm with knees bent. Lift your hips into a straight line from knees to shoulders. Switch sides halfway through."),
  exercise("bw-side-plank", "Side plank", "core-lateral", "Obliques", 2, "", "floor,plank", "Support yourself on one forearm and the sides of your feet. Keep hips lifted and breathe steadily. Switch sides halfway through."),
  exercise("bw-standing-side-bend", "Standing side crunch", "core-lateral", "Obliques", 1, "", "", "Stand tall and bring one knee toward the same-side elbow with a small side bend. Alternate sides without pulling your neck."),
  exercise("bw-cross-crunch", "Standing cross-body knee drive", "core-rotation", "Abs,Obliques", 1, "", "", "Slowly bring one knee toward the opposite elbow with a small controlled trunk rotation. Alternate sides and stay balanced."),
  exercise("bw-step-jack", "Step jack", "cardio", "Legs,Shoulders", 1, "", "overhead", "Step one foot out while raising your arms within a comfortable range. Return and alternate sides without jumping."),
  exercise("bw-march", "Brisk high-knee march", "cardio", "Legs,Hip flexors", 1, "", "", "March briskly in place, lifting knees comfortably and swinging your arms. Keep one foot on the floor at all times."),
  exercise("bw-step-touch", "Lateral step and reach", "cardio", "Legs,Glutes", 1, "", "", "Step side to side and reach forward at chest height. Keep knees soft and build a steady pace without jumping."),
  exercise("bw-skater-step", "Low-impact skater step", "cardio", "Glutes,Legs", 2, "", "", "Step diagonally side to side with a small hip hinge and an arm swing. Keep each landing controlled and do not jump."),
  exercise("bw-jumping-jack", "Jumping jack", "cardio", "Legs,Shoulders", 2, "", "impact,overhead", "Jump feet apart as arms rise, then return. Land softly and keep the pace controlled; use step jacks if needed."),
  exercise("bw-mountain-climber", "Controlled mountain climber", "cardio", "Abs,Hip flexors,Shoulders", 2, "", "floor,wrist-load,plank", "From a high plank, bring alternating knees toward your chest. Keep hips level and move only as fast as you can control."),
  exercise("db-goblet-squat", "Dumbbell goblet squat", "knee", "Quads,Glutes", 1, "dumbbells", "squat", "Hold one dumbbell close to your chest. Squat within a comfortable range, keep your feet planted, and stand smoothly."),
  exercise("db-reverse-lunge", "Dumbbell reverse lunge", "knee", "Quads,Glutes", 2, "dumbbells", "lunge", "Hold dumbbells at your sides. Step back into a controlled lunge and return; alternate legs without rushing."),
  exercise("db-split-squat", "Dumbbell split squat", "knee", "Quads,Glutes", 3, "dumbbells", "lunge", "Hold dumbbells at your sides in a staggered stance. Lower straight down, stand smoothly, and switch lead legs halfway through."),
  exercise("db-rdl", "Dumbbell Romanian deadlift", "hip", "Hamstrings,Glutes", 1, "dumbbells", "", "Hold dumbbells near your legs, soften knees, and push hips back. Keep your spine long and stand by driving your hips forward."),
  exercise("db-kickstand-rdl", "Dumbbell kickstand deadlift", "hip", "Hamstrings,Glutes", 3, "dumbbells", "", "Use a staggered stance with most weight on the front foot. Hinge with a long spine and switch working legs halfway through."),
  exercise("db-floor-press", "Dumbbell floor press", "push", "Chest,Triceps,Shoulders", 1, "dumbbells", "floor", "Lie on your back with knees bent. Press dumbbells above your chest, then lower until your upper arms gently meet the floor."),
  exercise("db-row", "Dumbbell bent-over row", "pull", "Back,Biceps,Rear shoulders", 1, "dumbbells", "", "Hinge at the hips with a long spine. Pull dumbbells toward your ribs with elbows close, then lower without swinging."),
  exercise("db-alternating-row", "Alternating dumbbell row", "pull", "Back,Biceps,Rear shoulders", 2, "dumbbells", "", "Hold a stable hip hinge and row one dumbbell at a time. Keep your hips and trunk square as you alternate arms."),
  exercise("db-shoulder-press", "Dumbbell shoulder press", "shoulder", "Shoulders,Triceps", 2, "dumbbells", "overhead", "Start dumbbells at shoulder height. Brace your trunk, press overhead within a comfortable range, and lower without arching your back."),
  exercise("db-lateral-raise", "Dumbbell lateral raise", "shoulder", "Shoulders", 1, "dumbbells", "", "With light dumbbells and soft elbows, raise arms out to the sides no higher than shoulder level. Lower slowly without shrugging."),
  exercise("db-calf-raise", "Dumbbell calf raise", "calf", "Calves", 1, "dumbbells", "", "Hold dumbbells at your sides, rise onto the balls of your feet, pause, and lower slowly while staying balanced."),
  exercise("db-suitcase-march", "Dumbbell suitcase march", "core-lateral", "Obliques,Grip", 1, "dumbbells", "", "Hold one dumbbell at your side and march slowly without leaning. Keep ribs over hips and switch carrying hands halfway through."),
  exercise("db-curl", "Dumbbell curl", "arms", "Biceps", 1, "dumbbells", "", "Keep elbows close to your sides, curl the dumbbells without swinging, then lower slowly with wrists straight."),
  exercise("band-squat", "Resistance band squat", "knee", "Quads,Glutes", 1, "bands", "squat", "Stand securely on the middle of a suitable band, hold ends near shoulders, and squat with control. Check the band before use."),
  exercise("band-deadlift", "Resistance band deadlift", "hip", "Hamstrings,Glutes", 1, "bands", "", "Stand securely on the middle of a suitable band and hold its ends. Hinge at your hips with a long spine, then stand smoothly."),
  exercise("band-row", "Seated resistance band row", "pull", "Back,Biceps,Rear shoulders", 1, "bands", "floor", "Sit tall with a suitable band securely around your midfeet. Pull elbows toward your ribs and release slowly; keep the band away from your face."),
  exercise("band-pull-apart", "Resistance band pull-apart", "pull", "Upper back,Rear shoulders", 1, "bands", "", "Hold a light band in front of your chest. Pull hands apart by moving from your shoulders, then return slowly without shrugging."),
  exercise("band-chest-press", "Standing resistance band chest press", "push", "Chest,Triceps,Shoulders", 1, "bands", "", "Pass a suitable band behind your upper back, below your neck. Hold ends securely, press forward, and return slowly. No anchor is needed."),
  exercise("band-press", "Resistance band shoulder press", "shoulder", "Shoulders,Triceps", 2, "bands", "overhead", "Stand securely on a suitable band and hold ends at shoulder height. Press overhead without arching your back, then lower with control."),
  exercise("band-curl", "Resistance band curl", "arms", "Biceps", 1, "bands", "", "Stand securely on the middle of a suitable band. Keep elbows by your sides as you curl, then lower without letting the band snap back."),
]);

const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 };
const FOCUS_PATTERNS = {
  "full-body": ["knee", "push", "hip", "pull", "core-brace", "calf", "core-lateral", "arms", "shoulder", "cardio", "core-rotation"],
  "upper-body": ["push", "pull", "shoulder", "arms"],
  "lower-body": ["knee", "hip", "calf"],
  core: ["core-brace", "core-lateral", "core-rotation"],
  cardio: ["cardio"],
};
const MINIMUM_PATTERNS = { "full-body": 8, "upper-body": 4, "lower-body": 3, core: 3, cardio: 1 };

// Conservative handling of common explicit exclusions. Other instructions are
// passed to AI verbatim and must also be respected; this is not medical screening.
export function excludedTags(instructions) {
  const text = instructions.toLowerCase().replace(/[’]/g, "'").replace(/[-_]/g, " ");
  const excluded = new Set();
  const negative = "(?:no|avoid|skip|without|exclude|do not|don't)\\s+(?:any\\s+)?";
  const rules = {
    impact: "jump(?:ing|s)?|hopping|high impact",
    floor: "floor(?: work| exercises?)?|lying(?: down)?|ground(?: work| exercises?)?",
    kneeling: "kneeling|kneel(?:ing)?",
    overhead: "overhead(?: work| movements?| exercises?)?",
    squat: "squats?|squatting",
    lunge: "lunges?|lunging",
    "push-up": "push ?ups?",
    plank: "planks?",
    "wrist-load": "wrist loading|weight (?:on|through) (?:my |the )?wrists?",
  };
  for (const [tag, words] of Object.entries(rules)) {
    if (new RegExp(`\\b${negative}(?:${words})\\b`).test(text)) excluded.add(tag);
  }
  if (/\b(?:low impact|apartment friendly)\b/.test(text)) excluded.add("impact");
  if (/\b(?:standing only|only standing|stay standing|keep (?:it |everything )?standing)\b/.test(text)) excluded.add("floor");
  return excluded;
}

export function getExerciseContext(input) {
  const patterns = FOCUS_PATTERNS[input.focus];
  const excluded = excludedTags(input.instructions);
  const eligible = EXERCISES.filter((item) => item.level <= LEVELS[input.difficulty]
    && item.equipment.every((equipment) => input.equipment.includes(equipment))
    && patterns.includes(item.pattern) && !item.tags.some((tag) => excluded.has(tag)));
  const requiredPatterns = patterns.slice(0, MINIMUM_PATTERNS[input.focus])
    .filter((pattern) => eligible.some((item) => item.pattern === pattern))
    .slice(0, input.exerciseCount);
  const requiredEquipment = input.equipment.filter((equipment) => equipment !== "bodyweight"
    && eligible.some((item) => item.equipment.includes(equipment)));
  const counts = new Map();
  eligible.forEach((item) => counts.set(item.pattern, (counts.get(item.pattern) || 0) + 1));
  let maxPatternRepeat = Math.max(1, Math.ceil(input.exerciseCount / Math.max(1, requiredPatterns.length)));
  while ([...counts.values()].reduce((total, count) => total + Math.min(count, maxPatternRepeat), 0) < Math.min(input.exerciseCount, eligible.length)) maxPatternRepeat++;
  return { eligible, requiredPatterns, requiredEquipment, excluded, maxPatternRepeat };
}

export const EFFORT_GUIDANCE = Object.freeze({
  beginner: "Use a comfortable range and a steady pace. Choose resistance that leaves several controlled repetitions in reserve; pause when technique changes.",
  intermediate: "Use controlled repetitions and resistance that feels challenging while leaving about 2–3 good repetitions in reserve. Take extra rest when needed.",
  advanced: "Use challenging resistance or a controlled harder variation while leaving about 1–2 good repetitions in reserve. Maintain technique and take extra rest when needed.",
});

export function effortGuidanceFor(input) {
  if (input.focus !== "cardio") return EFFORT_GUIDANCE[input.difficulty];
  return {
    beginner: "Build a steady pace while keeping movement controlled and breathing comfortable enough to talk. Slow down or take extra rest as needed.",
    intermediate: "Aim for a brisk, controlled pace: talking should be possible but singing difficult. Slow down during recovery and take extra rest as needed.",
    advanced: "Use a vigorous but controlled pace if appropriate for you; only a few words at a time may be comfortable. Recover fully enough to keep good technique.",
  }[input.difficulty];
}
