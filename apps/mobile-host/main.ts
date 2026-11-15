// Added only by this host's Vite config, never by the browser documentation build.
// This optional .NET project has no JS package/dependency install of its own.
import { setCoarKeyboardInset } from '../../packages/ui/src';
import { connectNeoAstraKeyboard } from './keyboard-bridge.mjs';

const disconnect = connectNeoAstraKeyboard(setCoarKeyboardInset);
if (import.meta.hot) import.meta.hot.dispose(disconnect);
