const worldQueryModule = require("LensStudio:WorldQueryModule")
var hitTestSession;

var floorHeight = function (objScript) {
    if (global.Objects.WORLD_FLOOR) {
        return global.Objects.WORLD_FLOOR.getTransform().y;
    } else {
        return -140;
    }
}

var generateProgressObj = function (objScript) {
    var progressParent = global.scene.createSceneObject("progress");
    var progressBorder = global.scene.createSceneObject("progressBorder");
    var progressCircle = global.scene.createSceneObject("progressCircle");
    
    progressCircle.setParentPreserveWorldTransform(progressParent);
    progressBorder.setParentPreserveWorldTransform(progressParent);
    
    progressBorder.getTransform().setLocalRotation(quat.fromEulerAngles(90*Math.PI/180,0,0));
    progressCircle.getTransform().setLocalRotation(quat.fromEulerAngles(90*Math.PI/180,0,0));
    
    var overrides = function (o) {
        o.api.updateFocus = function () {}; o.api.subscribeOnStateChange = function () {};
    }    
    
    var heartbeat = global.Heartbeat.api.add(progressParent);  
    overrides(heartbeat);
    var pbHeartbeat = global.Heartbeat.api.add(progressBorder);    
    overrides(pbHeartbeat);
    var pcHeartbeat = global.Heartbeat.api.add(progressCircle);
    overrides(pcHeartbeat);
    
    global.Shortcuts.api.plane(pbHeartbeat,30);
    global.Shortcuts.api.texture(pbHeartbeat,"circle_border");
    
    global.Shortcuts.api.plane(pcHeartbeat,30);
    global.Shortcuts.api.texture(pcHeartbeat,"circle");
    
    global.Shortcuts.api.scale(heartbeat,0);
    global.Shortcuts.api.scale(pcHeartbeat,0);
    
    heartbeat.progress = 0;
    var scaleIn = false;
    
    heartbeat.api.addUpdate("progress",function () {
        
        if (heartbeat.progress_cancel) {
            heartbeat.api.removeUpdate("progress");
            global.Shortcuts.api.destroy(heartbeat);
            return;
        }
        
        if (heartbeat.progress_complete) {
            global.Shortcuts.api.ease(heartbeat,"easeOut");
            global.Shortcuts.api.scale(heartbeat,2,1);
            global.Shortcuts.api.alpha(heartbeat,0,1);
            
            heartbeat.api.addDelay("destroy",1,function () {
                global.Shortcuts.api.destroy(heartbeat);
            })
            heartbeat.api.removeUpdate("progress");
            return;
        }        
        
        if (!scaleIn && heartbeat.progress > 0) {
            global.Shortcuts.api.ease(heartbeat,"easeOut");
            global.Shortcuts.api.scale(heartbeat,1,0.4);
            scaleIn = true;
        } else if (scaleIn && heartbeat.progress == 0) {
            global.Shortcuts.api.ease(heartbeat,"easeOut");
            global.Shortcuts.api.scale(heartbeat,0,0.4);
            scaleIn = false;
        }
        
        if (heartbeat.results) {
            var results = heartbeat.results;
            objScript.progress_circle.getTransform().setWorldPosition(results.position);
            objScript.progress_circle.getTransform().setWorldRotation(quat.lookAt(results.normal.uniformScale(1000),vec3.up()));
        }
    });
    
    return heartbeat;
}

var worldQuery = function (objScript,p1,p2,callback) {
    
    if (!global.deviceInfoSystem.isSpectacles()) {
        print("WORLD QUERY ERROR: Switch to Spectacles!");
        return;
    }
    
    var target;
    var rayStart;
    var rayEnd;
    
    if (typeof p1 == 'object') {
        rayStart = new vec3(p1[0],p1[1],p1[2]);
    } else if (typeof p1 == 'string') {
        target = global.Shortcuts.api.sortTarget(objScript,p1);
        rayStart = target.getTransform().getWorldPosition();
    }

    if (typeof p2 == 'object') {    
        rayEnd = new vec3(p2[0],p2[1],p2[2]);
    } else if (typeof p2 == 'number') {
        rayEnd = target.getTransform().back.uniformScale(p2);
    }
    
    if (!rayStart || !rayEnd) {
        return;
    } 

    if (hitTestSession == null) {
        const options = HitTestSessionOptions.create();
        options.filter = true;
        hitTestSession =  worldQueryModule.createHitTestSessionWithOptions(options);
        hitTestSession.start();
    }
    
    hitTestSession.hitTest(rayStart, rayEnd, function (results) {
        if (results) {
            if (callback)
                callback(results);
        } 
    });
}

var worldAnchor = function (objScript,distance,type) {
    
    if (objScript.progress_circle == null) {
        objScript.progress_circle = generateProgressObj(objScript);
    }
    
    if (distance == null) {
        distance = 500;
    }    
    
    objScript.api.updateFocus(true);
    
    var cameraT = global.Objects["CAMERA"].getTransform();
    
    var wait = false;
    var calibrationFrames = 0;
    var calibrationTotal = 30;
    var history = [];
    var cancelled = false;
    
    objScript.api.addUpdate("worldAnchor",function () {
        var rayStart = cameraT.getWorldPosition();
        var rayEnd = rayStart.add(cameraT.back.uniformScale(distance));
//        var rayEnd = type == null ? 
//            rayStart.add(cameraT.back.uniformScale(distance)) : 
//            (type == "wall" ? rayStart.add(new vec3(cameraT.back.x,0,cameraT.back.z).normalize().uniformScale(distance)) :
//            rayStart.add(new vec3(cameraT.back.x,-0.5,cameraT.back.z).normalize().uniformScale(distance*2)));
        
        wait = true;
        worldQuery(objScript,[rayStart.x,rayStart.y,rayStart.z],[rayEnd.x,rayEnd.y,rayEnd.z],function (results) {
            if (cancelled) {
                return;
            }
            if (results) {
                if (type == "floor" && results.normal.distance(vec3.up()) < 0.1 || type == "wall" && results.normal.distance(vec3.up()) > 0.9) {
                    history.push(results.position);
                    if (history.length > calibrationTotal) {
                        history.shift();
                    }
                    const distance = history[0].distance(history[history.length - 1]);
                    if (distance < 10) {
                        calibrationFrames++;
                    } else {
                        calibrationFrames = 0;
                    }
                    if (objScript.progress_circle) {
                        objScript.progress_circle.progress = calibrationFrames;
                        objScript.progress_circle.results = results;
                    }
                } else {
                    if (objScript.progress_circle) {
                        objScript.progress_circle.progress = 0;
                    }
                    calibrationFrames = 0;
                    history = [];
                }

                if (calibrationFrames < calibrationTotal) {
                    return;
                }
                
                if (objScript.progress_circle) {
                    objScript.progress_circle.progress_complete = true;
                    objScript.progress_circle = null;
                }
                
                var anchor = global.scene.createSceneObject("worldquery");
                var anchorT = anchor.getTransform();
                anchorT.setWorldPosition(results.position);
                anchorT.setWorldRotation(quat.lookAt(results.normal.uniformScale(1000),vec3.up()));
                objScript.target = anchor;
                
                objScript.api.updateFocus();
                objScript.api.removeUpdate("worldAnchor");
            } else {
                if (objScript.progress_circle) {
                    objScript.progress_circle.progress = 0;
                }
            }
            wait = false;
        });
    });
    
    objScript.api.subscribeOnStateChange("worldAnchor",function () {
        objScript.api.removeUpdate("worldAnchor");
        cancelled = true;
        if (objScript.progress_circle) {
            objScript.progress_circle.progress_cancel = true;
            objScript.progress_circle = null;
        }
    });
}

var wallAnchor = function (objScript,distance) {
    worldAnchor(objScript,distance,"wall")
}

var floorAnchor = function (objScript,distance) {
    worldAnchor(objScript,distance,"floor")
}

var findFloor = function (objScript,distance) {
    
    objScript.api.updateFocus(true);    
    
    if (distance == null) {
        distance = 500;
    }   
    
    var T = objScript.getTransform();
    
    objScript.api.addUpdate("worldAnchor",function () {
        
        var rayStart = T.getWorldPosition();
        var rayEnd = rayStart.add(vec3.up().uniformScale(-distance));
    
        wait = true;
        worldQuery(objScript,[rayStart.x,rayStart.y,rayStart.z],[rayEnd.x,rayEnd.y,rayEnd.z],function (results) {
            if (results) {
                if (results.normal.distance(vec3.up()) >= 0.1) {
                    return;
                }
                var anchor = global.scene.createSceneObject("worldquery");
                var anchorT = anchor.getTransform();
                anchorT.setWorldPosition(results.position);
                anchorT.setWorldRotation(quat.lookAt(results.normal.uniformScale(1000),vec3.up()));
                objScript.target = anchor;
                
                objScript.api.updateFocus();
                objScript.api.removeUpdate("worldAnchor");
            }
            wait = false;
        });
        
    });
    
    objScript.api.subscribeOnStateChange("worldAnchor",function () {
        objScript.api.removeUpdate("worldAnchor");
    });
    
}

global.Shortcuts.api.floorHeight = floorHeight;
global.Shortcuts.api.worldQuery = worldQuery;
global.Shortcuts.api.worldAnchor = worldAnchor;
global.Shortcuts.api.wallAnchor = wallAnchor;
global.Shortcuts.api.floorAnchor = floorAnchor;

global.Shortcuts.api.findFloor = findFloor;