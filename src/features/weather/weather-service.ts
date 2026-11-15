import { browser } from 'wxt/browser';
import { personalWeather } from '@/database/weather';
import { fetchForecast, WEATHER_ORIGINS } from './weather-api';
export async function refreshWeather(
  force = false,
  repository = personalWeather,
) {
  if (!(await browser.permissions.contains({ origins: WEATHER_ORIGINS })))
    throw new Error('Allow weather access in Widgets to refresh.');
  const claim = await repository.claimRefresh(force);
  if (!claim) return false;
  try {
    const forecast = await fetchForecast(claim.location, claim.unit);
    await repository.finishRefresh(claim, forecast);
    return true;
  } catch (cause) {
    await repository.finishRefresh(claim);
    throw cause;
  }
}
