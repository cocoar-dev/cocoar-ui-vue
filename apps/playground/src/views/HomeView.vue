<template>
  <div>
    <h1>Playground</h1>
    <p>Test area for features that need Vue Router (fragment routing, etc.)</p>
    <ul>
      <li><router-link to="/todos">Todos</router-link></li>
      <li><router-link to="/flex-debug">Flex Debug</router-link></li>
      <li><router-link to="/markdown-editor">Markdown Editor (Milkdown Prototype)</router-link></li>
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
      <li><router-link to="/calendar-recurrence"><strong>Calendar — Recurrence (Phase 4) ←</strong></router-link></li>
    </ul>
  </div>
</template>
