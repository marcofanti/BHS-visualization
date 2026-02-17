package org.itnaf.scrollingbhs;

import org.itnaf.scrollingbhs.javafx.FxApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ScrollingBHSApplication {

    public static void main(String[] args) {
        // Launch the JavaFX application, which will in turn start the Spring Boot context
        FxApplication.main(args);
    }

}
