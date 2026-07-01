'use client';

import { ActionIcon } from '@lobehub/ui';
import { SquarePenIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermission } from '@/hooks/usePermission';
import { usePageStore } from '@/store/page';

interface AddButtonProps {
  /**
   * Force the new page's visibility. Used by the workspace-mode sidebar so
   * each accordion header creates directly into its own bucket.
   *
   * Omit for the personal-mode / header-level entry — the server picks the
   * default (`private` for top-level `api` docs).
   */
  visibility?: 'private' | 'public';
}

const AddButton = memo<AddButtonProps>(({ visibility }) => {
  const { t } = useTranslation('file');
  const { allowed: canCreate } = usePermission('create_content');

  const createNewPage = usePageStore((s) => s.createNewPage);

  const handleNewDocument = () => {
    if (!canCreate) return;

    const untitledTitle = t('pageList.untitled');
    createNewPage(untitledTitle, visibility);
  };

  return (
    <ActionIcon
      disabled={!canCreate}
      icon={SquarePenIcon}
      title={t('header.newPageButton')}
      size={{
        blockSize: 32,
        size: 18,
      }}
      onClick={handleNewDocument}
    />
  );
});

export default AddButton;
