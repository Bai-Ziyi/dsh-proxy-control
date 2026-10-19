# dsh-proxy-control

[English](README.en.md) | 中文

DeepSeek Harness（`dsh`）的**启动前与运行时** HTTP 代理控制插件。

DSH 在启动时、第一个插件挂载之前，会从继承的环境或 `$DSH_HOME/.env` 解析一次出站代理。只在运行时生效的代理插件覆盖不到这个阶段——模型目录发现、插件安装、登录与更新检查都可能发生在它加载之前。本插件写入启动器读取的同一个用户级 `.env`，因此**下一次启动**的第一个请求就走代理；同时它会在当前进程安装一份策略，让开关立即生效。

## 功能

- **插件 → 已安装 → Proxy Control → 配置** 里的一个开关。
- 把 `HTTP_PROXY` / `HTTPS_PROXY`（以及可选的 `NO_PROXY`）写入 `$DSH_HOME/.env`，保留无关行。
- 通过 `@deepseek-ai/dsh-http-proxy` 的公开接口 `installProxyFromEnvironment` 应用到当前进程，模型请求、网页抓取与 MCP HTTP 请求无需重启即可生效。
- 关闭开关时移除代理行并安装直连策略；下次启动也是直连。
- 本机回环地址始终直连；只接受 `http://` 与 `https://` 代理。
- 无运行时依赖、无构建步骤、纯 ESM。

## 安装

```sh
# 桌面端使用的 profile
dsh plugin --profile desktop add github:Bai-Ziyi/dsh-proxy-control

# 或 Web profile
dsh plugin --profile web add github:Bai-Ziyi/dsh-proxy-control
```

注意 GitHub 用户名是 `Bai-Ziyi`（大写 B、大写 Z，没有连字符）。安装后**重启一次 DSH**，让新 bundle 加载；然后打开**插件 → 已安装 → Proxy Control → 配置**，填入 `http(s)://` 地址并打开开关。当前进程立即生效；此时写入的 `.env` 覆盖下一次启动的启动器阶段。

## 配置

| 字段 | 默认值 | 含义 |
|---|---|---|
| `enabled` | `false` | 出站请求是否走代理。 |
| `url` | 空 | HTTP 或 HTTPS 代理地址，例如 `http://127.0.0.1:8080`。 |
| `noProxy` | 空 | 可选的逗号分隔直连主机名。 |

在填入地址之前插件保持静默：`url` 为空时既不改写 `.env`，也不碰 dispatcher，因此安装它不会覆盖已有的手动代理配置。保存地址并打开开关后，配置持久化在 profile 的 `cordis.patch.yml`，并同步到 `$DSH_HOME/.env`。

## 工作方式

1. 宿主半侧读取三个配置字段；`url` 为空时直接返回。
2. 原子改写 `$DSH_HOME/.env`：先移除所有旧代理行，再追加当前的 `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`；无关行保持原顺序。
3. 调用 `installProxyFromEnvironment` 安装覆盖策略，替换进程的 undici 全局 dispatcher。
4. 插件卸载或配置变化时，先恢复上一个 dispatcher，再安装新策略。

因为文件在下一次启动前就已写好，启动器阶段也被覆盖——这正是纯运行时插件够不到的部分。

## 不做什么

- **不支持 SOCKS、PAC 或系统代理探测。** 只接受显式 `http(s)://` 地址；请填本地代理客户端提供的 HTTP 端口。
- **不做按供应商分流。** 可以用 `NO_PROXY` 让部分主机直连，其余请求共享同一份策略。
- **不保存凭据。** 代理地址按原样写入；不要把不愿放进本机 `.env` 的密钥写进去。
- **运行时关闭不会改写已经 spawn 的子进程环境。** 宿主自身请求立即切换；要让子进程也干净，需重启。
- 不要与其他替换 undici 全局 dispatcher 的代理插件同时运行。

## 兼容性

- DSH `0.2.x`；在 `0.2.1-rc.2` 与本地 HTTP 代理上测试过。
- 使用 `@deepseek-ai/dsh-http-proxy`（`installProxyFromEnvironment`）、`@deepseek-ai/dsh-home-paths`（`resolveDshHome`）与 `@deepseek-ai/schemastery` 的公开导出。它们由 DSH 安装解析；本包刻意不声明为依赖，避免装出第二份导致模块实例分叉。
- 客户端半侧注册到 `plugins.row.config`，需要同版本 DSH 的「插件」页（`@deepseek-ai/dsh-client-ui-plugin-manager`）。

## 开发

```sh
npm test
```

测试覆盖纯 `.env` 改写逻辑（新增、替换、关闭、CRLF、保留无关行），无外部依赖。

## 许可证

MIT
