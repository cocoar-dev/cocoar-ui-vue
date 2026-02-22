import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, onMounted } from 'vue';

const MotionPage = defineComponent({
  name: 'MotionPage',
  setup() {
    const durationTokens = [
      { name: 'Instant', variable: '--coar-duration-instant', value: '0ms', desc: 'No animation' },
      { name: 'Fast', variable: '--coar-duration-fast', value: '100ms', desc: 'Hover, focus states' },
      { name: 'Normal', variable: '--coar-duration-normal', value: '200ms', desc: 'Buttons, inputs' },
      { name: 'Slow', variable: '--coar-duration-slow', value: '300ms', desc: 'Dropdowns, panels' },
      { name: 'Slower', variable: '--coar-duration-slower', value: '400ms', desc: 'Modals, overlays' },
      { name: 'Slowest', variable: '--coar-duration-slowest', value: '500ms', desc: 'Complex animations' },
    ];
    const easingTokens = [
      { name: 'Linear', variable: '--coar-ease-linear', desc: 'Constant speed' },
      { name: 'Ease Out', variable: '--coar-ease-out', desc: 'Entering elements (fast\u2192slow)' },
      { name: 'Ease In', variable: '--coar-ease-in', desc: 'Exiting elements (slow\u2192fast)' },
      { name: 'Ease In-Out', variable: '--coar-ease-in-out', desc: 'Moving elements' },
      { name: 'Bounce', variable: '--coar-ease-bounce', desc: 'Playful overshoot' },
    ];
    const transitionTokens = [
      { name: 'Default', variable: '--coar-transition-default', desc: 'Most interactive elements' },
      { name: 'Fast', variable: '--coar-transition-fast', desc: 'Hover/focus states' },
      { name: 'Colors', variable: '--coar-transition-colors', desc: 'Color changes only' },
      { name: 'Transform', variable: '--coar-transition-transform', desc: 'Scale, translate' },
      { name: 'Opacity', variable: '--coar-transition-opacity', desc: 'Fade in/out' },
      { name: 'Shadow', variable: '--coar-transition-shadow', desc: 'Elevation changes' },
    ];

    onMounted(() => {
      if (document.getElementById('motion-keyframes')) return;
      const style = document.createElement('style');
      style.id = 'motion-keyframes';
      style.textContent = [
        '@keyframes motion-slide-duration {',
        '  0%, 100% { transform: translateX(0); }',
        '  50% { transform: translateX(100px); }',
        '}',
        '@keyframes motion-slide-easing {',
        '  0%, 100% { transform: translateY(-50%) translateX(0); }',
        '  50% { transform: translateY(-50%) translateX(140px); }',
        '}',
      ].join('\n');
      document.head.appendChild(style);
    });

    return { durationTokens, easingTokens, transitionTokens };
  },
  template: /* html */ `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 1000px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Motion</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">Timing and easing tokens for consistent, accessible animations across the UI.</p>

      <!-- Duration -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Duration</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 4px;">How long animations take. Shorter for small changes, longer for complex movements.</p>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-duration-[instant|fast|normal|slow|slower|slowest]</code>
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; max-width: 600px;">
        <div v-for="t in durationTokens" :key="t.name" style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 140px; height: 36px; background: var(--coar-background-neutral-secondary, #f0f0f0); border-radius: 4px; overflow: hidden; position: relative; flex-shrink: 0;">
            <div :style="{
              position: 'absolute', left: '4px', top: '4px', bottom: '4px', width: '28px',
              background: 'var(--coar-background-accent-primary, #3b82f6)',
              borderRadius: '3px',
              animation: 'motion-slide-duration 2s infinite',
              animationDuration: 'var(' + t.variable + ', 2s)',
            }"></div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
            <span style="font-size: 11px; color: #888;">{{ t.value }} &mdash; {{ t.desc }}</span>
          </div>
        </div>
      </div>

      <!-- Easing -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Easing</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 4px;">How animations accelerate and decelerate.</p>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-ease-[linear|out|in|in-out|bounce]</code>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
        <div v-for="t in easingTokens" :key="t.name" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="width: 100%; height: 70px; background: var(--coar-background-neutral-secondary, #f0f0f0); border-radius: 4px; position: relative; overflow: hidden;">
            <div :style="{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              width: '24px', height: '24px',
              background: 'var(--coar-background-accent-primary, #3b82f6)',
              borderRadius: '50%',
              animation: 'motion-slide-easing 2s infinite',
              animationTimingFunction: 'var(' + t.variable + ', linear)',
            }"></div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
            <span style="font-size: 11px; color: #888;">{{ t.desc }}</span>
          </div>
        </div>
      </div>

      <!-- Transitions -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Transitions</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 4px;">Pre-composed transition values combining duration and easing.</p>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-transition-[default|fast|colors|transform|opacity|shadow]</code>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div v-for="t in transitionTokens" :key="t.name" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <button :style="{
            padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer',
            background: 'var(--coar-background-neutral-secondary, #f5f5f5)',
            transition: 'var(' + t.variable + ')',
            fontSize: '13px', fontFamily: 'inherit',
          }"
          @mouseenter="$event.target.style.background = 'var(--coar-background-accent-primary, #3b82f6)'; $event.target.style.color = '#fff'; $event.target.style.transform = 'scale(1.05)'"
          @mouseleave="$event.target.style.background = 'var(--coar-background-neutral-secondary, #f5f5f5)'; $event.target.style.color = ''; $event.target.style.transform = ''"
          >Hover me</button>
          <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
          <span style="font-size: 10px; color: #888;">{{ t.desc }}</span>
        </div>
      </div>

      <!-- Accessibility -->
      <div style="padding: 16px 20px; background: var(--coar-background-semantic-info-subtle, #eff6ff); border-radius: 8px; border: 1px solid var(--coar-border-accent-secondary, #bfdbfe);">
        <h3 style="font-size: 15px; margin: 0 0 8px;">&#9855; Accessibility</h3>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary); margin: 0;">
          All motion tokens respect <code>prefers-reduced-motion</code>. When users prefer reduced motion, all durations automatically become 0ms.
        </p>
      </div>
    </div>
  `,
});

const meta: Meta<typeof MotionPage> = {
  title: 'Foundations/Motion',
  component: MotionPage,
};

export default meta;
type Story = StoryObj<typeof MotionPage>;

export const Motion: Story = {};
