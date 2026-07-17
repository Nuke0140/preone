/**
 * OpenAiLlmProvider — real OpenAI (or compatible) LLM integration
 * (Wave 17.1).
 *
 * OpenAI API docs:
 *   - https://platform.openai.com/docs/api-reference/chat
 *   - https://platform.openai.com/docs/api-reference/embeddings
 *
 * Two operations (matching AiLlmProviderPort):
 *   - complete  — POST /v1/chat/completions
 *   - embed     — POST /v1/embeddings
 *
 * Auth: Bearer token (api_key).
 *
 * Compatible APIs (config.apiBaseUrl override):
 *   - Azure OpenAI       — set apiBaseUrl + apiKey (Azure key)
 *   - Anthropic Claude   — via OpenAI-compatible proxy
 *   - Z.ai GLM           — https://open.bigmodel.cn/api/paas/v4/
 *   - Together.ai, Groq, Mistral — all OpenAI-compatible
 *
 * Streaming: NOT implemented here. Wave 18.1's SSE streaming endpoint
 * calls this provider directly with `stream: true` and parses the
 * Server-Sent Events response itself.
 */
import { Injectable, Logger } from '@nestjs/common';

import type {
  CompletionRequest, CompletionResult,
  EmbeddingRequest, EmbeddingResult,
  CompletionStreamChunk,
  AiLlmProviderPort, AiLlmConfig,
} from '../ai-llm.adapter';

@Injectable()
export class OpenAiLlmProvider implements AiLlmProviderPort {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiLlmProvider.name);

  private static readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';

  async complete(req: CompletionRequest, config: AiLlmConfig): Promise<CompletionResult> {
    if (!config.apiKey) {
      return { ok: false, error: 'OpenAI requires apiKey' };
    }
    const baseUrl = config.apiBaseUrl ?? OpenAiLlmProvider.DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;
    const body: Record<string, unknown> = {
      model: req.model ?? config.defaultModel ?? 'gpt-4o-mini',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      ...(req.topP ? { top_p: req.topP } : {}),
      ...(req.stop ? { stop: req.stop } : {}),
    };
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        return {
          ok: false,
          error: `OpenAI complete failed: ${resp.status} ${(json['error'] as { message?: string } | undefined)?.message ?? JSON.stringify(json)}`,
        };
      }
      const choices = json['choices'] as Array<{ message: { content: string }; finish_reason: string }>;
      const usage = json['usage'] as { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      const choice = choices?.[0];
      return {
        ok: true,
        text: choice?.message?.content ?? '',
        finishReason: (choice?.finish_reason as CompletionResult['finishReason']) ?? 'stop',
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        model: json['model'] as string ?? (req.model ?? config.defaultModel ?? 'unknown'),
      };
    } catch (err) {
      return { ok: false, error: `OpenAI network error: ${(err as Error).message}` };
    }
  }

  async embed(req: EmbeddingRequest, config: AiLlmConfig): Promise<EmbeddingResult> {
    if (!config.apiKey) {
      return { ok: false, error: 'OpenAI requires apiKey' };
    }
    const baseUrl = config.apiBaseUrl ?? OpenAiLlmProvider.DEFAULT_BASE_URL;
    const url = `${baseUrl}/embeddings`;
    const body: Record<string, unknown> = {
      model: req.model ?? config.defaultEmbeddingModel ?? 'text-embedding-3-small',
      input: req.input,
    };
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        return {
          ok: false,
          error: `OpenAI embed failed: ${resp.status} ${(json['error'] as { message?: string } | undefined)?.message ?? JSON.stringify(json)}`,
        };
      }
      const data = json['data'] as Array<{ embedding: number[] }>;
      const usage = json['usage'] as { total_tokens: number };
      return {
        ok: true,
        embeddings: data.map((d) => d.embedding),
        model: json['model'] as string,
        totalTokens: usage?.total_tokens,
      };
    } catch (err) {
      return { ok: false, error: `OpenAI network error: ${(err as Error).message}` };
    }
  }

  /**
   * Stream a chat completion (Wave 18.1). Calls OpenAI's
   * /chat/completions endpoint with `stream: true` and parses the
   * Server-Sent Events response chunk-by-chunk.
   *
   * Each SSE `data:` line is a JSON object with choices[0].delta.content
   * (token delta). The final `data: [DONE]` line signals end.
   */
  async *completeStream(req: CompletionRequest, config: AiLlmConfig): AsyncIterable<CompletionStreamChunk> {
    if (!config.apiKey) {
      yield { text: '', done: true, error: 'OpenAI requires apiKey' };
      return;
    }
    const baseUrl = config.apiBaseUrl ?? OpenAiLlmProvider.DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;
    const body: Record<string, unknown> = {
      model: req.model ?? config.defaultModel ?? 'gpt-4o-mini',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      ...(req.topP ? { top_p: req.topP } : {}),
      ...(req.stop ? { stop: req.stop } : {}),
    };
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      yield { text: '', done: true, error: `OpenAI stream network error: ${(err as Error).message}` };
      return;
    }
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({})) as Record<string, unknown>;
      yield {
        text: '',
        done: true,
        error: `OpenAI stream failed: ${resp.status} ${(errJson['error'] as { message?: string } | undefined)?.message ?? JSON.stringify(errJson)}`,
      };
      return;
    }
    if (!resp.body) {
      yield { text: '', done: true, error: 'OpenAI stream returned no body' };
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finishReason: CompletionStreamChunk['finishReason'];
    let usage: CompletionStreamChunk['usage'];

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by `\n\n`. Process complete events.
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
          const eventBlock = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          const lines = eventBlock.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              yield { text: '', done: true, finishReason, usage };
              return;
            }
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              const choices = parsed['choices'] as Array<{ delta: { content?: string }; finish_reason?: string }>;
              const choice = choices?.[0];
              if (choice?.delta?.content) {
                yield { text: choice.delta.content, done: false };
              }
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason as CompletionStreamChunk['finishReason'];
              }
              const usageRaw = parsed['usage'] as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
              if (usageRaw) {
                usage = {
                  promptTokens: usageRaw.prompt_tokens,
                  completionTokens: usageRaw.completion_tokens,
                  totalTokens: usageRaw.total_tokens,
                };
              }
            } catch {
              // Skip malformed SSE lines (partial JSON across chunks).
            }
          }
        }
      }
      // Stream ended without [DONE] — emit final chunk.
      yield { text: '', done: true, finishReason, usage };
    } catch (err) {
      yield { text: '', done: true, error: `OpenAI stream read error: ${(err as Error).message}` };
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore — already released
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    // OpenAI has no public health endpoint — we ping /v1/models with
    // a HEAD. A 401 means the API is up.
    try {
      const baseUrl = OpenAiLlmProvider.DEFAULT_BASE_URL;
      const resp = await fetch(`${baseUrl}/models`, { method: 'HEAD' });
      return resp.status < 500;
    } catch {
      return false;
    }
  }
}
