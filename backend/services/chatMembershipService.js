import User from "../models/User.js";
import ConversationMember from "../models/ConversationMember.js";
import { getIdString, getTaskParticipantIds } from "./chatAccessService.js";

export async function syncConversationMembers(
  conversation,
  task,
  session = null,
  extraUserId = null,
) {
  let ids =
    conversation.type === "direct"
      ? conversation.directParticipants.map(getIdString)
      : getTaskParticipantIds(task);
  const existing = await User.find({ _id: { $in: ids } })
    .select("_id")
    .session(session);
  ids = existing.map(getIdString);
  // Retain admins who explicitly opened the room, while their role permits it.
  if (conversation.type === "task") {
    const previous = await ConversationMember.find({
      conversationId: conversation._id,
      revokedAt: null,
    }).session(session);
    const admins = await User.find({
      _id: { $in: previous.map((m) => m.userId) },
      role: "admin",
    })
      .select("_id")
      .session(session);
    ids.push(...admins.map(getIdString));
  }
  if (extraUserId) ids.push(getIdString(extraUserId));
  ids = [...new Set(ids)];
  for (const userId of ids) {
    await ConversationMember.updateOne(
      { conversationId: conversation._id, userId },
      {
        $set: { revokedAt: null },
        $setOnInsert: { joinedAt: new Date(), lastReadSequence: 0 },
      },
      { upsert: true, session },
    );
  }
  await ConversationMember.updateMany(
    {
      conversationId: conversation._id,
      userId: { $nin: ids },
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
    { session },
  );
}
