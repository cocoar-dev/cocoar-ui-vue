import { onBeforeUnmount, watch, type Ref } from 'vue';

/**
 * Reports a refused entry of a control: the text in it is no value, and the value
 * stays. The editor lists the message in `issues` at the control's pointer until
 * it ends: a valid entry, Esc, or the control going away.
 */
export function useRefusal(emit: (event: 'refused', message: string | undefined) => void, message: Ref<string | undefined>) {
  watch(message, (text) => emit('refused', text));
  onBeforeUnmount(() => {
    if (message.value) emit('refused', undefined);
  });
}
