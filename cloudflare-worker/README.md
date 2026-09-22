# Circuit Timer AI Worker

This Worker generates structured circuit plans for the GitHub Pages Circuit Timer.

## Runtime configuration

- Worker name: `circuit-timer`
- AI binding: `AI`
- Model: `@cf/meta/llama-3.1-8b-instruct-fp8`
- API route: `POST /api/generate-workout`
- Allowed browser origin: `https://kpmike87.github.io`

The Worker uses Workers AI JSON Mode, then validates the model response before returning it. It does not use authentication, D1, KV, Durable Objects, or secrets.

## Abuse protection

Generation costs Workers AI neurons and takes 15 to 50 seconds, so the endpoint is protected before any request body is read:

- Requests must send an allowed `Origin`. Requests with a missing or different origin get `403`.
- `CLIENT_RATE_LIMIT`: 8 requests per 60 seconds per client IP.
- `GLOBAL_RATE_LIMIT`: 20 requests per 60 seconds for the endpoint as a whole.

Exceeding either limit returns `429` with a `Retry-After` header and a message the app shows directly. Both limits come from the `[[ratelimits]]` bindings in `wrangler.toml` and need no dashboard setup, but they are counted per Cloudflare location, so worldwide traffic can exceed them. They cap bursts rather than daily spend; the Workers AI daily allowance is the real cost ceiling, so add a usage alert if this Worker moves to a paid plan.

WAF rate limiting rules cannot protect a `workers.dev` URL, because those rules only apply to a zone you own. Putting the Worker behind a custom domain would allow them as an extra layer.

## Deploy

From this directory:

```sh
npx wrangler deploy
```

For Cloudflare Workers Builds, use this directory as the root directory and `npx wrangler deploy` as the deploy command. No build output directory is required.
