import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { useProperty } from '../../../contexts/PropertyContext';
import { useAIInsights } from '../../../hooks/useAIInsights';
import { isAIDebug } from '../../../services/ai/AIConfig';
import { buildKey, buildKeyPrefix, invalidate } from '../../../services/ai/AIResponseCache';

function severityClasses(sev: string): string {
  switch (sev) {
    case 'critical': return 'bg-red-600/10 text-red-700 border border-red-300';
    case 'high': return 'bg-orange-600/10 text-orange-700 border border-orange-300';
    case 'medium': return 'bg-amber-600/10 text-amber-700 border border-amber-300';
    default: return 'bg-emerald-600/10 text-emerald-700 border border-emerald-300';
  }
}

export function AIInsights() {
  const { currentProperty, gridCalendarSettings } = useProperty();
  const queryClient = useQueryClient();
  const propertyId = currentProperty?.id;
  const totalRooms = currentProperty?.totalRooms || 0;
  const start = gridCalendarSettings.dateRange.start.toISOString().slice(0, 10);
  const end = gridCalendarSettings.dateRange.end.toISOString().slice(0, 10);
  const bookingSource = gridCalendarSettings.bookingSource;

  const filters = useMemo(() => ({
    propertyId: propertyId || '',
    start,
    end,
    totalRooms,
    bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
  }), [propertyId, start, end, totalRooms, bookingSource]);

  const { data, isLoading, error, refetch, isFetching } = useAIInsights(filters, { enabled: !!propertyId });

  function handleRefresh() {
    try {
      const aiCacheKey = buildKey(['ai','insights', filters]);
      const aiPrefix = buildKeyPrefix(['ai','insights', filters]);
      const rqQueryKey = ['ai','insights', filters.propertyId, filters.start, filters.end, filters.totalRooms ?? 0, filters.bookingSource ?? 'all'] as const;
      if (isAIDebug()) console.log('AIInsights Refresh clicked', { aiCacheKey, aiPrefix, rqQueryKey, filters });
      // Use prefix invalidation to be robust to internal key changes
      invalidate(aiPrefix);
      queryClient.invalidateQueries({ queryKey: rqQueryKey as unknown as any, exact: true });
    } finally {
      refetch({ cancelRefetch: false });
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load AI insights'}</p>
          <Button variant="outline" onClick={handleRefresh} className="mt-3">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Insights</h2>
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0,1,2,3].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : !data || (data.insights?.length || 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No insights yet for the selected period.</CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.insights.map((ins) => (
              <Card key={ins.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className={severityClasses(ins.severity)}>{ins.severity.toUpperCase()}</Badge>
                    {ins.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                  {ins.tags && ins.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ins.tags.map((t) => (
                        <span key={t} className="text-[11px] px-2 py-1 rounded bg-secondary/60 text-secondary-foreground">#{t}</span>
                      ))}
                    </div>
                  )}
                  {ins.actions && ins.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ins.actions.map((a, idx) => (
                        <Button key={idx} size="sm" variant="secondary">{a.label}</Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data.forecasts && data.forecasts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Forecasts</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {data.forecasts.map((f, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">{f.metric}</div>
                      <div className="text-lg font-semibold">{f.unit === 'INR' ? `₹${Math.round(f.value).toLocaleString()}` : `${Number(f.value).toFixed(1)}${f.unit === 'pct' ? '%' : ''}`}</div>
                      {typeof f.changePct === 'number' && (
                        <div className="text-xs text-muted-foreground">Δ {f.changePct.toFixed(1)}%</div>
                      )}
                      {typeof f.confidence === 'number' && (
                        <div className="text-xs text-muted-foreground">Conf: {Math.round(f.confidence)}%</div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] pointer-events-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                {[0,1,2,3].map((i) => (
                  <Skeleton key={i} className="h-36 w-full" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {data?.meta && (
        <div className="text-xs text-muted-foreground">Model: {data.meta.model} • {data.meta.fromCache ? 'Cached' : 'Live'} • {new Date(data.meta.generatedAt).toLocaleString()}</div>
      )}
    </div>
  );
}
