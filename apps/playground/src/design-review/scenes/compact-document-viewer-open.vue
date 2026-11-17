<script setup lang="ts">
/**
 * Compact presentation of the viewer's teleported surfaces: the annotation popover
 * (teleported to `body` by the viewer itself, it takes the compact class of its viewer)
 * and the item menu of the annotations panel (a `CoarPopover`). Both are opened by the
 * spec (stories.json) or the gallery test; the profile class sits on an ancestor set by the
 * gallery (or a story wrapper), not on `<html>`.
 */
import { CoarDocumentViewer, imageGallerySource } from '@cocoar/vue-document-viewer';
import { annotations, galleryUrls } from './compact-document-viewer-fixtures';

const source = imageGallerySource({ urls: galleryUrls });
</script>

<template>
  <div style="height: 560px">
    <CoarDocumentViewer
      :source="source"
      :annotations="annotations"
      :show-annotations-panel="true"
      :annotations-panel-open="true"
    />
  </div>
</template>
