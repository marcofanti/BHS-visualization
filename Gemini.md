# ScrollingBHS Project Handoff Documentation

## 1. Project Overview

**ScrollingBHS** is a monolithic Java application designed to provide real-time visualization of keystroke biometric data. It combines a Spring Boot backend for web services with a JavaFX frontend for the graphical user interface.

The primary goal of this application is to capture and display keystroke dynamics from a web form. This allows for the analysis of typing behavior, such as key press duration (dwell time) and the time between key presses (flight time), including concurrent keystrokes.

### Core Components:

*   **Spring Boot Web Application:** Serves a single-page web application (SPA) built with AngularJS and provides a REST endpoint (`/api/GetReport`) to receive keystroke data.
*   **JavaFX GUI Application:** Launches as the main entry point, initializes the Spring Boot context, and provides a real-time, animated "Animated Gantt Chart" visualization of the captured keystroke data.

## 2. System Architecture

The application follows a monolithic architecture where the backend and frontend are part of the same deployable unit.

### Architectural Flow:

1.  **Application Startup:** The `main` method in `ScrollingBHSApplication.java` launches the `FxApplication`, which in turn starts the Spring Boot application context.

2.  **Data Capture (Frontend):** The `behavioweb.js` library captures keystroke timing data. On "Send", the `app.js` controller sends the data to the backend. Upon success, the controller now reliably clears the form fields and resets the data collector, a fix ensured by adding a cache-busting parameter to the script tag in `sample.html`.

3.  **Data Processing (Backend):** The `ReportController` receives the data and passes the entire session (a list of `KeystrokeTimingData` objects) to the `KeystrokeDataService`.

4.  **Data Exchange (Backend to GUI):** The `KeystrokeDataService` uses `Platform.runLater()` to update an `ObjectProperty` with the new session data, ensuring thread-safe communication with the JavaFX Application Thread.

5.  **Data Visualization (GUI):** The `KeystrokeTimelinePane` listens for new sessions and plays an "Animated Gantt Chart" visualization.
    *   **Dual-Animation Mechanism:** The visualization is driven by two components working together:
        1.  A `Timeline` (named `sessionScheduler`) schedules the discrete `keydown` and `keyup` events.
        2.  An `AnimationTimer` (named `blockGrower`) runs every frame to handle the continuous growth of the blocks.
    *   **Animation Logic:**
        *   **`keydown`:** When the `Timeline` reaches a `keydown` event's time, a new block of zero width is created at the correct horizontal position on its field's row. The `AnimationTimer` is now responsible for this block.
        *   **Real-Time Growth:** On every frame, the `AnimationTimer` checks all active blocks. For each active block, it calculates the elapsed time since its `keydown` and updates its width accordingly. This makes the block "grow" to the right in real-time.
        *   **`keyup`:** When the `Timeline` reaches a `keyup` event's time, it finds the corresponding block and tells the `AnimationTimer` to stop growing it. The block's final width now accurately represents the total dwell time.
        *   **Persistence:** The block remains on the screen permanently after it stops growing.
    *   **Layout and Overlap:**
        *   **Time-Based Positioning:** A block's horizontal start position is based on its `keydown` time relative to the fixed duration of the timeline.
        *   **Vertical Overlap:** Concurrent keystrokes are drawn with a `-15px` vertical offset for each level of overlap.
        *   **X-Axis:** A time-scale axis is displayed at the bottom of the window.

## 3. Key Classes and Responsibilities

### Backend (`src/main/java/org/itnaf/scrollingbhs`)

*   **`controller/ReportController`:** Defines the `/api/GetReport` REST endpoint.
*   **`service/KeystrokeDataService`:** Holds the `ObjectProperty` for the latest keystroke session.

### Frontend GUI (`src/main/java/org/itnaf/scrollingbhs/javafx`)

*   **`FxApplication`:** The main JavaFX `Application` class. It creates the main window and the time-scale X-axis.
*   **`visualization/KeystrokeTimelinePane`:** A custom `Pane` that implements the "Animated Gantt Chart" using a `Timeline` to schedule events and an `AnimationTimer` to handle the real-time growth of blocks.

### Web Resources (`src/main/resources/static`)

*   **`sample.html`:** Includes a cache-busting query parameter for `app.js` to ensure the latest version is always loaded.
*   **`app.js`:** The AngularJS controller. Its `sendData` function contains explicit logic to clear form fields and reset the data collector on success.

## 4. Future Development and Considerations

*   **Performance:** For extremely long or dense typing sessions, the `AnimationTimer` managing many growing blocks could become a performance bottleneck.
*   **Visualization Interactivity:** The animation could be enhanced with features like a play/pause/reset button or a draggable playhead.
*   **Decoupling:** For larger applications, consider decoupling the Spring backend and JavaFX frontend into separate applications that communicate over WebSockets.
*   **Build and Deployment:** For distribution, a packaged executable with an embedded JRE could be created using tools like `jlink` and `jpackage`.
