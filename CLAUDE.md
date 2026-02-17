# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branches

| Branch | Description |
|--------|-------------|
| `main` | Original JavaFX + browser version |
| `d3-visualization` | D3.js prototype added as a standalone `/d3` page |
| `web-only` | **Active** — JavaFX removed; D3 visualization embedded inline on login and signup pages |

## Commands

```bash
# Build
mvn clean package

# Run
mvn spring-boot:run

# Run compiled JAR
java -jar target/ScrollingBHS-1.0-SNAPSHOT.jar
```

There are no tests in this project currently.

## Architecture

ScrollingBHS is a **keystroke biometrics visualization tool**. It runs a pure Spring Boot web server (no desktop GUI). A user opens a browser to the local web server, types into monitored form fields, and submits — a D3.js animation plays back the keystrokes inline on the same page as a "player piano" visualization.

**Data flow:**
1. Browser → `http://localhost:8888` → served `sample.html` (AngularJS SPA)
2. `behavioweb.js` captures keystroke events (keydown/keyup with timestamps)
3. AngularJS `app.js` parses the captured data client-side and renders the D3 visualization immediately
4. `app.js` also POSTs `behaviodata` JSON to `POST /api/GetReport` (fire-and-forget; used for server-side storage)
5. `ReportController` deserializes the data → `KeystrokeTimingData` list → passes to `KeystrokeDataService`
6. `KeystrokeDataService` stores the most recent session in memory

**D3 Visualization (`keystrokeViz` Angular factory in `app.js`):**
- `keystrokeViz.create()` returns a per-controller viz instance (isolated sessions ring buffer + animationId)
- Sessions ring buffer holds up to 2 sessions: current animates at top, previous drawn statically below a divider
- Key press (action=0): colored rectangle grows rightward in real time via `requestAnimationFrame`
- Key release (action=1): rectangle stops growing
- Simultaneous key presses in the same field stack vertically with a 15px offset per overlap level
- Each keycode gets a random HSL color that persists for the page lifetime (shared `keyColors` map in factory)
- Timeline window: 10 seconds (`DURATION_MS = 10000`)
- X-axis: labeled in seconds, spans `LABEL_WIDTH` (150px) to right edge
- Field labels rendered in white (current session) or grey `#AAAAAA` (previous session)
- Visualization appears in `#viz-container` / `#timeline-svg` elements embedded in each page template

**BehavioSec data format** (`behavioweb.js` output):
- `getBehavioData(false)` returns a JSON array; each entry: `[type, target, [[action, keyCode, timestamp], ...]]`
- `type` `"f"` = normal field (keyCode = actual keycode); `"fa"` = anonymous/password (keyCode = caret index)
- `action` 0 = keydown, 1 = keyup; timestamps are ms since monitor start
- Other types (`"m"`, `"c"`, `"w"`) are metadata — filtered out by checking `Array.isArray(item[2])`
- TAB key (keyCode 9) is filtered from visualization

**Web routing:** `WebConfig` maps `/`, `/login`, `/signup`, `/dashboard` → `sample.html` (SPA catch-all).

**Angular template cache busting:** all `templateUrl` values include `?v=1` to prevent browsers from serving stale cached partials. Bump this version whenever a template is modified.

## Key Configuration

`src/main/resources/application.properties`:
```properties
server.port=8888
```

## Tech Stack

- Java 17, Spring Boot 3.2.5, Maven (no JavaFX)
- Frontend: AngularJS 1.5.8, Angular UI-Router, Bootstrap, D3.js v7 (vendored at `/vendor/d3.min.js`)
- `behavioweb.js` — third-party keystroke capture library (do not modify)
- `behavioweb-angular.js` — Angular `behavio` module; provides `monitored` directive that calls `bw.monitorField(element)` on each input

## Key Files

| File | Purpose |
|------|---------|
| `src/main/resources/static/app.js` | AngularJS app: `keystrokeViz` factory + login/signup controllers |
| `src/main/resources/static/views/login.html` | Login form + `#viz-container` |
| `src/main/resources/static/views/signup.html` | Signup form (name/email/phone) + `#viz-container` |
| `src/main/resources/static/sample.html` | SPA shell; loads Angular, D3, behavioweb, app.js |
| `src/main/resources/static/vendor/d3.min.js` | D3 v7 vendored locally |
| `src/main/java/.../controller/ReportController.java` | `POST /api/GetReport` endpoint |
| `src/main/java/.../service/KeystrokeDataService.java` | In-memory store for last session |
| `src/main/java/.../config/WebConfig.java` | Spring MVC route → SPA forwarding |
