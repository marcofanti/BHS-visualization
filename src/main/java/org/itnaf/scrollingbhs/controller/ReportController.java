package org.itnaf.scrollingbhs.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.itnaf.scrollingbhs.model.KeystrokeTimingData;
import org.itnaf.scrollingbhs.service.KeystrokeDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReportController {

    private final KeystrokeDataService keystrokeDataService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    public ReportController(KeystrokeDataService keystrokeDataService) {
        this.keystrokeDataService = keystrokeDataService;
    }

    @PostMapping("/GetReport")
    public ResponseEntity<String> getReport(@RequestBody Map<String, Object> payload) {
        String behaviodataString = (String) payload.get("behaviodata");
        if (behaviodataString == null) {
            return ResponseEntity.badRequest().body("Missing 'behaviodata' field.");
        }

        List<KeystrokeTimingData> sessionData = new ArrayList<>();

        try {
            List<List<Object>> rawDataList = mapper.readValue(behaviodataString, List.class);

            for (List<Object> item : rawDataList) {
                // Check if the item matches the keystroke timing data format
                if (item != null && item.size() == 3 &&
                    item.get(0) instanceof String &&
                    item.get(1) instanceof String &&
                    item.get(2) instanceof List) {

                    try {
                        KeystrokeTimingData data = new KeystrokeTimingData(item);
                        sessionData.add(data);
                    } catch (Exception e) {
                        System.err.println("Could not parse item as KeystrokeTimingData: " + item + " - " + e.getMessage());
                    }
                }
            }
        } catch (JsonProcessingException e) {
            System.err.println("Error parsing behaviodata string: " + e.getMessage());
            return ResponseEntity.badRequest().body("Error parsing behaviodata JSON string.");
        }

        // Pass the entire session (all fields) to the service at once
        if (!sessionData.isEmpty()) {
            keystrokeDataService.setKeystrokeSession(sessionData);
        }

        return ResponseEntity.ok("Report received. Keystroke data fields processed: " + sessionData.size());
    }
}
