'use client';

import { Accordion, AccordionItem, ContextMenuTrigger, Flexbox, Text } from '@lobehub/ui';
import React, { memo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import NeuralNetworkLoading from '@/components/NeuralNetworkLoading';
import SkeletonList from '@/features/NavPanel/components/SkeletonList';
import PageEmpty from '@/features/PageEmpty';
import { pageSelectors, usePageStore } from '@/store/page';

import AddButton from '../Header/AddButton';
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

  // Initialize documents list via SWR; keep `isValidating` so the accordion
  // header can show a subtle in-flight indicator (mirrors the Private Agent
  // pattern in `home/_layout/Body/Private`).
  const useFetchDocuments = usePageStore((s) => s.useFetchDocuments);
  const { isValidating } = useFetchDocuments();

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
            itemKey={GroupKey.PrivatePages}
            paddingBlock={4}
            paddingInline={'8px 4px'}
            action={
              <Flexbox horizontal align="center" gap={2}>
                <Actions />
                <AddButton visibility="private" />
              </Flexbox>
            }
            headerWrapper={(header) => (
              <ContextMenuTrigger items={dropdownMenu}>{header}</ContextMenuTrigger>
            )}
            title={
              <Flexbox horizontal align="center" gap={4}>
                <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                  {t('pageList.privateTitle')}
                  {privateCount > 0 && ` ${privateCount}`}
                </Text>
                {isValidating && <NeuralNetworkLoading size={14} />}
              </Flexbox>
            }
          >
            <Suspense fallback={<SkeletonList />}>
              {isLoading ? (
                <SkeletonList />
              ) : (
                <Flexbox gap={1} paddingBlock={1}>
                  {privateCount === 0 ? (
                    <Text
                      align="center"
                      fontSize={12}
                      style={{ paddingBlock: 12, paddingInline: 8 }}
                      type={'secondary'}
                    >
                      {searchActive ? t('pageList.noResults') : t('pageList.privateEmpty')}
                    </Text>
                  ) : (
                    <List visibility="private" />
                  )}
                </Flexbox>
              )}
            </Suspense>
          </AccordionItem>
          <AccordionItem
            action={<AddButton visibility="public" />}
            itemKey={GroupKey.WorkspacePages}
            paddingBlock={4}
            paddingInline={'8px 4px'}
            headerWrapper={(header) => (
              <ContextMenuTrigger items={dropdownMenu}>{header}</ContextMenuTrigger>
            )}
            title={
              <Flexbox horizontal align="center" gap={4}>
                <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                  {t('pageList.workspaceTitle')}
                  {workspaceCount > 0 && ` ${workspaceCount}`}
                </Text>
                {isValidating && <NeuralNetworkLoading size={14} />}
              </Flexbox>
            }
          >
            <Suspense fallback={<SkeletonList />}>
              {isLoading ? (
                <SkeletonList />
              ) : (
                <Flexbox gap={1} paddingBlock={1}>
                  {workspaceCount === 0 ? (
                    <Text
                      align="center"
                      fontSize={12}
                      style={{ paddingBlock: 12, paddingInline: 8 }}
                      type={'secondary'}
                    >
                      {searchActive ? t('pageList.noResults') : t('pageList.workspaceEmpty')}
                    </Text>
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
              <Flexbox horizontal align="center" gap={4}>
                <Text ellipsis fontSize={12} type={'secondary'} weight={500}>
                  {t('pageList.title')}
                  {filteredDocumentsCount > 0 && ` ${filteredDocumentsCount}`}
                </Text>
                {isValidating && <NeuralNetworkLoading size={14} />}
              </Flexbox>
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
