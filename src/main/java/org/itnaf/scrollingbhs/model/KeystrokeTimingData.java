package org.itnaf.scrollingbhs.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.stream.Collectors;

public class KeystrokeTimingData {
    private final String fieldName;
    private final String targetText;
    private final List<KeystrokeEvent> events;

    @JsonCreator
    public KeystrokeTimingData(List<Object> rawData) {
        if (rawData == null || rawData.size() < 3) {
            throw new IllegalArgumentException("Invalid raw data for KeystrokeTimingData");
        }
        this.fieldName = (String) rawData.get(0);
        this.targetText = (String) rawData.get(1);

        List<List<Object>> rawEvents = (List<List<Object>>) rawData.get(2);
        this.events = rawEvents.stream()
                .map(KeystrokeEvent::new)
                .collect(Collectors.toList());
    }

    public String getFieldName() {
        return fieldName;
    }

    public String getTargetText() {
        return targetText;
    }

    public List<KeystrokeEvent> getEvents() {
        return events;
    }

    @Override
    public String toString() {
        return "KeystrokeTimingData{" +
               "fieldName='" + fieldName + '\'' +
               ", targetText='" + targetText + '\'' +
               ", events=" + events +
               '}';
    }
}
