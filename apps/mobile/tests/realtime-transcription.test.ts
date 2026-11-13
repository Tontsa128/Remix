import assert from "node:assert/strict";
import test from "node:test";
import { RealtimeTranscriptionSocket, parseRealtimeTranscriptionEvent } from "../src/services/realtime-transcription";

test("parses partial and final transcription events without retaining unrelated event data", () => {
  assert.deepEqual(parseRealtimeTranscriptionEvent(JSON.stringify({
    type: "conversation.item.input_audio_transcription.delta",
    item_id: "item-1",
    delta: "Buenos",
  })), { stage: "partial", itemId: "item-1", transcript: "Buenos" });

  assert.deepEqual(parseRealtimeTranscriptionEvent(JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "item-2",
    transcript: "Buenos días",
    languages: [{ code: "es" }],
  })), { stage: "final", itemId: "item-2", transcript: "Buenos días", detectedLanguage: "es" });
});

test("ignores malformed, unsupported and empty transcription events", () => {
  assert.equal(parseRealtimeTranscriptionEvent("not-json"), null);
  assert.equal(parseRealtimeTranscriptionEvent(JSON.stringify({ type: "session.created" })), null);
  assert.equal(parseRealtimeTranscriptionEvent(JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    transcript: " ",
  })), null);
});

test("waits for a ready session before allowing audio and sends PCM16 append/commit events", async () => {
  const sent: string[] = [];
  let socket: {
    readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  } | undefined;

  const client = new RealtimeTranscriptionSocket(
    "wss://api.openai.com/v1/realtime?intent=transcription",
    "ephemeral-secret-value",
    {},
    (_url, protocols) => {
      assert.equal(protocols[0], "realtime");
      assert.equal(protocols[1], "openai-insecure-api-key.ephemeral-secret-value");
      socket = {
        readyState: 1,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send(data) { sent.push(data); },
        close() { this.readyState = 3; },
      };
      return socket;
    },
  );

  const connected = client.connect();
  assert.throws(() => client.appendAudio(new ArrayBuffer(2)), /not ready/);
  socket?.onmessage?.({ data: JSON.stringify({ type: "session.created" }) });
  await connected;

  client.appendAudio(new Uint8Array([1, 0]).buffer);
  client.commitAudio();
  assert.deepEqual(sent.map((item) => JSON.parse(item)), [
    { type: "input_audio_buffer.append", audio: "AQA=" },
    { type: "input_audio_buffer.commit" },
  ]);
  client.close();
});

test("flushes a pending final transcript before closing the realtime socket", async () => {
  let socket: {
    readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  } | undefined;
  const received: string[] = [];
  const client = new RealtimeTranscriptionSocket(
    "wss://api.openai.com/v1/realtime?intent=transcription",
    "ephemeral",
    { onTranscript: (event) => received.push(event.transcript) },
    () => {
      socket = {
        readyState: 1, onopen: null, onmessage: null, onerror: null, onclose: null,
        send() {},
        close() { this.readyState = 3; this.onclose?.(); },
      };
      return socket;
    },
  );
  const connected = client.connect();
  socket?.onmessage?.({ data: JSON.stringify({ type: "session.created" }) });
  await connected;
  const closing = client.flushAndClose(500, true);
  socket?.onmessage?.({ data: JSON.stringify({
    type: "input_audio_buffer.committed",
    item_id: "pending-1",
  }) });
  socket?.onmessage?.({ data: JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "pending-1",
    transcript: "Final words",
    languages: [{ code: "en" }],
  }) });
  await closing;
  assert.deepEqual(received, ["Final words"]);
});

test("rejects non-secure websocket URLs and empty credentials", async () => {
  const insecure = new RealtimeTranscriptionSocket("ws://example.test", "secret", {});
  await assert.rejects(insecure.connect(), /Invalid realtime/);
  const missing = new RealtimeTranscriptionSocket("wss://example.test", "", {});
  await assert.rejects(missing.connect(), /Invalid realtime/);
});

test("registers the final-transcript waiter before sending the commit event", async () => {
  let socket: {
    readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  } | undefined;
  const received: string[] = [];
  const client = new RealtimeTranscriptionSocket(
    "wss://api.openai.com/v1/realtime?intent=transcription",
    "ephemeral",
    { onTranscript: (event) => received.push(event.transcript) },
    () => {
      socket = {
        readyState: 1, onopen: null, onmessage: null, onerror: null, onclose: null,
        send(data) {
          const event = JSON.parse(data) as { type: string };
          if (event.type === "input_audio_buffer.commit") {
            // Simulate the provider delivering the final event synchronously
            // while the commit send call is still on the stack.
            socket?.onmessage?.({ data: JSON.stringify({
              type: "input_audio_buffer.committed",
              item_id: "immediate-1",
            }) });
            socket?.onmessage?.({ data: JSON.stringify({
              type: "conversation.item.input_audio_transcription.completed",
              item_id: "immediate-1",
              transcript: "Immediate final words",
              languages: [{ code: "en" }],
            }) });
          }
        },
        close() { this.readyState = 3; this.onclose?.(); },
      };
      return socket;
    },
  );
  const connected = client.connect();
  socket?.onmessage?.({ data: JSON.stringify({ type: "session.created" }) });
  await connected;
  await client.flushAndClose(500, true);
  assert.deepEqual(received, ["Immediate final words"]);
  assert.equal(socket?.readyState, 3);
});

test("waits for an already committed silence-detected turn when stopping without new audio", async () => {
  let socket: {
    readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  } | undefined;
  const client = new RealtimeTranscriptionSocket(
    "wss://api.openai.com/v1/realtime?intent=transcription",
    "ephemeral",
    {},
    () => {
      socket = {
        readyState: 1, onopen: null, onmessage: null, onerror: null, onclose: null,
        send() {},
        close() { this.readyState = 3; this.onclose?.(); },
      };
      return socket;
    },
  );
  const connected = client.connect();
  socket?.onmessage?.({ data: JSON.stringify({ type: "session.created" }) });
  await connected;
  client.commitAudio();
  socket?.onmessage?.({ data: JSON.stringify({
    type: "input_audio_buffer.committed",
    item_id: "silence-turn-1",
  }) });

  let settled = false;
  const closing = client.flushAndClose(500, false).then(() => { settled = true; });
  socket?.onmessage?.({ data: JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "different-turn",
    transcript: "Unrelated",
  }) });
  await Promise.resolve();
  assert.equal(settled, false);
  socket?.onmessage?.({ data: JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "silence-turn-1",
    transcript: "Previously committed words",
  }) });
  await closing;
  assert.equal(settled, true);
});


test("emits completed turns in commit order even when provider finals arrive out of order", async () => {
  let socket: {
    readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(): void;
  } | undefined;
  const received: string[] = [];
  const client = new RealtimeTranscriptionSocket(
    "wss://api.openai.com/v1/realtime?intent=transcription",
    "ephemeral",
    { onTranscript: (event) => received.push(event.transcript) },
    () => {
      socket = {
        readyState: 1, onopen: null, onmessage: null, onerror: null, onclose: null,
        send() {},
        close() { this.readyState = 3; this.onclose?.(); },
      };
      return socket;
    },
  );
  const connected = client.connect();
  socket?.onmessage?.({ data: JSON.stringify({ type: "session.created" }) });
  await connected;

  client.commitAudio();
  client.commitAudio();
  socket?.onmessage?.({ data: JSON.stringify({ type: "input_audio_buffer.committed", item_id: "turn-1" }) });
  socket?.onmessage?.({ data: JSON.stringify({ type: "input_audio_buffer.committed", item_id: "turn-2" }) });
  socket?.onmessage?.({ data: JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "turn-2",
    transcript: "Second turn",
  }) });
  assert.deepEqual(received, []);
  socket?.onmessage?.({ data: JSON.stringify({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "turn-1",
    transcript: "First turn",
  }) });
  assert.deepEqual(received, ["First turn", "Second turn"]);
  client.close();
});
