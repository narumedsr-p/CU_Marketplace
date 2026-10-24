// Minimal Engine.IO v4 / Socket.IO v5 text framing for the default namespace.
// Not a general Socket.IO client: binary attachments, namespaces and reconnects
// are intentionally out of scope for this text-message test.
export function decodeFrame(frame) {
  if (typeof frame !== 'string') throw new Error('Only text frames are supported');
  if (frame.startsWith('0')) {
    const handshake = JSON.parse(frame.slice(1));
    if (!handshake.sid) throw new Error('Invalid Engine.IO handshake');
    return { type: 'engine_open' };
  }
  if (frame.startsWith('2')) return { type: 'ping', payload: frame.slice(1) };
  if (frame.startsWith('40')) {
    const details = frame.slice(2) ? JSON.parse(frame.slice(2)) : {};
    return { type: 'connected', sid: details.sid };
  }
  if (frame.startsWith('44')) return { type: 'rejected' };
  if (frame === '1' || frame === '41') return { type: 'disconnected' };
  const event = frame.match(/^42(\[.*)$/s);
  if (event) {
    const data = JSON.parse(event[1]);
    if (!Array.isArray(data) || typeof data[0] !== 'string') throw new Error('Invalid Socket.IO event');
    return { type: 'event', name: data[0], data: data[1] };
  }
  const ack = frame.match(/^43(\d+)(\[.*)$/s);
  if (ack) {
    const data = JSON.parse(ack[2]);
    if (!Array.isArray(data)) throw new Error('Invalid Socket.IO acknowledgement');
    return { type: 'ack', id: Number(ack[1]), data: data[0] };
  }
  if (frame === '3' || frame === '6') return { type: 'ignore' };
  throw new Error('Unsupported Socket.IO/Engine.IO frame');
}

export function encodeMessage(ackId, roomId, content) {
  if (!Number.isInteger(ackId) || ackId < 0) throw new Error('Invalid acknowledgement ID');
  return `42${ackId}${JSON.stringify(['message:send', { roomId, content }])}`;
}

export function matchesRecipient(message, expected, side, roomId) {
  return side === expected.receiver && message?.roomId === roomId &&
    message.senderId === expected.senderId && message.content === expected.content &&
    typeof (message.id || message._id) === 'string';
}

// Keep misses in the denominator. Their elapsed time is a censored observation,
// not a measured successful end-to-end delivery latency.
export function deliveryResult(startedAt, observedAt, delivered) {
  const elapsed = observedAt - startedAt;
  return { elapsed, delivered, withinBudget: delivered && elapsed < 1000 };
}
