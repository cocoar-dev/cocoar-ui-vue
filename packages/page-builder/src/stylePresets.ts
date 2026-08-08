import type { PageConfig, PageNode, PageStylePreset } from './schema'

const SAFE_CLASS = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/

export function isSafeStylePreset(preset: PageStylePreset): boolean {
  return !!preset.id
    && !!preset.label
    && SAFE_CLASS.test(preset.className)
    && Array.isArray(preset.allowedOn)
    && preset.allowedOn.length > 0
}

export function findStylePreset(
  config: PageConfig | undefined,
  node: Pick<PageNode, 'type' | 'stylePreset'>,
): PageStylePreset | undefined {
  const id = node.stylePreset
  if (!id) return undefined
  const preset = config?.stylePresets?.find((entry) => entry.id === id)
  if (!preset || !isSafeStylePreset(preset) || !preset.allowedOn.includes(node.type)) return undefined
  return preset
}
