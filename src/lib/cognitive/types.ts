export const COGNITIVE_STAGES = [
  "intent",
  "context",
  "planner",
  "agent_selector",
  "tools_skills",
  "verification",
  "memory_update",
  "response",
] as const;

export type CognitiveStage = (typeof COGNITIVE_STAGES)[number];
export type StageStatus =
  | "pending"
  | "running"
  | "completed"
  | "degraded"
  | "deferred"
  | "skipped"
  | "failed"
  | "cancelled";
export type StageTrace = {
  stage: CognitiveStage;
  status: StageStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  summary?: string;
};
export type TaskDomain =
  | "conversation"
  | "research"
  | "music"
  | "image"
  | "document"
  | "code"
  | "calendar"
  | "finance"
  | "productivity"
  | "automation"
  | "memory"
  | "communication";
export type CognitiveIntent = {
  engine: "rules-v1";
  taskType: "question" | "action" | "planning" | "conversation";
  primaryGoal: string;
  domains: TaskDomain[];
  requiresPlanning: boolean;
  executionMode: "respond" | "direct_action" | "plan" | "clarify";
  urgency: "normal" | "high";
  requiredSkills: string[];
  confidence: number;
  needsClarification: boolean;
};
export type ContextSource = { source: string; status: "ok" | "unavailable"; count: number };
export type CognitiveContext = {
  prompt: string;
  sources: ContextSource[];
  activeModules: string[];
  matchedSkills: string[];
  immediatePreferences: string[];
};
export type PipelineTrace = {
  version: 1;
  runId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  stages: StageTrace[];
};
