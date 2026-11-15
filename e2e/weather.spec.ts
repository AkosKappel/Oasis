import { test, expect } from './fixtures';
const response = {
  current: { temperature_2m: 12, weather_code: 2 },
  current_units: { temperature_2m: '°C' },
  daily_units: { temperature_2m_max: '°C', temperature_2m_min: '°C' },
  daily: {
    time: ['2026-11-14', '2026-11-15', '2026-11-16'],
    temperature_2m_min: [5, 6, 7],
    temperature_2m_max: [12, 13, 14],
    weather_code: [2, 61, 0],
  },
};
test('keeps weather opt-in, handles denied access and caches a chosen city offline', async ({
  page,
  context,
}, testInfo) => {
  let forecasts = 0,
    searches = 0;
  await context.addInitScript(() => {
    const permissions = (
      globalThis as unknown as {
        chrome: {
          permissions: {
            contains: () => Promise<boolean>;
            request: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
        };
      }
    ).chrome.permissions;
    let allowed = false,
      requests = 0;
    // Browser-owned permission prompts are supplied at the API boundary in headless Chromium.
    permissions.contains = async () => allowed;
    permissions.request = async () => {
      requests++;
      allowed = requests > 1;
      return allowed;
    };
    permissions.remove = async () => {
      allowed = false;
      return true;
    };
  });
  await context.route(
    'https://geocoding-api.open-meteo.com/**',
    async (route) => {
      searches++;
      await route.fulfill({
        json: {
          results: [
            {
              name: 'Bratislava',
              country: 'Slovakia',
              latitude: 48.15,
              longitude: 17.11,
            },
          ],
        },
      });
    },
  );
  await context.route('https://api.open-meteo.com/**', async (route) => {
    forecasts++;
    await route.fulfill({ json: response });
  });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Widgets', exact: true });
  expect(searches).toBe(0);
  expect(forecasts).toBe(0);
  await dialog
    .getByRole('button', { name: 'Allow weather access', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('Weather stays off');
  await dialog
    .getByRole('button', { name: 'Allow weather access', exact: true })
    .click();
  await dialog
    .getByRole('searchbox', { name: 'Weather city', exact: true })
    .fill('Bratislava');
  await dialog.getByRole('button', { name: 'Find city', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Use Bratislava, Slovakia', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Weather is enabled');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const weather = page.getByRole('region', { name: 'Weather', exact: true });
  await expect(weather).toContainText('12°C');
  await expect(weather.getByRole('listitem')).toHaveCount(3);
  expect(forecasts).toBe(1);
  expect(searches).toBe(1);
  await expect(
    weather.getByRole('button', { name: 'Refresh weather', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('weather.png') });
  await context.setOffline(true);
  await page.reload();
  await expect(weather).toContainText('12°C');
  expect(forecasts).toBe(1);
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Turn weather off', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Weather is off');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(weather).toHaveCount(0);
  await page.reload();
  await expect(weather).toHaveCount(0);
  expect(forecasts).toBe(1);
});

test('shows an unavailable state when the provider fails and keeps controls usable', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    const permissions = (
      globalThis as unknown as {
        chrome: { permissions: { contains: () => Promise<boolean> } };
      }
    ).chrome.permissions;
    permissions.contains = async () => true;
  });
  await context.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Oslo',
            country: 'Norway',
            latitude: 59.91,
            longitude: 10.75,
          },
        ],
      },
    }),
  );
  await context.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await dialog
    .getByRole('searchbox', { name: 'Weather city', exact: true })
    .fill('Oslo');
  await dialog.getByRole('button', { name: 'Find city', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Use Oslo, Norway', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Weather is enabled');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const weather = page.getByRole('region', { name: 'Weather', exact: true });
  await expect(weather.getByRole('status')).toContainText(
    'could not be reached',
  );
  await expect(weather).toContainText('No forecast saved yet');
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Turn weather off', exact: true }),
  ).toBeEnabled();
});

test('turning weather off in one space preserves another space’s browser access', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    let allowed = true;
    const permissions = (
      globalThis as unknown as {
        chrome: {
          permissions: {
            contains: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
        };
      }
    ).chrome.permissions;
    permissions.contains = async () => allowed;
    permissions.remove = async () => {
      allowed = false;
      return true;
    };
  });
  await context.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Oslo',
            country: 'Norway',
            latitude: 59.91,
            longitude: 10.75,
          },
        ],
      },
    }),
  );
  await context.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: response }),
  );
  await page.goto('chrome://newtab/');
  async function enable() {
    await page.getByRole('button', { name: 'Widgets', exact: true }).click();
    await page
      .getByRole('searchbox', { name: 'Weather city', exact: true })
      .fill('Oslo');
    await page.getByRole('button', { name: 'Find city', exact: true }).click();
    await page
      .getByRole('button', { name: 'Use Oslo, Norway', exact: true })
      .click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText(
      'Weather is enabled',
    );
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  }
  await enable();
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Work');
  await page.getByRole('button', { name: 'Create space', exact: true }).click();
  const selector = page.getByRole('combobox', {
    name: 'Active space',
    exact: true,
  });
  await expect(
    selector.getByRole('option', { name: 'Work', exact: true }),
  ).toHaveCount(1);
  await selector.selectOption({ label: 'Work' });
  await enable();
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await page
    .getByRole('button', { name: 'Turn weather off', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Other spaces retain weather access',
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await selector.selectOption('default');
  await expect(
    page.getByRole('region', { name: 'Weather', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await page
    .getByRole('button', { name: 'Turn weather off', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'network access was removed',
  );
});
