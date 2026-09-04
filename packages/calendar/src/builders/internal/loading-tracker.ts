/**
 * One in-flight counter behind `api.loading`, shared by the events
 * loader and the recurring-series expansion.
 *
 * A counter (not a boolean) so concurrent fetches — multi-panel
 * sub-views with overlapping windows, an events fetch racing a
 * series expansion — don't flicker the flag off while another call
 * is still pending.
 */

import { ref, type Ref } from 'vue';

export class LoadingTracker {
  private readonly _loading = ref(false);
  private _inFlight = 0;

  /** Reactive flag for `api.loading`. */
  get loading(): Ref<boolean> {
    return this._loading;
  }

  /** Current in-flight count (diagnostics / tests). */
  get inFlight(): number {
    return this._inFlight;
  }

  begin(): void {
    this._inFlight += 1;
    this._loading.value = true;
  }

  end(): void {
    this._inFlight -= 1;
    if (this._inFlight <= 0) {
      this._inFlight = 0;
      this._loading.value = false;
    }
  }
}
