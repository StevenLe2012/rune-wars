if (!global.deviceInfoSystem.isSpectacles())
    return;

var SIK = require("SpectaclesInteractionKit/SIK").SIK
var HandDataProvider = SIK.HandInputData;

var worldQuery = null;

var isHandTracking = function (objScript,callback,hand,lost) {

    if (callback != null) {
        if (!callback.includes("on")) {
            callback = "on" + callback.charAt(0).toUpperCase() + callback.slice(1);
        }
    } else {
        objScript.focus = true;
    }

    var check = function () {

        if (global.deviceInfoSystem.isEditor()) {
            return true;
        }

        var rightHand = HandDataProvider.getHand("right");
        var leftHand = HandDataProvider.getHand("left");

        if (lost) {
            if (hand) {
                if (hand === "left") {
                    return !leftHand.isTracked();
                } else {
                    return !rightHand.isTracked();
                }
            } 
            return !leftHand.isTracked() && !rightHand.isTracked()
        } else {
            if (hand) {
                if (hand === "left") {
                    return leftHand.isTracked();
                } else {
                    return rightHand.isTracked();
                }
            } 
            return leftHand.isTracked() || rightHand.isTracked();
        }
    }

    var toggle = function () {
        if (check()) {
            print("HAS HAND TRACKING!")
            if (callback) {
                objScript.api[callback]();
            }
            objScript.focus = null;
            objScript.nextFocus = null;
            objScript.api.removeUpdate("checkHandTracking");
        }
    }

    objScript.api.addUpdate("checkHandTracking",toggle);
    toggle();

    objScript.api.subscribeOnStateChange("handtracking",function () {
        objScript.api.removeUpdate("checkHandTracking");
        objScript.focus = null;
    });
}

var isHandTrackingLost = function (objScript,callback,hand) {
    global.Shortcuts.api.isHandTracking(objScript,callback,hand,true);
}

var isLeftTracking = function (objScript,callback) {
    isHandTracking(objScript,callback,"left");
}

var isRightTracking = function (objScript,callback) {
    isHandTracking(objScript,callback,"right");
}

var isLeftTrackingLost = function (objScript,callback) {
    isHandTrackingLost(objScript,callback,"left");
}

var isRightTrackingLost = function (objScript,callback) {
    isHandTrackingLost(objScript,callback,"right");
}

var pinch = function (objScript,callback,hand,not) {

    objScript.focus = true;

    var check = function () {

        if (global.deviceInfoSystem.isEditor()) {
            return true;
        }

        var rightHand = HandDataProvider.getHand("right");
        var leftHand = HandDataProvider.getHand("left");

        if (not) {
            if (hand) {
                if (hand === "left") {
                    return !leftHand.isPinching();
                } else {
                    return !rightHand.isPinching();
                }
            } 
            return !leftHand.isPinching() && !rightHand.isPinching()
        } else {
            if (hand) {
                if (hand === "left") {
                    return leftHand.isPinching();
                } else {
                    return rightHand.isPinching();
                }
            } 
            return leftHand.isPinching() || rightHand.isPinching();
        }
    }

    objScript.api.addUpdate("pinch",function () {
       if (check()) {
            print("HAS HAND TRACKING!")
            if (callback) {
                objScript.api[callback]();
            }
            objScript.focus = null;
            objScript.nextFocus = null;
            objScript.api.removeUpdate("pinch");
        }
    });

    objScript.api.subscribeOnStateChange("pinch",function () {
        objScript.api.removeUpdate("pinch");
    });
}

var leftPinch = function (objScript,callback) {
    pinch(objScript,callback,"left")
}
    
var rightPinch = function (objScript,callback) {
    pinch(objScript,callback,"right")
}
    
var unpinch = function (objScript,callback,hand) {
    unpinch(objScript,callback,hand,true);
}
    
var leftUnpinch = function (objScript,callback) {
    unpinch(objScript,callback,"left");
}
    
var rightUnpinch = function (objScript,callback) {
    unpinch(objScript,callback,"right");
}

var palmUp = function (objScript,hand,lost) {

    objScript.focus = true;

    var rightHand = HandDataProvider.getHand("right");
    var leftHand = HandDataProvider.getHand("left");
    var activeHand;

    if (hand === "left") {
        activeHand = leftHand;
    } else { 
        activeHand = rightHand;    
    }

    objScript.api.addUpdate("palm",function () {

        if (hand == null && activeHand == null) {
            activeHand = rightHand.isTracked() ? rightHand : (leftHand.isTracked() ? leftHand : null);
            return;
        }
        
        var T = global.Objects["CAMERA"].getTransform();        
        
        var directionToCamera = activeHand.middleToWrist.position.sub(T.getWorldPosition());
        var objectForward = activeHand.middleToWrist.forward;
        var angle = objectForward.angleTo(directionToCamera);

        if (!lost && angle > 2.5 || lost && angle < 2.3) {
            objScript.api.removeUpdate("palm");
            objScript.focus = false;
        }
    });

    objScript.api.subscribeOnStateChange("palm",function () {
        objScript.api.removeUpdate("palm");
    });

}

var palmDown = function (objScript,hand) {
    palmUp(objScript,hand,true);
}
     
global.Shortcuts.api.isHandTracking = isHandTracking;
global.Shortcuts.api.isHandTrackingLost = isHandTrackingLost;
global.Shortcuts.api.isLeftTracking = isLeftTracking;
global.Shortcuts.api.isRightTracking = isRightTracking;    
global.Shortcuts.api.isLeftTrackingLost = isLeftTrackingLost;
global.Shortcuts.api.isRightTrackingLost = isRightTrackingLost;
global.Shortcuts.api.pinch = pinch;
global.Shortcuts.api.unpinch = unpinch;
global.Shortcuts.api.leftPinch = leftPinch;
global.Shortcuts.api.rightPinch = rightPinch;
global.Shortcuts.api.leftUnpinch = leftUnpinch;
global.Shortcuts.api.rightUnpinch = rightUnpinch;
global.Shortcuts.api.palmUp = palmUp;
global.Shortcuts.api.palmDown = palmDown;