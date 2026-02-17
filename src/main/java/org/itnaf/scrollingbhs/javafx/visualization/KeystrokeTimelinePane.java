package org.itnaf.scrollingbhs.javafx.visualization;

import javafx.animation.AnimationTimer;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.beans.property.ObjectProperty;
import javafx.scene.control.Label;
import javafx.scene.layout.Pane;
import javafx.stage.Stage;
import javafx.scene.paint.Color;
import javafx.scene.shape.Line;
import javafx.scene.shape.Rectangle;
import javafx.util.Duration;
import org.itnaf.scrollingbhs.model.KeystrokeEvent;
import org.itnaf.scrollingbhs.model.KeystrokeTimingData;
import org.itnaf.scrollingbhs.javafx.FxApplication;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

public class KeystrokeTimelinePane extends Pane {

    private static final double TOP_MARGIN = 30.0;
    private static final double FIELD_HEIGHT = 80.0;

    private final long timelineDurationMillis;
    private final Map<Integer, Color> keyColors = new HashMap<>();
    private final Random random = new Random();
    private Timeline sessionScheduler;
    private AnimationTimer blockGrower;

    // Session history: current is animating in the top half; previous is frozen in the bottom half.
    private List<KeystrokeTimingData> currentSessionData = null;
    private List<KeystrokeTimingData> previousSessionData = null;
    private Stage stage;

    public KeystrokeTimelinePane(long timelineDurationSeconds) {
        this.timelineDurationMillis = timelineDurationSeconds * 1000;
        setStyle("-fx-background-color: #2B2B2B;");
    }

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    public void setKeystrokeData(ObjectProperty<List<KeystrokeTimingData>> sessionDataProperty) {
        sessionDataProperty.addListener((observable, oldSession, newSession) -> {
            if (newSession != null && !newSession.isEmpty()) {
                onNewSession(newSession);
            }
        });
    }

    private void onNewSession(List<KeystrokeTimingData> newSession) {
        // Stop any running animation
        if (sessionScheduler != null) sessionScheduler.stop();
        if (blockGrower != null) blockGrower.stop();

        // Rotate sessions: current → previous, new → current
        previousSessionData = currentSessionData;
        currentSessionData = newSession;

        getChildren().clear();

        double topHeight = sessionHeight(currentSessionData);
        double bottomHeight = previousSessionData != null ? sessionHeight(previousSessionData) : 0;

        resizeStage(topHeight + bottomHeight);

        // Draw previous session fully below the top session
        if (previousSessionData != null) {
            addDivider(topHeight);
            drawSessionStatic(previousSessionData, topHeight);
        }

        // Animate new session starting at Y=0
        animateSession(currentSessionData, 0.0);
    }

    /** Height in pixels required to display all fields of a session. */
    private double sessionHeight(List<KeystrokeTimingData> sessionData) {
        long uniqueFields = sessionData.stream()
                .map(KeystrokeTimingData::getTargetText)
                .distinct()
                .count();
        return TOP_MARGIN + uniqueFields * FIELD_HEIGHT;
    }

    private void resizeStage(double totalPaneHeight) {
        if (stage == null || stage.getScene() == null) return;
        double decorations = stage.getHeight() - stage.getScene().getHeight();
        stage.setHeight(totalPaneHeight + FxApplication.AXIS_HEIGHT + decorations);
    }

    // --- Divider line ---

    private void addDivider(double y) {
        double w = getWidth() > 0 ? getWidth() : 1200;
        Line divider = new Line(0, y, w, y);
        divider.setStroke(Color.web("#555555"));
        divider.setStrokeWidth(1.5);
        getChildren().add(divider);
    }

    // --- Static (fully drawn) rendering of a past session ---

    private void drawSessionStatic(List<KeystrokeTimingData> sessionData, double yOffset) {
        long sessionStartTime = sessionData.stream()
                .flatMap(f -> f.getEvents().stream())
                .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                .map(KeystrokeEvent::getTimestamp).orElse(0L);
        if (sessionStartTime == 0L) return;

        double scaleX = (getWidth() - FxApplication.LABEL_WIDTH - 20) / timelineDurationMillis;

        // Build ordered field Y positions
        Map<String, Double> fieldYPositions = new HashMap<>();
        double yPos = yOffset + TOP_MARGIN;
        for (KeystrokeTimingData fieldData : sessionData) {
            if (!fieldYPositions.containsKey(fieldData.getTargetText())) {
                addFieldLabel(fieldData, yPos, Color.web("#AAAAAA"));
                fieldYPositions.put(fieldData.getTargetText(), yPos);
                yPos += FIELD_HEIGHT;
            }
        }

        // Per-field start times (first non-TAB keydown)
        Map<String, Long> fieldStartTimes = new HashMap<>();
        for (KeystrokeTimingData fieldData : sessionData) {
            fieldData.getEvents().stream()
                    .filter(e -> e.getAction() == 0 && e.getKeyCode() != 9)
                    .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                    .ifPresent(e -> fieldStartTimes.put(fieldData.getTargetText(), e.getTimestamp()));
        }

        // Draw each field's rectangles
        for (KeystrokeTimingData fieldData : sessionData) {
            double fieldBaseY = fieldYPositions.get(fieldData.getTargetText());
            long fieldStartTime = fieldStartTimes.getOrDefault(fieldData.getTargetText(), sessionStartTime);

            // Sort events by timestamp, skipping TAB
            List<KeystrokeEvent> events = fieldData.getEvents().stream()
                    .filter(e -> e.getKeyCode() != 9)
                    .sorted(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                    .collect(Collectors.toList());

            // Replay event sequence to compute overlap levels and draw final rectangles.
            // Mirrors the animation logic: activeBlocks keyed by keyCode, one per key at a time.
            Map<Integer, Long> pressTimeMap = new HashMap<>();
            Map<Integer, Double> pressXMap = new HashMap<>();
            Map<Integer, Double> pressVOffsetMap = new HashMap<>();
            Set<Integer> currentlyActive = new HashSet<>();

            for (KeystrokeEvent e : events) {
                if (e.getAction() == 0) { // keydown
                    int overlapLevel = currentlyActive.size();
                    double verticalOffset = overlapLevel * 15.0;
                    double rectX = FxApplication.LABEL_WIDTH + ((e.getTimestamp() - fieldStartTime) * scaleX);

                    pressTimeMap.put(e.getKeyCode(), e.getTimestamp());
                    pressXMap.put(e.getKeyCode(), rectX);
                    pressVOffsetMap.put(e.getKeyCode(), verticalOffset);
                    currentlyActive.add(e.getKeyCode());

                } else if (e.getAction() == 1) { // keyup
                    currentlyActive.remove(e.getKeyCode());

                    if (pressTimeMap.containsKey(e.getKeyCode())) {
                        long press = pressTimeMap.remove(e.getKeyCode());
                        double rectX = pressXMap.remove(e.getKeyCode());
                        double vOffset = pressVOffsetMap.remove(e.getKeyCode());

                        double width = Math.max(0, (e.getTimestamp() - press) * scaleX);
                        Rectangle rect = new Rectangle(rectX, fieldBaseY - vOffset, width, 20);
                        rect.setFill(getColorForKey(e.getKeyCode()));
                        rect.setArcWidth(6);
                        rect.setArcHeight(6);
                        getChildren().add(rect);
                    }
                }
            }

            // Draw orphaned keydowns (no matching keyup) with zero width
            for (Map.Entry<Integer, Long> entry : pressTimeMap.entrySet()) {
                int keyCode = entry.getKey();
                double rectX = pressXMap.get(keyCode);
                double vOffset = pressVOffsetMap.get(keyCode);
                Rectangle rect = new Rectangle(rectX, fieldBaseY - vOffset, 0, 20);
                rect.setFill(getColorForKey(keyCode));
                rect.setArcWidth(6);
                rect.setArcHeight(6);
                getChildren().add(rect);
            }
        }
    }

    // --- Animated rendering of the current session in the top half ---

    private void animateSession(List<KeystrokeTimingData> sessionData, double yOffset) {
        sessionScheduler = new Timeline();
        final Map<Integer, GrowingBlock> activeBlocks = new HashMap<>();

        long sessionStartTime = sessionData.stream()
                .flatMap(field -> field.getEvents().stream())
                .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                .map(KeystrokeEvent::getTimestamp).orElse(0L);

        if (sessionStartTime == 0L) return;

        Map<String, Double> fieldYPositions = new HashMap<>();
        double yPos = yOffset + TOP_MARGIN;
        for (KeystrokeTimingData fieldData : sessionData) {
            if (!fieldYPositions.containsKey(fieldData.getTargetText())) {
                addFieldLabel(fieldData, yPos, Color.WHITE);
                fieldYPositions.put(fieldData.getTargetText(), yPos);
                yPos += FIELD_HEIGHT;
            }
        }

        final double scaleX = (getWidth() - FxApplication.LABEL_WIDTH - 20) / timelineDurationMillis;

        Map<String, Long> fieldStartTimes = new HashMap<>();
        for (KeystrokeTimingData fieldData : sessionData) {
            fieldData.getEvents().stream()
                    .filter(e -> e.getAction() == 0 && e.getKeyCode() != 9)
                    .min(Comparator.comparingLong(KeystrokeEvent::getTimestamp))
                    .ifPresent(e -> fieldStartTimes.put(fieldData.getTargetText(), e.getTimestamp()));
        }

        final Set<Double> startedFields = new HashSet<>();

        for (KeystrokeTimingData fieldData : sessionData) {
            double fieldBaseY = fieldYPositions.get(fieldData.getTargetText());
            long fieldStartTime = fieldStartTimes.getOrDefault(fieldData.getTargetText(), sessionStartTime);

            for (KeystrokeEvent event : fieldData.getEvents()) {
                if (event.getKeyCode() == 9) continue;

                long eventTimeFromStart = event.getTimestamp() - sessionStartTime;

                sessionScheduler.getKeyFrames().add(new KeyFrame(Duration.millis(eventTimeFromStart), e -> {
                    if (event.getAction() == 0) {
                        if (!startedFields.contains(fieldBaseY)) {
                            startedFields.add(fieldBaseY);
                            activeBlocks.values().stream()
                                    .filter(b -> b.fieldBaseY != fieldBaseY)
                                    .forEach(b -> b.isGrowing = false);
                        }

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

                    } else if (event.getAction() == 1) {
                        GrowingBlock block = activeBlocks.remove(event.getKeyCode());
                        if (block != null) {
                            block.isGrowing = false;
                        }
                    }
                }));
            }
        }

        blockGrower = new AnimationTimer() {
            @Override
            public void handle(long now) {
                long currentTime = sessionStartTime + (long) sessionScheduler.getCurrentTime().toMillis();
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

        sessionScheduler.setOnFinished(e -> {
            activeBlocks.values().forEach(block -> block.isGrowing = false);
            activeBlocks.clear();
            blockGrower.stop();
        });

        sessionScheduler.play();
        blockGrower.start();
    }

    private void addFieldLabel(KeystrokeTimingData fieldData, double yPos, Color color) {
        String text = fieldData.getTargetText().replace("#", " ");
        Label label = new Label(text);
        label.setTextFill(color);
        label.setLayoutX(10);
        label.setLayoutY(yPos - 10);
        getChildren().add(label);
    }

    private Color getColorForKey(int keyCode) {
        return keyColors.computeIfAbsent(keyCode, k -> Color.hsb(random.nextDouble() * 360, 0.8, 0.95));
    }

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
