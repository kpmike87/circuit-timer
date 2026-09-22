const app = document.querySelector(".app");
const workInput = document.querySelector("#workTime");
const restInput = document.querySelector("#restTime");
const totalDurationInput = document.querySelector("#totalDuration");
const countdown = document.querySelector("#countdown");
const totalTime = document.querySelector("#totalTime");
const remainingTotalTime = document.querySelector("#remainingTotalTime");
const phaseLabel = document.querySelector("#phaseLabel");
const timerHint = document.querySelector("#timerHint");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const errorMessage = document.querySelector("#errorMessage");
const summaryTitle = document.querySelector("#summaryTitle");
const summaryMessage = document.querySelector("#summaryMessage");
const summaryTotalTime = document.querySelector("#summaryTotalTime");
const summaryWorkoutTime = document.querySelector("#summaryWorkoutTime");
const summaryRestTime = document.querySelector("#summaryRestTime");
const summaryRounds = document.querySelector("#summaryRounds");
const readyButton = document.querySelector("#readyButton");
const soundToggle = document.querySelector("#soundToggle");
const historyToggle = document.querySelector("#historyToggle");
const historyTitle = document.querySelector("#historyTitle");
const historyCount = document.querySelector("#historyCount");
const historyList = document.querySelector("#historyList");
const historyClearButton = document.querySelector("#historyClearButton");
const historyBackButton = document.querySelector("#historyBackButton");
const aiBuilderToggle = document.querySelector("#aiBuilderToggle");
const exerciseLabel = document.querySelector("#exerciseLabel");
const exerciseInstructions = document.querySelector("#exerciseInstructions");
const builderScreen = document.querySelector("#builderScreen");
const aiBuilderForm = document.querySelector("#aiBuilderForm");
const aiDuration = document.querySelector("#aiDuration");
const aiWorkSeconds = document.querySelector("#aiWorkSeconds");
const aiRestSeconds = document.querySelector("#aiRestSeconds");
const aiDifficulty = document.querySelector("#aiDifficulty");
const aiInstructions = document.querySelector("#aiInstructions");
const aiInstructionsCount = document.querySelector("#aiInstructionsCount");
const aiBuilderError = document.querySelector("#aiBuilderError");
const generateWorkoutButton = document.querySelector("#generateWorkoutButton");
const aiPreview = document.querySelector("#aiPreview");
const aiPreviewTitle = document.querySelector("#aiPreviewTitle");
const aiPreviewMeta = document.querySelector("#aiPreviewMeta");
const aiExerciseList = document.querySelector("#aiExerciseList");
const aiSafetyNote = document.querySelector("#aiSafetyNote");
const aiEditButton = document.querySelector("#aiEditButton");
const loadAiWorkoutButton = document.querySelector("#loadAiWorkoutButton");
const builderBackButton = document.querySelector("#builderBackButton");
const themeColor = document.querySelector('meta[name="theme-color"]');

const COLORS = {
  idle: "#111513",
  work: "#087a45",
  rest: "#a1262e",
  complete: "#111513",
  paused: "#000000",
};

const state = {
  phase: "idle",
  running: false,
  paused: false,
  endTime: 0,
  remainingMs: 0,
  totalElapsedMs: 0,
  totalDurationMs: 21 * 60 * 1000,
  totalBeforeCurrentRunMs: 0,
  currentRunStartedAt: 0,
  intervalId: null,
  wakeLock: null,
  audio: null,
  soundOn: true,
  lastTickSecond: 0,
  plan: null,
  currentExerciseIndex: 0,
};

const HISTORY_KEY = "circuit-timer-history";
const HISTORY_LIMIT = 100;
const AI_WORKER_URL =
  typeof window.CIRCUIT_TIMER_CONFIG?.aiWorkerUrl === "string"
    ? window.CIRCUIT_TIMER_CONFIG.aiWorkerUrl.trim().replace(/\/+$/, "")
    : "";
const AI_MAX_INSTRUCTIONS_LENGTH = 240;
const AI_REQUEST_TIMEOUT_MS = 60_000;
const AI_DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
const AI_FOCUS_LABELS = {
  "full-body": "Full body",
  "upper-body": "Upper body",
  "lower-body": "Lower body",
  core: "Core",
  cardio: "Cardio",
};

function parseDuration(input) {
  const seconds = Number(input.value);
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 3600
    ? Math.round(seconds)
    : null;
}

function parseTotalDuration() {
  const minutes = Number(totalDurationInput.value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 180
    ? minutes
    : null;
}

function greatestCommonDivisor(firstNumber, secondNumber) {
  let first = firstNumber;
  let second = secondNumber;

  while (second !== 0) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }

  return first;
}

function getValidTotalMinuteStep(workSeconds, restSeconds) {
  if (!workSeconds || !restSeconds) return 1;
  const cycleSeconds = workSeconds + restSeconds;
  return cycleSeconds / greatestCommonDivisor(cycleSeconds, 60);
}

function isTotalDurationCompatible(totalMinutes, workSeconds, restSeconds) {
  return (totalMinutes * 60) % (workSeconds + restSeconds) === 0;
}

function normalizeTotalDuration() {
  const workSeconds = parseDuration(workInput);
  const restSeconds = parseDuration(restInput);
  const validMinuteStep = getValidTotalMinuteStep(workSeconds, restSeconds);
  const enteredMinutes = Number(totalDurationInput.value);
  const requestedMinutes = Number.isFinite(enteredMinutes) ? enteredMinutes : validMinuteStep;
  const largestValidValue = Math.floor(180 / validMinuteStep) * validMinuteStep;
  const normalizedMinutes = Math.min(
    largestValidValue,
    Math.max(validMinuteStep, Math.round(requestedMinutes / validMinuteStep) * validMinuteStep),
  );

  totalDurationInput.min = String(validMinuteStep);
  totalDurationInput.step = String(validMinuteStep);
  totalDurationInput.value = String(normalizedMinutes);
  syncSettingInputWidth(totalDurationInput);
  state.totalDurationMs = normalizedMinutes * 60 * 1000;
  updateDisplay();

  return normalizedMinutes;
}

function syncSettingInputWidth(input) {
  const digits = Math.max(1, String(input.value || "").length);
  input.style.setProperty("--input-width", `${digits}ch`);
}

function getDurationMs(phase) {
  const input = phase === "work" ? workInput : restInput;
  return (parseDuration(input) || 0) * 1000;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  if (totalSeconds < 60) {
    return `:${String(totalSeconds).padStart(2, "0")}`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setPhase(phase) {
  state.phase = phase;
  state.lastTickSecond = 0;
  app.dataset.phase = phase;
  themeColor.content = COLORS[phase];
  syncExerciseDisplay();

  if (phase === "work") {
    phaseLabel.textContent = "WORKOUT";
    timerHint.textContent = "Stay strong. Rest is next.";
  } else if (phase === "rest") {
    phaseLabel.textContent = "REST";
    timerHint.textContent = "Breathe. Your next interval is coming.";
  } else if (phase === "complete") {
    phaseLabel.textContent = "COMPLETE";
    timerHint.textContent = "Workout finished. Great work.";
  } else {
    phaseLabel.textContent = "READY";
    timerHint.textContent = "Set your intervals, then press start.";
  }
}

function setInputsDisabled(disabled) {
  workInput.disabled = disabled;
  restInput.disabled = disabled;
  totalDurationInput.disabled = disabled;
}

function saveSettings() {
  try {
    localStorage.setItem(
      "circuit-timer-settings",
      JSON.stringify({
        work: workInput.value,
        rest: restInput.value,
        totalDuration: totalDurationInput.value,
        sound: state.soundOn,
      }),
    );
  } catch {
    // Storage is unavailable; settings will not persist.
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("circuit-timer-settings"));
    if (!saved) return;
    if (saved.work) workInput.value = saved.work;
    if (saved.rest) restInput.value = saved.rest;
    if (saved.totalDuration) totalDurationInput.value = saved.totalDuration;
    if (saved.sound === false) state.soundOn = false;
  } catch {
    try {
      localStorage.removeItem("circuit-timer-settings");
    } catch {
      // Storage is unavailable; there is nothing to clear.
    }
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || state.wakeLock || !state.running) return;
  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
    state.wakeLock.addEventListener("release", () => {
      state.wakeLock = null;
    });
  } catch {
    state.wakeLock = null;
  }
}

async function releaseWakeLock() {
  if (!state.wakeLock) return;
  try {
    await state.wakeLock.release();
  } finally {
    state.wakeLock = null;
  }
}

function ensureAudioContext() {
  if (!state.soundOn) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!state.audio) state.audio = new AudioContextClass();
  if (state.audio.state === "suspended") state.audio.resume().catch(() => {});

  return state.audio;
}

function playTone(frequency, durationSeconds, delaySeconds = 0, volume = 0.14) {
  const audio = ensureAudioContext();
  if (!audio) return;

  try {
    const startAt = audio.currentTime + delaySeconds;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSeconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationSeconds + 0.02);
  } catch {
    // Audio is unavailable; stay silent.
  }
}

function playPhaseTone(phase) {
  if (!state.soundOn) return;

  if (phase === "work") {
    playTone(880, 0.12);
    playTone(1175, 0.18, 0.14);
  } else if (phase === "rest") {
    playTone(587, 0.2);
    playTone(440, 0.25, 0.18);
  }
}

function playCountdownTick() {
  playTone(1047, 0.07, 0, 0.08);
}

function playCompleteChime() {
  if (!state.soundOn) return;

  playTone(523, 0.15);
  playTone(659, 0.15, 0.16);
  playTone(784, 0.15, 0.32);
  playTone(1047, 0.35, 0.48);
}

function vibratePattern(pattern) {
  if (!state.soundOn || !("vibrate" in navigator)) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is unavailable; skip.
  }
}

function syncSoundToggle() {
  soundToggle.textContent = state.soundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(state.soundOn));
}

function syncExerciseDisplay() {
  if (!state.plan || state.plan.exercises.length === 0) {
    exerciseLabel.textContent = "";
    exerciseInstructions.textContent = "";
    return;
  }

  const exercise = state.plan.exercises[state.currentExerciseIndex % state.plan.exercises.length];
  exerciseLabel.textContent = exercise.name;
  exerciseInstructions.textContent = exercise.instructions;
}

function getSelectedFocus() {
  return aiBuilderForm.querySelector('input[name="focus"]:checked')?.value || "full-body";
}

function getSelectedEquipment() {
  return Array.from(aiBuilderForm.querySelectorAll('input[name="equipment"]:checked')).map(
    (input) => input.value,
  );
}

function getBuilderRequest() {
  return {
    durationMinutes: Number(aiDuration.value),
    workSeconds: Number(aiWorkSeconds.value),
    restSeconds: Number(aiRestSeconds.value),
    difficulty: aiDifficulty.value,
    focus: getSelectedFocus(),
    equipment: getSelectedEquipment(),
    instructions: aiInstructions.value.trim(),
  };
}

function syncBuilderDurationOptions() {
  const workSeconds = Number(aiWorkSeconds.value);
  const restSeconds = Number(aiRestSeconds.value);
  const cycleSeconds = workSeconds + restSeconds;
  const currentValue = Number(aiDuration.value) || 15;
  const options = [];

  for (let minutes = 5; minutes <= 120; minutes += 1) {
    if ((minutes * 60) % cycleSeconds === 0) options.push(minutes);
  }

  aiDuration.textContent = "";
  options.forEach((minutes) => {
    const option = document.createElement("option");
    option.value = String(minutes);
    option.textContent = `${minutes} minute${minutes === 1 ? "" : "s"}`;
    aiDuration.appendChild(option);
  });
  aiDuration.value = String(options.includes(currentValue) ? currentValue : options[0]);
}

function populateBuilder() {
  syncBuilderDurationOptions();
  aiInstructionsCount.textContent = `0 / ${AI_MAX_INSTRUCTIONS_LENGTH}`;
}

function showBuilderError(message) {
  aiBuilderError.textContent = message;
}

function clearBuilderError() {
  showBuilderError("");
}

function openBuilder() {
  if (state.running || state.paused) return;
  populateBuilder();
  clearBuilderError();
  app.dataset.view = "builder";
  document.title = "AI Circuit Builder - Circuit Timer";
  window.requestAnimationFrame(() => builderScreen.querySelector("h2").focus());
}

function closeBuilder() {
  app.dataset.view = "timer";
  updateDisplay();
}

function validateAIPlan(candidate, request) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("The AI returned an invalid workout.");
  }

  const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, 80) : "";
  const safetyNote =
    typeof candidate.safetyNote === "string" ? candidate.safetyNote.trim().slice(0, 180) : "";
  const exercises = Array.isArray(candidate.exercises) ? candidate.exercises : [];
  const totalSeconds = request.durationMinutes * 60;
  const cycleSeconds = request.workSeconds + request.restSeconds;

  if (
    !title ||
    !safetyNote ||
    exercises.length < 1 ||
    exercises.length > 8 ||
    totalSeconds % cycleSeconds !== 0
  ) {
    throw new Error("The AI returned a workout that did not pass validation.");
  }

  const cleanedExercises = exercises.map((exercise) => {
    const name = typeof exercise?.name === "string" ? exercise.name.trim().slice(0, 60) : "";
    const instructions =
      typeof exercise?.instructions === "string"
        ? exercise.instructions.trim().slice(0, 180)
        : "";
    if (!name || !instructions) {
      throw new Error("The AI returned an incomplete exercise.");
    }
    return { name, instructions };
  });

  const intervalCount = totalSeconds / cycleSeconds;
  if (intervalCount % cleanedExercises.length !== 0) {
    throw new Error("The AI returned an exercise list that does not fit the timer.");
  }

  return {
    title,
    safetyNote,
    exercises: cleanedExercises,
    durationMinutes: request.durationMinutes,
    durationSeconds: totalSeconds,
    workSeconds: request.workSeconds,
    restSeconds: request.restSeconds,
    rounds: intervalCount / cleanedExercises.length,
    difficulty: request.difficulty,
    focus: request.focus,
    equipment: request.equipment,
  };
}

function renderAIPlan(plan) {
  aiPreviewTitle.textContent = plan.title;
  aiPreviewMeta.textContent =
    `${plan.durationMinutes} minutes · ${plan.rounds} rounds · ` +
    `${AI_DIFFICULTY_LABELS[plan.difficulty]} · ${AI_FOCUS_LABELS[plan.focus]}`;
  aiExerciseList.textContent = "";

  plan.exercises.forEach((exercise) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const instructions = document.createElement("span");
    name.textContent = exercise.name;
    instructions.textContent = exercise.instructions;
    item.append(name, instructions);
    aiExerciseList.appendChild(item);
  });

  aiSafetyNote.textContent = plan.safetyNote;
  aiPreview.hidden = false;
}

async function generateAIWorkout(event) {
  event.preventDefault();
  clearBuilderError();

  if (!AI_WORKER_URL) {
    showBuilderError("The AI Worker URL is not configured yet. Add it to ai-config.js after deployment.");
    return;
  }

  const request = getBuilderRequest();
  if (request.equipment.length === 0) {
    showBuilderError("Choose at least one equipment option.");
    return;
  }

  aiPreview.hidden = true;
  generateWorkoutButton.disabled = true;
  generateWorkoutButton.setAttribute("aria-busy", "true");
  generateWorkoutButton.textContent = "Generating...";

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_WORKER_URL}/api/generate-workout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "The workout builder could not be reached.");

    const plan = validateAIPlan(body?.workout, request);
    state.plan = plan;
    state.currentExerciseIndex = 0;
    renderAIPlan(plan);
  } catch (error) {
    showBuilderError(describeAIError(error));
  } finally {
    window.clearTimeout(timeoutId);
    generateWorkoutButton.disabled = false;
    generateWorkoutButton.setAttribute("aria-busy", "false");
    generateWorkoutButton.textContent = "Generate Workout with AI";
  }
}

function describeAIError(error) {
  if (error?.name === "AbortError") {
    return "The workout took too long to build, so the request stopped. Please try again.";
  }

  // fetch() rejects with a TypeError for connection failures, which is the only
  // case where the browser message would otherwise reach the user.
  if (error instanceof TypeError) {
    return navigator.onLine
      ? "Could not reach the workout builder. Please try again in a moment. Your timer still works."
      : "You are offline. The AI builder needs a connection, but your timer still works.";
  }

  return error instanceof Error && error.message
    ? error.message
    : "The workout builder is unavailable right now. Your timer still works.";
}

function loadAIPlanIntoTimer() {
  if (!state.plan) return;

  workInput.value = String(state.plan.workSeconds);
  restInput.value = String(state.plan.restSeconds);
  totalDurationInput.value = String(state.plan.durationMinutes);
  [workInput, restInput, totalDurationInput].forEach(syncSettingInputWidth);
  state.currentExerciseIndex = 0;
  normalizeTotalDuration();
  returnToReady();
  saveSettings();
}

function editAIPlan() {
  aiPreview.hidden = true;
  clearBuilderError();
  aiInstructions.focus();
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage is unavailable; history will not persist.
  }
}

function saveWorkoutRecord({ totalSeconds, workSeconds, restSeconds, rounds, completionPercent }) {
  if (totalSeconds < 1) return;

  const history = loadHistory();
  history.unshift({
    finishedAt: Date.now(),
    totalSeconds,
    workSeconds,
    restSeconds,
    rounds,
    completionPercent,
    workInterval: parseDuration(workInput) || 0,
    restInterval: parseDuration(restInput) || 0,
  });
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
  saveHistory(history);
}

function formatHistoryDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderHistory() {
  const history = loadHistory();
  const totalSeconds = history.reduce((sum, record) => sum + record.totalSeconds, 0);

  historyCount.textContent =
    history.length === 0
      ? "No workouts logged yet."
      : `${history.length} workout${history.length === 1 ? "" : "s"} · ${formatElapsedTime(totalSeconds * 1000)} total`;

  historyList.textContent = "";

  if (history.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "history-empty";
    emptyMessage.textContent = "Finish your first workout and it will appear here.";
    historyList.appendChild(emptyMessage);
    return;
  }

  history.forEach((record, index) => {
    const entry = document.createElement("article");
    entry.className = "history-entry";

    const details = document.createElement("div");

    const dateLine = document.createElement("p");
    dateLine.className = "history-entry-date";
    dateLine.textContent = formatHistoryDate(record.finishedAt);
    details.appendChild(dateLine);

    const statsLine = document.createElement("p");
    statsLine.className = "history-entry-stats";
    statsLine.textContent =
      `${formatElapsedTime(record.totalSeconds * 1000)} total · ` +
      `${formatElapsedTime(record.workSeconds * 1000)} work · ` +
      `${formatElapsedTime(record.restSeconds * 1000)} rest · ` +
      `${record.rounds} round${record.rounds === 1 ? "" : "s"} · ` +
      `${record.completionPercent}%`;
    details.appendChild(statsLine);

    const intervalsLine = document.createElement("p");
    intervalsLine.className = "history-entry-intervals";
    intervalsLine.textContent = `${record.workInterval}s work / ${record.restInterval}s rest intervals`;
    details.appendChild(intervalsLine);

    const deleteButton = document.createElement("button");
    deleteButton.className = "history-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete workout from ${formatHistoryDate(record.finishedAt)}`);
    deleteButton.dataset.index = String(index);

    entry.appendChild(details);
    entry.appendChild(deleteButton);
    historyList.appendChild(entry);
  });
}

function openHistory() {
  if (state.running || state.paused) return;
  renderHistory();
  app.dataset.view = "history";
  document.title = "Workout History - Circuit Timer";
  window.requestAnimationFrame(() => historyTitle.focus());
}

function closeHistory() {
  app.dataset.view = "timer";
  updateDisplay();
}

function updateDisplay() {
  countdown.textContent = formatTime(state.remainingMs);
  totalTime.textContent = formatElapsedTime(state.totalElapsedMs);
  remainingTotalTime.textContent = formatRemainingTime(
    Math.max(0, state.totalDurationMs - state.totalElapsedMs),
  );
  document.title =
    state.phase === "idle"
      ? "Circuit Timer"
      : `${phaseLabel.textContent} ${countdown.textContent} · Circuit Timer`;
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function advancePhase(now) {
  let transitionCount = 0;

  while (now >= state.endTime && transitionCount < 500) {
    const nextPhase = state.phase === "work" ? "rest" : "work";
    setPhase(nextPhase);
    state.endTime += getDurationMs(nextPhase);
    transitionCount += 1;
  }

  if (transitionCount >= 500) {
    state.endTime = now + getDurationMs(state.phase);
  }

  if (transitionCount > 0) {
    if (state.phase === "work" && state.plan) {
      state.currentExerciseIndex =
        (state.currentExerciseIndex + 1) % state.plan.exercises.length;
      syncExerciseDisplay();
    }
    playPhaseTone(state.phase);
    vibratePattern(state.phase === "work" ? [80, 60, 80] : [120]);
  }
}

function tick() {
  if (!state.running) return;
  const now = Date.now();
  state.totalElapsedMs = state.totalBeforeCurrentRunMs + (now - state.currentRunStartedAt);

  if (state.totalElapsedMs >= state.totalDurationMs) {
    finishWorkout();
    return;
  }

  advancePhase(now);
  state.remainingMs = Math.max(0, state.endTime - now);

  const secondsLeft = Math.ceil(state.remainingMs / 1000);
  if (
    state.soundOn &&
    (state.phase === "work" || state.phase === "rest") &&
    secondsLeft >= 1 &&
    secondsLeft <= 3 &&
    secondsLeft !== state.lastTickSecond
  ) {
    state.lastTickSecond = secondsLeft;
    playCountdownTick();
  }

  updateDisplay();
}

function beginTicking() {
  clearInterval(state.intervalId);
  tick();
  state.intervalId = window.setInterval(tick, 100);
}

function startWorkout() {
  const workSeconds = parseDuration(workInput);
  const restSeconds = parseDuration(restInput);

  if (!workSeconds || !restSeconds) {
    errorMessage.textContent = "Use 1-3,600 seconds for each interval.";
    return;
  }

  let totalMinutes = parseTotalDuration();
  if (
    !totalMinutes ||
    !isTotalDurationCompatible(totalMinutes, workSeconds, restSeconds)
  ) {
    totalMinutes = normalizeTotalDuration();
  }

  errorMessage.textContent = "";
  saveSettings();
  setInputsDisabled(true);
  setPhase("work");
  state.running = true;
  state.paused = false;
  app.dataset.paused = "false";
  state.remainingMs = workSeconds * 1000;
  state.totalElapsedMs = 0;
  state.totalDurationMs = totalMinutes * 60 * 1000;
  state.totalBeforeCurrentRunMs = 0;
  state.currentRunStartedAt = Date.now();
  state.endTime = state.currentRunStartedAt + state.remainingMs;
  state.currentExerciseIndex = 0;
  syncExerciseDisplay();

  playPhaseTone("work");
  vibratePattern([80, 60, 80]);

  startButton.disabled = true;
  startButton.textContent = "Workout in Progress";
  pauseButton.disabled = false;
  pauseButton.textContent = "Pause";
  beginTicking();
  requestWakeLock();
}

function finishWorkout() {
  clearInterval(state.intervalId);
  state.running = false;
  state.paused = false;
  app.dataset.paused = "false";
  state.totalElapsedMs = state.totalDurationMs;
  state.totalBeforeCurrentRunMs = state.totalDurationMs;
  state.remainingMs = 0;
  setPhase("complete");
  setInputsDisabled(false);
  startButton.disabled = false;
  startButton.textContent = "Start Workout";
  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";
  releaseWakeLock();
  playCompleteChime();
  vibratePattern([120, 80, 120, 80, 200]);
  showWorkoutSummary();
}

function pauseOrResume() {
  if (state.running) {
    const now = Date.now();
    state.remainingMs = Math.max(0, state.endTime - now);
    state.totalBeforeCurrentRunMs += now - state.currentRunStartedAt;
    state.totalElapsedMs = state.totalBeforeCurrentRunMs;
    state.running = false;
    state.paused = true;
    app.dataset.paused = "true";
    themeColor.content = COLORS.paused;
    clearInterval(state.intervalId);
    startButton.disabled = false;
    startButton.textContent = "End Workout";
    pauseButton.textContent = "Resume";
    timerHint.textContent = "Paused";
    releaseWakeLock();
    updateDisplay();
    return;
  }

  if (state.paused) {
    state.currentRunStartedAt = Date.now();
    state.endTime = state.currentRunStartedAt + state.remainingMs;
    state.running = true;
    state.paused = false;
    app.dataset.paused = "false";
    themeColor.content = COLORS[state.phase];
    startButton.disabled = true;
    startButton.textContent = "Workout in Progress";
    pauseButton.textContent = "Pause";
    timerHint.textContent =
      state.phase === "work"
        ? "Stay strong. Rest is next."
        : "Breathe. Your next interval is coming.";
    beginTicking();
    requestWakeLock();
  }
}

function endWorkout() {
  clearInterval(state.intervalId);
  state.running = false;
  state.paused = false;
  app.dataset.paused = "false";
  setInputsDisabled(false);
  showWorkoutSummary();
  releaseWakeLock();
}

function getSummaryFeedback(completionPercent) {
  if (completionPercent < 10) return "That was adorable.";
  if (completionPercent < 25) return "Your warm-up wants a refund.";
  if (completionPercent < 50) return "The workout won this round.";
  if (completionPercent < 75) return "Okay! Your excuses are sweating.";
  if (completionPercent < 90) return "Strong work! The finish line got nervous.";
  if (completionPercent < 100) return "So close! The finish line flinched.";
  return "ABSOLUTE MACHINE! YOU CRUSHED IT!";
}

function showWorkoutSummary() {
  const totalSeconds = Math.max(0, Math.floor(state.totalElapsedMs / 1000));
  const completionPercent =
    state.totalDurationMs > 0
      ? Math.min(100, Math.round((state.totalElapsedMs / state.totalDurationMs) * 100))
      : 0;
  const workSeconds = parseDuration(workInput) || 0;
  const restSeconds = parseDuration(restInput) || 0;
  const cycleSeconds = workSeconds + restSeconds;
  const completedRounds = cycleSeconds > 0 ? Math.floor(totalSeconds / cycleSeconds) : 0;
  const secondsIntoCurrentRound = cycleSeconds > 0 ? totalSeconds % cycleSeconds : 0;
  const totalWorkoutSeconds =
    completedRounds * workSeconds + Math.min(secondsIntoCurrentRound, workSeconds);
  const totalRestSeconds = Math.max(0, totalSeconds - totalWorkoutSeconds);

  summaryTitle.textContent = getSummaryFeedback(completionPercent);
  summaryMessage.textContent =
    `You completed ${completionPercent}% of your planned workout.`;
  summaryTotalTime.textContent = formatElapsedTime(totalSeconds * 1000);
  summaryWorkoutTime.textContent = formatElapsedTime(totalWorkoutSeconds * 1000);
  summaryRestTime.textContent = formatElapsedTime(totalRestSeconds * 1000);
  summaryRounds.textContent = String(completedRounds);
  saveWorkoutRecord({
    totalSeconds,
    workSeconds: totalWorkoutSeconds,
    restSeconds: totalRestSeconds,
    rounds: completedRounds,
    completionPercent,
  });
  app.dataset.view = "summary";
  setPhase("complete");
  document.title = "Workout Summary - Circuit Timer";
  window.requestAnimationFrame(() => summaryTitle.focus());
}

function returnToReady() {
  app.dataset.view = "timer";
  state.endTime = 0;
  state.remainingMs = (parseDuration(workInput) || 0) * 1000;
  state.totalElapsedMs = 0;
  state.totalBeforeCurrentRunMs = 0;
  state.currentRunStartedAt = 0;
  setPhase("idle");
  setInputsDisabled(false);
  startButton.disabled = false;
  startButton.textContent = "Start Workout";
  pauseButton.disabled = false;
  pauseButton.textContent = "Reset";
  errorMessage.textContent = "";
  updateDisplay();
}

function resetReadyTimers() {
  if (state.phase !== "idle" || state.running || state.paused) return;

  workInput.value = "0";
  restInput.value = "0";
  totalDurationInput.value = "0";
  [workInput, restInput, totalDurationInput].forEach(syncSettingInputWidth);
  state.remainingMs = 0;
  state.totalElapsedMs = 0;
  state.totalDurationMs = 0;
  state.totalBeforeCurrentRunMs = 0;
  state.currentRunStartedAt = 0;
  state.endTime = 0;
  errorMessage.textContent = "";
  saveSettings();
  updateDisplay();
}

function previewWorkTime() {
  if (state.phase !== "idle") return;
  const seconds = parseDuration(workInput);
  if (seconds) {
    state.remainingMs = seconds * 1000;
    updateDisplay();
  } else if (Number(workInput.value) === 0) {
    state.remainingMs = 0;
    updateDisplay();
  }
}

function previewTotalDuration() {
  if (state.phase !== "idle" && state.phase !== "complete") return;
  const minutes = parseTotalDuration();
  if (minutes) {
    state.totalDurationMs = minutes * 60 * 1000;
    updateDisplay();
  } else if (Number(totalDurationInput.value) === 0) {
    state.totalDurationMs = 0;
    updateDisplay();
  }
}

function clearZeroInputOnFocus(input) {
  if (Number(input.value) !== 0) return;
  input.value = "";
  syncSettingInputWidth(input);
}

function restoreEmptyInputOnBlur(input) {
  if (input.value !== "") return;
  input.value = "0";
  syncSettingInputWidth(input);

  if (input === workInput) state.remainingMs = 0;
  if (input === totalDurationInput) state.totalDurationMs = 0;

  saveSettings();
  updateDisplay();
}

startButton.addEventListener("click", () => {
  if (state.paused) {
    endWorkout();
  } else if (!state.running) {
    startWorkout();
  }
});
pauseButton.addEventListener("click", () => {
  if (state.phase === "idle" && !state.running && !state.paused) {
    resetReadyTimers();
  } else {
    pauseOrResume();
  }
});
readyButton.addEventListener("click", returnToReady);
soundToggle.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  syncSoundToggle();
  saveSettings();

  if (state.soundOn) {
    ensureAudioContext();
    playTone(880, 0.1);
  }
});
historyToggle.addEventListener("click", openHistory);
historyBackButton.addEventListener("click", closeHistory);
historyClearButton.addEventListener("click", () => {
  if (loadHistory().length === 0) return;
  if (!window.confirm("Delete all workout history? This cannot be undone.")) return;
  saveHistory([]);
  renderHistory();
});
historyList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".history-delete-button");
  if (!deleteButton) return;

  const history = loadHistory();
  history.splice(Number(deleteButton.dataset.index), 1);
  saveHistory(history);
  renderHistory();
});
aiBuilderToggle.addEventListener("click", openBuilder);
builderBackButton.addEventListener("click", closeBuilder);
aiBuilderForm.addEventListener("submit", generateAIWorkout);
aiWorkSeconds.addEventListener("change", syncBuilderDurationOptions);
aiRestSeconds.addEventListener("change", syncBuilderDurationOptions);
aiInstructions.addEventListener("input", () => {
  aiInstructionsCount.textContent = `${aiInstructions.value.length} / ${AI_MAX_INSTRUCTIONS_LENGTH}`;
});
aiEditButton.addEventListener("click", editAIPlan);
loadAiWorkoutButton.addEventListener("click", loadAIPlanIntoTimer);
workInput.addEventListener("input", previewWorkTime);
totalDurationInput.addEventListener("input", previewTotalDuration);
workInput.addEventListener("change", () => {
  if (workInput.value === "") return;
  if (parseDuration(workInput) && parseDuration(restInput)) normalizeTotalDuration();
  saveSettings();
});
restInput.addEventListener("change", () => {
  if (restInput.value === "") return;
  if (parseDuration(workInput) && parseDuration(restInput)) normalizeTotalDuration();
  saveSettings();
});
totalDurationInput.addEventListener("change", () => {
  if (totalDurationInput.value === "") return;
  if (parseDuration(workInput) && parseDuration(restInput)) normalizeTotalDuration();
  saveSettings();
});
[workInput, restInput, totalDurationInput].forEach((input) => {
  input.addEventListener("focus", () => clearZeroInputOnFocus(input));
  input.addEventListener("blur", () => restoreEmptyInputOnBlur(input));
  input.addEventListener("input", () => syncSettingInputWidth(input));
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.running) {
    tick();
    requestWakeLock();
  }
});

window.addEventListener("beforeunload", releaseWakeLock);

loadSettings();
syncSoundToggle();
syncExerciseDisplay();
populateBuilder();
const settingsAreCleared =
  Number(workInput.value) === 0 &&
  Number(restInput.value) === 0 &&
  Number(totalDurationInput.value) === 0;
if (!settingsAreCleared) normalizeTotalDuration();
[workInput, restInput, totalDurationInput].forEach(syncSettingInputWidth);
state.remainingMs = (parseDuration(workInput) || 0) * 1000;
state.totalDurationMs = (parseTotalDuration() || 0) * 60 * 1000;
updateDisplay();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js?v=59").catch(() => {});
  });
}
