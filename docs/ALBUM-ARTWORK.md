# Built-in album artwork

The assets in `public/albums/` were generated with the built-in imagegen tool on 2026-11-14 for Oasis. These are generated illustrations and photographic-style scenes, not photographs of documented places. No third-party stock images or external feed is used. The repository's publication and license decisions still apply.

Each original was inspected, then encoded as WebP at quality 85 without resizing or changing composition. Assets are 1586 × 992 pixels. The bundled catalog is in `src/database/builtin-albums.ts`; filenames and IDs must remain stable so saved background choices survive updates.

## Prompts

### Quiet geometry: jade-ridges.webp

Use case: stylized-concept. Asset type: final landscape wallpaper for Oasis browser new tab, wide 16:10. Create a refined minimalist low-poly landscape: layered angular mountain ridges, a broad quiet teal sky with a soft warm glow toward horizon, dark deep teal foreground, muted jade slopes. Flat geometric facets, elegant restrained palette, no tiny detail, atmospheric depth. Broad central negative space suitable for a large white clock; visual interest lower third and outer edges. No text, no letters, no watermark, no UI. Full bleed single finished image.

### Quiet geometry: desert-dusk.webp

Use case: stylized-concept. Asset: finished wide 16:10 minimalist low-poly landscape wallpaper for a browser new tab. Angular desert mesas and rolling dunes under a large quiet peach-to-mauve dusk sky, terracotta, dusty rose and muted plum geometric facets, sophisticated paper-like flat shapes, sparse composition with no plants or buildings. Broad low-detail center suitable for a white clock overlay, main ridgelines lower third, atmospheric distance. Single full bleed artwork, no text, no lettering, no watermark, no interface.

### Open air: morning-lake.webp

Use case: photorealistic-natural. Final wide 16:10 wallpaper: tranquil alpine lake at dawn, mist between distant forested hills, muted sage water with soft reflections, cool blue-grey sky and a hint of peach horizon. Thoughtful fine-art landscape photograph, realistic natural textures, restrained saturation. Wide open central sky and water for white clock overlay, interest near outer edges and lower third. No people, buildings, boats, text, watermark or interface. Single full bleed image.

### Open air: quiet-coast.webp

Use case: photorealistic-natural. Final wide 16:10 wallpaper: peaceful unspoiled Mediterranean coastline with pale sandstone cliffs at outer left, clear turquoise sea, fine sand curving along bottom edge, soft afternoon sun. Fine-art landscape photography, natural realistic texture and subtle colors, calm open central sea and sky for clock overlay. No people, houses, boats, umbrellas, text, watermark or interface. Single full bleed image.

### Soft forms: warm-folds.webp

Use case: stylized-concept. Asset: final wide 16:10 abstract wallpaper. Warm off-white, sand, muted apricot and clay flowing sculptural paper folds, softly illuminated smooth matte surfaces, large graceful curves with tactile subtle grain. Refined minimal gallery art, not a gradient swatch. Broad calm uncluttered center and generous negative space, shapes flowing at outer edges, readable under dark overlay and white clock. No objects, text, watermark, logos or UI, full bleed single image.

### Soft forms: cool-drift.webp

Use case: stylized-concept. Asset: final wide 16:10 abstract wallpaper. Large softly floating translucent sculptural ribbon forms in misty blue, lavender and deep slate, smooth frosted glass material with diffused ambient light, subtle beautiful depth, restrained contemporary abstract art. Very calm low-detail broad center, curves concentrated at outer edges, suitable for a white clock over dimming. No text, watermark, logos, characters or UI, single full bleed artwork.

### After dark: moonlit-dunes.webp

Use case: stylized-concept. Final wide 16:10 wallpaper: moonlit desert dunes, smooth sweeping blue-black sand with subtle silver rim light, deep indigo sky and a small crescent moon high in the outer right. Very sparse stars, beautiful atmospheric depth, quiet cinematic realism with painterly softness, restrained navy and silver palette. Central space calm and low detail for white clock overlay. No people, structures, text, watermark, logo or UI. Single full bleed image.

### After dark: distant-lights.webp

Use case: photorealistic-natural. Final wide 16:10 wallpaper: distant warm lights of a small lakeside settlement at blue hour, viewed from across dark still water, silhouettes of hills on the horizon, deep violet twilight sky and restrained amber reflections low in frame. Refined atmospheric landscape photograph, realistic soft light, serene and spacious. Keep center and upper two-thirds calm for white clock overlay. No foreground buildings, cars, people, text, watermark or UI. Full bleed single image.

Additional scenes and their exact prompts are recorded in [Expanded album artwork](ALBUM-EXPANSION.md). Existing filenames and IDs are retained.
