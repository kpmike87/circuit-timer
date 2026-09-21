# Circuit Timer AI Worker

This Worker generates structured circuit plans for the GitHub Pages Circuit Timer.

## Runtime configuration

- Worker name: `circuit-timer-ai`
- AI binding: `AI`
- Model: `@cf/meta/llama-3.2-3b-instruct`
- API route: `POST /api/generate-workout`
- Allowed browser origin: `https://kpmike87.github.io`

The Worker uses JSON mode, then validates the model response before returning it. It does not use authentication, D1, KV, Durable Objects, or secrets.

## Deploy

From this directory:

```sh
npx wrangler deploy
```

For Cloudflare Workers Builds, use this directory as the root directory and `npx wrangler deploy` as the deploy command. No build output directory is required.
