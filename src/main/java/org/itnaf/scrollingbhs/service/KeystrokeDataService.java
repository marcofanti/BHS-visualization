package org.itnaf.scrollingbhs.service;

import javafx.application.Platform;
import javafx.beans.property.ObjectProperty;
import javafx.beans.property.SimpleObjectProperty;
import org.itnaf.scrollingbhs.model.KeystrokeTimingData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class KeystrokeDataService {

    // This property will hold the most recent list of keystroke data (a full session).
    // The UI will observe this property for changes.
    private final ObjectProperty<List<KeystrokeTimingData>> sessionDataProperty = new SimpleObjectProperty<>();

    /**
     * Sets the keystroke data for a new session. This will trigger the UI to update.
     * This method is called from a background thread (the web server thread),
     * so it uses Platform.runLater to ensure the property is updated on the FX Application Thread.
     *
     * @param sessionData A list of KeystrokeTimingData, where each item represents a typed field.
     */
    public void setKeystrokeSession(List<KeystrokeTimingData> sessionData) {
        Platform.runLater(() -> sessionDataProperty.set(sessionData));
    }

    /**
     * Returns the property that holds the session data. The UI can add a listener to this
     * property to be notified of new sessions.
     *
     * @return The observable property for the keystroke session data.
     */
    public ObjectProperty<List<KeystrokeTimingData>> sessionDataProperty() {
        return sessionDataProperty;
    }
}
