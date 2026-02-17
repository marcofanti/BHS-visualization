package org.itnaf.scrollingbhs.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class KeystrokeEvent {
    private final int action;
    private final int keyCode;
    private final long timestamp;

    @JsonCreator
    public KeystrokeEvent(List<Object> rawData) {
        if (rawData == null || rawData.size() < 3) {
            throw new IllegalArgumentException("Invalid raw data for KeystrokeEvent");
        }
        this.action = (Integer) rawData.get(0);
        this.keyCode = (Integer) rawData.get(1);
        this.timestamp = ((Number) rawData.get(2)).longValue();
    }

    public int getAction() {
        return action;
    }

    public int getKeyCode() {
        return keyCode;
    }

    public long getTimestamp() {
        return timestamp;
    }

    @Override
    public String toString() {
        return "KeystrokeEvent{" +
               "action=" + action +
               ", keyCode=" + keyCode +
               ", timestamp=" + timestamp +
               '}';
    }
}
