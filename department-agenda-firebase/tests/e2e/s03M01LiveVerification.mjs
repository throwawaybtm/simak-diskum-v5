/**
 * SIMAK DISKUM Kota Batam v5.0 — S03-M01 Live Staging Multi-Viewport Layout Verification
 * 
 * Verifies the mobile daily agenda card layout correction on LIVE staging:
 * https://simakdiskum-staging.web.app/#calendar
 * 
 * Tests across 8 required viewports:
 * - Mobile: 320x844, 375x812, 390x844, 402x874, 425x900
 * - Tablet: 768x1024
 * - Desktop: 1024x768, 1440x900
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const artifactsDir = 'C:/Users/Evaluation Software/.gemini/antigravity/brain/9bc97728-a55d-4267-af2e-af77ebf60f34';

const VIEWPORTS = [
  { name: '320px', width: 320, height: 844, isMobile: true },
  { name: '375px', width: 375, height: 812, isMobile: true },
  { name: '390px', width: 390, height: 844, isMobile: true },
  { name: '402px', width: 402, height: 874, isMobile: true },
  { name: '425px', width: 425, height: 900, isMobile: true },
  { name: '768px', width: 768, height: 1024, isMobile: false },
  { name: '1024px', width: 1024, height: 768, isMobile: false },
  { name: '1440px', width: 1440, height: 900, isMobile: false }
];

async function run() {
  console.log('======================================================================');
  console.log('S03-M01: LIVE STAGING MULTI-VIEWPORT VERIFICATION');
  console.log('Target: https://simakdiskum-staging.web.app/#calendar (Day: 2026-10-30)');
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    
    await page.goto(`https://simakdiskum-staging.web.app/?v=${Date.now()}#calendar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    // Click cell 2026-10-30 safely on the cell-date-num or top-left corner
    const cell30 = page.locator('.month-cell[data-date="2026-10-30"]');
    await cell30.waitFor({ state: 'visible', timeout: 5000 });
    const dateNum = cell30.locator('.cell-date-num');
    if (await dateNum.count() > 0) {
      await dateNum.first().click();
    } else {
      await cell30.click({ position: { x: 6, y: 6 } });
    }
    await page.waitForTimeout(1000);

    // Scroll metrics for horizontal overflow check
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasHorizontalOverflow = scrollWidth > clientWidth;

    // Day view items metrics
    const dayItems = await page.locator('.day-view-item').all();
    const cardMetrics = [];

    for (let i = 0; i < dayItems.length; i++) {
      const cardBox = await dayItems[i].boundingBox();
      const timeBox = await dayItems[i].locator('.day-item-time').boundingBox();
      const contentBox = await dayItems[i].locator('.day-item-content').boundingBox();
      const actionBox = await dayItems[i].locator('.day-item-action').boundingBox();
      const btnBox = await dayItems[i].locator('.day-item-action .btn').boundingBox();

      cardMetrics.push({
        index: i,
        card: cardBox,
        time: timeBox,
        content: contentBox,
        action: actionBox,
        btn: btnBox
      });
    }

    // Capture screenshot
    const shotFilename = `s03-m01-public-dayview-${vp.name}.png`;
    const shotPath = path.join(artifactsDir, shotFilename);
    await page.screenshot({ path: shotPath, fullPage: true });

    // Click test on the first card action button
    let detailModalOpened = false;
    if (dayItems.length > 0) {
      const detailBtn = dayItems[0].locator('.day-item-action .btn');
      if (await detailBtn.count() > 0) {
        await detailBtn.first().click();
        await page.waitForTimeout(600);
        const modal = page.locator('#activityDetailModal');
        if (await modal.isVisible()) {
          detailModalOpened = true;
          // Close modal
          const closeBtn = page.locator('#btnModalClose, #btnModalCloseAction').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.first().click();
            await page.waitForTimeout(400);
          }
        }
      }
    }

    const vpSummary = {
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      scrollWidth,
      clientWidth,
      overflowPx: Math.max(0, scrollWidth - clientWidth),
      itemCount: dayItems.length,
      detailModalOpened,
      cards: cardMetrics,
      screenshot: shotFilename
    };

    results.push(vpSummary);
    console.log(`  ✓ Overflow: ${vpSummary.overflowPx}px | Cards: ${dayItems.length} | Modal opened: ${detailModalOpened}`);
    if (cardMetrics.length > 0) {
      console.log(`    Card [0] width: ${cardMetrics[0].card?.width}px, height: ${cardMetrics[0].card?.height}px`);
      console.log(`    Content [0] width: ${cardMetrics[0].content?.width}px (expanded)`);
      console.log(`    Btn [0] height: ${cardMetrics[0].btn?.height}px (touch target)`);
    }

    await page.close();
  }

  await browser.close();

  // Save verification results
  const resultsPath = path.join(artifactsDir, 's03-m01-verification-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nAll viewports verified. Results saved to ${resultsPath}`);
}

run().catch(console.error);
