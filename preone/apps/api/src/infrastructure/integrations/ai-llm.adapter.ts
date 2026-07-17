/**
 * AiLlmAdapter — AI/LLM provider abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a deterministic stub. In prod, the
 * real provider (e.g., OpenAI / Anthropic / Azure OpenAI / Z.ai GLM)
 * is injected via the `AI_LLM_PROVIDER` token.
 *
 * Two core operations:
 *   - complete   — single-turn completion (used by Wave 18 AI endpoints
 *                  for lesson-plan generation, report-card drafts, etc.)
 *   - embed      — generate text embeddings (for vector search + RAG).
 *
 * The adapter does NOT include prompt-template logic — that's the
 * caller's responsibility. It just takes a rendered prompt + params
 * and returns the model's output.
 *
 * Cost + rate-limit guards will be added in Wave 17.1.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;        // 0..2 (default 0.7)
  maxOutputTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface CompletionResult {
  ok: boolean;
  text?: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_call';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  error?: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResult {
  ok: boolean;
  embeddings?: number[][];    // one vector per input string
  model?: string;
  totalTokens?: number;
  error?: string;
}

export const AI_LLM_PROVIDER = 'AI_LLM_PROVIDER';
export const AI_LLM_CONFIG = 'AI_LLM_CONFIG';

export interface AiLlmConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  defaultMaxTokens?: number;
}

/**
 * A single token-batch yielded by the streaming completion endpoint.
 * Wave 18.1 — SSE streaming for long completions.
 */
export interface CompletionStreamChunk {
  /** The text delta (may be empty for the final chunk). */
  text: string;
  /** True when this is the last chunk. */
  done: boolean;
  /** Token usage (only present on the final `done=true` chunk). */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  /** Finish reason (only present on the final chunk). */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_call';
  /** Error message if the stream failed mid-way. */
  error?: string;
}

export interface AiLlmProviderPort {
  readonly name: string;
  complete(req: CompletionRequest, config: AiLlmConfig): Promise<CompletionResult>;
  embed(req: EmbeddingRequest, config: AiLlmConfig): Promise<EmbeddingResult>;
  /**
   * Stream a completion as a series of token-batch chunks. Wave 18.1.
   * Implementations should yield chunks as they arrive from the
   * provider (no buffering). The final chunk must have done=true
   * and include usage + finishReason.
   */
  completeStream?(req: CompletionRequest, config: AiLlmConfig): AsyncIterable<CompletionStreamChunk>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class AiLlmAdapter implements ExternalProvider {
  readonly name = 'ai-llm';
  private readonly logger = new Logger(AiLlmAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(AI_LLM_PROVIDER) private readonly provider: AiLlmProviderPort,
    @Inject(AI_LLM_CONFIG) private readonly config: AiLlmConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 30_000, // LLMs are slow — 30s threshold
    });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.complete(req, this.config),
      );
    } catch (err) {
      this.logger.error(`AI complete (model=${req.model ?? this.config.defaultModel ?? '-'}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.embed(req, this.config),
      );
    } catch (err) {
      this.logger.error(`AI embed failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  /**
   * Stream a completion as a series of token-batch chunks (Wave 18.1).
   *
   * Delegates to the provider's `completeStream` if implemented. If
   * the provider doesn't support streaming (e.g., the Stub), falls
   * back to a single-chunk emission from `complete()`.
   *
   * Circuit breaker is NOT applied to streaming calls — the breaker
   * wraps `complete()` for non-streaming. Streaming is intentionally
   * outside the breaker because:
   *   1. The breaker's slowCallDurationMs (30s) would trip on long
   *      streams (lesson plans can take 60s+).
   *   2. The breaker expects a single Promise, not an AsyncIterable.
   *   3. Streaming failures are visible immediately to the client
   *      (the SSE connection closes) — no need for fail-fast.
   */
  async *completeStream(req: CompletionRequest): AsyncIterable<CompletionStreamChunk> {
    if (this.provider.completeStream) {
      try {
        yield* this.provider.completeStream(req, this.config);
        return;
      } catch (err) {
        this.logger.error(`AI completeStream failed: ${(err as Error).message}`);
        yield {
          text: '',
          done: true,
          error: (err as Error).message,
        };
        return;
      }
    }
    // Fallback: provider doesn't support streaming — emit the full
    // response as a single chunk.
    const result = await this.complete(req);
    yield {
      text: result.text ?? '',
      done: true,
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
      },
      finishReason: result.finishReason,
      ...(result.ok ? {} : { error: result.error }),
    };
  }

  async checkHealth(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const healthy = await this.provider.checkHealth();
      return {
        name: this.name,
        healthy,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        name: this.name,
        healthy: false,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        lastError: (err as Error).message,
      };
    }
  }
}

@Injectable()
export class StubAiLlmProvider implements AiLlmProviderPort {
  readonly name = 'stub-ai-llm';
  private readonly logger = new Logger(StubAiLlmProvider.name);

  async complete(req: CompletionRequest, _config: AiLlmConfig): Promise<CompletionResult> {
    // Deterministic stub: echo the last user message back, prefixed
    // with a marker so tests can assert.
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = `[STUB LLM] Echo: ${lastUser?.content ?? '(empty)'}`;
    const promptTokens = Math.ceil((lastUser?.content?.length ?? 0) / 4);
    this.logger.debug(`[STUB LLM] complete prompt_tokens=${promptTokens}`);
    return {
      ok: true,
      text,
      finishReason: 'stop',
      promptTokens,
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil(text.length / 4) + promptTokens,
      model: req.model ?? 'stub-llm',
    };
  }

  /**
   * Stub streaming (Wave 18.1): emit the full response as a single
   * chunk. Useful for testing the SSE controller without a real LLM.
   *
   * For a more realistic streaming test, the controller spec mocks
   * the adapter directly.
   */
  async *completeStream(req: CompletionRequest, _config: AiLlmConfig): AsyncIterable<CompletionStreamChunk> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = `[STUB LLM] Echo: ${lastUser?.content ?? '(empty)'}`;
    const promptTokens = Math.ceil((lastUser?.content?.length ?? 0) / 4);
    yield {
      text,
      done: true,
      usage: {
        promptTokens,
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil(text.length / 4) + promptTokens,
      },
      finishReason: 'stop',
    };
  }

  async embed(req: EmbeddingRequest, _config: AiLlmConfig): Promise<EmbeddingResult> {
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    // 8-dim deterministic embeddings — enough for tests, not for prod.
    const embeddings = inputs.map((s) => {
      const v: number[] = [];
      for (let i = 0; i < 8; i++) {
        v.push((s.charCodeAt(i % s.length) % 100) / 100);
      }
      return v;
    });
    this.logger.debug(`[STUB LLM] embed ${inputs.length} input(s) → ${embeddings[0]?.length ?? 0}-dim`);
    return {
      ok: true,
      embeddings,
      model: req.model ?? 'stub-embedding',
      totalTokens: inputs.reduce((sum, s) => sum + Math.ceil(s.length / 4), 0),
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
