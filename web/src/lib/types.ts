/**
 * 公共业务类型 —— 不依赖 Prisma 生成结果，便于在客户端组件中复用
 */

export type Capability =
  | "text-to-image"
  | "image-to-image"
  | "upscale"
  | "inpaint";

export type GenerationStatus =
  | "queued"
  | "running"
  | "polling"
  | "succeeded"
  | "failed"
  | "canceled";

export interface GenerationInput {
  providerId: string;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  count?: number;
  seed?: number;
  /** 业务自定义参数（如 quality / style / strength） */
  extra?: Record<string, unknown>;
  /** 图生图 / 局部重绘的输入图 URL */
  imageUrl?: string;
  /** 局部重绘的蒙版 URL */
  maskUrl?: string;
}

export interface GenerationResult {
  id: string;
  status: GenerationStatus;
  progress: number;
  imageUrls: string[];
  errorMessage?: string;
  durationMs?: number;
}
