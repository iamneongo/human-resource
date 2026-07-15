'use client';

import { useMemo } from 'react';

import { authClient } from '@/lib/auth-client';
import type { NavGroup, NavItem } from '@/types';

export function useFilteredNavItems(items: NavItem[]) {
  const { data: currentSession } = authClient.useSession();
  const user = currentSession?.user;

  const accessContext = useMemo(
    () => ({
      user: user ?? undefined,
      permissions: [] as string[],
      role: user?.role ?? undefined,
      hasOrg: !!user
    }),
    [user]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (!item.access) return true;
        if (item.access.requireOrg && !accessContext.hasOrg) return false;

        if (item.access.permission) {
          if (!accessContext.hasOrg) return false;
          if (!accessContext.permissions.includes(item.access.permission)) return false;
        }

        if (item.access.role) {
          if (!accessContext.role) return false;
          if (accessContext.role !== item.access.role && accessContext.role !== 'admin') {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        if (!item.items?.length) return item;

        return {
          ...item,
          items: item.items.filter((childItem) => {
            if (!childItem.access) return true;
            if (childItem.access.requireOrg && !accessContext.hasOrg) return false;

            if (childItem.access.permission) {
              if (!accessContext.hasOrg) return false;
              if (!accessContext.permissions.includes(childItem.access.permission)) return false;
            }

            if (childItem.access.role) {
              if (!accessContext.role) return false;
              if (accessContext.role !== childItem.access.role && accessContext.role !== 'admin') {
                return false;
              }
            }

            return true;
          })
        };
      });
  }, [accessContext, items]);

  return filteredItems;
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some(
            (groupItem) => groupItem.title === item.title && filteredSet.has(groupItem.title)
          )
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems, groups]);
}
