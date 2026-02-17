package org.itnaf.scrollingbhs.javafx;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Line;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import org.itnaf.scrollingbhs.ScrollingBHSApplication;
import org.itnaf.scrollingbhs.javafx.visualization.KeystrokeTimelinePane;
import org.itnaf.scrollingbhs.service.KeystrokeDataService;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

public class FxApplication extends Application {

    private ConfigurableApplicationContext applicationContext;
    private long timelineDurationSeconds;
    public static final double LABEL_WIDTH = 150.0;

    public static void main(String[] args) {
        launch(args);
    }

    @Override
    public void init() {
        applicationContext = new SpringApplicationBuilder(ScrollingBHSApplication.class).run();
        Environment environment = applicationContext.getBean(Environment.class);
        this.timelineDurationSeconds = environment.getProperty("visualization.timeline.duration-seconds", Long.class, 20L);
    }

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("Keystroke Timing Visualizer");

        KeystrokeDataService keystrokeDataService = applicationContext.getBean(KeystrokeDataService.class);

        KeystrokeTimelinePane timelinePane = new KeystrokeTimelinePane(timelineDurationSeconds);
        timelinePane.setKeystrokeData(keystrokeDataService.sessionDataProperty());

        BorderPane root = new BorderPane();
        root.setCenter(timelinePane);

        Pane axisPane = createAxisPane();
        root.setBottom(axisPane);

        Scene scene = new Scene(root, 1200, 400);

        primaryStage.setScene(scene);
        primaryStage.show();
    }

    private Pane createAxisPane() {
        Pane axisPane = new Pane();
        axisPane.setPrefHeight(30);
        axisPane.setStyle("-fx-background-color: #2B2B2B;");

        double availableWidth = 1200 - LABEL_WIDTH - 20;

        Line axisLine = new Line();
        axisLine.setStroke(Color.WHITE);
        axisLine.setStartX(LABEL_WIDTH);
        axisLine.setEndX(LABEL_WIDTH + availableWidth);
        axisLine.setLayoutY(10);

        axisPane.getChildren().add(axisLine);

        // Add ticks and labels, offset by LABEL_WIDTH to align with the visualization area
        for (int i = 0; i <= timelineDurationSeconds; i++) {
            double x = LABEL_WIDTH + i * (availableWidth / timelineDurationSeconds);
            Line tick = new Line(x, 5, x, 15);
            tick.setStroke(Color.WHITE);
            axisPane.getChildren().add(tick);

            if (i % 5 == 0) { // Label every 5 seconds
                Text label = new Text(i + "s");
                label.setFill(Color.WHITE);
                label.setLayoutX(x - (label.getLayoutBounds().getWidth() / 2));
                label.setLayoutY(25);
                axisPane.getChildren().add(label);
            }
        }
        return axisPane;
    }

    @Override
    public void stop() {
        applicationContext.close();
        Platform.exit();
    }
}
