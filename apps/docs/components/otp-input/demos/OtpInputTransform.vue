<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        Auto-uppercase — try typing <code>abc123</code>
      </div>
      <CoarOtpInput
        v-model="upper"
        type="alphanumeric"
        :length="6"
        :transform="(c) => c.toUpperCase()"
      />
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
        Value: <strong>{{ upper || 'empty' }}</strong>
      </div>
    </div>

    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        Confusable-blocking — rejects <code>O / 0 / l / 1 / I</code> (good for claim codes)
      </div>
      <CoarOtpInput
        v-model="claim"
        type="alphanumeric"
        :length="8"
        :transform="(c) => c.toUpperCase()"
        :accept="(c) => !/[O0lI1]/.test(c)"
      />
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
        Value: <strong>{{ claim || 'empty' }}</strong>
      </div>
    </div>

    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        Strip whitespace on paste — try pasting <code>1 2 3 4 5 6</code>
      </div>
      <CoarOtpInput
        v-model="stripped"
        type="numeric"
        :transform="(c) => (/\s/.test(c) ? '' : c)"
      />
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
        Value: <strong>{{ stripped || 'empty' }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput } from '@cocoar/vue-ui';

const upper = ref('');
const claim = ref('');
const stripped = ref('');
</script>
