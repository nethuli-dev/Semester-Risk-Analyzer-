// Anything that changes grades, attendance or courses changes the risk
// numbers shown on Home, Dashboard and Reports. Those pages share a short
// cache, so every data-changing action must refresh it or a student would
// see stale scores right after logging something.
export function invalidateRiskData(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['risk'] });
  queryClient.invalidateQueries({ queryKey: ['riskHistory'] });
}
