# Circuit Timer AI Worker

This Worker generates structured circuit plans for the GitHub Pages Circuit Timer.

## Runtime configuration

- Worker name: `circuit-timer`
- AI binding: `AI`
- Model: `@cf/meta/llama-3.1-8b-instruct`
- API route: `POST /api/generate-workout`
- Allowed browser origin: `https://kpmike87.github.io`

The Worker uses Workers AI JSON Mode, then validates the model response before returning it. It does not use authentication, D1, KV, Durable Objects, or secrets.

## Abuse protection

Generation costs Workers AI neurons and takes 15 to 50 seconds, so the endpoint is protected before any request body is read:

- Requests must send an allowed `Origin`. Requests with a missing or different origin get `403`.
- `CLIENT_RATE_LIMIT`: 8 requests per 60 seconds per client IP.
- `GLOBAL_RATE_LIMIT`: 20 requests per 60 seconds for the endpoint as a whole.

Exceeding either limit returns `429` with a `Retry-After` header and a message the app shows directly. Both limits come from the `[[ratelimits]]` bindings in `wrangler.toml` and need no dashboard setup, but they are a coarse brake rather than exact accounting: they are counted per Cloudflare location, their counters are eventually consistent (so a burst can overshoot the configured numbers before 429 responses begin), and the per-client limit keys on the caller's IP, which many people can share. They slow bursts rather than cap daily spend; the Workers AI daily allowance is the real cost ceiling, so add a usage alert if this Worker moves to a paid plan. Cloudflare's dashboard does not show these limits; Workers Logs are the way to watch the 429 responses.

WAF rate limiting rules cannot protect a `workers.dev` URL, because those rules only apply to a zone you own. Putting the Worker behind a custom domain would allow them as an extra layer.

## Deploy

From this directory:

```sh
npx wrangler deploy
```

For Cloudflare Workers Builds, use this directory as the root directory and `npx wrangler deploy` as the deploy command. No build output directory is required.

## Selection reliability and diagnostics

The model is explicitly listed as supporting [Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/). The Worker assigns movement-category slots and supplies a JSON schema with only eligible IDs for each slot. AI still chooses the exercises and receives all free-text preferences. Runtime validation enforces distinct IDs, coverage, eligibility and repetition limits. One invalid response gets one corrective inference attempt; explicit inability to comply (422) and provider failures (503) are not retried. No unchecked or generic fallback plan is returned.

Interpretation and selection attempts share a 50-second response budget, within the frontend's existing 60-second timeout. Timing out the response does not cancel an already submitted provider inference. Requests without free text use at most two inference calls; nonempty free text adds one interpretation call within the same deadline (at most three total calls per admitted request); existing HTTP rate limits are unchanged.

Error JSON includes a code and requestId. `AI_INVALID_SELECTION` (502) means both selections failed validation; `AI_SERVICE_UNAVAILABLE` (503) means inference threw; `AI_TIMEOUT` (503) means the response budget expired. Logs contain diagnostic codes and correlation IDs, not raw prompts, model responses, user instructions, or provider exception text. Check Workers logs and Workers AI usage for account-level failures.

The reported v65 error could originate from inference, parsing, or selection validation because all three previously shared one message. The specific production exception has not been observed; this repair targets the source-level reliability gaps rather than claiming a confirmed live root cause.

## Optional instructions take effect before exercise selection

Nonempty text is interpreted once with a constrained schema before the catalog slots are built. It can specify a muscle-only focus, additional emphasis, named required exercises, and excluded exercises. An explicit muscle-only request overrides the preset focus; it cannot expand selected equipment, experience, or common movement restrictions. Blank text skips this inference. Both phases and any selection retry share the existing 50-second budget.

For example, `Give me one that just focuses on chest` with Full body selected resolves to chest-only choices. Primary muscle metadata determines eligibility, so biceps-only selects curls rather than back rows that involve biceps secondarily. Supporting muscles still participate in compound movements. Broader workouts with extra emphasis reserve two matching exercises where the catalog permits. The preview displays the resolved muscle focus using its existing notes area.

A small eligible pool produces a shorter repeated sequence, never unrelated exercises to fill eight slots. Unsupported or conflicting instructions return an explanation; malformed interpretation returns `AI_INVALID_INSTRUCTIONS` (502), with no preset fallback. Interpretation is still model-dependent: tests mock it, and review remains necessary. Named exercises are limited to the existing catalog.
