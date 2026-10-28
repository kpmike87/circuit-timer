import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import worker, { validateRequest, validateModelResponse, buildSelectionSlots, selectCatalogWorkout, finalizeSelection } from "../cloudflare-worker/src/index.js";
import { EXERCISES, getExerciseContext, excludedTags, getAvailableExercises, matchesMuscleGroup } from "../cloudflare-worker/src/exercise-library.js";

const base = { planVersion: 2, durationMinutes: 17, workSeconds: 30, restSeconds: 30,
  difficulty: "intermediate", focus: "full-body", equipment: ["bodyweight"], instructions: "" };

// Contract fixtures and AI-intent doubles. Standard-generation tests exercise
// the real Worker/catalog selector without an AI binding or model inference.
function selection(input) {
  const { eligible, requiredPatterns, maxPatternRepeat } = getExerciseContext(input);
  const selected = requiredPatterns.map((pattern) => eligible.find((item) => item.pattern === pattern));
  for (const item of eligible) {
    if (selected.length >= input.exerciseCount) break;
    if (!selected.includes(item) && selected.filter((entry) => entry.pattern === item.pattern).length < maxPatternRepeat) selected.push(item);
  }
  return { title: "Balanced test circuit", exerciseIds: selected.map((item) => item.id) };
}

function request(body = base, origin = "https://kpmike87.github.io") {
  return new Request("https://worker.example/api/generate-workout", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

function environment(candidate, capture = () => {}) {
  return {
    CLIENT_RATE_LIMIT: { limit: async () => ({ success: true }) },
    GLOBAL_RATE_LIMIT: { limit: async () => ({ success: true }) },
    AI: { run: async (model, options) => { capture(model, options); return { response: candidate }; } },
  };
}

test("catalog IDs are unique and every exercise has usable cues and declared equipment", () => {
  assert.equal(new Set(EXERCISES.map((item) => item.id)).size, EXERCISES.length);
  for (const item of EXERCISES) {
    assert.ok(item.instructions.length >= 30 && item.instructions.length <= 200, item.id);
    assert.ok(item.muscles.length > 0 && item.level >= 1 && item.level <= 3, item.id);
    assert.ok(item.equipment.every((name) => ["dumbbells", "bands"].includes(name)), item.id);
  }
});

test("all 105 equipment / focus / experience combinations produce eligible plans with required coverage", () => {
  const combinations = [["bodyweight"], ["dumbbells"], ["bands"], ["bodyweight", "dumbbells"],
    ["bodyweight", "bands"], ["dumbbells", "bands"], ["bodyweight", "dumbbells", "bands"]];
  for (const equipment of combinations) for (const difficulty of ["beginner", "intermediate", "advanced"])
    for (const focus of ["full-body", "upper-body", "lower-body", "core", "cardio"]) {
      const input = validateRequest({ ...base, equipment, difficulty, focus });
      const plan = validateModelResponse(selection(input), input);
      assert.equal(plan.exercises.length, input.exerciseCount);
      assert.equal(plan.rounds * plan.exercises.length + plan.extraExercises, 17);
      const context = getExerciseContext(input);
      for (const pattern of context.requiredPatterns) assert.ok(plan.exercises.some((item) => item.pattern === pattern));
      for (const item of plan.exercises) assert.ok(item.equipment.every((name) => equipment.includes(name)));
    }
});

test("prime interval counts retain variety and represent the exact duration", () => {
  for (const minutes of [5, 7, 11, 17, 19, 23]) {
    const input = validateRequest({ ...base, durationMinutes: minutes });
    assert.ok(input.exerciseCount >= 5);
    const plan = validateModelResponse(selection(input), input);
    assert.equal((plan.rounds * plan.exercises.length + plan.extraExercises) * 60, minutes * 60);
  }
});

test("old clients receive divisible exercise lists throughout the independent deployments", () => {
  for (const focus of ["full-body", "upper-body", "lower-body", "core", "cardio"]) {
    for (const durationMinutes of [5, 15, 17, 20, 21]) {
      const request = { ...base, durationMinutes, focus, difficulty: "beginner" };
      delete request.planVersion;
      const input = validateRequest(request);
      const plan = validateModelResponse(selection(input), input);
      assert.equal(input.intervalCount % plan.exercises.length, 0);
      assert.equal(plan.extraExercises, 0);
    }
  }
});

test("beginner choices exclude harder catalog variations; effort guidance changes by level", () => {
  const guidance = [];
  for (const difficulty of ["beginner", "intermediate", "advanced"]) {
    const input = validateRequest({ ...base, difficulty });
    guidance.push(validateModelResponse(selection(input), input).effortGuidance);
    if (difficulty === "beginner") assert.ok(getExerciseContext(input).eligible.every((item) => item.level === 1));
  }
  assert.equal(new Set(guidance).size, 3);
  const cardio = validateRequest({ ...base, focus: "cardio" });
  assert.ok(validateModelResponse(selection(cardio), cardio).effortGuidance.includes("pace"));
});

test("explicit low-impact, standing-only, and excluded movement instructions filter catalog candidates", () => {
  const input = validateRequest({ ...base, difficulty: "advanced", instructions: "Standing only. No jumping. Avoid squats. No lunges. No overhead exercises." });
  const context = getExerciseContext(input);
  assert.ok(context.eligible.length > 0);
  for (const item of context.eligible) assert.ok(!item.tags.some((tag) => ["floor", "impact", "squat", "lunge", "overhead"].includes(tag)), item.id);
  const plan = validateModelResponse(selection(input), input);
  assert.ok(plan.coverageNotes.some((note) => note.includes("limit full-body coverage")));
  assert.ok(excludedTags("low-impact and apartment-friendly").has("impact"));
  assert.ok(excludedTags("No push-ups. Avoid planks. No kneeling.").has("push-up"));
});

test("rejects unknown IDs, duplicate IDs, unavailable equipment, harder variations, and missing coverage", () => {
  const input = validateRequest(base);
  const candidate = selection(input);
  for (const badId of ["invented-exercise", "db-row", "bw-close-push-up", candidate.exerciseIds[1]]) {
    const invalid = { ...candidate, exerciseIds: [badId, ...candidate.exerciseIds.slice(1)] };
    assert.throws(() => validateModelResponse(invalid, input));
  }
  const noPush = { ...candidate, exerciseIds: candidate.exerciseIds.filter((id) => !id.includes("push-up")) };
  while (noPush.exerciseIds.length < input.exerciseCount) {
    noPush.exerciseIds.push(getExerciseContext(input).eligible.find((item) => item.pattern !== "push" && !noPush.exerciseIds.includes(item.id)).id);
  }
  assert.throws(() => validateModelResponse(noPush, input), /required movement/);
  const restricted = validateRequest({ ...base, instructions: "No floor." });
  const restrictedCandidate = selection(restricted);
  restrictedCandidate.exerciseIds[0] = "bw-push-up";
  assert.throws(() => validateModelResponse(restrictedCandidate, restricted), /ineligible/);
});

test("uses trusted catalog instructions instead of model-authored movement substitutions", () => {
  const input = validateRequest(base);
  const plan = validateModelResponse({ ...selection(input), instructions: "Use a chair and jump from it" }, input);
  for (const item of plan.exercises) assert.equal(item.instructions, EXERCISES.find((entry) => entry.id === item.id).instructions);
  assert.ok(plan.coverageNotes.some((note) => note.includes("loaded row")));
});

test("standard Worker generation does not depend on AI availability and preserves the API", async () => {
  let calls = 0;
  const env = environment(null);
  env.AI.run = async () => { calls++; throw new Error("Upstream unavailable"); };
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://kpmike87.github.io");
  const body = await response.json();
  assert.equal(body.workout.exercises.length, 8);
  assert.equal(body.workout.extraExercises, 1);
  assert.equal(body.model, null);
  assert.equal(body.generationSource, "catalog");
  assert.equal(body.generatorVersion, "catalog-v1");
  assert.equal(calls, 0);
});

test("Worker preserves forbidden-origin, invalid-input and rate-limit behavior before inference", async () => {
  let calls = 0;
  const env = environment({}, () => { calls++; });
  assert.equal((await worker.fetch(request(base, "https://other.example"), env)).status, 403);
  assert.equal((await worker.fetch(request({ ...base, durationMinutes: 1 }), env)).status, 400);
  const limited = { ...env, CLIENT_RATE_LIMIT: { limit: async () => ({ success: false }) } };
  const response = await worker.fetch(request(), limited);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(calls, 0);
});

test("custom instructions fail clearly rather than falling back to a preset", async () => {
  const body = { ...base, instructions: "Custom instructions" };
  assert.equal((await worker.fetch(request(body), environment({ cannotComply: true }))).status, 422);
  assert.equal((await worker.fetch(request(body), environment({ title: "Wrong schema" }))).status, 502);
  assert.throws(() => validateRequest({ ...base, equipment: [] }));
});

// Production now asks for category-constrained slots, rather than relying on AI
// to count and distribute movement patterns correctly in a free-form ID list.
function slotSelection(input) {
  const used = new Set();
  const choices = Object.fromEntries(buildSelectionSlots(input).map((slot) => {
    const id = slot.ids.find((item) => !used.has(item));
    assert.ok(id, `No distinct choice for ${slot.key}`);
    used.add(id);
    return [slot.key, id];
  }));
  return { title: "Complete circuit", cannotComply: false, choices };
}

test("all equipment, focus and level combinations have feasible catalog slots", () => {
  const combinations = [["bodyweight"], ["dumbbells"], ["bands"], ["bodyweight", "dumbbells"],
    ["bodyweight", "bands"], ["dumbbells", "bands"], ["bodyweight", "dumbbells", "bands"]];
  for (const equipment of combinations) for (const difficulty of ["beginner", "intermediate", "advanced"])
    for (const focus of ["full-body", "upper-body", "lower-body", "core", "cardio"])
      for (const planVersion of [undefined, 2]) {
        const input = validateRequest({ ...base, equipment, difficulty, focus, planVersion });
        const slots = buildSelectionSlots(input);
        assert.equal(slots.length, input.exerciseCount);
        assert.equal(selectCatalogWorkout(input).exercises.length, input.exerciseCount);
        assert.equal(validateModelResponse(slotSelection(input), input).exercises.length, input.exerciseCount);
      }
});

test("restricted slots cannot reintroduce excluded movements or unselected equipment", () => {
  for (const instructions of ["Standing only. No jumping. No squats.", "No floor. No overhead.", "No kneeling. No push-ups."]) {
    const input = validateRequest({ ...base, equipment: ["bands"], instructions });
    const candidate = slotSelection(input);
    assert.ok(validateModelResponse(candidate, input).exercises.length > 0);
    candidate.choices.slot1 = "db-row";
    assert.throws(() => validateModelResponse(candidate, input), /ineligible/);
  }
});

test("standard circuits succeed without an AI binding across all 105 equipment/focus/experience choices", async () => {
  const combinations = [["bodyweight"], ["dumbbells"], ["bands"], ["bodyweight", "dumbbells"],
    ["bodyweight", "bands"], ["dumbbells", "bands"], ["bodyweight", "dumbbells", "bands"]];
  const env = { CLIENT_RATE_LIMIT: { limit: async () => ({ success: true }) }, GLOBAL_RATE_LIMIT: { limit: async () => ({ success: true }) } };
  for (const equipment of combinations) for (const difficulty of ["beginner", "intermediate", "advanced"])
    for (const focus of ["full-body", "upper-body", "lower-body", "core", "cardio"]) {
      const response = await worker.fetch(request({ ...base, equipment, difficulty, focus }), env);
      assert.equal(response.status, 200, `${equipment}/${difficulty}/${focus}`);
      const body = await response.json();
      const input = validateRequest({ ...base, equipment, difficulty, focus });
      const { eligible, requiredPatterns } = getExerciseContext(input);
      assert.equal(body.workout.exercises.length, input.exerciseCount);
      assert.equal(new Set(body.workout.exercises.map((item) => item.id)).size, input.exerciseCount);
      assert.ok(body.workout.exercises.every((item) => eligible.some((entry) => entry.id === item.id)));
      for (const pattern of requiredPatterns) assert.ok(body.workout.exercises.some((item) => item.pattern === pattern));
    }
});

test("reported upper-body/bodyweight case succeeds repeatedly at every experience level without inference", async () => {
  let calls = 0;
  const env = environment(null, () => { calls++; });
  for (const difficulty of ["beginner", "intermediate", "advanced"]) for (let repeat = 0; repeat < 20; repeat++) {
    const body = { ...base, durationMinutes: 15, workSeconds: 30, restSeconds: 15, focus: "upper-body", equipment: ["bodyweight"], difficulty };
    const response = await worker.fetch(request(body), env);
    assert.equal(response.status, 200);
    const plan = (await response.json()).workout;
    assert.ok(plan.exercises.every((item) => ["push", "pull", "shoulder", "arms"].includes(item.pattern)));
    assert.ok(plan.exercises.every((item) => item.equipment.length === 0));
    assert.equal(plan.rounds * plan.exercises.length + plan.extraExercises, 20);
  }
  assert.equal(calls, 0);
});

test("invalid instruction interpretation retries once; provider failures and refusals do not retry", async () => {
  const body = { ...base, instructions: "Custom workout please" };
  let calls = 0;
  let response = await worker.fetch(request(body), environment({}, () => { calls++; }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "AI_INVALID_INSTRUCTIONS");
  assert.equal(calls, 2);
  calls = 0;
  response = await worker.fetch(request(body), environment({ cannotComply: true }, () => { calls++; }));
  assert.equal(response.status, 422);
  assert.equal(calls, 1);
  calls = 0;
  const env = environment(null);
  env.AI.run = async () => { calls++; throw new Error("private provider details"); };
  response = await worker.fetch(request(body), env);
  const failed = await response.json();
  assert.equal(response.status, 503);
  assert.equal(failed.code, "AI_SERVICE_UNAVAILABLE");
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(failed).includes("private provider details"));
  const noAi = await worker.fetch(request(body), {});
  assert.equal(noAi.status, 503);
  assert.ok((await noAi.json()).error.includes("Clear the optional instructions"));
});

test("instruction retry attempts share one deadline inside the browser request timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  let calls = 0;
  const env = environment(null);
  env.AI.run = async () => {
    calls++;
    if (calls === 1) {
      t.mock.timers.tick(49_000);
      return { response: "not JSON" };
    }
    return new Promise(() => {});
  };
  const pending = worker.fetch(request({ ...base, instructions: "Custom workout" }), env);
  await new Promise(setImmediate);
  assert.equal(calls, 2);
  t.mock.timers.tick(1_000);
  const response = await pending;
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "AI_TIMEOUT");
  assert.equal(calls, 2);
});

function intent(overrides = {}) {
  return { targetMode: "preset", targetMuscles: [], requiredExerciseIds: [], excludedExerciseIds: [], cannotComply: false, ...overrides };
}

function resolvedInput(body, interpreted) {
  const input = validateRequest(body, true);
  input.instructionIntent = interpreted;
  return finalizeSelection(input);
}

test("exact chest-only example uses one interpretation and overrides a conflicting preset", async () => {
  const body = { ...base, instructions: "Give me one that just focuses on chest" };
  const interpreted = intent({ targetMode: "only", targetMuscles: ["chest"] });
  let calls = 0;
  const env = environment(interpreted, (model, options) => {
    calls++;
    assert.equal(model, "@cf/meta/llama-3.1-8b-instruct");
    assert.equal(options.response_format.type, "json_schema");
    assert.equal(JSON.parse(options.messages[1].content).instructions, body.instructions);
  });
  const response = await worker.fetch(request(body), env);
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  const result = await response.json();
  assert.equal(result.generationSource, "ai-preferences/catalog-selection");
  const plan = result.workout;
  assert.equal(plan.exercises.length, 2);
  assert.ok(plan.exercises.every((item) => item.muscles[0] === "Chest"));
  assert.ok(plan.coverageNotes.some((note) => note.includes("Requested focus: chest")));
  assert.ok(!plan.coverageNotes.some((note) => note.includes("full-body coverage") || note.includes("loaded row")));
  assert.equal(plan.totalIntervals, 17);
});

test("muscle-only requests stay targeted across every preset, level and selected equipment", () => {
  for (const focus of ["full-body", "upper-body", "lower-body", "core", "cardio"])
    for (const difficulty of ["beginner", "intermediate", "advanced"])
      for (const equipment of [["bodyweight"], ["dumbbells"], ["bands"]])
        for (const group of ["chest", "back", "shoulders", "glutes", "calves", "core"]) {
          const input = resolvedInput({ ...base, instructions: `Only ${group}`, focus, difficulty, equipment }, intent({ targetMode: "only", targetMuscles: [group] }));
          const plan = validateModelResponse(slotSelection(input), input);
          assert.ok(plan.exercises.every((item) => matchesMuscleGroup(item, group)));
          assert.ok(getExerciseContext(input).eligible.every((item) => item.level <= ({beginner:1, intermediate:2, advanced:3})[difficulty]));
        }
});

test("biceps-only allows curls and excludes rows that list biceps as a secondary muscle", () => {
  const input = resolvedInput({ ...base, equipment: ["dumbbells"], instructions: "Only biceps" }, intent({ targetMode: "only", targetMuscles: ["biceps"] }));
  assert.deepEqual(getExerciseContext(input).eligible.map((item) => item.id), ["db-curl"]);
  assert.equal(validateModelResponse(slotSelection(input), input).exercises.length, 1);
});

test("emphasis retains broader coverage and named requests are pinned into allowed slots", () => {
  const input = resolvedInput({ ...base, equipment: ["dumbbells"], instructions: "Full body with extra chest; include dumbbell curl" },
    intent({ targetMode: "emphasize", targetMuscles: ["chest"], requiredExerciseIds: ["db-curl"] }));
  const slots = buildSelectionSlots(input);
  assert.ok(slots.some((slot) => slot.ids.length === 1 && slot.ids[0] === "db-curl"));
  const plan = validateModelResponse(slotSelection(input), input);
  assert.ok(plan.exercises.some((item) => item.id === "db-curl"));
  assert.ok(plan.exercises.filter((item) => item.muscles[0] === "Chest").length >= 2);
  assert.ok(plan.exercises.some((item) => item.pattern === "hip"));
  assert.ok(plan.coverageNotes.some((note) => note.includes("Extra focus: chest")));
});

test("semantic exclusions and explicit muscle focus cannot expand equipment or ignore common restrictions", async () => {
  const body = { ...base, instructions: "Chest only. No floor.", difficulty: "beginner" };
  let calls = 0;
  const response = await worker.fetch(request(body), environment(intent({ targetMode: "only", targetMuscles: ["chest"] }), () => { calls++; }));
  assert.equal(response.status, 422);
  assert.equal(calls, 1);
  const named = { ...base, equipment: ["dumbbells"], instructions: "Include dumbbell curl" };
  const input = resolvedInput(named, intent({ requiredExerciseIds: ["db-curl"] }));
  assert.ok(validateModelResponse(slotSelection(input), input).exercises.some((item) => item.id === "db-curl"));
  const excluded = getAvailableExercises(base).filter((item) => item.tags.includes("floor")).map((item) => item.id);
  const standing = resolvedInput({ ...base, instructions: "I want to stay off the ground" }, intent({ excludedExerciseIds: excluded }));
  assert.ok(validateModelResponse(slotSelection(standing), standing).exercises.every((item) => !EXERCISES.find((entry) => entry.id === item.id).tags.includes("floor")));
});

test("uninterpretable, contradictory and unavailable instructions fail without returning a preset workout", async () => {
  const body = { ...base, instructions: "Custom workout please" };
  for (const candidate of [null, {}, intent({ targetMode: "only", targetMuscles: ["unknown"] }), intent({ requiredExerciseIds: ["db-row"] })]) {
    let calls = 0;
    const response = await worker.fetch(request(body), environment(candidate, () => { calls++; }));
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, "AI_INVALID_INSTRUCTIONS");
    assert.equal(calls, 2);
  }
  for (const candidate of [intent({ cannotComply: true }), intent({ requiredExerciseIds: ["bw-squat"], excludedExerciseIds: ["bw-squat"] }), intent({ targetMode: "only", targetMuscles: ["biceps"] })]) {
    assert.equal((await worker.fetch(request(body), environment(candidate))).status, 422);
  }
  // A client cannot smuggle a trusted interpretation into the server.
  const input = validateRequest({ ...base, instructionIntent: intent({ targetMode: "only", targetMuscles: ["chest"] }) });
  assert.equal(input.instructionIntent, undefined);
  assert.ok(getExerciseContext(input).eligible.some((item) => item.pattern === "hip"));
});

test("slow custom interpretation times out once and never substitutes an unrelated standard circuit", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  let calls = 0;
  const env = environment(null);
  env.AI.run = async () => { calls++; return new Promise(() => {}); };
  const pending = worker.fetch(request({ ...base, instructions: "Chest only" }), env);
  await new Promise(setImmediate);
  t.mock.timers.tick(50_000);
  const response = await pending;
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "AI_TIMEOUT");
  assert.equal(body.workout, undefined);
  assert.equal(calls, 1);
});

test("a malformed custom interpretation is corrected once before catalog selection", async () => {
  const body = { ...base, instructions: "Give me one that just focuses on chest" };
  let calls = 0;
  const env = environment(null);
  env.AI.run = async (_model, options) => {
    calls++;
    if (calls === 1) return { response: "not JSON" };
    assert.ok(JSON.parse(options.messages[1].content).correction.includes("previous interpretation"));
    return { response: intent({ targetMode: "only", targetMuscles: ["chest"] }) };
  };
  const response = await worker.fetch(request(body), env);
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.ok((await response.json()).workout.exercises.every((item) => item.muscles[0] === "Chest"));
});

test("multiple requested targets and named exercises remain required by runtime validation", () => {
  for (const targetMuscles of [["chest", "back"], ["biceps", "triceps"], ["quads", "glutes"], ["core", "back"]]) {
    const input = resolvedInput({ ...base, difficulty: "advanced", equipment: ["dumbbells"], instructions: "Target these muscle groups" }, intent({ targetMode: "only", targetMuscles }));
    const plan = validateModelResponse(slotSelection(input), input);
    for (const group of targetMuscles) assert.ok(plan.exercises.some((item) => matchesMuscleGroup(item, group)));
    assert.ok(plan.exercises.every((item) => targetMuscles.some((group) => matchesMuscleGroup(item, group))));
  }
  const requiredExerciseIds = ["bw-knee-push-up", "bw-push-up", "bw-close-push-up"];
  const named = resolvedInput({ ...base, difficulty: "advanced", instructions: "Include these three push-ups" }, intent({ requiredExerciseIds }));
  const plan = validateModelResponse(slotSelection(named), named);
  assert.ok(requiredExerciseIds.every((id) => plan.exercises.some((item) => item.id === id)));
  const emphasized = resolvedInput({ ...base, equipment: ["dumbbells"], instructions: "Extra chest" }, intent({ targetMode: "emphasize", targetMuscles: ["chest"] }));
  const invalid = slotSelection(emphasized);
  const matchingKeys = Object.keys(invalid.choices).filter((key) => matchesMuscleGroup(EXERCISES.find((item) => item.id === invalid.choices[key]), "chest"));
  const ids = Object.values(invalid.choices);
  const other = getExerciseContext(emphasized).eligible.find((item) => !matchesMuscleGroup(item, "chest") && !ids.includes(item.id));
  ids[Object.keys(invalid.choices).indexOf(matchingKeys[0])] = other.id;
  assert.throws(() => validateModelResponse({ title: "Ignored extra focus", exerciseIds: ids }, emphasized));
});

// Run actual frontend functions without needing a browser or duplicating their
// logic. The cut points are declarations, not copied implementations.
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("the optional instructions textbox is sent verbatim apart from surrounding whitespace", () => {
  const context = vm.createContext({
    aiDuration: { value: "15" }, aiWorkSeconds: { value: "30" }, aiRestSeconds: { value: "15" },
    aiDifficulty: { value: "intermediate" }, aiInstructions: { value: "  Give me one that just focuses on chest  " },
    aiBuilderForm: { querySelector: () => ({ value: "full-body" }), querySelectorAll: () => [{ value: "bodyweight" }] },
  });
  vm.runInContext(appSource.slice(appSource.indexOf("function getSelectedFocus("), appSource.indexOf("function syncBuilderDurationOptions(")), context);
  const body = context.getBuilderRequest();
  assert.equal(body.instructions, "Give me one that just focuses on chest");
  assert.equal(body.focus, "full-body");
  assert.equal(body.planVersion, 2);
  assert.deepEqual(Array.from(body.equipment), ["bodyweight"]);
});

const mediaContext = vm.createContext({ self: {} });
vm.runInContext(readFileSync(new URL("../exercise-media.js", import.meta.url), "utf8"), mediaContext);
const exerciseMedia = mediaContext.self.CIRCUIT_TIMER_MEDIA;
const contractSource = appSource.slice(appSource.indexOf("function validateAIPlan("), appSource.indexOf("function renderAIPlan("));
const frontend = vm.createContext({});
vm.runInContext(contractSource, frontend);

test("frontend accepts partial circuits and old Worker responses during a staggered deployment", () => {
  const input = validateRequest(base);
  const backendPlan = validateModelResponse(selection(input), input);
  const plan = frontend.validateAIPlan(backendPlan, base);
  assert.equal(plan.rounds, 2);
  assert.equal(plan.extraExercises, 1);
  assert.equal(frontend.formatAIRounds(plan), "2 full rounds + 1 exercise");
  const oldRequest = { ...base, durationMinutes: 16 };
  const oldPlan = { title: "Old plan", safetyNote: "Stop if something hurts.", exercises: [{ name: "Squat", instructions: "Use control." }] };
  const old = frontend.validateAIPlan(oldPlan, oldRequest);
  assert.equal(old.rounds, 16);
  assert.equal(old.effortGuidance, "");
  assert.equal(old.coverageNotes.length, 0);
  assert.throws(() => frontend.validateAIPlan({ ...backendPlan, exercises: [] }, base));
});

test("review renders muscle and effort notes, then clears optional content for an older plan", () => {
  function element() {
    return {
      children: [], hidden: false, text: "",
      set textContent(value) { this.text = value; this.children = []; },
      get textContent() { return this.text; },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this[name] = value; },
      addEventListener() {},
    };
  }
  const names = ["aiPreviewTitle", "aiPreviewMeta", "aiExerciseList", "aiEffortGuidance", "aiCoverageNotes", "aiSafetyNote", "aiPreview"];
  const context = vm.createContext({
    ...Object.fromEntries(names.map((name) => [name, element()])),
    EXERCISE_MEDIA: exerciseMedia,
    document: { createElement: element },
    AI_DIFFICULTY_LABELS: { intermediate: "Intermediate" }, AI_FOCUS_LABELS: { "full-body": "Full body" },
  });
  const renderSource = appSource.slice(appSource.indexOf("function renderAIPlan("), appSource.indexOf("async function generateAIWorkout("));
  vm.runInContext(contractSource + renderSource, context);
  const input = validateRequest(base);
  const plan = context.validateAIPlan(validateModelResponse(selection(input), input), base);
  context.renderAIPlan(plan);
  assert.ok(context.aiPreviewMeta.textContent.includes("2 full rounds + 1 exercise"));
  assert.equal(context.aiExerciseList.children.length, 8);
  assert.ok(context.aiExerciseList.children.every((item) => item.children[1].children[2].textContent.startsWith("Works: ")));
  assert.ok(context.aiExerciseList.children.every((item) => item.children[0].children[0].src.startsWith("./assets/exercises/")));
  assert.equal(context.aiEffortGuidance.hidden, false);
  assert.equal(context.aiCoverageNotes.hidden, false);
  context.renderAIPlan({ ...plan, effortGuidance: "", coverageNotes: [], exercises: [{ name: "Old exercise", instructions: "Use control." }] });
  assert.equal(context.aiEffortGuidance.hidden, true);
  assert.equal(context.aiCoverageNotes.hidden, true);
  assert.equal(context.aiCoverageNotes.children.length, 0);
  assert.equal(context.aiExerciseList.children.length, 1);
  assert.equal(context.aiExerciseList.children[0].children.length, 1);
});

test("every catalog ID has one local, accessible SVG with the correct exercise name", () => {
  assert.deepEqual(Object.keys(exerciseMedia).sort(), EXERCISES.map((exercise) => exercise.id).sort());
  for (const exercise of EXERCISES) {
    const media = exerciseMedia[exercise.id];
    assert.equal(media.name, exercise.name);
    assert.ok(media.alt.startsWith(`${exercise.name}:`));
    assert.match(media.src, /^\.\/assets\/exercises\/[a-z0-9-]+\.svg\?v=65$/);
    const svg = readFileSync(new URL(`../${media.src.split("?")[0]}`, import.meta.url), "utf8");
    assert.ok(svg.includes('<title id="title">') && svg.includes('<desc id="desc">'));
    assert.ok(svg.includes(exercise.name));
    assert.ok(!/<script|<foreignObject|\son\w+=|(?:href|src)=/i.test(svg), exercise.id);
  }
});

test("unknown and legacy exercise IDs never receive a guessed or model-supplied picture", () => {
  const context = vm.createContext({ EXERCISE_MEDIA: exerciseMedia });
  vm.runInContext(contractSource, context);
  for (const id of [undefined, "missing", "__proto__", "constructor", "../../picture"]) {
    assert.equal(context.getExerciseMedia({ id, imageUrl: "https://other.example/picture.jpg" }), null);
  }
  assert.equal(context.getExerciseMedia({ id: "bw-squat" }).name, "Bodyweight squat");
});

test("active timer picture follows the current exercise and clears for manual or legacy plans", () => {
  const attributes = {};
  const picture = { alt: "", getAttribute: (name) => attributes[name], removeAttribute: (name) => { delete attributes[name]; }, set src(value) { attributes.src = value; } };
  const context = vm.createContext({ EXERCISE_MEDIA: exerciseMedia,
    state: { currentExerciseIndex: 0, plan: { exercises: [{ id: "bw-squat", name: "Bodyweight squat", instructions: "Use control." }, { id: "bw-push-up", name: "Push-up", instructions: "Keep a straight line." }] } },
    exerciseLabel: {}, exerciseInstructions: {}, exerciseImageButton: { setAttribute() {} }, exerciseImage: picture, app: { dataset: {} },
  });
  const source = appSource.slice(appSource.indexOf("function syncExerciseDisplay("), appSource.indexOf("function getSelectedFocus("));
  vm.runInContext(contractSource + source, context);
  context.syncExerciseDisplay();
  assert.ok(attributes.src.includes("bw-squat.svg"));
  assert.equal(context.exerciseImageButton.hidden, false);
  context.state.currentExerciseIndex = 1;
  context.syncExerciseDisplay();
  assert.ok(attributes.src.includes("bw-push-up.svg"));
  context.state.plan = { exercises: [{ name: "Legacy exercise", instructions: "No known ID." }] };
  context.state.currentExerciseIndex = 0;
  context.syncExerciseDisplay();
  assert.equal(context.exerciseImageButton.hidden, true);
  assert.equal(attributes.src, undefined);
  context.state.plan = null;
  context.syncExerciseDisplay();
  assert.equal(context.app.dataset.hasExerciseMedia, "false");
  assert.equal(picture.alt, "");
});

test("opening a larger picture pauses a running workout and uses trusted local media", () => {
  let pauses = 0;
  const context = vm.createContext({ EXERCISE_MEDIA: exerciseMedia,
    state: { running: true, paused: false },
    exerciseImageDialog: { open: false, showModal() { this.open = true; } },
    exerciseImageDialogTitle: {}, exerciseImageDialogImage: {}, exerciseImageDialogInstructions: {}, exerciseImageDialogStatus: {},
  });
  context.pauseOrResume = () => { pauses++; context.state.running = false; context.state.paused = true; };
  vm.runInContext(contractSource, context);
  context.openExerciseIllustration({ id: "bw-squat", name: "Bodyweight squat", instructions: "Use control." });
  assert.equal(pauses, 1);
  assert.equal(context.exerciseImageDialog.open, true);
  assert.ok(context.exerciseImageDialogImage.src.startsWith("./assets/exercises/"));
  assert.ok(context.exerciseImageDialogStatus.textContent.includes("press Resume"));
  context.openExerciseIllustration({ id: "bw-push-up" });
  assert.equal(pauses, 1);
});

test("a failed review image hides its button while the written exercise remains available", () => {
  const nodes = [];
  const context = vm.createContext({ EXERCISE_MEDIA: exerciseMedia, document: { createElement() {
    const node = { children: [], handlers: {}, setAttribute() {}, addEventListener(name, callback) { this.handlers[name] = callback; }, append(...children) { this.children.push(...children); } };
    nodes.push(node); return node;
  } } });
  vm.runInContext(contractSource, context);
  const button = context.createExerciseImageButton({ id: "bw-squat", name: "Bodyweight squat" });
  assert.equal(button.children[0].loading, "lazy");
  button.children[0].handlers.error();
  assert.equal(button.hidden, true);
});

test("offline precache includes the media map and every local exercise picture", () => {
  const listeners = {};
  const context = vm.createContext({ self: { addEventListener(name, handler) { listeners[name] = handler; } } });
  context.importScripts = () => vm.runInContext(readFileSync(new URL("../exercise-media.js", import.meta.url), "utf8"), context);
  vm.runInContext(readFileSync(new URL("../service-worker.js", import.meta.url), "utf8") + "\nself.testFiles = APP_FILES;", context);
  for (const media of Object.values(exerciseMedia)) assert.ok(context.self.testFiles.includes(media.src));
  assert.ok(context.self.testFiles.includes("./exercise-media.js?v=65"));
  assert.equal(Object.keys(listeners).length, 3);
});

test("delayed timer ticks advance each elapsed exercise, including when a tick ends in rest", () => {
  const timer = vm.createContext({
    state: { phase: "work", endTime: 30_000, currentExerciseIndex: 0, plan: { exercises: Array(8).fill({}) } },
    setPhase(phase) { this.state.phase = phase; }, getDurationMs: () => 30_000,
    playPhaseTone() {}, vibratePattern() {},
  });
  // Host callbacks do not share the VM global `this`; bind the state explicitly.
  timer.setPhase = (phase) => { timer.state.phase = phase; };
  const timerSource = appSource.slice(appSource.indexOf("function advancePhase("), appSource.indexOf("function tick("));
  vm.runInContext(timerSource, timer);
  timer.advancePhase(155_000);
  assert.equal(timer.state.phase, "rest");
  assert.equal(timer.state.currentExerciseIndex, 2);
  timer.advancePhase(190_000);
  assert.equal(timer.state.phase, "work");
  assert.equal(timer.state.currentExerciseIndex, 3);
});
