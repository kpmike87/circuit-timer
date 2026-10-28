# Workout generation

## Current runtime

Standard builder selections use a complete catalog matching algorithm with no model dependency. Every plan is validated for selected equipment, experience, distinct IDs, movement coverage and timing. This includes upper-body/bodyweight at all experience levels. Shuffled candidates vary circuits; narrow slots are assigned first and the search backtracks rather than failing because of a random early choice.

Optional text is interpreted into a constrained intent before catalog selection. AI handles the meaning of the text; code owns exercise eligibility and assembly. One malformed interpretation may be retried within a shared 50-second budget, for at most two model calls. Standard selections use none. Explicit inability to comply, provider errors and timeouts do not fall back to an unrelated preset. Successful responses identify the generation path and `generatorVersion: catalog-v1`; existing frontend responses, images and caches remain compatible.

All 36 tests pass. They execute the actual Worker handler without an AI binding for all 105 equipment/focus/experience combinations and repeat the reported upper-body/bodyweight case at every level. Intent tests mock AI, so they do not establish live natural-language understanding. The exact previous production provider/validation exception was not observed. Deploy through the existing Git integration and verify production generation.

The sections below record catalog rules and prior rollout details. Current generation uses the catalog directly, replacing the earlier model-selected exercise list.

## Where changes belong

- `cloudflare-worker/src/exercise-library.js`: supported exercises, trusted instructions, muscle labels, minimum experience levels, equipment requirements, movement categories, and common restriction filters. Stable IDs can be attached to demonstration images in a later release.
- `cloudflare-worker/src/index.js`: input validation, AI prompt, catalog selection checks, sequencing, duration/round metadata, and the existing HTTP endpoint.
- `app.js`: request version, response validation, review display, and interval/exercise rotation. The form still uses the existing equipment, difficulty, focus, timing, and optional text inputs.
- `index.html`, `styles.css`, and `service-worker.js`: review notes and the v64 asset/cache update. No accounts, profiles, or weekly schedule are introduced.

The initial v64/v65 model was `@cf/meta/llama-3.1-8b-instruct-fp8`; the reliability repair below uses the documented JSON Mode model `@cf/meta/llama-3.1-8b-instruct`. AI now chooses catalog IDs instead of inventing exercise names and instructions. The server owns the exercise cues. Unknown IDs, duplicates, unavailable equipment, overly advanced variations, missing required categories, and excessive repetition within one category are rejected. An invalid model response produces an error; it never falls back to an unchecked workout.

## Selection rules

Full-body circuits prioritize knee-dominant work, pushing, hip-dominant work, back work, trunk bracing, calves, lateral trunk work, and direct arm work when available. Upper-body, lower-body, core, and cardio use their own category sets. These quotas and the catalog's difficulty labels are product rules, not a clinically validated prescription or a guarantee that every muscle receives an optimal stimulus.

Available equipment is permission to use it, not a requirement to use every selected item. No benches, chairs, door anchors, or pull-up bars are assumed. Bodyweight movements can complement weights or bands. Bodyweight back exercises here provide shoulder-blade work, not a substitute for loaded rows; the review explains that limitation. Beginner choices use level-1 movements. Other levels allow harder variations and receive different effort cues. Advanced does not mean mandatory jumping or complex movements. Cardio uses pace/talk-test guidance instead of strength repetition cues.

Common explicit free-text exclusions (for example, "no jumping", "no floor", "standing only", "no squats", "no lunges", "no overhead", "no kneeling", "no push-ups", and "no planks") remove tagged exercises before inference and validation. AI also receives the complete original free text. Arbitrary instructions, combined/ambiguous phrasing, and medical conditions cannot be completely verified by those filters; users must review the preview. If AI reports it cannot satisfy the instructions, the endpoint returns a friendly 422. The app does not diagnose injuries or prescribe rehabilitation.

Up to eight distinct eligible exercises are selected. Short sessions or restricted catalogs may have fewer; coverage limitations are explained for full-body workouts. Selected categories are interleaved where possible. Each bilateral movement's cue explains alternating sides or switching halfway through its interval. The existing work/rest settings remain user-controlled; effort guidance permits additional rest rather than assuming every selected interval suits every person.

## Exact duration and rollout compatibility

v64 sends `planVersion: 2`. The list repeats until the chosen total duration, with a final partial circuit if necessary. Review text shows full rounds plus extra exercises, rather than changing the list to fit a divisor. For example, 17 minutes at 30 seconds work / 30 seconds rest can use eight exercises for two full circuits plus one exercise, instead of repeating one exercise 17 times.

Requests without `planVersion` retain the old divisible-round count. This keeps already-open v63 clients compatible while the Worker and frontend deploy independently. v64 also accepts old Worker responses while the backend build catches up. No route, AI binding, origin allowlist, or rate-limit configuration changes are needed. The v64 cache version refreshes frontend assets; local history/settings keys are unchanged. Exercise rotation now catches up correctly after multiple missed timer ticks.

## Evidence and limits

The design draws on the [2026 ACSM resistance-training position stand](https://pubmed.ncbi.nlm.nih.gov/41843416/), its [practical summary](https://acsm.org/resistance-training-guidelines-update-2026/), and [CDC guidance on activity and muscle groups](https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html). These support broad muscle coverage, appropriate effort, and adjustment to ability and available equipment. They do not establish this particular catalog, category algorithm, interval choice, or difficulty threshold as optimal. A single timed circuit is not a longitudinal strength or hypertrophy program.

## Validation and release

Run `node --test tools/workout-generator.test.mjs`, `node tools/check-invariants.mjs`, and the syntax checks in `.github/workflows/checks.yml`. The tests use mocked inference: they validate the contract, eligibility, coverage, restrictions, exact durations, backwards compatibility, and timer catch-up, not live model reliability.

Worker source deploys from `cloudflare-worker/` with the existing Workers Builds integration and `npx wrangler deploy`. GitHub Pages serves the frontend. Check the PR's build/check results for the actual current deployment status; the repository alone does not prove the dashboard integration remains enabled. Before release, test the preview Worker with real generation and exercise the builder → review → timer flow on mobile and desktop. Merge the reviewed PR to publish through the existing integrations, then verify the production flow. If the Worker build does not run, use authenticated Cloudflare access to inspect/fix its Git integration. No API token belongs in this repository.


## Exercise pictures (v65)

The existing controls now lead to picture-backed review cards and a timer image. A local map in `exercise-media.js` resolves all 51 catalog IDs to original two-position SVG movement diagrams. Picture buttons open a native dialog with the image and written instructions. Opening a picture pauses a running workout; closing it does not automatically resume. The user presses Resume when ready. Unknown or old responses without IDs keep their text display without a guessed picture. Failed images hide while instructions remain available.

`tools/generate-exercise-media.mjs` owns the editable diagrams and media map. `assets/exercises/README.md` documents their scope; `assets/exercises/preview.png` shows four actual assets. These are static schematics, not photographs or animations. No external image service, API key, or model change is needed. The v65 service worker precaches the map and all pictures, about 260 KB of SVG data, for offline use.

The expanded 20-test suite checks every catalog/media match, local-only URLs, fallback behavior, image rotation, pause-on-inspection, and offline cache coverage. Existing workout generation, protections, and rollout compatibility tests remain in place. Local SVG contact sheets were visually inspected; browser UI/viewport verification still requires a permitted preview environment.


## Generation reliability repair

The v65 generic error conflated provider failures, invalid JSON and invalid exercise selection. Production logs were not available during diagnosis. The repair uses the documented JSON Mode model `@cf/meta/llama-3.1-8b-instruct` and a dynamic schema: code allocates feasible movement-category slots; The catalog matching algorithm picks eligible, distinct IDs for the slots. That removes counting and category allocation from the model's task while retaining its responsibility to respect the full free text. An instruction interpretation refusal is returned as 422.

One invalid instruction interpretation gets one corrective attempt, followed by strict catalog selection and validation. There is no automatic unchecked workout. Service failures and timeouts return distinct diagnostic codes and correlation IDs without exposing provider details. All phases share a 50-second response budget. A request without text uses zero inference calls; custom instructions use one interpretation call normally, or two after a malformed interpretation. Existing origin/rate-limit protections, frontend response contract, picture IDs and cache version remain unchanged. The changes are Worker-only at runtime, so a frontend cache bump is unnecessary.

Regression tests cover schema feasibility across equipment/focus/level and both plan versions, restricted choices, malformed JSON, duplicate IDs, missing categories, old-model response shape, successful retry, bounded attempts, refusal, upstream failure and picture-compatible IDs. These tests mock inference; a successful real-model preview request remains the release verification step.


## Optional instructions and focus precedence

The previous implementation correctly sent the optional text but built eligibility and movement quotas from the preset first. That meant a chest-only request could still be required to include legs, back and core. The Worker now interprets nonempty text before choosing category slots. Its validated schema has `targetMode` (`preset`, `only`, `emphasize`), known muscle groups, required catalog IDs and excluded catalog IDs. Only this server-generated interpretation is trusted; a client cannot supply its own.

An explicit text focus takes precedence over the preset. Equipment, experience, common movement exclusions, catalog IDs and exact timing remain hard limits. Muscle-only eligibility uses the catalog's primary muscle (first muscle label) to avoid admitting exercises that mention the requested muscle only secondarily. Emphasis reserves up to two matching movements per group where available, and named requests receive pinned slots. Server validation checks every requested group and named exercise. Small pools repeat a shorter list; impossible combinations fail instead of silently broadening the workout. Existing preview notes show the interpreted focus and limited variety.

Blank instructions skip interpretation. Nonempty text uses one compact interpretation call, with one possible corrective interpretation retry under the same 50-second budget. Catalog selection uses no inference. Thus the maximum is two model calls per admitted request with text. The model still interprets natural language; automated tests cannot establish perfect understanding of arbitrary requests. Regression tests include the user's exact chest-only wording, the actual frontend textbox-to-request function, all preset/level/equipment combinations for several targets, primary versus supporting muscles, named requests, emphasis, exclusions, contradictions and the shared deadline. Real-model behavior remains to be verified.
