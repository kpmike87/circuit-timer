const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_INSTRUCTIONS_LENGTH = 240;
const ALLOWED_ORIGINS = new Set(["https://kpmike87.github.io"]);
const ALLOWED_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
const ALLOWED_FOCUSES = new Set(["full-body", "upper-body", "lower-body", "core", "cardio"]);
const ALLOWED_EQUIPMENT = new Set(["bodyweight", "dumbbells", "bands"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = getCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      if (origin && !isAllowedOrigin(origin)) {
        return json({ error: "Origin not allowed." }, 403);
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (origin && !isAllowedOrigin(origin)) {
      return json({ error: "Origin not allowed." }, 403);
    }

    if (url.pathname !== "/api/generate-workout") {
      return json({ error: "Not found." }, 404, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST for workout generation." }, 405, cors);
    }

    if (!env.AI) {
      return json({ error: "Workers AI is not configured for this Worker." }, 500, cors);
    }

    let stage = "run";
    let rawResponse = null;
    let rawResponseLength = null;
    let modelUsage = null;
    try {
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > 16_000) {
        return json({ error: "The request is too large." }, 413, cors);
      }

      const input = validateRequest(await request.json());
      const modelResponse = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content:
              "You create safe, practical circuit workouts. Return only one JSON object with title, exercises, and safetyNote. " +
              "Do not give medical advice. Do not include exercises that require equipment the user did not select. " +
              "Use common exercise names and short, clear instructions. Respect every user instruction unless it conflicts with safety.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
        response_format: { type: "json_object" },
      });

      stage = "parse";
      modelUsage = modelResponse && modelResponse.usage ? modelResponse.usage : null;
      const raw = modelResponse?.response ?? modelResponse;
      if (typeof raw === "string") {
        rawResponse = raw.slice(0, 300);
        rawResponseLength = raw.length;
      } else if (raw) {
        const serialized = JSON.stringify(raw);
        rawResponse = serialized.slice(0, 300);
        rawResponseLength = serialized.length;
      }

      const parsed = parseModelResponse(modelResponse);
      stage = "validate";
      const parsedJson = JSON.stringify(parsed);
      rawResponse = parsedJson.slice(0, 300);
      rawResponseLength = parsedJson.length;
      const workout = validateModelResponse(parsed, input);
      return json({ workout, model: MODEL }, 200, cors);
    } catch (error) {
      console.error(
        "Workout generation failed:",
        error instanceof Error ? error.message : error,
        "stage:",
        stage,
        "rawLength:",
        rawResponseLength
      );
      const isInput = error instanceof InputError;
      const status = isInput ? error.status : 502;
      const message = isInput
        ? error.message
        : "The AI could not create a valid workout. Please try again.";
      const body = { error: message };
      if (!isInput) {
        body.diagnostic = {
          stage,
          detail: String(error instanceof Error ? error.message : error).slice(0, 300),
          rawResponse,
          rawResponseLength,
          usage: modelUsage,
        };
      }
      return json(body, status, cors);
    }
  },
};

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "InputError";
    this.status = status;
  }
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin);
}

function getCorsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(body, status, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}

function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputError("Send a workout configuration.");
  }

  const durationMinutes = Number(body.durationMinutes);
  const workSeconds = Number(body.workSeconds);
  const restSeconds = Number(body.restSeconds);
  const difficulty = body.difficulty;
  const focus = body.focus;
  const equipment = Array.isArray(body.equipment) ? body.equipment : [];
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";

  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 120) {
    throw new InputError("Workout duration must be between 5 and 120 minutes.");
  }
  if (!Number.isInteger(workSeconds) || workSeconds < 5 || workSeconds > 300) {
    throw new InputError("Work intervals must be between 5 and 300 seconds.");
  }
  if (!Number.isInteger(restSeconds) || restSeconds < 5 || restSeconds > 180) {
    throw new InputError("Rest intervals must be between 5 and 180 seconds.");
  }
  if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
    throw new InputError("Choose a supported difficulty.");
  }
  if (!ALLOWED_FOCUSES.has(focus)) {
    throw new InputError("Choose a supported workout focus.");
  }
  if (
    equipment.length < 1 ||
    equipment.length > ALLOWED_EQUIPMENT.size ||
    equipment.some((item) => !ALLOWED_EQUIPMENT.has(item))
  ) {
    throw new InputError("Choose at least one supported equipment option.");
  }
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new InputError(`Instructions must be ${MAX_INSTRUCTIONS_LENGTH} characters or fewer.`);
  }

  const totalSeconds = durationMinutes * 60;
  const cycleSeconds = workSeconds + restSeconds;
  if (totalSeconds % cycleSeconds !== 0) {
    throw new InputError("Choose intervals that fit evenly into the selected duration.");
  }

  const intervalCount = totalSeconds / cycleSeconds;
  const exerciseCount = [8, 6, 5, 4, 3, 2, 1].find((count) => intervalCount % count === 0) || 1;

  return {
    durationMinutes,
    totalSeconds,
    workSeconds,
    restSeconds,
    difficulty,
    focus,
    equipment,
    instructions,
    exerciseCount,
    rounds: intervalCount / exerciseCount,
  };
}

function buildPrompt(input) {
  const equipmentLabels = input.equipment.join(", ");
  return [
    `Create a ${input.durationMinutes}-minute ${input.difficulty} ${input.focus} circuit.`,
    `Use ${input.workSeconds} seconds of work and ${input.restSeconds} seconds of rest.`,
    `Return exactly ${input.exerciseCount} exercises in a reusable order.`,
    `The timer will repeat that order for exactly ${input.rounds} rounds.`,
    `Available equipment: ${equipmentLabels}.`,
    `User instructions: ${input.instructions || "None provided."}`,
    "Do not include warm-up or cool-down items in the exercise list.",
    "Keep each exercise practical for the selected focus and equipment.",
    "Include a short safetyNote reminding the user to stop if something hurts.",
  ].join("\n");
}

function parseModelResponse(modelResponse) {
  const raw = modelResponse?.response ?? modelResponse;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") {
    throw new Error("The model returned no JSON.");
  }

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("The model response was not JSON.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function validateModelResponse(candidate, input) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("The model response was not an object.");
  }

  const title = cleanText(candidate.title, 80);
  const safetyNote = cleanText(candidate.safetyNote, 180);
  const exercises = Array.isArray(candidate.exercises) ? candidate.exercises : [];

  if (!title || !safetyNote || exercises.length !== input.exerciseCount) {
    throw new Error("The model response did not match the workout contract.");
  }

  const cleanedExercises = exercises.map((exercise) => {
    const name = cleanText(exercise?.name, 60);
    const instructions = cleanText(exercise?.instructions, 180);
    if (!name || !instructions) throw new Error("The model returned an incomplete exercise.");
    return { name, instructions };
  });

  return {
    title,
    durationMinutes: input.durationMinutes,
    durationSeconds: input.totalSeconds,
    workSeconds: input.workSeconds,
    restSeconds: input.restSeconds,
    rounds: input.rounds,
    difficulty: input.difficulty,
    focus: input.focus,
    equipment: input.equipment,
    exercises: cleanedExercises,
    safetyNote,
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
