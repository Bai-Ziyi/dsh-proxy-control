import { promises as fs } from 'node:fs';
import path from 'node:path';
import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { installProxyFromEnvironment } from '@deepseek-ai/dsh-http-proxy';
import { rewrite } from './lib/env.js';

/** Cordis plugin name; also the row id's owner in the profile patch. */
export const name = 'proxy-control';

/**
 * The switch, the proxy endpoint, and the bypass list. Every field is
 * volatile so the settings service exposes it to the Plugins page's config
 * form; the row's stored values live in the profile patch.
 */
export const Config = z.object({
  enabled: z.boolean().default(false).volatile(),
  url: z.string().default('').volatile(),
  noProxy: z.string().default('').volatile(),
});

/** Absolute path of the user-level environment file read by the launcher. */
function envFile() {
  return path.join(resolveDshHome(), '.env');
}

/** Read the user-level `.env`, treating a missing file as empty. */
async function readEnv() {
  try {
    return await fs.readFile(envFile(), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

/**
 * Persist the file atomically so a launcher reading it during the write never
 * sees a half-written proxy line.
 */
async function writeEnv(text) {
  const file = envFile();
  if ((await readEnv()) === text) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, text, { mode: 0o600 });
  try {
    await fs.rename(temporary, file);
  } catch {
    await fs.writeFile(file, text, { mode: 0o600 });
    await fs.rm(temporary, { force: true });
  }
}

/** Keep the launcher-level file in step with the switch. */
async function syncEnv(next) {
  await writeEnv(rewrite(await readEnv(), next));
}

/**
 * Install an overlay policy for the current switch. An enabled switch builds
 * the same environment the launcher would have read; a disabled one installs
 * a direct policy while leaving the user's exported variables intact.
 */
async function installPolicy(next) {
  const environment = new Map();
  if (next.enabled) {
    environment.set('HTTP_PROXY', { value: next.url });
    environment.set('HTTPS_PROXY', { value: next.url });
    if (next.noProxy !== '') environment.set('NO_PROXY', { value: next.noProxy });
  }
  return installProxyFromEnvironment(environment, (message) => {
    console.warn(`[proxy-control] ${message}`);
  });
}

/**
 * Apply the switch to the Host process. The effect re-runs when any config
 * field changes; a generation counter stops a slow install from replacing a
 * newer decision, and the outer effect restores the previous dispatcher when
 * the plugin unloads.
 */
export function apply(ctx, config) {
  const state = {
    disposed: false,
    generation: 0,
    queue: Promise.resolve(),
    policy: undefined,
  };

  const current = () => ({
    enabled: config.enabled.get() !== false,
    url: String(config.url.get() ?? '').trim(),
    noProxy: String(config.noProxy.get() ?? '').trim(),
  });

  const reconcile = () => {
    const next = current();
    const generation = ++state.generation;
    state.queue = state.queue.then(async () => {
      if (state.disposed || generation !== state.generation) return;
      if (next.url === '') {
        // An unconfigured plugin stays inert: it must not rewrite a user's
        // existing `.env` or replace the process dispatcher on first install.
        if (next.enabled) console.warn('[proxy-control] set a proxy URL before enabling');
        return;
      }
      if (next.enabled && !/^https?:\/\//iu.test(next.url)) {
        console.warn('[proxy-control] proxy URL must start with http:// or https://');
        return;
      }
      if (state.policy !== undefined) {
        await state.policy();
        state.policy = undefined;
      }
      await syncEnv(next);
      const policy = await installPolicy(next);
      if (state.disposed || generation !== state.generation) {
        await policy();
        return;
      }
      state.policy = policy;
    }).catch((error) => {
      console.error('[proxy-control]', error);
    });
  };

  ctx.effect(() => {
    config.enabled.get();
    config.url.get();
    config.noProxy.get();
    reconcile();
  }, 'proxy-control: reconcile');

  ctx.effect(() => () => {
    state.disposed = true;
    const policy = state.policy;
    state.policy = undefined;
    if (policy !== undefined) void policy();
  }, 'proxy-control: dispose');
}
