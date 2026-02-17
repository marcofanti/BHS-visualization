package org.itnaf.scrollingbhs.javafx.visualization;

import javafx.animation.AnimationTimer;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.beans.property.ObjectProperty;
import javafx.scene.control.Label;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import javafx.util.Duration;
import org.itnaf.scrollingbhs.model.KeystrokeEvent;
import org.itnaf.scrollingbhs.model.KeystrokeTimingData;
import org.itnaf.scrollingbhs.javafx.FxApplication;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

public class KeystrokeTimelinePane extends Pane {

    private final long timelineDurationMillis;
    private final Map<Integer, Color> keyColors = new HashMap<>();
    private final Random random = new Random();
    private Timeline sessionScheduler;
    private AnimationTimer blockGrower;

    public KeystrokeTimelinePane(long timelineDurationSeconds) {
        this.timelineDurationMillis = timelineDurationSeconds * 1000;
        setStyle("-fx-background-color: #2B2B2B;");
    }

    public void setKeystrokeData(ObjectProperty<List<KeystrokeTimingData>> sessionDataProperty) {
        sessionDataProperty.addListener((observable, oldSession, newSession) -> {
            if (newSession != null && !newSession.isEmpty()) {
                playSession(newSession);
            }
        });
    }

    private void playSession(List<KeystrokeTimingData> sessionData) {
        // Stop any existing animations and clear the pane
        if (sessionScheduler != null) sessionScheduler.stop();
        if (blockGrower != null) blockGrower.stop();
        getChildren().clear();

        sessionScheduler = new Timeline();
        final Map<Integer, GrowingBlock> activeBlocks = new HashMap<>();

        // --- 1. Determine Global Session Start Time ---
        long sessionStartTime = sessionData.stream()
                .flatMap(field -> field.getEvents().stream())
                .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                .map(KeystrokeEvent::getTimestamp).orElse(0L);

        if (sessionStartTime == 0L) return;

        // --- 2. Set up layout for each field ---
        Map<String, Double> fieldYPositions = new HashMap<>();
        double yPos = 30.0;
        for (KeystrokeTimingData fieldData : sessionData) {
            if (!fieldYPositions.containsKey(fieldData.getTargetText())) {
                addLabelForField(fieldData, yPos);
                fieldYPositions.put(fieldData.getTargetText(), yPos);
                yPos += 80.0;
            }
        }

        // --- FIX: Define scaleX here, so it's in scope for the AnimationTimer ---
        final double scaleX = (getWidth() - FxApplication.LABEL_WIDTH - 20) / timelineDurationMillis;

        // --- Pre-compute per-field start time (first keydown timestamp) ---
        Map<String, Long> fieldStartTimes = new HashMap<>();
        for (KeystrokeTimingData fieldData : sessionData) {
            fieldData.getEvents().stream()
                    .filter(e -> e.getAction() == 0)
                    .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                    .ifPresent(e -> fieldStartTimes.put(fieldData.getTargetText(), e.getTimestamp()));
        }

        // --- 3. Schedule all events in the master timeline ---
        for (KeystrokeTimingData fieldData : sessionData) {
            double fieldBaseY = fieldYPositions.get(fieldData.getTargetText());
            long fieldStartTime = fieldStartTimes.getOrDefault(fieldData.getTargetText(), sessionStartTime);

            for (KeystrokeEvent event : fieldData.getEvents()) {
                long eventTimeFromStart = event.getTimestamp() - sessionStartTime;

                sessionScheduler.getKeyFrames().add(new KeyFrame(Duration.millis(eventTimeFromStart), e -> {
                    if (event.getAction() == 0) { // Key Press
                        int overlapLevel = (int) activeBlocks.values().stream()
                                .filter(b -> b.fieldBaseY == fieldBaseY).count();
                        double verticalOffset = overlapLevel * 15.0;

                        double rectX = FxApplication.LABEL_WIDTH + ((event.getTimestamp() - fieldStartTime) * scaleX);
                        
                        Rectangle rect = new Rectangle(rectX, fieldBaseY - verticalOffset, 0, 20);
                        rect.setFill(getColorForKey(event.getKeyCode()));
                        rect.setArcWidth(6);
                        rect.setArcHeight(6);
                        
                        getChildren().add(rect);
                        activeBlocks.put(event.getKeyCode(), new GrowingBlock(rect, event.getTimestamp(), fieldBaseY));

                    } else if (event.getAction() == 1) { // Key Release
                        GrowingBlock block = activeBlocks.remove(event.getKeyCode());
                        if (block != null) {
                            block.isGrowing = false; // Stop the block from growing further
                        }
                    }
                }));
            }
        }

        // --- 4. Create the AnimationTimer to grow the blocks ---
        blockGrower = new AnimationTimer() {
            @Override
            public void handle(long now) {
                long currentTime = sessionStartTime + (long)sessionScheduler.getCurrentTime().toMillis();
                for (GrowingBlock block : activeBlocks.values()) {
                    if (block.isGrowing) {
                        long dwellTime = currentTime - block.pressTime;
                        double newWidth = dwellTime * scaleX;
                        if (newWidth > 0) {
                            block.rect.setWidth(newWidth);
                        }
                    }
                }
            }
        };

        sessionScheduler.play();
        blockGrower.start();
    }

    private void addLabelForField(KeystrokeTimingData fieldData, double yPos) {
        String fieldLabelText = fieldData.getTargetText().replace("#", " ");
        Label fieldLabel = new Label(fieldLabelText);
        fieldLabel.setTextFill(Color.WHITE);
        fieldLabel.setLayoutX(10);
        fieldLabel.setLayoutY(yPos - 10);
        getChildren().add(fieldLabel);
    }

    private Color getColorForKey(int keyCode) {
        return keyColors.computeIfAbsent(keyCode, k -> Color.hsb(random.nextDouble() * 360, 0.8, 0.95));
    }

    // Helper class to manage a block that is actively growing
    private static class GrowingBlock {
        final Rectangle rect;
        final long pressTime;
        final double fieldBaseY;
        boolean isGrowing = true;

        GrowingBlock(Rectangle rect, long pressTime, double fieldBaseY) {
            this.rect = rect;
            this.pressTime = pressTime;
            this.fieldBaseY = fieldBaseY;
        }
    }
}
