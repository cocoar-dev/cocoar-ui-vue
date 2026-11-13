<script setup lang="ts">
import { CoarButton, CoarPopover, CoarTextInput } from '@cocoar/vue-ui';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">
      .coar-mobile on a local container beside a desktop sibling; popover opened inside it
    </h2>
    <p style="margin: 0 0 16px; font-size: 12px">
      Today's limit: the popover is teleported to body, so its button and input keep the desktop
      presentation while the trigger it belongs to is mobile.
    </p>
    <div class="vs-row" style="align-items: flex-start; gap: 32px">
      <div style="width: 280px; align-items: stretch" class="vs-stack">
        <strong style="font-size: 12px">Desktop sibling</strong>
        <CoarTextInput model-value="Desktop input" />
        <div><CoarButton>Save</CoarButton></div>
      </div>
      <div style="width: 280px; align-items: stretch" class="vs-stack coar-mobile" data-visual-open>
        <strong style="font-size: 12px">Local .coar-mobile container</strong>
        <CoarTextInput model-value="Mobile input" />
        <div>
          <CoarPopover mode="click" interactive>
            <CoarButton variant="secondary">Share</CoarButton>
            <template #content>
              <div class="vs-stack" style="width: 240px; padding: 12px; align-items: stretch">
                <CoarTextInput model-value="ada@example.com" />
                <div><CoarButton size="m">Invite</CoarButton></div>
              </div>
            </template>
          </CoarPopover>
        </div>
      </div>
    </div>
  </section>
</template>
