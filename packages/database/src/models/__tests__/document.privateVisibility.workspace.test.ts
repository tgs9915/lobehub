// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getTestDB } from '../../core/getTestDB';
import { documents, users, workspaces } from '../../schemas';
import type { LobeChatDatabase } from '../../type';
import { DocumentModel } from '../document';

const serverDB: LobeChatDatabase = await getTestDB();

const userA = 'doc-private-vis-user-a';
const userB = 'doc-private-vis-user-b';
const userPersonal = 'doc-private-vis-user-personal';

let workspaceId = '';

beforeEach(async () => {
  await serverDB.delete(users);
  await serverDB.insert(users).values([{ id: userA }, { id: userB }, { id: userPersonal }]);
  const [ws] = await serverDB
    .insert(workspaces)
    .values({ name: 'doc-private-vis-ws', primaryOwnerId: userA, slug: 'doc-private-vis-ws' })
    .returning();
  workspaceId = ws.id;
});

afterEach(async () => {
  await serverDB.delete(documents);
  await serverDB.delete(workspaces);
  await serverDB.delete(users);
});

const insertDocument = async (params: {
  id: string;
  userId: string;
  visibility: 'private' | 'public';
  workspaceId?: string;
  title?: string;
  parentId?: string;
}) => {
  await serverDB.insert(documents).values({
    fileType: 'text/plain',
    id: params.id,
    parentId: params.parentId ?? null,
    source: 'https://example.com/test.txt',
    sourceType: 'file',
    title: params.title ?? params.id,
    totalCharCount: 0,
    totalLineCount: 0,
    userId: params.userId,
    visibility: params.visibility,
    workspaceId: params.workspaceId ?? null,
  });
};

describe('DocumentModel — private/public cross-user isolation', () => {
  describe('workspace mode', () => {
    it("hides another user's private document from findById", async () => {
      await insertDocument({ id: 'd-private', userId: userA, visibility: 'private', workspaceId });

      const callerB = new DocumentModel(serverDB, userB, workspaceId);
      expect(await callerB.findById('d-private')).toBeUndefined();
    });

    it('exposes public documents to every workspace member', async () => {
      await insertDocument({ id: 'd-public', userId: userA, visibility: 'public', workspaceId });

      const callerB = new DocumentModel(serverDB, userB, workspaceId);
      const fetched = await callerB.findById('d-public');
      expect(fetched?.id).toBe('d-public');
    });

    it('keeps a private document visible to its creator', async () => {
      await insertDocument({
        id: 'd-owner-private',
        userId: userA,
        visibility: 'private',
        workspaceId,
      });

      const callerA = new DocumentModel(serverDB, userA, workspaceId);
      expect((await callerA.findById('d-owner-private'))?.id).toBe('d-owner-private');
    });

    it("does not surface another user's private document in query()", async () => {
      await insertDocument({
        id: 'd-private-list',
        userId: userA,
        visibility: 'private',
        workspaceId,
      });
      await insertDocument({
        id: 'd-public-list',
        userId: userA,
        visibility: 'public',
        workspaceId,
      });

      const callerB = new DocumentModel(serverDB, userB, workspaceId);
      const ids = (await callerB.query()).items.map((row) => row.id);

      expect(ids).toContain('d-public-list');
      expect(ids).not.toContain('d-private-list');
    });
  });

  describe('personal mode', () => {
    it("never returns another user's personal-mode document", async () => {
      await insertDocument({ id: 'personal-a', userId: userA, visibility: 'private' });

      const callerPersonal = new DocumentModel(serverDB, userPersonal);
      expect(await callerPersonal.findById('personal-a')).toBeUndefined();
    });

    it("doesn't leak workspace documents to a personal-mode caller", async () => {
      await insertDocument({
        id: 'ws-public-for-personal',
        userId: userA,
        visibility: 'public',
        workspaceId,
      });

      const callerPersonal = new DocumentModel(serverDB, userA);
      // userA created the row, but in personal mode `workspace_id IS NULL` is
      // required — the workspace row is intentionally invisible.
      expect(await callerPersonal.findById('ws-public-for-personal')).toBeUndefined();
    });
  });
});

describe('DocumentModel.create — workspace visibility defaults', () => {
  it("defaults a top-level workspace document to 'private'", async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const created = await callerA.create({
      fileType: 'text/plain',
      source: 'inline',
      sourceType: 'api',
      title: 'top-level',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    expect(created.visibility).toBe('private');
  });

  it('inherits the parent visibility for a nested document', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const root = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'private-root',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    expect(root.visibility).toBe('private');

    const child = await callerA.create({
      fileType: 'text/plain',
      parentId: root.id,
      source: 'inline',
      sourceType: 'api',
      title: 'inherited-child',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    expect(child.visibility).toBe('private');
  });

  it('honors an explicit visibility override at the top level', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const created = await callerA.create({
      fileType: 'text/plain',
      source: 'inline',
      sourceType: 'api',
      title: 'explicit-public',
      totalCharCount: 0,
      totalLineCount: 0,
      visibility: 'public',
    });
    expect(created.visibility).toBe('public');
  });
});

describe('DocumentModel.publishToWorkspace', () => {
  it('cascades the whole subtree to public in a single transaction', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const root = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'pub-root',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const child = await callerA.create({
      fileType: 'text/plain',
      parentId: root.id,
      source: 'inline',
      sourceType: 'api',
      title: 'pub-child',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const grandchild = await callerA.create({
      fileType: 'text/plain',
      parentId: child.id,
      source: 'inline',
      sourceType: 'api',
      title: 'pub-grandchild',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    expect(root.visibility).toBe('private');
    expect(child.visibility).toBe('private');
    expect(grandchild.visibility).toBe('private');

    const result = await callerA.publishToWorkspace(root.id);
    expect(result.documentIds.sort()).toEqual([root.id, child.id, grandchild.id].sort());

    for (const id of [root.id, child.id, grandchild.id]) {
      const row = await callerA.findById(id);
      expect(row?.visibility).toBe('public');
    }
  });

  it("refuses to flip another user's private subtree", async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const ownerRoot = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'owner-root',
      totalCharCount: 0,
      totalLineCount: 0,
    });

    const callerB = new DocumentModel(serverDB, userB, workspaceId);
    // B can't even find the row through ownership, so publish surfaces a
    // not-found error rather than rewriting A's data.
    await expect(callerB.publishToWorkspace(ownerRoot.id)).rejects.toThrow(/not found/i);

    const row = await callerA.findById(ownerRoot.id);
    expect(row?.visibility).toBe('private');
  });

  it('leaves already-public descendants untouched (idempotent)', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const root = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'mixed-root',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    await callerA.publishToWorkspace(root.id);

    const updatedRoot = await callerA.findById(root.id);
    expect(updatedRoot?.visibility).toBe('public');

    // Second publish is a no-op (visibility=public guard filters everything out).
    const result = await callerA.publishToWorkspace(root.id);
    expect(result.documentIds).toEqual([root.id]);
  });
});

describe('DocumentModel.update — workspace parent-id move guard', () => {
  it('rejects moving a private document under a workspace parent (use publish instead)', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const privateRoot = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'private-root-to-move',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const publicRoot = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'public-root',
      totalCharCount: 0,
      totalLineCount: 0,
      visibility: 'public',
    });

    await expect(callerA.update(privateRoot.id, { parentId: publicRoot.id })).rejects.toThrow(
      /publishToWorkspace/,
    );
  });

  it('rejects moving a workspace document under a private parent (no demote)', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const privateRoot = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'private-root-target',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const publicRoot = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'public-root-to-move',
      totalCharCount: 0,
      totalLineCount: 0,
      visibility: 'public',
    });

    await expect(callerA.update(publicRoot.id, { parentId: privateRoot.id })).rejects.toThrow(
      /demoting/i,
    );
  });

  it('allows moving within the same visibility bucket', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const oldParent = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'old-private-parent',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const newParent = await callerA.create({
      fileType: 'custom/folder',
      source: '',
      sourceType: 'api',
      title: 'new-private-parent',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    const child = await callerA.create({
      fileType: 'text/plain',
      parentId: oldParent.id,
      source: 'inline',
      sourceType: 'api',
      title: 'moving-child',
      totalCharCount: 0,
      totalLineCount: 0,
    });

    await expect(callerA.update(child.id, { parentId: newParent.id })).resolves.toBeDefined();
    const moved = await callerA.findById(child.id);
    expect(moved?.parentId).toBe(newParent.id);
  });

  it('strips visibility from update inputs', async () => {
    const callerA = new DocumentModel(serverDB, userA, workspaceId);
    const doc = await callerA.create({
      fileType: 'text/plain',
      source: 'inline',
      sourceType: 'api',
      title: 'visibility-strip',
      totalCharCount: 0,
      totalLineCount: 0,
    });
    expect(doc.visibility).toBe('private');

    // visibility should be silently dropped — publish is the only legal path
    await callerA.update(doc.id, { visibility: 'public' } as never);
    const reread = await callerA.findById(doc.id);
    expect(reread?.visibility).toBe('private');
  });
});
