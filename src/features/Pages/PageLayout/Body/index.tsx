'use client';

import { Accordion, AccordionItem, ContextMenuTrigger, Flexbox, Icon, Text } from '@lobehub/ui';
import { LockIcon, UsersIcon } from 'lucide-react';
import React, { memo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import SkeletonList from '@/features/NavPanel/components/SkeletonList';
import PageEmpty from '@/features/PageEmpty';
import { pageSelectors, usePageStore } from '@/store/page';

import Actions from './Actions';
import AllPagesDrawer from './AllPagesDrawer';
import List from './List';
import { useDropdownMenu } from './useDropdownMenu';

export enum GroupKey {
  AllPages = 'all-pages',
  PrivatePages = 'private-pages',
  WorkspacePages = 'workspace-pages',
}

/**
 * Page list sidebar.
 *
 * Workspace mode splits documents into two virtual roots — "Private" (only the
 * creator sees them) and "Workspace" (shared with every member) — mirroring
 * the Home sidebar's Private / Agent accordions. Personal mode collapses to
 * the historical single accordion since `visibility` is meaningless there.
 */
const Body = memo(() => {
  const { t } = useTranslation('file');

  // Initialize documents list via SWR
  const useFetchDocuments = usePageStore((s) => s.useFetchDocuments);
  useFetchDocuments();

  const isLoading = usePageStore(pageSelectors.isDocumentsLoading);

  const filteredDocumentsCount = usePageStore(pageSelectors.filteredDocumentsCount);
  const privateCount = usePageStore(pageSelectors.privateFilteredDocumentsCount);
  const workspaceCount = usePageStore(pageSelectors.workspaceFilteredDocumentsCount);
  const searchKeywords = usePageStore((s) => s.searchKeywords);
  const dropdownMenu = useDropdownMenu();
  const [allPagesDrawerOpen, closeAllPagesDrawer] = usePageStore((s) => [
    s.allPagesDrawerOpen,
    s.closeAllPagesDrawer,
  ]);

  const activeWorkspaceId = useActiveWorkspaceId();
  const searchActive = Boolean(searchKeywords.trim());

  return (
    <Flexbox gap={1} paddingInline={4}>
      {activeWorkspaceId ? (
        <Accordion defaultExpandedKeys={[GroupKey.PrivatePages, GroupKey.WorkspacePages]} gap={2}>
          <AccordionItem
            action={<Actions />}
            itemKey={GroupKey.PrivatePages}
            paddingBlock={4}
            paddingInline={'8px 4px'}
            headerWrapper={(header) => (
              <ContextMenuTrigger items={dropdownMenu}>{header}</ContextMenuTrigger>
            )}
            title={
              <Flexbox horizontal align="center" gap={4}>
                <Icon icon={LockIcon} size={12} />
                <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                  {t('pageList.privateTitle')}
                  {privateCount > 0 && ` ${privateCount}`}
                </Text>
              </Flexbox>
            }
          >
            <Suspense fallback={<SkeletonList />}>
              {isLoading ? (
                <SkeletonList />
              ) : (
                <Flexbox gap={1} paddingBlock={1}>
                  {privateCount === 0 ? (
                    <PageEmpty
                      description={searchActive ? undefined : t('pageList.privateEmpty')}
                      search={searchActive}
                    />
                  ) : (
                    <List visibility="private" />
                  )}
                </Flexbox>
              )}
            </Suspense>
          </AccordionItem>
          <AccordionItem
            itemKey={GroupKey.WorkspacePages}
            paddingBlock={4}
            paddingInline={'8px 4px'}
            headerWrapper={(header) => (
              <ContextMenuTrigger items={dropdownMenu}>{header}</ContextMenuTrigger>
            )}
            title={
              <Flexbox horizontal align="center" gap={4}>
                <Icon icon={UsersIcon} size={12} />
                <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                  {t('pageList.workspaceTitle')}
                  {workspaceCount > 0 && ` ${workspaceCount}`}
                </Text>
              </Flexbox>
            }
          >
            <Suspense fallback={<SkeletonList />}>
              {isLoading ? (
                <SkeletonList />
              ) : (
                <Flexbox gap={1} paddingBlock={1}>
                  {workspaceCount === 0 ? (
                    <PageEmpty
                      description={searchActive ? undefined : t('pageList.workspaceEmpty')}
                      search={searchActive}
                    />
                  ) : (
                    <List visibility="workspace" />
                  )}
                </Flexbox>
              )}
            </Suspense>
          </AccordionItem>
        </Accordion>
      ) : (
        <Accordion defaultExpandedKeys={[GroupKey.AllPages]} gap={2}>
          <AccordionItem
            action={<Actions />}
            itemKey={GroupKey.AllPages}
            paddingBlock={4}
            paddingInline={'8px 4px'}
            headerWrapper={(header) => (
              <ContextMenuTrigger items={dropdownMenu}>{header}</ContextMenuTrigger>
            )}
            title={
              <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                {t('pageList.title')}
                {filteredDocumentsCount > 0 && ` ${filteredDocumentsCount}`}
              </Text>
            }
          >
            <Suspense fallback={<SkeletonList />}>
              {isLoading ? (
                <SkeletonList />
              ) : (
                <Flexbox gap={1} paddingBlock={1}>
                  {filteredDocumentsCount === 0 ? <PageEmpty search={searchActive} /> : <List />}
                </Flexbox>
              )}
            </Suspense>
          </AccordionItem>
        </Accordion>
      )}
      <AllPagesDrawer open={allPagesDrawerOpen} onClose={closeAllPagesDrawer} />
    </Flexbox>
  );
});

export default Body;
