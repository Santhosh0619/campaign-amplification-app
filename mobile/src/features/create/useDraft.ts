import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { getJson, setJson } from '@/lib/storage';
import type { CampaignDetailResponse, OwnerCampaign } from '@/types/api';
import { formFromDraft, type DraftForm } from './form';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const cacheKey = (id: string) => `draft:${id}`;

/**
 * Loads a draft and keeps it saved. Edits are written to the server after a short pause,
 * and mirrored to local storage so nothing typed is lost if the network drops.
 */
export function useDraft(id: string) {
  const [form, setForm] = useState<DraftForm | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const latest = useRef<DraftForm | null>(null);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<CampaignDetailResponse>(`/campaigns/${id}`);
        const owner = res.campaign as OwnerCampaign;
        if (!owner.draft) throw new ApiError(403, 'forbidden', 'Only the creator can edit this campaign.');
        const serverForm = formFromDraft(owner.draft);
        // Prefer a newer local copy if a previous save never reached the server.
        const cached = await getJson<{ form: DraftForm; at: number }>(cacheKey(id));
        const serverTime = new Date(owner.draft.updatedAt).getTime();
        const useCached = cached && cached.at > serverTime && ['draft', 'changes_requested'].includes(owner.draft.status);
        if (cancelled) return;
        latest.current = useCached ? cached.form : serverForm;
        setForm(latest.current);
        setStatus(owner.draft.status);
        if (useCached) {
          dirty.current = true;
          setState('dirty');
          schedule();
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load this draft.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) return false;
    if (!dirty.current || !latest.current) return true;
    inFlight.current = true;
    dirty.current = false;
    if (alive.current) setState('saving');
    const snapshot = latest.current;
    let failed = false;
    try {
      await api(`/campaigns/${id}`, { method: 'PATCH', body: toBody(snapshot) });
      if (alive.current) {
        setSavedAt(new Date());
        setSaveError(null);
        setState(dirty.current ? 'dirty' : 'saved');
      }
      return true;
    } catch (e) {
      failed = true;
      dirty.current = true;
      if (alive.current) {
        setSaveError(e instanceof Error ? e.message : 'Could not save.');
        setState('error');
      }
      return false;
    } finally {
      inFlight.current = false;
      if (dirty.current && !failed && alive.current) schedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1200);
  }

  const update = useCallback(
    (patch: Partial<DraftForm> | ((f: DraftForm) => Partial<DraftForm>)) => {
      setForm((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
        latest.current = next;
        dirty.current = true;
        void setJson(cacheKey(id), { form: next, at: Date.now() });
        setState('dirty');
        schedule();
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  /** Save now, waiting for any save already in flight. Returns whether the server has the latest. */
  const saveNow = useCallback(async () => {
    for (let i = 0; i < 20 && inFlight.current; i += 1) await new Promise((r) => setTimeout(r, 150));
    return flush();
  }, [flush]);

  return { form, status, loadError, state, savedAt, saveError, update, saveNow };
}

function toBody(f: DraftForm) {
  return { ...f, goalAmount: f.goalAmount ?? 0 };
}
