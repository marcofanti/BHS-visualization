# ScrollingBHS: Real-Time Keystroke Timing Visualizer

ScrollingBHS is a Java application that captures and visualizes keystroke biometric data from a web form in real-time. It demonstrates the integration of a Spring Boot web backend with a JavaFX graphical user interface to provide immediate feedback on typing dynamics.

## Features

*   **Real-Time Keystroke Capture:** A web-based form uses a JavaScript library (`behavioweb.js`) to capture low-level keystroke data, including key press and release timings.
*   **Spring Boot Backend:** A lightweight Spring Boot server provides a REST API endpoint (`/api/GetReport`) to receive the captured data.
*   **Live Visualization:** A JavaFX GUI provides a live playback of the user's typing session. Each keystroke is represented by a colored block that appears on key press and disappears on key release, simulating the typing rhythm.
*   **Monolithic Architecture:** The web server and GUI run in the same Java process, simplifying development and deployment for this type of integrated tool.

## How It Works

1.  **Launch the Application:** When you run the application, it starts both the Spring Boot web server and the JavaFX GUI window.
2.  **Open the Web Form:** Navigate to `http://localhost:8080` in your browser. You will see a simple form with "Username" and "Password" fields.
3.  **Type and Send:** As you type in the fields, the `behavioweb.js` library records the precise timestamp for every key press and release event.
4.  **Data Submission:** When you click the "Send Keystroke Data" button, this timing data is sent to the backend.
5.  **Real-Time Playback:** The backend processes the data and forwards it to the JavaFX application, which then starts a real-time playback of your typing session in the visualization window. Each key press appears as a colored block and vanishes upon release, visually representing the dwell time of each key.

## Technology Stack

*   **Backend:** Spring Boot 3, Spring MVC
*   **Frontend (GUI):** JavaFX 21
*   **Frontend (Web):** AngularJS, HTML5, Bootstrap CSS
*   **Build Tool:** Apache Maven
*   **Language:** Java 17

## How to Run the Application

### Prerequisites

*   Java Development Kit (JDK) 17 or later
*   Apache Maven 3.6 or later

### Steps

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd ScrollingBHS
    ```

2.  **Run the application using Maven:**
    Open a terminal in the project's root directory and run the following command:
    ```sh
    mvn spring-boot:run
    ```

3.  **Use the Application:**
    *   The "Keystroke Timing Visualizer" window will appear.
    *   Open your web browser and go to `http://localhost:8080`.
    *   Type in the form fields and click "Send Keystroke Data" to see the visualization.

## Project Structure

*   `src/main/java/org/itnaf/scrollingbhs/`: Main Java source code.
    *   `controller/`: Spring MVC controllers.
    *   `javafx/`: JavaFX application and UI components.
        *   `visualization/`: Custom JavaFX visualization controls.
    *   `model/`: Data Transfer Objects (DTOs).
    *   `service/`: Business logic and services.
*   `src/main/resources/`:
    *   `static/`: Web resources (HTML, CSS, JavaScript).
    *   `application.properties`: Spring Boot configuration.
*   `pom.xml`: Maven project configuration.
*   `Gemini.md`: Detailed project handoff documentation.
*   `README.md`: This file.
