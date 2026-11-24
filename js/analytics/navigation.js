// Pure origin-aware navigation for analytics leaves. Home cards should behave
// like drill-downs from Home; the same leaf opened from Progress remains inside
// the Progress hierarchy. The persisted/internal origin value stays `insights`
// while the visible product vocabulary changes.
export function analyticsBackDestination(context, origin = 'insights', parentContext = null, returnParentContext, returnOrigin, bandOrigin = null) {
  if (context === 'hub') return null;
  const bandReturn = bandOrigin ? { bandOrigin } : {};
  // Measures is a leaf of the Body band, not a Progress destination of its own.
  // Its numbers and photos are the ones the Body band summarises, so Back
  // returns to the hub where that band lives.
  if (context === 'measures' && !parentContext) {
    return origin === 'home'
      ? { action: 'switch-tab', target: 'home', label: '← Back to Home' }
      : { action: 'open-analytics', context: 'hub', label: '← Back to Progress', ...bandReturn };
  }
  if (parentContext) {
    const labels = {
      'weekly-volume': 'Volume', 'strength-volume': 'Volume', 'strength-volume-trends': 'Volume', 'gym-performance': 'Volume',
      strength: 'Strength', strength_pr: 'Strength', running: 'Running', recovery: 'Recovery',
      review: 'Review', 'weekly-review': 'Review', consistency: 'Review', 'monthly-report': 'Review',
      bodyweight: 'Progress', 'muscle-load': 'Progress', projections: 'Progress', measures: 'Body',
      activity: 'History', history: 'History',
    };
    return {
      action: 'open-analytics', context: parentContext,
      // Unknown parents still belong to Progress; "Insights" was internal
      // vocabulary that leaked onto every Review leaf.
      label: `← Back to ${labels[parentContext] || 'Progress'}`, preserveWeek: true,
      ...(returnParentContext ? { parentContext: returnParentContext } : {}),
      ...(returnOrigin ? { origin: returnOrigin } : {}),
      ...bandReturn,
    };
  }
  if (origin === 'home') {
    return { action: 'switch-tab', target: 'home', label: '← Back to Home' };
  }
  return { action: 'open-analytics', context: 'hub', label: '← Back to Progress', ...bandReturn };
}
