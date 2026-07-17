import { computed, type Ref } from 'vue';
import { isElementAllowed } from '../schema';
import type { ButtonNode, ElementNode, LinkNode, PageConfig, PageNode } from '../schema';
import { compilePagePattern } from '../renderSafety';
import { useMergedElements } from '../elements/useMergedElements';

export type IssueSeverity = 'warning' | 'error';

export interface ValidationIssue {
  /** Stable ID of the node the issue belongs to. */
  nodeId: string
  /** Which property of the node is the problem (used to surface the issue near a specific field). */
  field?: string
  /** Human-readable explanation. */
  message: string
  severity: IssueSeverity
}

/**
 * Walk the schema reactively and surface common authoring mistakes — buttons
 * without actions, duplicate field names, images without assets, action IDs
 * that aren't in the configured allowlist. Builder UI consumes these to draw
 * warning icons in the outline and inline hints in the props panel.
 *
 * The renderer does NOT consult these — disallowed elements (the actual
 * security boundary) are enforced separately. Validation is purely a UX
 * scaffold for the builder.
 */
export function useSchemaValidation(
  schema: Ref<PageNode>,
  config: Ref<PageConfig | undefined>,
) {
  // Runs in component setup, so the inject inside resolves normally.
  const elements = useMergedElements(config);

  const issues = computed<ValidationIssue[]>(() => {
    const out: ValidationIssue[] = [];
    const namedFields: Array<{ node: PageNode; name: string }> = [];
    const registry = elements.value;
    const knownActions = new Set(config.value?.availableActions?.map((a) => a.id) ?? []);
    const hasAvailableActions = (config.value?.availableActions?.length ?? 0) > 0;

    walk(schema.value, (n) => {
      // ── Type must be registered and allowed — otherwise the runtime SKIPS
      //    the node silently, which the author must learn about before saving ──
      const def = n.type === 'page' ? undefined : registry[n.type];
      if (n.type !== 'page' && !def) {
        out.push({
          nodeId: n.id,
          field: 'type',
          severity: 'warning',
          message: `Element type "${String(n.type)}" is not registered — skipped at runtime.`,
        });
        return;
      }
      if (!isElementAllowed(n.type, config.value)) {
        out.push({
          nodeId: n.id,
          field: 'type',
          severity: 'error',
          message: `"${n.type}" is not in config.allowedElements — skipped at render time.`,
        });
      }

      // ── Buttons & links: action wiring ─────────────────────────────────
      // Cast: the open union member absorbs the literal narrowing.
      if (n.type === 'button') {
        const action = (n as ButtonNode).props.action;
        if (!action) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: 'Button has no Action — clicking it will do nothing.',
          });
        } else if (hasAvailableActions && !knownActions.has(action)) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: `Action "${action}" is not in config.availableActions.`,
          });
        }
      }
      if (n.type === 'link') {
        const action = (n as LinkNode).props.action;
        if (!action) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: 'Link has no Action — clicking it will do nothing.',
          });
        } else if (hasAvailableActions && !knownActions.has(action)) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: `Action "${action}" is not in config.availableActions.`,
          });
        }
      }

      // ── String-rule elements (textRules): pattern must compile ─────────
      // Cast: without a type-literal check there is no narrowing past the root.
      const pattern = def?.value?.textRules ? (n as ElementNode).validation?.pattern : undefined;
      if (pattern && compilePagePattern(pattern) === null) {
        out.push({
          nodeId: n.id,
          field: 'validation',
          severity: 'error',
          message: `validation.pattern ${JSON.stringify(pattern)} is not a valid regular expression.`,
        });
      }

      // ── Image: assetId required ────────────────────────────────────────
      if (n.type === 'image' && !n.props.assetId) {
        out.push({
          nodeId: n.id,
          field: 'assetId',
          severity: 'error',
          message: 'Image has no Asset ID — nothing will render.',
        });
      }

      // ── Element-owned lint: merged into the same issue list ────────────
      // No i18n plumbing here yet (deferred) — the fallback string carries.
      if (def?.builder?.lint) {
        for (const found of def.builder.lint(n as ElementNode, config.value)) {
          out.push({
            nodeId: n.id,
            severity: found.severity,
            message: found.message.fallback,
          });
        }
      }

      // ── Value elements: collect names for duplicate detection ──────────
      if (def?.value) {
        const name = (n as { name?: string }).name;
        if (name) namedFields.push({ node: n, name });
      }
    });

    // ── Duplicate field names ────────────────────────────────────────────
    const seen = new Map<string, PageNode[]>();
    for (const { node, name } of namedFields) {
      const list = seen.get(name) ?? [];
      list.push(node);
      seen.set(name, list);
    }
    for (const [name, nodes] of seen) {
      if (nodes.length < 2) continue;
      for (const n of nodes) {
        out.push({
          nodeId: n.id,
          field: 'name',
          severity: 'error',
          message: `Duplicate field name "${name}" — values will overwrite each other.`,
        });
      }
    }

    return out;
  });

  const byNodeId = computed<Map<string, ValidationIssue[]>>(() => {
    const m = new Map<string, ValidationIssue[]>();
    for (const issue of issues.value) {
      const list = m.get(issue.nodeId) ?? [];
      list.push(issue);
      m.set(issue.nodeId, list);
    }
    return m;
  });

  return { issues, byNodeId };
}

function walk(node: PageNode, fn: (n: PageNode) => void) {
  fn(node);
  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) walk(c, fn);
  }
}

export type UseSchemaValidationReturn = ReturnType<typeof useSchemaValidation>;
