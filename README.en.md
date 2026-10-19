# dsh-proxy-control

[中文](README.md) | English

Pre-launch and runtime HTTP proxy control for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

DeepSeek Harness resolves its outbound proxy **once at launch**, from the inherited environment or `$DSH_HOME/.env`, before the first plugin mounts. A runtime-only proxy plugin cannot cover what happens before it loads — model catalog discovery, plugin installs, login and update checks. This plugin writes the same user-level `.env` the launcher reads, so the **next start** is proxied from the first request, and it also installs an in-process policy so the switch takes effect immediately in the running Host.

## Features

- One switch in **Plugins → Installed → Proxy Control → Configure**.
- Writes `HTTP_PROXY` / `HTTPS_PROXY` (and optional `NO_PROXY`) to `$DSH_HOME/.env`, preserving unrelated lines.
- Applies the same proxy to the running process through `@deepseek-ai/dsh-http-proxy`'s public `installProxyFromEnvironment`, so model, web-fetch and MCP HTTP requests use it without a restart.
- Turning the switch off removes the proxy lines and installs a direct policy; the next launch starts direct.
- Loopback always bypasses the proxy. Only `http://` and `https://` proxy URLs are accepted.
- No runtime dependencies, no build step, plain ESM.

## Install

```sh
# Desktop profile (the one the desktop app uses)
dsh plugin --profile desktop add github:Bai-Ziyi/dsh-proxy-control

# Or the web profile
dsh plugin --profile web add github:Bai-Ziyi/dsh-proxy-control
```

Use the exact GitHub owner `Bai-Ziyi` (capital B, capital Z, no hyphen). After installation, **restart DSH once** so the new bundle loads. Then open **Plugins → Installed → Proxy Control → Configure**, enter an `http(s)://` URL and turn the switch on. The running Host switches immediately; the `.env` written at that point covers the next launch's launcher phase.

If your profile is app-managed (Desktop), the Plugins page is the normal way to install and enable bundles; the command above is the CLI equivalent.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Route outbound requests through the proxy. |
| `url` | empty | HTTP or HTTPS proxy endpoint, for example `http://127.0.0.1:8080`. |
| `noProxy` | empty | Optional comma-separated hosts that connect directly. |

The plugin is inert until a URL is entered: an empty `url` neither rewrites `.env` nor touches the dispatcher, so installing it cannot overwrite an existing manual proxy configuration. Once a URL is saved and the switch is on, values persist in the profile's `cordis.patch.yml` and are mirrored into `$DSH_HOME/.env`.

## How it works

1. On activation, the Host half reads the three config fields and returns immediately when `url` is empty.
2. It rewrites `$DSH_HOME/.env` atomically: every existing proxy line is removed, then the current `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` lines are appended. Unrelated lines are kept in order.
3. It installs an overlay policy with `installProxyFromEnvironment`, which replaces undici's global dispatcher for the process.
4. When the plugin unloads or the config changes, the previous dispatcher is restored before the next policy is installed.

Because the file is written before the next launch, the launcher phase is covered too — that is the part a runtime-only plugin cannot reach.

## What it does not do

- **No SOCKS, PAC, or system-proxy detection.** Only explicit `http(s)://` URLs. Use the HTTP port your local proxy client exposes.
- **No per-provider routing.** `NO_PROXY` can bypass hosts; the rest of the process shares one policy.
- **No credential store.** The proxy URL is written as-is; avoid embedding secrets you would not put in a local `.env`.
- **Runtime disable does not rewrite an already-spawned child's environment.** The Host's own requests switch immediately; a restart gives child processes a clean environment.
- Do not run it alongside another plugin that replaces undici's global dispatcher; they will fight over the policy.

## Compatibility

- DSH `0.2.x`; tested on `0.2.1-rc.2` with a local HTTP proxy.
- Uses the public exports of `@deepseek-ai/dsh-http-proxy` (`installProxyFromEnvironment`), `@deepseek-ai/dsh-home-paths` (`resolveDshHome`) and `@deepseek-ai/schemastery`. These resolve from the DSH installation; the package deliberately declares no dependencies on them so it cannot install a second copy.
- The client half registers into `plugins.row.config`; it requires the Plugins page (`@deepseek-ai/dsh-client-ui-plugin-manager`) from the same DSH version.

## Development

```sh
npm test
```

The test suite covers the pure `.env` rewrite (add, replace, disable, CRLF, unrelated lines). It has no external dependencies.

## License

MIT
