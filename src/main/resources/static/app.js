"use strict";

angular.module('sampleApp', ['ui.router', 'behavio'])
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('index', {
                url: '',
                templateUrl: 'views/index.html'
            })
            .state('login', {
                url: '/login',
                templateUrl: 'views/login.html',
                controller: function($scope, $http) {
                    // Function to send data to the backend
                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false); // Get data without resetting first

                        $http.post('/api/GetReport', {
                            'username': $scope.username,
                            'password': $scope.password,
                            'behaviodata': behavioData
                        }).then(function(response) {
                            console.log('Data sent successfully', response.data);

                            // --- Direct and Explicit Reset Logic ---
                            // 1. Reset the behavio data collector for the next session.
                            bw.getBehavioData(true);

                            // 2. Clear the model values (ng-model handles DOM automatically).
                            $scope.username = '';
                            $scope.password = '';

                            // 3. Clear and hide the raw data text area.
                            $scope.outputData = '';
                            if (document.getElementById('outputArea')) {
                                document.getElementById('outputArea').style.display = 'none';
                            }
                            console.log('Form fields and behavio data have been reset.');

                        }, function(e) {
                            console.error('Error sending data', e);
                        });
                    };

                    // Function to display the collected data
                    $scope.startMonitor = function() {
                        $scope.outputData = bw.getBehavioData(false);
                        document.getElementById('outputArea').style.display = 'block';
                    };

                    // Function to hide the collected data
                    $scope.stopMonitor = function() {
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    // Function to reset the collected data and clear fields
                    $scope.resetData = function() {
                        bw.getBehavioData(true);
                        $scope.outputData = '';
                        $scope.username = '';
                        $scope.password = '';
                        if (document.getElementById('outputArea')) {
                            document.getElementById('outputArea').style.display = 'none';
                        }
                        console.log('Behavio data and form fields have been reset.');
                    };
                }
            })
            .state('signup', {
                url: '/signup',
                templateUrl: 'views/signup.html',
                controller: function($scope, $http) {
                    // Function to send data to the backend, using email as the user identifier
                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false);

                        $http.post('/api/GetReport', {
                            'name': $scope.name,
                            'email': $scope.email,
                            'phone': $scope.phone,
                            'behaviodata': behavioData
                        }).then(function(response) {
                            console.log('Data sent successfully', response.data);

                            bw.getBehavioData(true);

                            $scope.name = '';
                            $scope.email = '';
                            $scope.phone = '';

                            $scope.outputData = '';
                            if (document.getElementById('outputArea')) {
                                document.getElementById('outputArea').style.display = 'none';
                            }
                            console.log('Form fields and behavio data have been reset.');

                        }, function(e) {
                            console.error('Error sending data', e);
                        });
                    };

                    $scope.startMonitor = function() {
                        $scope.outputData = bw.getBehavioData(false);
                        document.getElementById('outputArea').style.display = 'block';
                    };

                    $scope.stopMonitor = function() {
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    $scope.resetData = function() {
                        bw.getBehavioData(true);
                        $scope.outputData = '';
                        $scope.name = '';
                        $scope.email = '';
                        $scope.phone = '';
                        if (document.getElementById('outputArea')) {
                            document.getElementById('outputArea').style.display = 'none';
                        }
                        console.log('Behavio data and form fields have been reset.');
                    };
                }
            })
            .state('d3viz', {
                url: '/d3',
                templateUrl: 'views/d3viz.html',
                controller: function($scope, $http) {

                    // ── Constants ───────────────────────────────────────────────
                    var LABEL_WIDTH  = 150;
                    var TOP_MARGIN   = 30;
                    var FIELD_HEIGHT = 80;
                    var AXIS_HEIGHT  = 30;
                    var DURATION_MS  = 10000; // 10-second window, matches application.properties

                    // ── State ────────────────────────────────────────────────────
                    var keyColors    = {};   // keyCode -> CSS color string (shared across sessions)
                    var sessions     = [];   // ring buffer of up to 2: [older, newer]
                    var animationId  = null;

                    // ── Helpers ──────────────────────────────────────────────────
                    function colorForKey(keyCode) {
                        if (!keyColors[keyCode]) {
                            var hue = Math.floor(Math.random() * 360);
                            keyColors[keyCode] = 'hsl(' + hue + ', 80%, 60%)';
                        }
                        return keyColors[keyCode];
                    }

                    function parseRawData(behavioDataString) {
                        try {
                            var raw = JSON.parse(behavioDataString);
                            return raw
                                .filter(function(item) { return item && item.length === 3 && Array.isArray(item[2]); })
                                .map(function(item) {
                                    return {
                                        fieldName:  item[0],
                                        targetText: item[1],
                                        events: item[2].map(function(e) {
                                            return { action: e[0], keyCode: e[1], timestamp: e[2] };
                                        })
                                    };
                                });
                        } catch (ex) {
                            console.error('Failed to parse behaviodata', ex);
                            return [];
                        }
                    }

                    function sessionMinTime(sessionData) {
                        var min = Infinity;
                        sessionData.forEach(function(f) {
                            f.events.forEach(function(e) { if (e.timestamp < min) min = e.timestamp; });
                        });
                        return min === Infinity ? 0 : min;
                    }

                    function sessionHeight(sessionData) {
                        var seen = {};
                        var count = 0;
                        sessionData.forEach(function(f) {
                            if (!seen[f.targetText]) { seen[f.targetText] = true; count++; }
                        });
                        return TOP_MARGIN + count * FIELD_HEIGHT;
                    }

                    function fieldStartTime(fieldData, fallback) {
                        var min = Infinity;
                        fieldData.events.forEach(function(e) {
                            if (e.action === 0 && e.keyCode !== 9 && e.timestamp < min) min = e.timestamp;
                        });
                        return min === Infinity ? fallback : min;
                    }

                    function vizWidth() {
                        var el = document.getElementById('viz-container');
                        return el ? el.getBoundingClientRect().width - 20 : 800;
                    }

                    // ── SVG primitives ───────────────────────────────────────────
                    function addTextLabel(svg, text, x, y, color) {
                        svg.append('text')
                            .attr('x', x)
                            .attr('y', y + 4) // +4 to visually center on the row baseline
                            .attr('fill', color)
                            .attr('font-size', '12px')
                            .attr('font-family', 'sans-serif')
                            .text(text);
                    }

                    function addDivider(svg, y, width) {
                        svg.append('line')
                            .attr('x1', 0).attr('y1', y)
                            .attr('x2', width).attr('y2', y)
                            .attr('stroke', '#555555')
                            .attr('stroke-width', 1.5);
                    }

                    function addAxis(svg, y, width) {
                        var scale = d3.scaleLinear()
                            .domain([0, DURATION_MS / 1000])
                            .range([LABEL_WIDTH, width - 20]);

                        var axis = d3.axisBottom(scale)
                            .ticks(DURATION_MS / 1000)
                            .tickFormat(function(d) { return d % 5 === 0 ? d + 's' : ''; });

                        var g = svg.append('g')
                            .attr('transform', 'translate(0,' + y + ')')
                            .call(axis);

                        g.select('.domain').attr('stroke', 'white');
                        g.selectAll('.tick line').attr('stroke', 'white');
                        g.selectAll('.tick text').attr('fill', 'white').attr('font-size', '11px');
                    }

                    // ── Static drawing of a past session ────────────────────────
                    function drawStatic(svg, width, sessionData, yOffset) {
                        var sessionStart = sessionMinTime(sessionData);
                        if (sessionStart === 0) return;

                        var scaleX = (width - LABEL_WIDTH - 20) / DURATION_MS;

                        // Build field Y map
                        var fieldYMap = {};
                        var y = yOffset + TOP_MARGIN;
                        sessionData.forEach(function(fd) {
                            if (fieldYMap[fd.targetText] === undefined) {
                                fieldYMap[fd.targetText] = y;
                                addTextLabel(svg, fd.targetText.replace('#', ' '), 10, y, '#AAAAAA');
                                y += FIELD_HEIGHT;
                            }
                        });

                        // Per-field start times
                        var fstMap = {};
                        sessionData.forEach(function(fd) {
                            fstMap[fd.targetText] = fieldStartTime(fd, sessionStart);
                        });

                        sessionData.forEach(function(fieldData) {
                            var fieldY = fieldYMap[fieldData.targetText];
                            var fst    = fstMap[fieldData.targetText];

                            var events = fieldData.events
                                .filter(function(e) { return e.keyCode !== 9; })
                                .slice().sort(function(a, b) { return a.timestamp - b.timestamp; });

                            var pressMap = {}, xMap = {}, vMap = {}, active = {};

                            events.forEach(function(e) {
                                if (e.action === 0) {
                                    var overlapLevel = Object.keys(active).length;
                                    pressMap[e.keyCode] = e.timestamp;
                                    xMap[e.keyCode]     = LABEL_WIDTH + (e.timestamp - fst) * scaleX;
                                    vMap[e.keyCode]     = overlapLevel * 15;
                                    active[e.keyCode]   = true;
                                } else {
                                    delete active[e.keyCode];
                                    if (pressMap[e.keyCode] !== undefined) {
                                        var w = Math.max(0, (e.timestamp - pressMap[e.keyCode]) * scaleX);
                                        svg.append('rect')
                                            .attr('x',      xMap[e.keyCode])
                                            .attr('y',      fieldY - vMap[e.keyCode])
                                            .attr('width',  w)
                                            .attr('height', 20)
                                            .attr('rx', 3).attr('ry', 3)
                                            .attr('fill',   colorForKey(e.keyCode));
                                        delete pressMap[e.keyCode];
                                        delete xMap[e.keyCode];
                                        delete vMap[e.keyCode];
                                    }
                                }
                            });

                            // Orphaned keydowns (no matching keyup) — draw zero-width rect
                            Object.keys(pressMap).forEach(function(kc) {
                                svg.append('rect')
                                    .attr('x',      xMap[kc])
                                    .attr('y',      fieldY - vMap[kc])
                                    .attr('width',  0)
                                    .attr('height', 20)
                                    .attr('rx', 3).attr('ry', 3)
                                    .attr('fill',   colorForKey(parseInt(kc, 10)));
                            });
                        });
                    }

                    // ── Animated drawing of the current session ──────────────────
                    function drawAnimated(svg, width, sessionData, yOffset) {
                        var sessionStart = sessionMinTime(sessionData);
                        if (sessionStart === 0) return;

                        var scaleX = (width - LABEL_WIDTH - 20) / DURATION_MS;

                        // Build field Y map and draw labels
                        var fieldYMap = {};
                        var y = yOffset + TOP_MARGIN;
                        sessionData.forEach(function(fd) {
                            if (fieldYMap[fd.targetText] === undefined) {
                                fieldYMap[fd.targetText] = y;
                                addTextLabel(svg, fd.targetText.replace('#', ' '), 10, y, 'white');
                                y += FIELD_HEIGHT;
                            }
                        });

                        // Per-field start times
                        var fstMap = {};
                        sessionData.forEach(function(fd) {
                            fstMap[fd.targetText] = fieldStartTime(fd, sessionStart);
                        });

                        // Flatten, filter TAB, and sort all events by timestamp
                        var allEvents = [];
                        sessionData.forEach(function(fd) {
                            fd.events.forEach(function(e) {
                                if (e.keyCode !== 9) {
                                    allEvents.push({
                                        action:     e.action,
                                        keyCode:    e.keyCode,
                                        timestamp:  e.timestamp,
                                        fieldY:     fieldYMap[fd.targetText],
                                        targetText: fd.targetText,
                                        fst:        fstMap[fd.targetText]
                                    });
                                }
                            });
                        });
                        allEvents.sort(function(a, b) { return a.timestamp - b.timestamp; });

                        // Playback state — mirrors the JavaFX Timeline + AnimationTimer approach
                        var eventIndex    = 0;
                        var activeBlocks  = {};   // keyCode -> { rect, pressTime, fieldY, growing }
                        var startedFields = {};   // fieldY -> true

                        var playbackStart = performance.now();

                        function tick(now) {
                            var elapsed = now - playbackStart;

                            // Fire all events whose offset from session start has elapsed
                            while (eventIndex < allEvents.length &&
                                   allEvents[eventIndex].timestamp - sessionStart <= elapsed) {

                                var evt = allEvents[eventIndex++];

                                if (evt.action === 0) { // keydown
                                    // On first keydown in a field, freeze growing blocks in all other fields
                                    if (!startedFields[evt.fieldY]) {
                                        startedFields[evt.fieldY] = true;
                                        Object.keys(activeBlocks).forEach(function(kc) {
                                            var b = activeBlocks[kc];
                                            if (b.fieldY !== evt.fieldY) b.growing = false;
                                        });
                                    }

                                    var overlapLevel = Object.keys(activeBlocks).filter(function(kc) {
                                        return activeBlocks[kc].fieldY === evt.fieldY;
                                    }).length;

                                    var rectX = LABEL_WIDTH + (evt.timestamp - evt.fst) * scaleX;

                                    var rect = svg.append('rect')
                                        .attr('x',      rectX)
                                        .attr('y',      evt.fieldY - overlapLevel * 15)
                                        .attr('width',  0)
                                        .attr('height', 20)
                                        .attr('rx', 3).attr('ry', 3)
                                        .attr('fill',   colorForKey(evt.keyCode));

                                    activeBlocks[evt.keyCode] = {
                                        rect:      rect,
                                        pressTime: evt.timestamp,
                                        fieldY:    evt.fieldY,
                                        growing:   true
                                    };

                                } else { // keyup
                                    if (activeBlocks[evt.keyCode]) {
                                        activeBlocks[evt.keyCode].growing = false;
                                        delete activeBlocks[evt.keyCode];
                                    }
                                }
                            }

                            // Grow all still-active blocks
                            Object.keys(activeBlocks).forEach(function(kc) {
                                var block = activeBlocks[kc];
                                if (block.growing) {
                                    var dwellTime = (sessionStart + elapsed) - block.pressTime;
                                    var newWidth   = Math.max(0, dwellTime * scaleX);
                                    block.rect.attr('width', newWidth);
                                }
                            });

                            if (elapsed < DURATION_MS) {
                                animationId = requestAnimationFrame(tick);
                            } else {
                                // Timeline ended — stop all remaining growing blocks
                                Object.keys(activeBlocks).forEach(function(kc) {
                                    activeBlocks[kc].growing = false;
                                });
                                animationId = null;
                            }
                        }

                        animationId = requestAnimationFrame(tick);
                    }

                    // ── Main render: builds SVG from sessions ring buffer ────────
                    function render() {
                        if (animationId !== null) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }

                        document.getElementById('viz-container').style.display = 'block';

                        var svg  = d3.select('#timeline-svg');
                        svg.selectAll('*').remove();

                        var w    = vizWidth();
                        var curr = sessions[sessions.length - 1];
                        var prev = sessions.length > 1 ? sessions[sessions.length - 2] : null;

                        var topH   = sessionHeight(curr.data);
                        var botH   = prev ? sessionHeight(prev.data) : 0;
                        var totalH = topH + botH + AXIS_HEIGHT;

                        svg.attr('height', totalH);

                        if (prev) {
                            addDivider(svg, topH, w);
                            drawStatic(svg, w, prev.data, topH);
                        }

                        addAxis(svg, topH + botH, w);
                        drawAnimated(svg, w, curr.data, 0);
                    }

                    // ── Angular scope functions ──────────────────────────────────
                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false);

                        // Parse and render immediately — D3 viz is client-side only
                        console.log('D3 viz: raw behaviodata length =', behavioData ? behavioData.length : 0);
                        var parsed = parseRawData(behavioData);
                        console.log('D3 viz: parsed fields =', parsed.length, parsed.map(function(f) { return f.targetText; }));
                        if (parsed.length > 0) {
                            sessions.push({ data: parsed });
                            if (sessions.length > 2) sessions.shift();
                            render();
                        } else {
                            console.warn('D3 viz: no keystroke fields found — type in the fields before submitting');
                        }

                        // Reset captured data and form fields (ng-model handles DOM automatically)
                        bw.getBehavioData(true);
                        $scope.username = '';
                        $scope.password = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';

                        // Also relay to backend so the JavaFX window updates (best-effort)
                        $http.post('/api/GetReport', {
                            'username':    $scope.username,
                            'password':    $scope.password,
                            'behaviodata': behavioData
                        }).then(null, function(e) {
                            console.warn('Backend relay failed (JavaFX window will not update):', e.status);
                        });
                    };

                    $scope.startMonitor = function() {
                        $scope.outputData = bw.getBehavioData(false);
                        document.getElementById('outputArea').style.display = 'block';
                    };

                    $scope.stopMonitor = function() {
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    $scope.resetData = function() {
                        if (animationId !== null) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                        sessions = [];
                        bw.getBehavioData(true);
                        $scope.username  = '';
                        $scope.password  = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                        document.getElementById('viz-container').style.display = 'none';
                        d3.select('#timeline-svg').selectAll('*').remove();
                    };

                    $scope.$on('$destroy', function() {
                        if (animationId !== null) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                    });
                }
            });
    });
