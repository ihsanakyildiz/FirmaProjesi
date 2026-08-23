import { prisma } from "@/lib/prisma";

export async function findThreadRootId(messageId: string): Promise<string> {
  let currentId = messageId;

  for (let depth = 0; depth < 32; depth += 1) {
    const row = await prisma.mailMessage.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true },
    });
    if (!row?.parentId) return row?.id ?? messageId;
    currentId = row.parentId;
  }

  return currentId;
}

export async function collectThreadMessageIds(rootId: string): Promise<string[]> {
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];

  for (let depth = 0; depth < 32 && frontier.length > 0; depth += 1) {
    const children = await prisma.mailMessage.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        frontier.push(child.id);
      }
    }
  }

  return [...ids];
}

export async function bumpThreadRootActivity(
  messageId: string,
  update: {
    preview: string;
    receivedAt?: Date;
    isRead?: boolean;
  },
) {
  const rootId = await findThreadRootId(messageId);
  await prisma.mailMessage.update({
    where: { id: rootId },
    data: {
      preview: update.preview.slice(0, 500),
      ...(update.receivedAt ? { receivedAt: update.receivedAt } : {}),
      ...(typeof update.isRead === "boolean" ? { isRead: update.isRead } : {}),
    },
  });
}
