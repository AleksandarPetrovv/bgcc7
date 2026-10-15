import type { Plan } from "@/lib/format-plan";

export type WriteState = { status: "idle" | "saving" | "saved" | "err"; resetting: boolean };
type Operation = { kind: "save"; plan: Plan } | { kind: "reset" };
type Result = { ok: boolean } | null;
type Options = {
  initial: Plan;
  defaults: Plan;
  save: (plan: Plan) => Promise<Result>;
  reset: () => Promise<Result>;
  onPlan: (plan: Plan) => void;
  onState: (state: WriteState) => void;
};

export class FormatWriter {
  private plan: Plan;
  private sent: string;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private busy = false;
  private queued: Operation | null = null;
  private failed: Operation | null = null;
  private state: WriteState = { status: "idle", resetting: false };
  private active = true;

  constructor(private options: Options) {
    this.plan = options.initial;
    this.sent = JSON.stringify(options.initial);
  }

  get dirty() {
    return this.busy || !!this.timer || !!this.queued || !!this.failed || JSON.stringify(this.plan) !== this.sent;
  }

  activate() {
    this.active = true;
  }

  dispose() {
    this.active = false;
    this.cancelDebounce();
  }

  change(update: (plan: Plan) => Plan) {
    if (this.state.resetting || !this.active) return;
    this.plan = update(this.plan);
    this.failed = null;
    this.cancelDebounce();
    this.queued = null;
    this.options.onPlan(this.plan);
    this.publish({ status: this.busy ? "saving" : "idle" });
    const generation = this.generation;
    this.timer = setTimeout(() => {
      if (generation !== this.generation || this.state.resetting || !this.active) return;
      this.timer = undefined;
      this.enqueue({ kind: "save", plan: this.plan });
    }, 450);
  }

  reset() {
    if (this.state.resetting || !this.active) return;
    this.cancelDebounce();
    this.failed = null;
    this.publish({ status: "saving", resetting: true });
    this.enqueue({ kind: "reset" });
  }

  retry() {
    if (this.state.resetting || !this.active) return;
    if (this.failed?.kind === "reset") this.reset();
    else {
      this.cancelDebounce();
      this.failed = null;
      this.enqueue({ kind: "save", plan: this.plan });
    }
  }

  private cancelDebounce() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private publish(update: Partial<WriteState>) {
    this.state = { ...this.state, ...update };
    if (this.active) this.options.onState(this.state);
  }

  private enqueue(operation: Operation) {
    this.queued = operation;
    this.publish({ status: "saving" });
    void this.flush();
  }

  private async flush() {
    if (this.busy) return;
    this.busy = true;
    while (this.queued) {
      const operation = this.queued;
      this.queued = null;
      let ok = false;
      try {
        const result = await (operation.kind === "reset" ? this.options.reset() : this.options.save(operation.plan));
        ok = !!result?.ok;
      } catch {}
      if (ok) {
        const saved = operation.kind === "reset" ? this.options.defaults : operation.plan;
        this.sent = JSON.stringify(saved);
        if (operation.kind === "reset") {
          this.plan = saved;
          if (this.active) this.options.onPlan(saved);
        }
      }
      this.failed = ok ? null : operation;
      this.publish({
        status: this.queued || this.timer ? "saving" : ok ? "saved" : "err",
        ...(operation.kind === "reset" ? { resetting: false } : {}),
      });
    }
    this.busy = false;
  }
}
