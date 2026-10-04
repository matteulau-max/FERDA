# Rangefinder and TheGrint companion

Open **Rangefinder** from a scorecard to measure without unmounting it. Closing
the native modal restores the scorecard and its local score state. A standalone
screen is available at `/rangefinder` and `/t/:slug/rangefinder`, also in the header
menu. It uses Ferda's existing green, cream, yellow and serif styles.

## Using it on iPhone

Open Ferda directly in Safari. Allow rear camera and motion from their individual
buttons. Enter the unadjusted horizontal distance and rear-camera height above
your ground. Sight a visible ground point, ideally the base of the flagstick.
Hold still and capture. Positive feet means uphill. This does not calculate a
golf-ballistic “plays like” distance.

Camera height and calibration live in device-local browser storage. No readings
are written to tournament data. Backgrounding, hiding the page, or closing the
rangefinder stops acquisition; re-enable camera and motion to continue.

Calibration requires a reference at exactly the camera's height. Do not zero on
a flagstick base, which is below your camera on level ground. Validate on level
ground with measured distance and camera height; expected target elevation is 0 ft.
Repeat ten captures to assess mean bias and spread. Camera alignment, iPhone lens
selection and Safari sensor precision require physical testing. The stability gate
is a repeatability check, not an accuracy guarantee.

## TheGrint: available now

This is a **manual companion flow**, not account linking or API synchronization.
Check unadjusted yardage in TheGrint and enter it into Ferda. The Paste yardage
button supports a single copied number with optional yard units; it rejects
ambiguous text containing several distances. It does not assume TheGrint provides
a copy button. The outbound link opens TheGrint's website; it does not promise
to deep-link into its current round. Switching apps requires resuming sensors.

No paid APIs or credentials were added. The new feature does not read TheGrint
credentials, scrape its account pages, or change Ferda's database or scoring rules.

## Direct integration: what remains

TheGrint announced its **Connect API Program** in its 2025 State of the Union:
https://thegrint.com/range/post/2025-state-of-the-union

Public documentation reviewed here establishes that the program exists, but does
not establish that third parties can retrieve live player GPS yardage, exact pin
positions, or course geometry, nor the pricing and authentication requirements.
The `/api` public page did not provide accessible developer documentation.

To implement live integration, request the partner documentation and confirm:

- Whether course/green coordinates, active-round holes, or current GPS yardages
  are available; a handicap API alone will not solve distance import.
- Whether yardages are horizontal/unadjusted, their accuracy, units, and pin
  position assumptions.
- User authorization, approved callback URLs, credentials and supported deep links.
- Pricing, rate limits, data licensing and retention terms.

Official contact published by TheGrint: `contactus@thegrint.com`. No message was
sent. Once access and supported endpoints are known, add an authenticated server
adapter and retain manual entry when authorization or service availability fails.
Do not invent API endpoints or put secret partner credentials in a `VITE_` variable.

## Checks

`npm run build` checks the React/TypeScript application and production bundle.
`node scripts/check-rangefinder.mjs` executes the actual geometry TypeScript via
the existing TypeScript dependency and checks signs, known elevations, stale/noisy
readings, and clipboard ambiguity. No dependency or database migration is needed.

Device QA: grant/deny/retry permissions; verify upward camera tilt gives positive
angle; capture and reset; zero/clear calibration; rotate to landscape; background
and resume; close while camera permission is pending; confirm scorecard state and
scoring remain intact behind the modal.

Formula reference: https://www.w3.org/TR/orientation-event/ (Z-X-Y rotation matrix).

## Automatic GPS field test

The rangefinder includes local browser geolocation and bundled green maps for Dyker Beach and Patriot Hills. Select the course and hole manually, then Enable GPS. No camera or motion permission is needed for GPS alone. All position calculations remain on the device. Location watches stop on hiding or unmounting; enable GPS again after returning. Readings older than 15 seconds, reported accuracy worse than 30 meters, and targets more than 1,500 yards away are hidden. A 30-meter gate is a field-test display threshold, not a guarantee of golf accuracy.

Center targets use mapped hole-path endpoints inside matched green polygons. Front/back use the approach line through that target and the containing polygon's entry and exit. Exact daily pin location is unknown. Do not feed center GPS into flag-base slope measurements automatically: they may target different points.

`src/data/gps-courses.json` is the downloadable derived course dataset, with source URLs and OSM feature IDs. © OpenStreetMap contributors via OpenGolfAPI. The dataset is distributed under ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/); attribution: https://www.openstreetmap.org/copyright. Geometry was checked October 4, 2026: all 36 hole endpoints are contained in distinct matched green polygons. Dyker's numbering agrees with the course's April 2025 scorecard. No par data is imported (Patriot's OSM hole 16 par disagrees with the official course tour). None of these checks establish surveyed positional accuracy.

Field comparison: record course, hole, same-location Ferda center yardage, reference app center yardage, reported accuracy, and reading age. Keep testing separate from official scoring. Physical iPhone GPS and slope accuracy remain unvalidated.

Validation: `node scripts/check-gps.mjs`, `node scripts/check-rangefinder.mjs`, `npm run build`.

## Simplified camera UI

The main screen now shows course/hole, front/middle/back distances, camera, and estimated slope-adjusted middle distance. GPS feeds the mapped middle target directly into the elevation measurement. Aim at that middle target at ground level, not a displaced daily flag. The earlier manual flag-yardage workflow and Grint companion card are removed from this screen. Height, calibration, troubleshooting, model assumptions, and testing instructions live in Settings & help. Camera and motion permissions are requested from one button. Calibration is required before displaying an adjusted estimate. Weak/stale/off-course GPS suppresses both automatic target distance and its slope estimate. Course/hole/yardage changes invalidate held measurements.

The adjustment is an ideal projectile approximation with a fixed 45-degree launch and no lift/drag: with horizontal D and elevation H in yards, the flat-ground equivalent is D²/(D−H), derived from the projectile trajectory equation at https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion. This is explicitly an experimental estimate, not a calibrated golf-ball or club model. The derivation and limitations are an implementation choice, not an OpenStax claim about golf accuracy. No adjusted reading is displayed outside the existing 1–400 yd measurement range or with elevation exceeding half the range.

## Hole map

The rangefinder lazily loads a vector hole map with mapped fairways, tees, bunkers, greens, and water. Hole routes and landscape polygons are in `src/data/gps-map.json`, sourced from the same per-course OpenGolfAPI feature URLs; this derived dataset is © OpenStreetMap contributors via OpenGolfAPI, ODbL 1.0. Only supported polygon features are bundled. No paid map tiles, aerial imagery, or runtime data subscriptions are used.

Projection rotates tee-to-green upward and automatically fits the entire hole plus a fresh, usable, nearby GPS fix. The blue circle reflects reported horizontal accuracy in meters at map scale. Hidden/weak/stale/off-course fixes do not show a live dot or measured target yardage. Without GPS the map remains a course overview. Tap any point for a position-to-target distance, or use arrow keys while the map is focused; Reset returns to the middle. Changing course/hole resets the target. Tapped targets do not change the slope camera target. Expand opens a full-height native modal with the same selection, close/Escape support, and attribution. Shapes reflect available community mapping and are not daily pin positions or a surveyed map.

Checks: `node scripts/check-hole-map.mjs` verifies all 36 rotations, map coordinate inversion, inclusion of the golfer in fitted bounds, and expected fairway/bunker coverage.

## Aerial map refresh

Real aerial photography replaces the illustrated basemap by default. `public/maps/dyker.jpg` and `patriot.jpg` are USGS National Map imagery exports, with the actual returned WGS84 bounds in `src/data/gps-aerial.json`. Images are hosted with Ferda, require no API key or paid map subscription, and do not transmit golfer location to an imagery provider. Credits: USDA, USGS The National Map: Orthoimagery (public-domain CONUS NAIP imagery). The service describes CONUS acquisitions as 2017–2021, refreshed June 2024; this is historical imagery, not current course conditions. Source and service metadata: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer .

A three-corner affine transform registers each WGS84 raster to the same rotated local map coordinates as the golfer and green. The selected hole corridor stays bright while surroundings dim. The taller canvas, green flag, white distance line, and floating distance pill take layout cues from TheGrint's publicly shown GPS screen without using its imagery or assets. Focus green crops to the selected green; Whole hole restores the route plus nearby golfer. A failed aerial request falls back to the existing bundled course geometry.

### Illustrated map, flyover, and carry rings
The default vector map uses mapped course polygons, grass/mowing textures and relief shadows, with aerial imagery available via toggle. A 4.2-second tee-to-green preview runs on hole selection; Stop flyover cancels it and reduced-motion settings suppress it. Target picking is paused during the camera animation to avoid mismatched coordinates. Distance rings are 50-yard increments, with an adjustable 25–350-yard carry ring (175-yard illustrative default, not a club recommendation). Rings originate at the usable GPS position or clearly labeled tee overview and are hidden in green focus. They show horizontal distance, not slope, wind, or shot dispersion.

### Tee selection and distance source
Select a tee color and choose Selected tee (published hole yardage) or My GPS location (live front/middle/back). Dyker uses its official April 2025 scorecard; Patriot Hills uses Zomma's attributed OSM scorecard, checked August 2026, since the club's linked scorecard image is unavailable. Each source is linked in the UI. Tee colors have no verified coordinates in our dataset: map reference tee remains explicitly generic, and rings/target picking are disabled in tee preview. Tee scorecard distances never feed the camera slope calculation. GPS mode retains freshness, accuracy and distance guards; enabling GPS explicitly selects GPS mode.
