export type VerdictHeightMetrics = {
  bodyScroll: number;
  bodyOffset: number;
  deScroll: number;
  deOffset: number;
  sentinelBottom: number;
  lastPBottom: number;
  bodyBottom: number;
};

export function contentHeightFromMessage(data: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return Number.NaN;
  }
  if (parsed === null || typeof parsed !== "object") {
    return Number.NaN;
  }
  const metrics = parsed as Partial<VerdictHeightMetrics>;
  const candidates = [
    metrics.bodyScroll,
    metrics.bodyOffset,
    metrics.deScroll,
    metrics.deOffset,
    metrics.sentinelBottom,
    metrics.lastPBottom,
    metrics.bodyBottom,
  ];
  const values = candidates.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  if (values.length === 0) {
    return Number.NaN;
  }
  return Math.ceil(Math.max(...values));
}

export function wrapVerdictHtml(html: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;font:16px/1.5 sans-serif;color:#111}a{color:#1976d2}</style></head><body>${html}<div id="s"></div><script>
(function(){
  var s=document.getElementById('s');
  var paras=document.getElementsByTagName('p');
  var lastP=paras[paras.length-1];
  window.ReactNativeWebView.postMessage(JSON.stringify({
    bodyScroll:document.body.scrollHeight,
    bodyOffset:document.body.offsetHeight,
    deScroll:document.documentElement.scrollHeight,
    deOffset:document.documentElement.offsetHeight,
    sentinelBottom:s?s.getBoundingClientRect().bottom:0,
    lastPBottom:lastP?lastP.getBoundingClientRect().bottom:0,
    bodyBottom:document.body.getBoundingClientRect().bottom
  }));
})();
</script></body></html>`;
}
