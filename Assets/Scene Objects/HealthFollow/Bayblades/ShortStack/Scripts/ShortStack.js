// @input string runtimeLayer = "DEFAULT" { "label": "Runtime Layer", "widget":"combobox", "values":[{"label":"SYSTEM (can't be paused)", "value":"SYSTEM"}, {"label":"DEFAULT", "value":"DEFAULT"}, {"label":"MENU", "value":"MENU"}, {"label":"GAME", "value":"GAME"}, {"label":"PLAYER", "value":"PLAYER"}, {"label":"ENEMY", "value":"ENEMY"}, {"label":"CUSTOM", "value":"CUSTOM"}], "hint": "Runtime Layers let you group up ShortStacks, enabling you to pause/play layers"}
// @input string customCategory {"showIf":"runtimeLayer", "showIfValue":"CUSTOM"}
// @input string[] states = {"init:"}

if (isNull(script.customCategory) || script.customCategory.length == 0 || script.customCategory == "DEFAULT") {
    script.customCategory = script.runtimeLayer;
}

script.hasStateMachine = true;
script.getSceneObject().stateMachine = script;

global.Heartbeat.api.add(script,script.customCategory?script.customCategory:"DEFAULT");
eval("var k = {};\n\nscript.api.createCallback = function (n) {\n    if (script.api[\"subscribeOn\"+n] != null)\n        return;\n    var a = \"on\"+n+\"s\";\n    script.api[a] = {};\n    k[n+\"_keys\"] = [];\n    script.api[\"subscribeOn\"+n] = function (tag,callback) {\n        script.api[a][tag] = {\"callback\":callback};\n        k[n+\"_keys\"] = Object.keys(script.api[a]);\n    }\n    script.api[\"unsubscribeOn\"+n] = function (tag,callback) {\n        if (script.api[a][tag]) {\n            delete script.api[a][tag];\n            k[n+\"_keys\"] = Object.keys(script.api[a]);\n        } \n    }\n    script.api[\"on\"+n] = function (data,data2,data3,data4,data5,data6,data7) {\n        for (var i = k[n+\"_keys\"].length-1;i >= 0;i--) {\n            var c = script.api[a][k[n+\"_keys\"][i]];\n            if (c != null && c.callback) \n                c.callback(data,data2,data3,data4,data5,data6,data7);  \n        }\n    }\n    script.api[\"on\"+n+\"WithCallback\"] = function (callback,data,data2,data3,data4,data5,data6,data7) {\n        for (var i = k[n+\"_keys\"].length-1;i >= 0;i--) {\n            var c = script.api[a][k[n+\"_keys\"][i]];\n            if (c != null && c.callback) \n                callback(c.callback(data,data2,data3,data4,data5,data6,data7));\n        }\n    }\n    script.api[\"on\"+n+\"Empty\"] = function () {\n        return k[n+\"_keys\"].length==0;\n    }\n    script.api[\"clearOn\"+n] = function () {\n        script.api[a] = {};\n        k[n+\"_keys\"] = [];\n    }\n}\n\nscript.callbackerExists = true;\nscript.hasCallbacker = true");

var processedStates = {};
script.events = [];
script.focus = false;
script.subMachines = [];
var _state;

var createStateCallback = function (key) {
    var upperKey = key.charAt(0).toUpperCase() + key.slice(1);
    script.api.createCallback(upperKey);
    script.api.createCallback(upperKey+"Deep");
    script.api["go"+upperKey] = function () {
        script.api["on"+upperKey]();
    }
    script.api["go"+upperKey+"Deep"] = function () {
        script.api["on"+upperKey+"Deep"]();
    }
    script.api["subscribeOn"+upperKey]("default",function (_inputValue) {
        changeState(key);
    });
    
    //we make a deep callback to call all children with shared state
    script.api["subscribeOn"+upperKey+"Deep"]("default",function () {
        for (var i = script.subMachines.length-1; i >= 0; i--) {
            if (isNull(script.subMachines[i]))
                continue;
           
            if (script.subMachines[i].api["on"+upperKey]) {
                script.subMachines[i].api["on"+upperKey]();
            }
        }
        
        if (key != _state)
            changeState(key);
    });
}

var translateVariables = function (objScript,inputStr) { 
    if (!inputStr.includes("$"))
        return inputStr;
    
    let result = inputStr;
    const matches = inputStr.match(/\$(\w+)/g);

    if (matches == null)
        return inputStr;
    
    for (let match of matches) {
        const variableName = match.slice(1); // Remove the $ sign
        var variableOwner = global.Shortcuts.api.findVar(objScript,variableName);
        var value = "null";
        if (variableOwner != null && variableOwner[variableName].toString().length > 0) {
            value = variableOwner[variableName];
        }
        if (typeof value == 'object' && !inputStr.includes("log(")) {
            var stringifiedValue = "["
            for (var i = 0; i < value.length; i++) {
                stringifiedValue += '"' + value[i] + '"';
                if (i < value.length-1) {
                    stringifiedValue += ",";
                }
            }
            stringifiedValue += "]"
            value = stringifiedValue;
        }
        result = result.replace(match, value);
    }

    return result;
}

var processStates = function () {
    
    for (var i = 0; i < script.states.length; i++) {
        var key = i.toString();
        var sequence = script.states[i];
        
        if (sequence.includes(":")) {
            var _ = sequence.split(/:(.*)/s)
            key = _[0];
        }
        createStateCallback(key);
    }
    
    for (var i = 0; i < script.states.length; i++) {
        var key = i.toString();
        var sequence = script.states[i];
        
        if (sequence.includes(":")) {
            var _ = sequence.split(/:(.*)/s)
            key = _[0];
            sequence = _[1];
        }
        
        var regex = /(\w+)\(((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*)\)|(\w+)/g;
        var functions = [];
        var result = sequence.replace(regex, function(match, functionName, args, functionNameNoParens) {
          if (functionName) {
                if (args != null) {
                    const regex2 = /,(?![^(]*\))/g;
                    var _args = args.split(regex2);
                    
                    args = "";
                    for (var a = 0; a < _args.length; a++) {
                        var not_last = a<_args.length-1?',':'';
                        if (_args[a].includes("(")) {
                            var f = _args[a].split("(");
                            var fn = f[0]
                            var fnArgs = f[1];
                            if (fnArgs != null && fnArgs.length > 1) {
                                args += (script.api[fn]?'script.api.':'global.Shortcuts.api.') + fn + "(script," + fnArgs.replace(')','') + ")" + not_last;
                            } else {
                                args += (script.api[fn]?'script.api.':'global.Shortcuts.api.') + fn + "(script)" + not_last;
                            }
                        } else {
                            args += _args[a] + not_last;
                        }
                    }
                    n = "script,"+ args;
                } else {
                    n = "script";
                }
            functions.push((script.api[functionName]?'script.api.':'global.Shortcuts.api.') + functionName + '(' + n + ')');
          } else if (functionNameNoParens) {
            return functions.push((script.api[functionNameNoParens]?'script.api.':'global.Shortcuts.api.') + functionNameNoParens + '(script)');
          }
        });
        
        processedStates[key] = functions;
    }

    if (_state == null && Object.keys(processedStates).length > 0) {
        changeState(Object.keys(processedStates)[0]);
    }
}

var clearData = function () {
    script.api.onStateChange();
    script.api.clearOnStateChange();
}

var changeState = function (state,data) {
    clearData();
    script.events = [].concat(processedStates[state]);
    script.focus = null;
    script.nextFocus = null;
    script.inFocus = null;
    _state = state;
}

var getState = function () {
    return _state;
}

var runState = function () {
    if (script.focus)  {
        return;
    }
    
    if (script.events.length == 0)
        return;
    
    var event = script.events.shift();
    var eventC = script.events.length;
     if (typeof event == 'string' && event.length > 0) {
        var withVars = translateVariables(script,event);
        if (script.DEBUG_ENABLED) {
            print(script.getSceneObject().name + " event: " + event)
            print(script.getSceneObject().name + ": " + withVars);
        }
        eval(withVars);
    } else {
        print("no such event " + event)
    }
    
    if (!script.focus && eventC == 0)
        script.api.onStateComplete();
        
}

var gatherEmbeddedStateMachines = function () {
    script.subMachines = [];
    
    var children = [script.getSceneObject()];
    var first = true;
    var last = true;
    
    var totalChildren = function (a) {
        var c = 0;
        for (var i = 0; i < a.length;i++) {
            if (!isNull(a[i]))
                c += a[i].getChildrenCount();
        }
        return c;
    }

    while (first || totalChildren(children) > 0 || last) { 
        for (var i = children.length-1; i >= 0;i--) {
            var c = children[i];
            children.splice(i,1);
            
            var cScript = c.stateMachine;
            if (c != script.getSceneObject() && cScript && cScript.hasStateMachine) {
                script.subMachines.push(cScript);
            }
            first = false;  
            
            for (var x = 0; x < c.getChildrenCount();x++) {
                children.push(c.getChild(x));
            }
            
            if (children.length == 0)
                last = false;
        }        
    }
}

var hasState = function (state) {
    return processedStates[state] != null;
}

var clearState = function (objScript,state) {

    if (state == null)
        state = _state;
    
    processedStates[state] = null;
    var upperKey = state.charAt(0).toUpperCase() + state.slice(1);
    script.api["on"+upperKey] = function () {
        print("on"+upperKey + " no longer available");
    };
}

var lockState = function (objScript,state) {
    if (state == null)
        state = _state;

    var upperKey = state.charAt(0).toUpperCase() + state.slice(1);
    
    if (script.api["paused_"+upperKey] == null)
        script.api["paused_"+upperKey] = script.api["on"+upperKey];
    
    script.api["on"+upperKey] = function () {
        print("on"+upperKey + " is paused");
    };
}

var unlockState = function (objScript,state) {
    if (state == null)
        state = _state;

    var upperKey = state.charAt(0).toUpperCase() + state.slice(1);
    
    if (script.api["paused_"+upperKey]) {
        script.api["on"+upperKey] = script.api["paused_"+upperKey];
        script.api["paused_"+upperKey] = null;
    }
}

var setState = function (state) {
    
    if (!state.includes(":")) {
        return print("must contain state name");
    }
    
    var stateName = state.split(":")[0];    
        
    for (var i = 0; i < script.states.length; i++) {
        var _stateName = script.states[i].split(":")[0];
        if (stateName == _stateName) {
            print("replacing existing state " + _stateName);
            script.states[i] = state;
            processStates(); 
            return;
        }
    }
    print("add new state " + stateName);
    script.states.push(state);
    processStates(); 
}

var currentState = function () {
    return state;
}

var fast = function (objScript) {
    var currState = _state;
    script.api.removeUpdate("heart",runState);
    objScript.api.subscribeOnStateChange("fast",function () {
        script.api.addUpdate("heart",runState);
    });
    while (!script.focus && script.events.length > 0 && _state == currState && !objScript.focus && script.events[0].split("(")[0] != "global.Shortcuts.api.or" && script.events[0].split("(")[0] != "global.Shortcuts.api.delay" && script.events[0].split("(")[0] != "script.api.unfast" && script.events[0].split("(")[0] != "global.Shortcuts.api.focus" && !script.events[0].split(".api.")[1].startsWith("on") && !script.events[0].split(".api.")[1].startsWith("do")) {
        runState();
    }
    script.api.addUpdate("heart",runState);
}

var unfast = function (objScript) {
    //triggers fast to stop
}

var swapState = function (objScript,stateFrom,stateTo) {

    if (stateFrom == null || stateTo == null) {
        return print("must contain state name");
    }
    
    var _stateFrom = processedStates[stateFrom];
    var _stateTo = processedStates[stateTo];

    processedStates[stateFrom] = _stateTo;
    processedStates[stateTo] = _stateFrom;
}

var overwriteState = function (objScript,stateFrom,stateTo) {

    if (stateFrom == null || stateTo == null) {
        return print("must contain state name");
    }
    
    processedStates[stateFrom] = processedStates[stateTo];
}

var go = function (objScript,stateName) {
    
    if (typeof objScript == 'string' && stateName == null) {
        stateName = objScript;
    }    
    
    if (script.api.hasState(stateName)) {
        changeState(stateName);
    } else {
        print("no state " + stateName);
    }
}

var updateFocus = function (isFocused) {
    
    if (isFocused && typeof isFocused == 'object') {
        if (isFocused.focus == null) {
            return;
        }
        isFocused = null;
    }
    
    if (isFocused != null) {
        script.focus = isFocused?true:null;
        script.inFocus = isFocused?true:null;
        script.nextFocus = null;
        return {focus: isFocused}
    }

    if (script.nextFocus && !script.inFocus) {
        script.nextFocus = null;
        script.focus = true;
        script.inFocus = true;
        return {focus: true};
    }
    
    if (script.inFocus) {
        script.inFocus = null;
        script.focus = null;
        script.focusPos = null;
    }
    
    return {focus: null};
}

script.api.createCallback("StateChange");
script.api.createCallback("StateComplete");
script.api.clearData = clearData;

script.api.processStates = processStates;
script.api.runState = runState;
script.api.getState = getState;
script.api.setState = setState;
script.api.hasState = hasState;
script.api.switchState = swapState;
script.api.overwriteState = overwriteState;
script.api.currentState = currentState;
script.api.lockState = lockState;
script.api.unlockState = unlockState;
script.api.clearState = clearState;

script.api.go = go;
script.api.goDeep = global.Shortcuts.api.goDeep;
script.api.goUp = global.Shortcuts.api.goUp;
script.api.fast = fast;
script.api.unfast = unfast;
script.api.updateFocus = updateFocus;

script.api.gatherEmbeddedStateMachines = gatherEmbeddedStateMachines;

var initImmediately = script.states.length > 0 && (script.states[0].indexOf(":")>-1 ? script.states[0].split(":")[1] : script.states[0]).startsWith("fast");

if (initImmediately) {
    processStates();runState();
}

script.api.addUpdate("heart",runState);

script.api.addInit(function () {   
    if (!initImmediately) {
        processStates();runState();
    }
    gatherEmbeddedStateMachines();

    if (script.ENTRY_STATE && script.api.hasState(script.ENTRY_STATE)) {
        changeState(script.ENTRY_STATE);
        script.ENTRY_STATE = null;
    }
});

script.createEvent("OnDestroyEvent").bind(function () {
    clearData();
});

//Easily link with SIK Buttons
script.onEventCallback = function () {
    script.api.go(script,"click");
}