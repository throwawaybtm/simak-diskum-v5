import fs from 'fs';
import path from 'path';

const audit = JSON.parse(fs.readFileSync('scripts/auditResultsOctober.json', 'utf8'));

console.log('=== DETAILED OCTOBER 2026 AUDIT REPORT ===');
console.log(`Total Tabs: ${audit.totalWorksheets}`);
console.log(`Total Raw Activities: ${audit.totalActivities}`);
console.log(`Active Days: ${audit.activeDays}`);
console.log(`Empty Days: ${audit.emptyDays}`);
console.log(`Privacy Leaks: ${audit.privacyLeaksDetected.length}`);
console.log(`Multi-day Activity Chains: ${audit.multiDayCandidates.length}`);

console.log('\n--- 1. Multi-Day Activity Chains ---');
audit.multiDayCandidates.forEach((m, idx) => {
  console.log(`[Chain ${idx + 1}] "${m.title}" (${m.count} days):`);
  m.occurrences.forEach(o => console.log(`   - ${o}`));
});

console.log('\n--- 2. Attendee Resolution Statistics ---');
let totalAttendeeRefs = 0;
let totalMatched = 0;
let totalUnmatchedRoles = new Set();

audit.tabs.forEach(t => {
  t.activities.forEach(a => {
    if (a.rawAttendees) {
      totalAttendeeRefs++;
      if (a.matchedAttendees && a.matchedAttendees.length > 0) {
        totalMatched++;
      }
      if (a.unmatchedTokens && a.unmatchedTokens.length > 0) {
        a.unmatchedTokens.forEach(tok => totalUnmatchedRoles.add(tok));
      }
    }
  });
});

console.log(`Activities with Attendee entries: ${totalAttendeeRefs}`);
console.log(`Activities with at least 1 Matched Staff: ${totalMatched}`);
console.log(`Unmatched/Ambiguous Role Tokens:`, Array.from(totalUnmatchedRoles));

console.log('\n--- 3. Tab-by-Tab Breakdown ---');
audit.tabs.forEach(t => {
  console.log(`Tab ${t.sheetName} (${t.declaredDate ? t.declaredDate.split('T')[0] : 'N/A'}): ${t.activityCount} activities`);
});
