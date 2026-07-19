// Shared types for dynamic sections. Client-safe (no server imports).
import { z } from "zod";

export const BLOCK_TYPES = [
  "stat",
  "list",
  "chart",
  "action",
  "chat_prompt",
  "markdown",
  "code_preview",
  "office_doc",
] as const;

export const SOURCE_WHITELIST = [
  "count:generated_documents",
  "count:generated_images",
  "count:user_memory",
  "count:whatsapp_contacts",
  "count:assistant_threads",
  "query:images.recent",
  "query:documents.recent",
  "query:memory.recent",
  "query:threads.recent",
  "query:messages.by_day",
] as const;

export type SourceKey = (typeof SOURCE_WHITELIST)[number];

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stat"),
    title: z.string().max(80),
    source: z.enum(SOURCE_WHITELIST),
  }),
  z.object({
    type: z.literal("list"),
    title: z.string().max(80),
    source: z.enum(SOURCE_WHITELIST),
    limit: z.number().int().min(1).max(20).default(6),
  }),
  z.object({
    type: z.literal("chart"),
    title: z.string().max(80),
    source: z.enum(SOURCE_WHITELIST),
    range: z.number().int().min(7).max(90).default(30),
  }),
  z.object({
    type: z.literal("action"),
    title: z.string().max(80),
    skill: z.string().min(1).max(80),
    input: z.record(z.string(), z.unknown()).default({}),
  }),
  z.object({
    type: z.literal("chat_prompt"),
    title: z.string().max(80),
    seed: z.string().min(1).max(400),
  }),
  z.object({
    type: z.literal("markdown"),
    content: z.string().max(4000),
  }),
  z.object({
    type: z.literal("code_preview"),
    title: z.string().max(80),
    language: z.enum(["html", "react", "js", "css"]).default("html"),
    code: z.string().min(1).max(60000),
    height: z.number().int().min(160).max(1200).default(420),
  }),
  z.object({
    type: z.literal("office_doc"),
    title: z.string().max(120),
    format: z.enum(["docx", "xlsx", "pptx", "pdf"]),
    url: z.string().url(),
    height: z.number().int().min(240).max(1400).default(560),
  }),
]);

export const LayoutSchema = z.object({
  blocks: z.array(BlockSchema).min(1).max(12),
});

export type Block = z.infer<typeof BlockSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
