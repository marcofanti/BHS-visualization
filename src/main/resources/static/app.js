"use strict";

angular.module('sampleApp', ['ui.router', 'behavio'])

    // ── Shared D3 Keystroke Visualization Factory ────────────────────────────────
    .factory('keystrokeViz', function() {
        var LABEL_WIDTH  = 150;
        var TOP_MARGIN   = 30;
        var FIELD_HEIGHT = 80;
        var AXIS_HEIGHT  = 30;
        var DURATION_MS  = 10000;
        var keyColors    = {};  // shared across all pages

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
            var seen = {}, count = 0;
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

        function addTextLabel(svg, text, x, y, color) {
            svg.append('text')
                .attr('x', x)
                .attr('y', y + 4)
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

        function drawStatic(svg, width, sessionData, yOffset) {
            var sessionStart = sessionMinTime(sessionData);
            if (sessionStart === 0) return;
            var scaleX = (width - LABEL_WIDTH - 20) / DURATION_MS;
            var fieldYMap = {};
            var y = yOffset + TOP_MARGIN;
            sessionData.forEach(function(fd) {
                if (fieldYMap[fd.targetText] === undefined) {
                    fieldYMap[fd.targetText] = y;
                    addTextLabel(svg, fd.targetText.replace('#', ' '), 10, y, '#AAAAAA');
                    y += FIELD_HEIGHT;
                }
            });
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

        // onFrame(id) is called each rAF with the new id; onStop() is called when animation ends
        function drawAnimated(svg, width, sessionData, yOffset, onFrame, onStop) {
            var sessionStart = sessionMinTime(sessionData);
            if (sessionStart === 0) return;
            var scaleX = (width - LABEL_WIDTH - 20) / DURATION_MS;
            var fieldYMap = {};
            var y = yOffset + TOP_MARGIN;
            sessionData.forEach(function(fd) {
                if (fieldYMap[fd.targetText] === undefined) {
                    fieldYMap[fd.targetText] = y;
                    addTextLabel(svg, fd.targetText.replace('#', ' '), 10, y, 'white');
                    y += FIELD_HEIGHT;
                }
            });
            var fstMap = {};
            sessionData.forEach(function(fd) {
                fstMap[fd.targetText] = fieldStartTime(fd, sessionStart);
            });
            var allEvents = [];
            sessionData.forEach(function(fd) {
                fd.events.forEach(function(e) {
                    if (e.keyCode !== 9) {
                        allEvents.push({
                            action:     e.action,
                            keyCode:    e.keyCode,
                            timestamp:  e.timestamp,
                            fieldY:     fieldYMap[fd.targetText],
                            fst:        fstMap[fd.targetText]
                        });
                    }
                });
            });
            allEvents.sort(function(a, b) { return a.timestamp - b.timestamp; });
            var eventIndex    = 0;
            var activeBlocks  = {};
            var startedFields = {};
            var playbackStart = performance.now();

            function tick(now) {
                var elapsed = now - playbackStart;
                while (eventIndex < allEvents.length &&
                       allEvents[eventIndex].timestamp - sessionStart <= elapsed) {
                    var evt = allEvents[eventIndex++];
                    if (evt.action === 0) {
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
                        var rect = svg.append('rect')
                            .attr('x',      LABEL_WIDTH + (evt.timestamp - evt.fst) * scaleX)
                            .attr('y',      evt.fieldY - overlapLevel * 15)
                            .attr('width',  0)
                            .attr('height', 20)
                            .attr('rx', 3).attr('ry', 3)
                            .attr('fill',   colorForKey(evt.keyCode));
                        activeBlocks[evt.keyCode] = { rect: rect, pressTime: evt.timestamp, fieldY: evt.fieldY, growing: true };
                    } else {
                        if (activeBlocks[evt.keyCode]) {
                            activeBlocks[evt.keyCode].growing = false;
                            delete activeBlocks[evt.keyCode];
                        }
                    }
                }
                Object.keys(activeBlocks).forEach(function(kc) {
                    var block = activeBlocks[kc];
                    if (block.growing) {
                        block.rect.attr('width', Math.max(0, (sessionStart + elapsed - block.pressTime) * scaleX));
                    }
                });
                if (elapsed < DURATION_MS) {
                    onFrame(requestAnimationFrame(tick));
                } else {
                    Object.keys(activeBlocks).forEach(function(kc) { activeBlocks[kc].growing = false; });
                    onStop();
                }
            }
            onFrame(requestAnimationFrame(tick));
        }

        // ── Factory API ──────────────────────────────────────────────────────────
        return {
            parseRawData: parseRawData,

            // Returns a new viz instance bound to the current page's #viz-container / #timeline-svg
            create: function() {
                var sessions    = [];
                var animationId = null;

                function render() {
                    if (animationId !== null) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }
                    var container = document.getElementById('viz-container');
                    if (!container) {
                        console.error('keystrokeViz: #viz-container not found — template may be stale, try a hard refresh (Cmd+Shift+R)');
                        return;
                    }
                    container.style.display = 'block';
                    var svg  = d3.select('#timeline-svg');
                    svg.selectAll('*').remove();
                    var w    = vizWidth();
                    var curr = sessions[sessions.length - 1];
                    var prev = sessions.length > 1 ? sessions[sessions.length - 2] : null;
                    var topH   = sessionHeight(curr.data);
                    var botH   = prev ? sessionHeight(prev.data) : 0;
                    svg.attr('height', topH + botH + AXIS_HEIGHT);
                    if (prev) {
                        addDivider(svg, topH, w);
                        drawStatic(svg, w, prev.data, topH);
                    }
                    addAxis(svg, topH + botH, w);
                    drawAnimated(svg, w, curr.data, 0,
                        function(id) { animationId = id; },
                        function()   { animationId = null; }
                    );
                }

                return {
                    addSession: function(data) {
                        sessions.push({ data: data });
                        if (sessions.length > 2) sessions.shift();
                    },
                    render: render,
                    reset: function() {
                        if (animationId !== null) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                        sessions = [];
                        document.getElementById('viz-container').style.display = 'none';
                        d3.select('#timeline-svg').selectAll('*').remove();
                    },
                    destroy: function() {
                        if (animationId !== null) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                    }
                };
            }
        };
    })

    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('index', {
                url: '',
                templateUrl: 'views/index.html?v=1'
            })
            .state('login', {
                url: '/login',
                templateUrl: 'views/login.html?v=1',
                controller: function($scope, $http, keystrokeViz) {
                    var viz = keystrokeViz.create();

                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false);
                        console.log('Login viz: raw behaviodata length =', behavioData ? behavioData.length : 0);
                        var parsed = keystrokeViz.parseRawData(behavioData);
                        console.log('Login viz: parsed fields =', parsed.length, parsed.map(function(f) { return f.targetText; }));
                        if (parsed.length > 0) {
                            viz.addSession(parsed);
                            viz.render();
                        } else {
                            console.warn('Login viz: no keystroke fields found — type in the fields first');
                        }
                        bw.getBehavioData(true);
                        $scope.username = '';
                        $scope.password = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                        $http.post('/api/GetReport', {
                            'username':    $scope.username,
                            'password':    $scope.password,
                            'behaviodata': behavioData
                        }).then(null, function(e) {
                            console.warn('Backend relay failed:', e.status);
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
                        viz.reset();
                        bw.getBehavioData(true);
                        $scope.username = '';
                        $scope.password = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    $scope.$on('$destroy', function() { viz.destroy(); });
                }
            })
            .state('signup', {
                url: '/signup',
                templateUrl: 'views/signup.html?v=1',
                controller: function($scope, $http, keystrokeViz) {
                    var viz = keystrokeViz.create();

                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false);
                        console.log('Signup viz: raw behaviodata length =', behavioData ? behavioData.length : 0);
                        var parsed = keystrokeViz.parseRawData(behavioData);
                        console.log('Signup viz: parsed fields =', parsed.length, parsed.map(function(f) { return f.targetText; }));
                        if (parsed.length > 0) {
                            viz.addSession(parsed);
                            viz.render();
                        } else {
                            console.warn('Signup viz: no keystroke fields found — type in the fields first');
                        }
                        bw.getBehavioData(true);
                        $scope.name = '';
                        $scope.email = '';
                        $scope.phone = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                        $http.post('/api/GetReport', {
                            'name':        $scope.name,
                            'email':       $scope.email,
                            'phone':       $scope.phone,
                            'behaviodata': behavioData
                        }).then(null, function(e) {
                            console.warn('Backend relay failed:', e.status);
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
                        viz.reset();
                        bw.getBehavioData(true);
                        $scope.name = '';
                        $scope.email = '';
                        $scope.phone = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    $scope.$on('$destroy', function() { viz.destroy(); });
                }
            })
            .state('d3viz', {
                url: '/d3',
                templateUrl: 'views/d3viz.html?v=1',
                controller: function($scope, $http, keystrokeViz) {
                    var viz = keystrokeViz.create();

                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false);
                        console.log('D3 viz: raw behaviodata length =', behavioData ? behavioData.length : 0);
                        var parsed = keystrokeViz.parseRawData(behavioData);
                        console.log('D3 viz: parsed fields =', parsed.length, parsed.map(function(f) { return f.targetText; }));
                        if (parsed.length > 0) {
                            viz.addSession(parsed);
                            viz.render();
                        } else {
                            console.warn('D3 viz: no keystroke fields found — type in the fields before submitting');
                        }
                        bw.getBehavioData(true);
                        $scope.username = '';
                        $scope.password = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                        $http.post('/api/GetReport', {
                            'username':    $scope.username,
                            'password':    $scope.password,
                            'behaviodata': behavioData
                        }).then(null, function(e) {
                            console.warn('Backend relay failed:', e.status);
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
                        viz.reset();
                        bw.getBehavioData(true);
                        $scope.username  = '';
                        $scope.password  = '';
                        $scope.outputData = '';
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    $scope.$on('$destroy', function() { viz.destroy(); });
                }
            });
    });
