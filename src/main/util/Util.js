/**
 * Some utils
 */
(function(global) {

	global.inverted = global.inverted || {};
	var ns = (global.inverted.util = global.inverted.util || {});

	/**
	 * Strict check to see if an object is an array.
	 */
	ns.isArray = function(obj) {

		if(Array.isArray) {
			return obj.isArray();
		}
		return Object.prototype.toString.call(obj) === "[object Array]";
	};

	/**
	 * Taken directly from jquery 1.5.2
	 */
	ns.inArray = function(elem, array) {

		if(array.indexOf) {
			return array.indexOf(elem);
		}

		for( var i = 0, length = array.length; i < length; i++) {
			if(array[i] === elem) {
				return i;
			}
		}

		return -1;
	};
	
	ns.parseProtoString = function(protoString, root) {
		
		var obj = root;
		var parts = protoString.split(".");		
		
		for(var i = 0, part; part = parts[i]; i++) {
			
			if(typeof obj[part] === "undefined") {
				return null;
			} else if(i === parts.length - 1 && typeof obj[part] !== "function") {
				return null;
			} else {
				obj = obj[part];
			}						
		}			
		
		return obj;
	};
	
})(this);