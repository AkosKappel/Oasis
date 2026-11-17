# Optional content APIs

Research checked 2026-11-14. Open-Meteo powers optional weather with manual city selection, runtime host access, attribution and local caching. Its free endpoint is restricted to personal/non-commercial use. Personal albums and quote collections work locally; no photo or quote API is connected. Recheck provider terms before commercial distribution.

| Use     | Candidate                                                       | Free access and constraints                                                                                                                                                                                                                |
| ------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Weather | [Open-Meteo](https://open-meteo.com/en/pricing)                 | Free tier excludes commercial use, with 10,000 calls/day and 300,000/month. A strong option for personal/non-commercial use; attribution is required.                                                                                      |
| Weather | [WeatherAPI](https://www.weatherapi.com/pricing)                | Free plan lists 100,000 calls/month, current conditions and a three-day forecast, including commercial use. Requires a key; follow its attribution terms.                                                                                  |
| Photos  | [Unsplash](https://unsplash.com/documentation)                  | Demo limit is 50 API calls/hour; approved production currently lists 1,000/hour. Requires application registration, photo/photographer attribution, hotlinking and download tracking where applicable.                                     |
| Photos  | [Pexels](https://www.pexels.com/api/)                           | Offers a free API, but currently states that new API key issuance is paused. Do not make this the initial dependency without an existing eligible key.                                                                                     |
| Quotes  | [ZenQuotes](https://docs.zenquotes.io/zenquotes-documentation/) | Free access is limited to five requests per 30 seconds per IP and requires attribution. Its docs require a key or registered IP for ordinary web CORS headers. Extension-page requests can instead be evaluated with optional host access. |
| Quotes  | [Quotable](https://github.com/lukePeavey/quotable)              | Free open-source API; README lists 180 requests/minute/IP. Evaluate hosted availability, provenance and content rights before relying on it.                                                                                               |

## Connected providers (2026-11-17)

- Picture of the day: the Wikipedia featured feed (`https://en.wikipedia.org/api/rest_v1/feed/featured/YYYY/MM/DD`) returns Wikimedia Commons' picture with author, license and file page, needs no key and sends `Access-Control-Allow-Origin: *`, so no host permission is required. Oasis uses the 1920 pixel thumbnail (Wikimedia serves fixed widths; 2560 returned an error when checked) and shows title, author, license and a Commons link. Requests send an `Api-User-Agent` header as Wikimedia asks of API clients.
- Quote of the day: ZenQuotes `https://zenquotes.io/api/today` needs no key but sends no CORS header, so Oasis requests optional access to `zenquotes.io`. The free tier requires a visible link back to zenquotes.io; Home shows "Quote from ZenQuotes". Rate-limit answers arrive as a pseudo-quote mentioning zenquotes.io and are ignored. Commercial-use terms were not confirmed on the official site; recheck before any commercial distribution.

## Integration direction

- Open-Meteo is the current personal/non-commercial weather provider; WeatherAPI remains an alternative when its key-based plan fits distribution.
- Evaluate Unsplash for an opt-in daily photo source. Provider images need their own attribution and delivery behavior; do not assume offline album storage is permitted under API terms.
- Keep custom quotes usable offline. Cache provider quote responses conservatively and show required attribution; an API being free does not establish rights to redistribute every quotation.
- Clocks, countdowns and daily rotation need no external API. Use local dates and browser time-zone support.
- A distributed extension cannot keep a shared API secret. Decide on user-supplied keys or a small server component if a provider requires credentials to stay secret.
- [Chrome host permissions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) allow extension pages to make cross-origin requests. This differs from an ordinary website: lack of public CORS headers alone does not require a proxy for Oasis. Provider terms and rate limits still apply.
- Network features remain opt-in, with narrowly scoped permissions, bounded requests, caching and offline fallback. Account setup and production approval depend on the provider.
