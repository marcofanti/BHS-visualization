package org.itnaf.scrollingbhs.service;

import org.itnaf.scrollingbhs.model.KeystrokeTimingData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class KeystrokeDataService {

    private List<KeystrokeTimingData> lastSession;

    public void setKeystrokeSession(List<KeystrokeTimingData> sessionData) {
        this.lastSession = sessionData;
    }

    public List<KeystrokeTimingData> getLastSession() {
        return lastSession;
    }
}
