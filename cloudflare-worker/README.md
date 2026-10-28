# Circuit Timer AI Worker

This Worker builds structured circuit plans for the GitHub Pages Circuit Timer.

## Runtime configuration

- Worker name: `circuit-timer`
- AI binding: `AI`
- Model: `@cf/meta/llama-3.1-8b-instruct`
- API route: `POST /api/generate-workout`
- Allowed browser origin: `https://kpmike87.github.io`

The Worker assembles and validates catalog circuits. Optional free text is interpreted with Workers AI JSON Mode before selection. It does not use authentication, D1, KV, Durable Objects, or secrets.

## Abuse protection

Custom-instruction interpretation consumes Workers AI neurons and may be slow. All requests share the existing protections, checked before the body is read:

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

## Catalog generation and AI instructions

Standard selections are assembled directly from validated catalog slots without a model call, including when the AI binding or upstream service is unavailable. Candidates are shuffled, then a complete matching search assigns distinct IDs, starting with narrow slots. This avoids random early choices consuming a later slot's only valid exercise. The result passes the same catalog, equipment, experience, movement coverage, timing, instruction and picture-ID validation as every other plan.

Nonempty optional instructions are interpreted into known muscle groups, required exercise IDs and exclusions before slot allocation. Explicit muscle-only text overrides the preset focus; equipment, experience and common movement restrictions remain hard limits. Primary-muscle eligibility prevents biceps-only plans from filling with back rows that use biceps secondarily. Extra emphasis reserves two matching exercises where available. Small pools repeat a shorter valid list; impossible instructions return 422 rather than unrelated exercises.

Custom instructions use one inference normally and at most two when the first interpretation is malformed. Both share a 50-second response budget within the frontend's 60-second timeout. Provider failures, timeouts and explicit refusals are not retried. Response timeout does not cancel an already submitted provider inference. Standard circuits use zero inference calls.

Error JSON contains a diagnostic code and requestId. `AI_INVALID_INSTRUCTIONS` (502) means interpretation failed after one corrective retry. `AI_SERVICE_UNAVAILABLE` (503) and `AI_TIMEOUT` (503) identify upstream/customization failures. `GENERATION_ERROR` (500) means an unexpected server failure. Logs avoid raw prompts, user text, model output and provider exception details. There is no unchecked fallback or silent disregard of text instructions.

Successful responses include `generatorVersion: "catalog-v1"`, `generationSource` (`catalog` or `ai-preferences/catalog-selection`), and a null `model` for standard circuits. These fields allow deployment and execution-path verification without changing the frontend workout contract. Runtime changes require only the existing Worker deployment, not a frontend cache update.

The exact old production exception was not observed. The standard path now removes that class of model failure altogether. Tests exercise the actual Worker handler for all 105 equipment/focus/experience combinations with no AI binding and repeatedly run upper-body/bodyweight at each level. Natural-language interpretation remains model-dependent and is mocked in tests; live custom-instruction behavior must still be verified.
