<script setup lang="ts">
/**
 * `<CoarDocumentViewer>` (profile-neutral; profile class from an ancestor): toolbar (inline page
 * and zoom inputs), thumbnail sidebar, annotations panel with its search, filters, groups
 * and items, and annotations of every type on the page. Image gallery source (inline
 * SVG): no worker, no network. The page content is document data and not themed.
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
      :show-thumbnails="true"
      :show-annotations-panel="true"
      :sidebar-open="true"
      :annotations-panel-open="true"
    />
  </div>
</template>
