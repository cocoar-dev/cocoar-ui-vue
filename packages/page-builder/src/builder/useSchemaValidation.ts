import { computed, type Ref } from 'vue';
import { isElementAllowed } from '../schema';
import type { ButtonNode, ElementNode, LinkNode, PageConfig, PageNode } from '../schema';
import { compilePagePattern, isUnsafeFieldName } from '../renderSafety';
import { useMergedElements } from '../elements/useMergedElements';
import { isFieldCompatible } from '../elements/fieldContract';

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
    const conditionalNodes: Array<{ node: PageNode; vw: unknown }> = [];
    const defaultButtons: PageNode[] = [];
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
        if ((n as ButtonNode).props.default) defaultButtons.push(n);
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

      // ── Dynamic options: the source callback must be configured ────────
      const sourceId = ((n as ElementNode).props as { optionsSourceId?: unknown } | undefined)
        ?.optionsSourceId;
      if (typeof sourceId === 'string' && sourceId && !config.value?.optionsSource) {
        out.push({
          nodeId: n.id,
          field: 'optionsSourceId',
          severity: 'warning',
          message: `optionsSourceId "${sourceId}" is set, but config.optionsSource is not configured — the static options are used.`,
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
        if (name && isUnsafeFieldName(name)) {
          out.push({
            nodeId: n.id,
            field: 'name',
            severity: 'error',
            message: `Field name "${name}" is reserved — the field is excluded from the value model.`,
          });
        } else if (name) {
          namedFields.push({ node: n, name });
        }
      }

      // ── Conditional visibility: checked against the named fields later ─
      const vw = (n as ElementNode).visibleWhen;
      if (vw !== undefined) conditionalNodes.push({ node: n, vw });

      // ── Field contract: bindings must exist and be type-compatible ─────
      const contract = config.value?.fields;
      if (contract && def?.value) {
        const name = (n as { name?: string }).name;
        const field = name ? contract.find((f) => f.name === name) : undefined;
        if (name && !field && !config.value?.allowCustomFields) {
          out.push({
            nodeId: n.id,
            field: 'name',
            severity: 'error',
            message: `Field "${name}" is not in the field contract.`,
          });
        } else if (field && !isFieldCompatible(def, field)) {
          out.push({
            nodeId: n.id,
            field: 'name',
            severity: 'error',
            message: `"${n.type}" cannot edit field "${field.name}" (${field.valueType}).`,
          });
        }
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

    // ── visibleWhen: the controlling field must exist on the page, and an
    //    `equals` condition on an array-valued controller can never match ──
    const boundNames = new Set(namedFields.map((f) => f.name));
    for (const { node: n, vw } of conditionalNodes) {
      const cond = vw as { field?: unknown; equals?: unknown } | null;
      if (!cond || typeof cond !== 'object' || typeof cond.field !== 'string' || !cond.field) {
        out.push({
          nodeId: n.id,
          field: 'visibleWhen',
          severity: 'warning',
          message: 'visibleWhen is malformed — the node stays always visible.',
        });
        continue;
      }
      if (!boundNames.has(cond.field)) {
        out.push({
          nodeId: n.id,
          field: 'visibleWhen',
          severity: 'warning',
          message: `visibleWhen references field "${cond.field}", which is not on the page.`,
        });
        continue;
      }
      const controllerNode = namedFields.find((f) => f.name === cond.field)?.node;
      const controllerDef = controllerNode ? registry[controllerNode.type] : undefined;
      if (
        'equals' in cond && !Array.isArray(cond.equals) &&
        controllerDef?.value?.types?.includes('string[]')
      ) {
        out.push({
          nodeId: n.id,
          field: 'visibleWhen',
          severity: 'warning',
          message: `visibleWhen.equals can never match the multi-value field "${cond.field}" — the node stays hidden.`,
        });
      }
    }

    // ── visibleWhen: circular chains can lock fields permanently hidden — a
    //    hidden controller cannot be edited to unhide its dependents. A field
    //    is controlled by its OWN condition and by every ANCESTOR container's
    //    condition (hiding gates whole subtrees), self-references included ──
    const controllersByName = new Map<string, { node: PageNode; fields: Set<string> }>();
    const collectControllers = (n: PageNode, inherited: string[]) => {
      const vw = (n as ElementNode).visibleWhen as { field?: unknown } | undefined;
      const ownField =
        vw && typeof vw === 'object' && typeof vw.field === 'string' && vw.field
          ? vw.field
          : undefined;
      const chain = ownField ? [...inherited, ownField] : inherited;
      const def = n.type === 'page' ? undefined : registry[n.type];
      const name = (n as ElementNode).name;
      if (def?.value && typeof name === 'string' && name && chain.length > 0
        && !controllersByName.has(name)) {
        controllersByName.set(name, { node: n, fields: new Set(chain) });
      }
      if ('children' in n && Array.isArray(n.children)) {
        for (const c of n.children) collectControllers(c, chain);
      }
    };
    collectControllers(schema.value, []);

    const dfsState = new Map<string, 'active' | 'done'>();
    const inCycle = new Set<string>();
    const dfs = (name: string, stack: string[]) => {
      dfsState.set(name, 'active');
      stack.push(name);
      for (const field of controllersByName.get(name)!.fields) {
        if (!controllersByName.has(field)) continue; // stable root — no loop through it
        const state = dfsState.get(field);
        if (state === 'active') {
          for (const member of stack.slice(stack.indexOf(field))) inCycle.add(member);
        } else if (state === undefined) {
          dfs(field, stack);
        }
      }
      stack.pop();
      dfsState.set(name, 'done');
    };
    for (const name of controllersByName.keys()) {
      if (!dfsState.has(name)) dfs(name, []);
    }
    for (const name of inCycle) {
      out.push({
        nodeId: controllersByName.get(name)!.node.id,
        field: 'visibleWhen',
        severity: 'warning',
        message: `visibleWhen chain around field "${name}" is circular — hidden controllers cannot be edited, so these fields can lock each other permanently hidden.`,
      });
    }

    // ── Enter-to-submit: only ONE default button can win ──────────────────
    if (defaultButtons.length > 1) {
      for (const n of defaultButtons) {
        out.push({
          nodeId: n.id,
          field: 'default',
          severity: 'warning',
          message: `${defaultButtons.length} buttons are marked as default — Enter fires only the first in tree order.`,
        });
      }
    }

    // ── Field contract: required fields must be collected somewhere ───────
    const contract = config.value?.fields;
    if (contract) {
      const bound = new Set(namedFields.map((f) => f.name));
      for (const field of contract) {
        if (field.required && !bound.has(field.name)) {
          out.push({
            nodeId: schema.value.id,
            field: 'fields',
            severity: 'warning',
            message: `Contract field "${field.name}" (required) is not on the page.`,
          });
        }
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
