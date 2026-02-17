"use strict";

var Monitor = function () {
	this.init();
};

Monitor.prototype = {
	collectorEndpoint: bhw_ajax_endpoint,
	isOpera: !! window.opera || navigator.userAgent.indexOf(" OPR/")>= 0,
    isFirefox: typeof InstallTrigger !== "undefined", // Firefox 1.0+
    isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor")> 0,

    isChrome: !! window.chrome && !this.isOpera, // Chrome 1+
    isIE9: /(MSIE 9.0)/g.test(navigator.userAgent),
    isIE10: navigator.userAgent.toString().toLowerCase().indexOf("trident/6")> -1,
    isIE11: !(window.ActiveXObject) && "ActiveXObject" in window,
    isIE: /(MSIE)/g.test(navigator.userAgent),
    isIOS: /(iPad|iPhone|iPod)/g.test(navigator.userAgent),
	behavioData: [],
	anonMap: [],
	startTime: new Date().getTime(),
	lastViewport: [-1, -1],
	lastTarget: null,
	capture: true,
	hasSent: false,
	behavio_hidden: null,
	behavio_hidden_id: "behavio_hidden",
	ignoreFields: [], // [FIELDNAME1, FIELDNAME2, FIELDNAME3 ETC]
	haveMouse: false, // true/false
	lastKey: -1,
	textLength: {},
	behavioweb_config: {
		anonymous: {
			by_name: [],
			by_id: [],
			by_type: ['password'] // default 'password'
		}
	},
	bindListeners: false, // if the script automatically should add listeners for input fields etc.
	isAndroid: (/android (\d+)/i.test(window.navigator.userAgent)),
	isFirefox: (/firefox/i.test(window.navigator.userAgent)),
	hasFallbackListeners: false,
	init: function () {
		var goodToGoInterval;
		goodToGoInterval = setInterval(function() {
			if (document.readyState == "complete") {
				bw.startMonitor();
				this.initialized = true;
				clearInterval(goodToGoInterval);
			}
		}, 10);
	},
	createCORSRequest: function(method, url, async, cb) {
        async = false;
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // XHR for Chrome/Firefox/Opera/Safari modern IE.
            xhr.open(method, url, async);
            if (bw.isIE && !async) {
                xhr.timeout = bw.syncTimeout;
            }
            //xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            //xhr.setRequestHeader("Content-Type", "text/plain");
            xhr.onload = function(e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        cb(xhr);
                    } else {
                        cb(xhr);
                    }
                }
            };
        } else if (typeof XDomainRequest != "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url, async);
            if (!async) {
                xhr.timeout = bw.syncTimeout;
            }
        } else if (typeof ActiveXObject != "undefined") {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        } else {
            // CORS not supported.
            xhr = null;
        }
        if (xhr !== null && typeof xhr.setRequestHeader !== "undefined") {
            //xhr.setRequestHeader("Content-Type", "text/plain");
            //xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        }
        return xhr;
    },
	prepHttpStr: function(options) {
		var retStr = "tenantid=default_tenant";
		if (!(options.data.journeyid === "" || typeof options.data.journeyid === "undefined")) {
			retStr += "&journeyid=" + encodeURIComponent(options.data.journeyid);
		}
		//if (!(options.data.sessionid === "" || typeof options.data.sessionid === "undefined")) {
		//    retStr += "&sessionid=" + encodeURIComponent(options.data.sessionid);
		//}
		//if (!(options.data.userid === "" || typeof options.data.userid === "undefined")) {
		//    retStr += "&userid=" + encodeURIComponent(options.data.userid);
		//}
		if (!(options.data.notes === "" || typeof options.data.notes === "undefined")) {
			retStr += "&notes=" + encodeURIComponent(options.data.notes);
		}
		if (typeof options.data.behavioData !== "undefined") {
			retStr += "&data=" + encodeURIComponent(JSON.stringify(options.data.behavioData));
		}
		return retStr;
	},
	prepHttpStrGetReport: function(options) {
		var retStr = "tenantid=default_tenant";
		retStr += "&reportFlags=0";
		retStr += "&useragent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36";
		retStr += "&operatorFlags=1954";
		retStr += "&ip=127.0.0.1";
		if (!(options.data.userid === "" || typeof options.data.userid === "undefined")) {
		    retStr += "&userid=" + encodeURIComponent(options.data.userid);
		}
		if (!(options.data.notes === "" || typeof options.data.notes === "undefined")) {
			retStr += "&notes=" + encodeURIComponent(options.data.notes);
		}
		if (typeof options.data.behavioData !== "undefined") {
			retStr += "&timing=" + JSON.stringify(options.data.behavioData);
		}
		return retStr;
	},
	ajax: function(options) {
		var async;
		var url = bw.collectorEndpoint;

		var type = options.type;
		async = options.async;

		var xhr = bw.createCORSRequest("post", url, async, options.callback);

		bw.httpStr = bw.prepHttpStr(options);
		setTimeout(function() {
			xhr.send(bw.httpStr);
		}, 0);
	},
	ajaxGetReport: function(options) {
		var async;
		var url = bw.collectorEndpoint;

		var type = options.type;
		async = options.async;

		var xhr = bw.createCORSRequest("post", url, async, options.callback);

		bw.httpStr = bw.prepHttpStrGetReport(options);
		setTimeout(function() {
			xhr.send(bw.httpStr);
		}, 0);
	},
	submitHandler: function(e) {
		document.getElementById(bw.behavio_hidden_id).value = JSON.stringify(bw.behavioData, "", "");
	},
	getBehavioData: function(reset) {
		var data = JSON.stringify(bw.behavioData, "", "");
		if (reset) {
			bw.behavioData = [];
			bw.startMonitor(false);
		}
		return data;
	},
	resetBehavioData: function() {
        bw.behavioData = [];
		bw.startMonitor(false);
        bw.hasSent = false;
        return true;
    },
	sendData: function(journeyid, sessionid, userid, notes, cb) {
		if (!bw.hasSent) {
			bw.hasSent = true;

			/* Integritydata */
			var path = window.location.pathname.split('?')[0];
			integrityData(bw, path);

			var ajaxData = {
				"journeyid": journeyid,
				"sessionid": sessionid,
				"userid": userid,
				"notes": notes,
				"behavioData": bw.behavioData
			};
			bw.ajax({
				type: "post",
				url: bw.collectorEndpoint,
				async: true,
				data: ajaxData,
				callback: cb
			});
		} else {
			return true;
		}
	},
	sendDataGetReport: function(journeyid, sessionid, userid, notes, cb) {
		if (!bw.hasSent) {
			bw.hasSent = true;

			/* Integritydata */
			var path = window.location.pathname.split('?')[0];
			integrityData(bw, path);

			var ajaxData = {
				"sessionid": sessionid,
				"userid": userid,
				"notes": notes,
				"behavioData": bw.behavioData
			};
			bw.ajaxGetReport({
				type: "post",
				url: bw.collectorEndpoint,
				async: true,
				data: ajaxData,
				callback: cb
			});
		} else {
			return true;
		}
	},
	addKeyEvent: function(target, monitorType, data) {
		var i;
		var l;
		for (i = this.behavioData.length - 1; i >= -1; i--) {
			if (i == -1) {
				if (this.behavioData[0] == null) {
					this.behavioData[0] = [];
					if (monitorType == "a") {
						this.behavioData[0][0] = "fa";
					} else if (monitorType == "n") {
						this.behavioData[0][0] = "f";
					}
					this.behavioData[0][1] = target;
					this.behavioData[0][2] = [];
					this.behavioData[0][2][0] = data;
				} else {
					l = this.behavioData.length;
					this.behavioData[l] = [];
					if (monitorType == "a") {
						this.behavioData[l][0] = "fa";
					} else if (monitorType == "n") {
						this.behavioData[l][0] = "f";
					}
					this.behavioData[l][1] = target;
					this.behavioData[l][2] = [];
					this.behavioData[l][2][0] = data;
				}
				break;
			} else {
				if (monitorType == "a") {
					if (this.behavioData[i][0] !== "fa") {
						continue;
					}
				} else if (monitorType == "n") {
					if (this.behavioData[i][0] !== "f") {
						continue;
					}
				}
				if (this.behavioData[i][1] == target) {
					this.behavioData[i][2][this.behavioData[i][2].length] = data;
					break;
				}
			}
		}
	},
	addEvent: function(data, field) {
		var i;
		var l;
		for (i = this.behavioData.length - 1; i >= -1; i--) {
			if (i == -1) {
				if (this.behavioData[0] == null) {
					this.behavioData[0] = [];
					this.behavioData[0][0] = "c";
					this.behavioData[0][1] = [];
					this.behavioData[0][1][0] = data;
					this.behavioData[0][2] = window.location.pathname.split('?')[0];
					
				} else {
					l = this.behavioData.length;
					this.behavioData[l] = [];
					this.behavioData[l][0] = "c";
					this.behavioData[l][1] = [];
					this.behavioData[l][1][0] = data;
					this.behavioData[l][2] = window.location.pathname.split('?')[0];
				}
				break;
			} else {
				if (this.behavioData[i][0] == "c") {
					this.behavioData[i][1][this.behavioData[i][1].length] = data;
					break;
				}
			}
		}
	},
	getTimestamp: function() {
		var dobj = new Date();
		return dobj.getTime() - this.startTime;
	},
	checkTarget: function(event) {
		var element = document.elementFromPoint(event.clientX, event.clientY);

		var data = [];
		if (element != null && element != this.lastTarget && typeof element != 'undefined' && typeof element.parentNode != 'undefined' ) {
			data[0] = "t";
			data[1] = element.nodeName + "#" + element.id + "#" + element.parentNode.nodeName + "#" + element.parentNode.id;
			data[2] = bw.getTimestamp();
			this.lastTarget = element;
			bw.addEvent(data);
		}
	},
	checkViewport: function() {
		if (this.lastViewport[0] !== document.documentElement.clientWidth || this.lastViewport[1] !== document.documentElement.clientHeight) {
			var data = [];
			data[0] = "v";
			data[1] = document.documentElement.clientWidth;
			data[2] = document.documentElement.clientHeight;
			data[3] = bw.getTimestamp();

			this.lastViewport[0] = document.documentElement.clientWidth;
			this.lastViewport[1] = document.documentElement.clientHeight;

			bw.addEvent(data);
		}
	},

	mouseMoveHandler: function(event) {
		var data = [];
		data[0] = "mm";
		data[1] = event.clientX;
		data[2] = event.clientY;
		data[3] = bw.getTimestamp();

		bw.checkTarget(event);
		bw.checkViewport();

		bw.addEvent(data);
	},

	mouseDownHandler: function(event) {
		var data = [];

		data[0] = "md";
		data[1] = event.clientX;
		data[2] = event.clientY;
		data[3] = bw.getTimestamp();
		data[4] = event.button;

		bw.checkTarget(event);
		bw.checkViewport();

		bw.addEvent(data);
	},

	mouseUpHandler: function(event) {
		var data = [];

		data[0] = "mu";
		data[1] = event.clientX;
		data[2] = event.clientY;
		data[3] = bw.getTimestamp();
		data[4] = event.button;

		bw.checkTarget(event);
		bw.checkViewport();

		bw.addEvent(data);
	},

	keyHandler: function(event) {
		var i;
		var data = [];
		var keyCode = (event.keyCode == 0 ? 229 : event.keyCode);
		var keyId = keyCode;
		var field = null;
		var source = event.currentTarget ? event.currentTarget : event.srcElement;
		var monitorType = "n";
		var caretPos = 0;

		if (keyCode == 229 && event.type == "keydown" && !bw.isFirefox && !bw.hasFallbackListeners) {
			bw.fallbackListeners();
			bw.hasFallbackListeners = true;
		}
		var field = source.type + '#' + source.name;

		if (keyCode == null) {
			keyCode = -500;
			keyId = -500;
		}

		if (monitorType !== "a") {
			for (i = 0; i < bw.behavioweb_config.anonymous.by_id.length && monitorType !== "a"; i++) {
				if (bw.behavioweb_config.anonymous.by_id[i] == source.id) {
					monitorType = "a";
				}
			}
			for (i = 0; i < bw.behavioweb_config.anonymous.by_name.length && monitorType !== "a"; i++) {
				if (bw.behavioweb_config.anonymous.by_name[i] == source.name) {
					monitorType = "a";
				}
			}
			for (i = 0; i < bw.behavioweb_config.anonymous.by_type.length && monitorType !== "a"; i++) {
				if (bw.behavioweb_config.anonymous.by_type[i] == source.type) {
					monitorType = "a";
				}
			}
		}

		if (monitorType == "a") {
			if (keyCode == 9 || keyCode == 13) {
				return;
			}
			if (document.selection) {
				source.focus();
				var Sel = document.selection.createRange();
				var SelLength = document.selection.createRange().text.length;
				Sel.moveStart('character', -source.value.length);
				caretPos = Sel.text.length - SelLength;
			} else if (source.selectionStart || source.selectionStart == '0') {
				caretPos = source.selectionStart;
			}
			if (keyCode == 8) {
				if (event.type == "keydown") {
					if (bw.anonMap[keyCode] == null) {
						bw.anonMap[keyCode] = caretPos;
					}
					data[0] = -1;
					data[1] = caretPos;
				} else if (event.type == "keyup") {
					data[0] = -2;
					data[1] = bw.anonMap[keyCode];
					bw.anonMap[keyCode] = null;
				}
			} else if (keyCode == 46) {
				if (event.type == "keydown") {
					if (bw.anonMap[keyCode] == null) {
						bw.anonMap[keyCode] = caretPos;
					}
					data[0] = -3;
					data[1] = caretPos;
				} else if (event.type == "keyup") {
					data[0] = -4;
					data[1] = bw.anonMap[keyCode];
					bw.anonMap[keyCode] = null;
				}
			} else {
				if (event.type == "keydown") {
					if (bw.anonMap[keyCode] == null) {
						bw.anonMap[keyCode] = caretPos;
					}
					data[0] = 0;
					data[1] = caretPos;
				} else if (event.type == "keyup") {
					data[0] = 1;
					data[1] = bw.anonMap[keyCode];
					bw.anonMap[keyCode] = null;
				}
			}
		} else {
			if (keyCode == 229 && event.type == "keydown") {
				bw.setTextLength(field, source.value.length);
			} else if (keyCode == 229 && event.type == "keyup") {
				var s 	= bw.textLength[field] || [];
				var ul 	= source.value.length,
					dl 	= s.pop() || 0;

				if (bw.lastKey != -1 || ul < dl) {
					if (ul - dl <= 1) {
						keyId = (ul < dl ? 8 : bw.lastKey);
					}

					var targetData = bw.getTargetData(field);
					var prevKey = targetData[targetData.length - 1];
					if (prevKey[1] == 229) {
						prevKey[1] = keyId;
					}
					bw.lastKey = -1;
				}
			}
			if (event.type == "keyup") {
				data[0] = 1;
				data[1] = keyId;
			} else if (event.type == "keydown") {
				data[0] = 0;
				data[1] = keyId;
			}
		}
		data[2] = bw.getTimestamp();
		if (data[1] != null) {
			bw.addKeyEvent(field, monitorType, data);
		}
	},
	getTargetData: function(target) {
		for (var i = this.behavioData.length - 1; i >= 0; i--) {
			if (this.behavioData[i][1] == target) {
				return this.behavioData[i][2];
			}
		}
	},
	setLastKey: function(k) {
		bw.lastKey = k;
	},
	setTextLength: function(target, len) {
		(bw.textLength[target] = (bw.textLength[target] || [])).push(len);
	},
	keyTransformer: function(e) {
		if (e.data && e.data.length == 1) {
			bw.setLastKey(e.data.toUpperCase().charCodeAt(0));
		}
	},
	keyComposition: function(e) {
		if (e.data) {
			bw.setLastKey(e.data.toUpperCase().charCodeAt(e.data.length-1));
		}
	},
	monitorField: function(field) {
		if (field.length) {
			for (var i = 0; i < field.length; i++) {
				this.monitorField(field[i]);
			}
		} else {
			if (field.addEventListener) {
				field.addEventListener("keydown", this.keyHandler, false);
				field.addEventListener("keyup", this.keyHandler, false);
				if (this.isAndroid && !this.isFirefox) {
					this.fallbackListeners(field);
				}
			} else if (field.attachEvent) {
				field.attachEvent("onkeydown", this.keyHandler);
				field.attachEvent("onkeyup", this.keyHandler);
			}
		}
	},
	removeListener: function(field) {
		if (field.length) {
			for (var i = 0; i < field.length; i++) {
				this.removeListener(field[i]);
			}
		} else {
			
			var target = field.type + '#' + field.name;
			for (var i = this.behavioData.length - 1; i >= 0; i--) {
				if (this.behavioData[i][1] == target) {
					this.behavioData.splice(i, 1);
					break;
				}
			}
			
			if (field.addEventListener) {
				field.removeEventListener("keydown", this.keyHandler, false);
				field.removeEventListener("keyup", this.keyHandler, false);
				if (this.isAndroid && !this.isFirefox) {
					this.removeFallbackListeners(field);
				}
			} else if (field.attachEvent) {
				field.detachEvent("onkeydown", this.keyHandler);
				field.detachEvent("onkeyup", this.keyHandler);
			}
		}

	},
	fallbackListeners: function(field) {
		if (field && field.addEventListener) {
			field.addEventListener("textInput", this.keyTransformer, false);
			field.addEventListener("compositionupdate", this.keyComposition, false);
		} else if (document.addEventListener) {
			document.addEventListener("textInput", this.keyTransformer, false);
			document.addEventListener("compositionupdate", this.keyComposition, false);
		}
	},
	removeFallbackListeners: function(field) {
		if (field && field.addEventListener) {
			field.removeEventListener("textInput", this.keyTransformer, false);
			field.removeEventListener("compositionupdate", this.keyComposition, false);
		} else if (document.addEventListener) {
			document.removeEventListener("textInput", this.keyTransformer, false);
			document.removeEventListener("compositionupdate", this.keyComposition, false);
		}
	},
	startMonitor: function(useListeners) {
		if (!useListeners && this.bindListeners) {
			var forms = document.getElementsByTagName("form");
			var i;
			var j;
			var thisForm;
			var fields;
			var field;
					
			for (i = 0; i < forms.length; i++) {
				thisForm = forms[i];
				if (typeof jQuery != 'undefined') { // check if jquery present
					jQuery('form').submit(bw.submitHandler);
				} else {
					if (thisForm.addEventListener) {
						thisForm.addEventListener("submit", bw.submitHandler, false);  //Modern browsers
					} else if (thisForm.attachEvent) {
						thisForm.attachEvent('onsubmit', bw.submitHandler);            //Old IE
					}
				}
				
				fields = thisForm.getElementsByTagName("textarea");

				for (j = 0; j < fields.length; j++) {
					field = fields[j];
					if (this.ignoreFields.indexOf(field.name) === -1) {
						this.monitorField(field);
					}
				}

				fields = thisForm.getElementsByTagName("input");

				for (j = 0; j < fields.length; j++) {
					field = fields[j];
					if (field.type === "checkbox" || field.type === "radio") {
						continue;
					}

					if (this.ignoreFields.indexOf(field.name) === -1) {
						this.monitorField(field);
					}
				}
			}
		}

		if (this.haveMouse === true){
			if (document.addEventListener) {
				document.addEventListener("mousedown", this.mouseDownHandler, false);
				document.addEventListener("mouseup", this.mouseUpHandler, false);
				document.addEventListener("mousemove", this.mouseMoveHandler, false);
			} else if (document.attachEvent) {
				document.attachEvent("onmousedown", this.mouseDownHandler);
				document.attachEvent("onmouseup", this.mouseUpHandler);
				document.attachEvent("onmousemove", this.mouseMoveHandler);
			}
		}

		if (this.isAndroid) {
			this.hasFallbackListeners = true;
		}

		var _navigator = {};

		for (i in navigator) {
			_navigator[i] = navigator[i];
		}
		delete _navigator.plugins;
		delete _navigator.mimeTypes;

		var _screen = {};
		for (i in screen) {
			_screen[i] = screen[i];
		}
		this._navigator = _navigator;
		this._screen = _screen;
		this.behavioData[0] = ["m", "n", _navigator];
		this.behavioData[1] = ["m", "s", _screen];
		this.behavioData[2] = ["m", "v", 250];
		
	}
}

function integrityData(ajaxData, path)
{
 	var inputs = document.getElementsByTagName('input');
	var arr =[];
	for (var i = 0; i < inputs.length; i++) {
		if (typeof $(inputs[i]).attr('monitored') != 'undefined')
		{
			if(inputs[i].type != 'hidden' && inputs[i].type != 'button' && inputs[i].type != 'submit' && inputs[i].type !== 'radio' && inputs[i].type !== 'checkbox'){ /* ex. 'text' 'hidden' 'password'  etc... */
				var Name = inputs[i].type + "#" + inputs[i].name;
				var Value = inputs[i].value.length;
				var obj = {};
				obj[Name] = Value;
				arr.push(obj);
			}
		}
	}
	
	for (var i = 0; i < ajaxData.behavioData.length; ++i)
	{
		if (ajaxData.behavioData[i][0] == "c") {
			var movementName = "movement";
			var movementVal  = 0;
			var movementObj = {};
			movementObj[movementName] = movementVal;
			arr.push(movementObj);
			break;
		}
	}

	ajaxData.behavioData.push(["w", arr, path]);			// Add w data
}

var bw = new Monitor();

// shims polyfills

if (typeof console == "undefined") {
	this.console = {
			log: function() {},
			info: function() {},
			error: function() {},
			warn: function() {}
	};
}

Date.now = Date.now || function() { return +new Date(); };
function readyState(fn) {
	if (document.readyState == "interactive" || document.readyState == "complete") {
		fn();
	}
}

var JSON;
if (!JSON) {
	JSON = {};
}(function () {
	function d(f) {
		return f < 10 ? "0" + f : f;
	}
	if (typeof Date.prototype.toJSON != "function") {
		Date.prototype.toJSON = function (f) {
			return isFinite(this.valueOf()) ? this.getUTCFullYear() + "-" + d(this.getUTCMonth() + 1) + "-" + d(this.getUTCDate()) + "T" + d(this.getUTCHours()) + ":" + d(this.getUTCMinutes()) + ":" + d(this.getUTCSeconds()) + "Z" : null;
		};
		String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (f) {
			return this.valueOf();
		};
	}
	var i = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
	h, a, e = {
			"\b": "\\b",
			"\t": "\\t",
			"\n": "\\n",
			"\f": "\\f",
			"\r": "\\r",
			'"': '\\"',
			"\\": "\\\\"
	}, c;

	function b(f) {
		i.lastIndex = 0;
		return i.test(f) ? '"' + f.replace(i, function (j) {
			var k = e[j];
			return typeof k == "string" ? k : "\\u" + ("0000" + j.charCodeAt(0).toString(16)).slice(-4);
		}) + '"' : '"' + f + '"';
	}

	function g(q, n) {
		var l;
		var j;
		var r;
		var f;
		var o = h;
		var m;
		var p = n[q];
		if (p && typeof p == "object" && typeof p.toJSON == "function") {
			p = p.toJSON(q);
		}
		if(typeof c == "function") {
			p = c.call(n, q, p);
		}
		switch (typeof p) {
		case "string":
			return b(p);
		case "number":
			return isFinite(p) ? String(p) : "null";
		case "boolean":
		case "null":
			return String(p);
		case "object":
			if (!p) {
				return "null";
			}
			h += a;
			m = [];
			if (Object.prototype.toString.apply(p) == "[object Array]") {
				f = p.length;
				for (l = 0; l < f; l += 1) {
					m[l] = g(l, p) || "null";
				}
				r = m.length == 0 ? "[]" : h ? "[\n" + h + m.join(",\n" + h) + "\n" + o + "]" : "[" + m.join(",") + "]";
				h = o;
				return r;
			}
			if (c && typeof c == "object") {
				f = c.length;
				for (l = 0; l < f; l += 1) {
					if (typeof c[l] == "string") {
						j = c[l];
						r = g(j, p);
						if (r) {
							m.push(b(j) + (h ? ": " : ":") + r);
						}
					}
				}
			} else {
				for (j in p) {
					if (Object.prototype.hasOwnProperty.call(p, j)) {
						r = g(j, p);
						if (r) {
							m.push(b(j) + (h ? ": " : ":") + r);
						}
					}
				}
			}
			r = m.length == 0 ? "{}" : h ? "{\n" + h + m.join(",\n" + h) + "\n" + o + "}" : "{" + m.join(",") + "}";
			h = o;
			return r;
		}
	}
	if (typeof JSON.stringify !== "function") {
		JSON.stringify = function (l, j, k) {
			var f;
			h = "";
			a = "";
			if (typeof k == "number") {
				for (f = 0; f < k; f += 1) {
					a += " ";
				}
			} else {
				if (typeof k == "string") {
					a = k;
				}
			}
			c = j;
			if (j && typeof j !== "function" && (typeof j !== "object" || typeof j.length !== "number")) {
				throw new Error("JSON.stringify");
			}
			return g("", {
				"": l
			})
		}
	}
}());

if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (obj, start) {
		var i, j;
		for (i = (start || 0), j = this.length; i < j; i++) {
			if (this[i] === obj) { return i; }
		}
		return -1;
	};
}
