package org.itnaf.scrollingbhs.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class ReportRequest {
    private final List<Object> data;

    @JsonCreator
    public ReportRequest(@JsonProperty("behaviodata") String behaviodata) {
        // The incoming JSON is a stringified array, so we need to parse it
        // This is a simplified approach, a more robust solution might involve a custom deserializer
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            this.data = mapper.readValue(behaviodata, List.class);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse behaviodata JSON string", e);
        }
    }

    public List<Object> getData() {
        return data;
    }

    @Override
    public String toString() {
        return "ReportRequest{" +
               "data=" + data +
               '}';
    }
}
