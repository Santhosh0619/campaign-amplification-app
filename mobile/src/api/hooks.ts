import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './client';
import { FALLBACK_CONFIG } from '@/lib/reach';
import type { AppConfig, CampaignCard, CampaignDetailResponse, NotificationItem, OwnerCampaign, Paged, Report } from '@/types/api';

export const qk = {
  config: ['config'] as const,
  list: (params: ListParams) => ['campaigns', 'list', params] as const,
  featured: ['campaigns', 'featured'] as const,
  categories: ['campaigns', 'categories'] as const,
  detail: (slug: string) => ['campaigns', 'detail', slug] as const,
  mine: ['campaigns', 'mine'] as const,
  notifications: ['notifications'] as const,
};

export function useConfig() {
  const q = useQuery({ queryKey: qk.config, queryFn: () => api<AppConfig>('/config'), staleTime: 60 * 60_000 });
  return q.data ?? FALLBACK_CONFIG;
}

export type ListParams = {
  q?: string;
  categories?: string[];
  sort?: 'recommended' | 'newest' | 'mostFunded' | 'endingSoon';
  minPercent?: number;
  endingSoon?: boolean;
};

function toQuery(params: ListParams, page: number, limit: number) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.categories?.length) sp.set('category', params.categories.join(','));
  if (params.sort) sp.set('sort', params.sort);
  if (params.minPercent) sp.set('minPercent', String(params.minPercent));
  if (params.endingSoon) sp.set('endingSoon', 'true');
  sp.set('page', String(page));
  sp.set('limit', String(limit));
  return sp.toString();
}

export function useCampaignList(params: ListParams, limit = 8) {
  return useInfiniteQuery({
    queryKey: qk.list(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<Paged<CampaignCard>>(`/campaigns?${toQuery(params, pageParam, limit)}`),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useFeatured() {
  return useQuery({ queryKey: qk.featured, queryFn: () => api<{ items: CampaignCard[] }>('/campaigns/featured') });
}

export function useCampaign(slug: string) {
  return useQuery({ queryKey: qk.detail(slug), queryFn: () => api<CampaignDetailResponse>(`/campaigns/${slug}`), enabled: Boolean(slug) });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () => api<{ items: NotificationItem[]; unread: number }>('/notifications'),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useReports(slug: string) {
  return useQuery({ queryKey: ['campaigns', 'reports', slug], queryFn: () => api<{ items: Report[] }>(`/campaigns/${slug}/reports`), enabled: Boolean(slug) });
}

export function useBackers(slug: string) {
  return useQuery({
    queryKey: ['campaigns', 'backers', slug],
    queryFn: () => api<{ named: string[]; privateCount: number; total: number }>(`/contributions/campaign/${slug}/backers`),
    enabled: Boolean(slug),
  });
}

export type CommentItem = { id: string; authorName: string; body: string; createdAt: string; parentId: string | null; mine: boolean; reportedByMe: boolean };

export function useComments(slug: string) {
  return useQuery({ queryKey: ['campaigns', 'comments', slug], queryFn: () => api<{ items: CommentItem[] }>(`/campaigns/${slug}/comments`), enabled: Boolean(slug) });
}

export function useMyCampaigns(enabled: boolean) {
  return useQuery({ queryKey: qk.mine, queryFn: () => api<{ items: OwnerCampaign[] }>('/campaigns/mine'), enabled });
}
