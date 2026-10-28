import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import worker, { validateRequest, buildPrompt, validateModelResponse } from "../cloudflare-worker/src/index.js";
import { EXERCISES, getExerciseContext, excludedTags } from "../cloudflare-worker/src/exercise-library.js";

const base = { planVersion: 2, durationMinutes: 17, workSeconds: 30, restSeconds: 30,
  difficulty: "intermediate", focus: "full-body", equipment: ["bodyweight"], instructions: "" };

// A predictable stand-in for AI, so contract and timer tests do not consume
// metered inference. Live-model behavior must be checked on the preview Worker.
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

test("Worker success keeps the API contract, restrictions, CORS and configured model", async () => {
  const input = validateRequest(base);
  let captured;
  const response = await worker.fetch(request(), environment(selection(input), (model, options) => { captured = { model, options }; }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://kpmike87.github.io");
  const body = await response.json();
  assert.equal(body.workout.exercises.length, 8);
  assert.equal(body.workout.extraExercises, 1);
  assert.equal(captured.model, "@cf/meta/llama-3.1-8b-instruct-fp8");
  assert.ok(captured.options.messages[1].content.includes("bw-push-up"));
  assert.ok(buildPrompt({ ...input, instructions: "Avoid jumping and keep it quiet" }).includes("Avoid jumping and keep it quiet"));
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

test("unfulfillable instructions and invalid AI selections fail without returning an unchecked fallback", async () => {
  assert.equal((await worker.fetch(request(), environment({ cannotComply: true }))).status, 422);
  assert.equal((await worker.fetch(request(), environment({ title: "Bad", exerciseIds: ["invented"] }))).status, 502);
  assert.throws(() => validateRequest({ ...base, focus: "upper-body", instructions: "No floor. No overhead." , equipment: [] }));
});

// Run actual frontend functions without needing a browser or duplicating their
// logic. The cut points are declarations, not copied implementations.
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
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
    };
  }
  const names = ["aiPreviewTitle", "aiPreviewMeta", "aiExerciseList", "aiEffortGuidance", "aiCoverageNotes", "aiSafetyNote", "aiPreview"];
  const context = vm.createContext({
    ...Object.fromEntries(names.map((name) => [name, element()])),
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
  assert.ok(context.aiExerciseList.children.every((item) => item.children[2].textContent.startsWith("Works: ")));
  assert.equal(context.aiEffortGuidance.hidden, false);
  assert.equal(context.aiCoverageNotes.hidden, false);
  context.renderAIPlan({ ...plan, effortGuidance: "", coverageNotes: [], exercises: [{ name: "Old exercise", instructions: "Use control." }] });
  assert.equal(context.aiEffortGuidance.hidden, true);
  assert.equal(context.aiCoverageNotes.hidden, true);
  assert.equal(context.aiCoverageNotes.children.length, 0);
  assert.equal(context.aiExerciseList.children.length, 1);
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
