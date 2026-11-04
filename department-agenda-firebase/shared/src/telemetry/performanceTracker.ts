/**
 * Core Web Vitals & Data-Ready Latency Performance Tracker
 * Provides standardized telemetry instrumentation across Public and Admin portals.
 */

export interface ClientPerformanceSnapshot {
  navigationStart: number;
  fcpMs: number;
  lcpMs: number;
  clsScore: number;
  shellRenderMs: number;
  dataVisibleMs: number;
  firestoreReadCount: number;
}

/**
 * Extracts available Performance API metrics from the browser
 */
export function captureClientPerformance(
  dataReadyTimestamp?: number,
  readCount: number = 0
): ClientPerformanceSnapshot {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return {
      navigationStart: 0,
      fcpMs: 0,
      lcpMs: 0,
      clsScore: 0,
      shellRenderMs: 0,
      dataVisibleMs: 0,
      firestoreReadCount: readCount
    };
  }

  // 1. Navigation timing
  const navEntries = performance.getEntriesByType('navigation');
  const navTiming = navEntries.length > 0 ? (navEntries[0] as PerformanceNavigationTiming) : null;
  const navStart = navTiming ? navTiming.startTime : 0;

  // 2. First Contentful Paint (FCP)
  let fcpMs = 0;
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
  if (fcpEntry) {
    fcpMs = Math.round(fcpEntry.startTime);
  }

  // 3. Largest Contentful Paint (LCP)
  let lcpMs = fcpMs;
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  if (lcpEntries.length > 0) {
    lcpMs = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
  }

  // 4. Cumulative Layout Shift (CLS)
  let clsScore = 0;
  const layoutShiftEntries = performance.getEntriesByType('layout-shift');
  for (const entry of layoutShiftEntries) {
    // Only shifts without recent user input
    if (!(entry as any).hadRecentInput) {
      clsScore += (entry as any).value || 0;
    }
  }

  // 5. Shell Render Timing (DOM Interactive / Content Loaded)
  const shellRenderMs = navTiming ? Math.round(navTiming.domInteractive) : fcpMs;

  // 6. Data-Visible Latency
  const dataVisibleMs = dataReadyTimestamp ? Math.round(dataReadyTimestamp) : Math.max(lcpMs, shellRenderMs);

  return {
    navigationStart: Math.round(navStart),
    fcpMs,
    lcpMs,
    clsScore: Number(clsScore.toFixed(4)),
    shellRenderMs,
    dataVisibleMs,
    firestoreReadCount: readCount
  };
}
