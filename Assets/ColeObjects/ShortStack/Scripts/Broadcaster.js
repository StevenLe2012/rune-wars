global.Broadcaster = script;

var subscriptions = {};

global.subscribeToFlag = function (flag,callback,destroy,sceneObject,tag) {    
    
    if (subscriptions[flag] == null) {
        subscriptions[flag] = [];
    }   
   
    
    subscriptions[flag].push({"callback":callback,"destroy":destroy,"sceneObject":sceneObject,"tag":tag});
}

global.broadcastToFlag = function (flag,origin) {
    if (subscriptions[flag] == null)    
        return;
    
    for (var i = subscriptions[flag].length - 1;i >= 0;i--) {
        if (subscriptions[flag][i] == null) {
            subscriptions[flag].splice(i,1);
            continue;
        }
            
        if (subscriptions[flag][i].callback != null && typeof(subscriptions[flag][i].callback) == "function") {
            
            var callback = subscriptions[flag][i].callback;
            var success = callback(origin);
            
            if (subscriptions[flag][i] != null && subscriptions[flag][i].destroy && success != false) {
                subscriptions[flag].splice(i,1);
            }
        }
    }    
    
    if (subscriptions[flag].length == 0) {
        delete subscriptions[flag];
    }
}

global.unsubscribeFromFlag = function (flag,delimiter) {
    
    if (subscriptions[flag] == null)
        return;
    
    var searchFor = "sceneObject"
    
    if (typeof delimiter == "string") {
        searchFor = "tag";
    }
    
    for (var i = subscriptions[flag].length -1;i >= 0;i--) {
        
        if (subscriptions[flag][i][searchFor] == delimiter) {
           subscriptions[flag].splice(i,1);
           return;
        }
    }
}

global.unsubscribeAllFlags = function (sceneObject) {
    
    var allFlags = Object.keys(subscriptions); 
    
    for (var i = 0; i < allFlags.length; i++) {
        global.unsubscribeFromFlag(allFlags[i],sceneObject);
    }
    
}