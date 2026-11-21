// =============================================================================
// COCKPIT ENTRY — shared browser-check helper
//
// Checks that need the real logger used to click Train's `tl-today__primary`,
// which is only "Start workout" on a planned, unfinished day. On a rest or run
// day the primary is a wellness check-in (or a run action), so the cockpit
// never opened and every entry waited 30s for `#trainCockpit:not([hidden])`.
//
// The programme picker always lists the programme's lifting days, whatever
// weekday the suite happens to run on, so it is the dependable route in. Day
// defaults to Thursday, a lifting day in the default `hybrid_engine`
// programme; pass `{ day }` when a check needs a specific session.
// =============================================================================

/**
 * Navigate to Train and open the cockpit on a programmed lifting day.
 *
 * @param {any} page Playwright page
 * @param {{ day?: string }} [options]
 */
export async function enterCockpit(page, { day = 'thu' } = {}) {
  await page.click('.nav-item[data-target="workout"]');
  await page.waitForSelector('#trainLanding .tl-today');

  // The secondary action is "Choose another workout" whenever a programme is
  // active. It opens the picker, which can select a known lifting day on any
  // weekday — the primary CTA cannot on a rest/run day.
  const secondary = page.locator('#trainLanding .tl-today__secondary');
  if (await secondary.count()) {
    await secondary.first().click();
    await page.waitForSelector('#programWorkoutPicker.active');
    const choice = page.locator(`#programWorkoutPicker [data-action="select-program-workout"][data-day="${day}"]`);
    if (await choice.count()) {
      await choice.first().click();
    } else {
      // A programme with a rest day (or no such day) still has another session
      // in the picker; any lifting day is enough to prove the cockpit opens.
      await page.locator('#programWorkoutPicker [data-action="select-program-workout"]').first().click();
    }
  } else {
    // No programme picker (no active plan / unresolved session): the week rail
    // is the only way in, and only enabled cells are actionable.
    await page.click(`#trainLanding .tl-week__day[data-day="${day}"]:not([disabled])`);
  }
  await page.waitForSelector('#trainCockpit:not([hidden])');
  await page.waitForSelector('#cockpitExercisesContainer .cockpit-exercise');
}
