import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { agents } from '../schemas/agent';
import { buildWorkspacePayload, buildWorkspaceWhere } from './workspace';

describe('workspace utils', () => {
  describe('buildWorkspaceWhere', () => {
    it('scopes personal reads by user and null workspace (visibility ignored)', () => {
      // Personal mode rows are implicitly owner-private, so the visibility
      // column is intentionally not part of the predicate.
      const condition = buildWorkspaceWhere({ userId: 'user-1' }, agents);
      const built = new PgDialect().sqlToQuery(condition);

      expect(built.sql).toBe('("agents"."user_id" = $1 and "agents"."workspace_id" is null)');
      expect(built.params).toStrictEqual(['user-1']);
    });

    it('scopes workspace reads with visibility filter when the column is present', () => {
      const condition = buildWorkspaceWhere({ userId: 'user-1', workspaceId: 'ws-1' }, agents);
      const built = new PgDialect().sqlToQuery(condition);

      // Workspace mode: every member sees public rows; private rows are
      // restricted to their creator. NULL is treated as public for backwards
      // compatibility with rows that pre-date the `visibility` column.
      expect(built.sql).toBe(
        '("agents"."workspace_id" = $1 and ("agents"."visibility" is null or "agents"."visibility" = $2 or ("agents"."visibility" = $3 and "agents"."user_id" = $4)))',
      );
      expect(built.params).toStrictEqual(['ws-1', 'public', 'private', 'user-1']);
    });

    it('omits visibility filter when the cols object has no visibility column', () => {
      const condition = buildWorkspaceWhere(
        { userId: 'user-1', workspaceId: 'ws-1' },
        { userId: agents.userId, workspaceId: agents.workspaceId },
      );
      const built = new PgDialect().sqlToQuery(condition);

      expect(built.sql).toBe('"agents"."workspace_id" = $1');
      expect(built.params).toStrictEqual(['ws-1']);
    });
  });

  describe('buildWorkspacePayload', () => {
    it('writes personal payloads with a null workspace id', () => {
      expect(buildWorkspacePayload({ userId: 'user-1' }, { title: 'Personal agent' })).toEqual({
        title: 'Personal agent',
        userId: 'user-1',
        workspaceId: null,
      });
    });

    it('writes workspace payloads with creator and workspace id', () => {
      expect(
        buildWorkspacePayload({ userId: 'user-1', workspaceId: 'ws-1' }, { title: 'Team agent' }),
      ).toEqual({
        title: 'Team agent',
        userId: 'user-1',
        workspaceId: 'ws-1',
      });
    });
  });
});
