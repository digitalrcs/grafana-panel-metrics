import { test, expect } from '@grafana/plugin-e2e';

test('live dashboard timings, display controls and read-only query count', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 1600 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let queries = 0;
  page.on('request', (r) => {
    if (r.url().includes('/api/ds/query') && r.method() === 'POST') {
      queries++;
    }
  });
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const dashboardPage = await gotoDashboardPage(dashboard);
  const panel = page.getByRole('region', { name: 'Dashboard execution metrics' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Dashboard execution' })).toBeVisible();
  await expect(panel.getByRole('row').filter({ hasText: 'Slow results (8 s)' })).toContainText('Loading');
  await expect(panel.getByRole('row').filter({ hasText: 'Slow results (8 s)' })).toContainText('Done', {
    timeout: 20000,
  });
  await panel.scrollIntoViewIfNeeded();
  const row = panel.getByRole('row').filter({ hasText: 'Fast results' });
  await expect(row).toContainText('Done');
  await expect(row).toContainText('SDK timestamps');
  await expect(panel.getByRole('row').filter({ hasText: 'Query error' })).toContainText('Error');
  const slowText = await panel
    .getByRole('row')
    .filter({ hasText: 'Slow results (8 s)' })
    .getByRole('cell')
    .nth(2)
    .innerText();
  const slowSeconds = parseFloat(slowText);
  expect(slowSeconds).toBeGreaterThanOrEqual(8);
  expect(slowSeconds).toBeLessThan(20);
  const baseline = queries;
  await panel.getByRole('textbox', { name: 'Filter panels' }).fill('Fast results');
  await expect(panel.getByRole('row')).toHaveCount(2);
  await panel.getByRole('combobox', { name: 'View', exact: true }).selectOption('bars');
  await expect(panel.getByRole('table')).toHaveCount(0);
  await panel.getByRole('checkbox', { name: 'Group by source' }).check();
  await expect(panel.getByText('Cumulative time by source group')).toBeVisible();
  await panel.getByRole('textbox', { name: 'Filter panels' }).fill('');
  await panel.getByRole('combobox', { name: 'View', exact: true }).selectOption('both');
  const downloadPromise = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('grafana-panel-timings.csv');
  expect(queries).toBe(baseline);
  await panel.getByRole('checkbox', { name: 'Group by source' }).uncheck();
  await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/panel-metrics-desktop.png`, fullPage: false });
  await panel.getByRole('button', { name: 'Clear observations' }).click();
  await expect(panel.getByRole('row').filter({ hasText: 'Fast results' })).toContainText('Not observed');
  expect(queries).toBe(baseline);
  await dashboardPage.refreshDashboard();
  await expect(panel.getByRole('row').filter({ hasText: 'Fast results' })).toContainText('Done');
  await page.setViewportSize({ width: 650, height: 1000 });
  await expect(panel.getByRole('textbox', { name: 'Filter panels' })).toBeVisible();
  await page.screenshot({ path: `${process.env.TEMP || '/tmp'}/panel-metrics-narrow.png`, fullPage: false });
  expect(errors).toEqual([]);
});
