# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

ScrollingBHS is a **keystroke biometrics visualization tool**. It runs a Spring Boot web server and a JavaFX GUI in the same JVM. A user opens a browser to the local web server, types into monitored form fields, and submits — the JavaFX window then plays back the keystrokes as a "player piano" animation.

**Data flow:**
1. Browser → `http://localhost:8888` → served `sample.html` (AngularJS SPA)
2. `behavioweb.js` captures keystroke events (keydown/keyup with timestamps)
3. AngularJS `app.js` POSTs `behaviodata` JSON to `POST /api/GetReport`
4. `ReportController` deserializes the data → `KeystrokeTimingData` list → passes to `KeystrokeDataService`
5. `KeystrokeDataService` (Spring `@Service`) holds a JavaFX `ObjectProperty<List<KeystrokeTimingData>>` and calls `Platform.runLater()` to update it on the JavaFX thread
6. `KeystrokeTimelinePane` listens to that property and triggers the animation

**Spring Boot ↔ JavaFX integration:**
- `FxApplication.init()` starts the Spring `ApplicationContext` before the JavaFX stage opens
- `FxApplication.stop()` closes the Spring context on window close
- `KeystrokeDataService` bridges the two runtimes via a JavaFX property

**Visualization (`KeystrokeTimelinePane`):**
- Creates a single master JavaFX `Timeline` with all key events scheduled relative to session start time
- Key press (action=0): colored rectangle appears at horizontal position proportional to timestamp
- Key release (action=1): rectangle opacity reduced to 40%
- Simultaneous key presses stack vertically with a 15px offset per overlap level
- Each keycode gets a random HSB color that persists across sessions (stored in a map)
- Timeline duration is configurable via `visualization.timeline.duration-seconds` in `application.properties`

**Web routing:** `WebConfig` maps `/`, `/login`, `/dashboard` → `sample.html` (SPA catch-all). Thymeleaf templates exist in `templates/` but the active SPA is `static/sample.html`.

## Key Configuration

`src/main/resources/application.properties`:
```properties
server.port=8888
visualization.timeline.duration-seconds=10
```

## Tech Stack

- Java 17, Spring Boot 3.2.5, JavaFX 21, Maven
- Frontend: AngularJS 1.5.8, Angular UI-Router, Bootstrap
- `behavioweb.js` — third-party keystroke capture library (do not modify)
