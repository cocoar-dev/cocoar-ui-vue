import { computed, type Ref } from 'vue';
import { isElementAllowed } from '../schema';
import type { PageConfig, PageNode } from '../schema';
import { compilePagePattern } from '../renderSafety';
import { KNOWN_ELEMENT_TYPES } from './schemaNormalize';

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
  const issues = computed<ValidationIssue[]>(() => {
    const out: ValidationIssue[] = [];
    const namedFields: Array<{ node: PageNode; name: string }> = [];
    const knownActions = new Set(config.value?.availableActions?.map((a) => a.id) ?? []);
    const hasAvailableActions = (config.value?.availableActions?.length ?? 0) > 0;
    const namedTypes = new Set([
      'text-input', 'number-input', 'checkbox', 'switch', 'radio-group',
      'select', 'multi-select', 'otp-input', 'date-input', 'datetime-input',
    ]);

    walk(schema.value, (n) => {
      // ── Type must exist and be allowed — otherwise the runtime SKIPS the
      //    node silently, which the author must learn about before saving ──
      if (!KNOWN_ELEMENT_TYPES.has(n.type)) {
        out.push({
          nodeId: n.id,
          field: 'type',
          severity: 'error',
          message: `Unknown element type "${String(n.type)}" — skipped at render time.`,
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
      if (n.type === 'button') {
        if (!n.action) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: 'Button has no Action — clicking it will do nothing.',
          });
        } else if (hasAvailableActions && !knownActions.has(n.action)) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: `Action "${n.action}" is not in config.availableActions.`,
          });
        }
      }
      if (n.type === 'link') {
        if (!n.action) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: 'Link has no Action — clicking it will do nothing.',
          });
        } else if (hasAvailableActions && !knownActions.has(n.action)) {
          out.push({
            nodeId: n.id,
            field: 'action',
            severity: 'warning',
            message: `Action "${n.action}" is not in config.availableActions.`,
          });
        }
      }

      // ── Text input: pattern must compile ───────────────────────────────
      if (n.type === 'text-input' && n.validation?.pattern
        && compilePagePattern(n.validation.pattern) === null) {
        out.push({
          nodeId: n.id,
          field: 'validation',
          severity: 'error',
          message: `validation.pattern ${JSON.stringify(n.validation.pattern)} is not a valid regular expression.`,
        });
      }

      // ── Image: assetId required ────────────────────────────────────────
      if (n.type === 'image' && !n.assetId) {
        out.push({
          nodeId: n.id,
          field: 'assetId',
          severity: 'error',
          message: 'Image has no Asset ID — nothing will render.',
        });
      }

      // ── Named inputs: collect for duplicate detection ──────────────────
      if (namedTypes.has(n.type)) {
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
