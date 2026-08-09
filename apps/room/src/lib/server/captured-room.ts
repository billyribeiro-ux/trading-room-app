import fixture from './captured-message-fixture.json';

interface ConnectedUser {
  id: number;
  emailHash: string;
}

function colorFromStyle(style: string | null) {
  return style?.match(/(?:^|;)\s*color:\s*([^;]+)\s*(?:;|$)/i)?.[1] ?? null;
}

function backgroundFromStyle(style: string | null) {
  return style?.match(/(?:^|;)\s*background-color:\s*([^;]+)\s*(?:;|$)/i)?.[1] ?? null;
}

const identityIds = new Map(
  [...new Set(fixture.messages.map((message) => message.senderEmailHash))]
    .sort()
    .map((hash, index) => [hash, -(index + 1)])
);

function capturedSenderId(user: ConnectedUser, senderEmailHash: string) {
  return user.emailHash === senderEmailHash
    ? user.id
    : (identityIds.get(senderEmailHash) ?? -fixture.messages.length);
}

/**
 * The one room the capture belongs to.
 *
 * These 18 items are the forensic capture of the reference room — the samples the reconstruction is
 * matched AGAINST. They are not content, and they are not anybody's data. Rendering them in a room
 * a customer just created is what made a brand-new room open full of somebody else's alerts and
 * chat.
 *
 * `3625` is evidenced, not guessed. `ptr2.json`'s account page carries one room row whose Launch
 * anchor is `/session?id=3625&jwtSite=…` and whose gear links to
 * `#/page/manageSession/6a628a99731b9f77ae9bf505`; `ptr1.json`'s `__meta__.url` is that same
 * `manageSession/6a628a99731b9f77ae9bf505`. One account, one room, one capture.
 *
 * Serving the fixture here and nowhere else keeps every fidelity contract and pixel test doing its
 * job — matching — while every other room starts genuinely empty.
 */
export const CAPTURE_REFERENCE_ROOM = '3625';

/** An empty capture, for every room that is not the reference room. Same shape, no items. */
export function noCapturedRoomItems(): ReturnType<typeof capturedRoomItems> {
  return {
    source: fixture.generatedFrom,
    sourceSha256: fixture.sourceSha256,
    alerts: [],
    messages: []
  };
}

export function capturedRoomItems(user: ConnectedUser) {
  const items = fixture.messages.map((message) => ({
    id: message.panel === 'alert' ? -message.sequence : -(100 + message.sequence),
    room: message.room,
    senderId: capturedSenderId(user, message.senderEmailHash),
    senderName: message.senderName,
    senderEmailHash: message.senderEmailHash,
    senderAvatarUrl: message.senderAvatarUrl,
    body: message.body,
    createdAt: new Date(0),
    isAdmin: message.isAdmin,
    backgroundColor: backgroundFromStyle(message.messageBoxStyle),
    fontColor: colorFromStyle(message.bodyStyle),
    answered: false,
    replyToMessageId: null,
    replyToName: null,
    replyToBody: null,
    reactionsJson: '{}',
    reactions: {},
    targetUrl: message.targetUrl,
    questionCount: message.questionCount,
    questionAnswered: message.questionAnswered,
    evidenceKey: message.evidenceKey,
    evidenceSequence: message.sequence,
    evidenceTimestampText: message.timestampText,
    evidenceSeparatorText: message.separatorText,
    evidenceMessageBoxClass: message.messageBoxClass,
    evidenceMessageBoxStyle: message.messageBoxStyle,
    evidenceDirection: message.direction,
    evidenceQuestion: message.question,
    evidenceBodyStyle: message.bodyStyle,
    evidenceBodySegments: message.bodySegments,
    evidenceMenuItems: message.menuItems,
    evidenceNodeSha256: message.sourceNodeSha256
  }));

  return {
    source: fixture.generatedFrom,
    sourceSha256: fixture.sourceSha256,
    alerts: items.filter((item) => item.id > -100),
    messages: items.filter((item) => item.id <= -100)
  };
}

export function capturedRoomItem(
  user: ConnectedUser,
  kind: 'alert' | 'chat',
  id: number,
  roomShortCode: string
) {
  /*
    Scoped for the same reason the list is. Without this, a negative id posted from any room
    resolved against the fixture and let somebody delete or edit a captured item from a room that
    is not rendering the capture at all.
  */
  if (roomShortCode !== CAPTURE_REFERENCE_ROOM) return undefined;
  const room = capturedRoomItems(user);
  return (kind === 'alert' ? room.alerts : room.messages).find((item) => item.id === id);
}
