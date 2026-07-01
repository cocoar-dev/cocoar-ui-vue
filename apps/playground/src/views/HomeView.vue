<template>
  <div>
    <h1>Playground</h1>
    <p>Test area for features that need Vue Router (fragment routing, etc.)</p>
    <ul>
      <li><router-link to="/todos">Todos</router-link></li>
      <li><router-link to="/flex-debug">Flex Debug</router-link></li>
      <li><router-link to="/markdown-editor">Markdown Editor (Milkdown Prototype)</router-link></li>
      <li><router-link to="/markdown-tables"><strong>Markdown Tables (testbed for table editing + edge handles)</strong></router-link></li>
      <li><router-link to="/markdown-embeds">Markdown Embeds (<code>:::key{}</code> registry)</router-link></li>
      <li><router-link to="/markdown-mermaid"><strong>Markdown Diagrams (<code>```mermaid</code> fence renderer) ←</strong></router-link></li>
      <li><router-link to="/pdf-viewer"><strong>PDF Viewer (Phase A — rendering only)</strong></router-link></li>
      <li><router-link to="/file-explorer-poc"><strong>File Explorer POC (VSCode-like tree + tabs + editors)</strong></router-link></li>
      <li><router-link to="/overlay-stacking"><strong>Overlay stacking in modal (select + date-picker outside-click repro)</strong></router-link></li>
      <li><router-link to="/input-showcase"><strong>Input showcase — all field-family controls on CoarInputFrame ←</strong></router-link></li>
      <li><router-link to="/input-frame">Input frame — internal shell proof</router-link></li>
    </ul>
    <h2 style="margin-top: 16px">@cocoar/vue-calendar demos</h2>
    <ul>
      <li><router-link to="/calendar-basic"><strong>Calendar — Basic ←</strong></router-link></li>
      <li><router-link to="/calendar-shell"><strong>Calendar — Shell (full feature demo) ←</strong></router-link></li>
      <li><router-link to="/calendar-cross-zone">Calendar — Cross-zone events (C3+C5)</router-link></li>
      <li><router-link to="/calendar-events-loader">Calendar — eventsLoader pattern</router-link></li>
      <li><router-link to="/calendar-dst-policy">Calendar — DstPolicy (C4)</router-link></li>
      <li><router-link to="/calendar-wire-helpers">Calendar — Wire helpers (Article 8)</router-link></li>
      <li><router-link to="/calendar-standalone">Calendar — Standalone sub-views</router-link></li>
      <li><router-link to="/calendar-perf-bench">Calendar — Performance bench (1 000+ events)</router-link></li>
      <li><router-link to="/calendar-timeline-perf"><strong>Calendar — Timeline performance (1 000+ tasks) ←</strong></router-link></li>
      <li><router-link to="/calendar-recurrence"><strong>Calendar — Recurrence (Phase 4) ←</strong></router-link></li>
      <li><router-link to="/calendar-popover"><strong>Calendar — Popover on hover ←</strong></router-link></li>
    </ul>
  </div>
</template>
