import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { compact, money, number, shortDate } from '@/lib/format';
import { space, useTheme } from '@/theme';
import type { Report } from '@/types/api';

/** One update or delivery report. Estimated and measured figures are always labelled differently. */
export function ReportCard({ report }: { report: Report }) {
  const { colors } = useTheme();
  const m = report.metrics;
  return (
    <View style={[styles.wrap, { borderColor: colors.rule }]}>
      <View style={styles.head}>
        <Text variant="kicker" tone={report.kind === 'final' ? 'positive' : 'muted'}>
          {report.kind === 'final' ? 'Final report' : report.kind === 'progress' ? 'Delivery update' : report.kind === 'milestone' ? 'Milestone' : 'Update'}
        </Text>
        <Text variant="caption" tone="muted">
          {shortDate(report.createdAt)}
        </Text>
      </View>
      <Text variant="heading">{report.title}</Text>
      <Text variant="bodySm" tone="muted">
        {report.body}
      </Text>
      {m ? (
        <View style={{ gap: space.md }}>
          <View style={[styles.tag, { backgroundColor: m.reachKind === 'measured' ? colors.positiveSoft : colors.warnSoft }]}>
            <Text variant="kicker" tone={m.reachKind === 'measured' ? 'positive' : 'warn'}>
              {m.reachKind === 'measured' ? 'Measured by the ad platforms' : 'Estimated · will change'}
            </Text>
          </View>
          <View style={styles.grid}>
            <Metric label="Funds raised" value={money(m.fundsRaised)} />
            <Metric label="Ad spend" value={money(m.adSpend)} />
            <Metric label={m.reachKind === 'measured' ? 'People reached' : 'Estimated reach'} value={compact(m.reach)} />
            <Metric label="Impressions" value={compact(m.impressions)} />
            <Metric label="Link clicks" value={number(m.clicks)} />
            {m.perceptionShiftPct != null ? <Metric label="Changed their mind" value={`${m.perceptionShiftPct}%`} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="number">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingTop: space.lg, paddingBottom: space.lg, gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  metric: { width: '50%', gap: 2 },
});
