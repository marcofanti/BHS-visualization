"use strict";

function behavioDirective() {
	function link(scope, element, attrs) {	
		bw.monitorField(element);
		
		element.on('$destroy', function() {
			bw.removeListener(element);
		});
	}
	return {
		restrict: 'A',
		link: link
	}
}

angular.module('behavio', []).directive('monitored', behavioDirective);