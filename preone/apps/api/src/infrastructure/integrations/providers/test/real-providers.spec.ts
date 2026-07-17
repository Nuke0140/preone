/**
 * Unit tests for the 4 real Wave 17.1 providers.
 *
 * Each test mocks global `fetch` and asserts:
 *   - The correct URL, method, headers, and body are sent.
 *   - The provider response is correctly parsed into the adapter's
 *     result shape.
 *   - Network errors are caught and returned as ok=false (not thrown).
 *
 * These tests cover:
 *   - RazorpayPaymentProvider (createOrder, verifyPayment, refundPayment)
 *   - SendGridEmailProvider (send)
 *   - TwilioSmsProvider (send)
 *   - OpenAiLlmProvider (complete, embed)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { RazorpayPaymentProvider } from '../razorpay-payment.provider';
import { SendGridEmailProvider } from '../sendgrid-email.provider';
import { TwilioSmsProvider } from '../twilio-sms.provider';
import { OpenAiLlmProvider } from '../openai-llm.provider';

// ─── fetch mock helpers ─────────────────────────────────────────

function mockFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body as Record<string, unknown>,
    text: async () => JSON.stringify(body),
    headers: new Headers(headers),
  } as Response;
}

describe('RazorpayPaymentProvider', () => {
  let provider: RazorpayPaymentProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new RazorpayPaymentProvider();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should createOrder and parse the response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        id: 'order_Nabc123',
        amount: 50000,
        currency: 'INR',
        status: 'created',
      }),
    );
    const result = await provider.createOrder(
      {
        amountCents: 50000,
        currency: 'INR',
        receiptId: 'rcpt-001',
      },
      { apiKey: 'rzp_key', apiSecret: 'rzp_secret', mode: 'test' },
    );
    expect(result.ok).toBe(true);
    expect(result.providerOrderId).toBe('order_Nabc123');
    expect(result.amountCents).toBe(50000);
    expect(result.currency).toBe('INR');

    // Verify the fetch args.
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.razorpay.com/v1/orders');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toMatch(/^Basic /);
    const body = JSON.parse(opts.body);
    expect(body.amount).toBe(50000);
    expect(body.currency).toBe('INR');
    expect(body.payment_capture).toBe(1);
  });

  it('should return ok=false when API returns 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(400, {
        error: 'invalid_amount',
        error_description: 'Amount must be > 0',
      }),
    );
    const result = await provider.createOrder(
      { amountCents: 0, currency: 'INR', receiptId: 'rcpt-002' },
      { apiKey: 'rzp_key', apiSecret: 'rzp_secret' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid_amount|Amount must be/);
  });

  it('should return ok=false when no credentials are configured', async () => {
    const result = await provider.createOrder(
      { amountCents: 500, currency: 'INR', receiptId: 'rcpt-003' },
      { apiKey: undefined, apiSecret: undefined },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/apiKey.*apiSecret/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should verify a payment signature via HMAC-SHA256', async () => {
    // Compute a real HMAC for a known payload so we can assert verified=true.
    const secret = 'rzp_secret';
    const payload = 'order_Nabc|pay_Nxyz';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const signature = Buffer.from(new Uint8Array(sig)).toString('hex');

    const result = await provider.verifyPayment(
      {
        providerOrderId: 'order_Nabc',
        providerPaymentId: 'pay_Nxyz',
        providerSignature: signature,
        expectedAmountCents: 50000,
        currency: 'INR',
      },
      { apiSecret: secret },
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.capturedAmountCents).toBe(50000);
  });

  it('should return verified=false on signature mismatch', async () => {
    const result = await provider.verifyPayment(
      {
        providerOrderId: 'order_X',
        providerPaymentId: 'pay_Y',
        providerSignature: 'bogus',
        expectedAmountCents: 100,
        currency: 'INR',
      },
      { apiSecret: 'secret' },
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.capturedAmountCents).toBe(0);
  });

  it('should refund a payment', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        id: 'rfn_Nabc',
        amount: 5000,
        currency: 'INR',
        status: 'processed',
      }),
    );
    const result = await provider.refundPayment(
      { providerPaymentId: 'pay_Nxyz', amountCents: 5000 },
      { apiKey: 'k', apiSecret: 's' },
    );
    expect(result.ok).toBe(true);
    expect(result.providerRefundId).toBe('rfn_Nabc');
    expect(result.refundedAmountCents).toBe(5000);
  });

  it('should catch network errors and return ok=false', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const result = await provider.createOrder(
      { amountCents: 100, currency: 'INR', receiptId: 'r' },
      { apiKey: 'k', apiSecret: 's' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/network error.*ECONNRESET/);
  });
});

// ─── SendGridEmailProvider ─────────────────────────────────────

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new SendGridEmailProvider();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send an email and parse the 202 Accepted response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(202, {}, { 'x-message-id': 'sg-msg-1' }),
    );
    const result = await provider.send(
      {
        to: 'parent@example.com',
        subject: 'Test',
        textBody: 'Hello',
        htmlBody: '<p>Hello</p>',
      },
      { fromAddress: 'noreply@preone.in', apiKey: 'sg.key' },
    );
    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe('sg-msg-1');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(opts.headers['Authorization']).toBe('Bearer sg.key');
    const body = JSON.parse(opts.body);
    expect(body.personalizations[0].to).toEqual([{ email: 'parent@example.com' }]);
    expect(body.subject).toBe('Test');
    expect(body.content).toContainEqual({ type: 'text/plain', value: 'Hello' });
    expect(body.content).toContainEqual({ type: 'text/html', value: '<p>Hello</p>' });
  });

  it('should return ok=false on 4xx with error body', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(400, { errors: [{ message: 'invalid email' }] }),
    );
    const result = await provider.send(
      { to: 'bad', subject: 'x', textBody: 'y' },
      { fromAddress: 'noreply@preone.in', apiKey: 'sg.key' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/SendGrid send failed.*400/);
  });

  it('should return ok=false when apiKey is missing', async () => {
    const result = await provider.send(
      { to: 'a@b.com', subject: 'x', textBody: 'y' },
      { fromAddress: 'noreply@preone.in', apiKey: undefined },
    );
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── TwilioSmsProvider ─────────────────────────────────────────

describe('TwilioSmsProvider', () => {
  let provider: TwilioSmsProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new TwilioSmsProvider();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send an SMS and parse the response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(201, { sid: 'SMxxx', status: 'queued' }),
    );
    const result = await provider.send(
      { to: '+919876543210', body: 'Hello from PreOne' },
      { from: '+910000000000', apiKey: 'ACxxx', apiSecret: 'tw-token' },
    );
    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe('SMxxx');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toMatch(/^Basic /);
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    // Body is URL-encoded — check it contains the right fields.
    expect(opts.body).toContain('To=%2B919876543210');
    expect(opts.body).toContain('From=%2B910000000000');
    expect(opts.body).toContain('Body=Hello+from+PreOne');
  });

  it('should return ok=false on 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(400, { message: 'invalid phone number' }),
    );
    const result = await provider.send(
      { to: 'bad', body: 'hi' },
      { from: '+910000000000', apiKey: 'AC', apiSecret: 'tok' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Twilio send failed.*400/);
  });

  it('should return ok=false when apiKey/apiSecret missing', async () => {
    const result = await provider.send(
      { to: '+919876543210', body: 'hi' },
      { from: '+910000000000' },
    );
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return ok=false when from is missing', async () => {
    const result = await provider.send(
      { to: '+919876543210', body: 'hi' },
      { from: '', apiKey: 'AC', apiSecret: 'tok' },
    );
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── OpenAiLlmProvider ─────────────────────────────────────────

describe('OpenAiLlmProvider', () => {
  let provider: OpenAiLlmProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new OpenAiLlmProvider();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call /chat/completions and parse the response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        id: 'chatcmpl-1',
        object: 'chat.completion',
        model: 'gpt-4o-mini',
        choices: [
          { message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      }),
    );
    const result = await provider.complete(
      {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hi' },
        ],
      },
      { apiKey: 'sk-xxx' },
    );
    expect(result.ok).toBe(true);
    expect(result.text).toBe('Hello!');
    expect(result.finishReason).toBe('stop');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(2);
    expect(result.totalTokens).toBe(12);
    expect(result.model).toBe('gpt-4o-mini');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(opts.headers['Authorization']).toBe('Bearer sk-xxx');
    const body = JSON.parse(opts.body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
  });

  it('should use apiBaseUrl override when provided (Azure-compatible)', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        choices: [{ message: { content: 'az' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        model: 'gpt-4',
      }),
    );
    await provider.complete(
      { messages: [{ role: 'user', content: 'hi' }] },
      { apiKey: 'az-key', apiBaseUrl: 'https://my-azure.openai.azure.com/openai/deployments/gpt-4' },
    );
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://my-azure.openai.azure.com/openai/deployments/gpt-4/chat/completions');
  });

  it('should return ok=false on 4xx with error body', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(401, { error: { message: 'Invalid API key' } }),
    );
    const result = await provider.complete(
      { messages: [{ role: 'user', content: 'hi' }] },
      { apiKey: 'bad' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid API key/);
  });

  it('should call /embeddings and parse the response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        object: 'list',
        model: 'text-embedding-3-small',
        data: [
          { object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] },
          { object: 'embedding', index: 1, embedding: [0.4, 0.5, 0.6] },
        ],
        usage: { prompt_tokens: 5, total_tokens: 5 },
      }),
    );
    const result = await provider.embed(
      { input: ['hello', 'world'] },
      { apiKey: 'sk-xxx' },
    );
    expect(result.ok).toBe(true);
    expect(result.embeddings).toHaveLength(2);
    expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    expect(result.model).toBe('text-embedding-3-small');
    expect(result.totalTokens).toBe(5);
  });

  it('should catch network errors and return ok=false', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const result = await provider.complete(
      { messages: [{ role: 'user', content: 'hi' }] },
      { apiKey: 'sk-xxx' },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/network error.*ECONNRESET/);
  });
});
