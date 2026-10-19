window.__ModuleLoader__.load({
  id: 'dsh-proxy-control',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const en = {
      title: 'Proxy',
      summary: 'Turn the outbound HTTP proxy on or off and set its URL.',
      enable: 'Use outbound proxy',
      enableHint: 'Route Harness model, web-fetch, and MCP HTTP requests through the proxy below.',
      url: 'Proxy URL',
      urlHint: 'Only http:// or https:// proxies are supported. A socks5:// URL is ignored.',
      noProxy: 'Direct connections',
      noProxyHint: 'Optional comma-separated hosts that skip the proxy. Loopback always skips it.',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved. The new routing takes effect on the next request.',
      discard: 'Discard',
      readOnly: 'This profile is read-only.',
      unavailable: 'The proxy settings are not available right now.',
      invalidUrl: 'Enter an http:// or https:// proxy URL.',
      saveFailed: 'The profile did not accept the change. Correct it and try again.',
      current: 'Current',
      off: 'Off',
      on: 'On',
    };

    const zh = {
      title: '代理',
      summary: '开关 Harness 的出站 HTTP 代理，并设置代理地址。',
      enable: '启用出站代理',
      enableHint: '模型请求、网页抓取与 MCP HTTP 请求都会走下面的代理。',
      url: '代理地址',
      urlHint: '只支持 http:// 或 https:// 代理；socks5:// 会被忽略。',
      noProxy: '直连名单',
      noProxyHint: '可选，逗号分隔的主机名不经过代理。本机回环地址始终直连。',
      save: '保存',
      saving: '保存中…',
      saved: '已保存，下一次请求起生效。',
      discard: '放弃修改',
      readOnly: '当前 profile 为只读。',
      unavailable: '暂时无法读取代理设置。',
      invalidUrl: '请填写 http:// 或 https:// 开头的代理地址。',
      saveFailed: 'profile 没有接受这次修改，请修正后重试。',
      current: '当前',
      off: '关闭',
      on: '开启',
    };

    const color = {
      primary: 'var(--dsw-alias-label-primary, currentColor)',
      secondary: 'var(--dsw-alias-label-secondary, #777)',
      tertiary: 'var(--dsw-alias-label-tertiary, #999)',
      error: 'var(--dsw-alias-state-error-primary, #d33)',
      accent: 'var(--dsw-alias-state-business-primary, #247bbf)',
      border: 'var(--dsw-alias-border-l1, color-mix(in srgb, currentColor 22%, transparent))',
      field: 'var(--dsw-alias-bg-layer-2, color-mix(in srgb, currentColor 4%, transparent))',
      thumb: 'var(--dsw-alias-switch-thumb, #fff)',
    };

    function Switch({ checked, disabled, label, onChange }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        disabled,
        onClick: () => onChange(!checked),
        style: {
          width: 38,
          height: 22,
          padding: 2,
          flex: '0 0 auto',
          border: 'none',
          borderRadius: 11,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          background: checked ? color.accent : color.border,
          transition: 'background 120ms ease',
        },
      }, h('span', {
        style: {
          display: 'block',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: color.thumb,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 120ms ease',
        },
      }));
    }

    function Field({ label, hint, children }) {
      return h('label', { style: { display: 'grid', gap: 6 } },
        h('span', { style: { fontSize: 13, fontWeight: 500, color: color.primary } }, label),
        children,
        hint === undefined ? null : h('span', { style: { fontSize: 12, color: color.secondary, lineHeight: '18px' } }, hint),
      );
    }

    function inputStyle(disabled) {
      return {
        boxSizing: 'border-box',
        width: '100%',
        height: 32,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${color.border}`,
        background: color.field,
        color: color.primary,
        font: 'inherit',
        fontSize: 13,
        opacity: disabled ? 0.6 : 1,
      };
    }

    function ProxyPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      if (props.view === 'summary') return t('summary');

      const form = props.form;
      if (form === undefined || form === null || form.state === undefined) {
        return h('p', { style: { margin: 0, fontSize: 13, color: color.secondary } }, t('unavailable'));
      }

      const snapshot = form.state;
      const value = snapshot.value ?? {};
      const base = {
        enabled: value.enabled === true,
        url: value.url ?? '',
        noProxy: value.noProxy ?? '',
      };
      const writable = snapshot.writable !== false;

      const [draft, setDraft] = React.useState(base);
      const [saving, setSaving] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [saved, setSaved] = React.useState(false);

      React.useEffect(() => {
        setDraft(base);
        setSaved(false);
        // The revision changes when the Host accepts or reloads the stored form.
      }, [snapshot.revision]);

      const dirty = draft.enabled !== base.enabled || draft.url !== base.url || draft.noProxy !== base.noProxy;

      const save = async () => {
        const url = draft.url.trim();
        if (draft.enabled && !/^https?:\/\//iu.test(url)) {
          setError(t('invalidUrl'));
          return;
        }
        setSaving(true);
        setError(null);
        setSaved(false);
        let accepted = false;
        let failure = null;
        try {
          accepted = await form.mutate([
            { op: 'set', path: ['enabled'], value: draft.enabled },
            { op: 'set', path: ['url'], value: url },
            { op: 'set', path: ['noProxy'], value: draft.noProxy.trim() },
          ], snapshot.revision);
        } catch (cause) {
          failure = cause instanceof Error ? cause.message : String(cause);
        }
        setSaving(false);
        if (accepted) setSaved(true);
        else setError(failure ?? t('saveFailed'));
      };

      return h('div', { style: { display: 'grid', gap: 18, padding: '4px 0 8px' } },
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            padding: '12px 14px',
            border: `1px solid ${color.border}`,
            borderRadius: 10,
          },
        },
          h('div', { style: { display: 'grid', gap: 3 } },
            h('span', { style: { fontSize: 13, fontWeight: 500, color: color.primary } }, t('enable')),
            h('span', { style: { fontSize: 12, color: color.secondary, lineHeight: '18px' } }, t('enableHint')),
          ),
          h(Switch, {
            checked: draft.enabled,
            disabled: !writable || saving,
            label: t('enable'),
            onChange: (checked) => {
              setDraft((previous) => ({ ...previous, enabled: checked }));
              setSaved(false);
            },
          }),
        ),

        h(Field, { label: t('url'), hint: t('urlHint') },
          h('input', {
            type: 'url',
            value: draft.url,
            disabled: !writable || saving || !draft.enabled,
            placeholder: 'http://127.0.0.1:8080',
            spellCheck: false,
            onChange: (event) => {
              setDraft((previous) => ({ ...previous, url: event.target.value }));
              setSaved(false);
            },
            style: inputStyle(!writable || saving || !draft.enabled),
          }),
        ),

        h(Field, { label: t('noProxy'), hint: t('noProxyHint') },
          h('input', {
            type: 'text',
            value: draft.noProxy,
            disabled: !writable || saving || !draft.enabled,
            placeholder: 'example.com, 10.0.0.0/8',
            spellCheck: false,
            onChange: (event) => {
              setDraft((previous) => ({ ...previous, noProxy: event.target.value }));
              setSaved(false);
            },
            style: inputStyle(!writable || saving || !draft.enabled),
          }),
        ),

        error === null ? null : h('p', { role: 'alert', style: { margin: 0, fontSize: 12, color: color.error } }, error),
        saved ? h('p', { role: 'status', style: { margin: 0, fontSize: 12, color: color.secondary } }, t('saved')) : null,

        !writable ? h('p', { style: { margin: 0, fontSize: 12, color: color.secondary } }, t('readOnly')) : null,

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('button', {
            type: 'button',
            disabled: !writable || saving || !dirty,
            onClick: save,
            style: {
              height: 30,
              padding: '0 14px',
              border: 'none',
              borderRadius: 8,
              background: color.accent,
              color: '#fff',
              font: 'inherit',
              fontSize: 13,
              cursor: !writable || saving || !dirty ? 'default' : 'pointer',
              opacity: !writable || saving || !dirty ? 0.5 : 1,
            },
          }, saving ? t('saving') : t('save')),
          dirty ? h('button', {
            type: 'button',
            disabled: saving,
            onClick: () => {
              setDraft(base);
              setError(null);
              setSaved(false);
            },
            style: {
              height: 30,
              padding: '0 12px',
              border: `1px solid ${color.border}`,
              borderRadius: 8,
              background: 'transparent',
              color: color.primary,
              font: 'inherit',
              fontSize: 13,
              cursor: saving ? 'default' : 'pointer',
            },
          }, t('discard')) : null,
          h('span', { style: { fontSize: 12, color: color.tertiary } },
            `${t('current')}: ${base.enabled ? `${t('on')} · ${base.url}` : t('off')}`),
        ),
      );
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register('proxyControl', { en, zh }), 'proxy-control: locale');
      ctx.effect(() => ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config',
        key: 'dsh-proxy-control#proxy-control',
        locale: 'proxyControl',
      }, ProxyPage)), 'proxy-control: page');
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
