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
  app.dataset.phase = phase;
  themeColor.content = COLORS[phase];

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
    timerHint.replaceChildren(
      "Set your intervals,",
      document.createElement("br"),
      "then press start.",
    );
  }
}

function setInputsDisabled(disabled) {
  workInput.disabled = disabled;
  restInput.disabled = disabled;
  totalDurationInput.disabled = disabled;
}

function saveSettings() {
  localStorage.setItem(
    "circuit-timer-settings",
    JSON.stringify({
      work: workInput.value,
      rest: restInput.value,
      totalDuration: totalDurationInput.value,
    }),
  );
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("circuit-timer-settings"));
    if (!saved) return;
    if (saved.work) workInput.value = saved.work;
    if (saved.rest) restInput.value = saved.rest;
    if (saved.totalDuration) totalDurationInput.value = saved.totalDuration;
  } catch {
    localStorage.removeItem("circuit-timer-settings");
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
    navigator.serviceWorker.register("./service-worker.js?v=54").catch(() => {});
  });
}
