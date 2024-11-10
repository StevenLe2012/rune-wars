// Heartbeat.js

// Version: 1.0.0

// Event: On Awake

// Description: Heartbeat is a runtime manager that adds event layers, lets you easily start, stop, and replace update and delay events, and adds universal pause/play

if (global.Heartbeat == null) {
    global.Heartbeat = script;
    global.Heartbeat.api.instances = {};
    global.Heartbeat.api.instance = 0;
    
    function onUpdate() {
        var instanceKeys = Object.keys(global.Heartbeat.api.instances);
        
        for (var u = instanceKeys.length-1;u >= 0;u--) {
            var instance = global.Heartbeat.api.instances[instanceKeys[u]];
            
            if (isNull(instance)) {
                delete global.Heartbeat.api.instances[instanceKeys[u]];
                continue;
            }            
            
            for (var i = 0; i < instance.api.k.length;i++) {
                instance.api.updateCalls[instance.api.k[i]]();
            }
        }
    }

    var updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(onUpdate);
    
    function onPhysicsUpdate() {
        var instanceKeys = Object.keys(global.Heartbeat.api.instances);
        
        for (var u = instanceKeys.length-1;u >= 0;u--) {
            var instance = global.Heartbeat.api.instances[instanceKeys[u]];
            
            if (isNull(instance)) {
                delete global.Heartbeat.api.instances[instanceKeys[u]];
                continue;
            }            
            
            for (var i = 0; i < instance.api.pk.length;i++) {
                instance.api.physicsUpdateCalls[instance.api.pk[i]]();
            }
        }
    }
    
    var physicsUpdateEvent = script.createEvent("LateUpdateEvent");
    physicsUpdateEvent.bind(onPhysicsUpdate);
    
    var play = function (layer) {
        var instanceKeys = Object.keys(global.Heartbeat.api.instances);
        for (var i = 0; i < instanceKeys.length;i++) {
            if (!isNull(global.Heartbeat.api.instances[instanceKeys[i]]) && (!layer || instanceKeys[i].startsWith(layer))) {
                global.Heartbeat.api.instances[instanceKeys[i]].api.resumeUpdates();
                if (global.Heartbeat.api.instances[instanceKeys[i]].api.onResume)
                    global.Heartbeat.api.instances[instanceKeys[i]].api.onResume()
            }
        }
    }
    
    var pause = function (layer,skipLayer) {
        var instanceKeys = Object.keys(global.Heartbeat.api.instances);
        for (var i = 0; i < instanceKeys.length;i++) {
            if (instanceKeys[i].startsWith("SYSTEM"))
                continue;
            
            if (!isNull(global.Heartbeat.api.instances[instanceKeys[i]]) && (!skipLayer || !instanceKeys[i].startsWith(skipLayer)) && (!layer || instanceKeys[i].startsWith(layer))) {
                global.Heartbeat.api.instances[instanceKeys[i]].api.pauseUpdates();
                if (global.Heartbeat.api.instances[instanceKeys[i]].api.onPause)
                    global.Heartbeat.api.instances[instanceKeys[i]].api.onPause()
            }
        }
    }
    
    var clearAllEvents = function (layer) {
        var instanceKeys = Object.keys(global.Heartbeat.api.instances);
        for (var i = 0; i < instanceKeys.length;i++) {
            if (!isNull(global.Heartbeat.api.instances[instanceKeys[i]]) && (!layer || instanceKeys[i].startsWith(layer)))
                global.Heartbeat.api.instances[instanceKeys[i]].api.clearEvents();
        }
    }
    
    script.api.add = function (objScript,layer) {
        if (objScript.name && objScript.isEnabledInHierarchy != null && objScript.hasParent != null)  {
            objScript = objScript.createComponent("Component.ScriptComponent");
        }       
        
        if (objScript.hasHeartbeat)
            return;
        
        var e = 'objScript.hasHeartbeat = true;objScript.getSceneObject().heartbeat = script;\nobjScript.layer = layer;\nobjScript.api.updateCalls = {}\nobjScript.api.k = [];\nobjScript.api.physicsUpdateCalls = {}\nobjScript.api.pk = [];\nobjScript.api.initCalls = []\nobjScript.api.delayCalls = {}\nobjScript.api.dk = [];\nobjScript.api.paused = false;\n\nobjScript.api.onStart = function () {   \n    for (var i = 0; i < objScript.api.initCalls.length;i++) {\n        objScript.api.initCalls[i](objScript);\n    }\n    objScript.api.initCalls = [];\n}\n\nobjScript.api.addUpdate = function (tag, callback) {\n    objScript.api.updateCalls[tag] = function () {if (!objScript.api.paused) callback();}\n    objScript.api.k = Object.keys(objScript.api.updateCalls);\n}\n\nobjScript.api.removeUpdate = function (tag) {\n    if (objScript.api.k.indexOf(tag) != -1) {\n        delete objScript.api.updateCalls[tag];\n        objScript.api.k = Object.keys(objScript.api.updateCalls);\n    }\n if (objScript.api.pk.indexOf(tag) != -1) {\n        delete objScript.api.physicsUpdateCalls[tag];\n        objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);\n    } \n}\n\nobjScript.api.eventExists = function (tag) {\n    return objScript.api.updateCalls[tag] || objScript.api.delayCalls[tag];\n}\n\nobjScript.api.pauseUpdates = function () {\n    objScript.api.paused = true;\n    \n    if (!objScript.physicsBody)\n        objScript.physicsBody = objScript.getSceneObject().getComponent("Physics.BodyComponent");\n    \n    if (objScript.physicsBody)\n        objScript.physicsBody.enabled = false;\n    \n    for (var i = 0; i < objScript.api.dk.length; i++) {\n        objScript.api.delayCalls[objScript.api.dk[i]].tl = objScript.api.delayCalls[objScript.api.dk[i]].getTimeLeft();\n        objScript.api.delayCalls[objScript.api.dk[i]].reset(99999);\n    }\n}\n\nobjScript.api.resumeUpdates = function () {\n    objScript.api.paused = false;\n    \n    if (objScript.physicsBody) {\n        objScript.physicsBody.enabled = true;\n    }\n    \n    for (var i = 0; i < objScript.api.dk.length; i++) {\n        if (objScript.api.delayCalls[objScript.api.dk[i]].tl)\n            objScript.api.delayCalls[objScript.api.dk[i]].reset(objScript.api.delayCalls[objScript.api.dk[i]].tl);\n    }\n}\n\nobjScript.api.addInit = function (callback) {\n    objScript.api.initCalls.push(callback);\n}\n\nobjScript.api.addDelay = function (tag, time, callback, repeat) {\n    if (!objScript.api.delayCalls[tag]) {\n        objScript.api.delayCalls[tag] = objScript.createEvent("DelayedCallbackEvent");\n        objScript.api.dk = Object.keys(objScript.api.delayCalls);\n    }\n    if (repeat) {\n        objScript.api.delayCalls[tag].bind(function () {\n            callback(repeat);\n            repeat--;\n            if (repeat > 0)\n                objScript.api.delayCalls[tag].reset(time);\n            else\n                objScript.api.removeDelay(tag);\n                \n        });\n        objScript.api.delayCalls[tag].reset(0);\n    } else {\n        objScript.api.delayCalls[tag].bind(function () {\n            objScript.api.removeDelay(tag);\n            callback();\n        });\n        objScript.api.delayCalls[tag].reset(time);\n    }\n}\n\nobjScript.api.removeDelay = function (tag) {\n    var x = objScript.api.dk.indexOf(tag);\n    \n    if (!objScript.api.delayCalls[tag])\n        return;\n    \n    objScript.removeEvent(objScript.api.delayCalls[tag])  \n    \n    delete objScript.api.delayCalls[tag];\n    objScript.api.dk = Object.keys(objScript.api.delayCalls);\n}\n\nobjScript.api.addPhysicsUpdate = function (tag, callback) {\n    objScript.api.physicsUpdateCalls[tag] = function () {if (!objScript.api.paused) callback();}\n    objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);\n}\n\nobjScript.api.removePhysicsUpdate = function (tag) {\n    if (objScript.api.pk.indexOf(tag) != -1) {\n        delete objScript.api.physicsUpdateCalls[tag];\n        objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);\n    }\n}\n\nobjScript.api.clearEvents = function () {\n    objScript.api.updateCalls = {}\n    objScript.api.physicsUpdateCalls = {}\n    objScript.api.k = [];\n    objScript.api.pk = [];\n    objScript.api.initCalls = [];\n    for (var d = objScript.api.dk.length-1;d >= 0; d--) {\n        objScript.removeEvent(objScript.api.delayCalls[objScript.api.dk[d]])  \n    }    \n    objScript.api.dk = [];\n    objScript.api.delayCalls = {};\n}\n\nif (objScript.enabled) {\n    var myInstance = (global.Heartbeat.api.instance++).toString();\n    var key = (objScript.layer?(objScript.layer + "_"):"") + myInstance;\n    global.Heartbeat.api.instances[key] = objScript;\n}\n\nobjScript.api.initEvent = objScript.createEvent("DelayedCallbackEvent");\nobjScript.api.initEvent.bind(objScript.api.onStart);\nobjScript.api.initEvent.reset(0.01);\n\nobjScript.createEvent("OnDestroyEvent").bind(function () {\n    delete global.Heartbeat.api.instances[myInstance];\n});'
        eval(e);
        return objScript;
    }
    script.api.play = play;
    script.api.pause = pause;
    script.api.clearAllEvents = clearAllEvents;
}

//objScript.hasHeartbeat = true;
//objScript.layer = layer;
//objScript.api.updateCalls = {}
//objScript.api.k = [];
//objScript.api.physicsUpdateCalls = {}
//objScript.api.pk = [];
//objScript.api.initCalls = []
//objScript.api.delayCalls = {}
//objScript.api.dk = [];
//objScript.api.paused = false;
//
//objScript.api.onStart = function () {   
//    for (var i = 0; i < objScript.api.initCalls.length;i++) {
//        objScript.api.initCalls[i](objScript);
//    }
//    objScript.api.initCalls = null;
//}
//
//objScript.api.addUpdate = function (tag, callback) {
//    objScript.api.updateCalls[tag] = function () {if (!objScript.api.paused) callback();}
//    objScript.api.k = Object.keys(objScript.api.updateCalls);
//}
//
//objScript.api.removeUpdate = function (tag) {
//    if (objScript.api.k.indexOf(tag) != -1) {
//        delete objScript.api.updateCalls[tag];
//        objScript.api.k = Object.keys(objScript.api.updateCalls);
//    } else if (objScript.api.pk.indexOf(tag) != -1) {
//        delete objScript.api.physicsUpdateCalls[tag];
//        objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);
//    }
//}
//
//objScript.api.eventExists = function (tag) {
//    return objScript.api.updateCalls[tag] || objScript.api.delayCalls[tag];
//}
//
//objScript.api.pauseUpdates = function () {
//    objScript.api.paused = true;
//    
//    if (!objScript.physicsBody)
//        objScript.physicsBody = objScript.getSceneObject().getComponent("Physics.BodyComponent");
//    
//    if (objScript.physicsBody)
//        objScript.physicsBody.enabled = false;
//    
//    for (var i = 0; i < objScript.api.dk.length; i++) {
//        objScript.api.delayCalls[objScript.api.dk[i]].tl = objScript.api.delayCalls[objScript.api.dk[i]].getTimeLeft();
//        objScript.api.delayCalls[objScript.api.dk[i]].reset(99999);
//    }
//}
//
//objScript.api.resumeUpdates = function () {
//    objScript.api.paused = false;
//    
//    if (objScript.physicsBody) {
//        objScript.physicsBody.enabled = true;
//    }
//    
//    for (var i = 0; i < objScript.api.dk.length; i++) {
//        if (objScript.api.delayCalls[objScript.api.dk[i]].tl)
//            objScript.api.delayCalls[objScript.api.dk[i]].reset(objScript.api.delayCalls[objScript.api.dk[i]].tl);
//    }
//}
//
//objScript.api.addInit = function (callback) {
//    objScript.api.initCalls.push(callback);
//}
//
//objScript.api.addDelay = function (tag, time, callback, repeat) {
//    if (!objScript.api.delayCalls[tag]) {
//        objScript.api.delayCalls[tag] = objScript.createEvent("DelayedCallbackEvent");
//        objScript.api.dk = Object.keys(objScript.api.delayCalls);
//    }
//    if (repeat) {
//        objScript.api.delayCalls[tag].bind(function () {
//            callback(repeat);
//            repeat--;
//            if (repeat > 0)
//                objScript.api.delayCalls[tag].reset(time);
//            else
//                objScript.api.removeDelay(tag);
//                
//        });
//        objScript.api.delayCalls[tag].reset(0);
//    } else {
//        objScript.api.delayCalls[tag].bind(function () {
//            objScript.api.removeDelay(tag);
//            callback();
//        });
//        objScript.api.delayCalls[tag].reset(time);
//    }
//}
//
//objScript.api.removeDelay = function (tag) {
//    var x = objScript.api.dk.indexOf(tag);
//    
//    if (!objScript.api.delayCalls[tag])
//        return;
//    
//    objScript.removeEvent(objScript.api.delayCalls[tag])  
//    
//    delete objScript.api.delayCalls[tag];
//    objScript.api.dk = Object.keys(objScript.api.delayCalls);
//}
//
//objScript.api.addPhysicsUpdate = function (tag, callback) {
//    objScript.api.physicsUpdateCalls[tag] = function () {if (!objScript.api.paused) callback();}
//    objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);
//}
//
//objScript.api.removePhysicsUpdate = function (tag) {
//    if (objScript.api.pk.indexOf(tag) != -1) {
//        delete objScript.api.physicsUpdateCalls[tag];
//        objScript.api.pk = Object.keys(objScript.api.physicsUpdateCalls);
//    }
//}
//
//objScript.api.clearEvents = function () {
//    objScript.api.updateCalls = {}
//    objScript.api.physicsUpdateCalls = {}
//    objScript.api.k = [];
//    objScript.api.pk = [];
//    objScript.api.initCalls = [];
//   
//    for (var d = objScript.api.dk.length-1;d >= 0; d--) {
//        objScript.removeEvent(objScript.api.delayCalls[objScript.api.dk[d]])  
//    }    
//    objScript.api.dk = [];
//    objScript.api.delayCalls = {};
//}
//
//if (objScript.enabled) {
//    var myInstance = (global.Heartbeat.api.instance++).toString();
//    var key = (objScript.layer?(objScript.layer + "_"):"") + myInstance;
//    global.Heartbeat.api.instances[key] = objScript;
//}
//
//objScript.api.initEvent = objScript.createEvent("DelayedCallbackEvent");
//objScript.api.initEvent.bind(objScript.api.onStart);
//objScript.api.initEvent.reset(0.01);
//
//objScript.createEvent("OnDestroyEvent").bind(function () {
//    delete global.Heartbeat.api.instances[myInstance];
//});