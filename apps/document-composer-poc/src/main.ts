import { createApp } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';
import App from './App.vue';
import './styles.css';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};

const app = createApp(App);
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
app.mount('#app');
