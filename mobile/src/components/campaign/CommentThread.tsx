import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { useComments, type CommentItem } from '@/api/hooks';
import { Button, Field, Sheet, Skeleton, Text } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { space, useTheme } from '@/theme';

/** Comments with one level of replies, reporting and deleting your own. Reported comments are hidden once several people flag them. */
export function CommentThread({ slug }: { slug: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const q = useComments(slug);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [reportTarget, setReportTarget] = useState<CommentItem | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['campaigns', 'comments', slug] });

  const post = useMutation({
    mutationFn: () => api(`/campaigns/${slug}/comments`, { method: 'POST', body: { body: text, parentId: replyTo?.id } }),
    onSuccess: () => {
      setText('');
      setError(null);
      setReplyTo(null);
      toast.success('Comment posted.');
      void refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const report = useMutation({
    mutationFn: (id: string) => api(`/campaigns/${slug}/comments/${id}/report`, { method: 'POST' }),
    onSuccess: () => {
      setReportTarget(null);
      toast.success('Thanks. We will review this comment.');
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/campaigns/${slug}/comments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Comment deleted.');
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const { roots, replies } = useMemo(() => {
    const all = q.data?.items ?? [];
    const byParent = new Map<string, CommentItem[]>();
    for (const c of all) if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
    return { roots: all.filter((c) => !c.parentId).reverse(), replies: byParent };
  }, [q.data]);

  const row = (c: CommentItem, nested: boolean) => (
    <View key={c.id} style={[styles.comment, { borderColor: colors.rule, marginLeft: nested ? space.xl : 0 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label">{c.authorName}</Text>
        <Text variant="caption" tone="muted">
          {timeAgo(c.createdAt)}
        </Text>
      </View>
      <Text variant="bodySm">{c.body}</Text>
      <View style={styles.actions}>
        {!nested ? (
          <Pressable
            onPress={() => (user ? setReplyTo(c) : router.push('/auth'))}
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${c.authorName}`}
            hitSlop={8}
          >
            <Text variant="caption" tone="action">
              Reply
            </Text>
          </Pressable>
        ) : null}
        {c.mine ? (
          <Pressable onPress={() => remove.mutate(c.id)} accessibilityRole="button" accessibilityLabel="Delete your comment" hitSlop={8}>
            <Text variant="caption" tone="muted">
              Delete
            </Text>
          </Pressable>
        ) : c.reportedByMe ? (
          <Text variant="caption" tone="muted">
            Reported
          </Text>
        ) : (
          <Pressable onPress={() => setReportTarget(c)} accessibilityRole="button" accessibilityLabel="Report this comment" hitSlop={8}>
            <Text variant="caption" tone="muted">
              Report
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">Comments</Text>
      {user ? (
        <View style={{ gap: space.md }}>
          {replyTo ? (
            <View style={[styles.replying, { backgroundColor: colors.surfaceAlt }]}>
              <Text variant="caption" style={{ flex: 1 }}>
                Replying to {replyTo.authorName}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} accessibilityRole="button" hitSlop={8}>
                <Text variant="caption" tone="action">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}
          <Field
            label={replyTo ? 'Your reply' : 'Add a comment'}
            value={text}
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            multiline
            minHeight={84}
            maxLength={600}
            showCounter
            error={error}
            placeholder="Share what you think. Be respectful and stick to the facts."
          />
          <Button label={replyTo ? 'Post reply' : 'Post comment'} size="sm" variant="dark" loading={post.isPending} disabled={text.trim().length < 2} onPress={() => post.mutate()} fullWidth={false} />
        </View>
      ) : (
        <Button label="Sign in to comment" variant="secondary" onPress={() => router.push('/auth')} />
      )}

      {q.isLoading ? (
        <Skeleton height={40} />
      ) : roots.length === 0 ? (
        <Text variant="bodySm" tone="muted">
          No comments yet. Be the first to share what you think.
        </Text>
      ) : (
        roots.map((c) => (
          <View key={c.id}>
            {row(c, false)}
            {(replies.get(c.id) ?? []).map((r) => row(r, true))}
          </View>
        ))
      )}

      <Sheet visible={Boolean(reportTarget)} title="Report this comment?" onClose={() => setReportTarget(null)}>
        <Text variant="body">Report it if it is abusive, spam or shares private information. Comments flagged by several people are hidden while we look.</Text>
        <Button label="Report comment" variant="danger" loading={report.isPending} onPress={() => reportTarget && report.mutate(reportTarget.id)} />
        <Button label="Cancel" variant="ghost" onPress={() => setReportTarget(null)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 4, borderTopWidth: 1, paddingTop: space.md, paddingBottom: space.sm },
  actions: { flexDirection: 'row', gap: space.lg, minHeight: 28, alignItems: 'center' },
  replying: { flexDirection: 'row', alignItems: 'center', padding: space.sm, paddingHorizontal: space.md },
});
