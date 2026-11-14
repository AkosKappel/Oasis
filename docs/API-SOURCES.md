# Optional content APIs

Research checked 2026-11-14. No provider is integrated or selected yet. Personal albums and quote collections work locally. Recheck terms and availability before adding an integration.

| Use     | Candidate                                                       | Free access and constraints                                                                                                                                                                                                                |
| ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Weather | [Open-Meteo](https://open-meteo.com/en/pricing)                 | Free tier excludes commercial use, with 10,000 calls/day and 300,000/month. A strong option for personal/non-commercial use; attribution is required.                                                                                      |
| Weather | [WeatherAPI](https://www.weatherapi.com/pricing)                | Free plan lists 100,000 calls/month, current conditions and a three-day forecast, including commercial use. Requires a key; follow its attribution terms.                                                                                  |
| Photos  | [Unsplash](https://unsplash.com/documentation)                  | Demo limit is 50 API calls/hour; approved production currently lists 1,000/hour. Requires application registration, photo/photographer attribution, hotlinking and download tracking where applicable.                                     |
| Photos  | [Pexels](https://www.pexels.com/api/)                           | Offers a free API, but currently states that new API key issuance is paused. Do not make this the initial dependency without an existing eligible key.                                                                                     |
| Quotes  | [ZenQuotes](https://docs.zenquotes.io/zenquotes-documentation/) | Free access is limited to five requests per 30 seconds per IP and requires attribution. Its docs require a key or registered IP for ordinary web CORS headers. Extension-page requests can instead be evaluated with optional host access. |
| Quotes  | [Quotable](https://github.com/lukePeavey/quotable)              | Free open-source API; README lists 180 requests/minute/IP. Evaluate hosted availability, provenance and content rights before relying on it.                                                                                               |

## Integration direction

- Prefer Open-Meteo for a non-commercial weather experiment; WeatherAPI is an alternative when its key-based free plan fits the intended distribution.
- Evaluate Unsplash for an opt-in daily photo source. Provider images need their own attribution and delivery behavior; do not assume offline album storage is permitted under API terms.
- Keep custom quotes usable offline. Cache provider quote responses conservatively and show required attribution; an API being free does not establish rights to redistribute every quotation.
- Clocks, countdowns and daily rotation need no external API. Use local dates and browser time-zone support.
- A distributed extension cannot keep a shared API secret. Decide on user-supplied keys or a small server component if a provider requires credentials to stay secret.
- [Chrome host permissions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) allow extension pages to make cross-origin requests. This differs from an ordinary website: lack of public CORS headers alone does not require a proxy for Oasis. Provider terms and rate limits still apply.
- Network features remain opt-in, with narrowly scoped permissions, bounded requests, caching and offline fallback. Account setup and production approval depend on the provider.
