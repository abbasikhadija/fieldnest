import { spawnSync } from 'node:child_process'
import { localSupabase } from './local-supabase.mjs'
const { browserConfig } = localSupabase()
if (!process.env.npm_execpath)
  throw new Error('Run through npm run build:local.')
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'run', 'build'],
  {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: browserConfig.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: browserConfig.publishableKey,
    },
    stdio: 'inherit',
    windowsHide: true,
  },
)
process.exitCode = result.status ?? 1
