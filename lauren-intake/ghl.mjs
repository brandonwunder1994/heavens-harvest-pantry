// Talking to Lauren.
//
// One conversation, one contact, one Arizona number. Everything here reads the
// credentials out of the Phuglee project's own environment rather than keeping
// a second copy of a key anywhere.
//
// Phuglee's CRM is the same CRM, but Phuglee's DATA is not this project's data.
// There is already an unrelated "Lauren Palmer" in there from a property list in
// Ohio. That is why nothing below ever looks anybody up by name — only by the
// contact id recorded here, which was created for this and tagged for this.

import { readFileSync } from 'node:fs';

export const LAUREN = {
  contactId: 'x9sY19Jyh45w1mZkw0Ja',
  conversationId: '9wIrPhpYq2rHMUWD2Cpz',
  phone: '+14806736881',
  name: 'Lauren',
};

/** The Arizona line. The location's own listed phone is not a sending number. */
export const FROM = '+16028387612';

function creds() {
  const env = readFileSync('C:/Users/brand/Projects/phuglee/.env', 'utf8');
  const get = (key) => {
    const line = env.split('\n').find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : '';
  };
  return {
    key: get('GHL_API_KEY'),
    base: get('GHL_API_BASE') || 'https://services.leadconnectorhq.com',
    version: get('GHL_API_VERSION') || '2021-07-28',
    location: get('GHL_LOCATION_ID'),
  };
}

async function call(path, options = {}) {
  const c = creds();
  const res = await fetch(`${c.base}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${c.key}`,
      version: c.version,
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 200)}`);
  return body;
}

/** Every message on her thread, oldest first. */
export async function thread() {
  const data = await call(`/conversations/${LAUREN.conversationId}/messages`);
  const list = data.messages?.messages ?? data.messages ?? [];
  return [...list]
    .map((m) => ({
      id: m.id,
      at: m.dateAdded,
      from: m.direction === 'inbound' ? 'lauren' : 'us',
      status: m.status,
      body: m.body ?? '',
      attachments: m.attachments ?? [],
    }))
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

/** Anything she has said since the id given. */
export async function since(lastSeenId) {
  const all = await thread();
  if (!lastSeenId) return all.filter((m) => m.from === 'lauren');
  const i = all.findIndex((m) => m.id === lastSeenId);
  return (i === -1 ? all : all.slice(i + 1)).filter((m) => m.from === 'lauren');
}

/**
 * Send her a text, and confirm it actually left.
 *
 * The API answers 201 for a message it has merely accepted; the first one sent
 * here came back 201 and then failed at the carrier. So nothing is reported as
 * sent until the message itself says delivered.
 */
export async function say(message) {
  const sent = await call('/conversations/messages', {
    method: 'POST',
    body: JSON.stringify({
      type: 'SMS',
      contactId: LAUREN.contactId,
      toNumber: LAUREN.phone,
      fromNumber: FROM,
      message,
    }),
  });

  // Give the carrier a moment, then ask what really happened.
  for (let tries = 0; tries < 6; tries++) {
    await new Promise((r) => setTimeout(r, 1200));
    const one = await call(`/conversations/messages/${sent.messageId}`);
    const m = one.message ?? {};
    if (m.status === 'delivered') return { ok: true, id: sent.messageId, status: m.status };
    if (m.status === 'failed' || m.status === 'undelivered') {
      return { ok: false, id: sent.messageId, status: m.status, error: m.error };
    }
  }
  return { ok: false, id: sent.messageId, status: 'unconfirmed' };
}
