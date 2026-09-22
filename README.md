# Circuit Timer

A mobile-first work/rest interval timer built with plain HTML, CSS, and JavaScript.

## Version 1

- Custom workout and rest durations
- Selectable total workout duration
- Total elapsed workout time across work and rest intervals
- Total workout time remaining
- Automatic completion and summary when the selected total time is reached
- Automatic continuous interval switching
- Balanced landscape Ready screen with the timer on the left and settings on the right
- Centered landscape timer during active workouts with compact settings
- Black pause screen and clear in-progress status
- End Workout is available only while paused
- Large WORKOUT and REST displays with distinct colors
- Total Workout automatically uses whole-minute values that complete a full work/rest cycle
- End Workout opens a summary with total, workout, and rest time plus completed rounds
- Summary feedback scales from playfully harsh to highly enthusiastic based on completion percentage
- Back to Ready returns to the timer setup
- Start/end and pause/resume controls
- Ready-screen Reset clears every timer and setting to zero
- Zero-valued settings clear automatically when tapped for immediate typing
- Screen wake lock when supported
- Sound cues with a mute toggle: distinct tones for work and rest, countdown ticks for the final three seconds, a completion chime, and vibration on supporting devices
- Workout history page: finished workouts are saved on your device with date, durations, rounds, and completion, plus per-entry delete and clear-all
- AI Circuit Builder: create a structured, reviewable circuit through a Cloudflare Worker using Workers AI, then load it directly into the timer
- Device-local saved settings
- Installable and available offline as a Progressive Web App

## AI Circuit Builder

The GitHub Pages frontend calls `POST /api/generate-workout` on the separately deployed Worker in `cloudflare-worker/`.
The Worker uses the `@cf/meta/llama-3.1-8b-instruct-fp8` model with JSON mode, validates the response, and returns the exercise order, work/rest intervals, rounds, equipment, and safety note.
Generation is metered, so the Worker only answers requests from the published site origin and rate limits them. See `cloudflare-worker/README.md` for the limits.

After deploying the Worker, set its HTTPS URL in `ai-config.js`:

```js
window.CIRCUIT_TIMER_CONFIG = Object.freeze({
  aiWorkerUrl: "https://your-worker.your-subdomain.workers.dev",
});
```

The frontend keeps the user in control: it displays the returned circuit for review before loading the intervals and exercise order into the existing timer.

## Try it locally

Serve this folder from any local web server and open `index.html` through the server URL. A local server is required to test the service worker and installation behavior.

For a quick timer-only preview, `index.html` can also be opened directly in a browser, but offline installation and screen wake lock may not be available.

## Phone installation

After publishing the folder over HTTPS:

- iPhone: open the URL in Safari, tap Share, choose **Add to Home Screen**, and enable **Open as Web App**.
- Android: open the URL in Chrome and choose **Install app** or **Add to Home screen**.
