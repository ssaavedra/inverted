/**
 * The proto factory is responsible for creating instances of defined objects using the config tree
 */
define("inverted/ProtoFactory", function() {

    "use strict";

    /**
     * Create a new ProtoFactory with config
     * 
     * @constructor
     * @param {Object} config
     */
    var ProtoFactory = function(config) {

        this.config = config;
        this.appContext = null;

        this.injectAppContext = !!(this.config.injectAppContext === true)

        //cache of loaded dependencies
        this.dependencyMap = {};
    };


    /**
     * Adds dependency id to object/function mappings to the internal dependency map
     * @param {Object} depMap   adds a map of dependencies to the existing dependency map cache
     */
    ProtoFactory.prototype.addDependencies = function(depMap) {
        
        for(var depId in depMap) {
            if(depMap.hasOwnProperty(depId)) {
                this.dependencyMap[depId] = depMap[depId];                
            }
        }
    };    

    /**
     * Gets a proto given an id
     * 
     * @param {String} id
     * @return {Object} A reference to a javascript object
     */
    ProtoFactory.prototype.getProto = function(id) {

        var protoData = this.getProtoConfig(id);

        var instance = null;

        // for static just get a reference
        if(protoData.scope === "static") {

            if(typeof protoData.module === "string") {
                instance = this.dependencyMap[protoData.module];
            }
        // create an instance if not singleton or singleton and no instance
        // defined yet (lazy loaded singletons)
        } else if((!protoData.scope || protoData.scope !== "singleton") ||
                (protoData.scope === "singleton" && !protoData.instance)) {

            var injectAppContext =
                this.injectAppContext === true && protoData.injectAppContext !== false ||
                this.injectAppContext !== true && protoData.injectAppContext === true;

            instance = this._createInstance(protoData.module, protoData.args, protoData.props, protoData.extendsRef, injectAppContext);

            // save instance if singleton
            if(protoData.scope && protoData.scope === "singleton") {
                protoData.instance = instance;
            }
        }
        // its a singleton and instance has already been created
        else {
            instance = protoData.instance;
        }

        return instance;
    };

    /**
     * Uses factory config to create a new instance
     *
     * @param proto {String|Object} this might be a string or an proto
     * @param argData
     * @param propData
     * @param extendsRef
     * @param injectAppContext
     * @return
     */
    ProtoFactory.prototype._createInstance = function(proto, argData, propData, extendsRef, injectAppContext) {

        var instance = null;

        //if the proto is a
        if(typeof proto === "string") {
            proto = this.dependencyMap[proto];
        }

        // constructor injection
        var args = this._createArgs(argData);

        // inheritance
        if(extendsRef) {
            this._extendProto(proto, this.getProto(extendsRef));
        }

        // ugly but works. would like a better way
        switch(args.length) {
        case 0:
            instance = new proto();
            break;
        case 1:
            instance = new proto(args[0]);
            break;
        case 2:
            instance = new proto(args[0], args[1]);
            break;
        case 3:
            instance = new proto(args[0], args[1], args[2]);
            break;
        case 4:
            instance = new proto(args[0], args[1], args[2], args[3]);
            break;
        case 5:
            instance = new proto(args[0], args[1], args[2], args[3], args[4]);
            break;
        case 6:
            instance = new proto(args[0], args[1], args[2], args[3], args[4], args[5]);
            break;
        case 7:
            instance = new proto(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            break;
        case 8:
            instance = new proto(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
            break;
        case 9:
            instance = new proto(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
            break;
        case 10:
            instance = new proto(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8],
                    args[9]);
            break;
        default:
            throw new Error("Instances have 10 arg limit");
        }

        // property injection
        if(propData) {
            for( var propName in propData) {
                if(propData.hasOwnProperty(propName)) {
                    var propertyArgs = this._createArgs([ propData[propName] ]);

                    if(typeof instance[propName] === "function") {
                        instance[propName].call(instance, propertyArgs[0]);
                    } else {
                        instance[propName] = propertyArgs[0];
                    }
                }
            }
        }

        //create a reference to the app context
        if(this.appContext && injectAppContext) {
            instance.__appContext__ = this.appContext;
        }

        return instance;
    };

    /**
     * Uses factory config to create a new instance
     * 
     * @param factoryRef
     * @param factoryMethod
     * @return
     */
    ProtoFactory.prototype._getProtoFromFactory = function(factoryRef, factoryMethod) {

        var factory = this.getProto(factoryRef);

        if(factoryMethod) {
            return factory[factoryMethod].apply(factory);
        } else {
            throw new Error("No factory method defined with " + factoryRef);
        }
    };

    /**
     * Scans arg config for values, generating dependencies where required
     * 
     * @param {Array} confArgs
     * @return {Array}
     */
    ProtoFactory.prototype._createArgs = function(confArgs) {

        // figure out constructors
        var args = [];
        if(confArgs) {
            for( var i = 0; i < confArgs.length; i++) {
                var argData = confArgs[i];

                // easier to deal with nulls here)
                if(argData === null || typeof argData === "undefined") {
                    args[i] = argData;
                    continue;
                }

                var isObject = typeof argData === "object";

                if((isObject && argData.ref) || (typeof argData === "string" && argData.match(/^\*[^\*]/) !== null)) {
                    // if arg has references another proto
                    var ref = argData.ref || argData.substr(1);
                    args[i] = this._getProtoFromReference(ref);
                } else if(isObject && argData.factoryRef) {
                    // if arg uses a factory
                    args[i] = this._getProtoFromFactory(argData.factoryRef, argData.factoryMethod);
                } else if(isObject && argData.module) {
                    // if arg uses an anonymous proto
                    args[i] = this._createInstance(argData.module, argData.args, argData.props, null, argData.injectAppContext);
                } else if(isObject) {
                    args[i] = {};
                    // if arg is object containing values
                    for( var key in argData) {
                        if(argData.hasOwnProperty(key)) {
                            var obj = argData[key];

                            if(obj && (obj.ref || (typeof obj === "string" && obj.match(/^\*[^\*]/) !== null))) {
                                // if object value is a reference
                                var ref = obj.ref || obj.substr(1);
                                args[i][key] = this._getProtoFromReference(ref);
                            } else if(obj && obj.factoryRef) {
                                // if object value uses a factory
                                args[i][key] = this._getProtoFromFactory(obj.factoryRef, obj.factoryMethod);
                            } else if(obj && obj.module) {
                                // if object value is an anonymous proto
                                args[i][key] = this._createInstance(obj.module, obj.args, obj.props, null, argData.injectAppContext);
                            } else {
                                //if object value is a literal value
                                args[i][key] = obj;
                            }
                        }
                    }
                } else {
                    // just a value
                    args[i] = argData;
                }
            }
        }
        return args;
    };

    /**
     * Extends one proto with another
     * @param {Object} proto The proto to extend
     * @param {Object} superProto The base proto
     * @return {Object}
     */
    ProtoFactory.prototype._extendProto = function(proto, superProto) {

        // backup methods/props
        var methods = {};
        for( var method in proto.prototype) {
            methods[method] = proto.prototype[method];
        }

        // extend prototype
        proto.prototype = superProto;
        proto.prototype._super = superProto.constructor;

        // put methods back
        for( var methodBackup in methods) {
            proto.prototype[methodBackup] = methods[methodBackup];
        }

        // fix the contructor
        proto.prototype.constructor = proto;
    };

    ProtoFactory.prototype._getProtoFromReference = function(ref) {

        var depData = Util.parseDependencyRef(ref);
        var proto = this.getProto(depData.protoId);

        //if an interface id specified, check the implementation
        if(depData.interfaceId) {
            self._checkImplements(depData.protoId, proto, depData.interfaceId);
        }
        return proto;
    };

    /**
     * Warns if a proto instance does not implement any of the methods defined in an interface
     * @param protoId
     * @param proto
     * @param interfaceId
     */
    ProtoFactory.prototype._checkImplements = function(protoId, proto, interfaceId) {

        var inter = this.getInterfaceConfig(interfaceId);
        var methods = inter.split(/(\s+)?,(\s+)?/);
        var errors = [];
        for(var i = 0; i < methods.length; i++) {
            if(typeof inter[methods[i]] !== "function") {
                errors.push(protoId + " does not implement the method '" + methods[i] + "'");
            }
        }

        if(errors.length) {
            throw new Error(errors.join("\n"));
        }
    };

    /**
     * Searches the config for a proto matching the specified id
     * 
     * @param {String} id
     * @return {Object}
     */
    ProtoFactory.prototype.getProtoConfig = function(id) {

        var protos = this.config.protos;

        if(protos && protos.hasOwnProperty(id)) {
            return protos[id];
        } else {
            throw new Error("No proto is defined for " + id);
        }
    };

    ProtoFactory.prototype.getInterfaceConfig = function(id) {

        var interfaces = this.config.interfaces;

        if(interfaces && interfaces.hasOwnProperty(id)) {
            return interfaces[id];
        } else {
            throw new Error("No interface is defined for " + id);
        }
    };
    
    var Util = {};
    
    /**
     * Strict check to see if an object is an array.
     */
    Util.isArray = function(obj) {

        if(Array.isArray) {
            return Array.isArray(obj);
        }
        return Object.prototype.toString.call(obj) === "[object Array]";
    };

    /**
     * Taken directly from jquery
     */
    Util.inArray = function(elem, array) {

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

    /**
     * Parses the proto id and interface id from a dependency reference string
     * @param ref
     * @return {{protoId: *, interfaceId: (*|null)}}
     */
    Util.parseDependencyRef = function(ref) {

        var parsedRef = ref.match(/^(.+?)(\[(.+?)\])?$/);
        return {
            protoId: parsedRef[1],
            interfaceId: parsedRef[3] || null
        };
    };

    /**
     * Logs a warning message
     * @param message
     */
    var warn = function(message) {
        if(typeof console != "undefined" && console.warn) {
            console.warn(message);
        }
    };

    //expose constructor
    return ProtoFactory;

});