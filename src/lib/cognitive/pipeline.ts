import {
  COGNITIVE_STAGES,
  type CognitiveStage,
  type PipelineTrace,
  type StageStatus,
} from "./types";

/** One request owns one trace. Reserved stages are explicit, not simulated work. */
export class CognitivePipeline {
  readonly trace: PipelineTrace;
  private current = 0;
  private started = new Map<CognitiveStage, number>();

  constructor(runId = crypto.randomUUID()) {
    this.trace = {
      version: 1,
      runId,
      status: "running",
      stages: COGNITIVE_STAGES.map((stage) => ({ stage, status: "pending" })),
    };
  }

  begin(stage: CognitiveStage): void {
    const entry = this.trace.stages[this.current];
    if (this.trace.status !== "running" || entry?.stage !== stage || entry.status !== "pending") {
      throw new Error(`Invalid cognitive stage order: ${stage}`);
    }
    entry.status = "running";
    entry.startedAt = new Date().toISOString();
    this.started.set(stage, Date.now());
  }

  end(
    stage: CognitiveStage,
    summary: string,
    status: Extract<StageStatus, "completed" | "degraded" | "deferred" | "skipped"> = "completed",
  ): void {
    const entry = this.trace.stages[this.current];
    if (entry?.stage !== stage || entry.status !== "running")
      throw new Error(`Stage not running: ${stage}`);
    entry.status = status;
    entry.summary = summary;
    entry.finishedAt = new Date().toISOString();
    entry.durationMs = Date.now() - (this.started.get(stage) ?? Date.now());
    this.current += 1;
    if (this.current === COGNITIVE_STAGES.length) this.trace.status = "completed";
  }

  async run<T>(
    stage: CognitiveStage,
    work: () => Promise<T> | T,
    summary: (value: T) => string,
  ): Promise<T> {
    this.begin(stage);
    try {
      const value = await work();
      this.end(stage, summary(value));
      return value;
    } catch (error) {
      this.terminate("failed");
      throw error;
    }
  }

  defer(stage: CognitiveStage, summary: string): void {
    this.begin(stage);
    this.end(stage, summary, "deferred");
  }

  terminate(status: "failed" | "cancelled"): void {
    if (this.trace.status !== "running") return;
    const active = this.trace.stages[this.current];
    if (active) {
      active.status = status;
      active.finishedAt = new Date().toISOString();
      active.durationMs = Date.now() - (this.started.get(active.stage) ?? Date.now());
    }
    for (const entry of this.trace.stages.slice(this.current + 1)) entry.status = "skipped";
    this.trace.status = status;
  }

  snapshot(): PipelineTrace {
    return structuredClone(this.trace);
  }
}
