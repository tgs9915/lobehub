'use client';

import { ActionIcon, type DropdownItem, DropdownMenu, Icon, type MenuInfo } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { Globe, LockIcon, UsersIcon } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { DESKTOP_HEADER_ICON_SMALL_SIZE } from '@/const/layoutTokens';
import { useResourceManagerStore } from '@/routes/(main)/resource/features/store';
import type { ResourceListVisibilityFilter as Filter } from '@/routes/(main)/resource/features/store/initialState';

const FILTER_OPTIONS: Array<{ icon: typeof Globe; key: Filter; labelKey: string }> = [
  {
    icon: LockIcon,
    key: 'private',
    labelKey: 'resources.visibility.private',
  },
  {
    icon: UsersIcon,
    key: 'workspace',
    labelKey: 'resources.visibility.workspace',
  },
  {
    icon: Globe,
    key: 'all',
    labelKey: 'resources.visibility.all',
  },
];

/**
 * Resource explorer top-level visibility chip — narrows the already
 * ownership-filtered list to private / workspace-shared / all. Personal-mode
 * users don't see the chip; without other workspace members, private vs.
 * public is meaningless. The filter is also hidden when the user has drilled
 * into a specific library or folder — inside a container the items already
 * inherit the container's scope, so filtering by visibility there just
 * confuses the mental model.
 */
const VisibilityFilter = memo(() => {
  const { t } = useTranslation('chat');
  const activeWorkspaceId = useActiveWorkspaceId();
  const [visibility, setListVisibility, libraryId] = useResourceManagerStore((s) => [
    s.listVisibility,
    s.setListVisibility,
    s.libraryId,
  ]);
  const [open, setOpen] = useState(false);

  const currentOption = FILTER_OPTIONS.find((opt) => opt.key === visibility) ?? FILTER_OPTIONS[2];
  const CurrentIcon = currentOption.icon;

  const menuItems = useMemo<DropdownItem[]>(
    () =>
      FILTER_OPTIONS.map((option) => {
        const OptionIcon = option.icon;
        return {
          icon: <Icon color={cssVar.colorTextSecondary} icon={OptionIcon} size={16} />,
          key: option.key,
          label: t(option.labelKey as never),
          onClick: ({ domEvent }: MenuInfo) => {
            domEvent.stopPropagation();
            setListVisibility(option.key);
          },
        };
      }),
    [setListVisibility, t],
  );

  if (!activeWorkspaceId) return null;
  if (libraryId) return null;

  const currentLabel = t(currentOption.labelKey as never);

  return (
    <DropdownMenu items={menuItems} open={open} onOpenChange={setOpen}>
      <ActionIcon
        icon={CurrentIcon}
        size={DESKTOP_HEADER_ICON_SMALL_SIZE}
        title={`${t('resources.visibility.label', { defaultValue: 'Visibility' })}: ${currentLabel}`}
      />
    </DropdownMenu>
  );
});

VisibilityFilter.displayName = 'ResourceVisibilityFilter';

export default VisibilityFilter;
