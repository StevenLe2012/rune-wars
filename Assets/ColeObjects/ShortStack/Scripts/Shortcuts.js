global.Shortcuts = script;

if (global.Objects == null) {
    global.Objects = [];
}

if (global.Objects.CAMERA == null) {
    
    var getRootObjectsCount = global.scene.getRootObjectsCount();
    for (var c = 0; c < getRootObjectsCount; c++) {
        var rootObject = global.scene.getRootObject(c);
        if (rootObject.getComponent("Component.Camera")) {
            global.Objects.CAMERA = rootObject;
            global.Objects.CAMERA.camera = rootObject.getComponent("Component.Camera");
            global.Objects.CAMERA.tracker = rootObject.getComponent("Component.DeviceTracking");
            break;
        }
    }
}

if (global.Objects.SPAWN_CATCHER == null) {
    global.Objects.SPAWN_CATCHER = global.scene.createSceneObject("SPAWN_CATCHER");
}

var _offset = 0;
    
var sortTarget = function (objScript,target) {
    if (typeof target == 'string') {
        if (objScript.getSceneObject()[target]) { 
            return objScript.getSceneObject()[target];
        } else if (objScript[target]) {
            return objScript[target];
        } else if (global.Objects && global.Objects[target] && typeof global.Objects[target] == 'object') {
            if (global.Objects[target].getSceneObject) {
                return global.Objects[target].getSceneObject();
            }
            return global.Objects[target];        
        }
        return global.Objects.CAMERA;
    } else if (target != null && typeof target == 'object' && target.getTransform) {
        return target;
    } else if (objScript.target && target == null) {
        return objScript.target;
    } else if (target == null) {
        return global.Objects.CAMERA;
    }
    return target;
}

var getTargetPos = function (target,local) {
    if (target == null)
        return null;
    
    if (isNull(target))
        return null;
    
    if (target.x) {
        return target;
    } else if (target.getWorldPosition) {
        return target[!local?"getWorldPosition":"getLocalPosition"]();
    } else if (target.getTransform) {
        return target.getTransform()[!local?"getWorldPosition":"getLocalPosition"]();
    }
    return target;
}

var getTargetRot = function (target) {
    if (target == null)
        return null;
    
    if (isNull(target))
        return null;
    
    if (target.w) {
        return target;
    } else if (target.getWorldRotation) {
        return target.getWorldRotation();
    } else if (target.getTransform) {
        return target.getTransform().getWorldRotation();
    }
    return target;
}

var yay = function (objScript) {
    print("yay! from " + objScript.getSceneObject().name);
}

var touchingFloor = function (objScript) {
    
    var token = objScript.api.updateFocus(true);

    if (global.Objects.WORLD_FLOOR) {
        var floorHeight = global.Objects.WORLD_FLOOR.getTransform().getWorldPosition().y;
    } else {
        var floorHeight = global.Objects["CAMERA"].getTransform().getWorldPosition().y - 140;
    }

    objScript.api.addDelay("touchingFloor",0.2,function () {
        objScript.api.addUpdate("touchingFloor",function () {
            if (objScript.getTransform().getWorldPosition().y < floorHeight) {
                objScript.api.removeUpdate("touchingFloor");
                objScript.api.removeUpdate("gravity");
                objScript.api.updateFocus(token);
                var pos = objScript.getTransform().getWorldPosition();
                pos.y = floorHeight;
                objScript.getTransform().setWorldPosition(pos);
            } 
        });
    });
    
    objScript.api.subscribeOnStateChange("touchingFloor",function () {
        objScript.api.removeDelay("touchingFloor");
        objScript.api.removeUpdate("touchingFloor");
    })
}

var anim = function (objScript,clip,additive) {

    if (additive == null)
        additive = true;

    var token = objScript.api.updateFocus();

    var animPlayer = global.getComponentInChildren(objScript.getSceneObject(),"Component.AnimationPlayer")[0];

    if (animPlayer == null) {
        animPlayer = global.getComponentInParent(objScript.getSceneObject(),"Component.AnimationPlayer")[0];
        if (animPlayer == null) {
            objScript.api.updateFocus(token);
            return;
        }
    }

    var animScript = animPlayer.getSceneObject().stateMachine ? animPlayer.getSceneObject().stateMachine : objScript;   
    var prevClip = animScript.clip;

    var clips = animPlayer.clips;

    for (var i = 0; i < clips.length; i++) {
        if (clip == clips[i].name) {
            animPlayer.playClipAt(clips[i].name,0.0);
            clips[i].weight = 1;
            animScript.clip = i;
        } else if (prevClip == i && additive) {
            animPlayer.resumeClip(clips[i].name);
            clips[i].weight = 1;  
        } else {
            animPlayer.pauseClip(clips[i].name);
            clips[i].weight = 0;
        }
    }

    if (token.focus) {
        if (!animPlayer.getClip(clip)) {
            objScript.api.updateFocus(token);
            return;
        }
        var timeElapsed = 0;
        objScript.api.addUpdate("anim",function () {
            timeElapsed += getDeltaTime();
            if (timeElapsed >= animPlayer.getClip(clip).end) {
                objScript.api.updateFocus(token);
                objScript.api.removeUpdate("anim");
            }
        });
    }

    if (prevClip == null || !additive)
        return;

    var startTime = getTime();
    var blendTime = 1;

    animPlayer.clips[prevClip].blendMode = AnimationLayerBlendMode.Default;
    animPlayer.clips[animScript.clip].blendMode = AnimationLayerBlendMode.Default;

    animScript.api.addUpdate("blend",function () {
        var t = Math.min(1,(getTime()-startTime)/blendTime);
        animPlayer.clips[prevClip].weight = 1-t;
        animPlayer.clips[animScript.clip].weight = t;
        if (t == 1) {
            objScript.api.removeUpdate("blend");
            animPlayer.pauseClip(clips[prevClip].name);
        }
    });

    objScript.api.subscribeOnStateChange("anim",function () {
        objScript.api.removeUpdate("anim");
    });
}

var blendshape = function (objScript,anim,p1,p2,p3,p4,p5) {
    
    if (anim == null)
        return;
    
    var renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.RenderMeshVisual");
    
    if (renderers == null || renderers.length == 0) {
        renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.Image");
    }          
    if (renderers == null || renderers.length == 0) {
        return;   
    }
    
    objScript.meshRenderer = renderers[0];
    
    if (!objScript.meshRenderer.hasBlendShapeWeight(anim)) {
        print("no blendshape with name: " + anim);
        return;
    }
    
    var loop = false;
    var t = 0;
    var sV = objScript.meshRenderer.getBlendShapeWeight(anim);
    var eV = 1;
    
    if (p1 != null && p2 == null && p3 == null) {
        eV = p1;
    } else if (p1 != null && p2 != null && p3 == null) {
        eV = p1;
        t = p2;
    } else {
        sV = p1;
        eV = p2;
        t = p3;
    }

    var startTime = getTime();
    var fwd = true;
    var calc = function (v) {
        if (fwd) {
            return v;
        } else {
            return 1-v;
        }
    }
    
    if (t == 0) {
        objScript.meshRenderer.setBlendShapeWeight(anim,eV); 
    } else {
        objScript.api.addUpdate("blend_"+anim,function () {
            var f = Math.max(0,Math.min(1,MathUtils.lerp(sV,eV,(getTime()-startTime)/t)));//calc(Math.max(0,Math.min(1,MathUtils.lerp(sV,eV,(getTime()-startTime)/t))));
            objScript.meshRenderer.setBlendShapeWeight(anim,f); 
        });   
        
        objScript.api.subscribeOnStateChange("blend_"+anim,function () {
            objScript.api.removeUpdate("blend_"+anim);
        });
    }
    
}

var mesh = function (objScript,meshOrCategory,index) {

    if (index != null && !isNaN(index) && global.MeshManager["from" + meshOrCategory]) {
        var m = global.MeshManager["from" + meshOrCategory](index);
    } else if (global.MeshManager.hasMesh(meshOrCategory)) {
        var m = global.MeshManager.mesh(meshOrCategory);
    }

    findRenderer(objScript);

    if (objScript.meshRenderer == null) {
        shape(objScript,meshOrCategory.name,index);
    } else {
        objScript.meshRenderer.mesh = m;
    }  
}

var hide = function (objScript) {
    var renderOptions = findRenderer(objScript);
    renderOptions.renderer.enabled = false;        
}

var unhide = function (objScript) {
    var renderOptions = findRenderer(objScript);
    renderOptions.renderer.enabled = true;        
}

var enable = function (objScript) {
    objScript.getSceneObject().enabled = true;
}

var disable = function (objScript) {
    objScript.getSceneObject().enabled = false;
}

var unparent = function (objScript) {
    objScript.getSceneObject().setParentPreserveWorldTransform(null);
}

var unparentChildren = function (objScript, newState) {
    var childrenCount = objScript.getSceneObject().getChildrenCount();
    for (var i = childrenCount-1; i >= 0; i--) {
        var child = objScript.getSceneObject().getChild(0);
        child.setParentPreserveWorldTransform(null);
        if (newState != null && child.stateMachine) {
            var stateFunc = convertToStateCallback(child.stateMachine, newState);
            if (stateFunc) stateFunc();
        }
    }
    objScript.api.gatherEmbeddedStateMachines();
}

var parent = function (objScript,parentName,recenter,offset) {
    var parent = sortTarget(objScript,parentName);
    
    if (objScript.getSceneObject().hasParent() && objScript.getSceneObject().getParent() == parent)
        return;
    
    objScript.getSceneObject().setParentPreserveWorldTransform(parent);
    
    if (recenter) {
        var pos = vec3.zero();
        var rot = quat.quatIdentity();
        var t = objScript.getSceneObject().getTransform();        
        if (offset != null) {
            if (typeof offset == 'boolean') {
                pos = t.getWorldPosition();
                rot = t.getWorldRotation();
            } else if (typeof offset == 'object') {
                pos = new vec3(offset[0],offset[1],offset[2]);
            }
        }
        t.setLocalPosition(pos);
        t.setLocalRotation(rot);
    }

    //we want to refresh the parent!
    if (parent.stateMachine) {
        refresh(parent.stateMachine);
    }
}

var refresh = function (objScript) {
    objScript.api.gatherEmbeddedStateMachines();
}

var lookForward = function (objScript,speed,noY) {
    
    var T = objScript.getTransform();
    
    var lastPos = T.getWorldPosition();
    
    objScript.api.addUpdate("turn",function () {
        var currPos = T.getWorldPosition();
        var dir = currPos.sub(lastPos)
        lastPos = currPos;
        
        var to = T.getWorldPosition().add(dir);
        var fr = T.getWorldPosition();           
        
        var _lookRotation = quat.lookAt(to.sub(fr).normalize(), vec3.up());
       
//        if (rotOffset) {
//            _lookRotation = _lookRotation.multiply(quat.fromEulerVec(rotOffset));
//        }

        if (noY) {
            to.y = fr.y;
        }
        
        if (speed == null) {
            T.setWorldRotation(_lookRotation);
        } else {
            var rotationStep = quat.slerp(T.getWorldRotation(), _lookRotation,  getDeltaTime() * speed);    
        
            if (!isNaN(rotationStep.x)) {
                T.setWorldRotation(rotationStep);
            }
        }
    });
    
    //stop moving on state change
    objScript.api.subscribeOnStateChange("turn",function () {
        objScript.api.removeUpdate("turn");
    });
}

var lookAt = function (objScript,speed,x,y,z,noY) {
    var T = objScript.getTransform();
    var rotOffset = null;
    
    if (x != null && y != null && z != null) {
        rotOffset = new vec3(x,y,z).uniformScale(Math.PI/180)
    }
    
    var target = sortTarget(objScript);    

    var _lookAt = function () {
        var to = getTargetPos(target);
    
        if (to == null)
            return;
    
        var fr = T.getWorldPosition();
    
        if (noY)
            to.y = fr.y;            
        
        var _lookRotation = quat.lookAt(to.sub(fr).normalize(), vec3.up());
       
        if (rotOffset) {
            _lookRotation = _lookRotation.multiply(quat.fromEulerVec(rotOffset));
        }
        
        var rotationStep = quat.slerp(T.getWorldRotation(), _lookRotation, !speed?1:(getDeltaTime() * speed));    
    
        if (!isNaN(rotationStep.x)) {
            T.setWorldRotation(rotationStep);
        }
    }
    if (speed == null) {
        _lookAt();
    }
    objScript.api.addUpdate("turn",_lookAt);
    
    //stop rotating on state change
    if (objScript.api.subscribeOnStateChange) {
        objScript.api.subscribeOnStateChange("turn",function () {
            objScript.api.removeUpdate("turn");
        });
    }
}

var lookTowards = function (objScript,speed,x,y,z) {
    lookAt(objScript,speed,x,y,z,true);
}

var lookTowardsOnce = function (objScript,x,y,z) {
    var to = getTargetPos(sortTarget(objScript));
    var fr = objScript.getTransform().getWorldPosition();
    to.y = fr.y;

    var _lookRotation = quat.lookAt(to.sub(fr).normalize(), vec3.up());

    if (x != null && y != null && z != null) {
        _lookRotation = _lookRotation.multiply(quat.fromEulerVec(new vec3(x,y,z).uniformScale(Math.PI/180)));
    }
    
    objScript.getTransform().setWorldRotation(_lookRotation);
}


var lookAtOnce = function (objScript,x,y,z) {
    var to = getTargetPos(sortTarget(objScript));
    var fr = objScript.getTransform().getWorldPosition();
    var _lookRotation = quat.lookAt(to.sub(fr).normalize(), vec3.up());
    if (x != null && y != null && z != null) {
        _lookRotation = _lookRotation.multiply(quat.fromEulerVec(new vec3(x,y,z).uniformScale(Math.PI/180)));
    }
    objScript.getTransform().setWorldRotation(_lookRotation);
}

var lookAway = function (objScript,speed) {
    lookAt(objScript,speed,0,180,0,true);
}

var hopTurn = function (objScript,minAngle,time,height,force) {

    var token = objScript.api.updateFocus();
    var T = objScript.getTransform();
    var turnTime = getTime();
    
    if (minAngle == null)
        minAngle = 30;
    
    if (time == null)
        time = 0.6;

    if (height == null)
        height = 20;
    
    var target = sortTarget(objScript);
    var to = getTargetPos(target)
    var fr = T.getWorldPosition();
    to.y = fr.y;   
    
    var _lookRotation = quat.lookAt(to.sub(fr).normalize(), vec3.up());
    var angleBetween = quat.angleBetween(T.getWorldRotation(), _lookRotation)*(180/Math.PI);

    
    if (!force && (angleBetween < minAngle || angleBetween > 360-minAngle)) {
        objScript.api.updateFocus(token);
        return;
    }
    
    hop(objScript, height, time/2)
    
    objScript.api.addUpdate("turn",function () {
        
        var t = Math.min(1,(getTime()-turnTime)/time);
        
        var rotationStep = quat.slerp(T.getWorldRotation(), _lookRotation, t);    
        
        if (!isNaN(rotationStep.x)) {
            T.setWorldRotation(rotationStep);
        }
        
        if (t >= 1) {
            objScript.api.removeUpdate("turn");
            objScript.api.updateFocus(token);
        }
    });
    
    //stop rotating on state change
    objScript.api.subscribeOnStateChange("turn",function () {
        objScript.api.removeUpdate("turn");
    });
}

var hop = function (objScript,height,time) {
    
    var token = objScript.api.updateFocus();
    
    if (height == null)
        height = 20;
    
    if (time == null)
        time = 0.4;
    
    var startTime = getTime()
    
    var startPosition = objScript.getTransform().getLocalPosition();
    var targetWorldPosition = startPosition.add(new vec3(0, height, 0));
    
    var physicsBody = objScript.getSceneObject().getComponent("Physics.BodyComponent");
    var objHeight = physicsBody?global.getBounds(physicsBody).y/2:0;
    
    var ease = objScript.injectEase?objScript.injectEase:function (t) {
        return t;
    }; 
    
    objScript.injectEase = null;
    
    objScript.api.addUpdate("move",function () {
        
        var t = (getTime()-startTime)/time;
        var tE =  ease(t);
    
        var hopMovement = Math.sin(tE * Math.PI);
        var newPosition = vec3.lerp(startPosition, targetWorldPosition, hopMovement);
        objScript.getTransform().setLocalPosition(newPosition);
        
        if (t >= 1) {
            objScript.getTransform().setLocalPosition(startPosition);
            objScript.api.removeUpdate("move");
            objScript.api.updateFocus(token);
        }
    });  
    
    objScript.api.subscribeOnStateChange("move",function () {
         objScript.getTransform().setLocalPosition(startPosition);
            objScript.api.removeUpdate("move");
    });
}

var delay = function (objScript,delayTime) {
    var token = objScript.api.updateFocus(true); 
    if (delayTime == null)
        delayTime = 1;
    
    objScript.api.addDelay("delay",delayTime,function () {
        objScript.api.updateFocus(token);
        objScript.api.unsubscribeOnStateChange("delay");
    });
    
    //stop delay on state change
    objScript.api.subscribeOnStateChange("delay",function () {
        objScript.api.removeDelay("delay");
        objScript.api.unsubscribeOnStateChange("delay");
    });
}

var focus = function (objScript) {
    objScript.nextFocus = true;
}

var jiggle = function (objScript,intensity,time) {
    
    var token = objScript.api.updateFocus();
    
    objScript = processScript(objScript);
    
    if (intensity == null)
        intensity = 0.5;
    
    if (time == null)
        time = 1;
    
    if (objScript.startScale == null)
        objScript.startScale = objScript.getTransform().getLocalScale();
    
    intensity = (1 - intensity);
    
    var startTime = getTime();
    var objT = objScript.getTransform();
    
    objScript.api.addUpdate("bouncy",function () {
        var t = Math.min(1,(getTime()-startTime)/time);

        var x = (intensity+global.Ease["easeOutElastic"](t)*(1-intensity));

        var mult = new vec3(x,x,x);
        objT.setLocalScale(objScript.startScale.mult(mult)); 

        if (t == 1) {
            objScript.api.removeUpdate("bouncy");
            objScript.api.updateFocus(token);
        }
    }); 
}

var flash = function (objScript,p1,p2,p3,p4,p5) {
    
    var brightness = 1;
    var fadeTime = 1;
    var color = new vec3(1,0,0);
    
    var renderOptions = findRenderer(objScript);
    var lastTime = getTime();

    if (p1 != null && p2 == null && p3 == null && p4 == null) {
        if (typeof p1 == 'string') {
            color = renderOptions.rgb(p1);
        } else {
            brightness = p1;
        }
    } else if (p1 != null && p2 != null && p3 == null && p4 == null) {
        if (typeof p1 == 'string') {
            color = renderOptions.rgb(p1);
            brightness = p2;
        } else {
            brightness = p1;
            fadeTime = p2;
        }
    } else if (p1 != null && p2 != null && p3 != null && p4 == null) {
        if (typeof p1 == 'string') {
            color = renderOptions.rgb(p1);
            brightness = p2;
            fadeTime = p3;
        } else {
            color = new vec3(p1,p2,p3);
        }
    } else if (p1 != null && p2 != null && p3 != null && p4 != null) {
        color = new vec3(p1,p2,p3);
        brightness = p4;
        if (p5 != null) {
            fadeTime = p5;
        }
    }

    objScript.api.addUpdate("flash",function () {
        var t = (getTime()-lastTime)/fadeTime;     
        renderOptions.set_prop("emissiveColor",color);
        renderOptions.set_prop("emissiveIntensity",0.05 + brightness-t*brightness);
        renderOptions.set_prop("flashIntensity",brightness-t*brightness);
        
        if (t >= 1)
            objScript.api.removeUpdate("flash");
    });   
}

var group = function (objScript,groupId) {
    if (global.Groups == null) {
        global.Groups = {};
        global.Groups.clean = function (groupId) {
            if (groupId == null) {
                return;
            }
            var objs = global.Groups[groupId];
            for (var i = objs.length-1; i >= 0; i--) {
                if (objs[i] == null || isNull(objs[i])) {
                    global.Groups[groupId].splice(i,1);
                }
            }
        }
    }
    if (global.Groups[groupId] == null) {
        global.Groups[groupId] = [];
    }
    global.Groups[groupId].push(objScript.getSceneObject());
    objScript.GROUP_ID = groupId;
    objScript.getSceneObject().GROUP_ID = groupId;
}

var ungroup = function (objScript,groupId) {

    if (groupId == null) {
        groupId = objScript.GROUP_ID;
        if (groupId == null)
            return;
    }

    var i = global.Groups[groupId].indexOf(objScript.getSceneObject());
    if (i > -1) {
        global.Groups[groupId].splice(i,1);
    }    

}

var nearest = function (objScript,groupId,maxDistance) {

    var token = objScript.api.updateFocus(true);

    if (maxDistance == null) {
        maxDistance = 1000000;
    }

    objScript.api.addUpdate("nearest",function () {
        
        if (global.Groups == null || global.Groups[groupId] == null) {
            return print("group with id " + groupId + " does not exist, yet!");
        }

        var g = global.Groups[groupId];
        var objPos = objScript.getTransform().getWorldPosition();
        var distance = maxDistance;
        var closest;

        global.Groups.clean(groupId);

        for (var i = g.length-1; i >= 0; i--) {
            var d = objPos.distance(g[i].getTransform().getWorldPosition());
            if (d < distance) {
                closest = g[i];
                distance = d;
            }
        }

        if (closest != null) {
            objScript.target = closest;
            objScript.api.updateFocus(token);
            objScript.api.removeUpdate("nearest");
        }
    });

    objScript.api.subscribeOnStateChange("nearest",function () {
        objScript.api.removeUpdate("nearest");
    });
}

var target = function (objScript,target) {
    objScript.target = sortTarget(objScript,target);
    
    if (objScript.target == null || objScript.target.getTransform == null)
        return;
    
    _pass(objScript,objScript.target);
}

var targetless = function (objScript) {
    objScript.api.updateFocus(true);

    var target = objScript.target;

    objScript.api.addUpdate("targetless",function () {
        if (isNull(objScript.target) || objScript.target == null || target != objScript.target) {
            objScript.api.updateFocus(false);
        }
    });

    objScript.api.subscribeOnStateChange("targetless",function () {
        objScript.api.removeUpdate("targetless");
    });
}

var position = function (objScript,p1,p2,p3,p4) {
    move(objScript,p1,p2,p3,p4,true,true)
}

var rotation = function (objScript,x,y,z,t) {
    if (t == null) {
        t = x ? x : 0;
        x = null;
    }
    rotate(objScript,x,y,z,t,true,true)
}

var move = function (objScript,p1,p2,p3,p4,local,noAdd) {

    var token = objScript.api.updateFocus();
    
    var get = ["getWorldPosition","getLocalPosition"][local==null?0:1]
    var set = ["setWorldPosition","setLocalPosition"][local==null?0:1]
    
    var T = objScript.getTransform(); 
    var speed = null;
    
    if (p1 != null && p2 == null) {
        speed = p1;
    } else if (p1 != null && p2 != null && p3 != null) {
        if (noAdd) {
            objScript.target = new vec3(p1,p2,p3);
        } else {
            objScript.target = T[get]().add(new vec3(p1,p2,p3));
        }
        speed = p4;
    }
    
    var easing = objScript.injectEase != null;
    var ease = objScript.injectEase?objScript.injectEase:function () {
        return 1;
    };
    objScript.injectEase = null;
    
    var target = sortTarget(objScript);
    var startDist;
    var startPos = T[get]();
    var lastPos;
    var startTime = getTime();
    var totalTime = speed;
    
    if (speed == null) {
        var targetPos = getTargetPos(target);
        T[set](targetPos);
        objScript.api.removeUpdate("move");
    } else {
        objScript.api.addUpdate("move",function () {
            var currPos = T[get]();
            var targetPos = getTargetPos(target);

            if (targetPos == null)
                return;
            
            if (startDist == null) {
                startDist = currPos.distance(targetPos);
            }
    
            var dir = global.Maths.normalize(currPos.sub(targetPos)).uniformScale(-speed);

            if (objScript.physicsBody && objScript.physicsBody.dynamic) {
                objScript.physicsBody.velocity = dir.uniformScale(50);
            } else if (easing) {
               
                var t = (getTime()-startTime)/totalTime;
                var e = ease(t);
                T[set](vec3.lerp(startPos,targetPos,e));
                
                if (t >= 1) {
                    objScript.api.removeUpdate("move");
                    objScript.api.updateFocus(token);
                }
                   
            }else {
                if (currPos.distance(targetPos) >= speed) {
                    if (lastPos && lastPos.distance(targetPos) < currPos.add(dir).distance(targetPos)) {
                        T[set](targetPos);
                        return;
                    }
                    T[set](currPos.add(dir));
                    lastPos = T[get]();
                } else {
                    T[set](targetPos);
                }
                     
                if (currPos.distance(targetPos) < speed) {
                    objScript.api.updateFocus(token);
                }
            }
        });
        
        //stop moving on state change
        objScript.api.subscribeOnStateChange("move",function () {
            objScript.api.removeUpdate("move");
        });
    }
}

var moveLocal = function (objScript,p1,p2,p3,p4) {
    move(objScript,p1,p2,p3,p4,true)
}

var fakeFly = function (objScript,x,y,z,gravity) {
    
    if (x == null)
        x = 0;
    
    if (y == null)
        y = 5;
    
    if (z == null)
        z = 0;
    
    if (gravity == null)
        gravity = 9.8
    
    var T = objScript.getTransform();
    var pos = T.getLocalPosition();    

    objScript.VELOCITY = new vec3(x,y,z);
    
    objScript.api.addUpdate("gravity",function () {
        pos = pos.add(new vec3(x,y,z))
        
        y -= gravity*getDeltaTime();
        
        T.setLocalPosition(pos)

        objScript.VELOCITY = new vec3(x,y,z);
        
    });
    
    //stop moving on state change
    objScript.api.subscribeOnStateChange("gravity",function () {
        objScript.api.removeUpdate("gravity");
    });    
}

var targetDirZ = function (objScript,speed) {

    if (speed == null)
        speed = 5;

    var target = sortTarget(objScript);
    if (target == null)
        return 0;

    var targetPos = getTargetPos(target);

    var T = objScript.getTransform();

    var dir = global.Maths.normalize(T.getWorldPosition().sub(targetPos));

    return dir.z*speed;

}

var targetDirX = function (objScript,speed) {

    if (speed == null)
        speed = 5;

    var target = sortTarget(objScript);
    if (target == null)
        return 0;

    var targetPos = getTargetPos(target);

    var T = objScript.getTransform();

    var dir = global.Maths.normalize(T.getWorldPosition().sub(targetPos));

    return dir.x*speed;

}

var moveForward = function (objScript,speed) {
    
    if (speed == null)
        speed = 1;

    var T = objScript.getTransform();
    
    objScript.api.addUpdate("move",function () {
        var currPos = T.getWorldPosition();
        var dir = global.Maths.normalize(T.forward).uniformScale(speed);
        T.setWorldPosition(currPos.add(dir));
    });
    
    //stop moving on state change
    objScript.api.subscribeOnStateChange("move",function () {
        objScript.api.removeUpdate("move");
    });
}

var avoid = function (objScript,speed) {
    
    if (speed == null)
        speed = 1;
    
    var T = objScript.getTransform();    
    
    objScript.api.addUpdate("move",function () {
        var target = sortTarget(objScript);
        var currPos = T.getWorldPosition();
        var targetPos = getTargetPos(target);
        
        targetPos.y = currPos.y;
        
        var dir = global.Maths.normalize(currPos.sub(targetPos)).uniformScale(speed);
        T.setWorldPosition(currPos.add(dir));
    });
    
    //stop moving on state change
    objScript.api.subscribeOnStateChange("move",function () {
        objScript.api.removeUpdate("move");
    });    
    
}

var rotate = function (objScript,x,y,z,time,local,noAdd) {
  
    var T = objScript.getTransform();
    
    var speed = vec3.zero();
    
    if (x == null && y == null && z == null) {
        var target = sortTarget(objScript);
        if (target && target != global.Objects.CAMERA) {
            speed = target.getTransform().getWorldRotation().toEulerAngles().uniformScale(180/Math.PI)
        } else {
            speed = new vec3(0,1,0);
        }
    } else if (x != null && y == null && z == null) {
        speed = new vec3(0,x,0);
    } else {
        speed = new vec3(x?x:0,y?y:0,z?z:0);
    }
  
    speed = speed.uniformScale(Math.PI/180)
    
    var startTime = getTime();
    var startRot = T.getLocalRotation();
    if (noAdd) {
        var endQuat = quat.fromEulerVec(speed);
    } else {
        var endQuat = startRot.multiply(quat.fromEulerVec(speed));
    }

    var ease = objScript.injectEase?objScript.injectEase:function (t) {
        return t;
    };        
    objScript.injectEase = null;

    objScript.api.addUpdate("turn",function () { 
        if (time != null) {
            var t = time == 0 ? 1 : Math.min(1,(getTime()-startTime)/time);
            var newRot = quat.slerp(startRot, endQuat, ease(t));
            T.setLocalRotation(newRot);
            if (t >= 1) {
                objScript.api.removeUpdate("turn");
            }
        } else {
            var newRot = T.getWorldRotation().multiply(quat.fromEulerVec(speed));
            if (!isNaN(newRot.x)) {
                T.setWorldRotation(newRot);
            }
        }
    });    
    
    objScript.api.subscribeOnStateChange("turn",function () {
        objScript.api.removeUpdate("turn");
    })
}

var offset = function (objScript,offset) {
    if (offset == null)
        offset = 1;

    _offset += (Math.PI/8)*offset;
    objScript._offset = _offset
    objScript.api.subscribeOnStateChange("offset",function () {
        objScript._offset = null;
    })
}

var bob = function (objScript,p1,p2,p3,p4,p5) {
    
    var speed = 5;
    var amount = new vec3(0,5,0);
    var offset = 0;

    if (p1 == null) {   
    
    } else if (p1 != null && p2 == null) {    
        amount = new vec3(0,p1,0);
    } else if (p1 != null && p2 != null && p3 == null && p4 == null) {
        amount = new vec3(0,p1,0);
        speed = p2;
    } else {
        amount = new vec3(p1,p2,p3);
        if (p4)
            speed = p4;
    }
    
    var T = objScript.getTransform();    
    var startTime = getTime();
    
    var startN = amount.uniformScale(Math.cos((offset+getTime()-startTime)*speed));

    offset += objScript._offset ? objScript._offset : 0;

    if (objScript.screenTransform == null) {
        objScript.screenTransform = objScript.getSceneObject().getComponent("Component.ScreenTransform");
    }
    
    if (!objScript.screenTransform) {
    
        if (objScript.startPos == null)
            objScript.startPos = objScript.getTransform().getLocalPosition();
        
        objScript.api.addUpdate("move", function () {
            var n = amount.uniformScale(Math.cos((offset+getTime()-startTime)*speed)).sub(startN);
            if (global.Maths.magnitude(T.getWorldScale()) < 1)
                n = n.mult(vec3.one().div(T.getWorldScale()));
            var newPos = objScript.startPos.add(n);
            T.setLocalPosition(newPos);
        });
    } else {
        
        objScript.startPos = objScript.screenTransform.position;

        objScript.api.addUpdate("move", function () {
            var n = amount.uniformScale(Math.cos((offset+getTime()-startTime)*speed));
            if (global.Maths.magnitude(T.getWorldScale()) < 1)
                n = n.mult(vec3.one().div(T.getWorldScale()));
            var newPos = objScript.startPos.add(n);
            objScript.screenTransform.position = newPos;
        });
    }
    
    objScript.api.subscribeOnStateChange("move",function () {
        var startPos = objScript.startPos;
        objScript.api.addUpdate("move",function () {
            T.setLocalPosition(vec3.lerp(T.getLocalPosition(),startPos,getDeltaTime()*speed));
            if (T.getLocalPosition().distance(startPos) < 0.1) {
                T.setLocalPosition(startPos);
                objScript.api.removeUpdate("move");
            }
        });
        objScript.startPos = null;
    })
}

var scale = function (objScript,p1,p2,p3,p4) {
    
    var token = objScript.api.updateFocus();
    
    var time = 0;
    var scale = vec3.one();

    if (p1 == null) {   
    
    } else if (p1 != null && p2 == null) {   
        scale = scale.uniformScale(p1);
    } else if (p1 != null && p2 != null && p3 == null) {
        scale = scale.uniformScale(p1);
        time = p2;
    } else {
        scale = new vec3(p1,p2,p3);
        if (p4)
            time = p4;
    }
    
    var T = objScript.getTransform();    
    var startTime = getTime();
    var startScale = T.getLocalScale();
    
    
    if (objScript.screenTransform == null) {
        objScript.screenTransform = objScript.getSceneObject().getComponent("Component.ScreenTransform");
    }
    
    if (objScript.startScale == null) {
        if (objScript.screenTransform) {
            objScript.startScale = objScript.screenTransform.scale;
        } else {
            objScript.startScale = T.getLocalScale();
        }
    }
    
    objScript.api.removeUpdate("scale");
    if (time == 0) {
        if (!objScript.screenTransform) {
            T.setLocalScale(scale);
        } else {
            objScript.screenTransform.scale = objScript.startScale.mult(scale);
        }
        objScript.startScale = T.getLocalScale();
    } else {
        
        var ease = objScript.injectEase?objScript.injectEase:function (t) {
            return t;
        };        
        objScript.injectEase = null;
        objScript.api.removeUpdate("bouncy");
        objScript.api.addUpdate("scale",function () {
            var t = Math.min(1,(getTime()-startTime)/time);
            var tE = ease(t);
            var currScale = vec3.lerp(startScale,scale,tE);
            if (!objScript.screenTransform) {
                T.setLocalScale(currScale);
            } else {
                objScript.screenTransform.scale = objScript.startScale.mult(currScale);
            }
            objScript.startScale = T.getLocalScale();
            if (t >= 1) {
                objScript.api.removeUpdate("scale");
                objScript.api.updateFocus(token);
            }
        });
    }
}

var fov = function (objScript,p1,p2,p3) {
    
    var cone = 0.4;
    var distance = 1000;
    var callback;
    var token;
    
    if (p1 && typeof p1 == 'number') {
        distance = p1;
    } else if (p1 && typeof p1 == 'string') {
        callback = p1;
    }
    if (p2 && typeof p2 == 'number') {
        distance = p2;
    } else if (p2 && typeof p2 == 'string') {
        callback = p2;
    }
    if (p3 && typeof p3 == 'number') {
        cone = p3;
    }
    
    cone = 1 - cone;
    
    var proxTarget = sortTarget(objScript);

    if (proxTarget == null)
        return;

    var prefix = proxTarget.name;
    
    var T = objScript.getTransform();
    
    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        token = objScript.api.updateFocus(true);
    }

    var calculate = function () {
        objPos = T.getWorldPosition();
        targetPos = getTargetPos(proxTarget);
        
        if (objPos.distance(targetPos) <= distance) {
            
          var toPlayer = targetPos.sub(objPos);
          toPlayer = global.Maths.normalize(toPlayer);
        
          var forward = T.forward;
        
          var dotProduct = forward.dot(toPlayer);        
            
          if (dotProduct >= cone) {
                objScript.api.removeUpdate(prefix+"fov");
                if (callback) {
                    callback();
                } else {
                    objScript.api.updateFocus(token)
                }
            }
       }
    };

    //calculate();
    objScript.api.addUpdate(prefix+"fov",calculate);
    
    //stop proximity on state change
    objScript.api.subscribeOnStateChange(prefix+"fov",function () {
        objScript.api.removeUpdate(prefix+"fov");
    });
}

var distance = function (objScript,distance,operator,callback) {
    
    if (distance == null)
        distance = 100;
    
    if (operator == null)
        operator = ">";
    
    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }
    
    var T = objScript.getTransform();
    var target = sortTarget(objScript);

    var distanceCheck = function () {
        var objPos = T.getWorldPosition();
        var playerPos = getTargetPos(target);
        if (Math.abs(playerPos.x - objPos.x) > Math.abs(playerPos.y - objPos.y) && Math.abs(playerPos.z - objPos.z) > Math.abs(playerPos.y - objPos.y)) {
            playerPos.y = objPos.y;
        }
        var currDist = objPos.distance(playerPos);

        objScript.distance = currDist;
        
        if (eval((currDist + operator + distance).toString())) {
            objScript.api.removeUpdate("distance");
            if (callback) {
                callback();    
            } else {
                objScript.api.updateFocus(token);
            }
        }
    }
    
    distanceCheck();
    objScript.api.addUpdate("distance",distanceCheck);
    objScript.api.subscribeOnStateChange("distance",function () {
        objScript.api.removeUpdate("distance");
    });   
    
}

var distanceWithTarget = function (objScript,operation,p1,p2,p3) {
    print("distanceWithTarget");
    var target;
    var dist;
    var callback;
    
    if (typeof p1 == 'number' && p2 == null && p3 == null) {
        target = sortTarget(objScript);
        dist = p1;
    //distance, callback
    } else if (typeof p1 == 'number' && typeof p2 == 'string' && p3 == null) {
        target = sortTarget(objScript);
        dist = p1;
        callback = p2;
    //target, distance, callback
    } else if (p1 == 'string' && typeof p2 == 'number') {
        target = sortTarget(objScript,p1);
        dist = p2;
        callback = p3;
    }
    print("dist " + dist);
    distance(objScript,dist,operation,callback);
}

var far = function (objScript,p1,p2,p3) {
    distanceWithTarget(objScript,">",p1,p2,p3);
}

var near = function (objScript,p1,p2,p3) {
    distanceWithTarget(objScript,"<",p1,p2,p3);
}

var proximity = function (objScript,distance,callback,targetLostCallback) {

    if (distance == null)
        distance = 300;
    
    var proxTarget = sortTarget(objScript);

    if (isNull(proxTarget) || isNull(objScript))
        return;
    
    if (proxTarget == null)
        return;

    var prefix="";
    
    var T = objScript.getTransform();
    
    if (callback) {
        callback = convertToStateCallback(objScript,callback);
        prefix = proxTarget.name + Math.round(Math.random()*1000);
    } else {
        var token = objScript.api.updateFocus(true);
    }

    if (targetLostCallback) {
        targetLostCallback = convertToStateCallback(objScript,targetLostCallback);
    }

    objScript.api.addUpdate(prefix+"proximity",function () {
        objPos = T.getWorldPosition();
        targetPos = getTargetPos(proxTarget);

        if (isNull(objPos) || isNull(targetPos)) {
            if (targetLostCallback) targetLostCallback();
            return;
        }
        targetPos.y = objPos.y;
        
        if (objPos.distance(targetPos) <= distance) {
            objScript.api.removeUpdate(prefix+"proximity");
            if (callback) {
                callback();    
            } else {
                objScript.api.updateFocus(token);
            }
        }
    });
    
    //stop proximity on state change
    objScript.api.subscribeOnStateChange(prefix+"proximity",function () {
        objScript.api.removeUpdate(prefix+"proximity");
    });
}

var wobble = function (objScript,p1,p2,p3,p4,p5,p6,p7,time) {

    if (time) {
        var token = objScript.api.updateFocus();
    }
    
    var speed = new vec3(5,5,5);
    var offset = 0;
    var ratios = new vec3(1,2,1.5);

    if (p1 == null) {    
    
    } else if (p1 != null && p2 == null) {    
        speed = vec3.one().uniformScale(p1);
    } else if (p1 != null && p2 != null && p3 == null && p4 == null) {
        speed = vec3.one().uniformScale(p1);
        ratios = ratios.uniformScale(p2);
    } else if (p1 != null && p2 != null && p3 != null && p4 != null && p5 == null) {
        ratios = new vec3(p1,p2,p3);
        speed = vec3.one().uniformScale(p4);
    } else if (p1 != null && p2 != null && p3 != null && p4 != null && p5 != null && p6 != null) {
        ratios = new vec3(p1,p2,p3);
        speed = new vec3(p4,p5,p6);
    }
    
    if (speed == null)
        speed = 1;
    
    if (offset == null)
        offset = 0;

    offset += objScript._offset ? objScript._offset : 0;
    
    var T = objScript.getTransform(); 
    
    if (objScript.startRot == null)
        objScript.startRot = T.getLocalRotation();
    
    ratios = new vec3(ratios.x/16,ratios.y/16,ratios.z/16);
    
    var t = 1;
    var startTime = getTime();
    
    objScript.api.addUpdate("effect",function () {
            
        var v = vec3.one().mult(speed);
        var x = Math.cos(offset+getTime()*v.x)*ratios.x*t;
        var y = Math.cos(offset+getTime()*v.y)*ratios.y*t;
        var z = Math.sin(offset+getTime()*v.z)*ratios.z*t;
        
        var circularRotation = objScript.startRot.multiply(quat.angleAxis(x, T.right));
        circularRotation = circularRotation.multiply(quat.angleAxis(y, T.up));
        circularRotation = circularRotation.multiply(quat.angleAxis(z, T.forward));
        
       T.setLocalRotation(circularRotation);
        
        if (time != null) {
            t = Math.max(0,1-(getTime()-startTime)/time);
            if (t <= 0) {
                objScript.api.removeUpdate("effect");
                objScript.api.updateFocus(token);
            }
        }        
    });
}

var deepWobble = function (objScript,speed,intensity) {
    
    if (intensity == null) {
        intensity = 1;
    }
    
    if (speed == null)
        speed = 4;
    
    var T = script.getTransform();
    
    if (objScript.animatables == null) {
        objScript.animatables = [];
        var layer = 1;
        var children = [objScript.getSceneObject()];
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
                
               objScript.animatables.push({
                    obj: c,
                    t: c.getTransform(),
                    startPos: c.getTransform().getLocalPosition(),
                    startRot: c.getTransform().getLocalRotation(),
                    offset: i/objScript.getSceneObject().getChildrenCount(),
                    layer: layer+i
                });
                
                first = false;  
                
                for (var x = 0; x < c.getChildrenCount();x++) {
                    children.push(c.getChild(x));
                }
                
                if (children.length == 0)
                    last = false;
            }        
        }
    }
    
    objScript.api.addUpdate("effect",function () {
        for (var i = 0; i < objScript.animatables.length; i++) {
            var a = objScript.animatables[i];
            
            var v = vec3.one().uniformScale(speed).uniformScale(a.layer/objScript.animatables.length)
            
            var x = Math.cos((a.layer/objScript.animatables.length)+getTime()*v.x)/(16/intensity)
            var y = Math.cos((a.layer/objScript.animatables.length)+getTime()*v.y)/(8/intensity)
            var z = Math.sin((a.layer/objScript.animatables.length)+getTime()*v.z)/(12/intensity)

            var circularRotation = objScript.animatables[i].startRot.multiply(quat.angleAxis(x, T.right));
            circularRotation = circularRotation.multiply(quat.angleAxis(y, T.up));
            circularRotation = circularRotation.multiply(quat.angleAxis(z, T.forward));
            
           objScript.animatables[i].t.setLocalRotation(circularRotation);
        }
    })
    
    objScript.api.subscribeOnStateChange("effect",function () {
        objScript.api.removeUpdate("effect");
    });
}

var stopEffect = function (objScript) {
    objScript.api.removeUpdate("effect");
}

var wind = function (objScript) {
    wobble(objScript,0,5,3,0,4,1.72);
}

var hitWobble = function (objScript,intensity,time) {

    if (intensity == null)
        intensity = 15;
    
    if (time == null)
        time = 1;
    
    wobble(objScript,intensity,null,null,null,null,null,null,time);
}

var hitEffect = function (objScript) {
    hitWobble(objScript);
    jiggle(objScript);
}

var pulse = function (objScript,p1,p2,p3,p4,p5,p6,p7,time) {
    
    var speed = new vec3(3.14,4.71,3.14);
    var ratios = new vec3(0.4,1,0.4);

    if (p1 != null && p2 == null) {    
        speed = new vec3(1,1.5,1).uniformScale(p1);
    } else if (p1 != null && p2 != null && p3 == null) {  
        speed = new vec3(1,1.5,1).uniformScale(p1);
        ratios = new vec3(0.4,1,0.4).uniformScale(p2);
    } else {
        if (p1 != null && p2 != null && p3 != null) {
            ratios = new vec3(p1,p2,p3);
        }
        if (p4 != null && p5 != null && p6 != null) {
            speed = new vec3(p4,p5,p6);
        }
    }
    
    if (speed == null)
        speed = 1;
    
    var offset = objScript._offset ? objScript._offset : 0;
    
    var T = objScript.getTransform(); 
    
    if (objScript.startScale == null)
        objScript.startScale = T.getLocalScale();
    
    ratios = new vec3(ratios.x/16,ratios.y/16,ratios.z/16);
    
    var size = objScript.startScale.x;
    
    var t = 1;
    var startTime = getTime();
    
    objScript.api.addUpdate("pulse",function () {
            
        var v = vec3.one().mult(speed);
        var x = Math.cos(offset+getTime()*v.x)*ratios.x*t*size;
        var y = Math.cos(offset+getTime()*v.y)*ratios.y*t*size;
        var z = Math.sin(offset+getTime()*v.z)*ratios.z*t*size;
        
       T.setLocalScale(objScript.startScale.add(new vec3(x,y,z)));
        
        if (time != null) {
            t = Math.max(0,1-(getTime()-startTime)/time);
            if (t <= 0) {
                objScript.api.removeUpdate("pulse");
            }
        }        
    })
    
    objScript.api.subscribeOnStateChange("pulse",function () {
        objScript.api.removeUpdate("pulse");
    });
}

var applyHit = function (objScript) {
    if (objScript.hit_force == null)
        return;
    
    if (!isNull(objScript.physicsBody)) {
        objScript.physicsBody.dynamic = true;
        var massFactor = 1/objScript.physicsBody.mass; 
        objScript.hit_force = objScript.hit_force.uniformScale(massFactor);
        objScript.physicsBody.addForceAt(objScript.hit_force,objScript.hit_position,Physics.ForceMode.Acceleration); 
    }
    objScript.hit_force = null;
    objScript.hit_position = null;
}

var scaleAndDestroy = function (objScript,time,delay) {
    if (time == null)
        time = 1;

    if (delay == null)
        delay = 0;

    objScript.api.addDelay("scaleAndDestroy",delay,function () {
        scale(objScript,0,time);
        objScript.api.addDelay("scaleAndDestroy",time,function () {
            destroy(objScript);
        });
    });

    objScript.api.subscribeOnStateChange("scaleAndDestroy",function () {
        objScript.api.removeDelay("scaleAndDestroy");
        objScript.api.removeUpdate("scale");
    });
}

var destroy = function (objScript) {
    if (objScript.api.clearOnCollision)
        objScript.api.clearOnCollision();
    
    global.safeDestroy(objScript.getSceneObject());
}

var dynamic = function (objScript) {
    objScript.dynamic = true;
    if (objScript.physicsBody) {
        objScript.physicsBody.clearMotion();
        objScript.physicsBody.dynamic = true;
    }
}

var undynamic = function (objScript) {
    objScript.dynamic = false;
    if (objScript.physicsBody) {
        objScript.physicsBody.clearMotion();
        objScript.physicsBody.dynamic = false;
    }
}

var tangible = function (objScript) {
    objScript.tangible = true;
    if (objScript.physicsBody) {
        objScript.physicsBody.intangible = false;
    }
}

var intangible = function (objScript) {
    objScript.tangible = false;
    if (objScript.physicsBody) {
        objScript.physicsBody.intangible = true;
    }
}

var force = function (objScript,force,p1,p2) {
    if (isNull(objScript.physicsBody))
        return;

    if (force == null)
        force = 1000;
    
    var axis = "forward";
    var at = vec3.zero();
    var upForce = 0;
    var forceAxis = vec3.zero();

    if (typeof p1 == 'string' && objScript.getTransform()[p1] != null) {
        axis = p1;
    } else if (typeof force == 'number' && typeof p1 == 'number' && typeof p2 == 'number') {
        forceAxis = new vec3(force,p1,p2);
        force = 0;
    } else if (typeof p1 == 'number') {
        upForce = p1;
    }

    if (typeof p2 == 'boolean') {
        var bounds = global.getBounds(objScript.physicsBody);
        var x = -bounds.x/2+Math.random()*bounds.x;
        var y = -bounds.y/2+Math.random()*bounds.y;
        var z = -bounds.z/2+Math.random()*bounds.z;
        at = new vec3(x,y,z);
    } else {
        at = forceAxis.normalize().uniformScale(-10);
        if (isNaN(at.x)) {
            at = vec3.zero();
        }
    }

    var dir = objScript.getTransform()[axis];

    var forceDir = dir.uniformScale(force);
    forceDir.y += upForce;

    forceDir = forceDir.add(objScript.getTransform().right.uniformScale(forceAxis.x));
    forceDir = forceDir.add(objScript.getTransform().up.uniformScale(forceAxis.y));
    forceDir = forceDir.add(objScript.getTransform().forward.uniformScale(forceAxis.z));
    
    objScript.physicsBody.dynamic = true;
    var massFactor = 1/objScript.physicsBody.mass;
    forceDir = forceDir.uniformScale(massFactor);

    objScript.physicsBody.addForceAt(forceDir,at,Physics.ForceMode.Impulse); 
}

var unforce = function (objScript) {
    if (objScript.physicsBody == null)
        return;

    objScript.physicsBody.velocity = vec3.zero();
    objScript.physicsBody.angularVelocity = vec3.zero();
}

var spawn = function (objScript,assetOrCategory,parent,entryState) {
    
    var asset;

    if (assetOrCategory == null)
        return;

    if (!global.AssetManager.hasAsset(assetOrCategory) && isNaN(assetOrCategory)) {
        if (global.AssetManager[assetOrCategory.toLowerCase()+"List"]) {
            asset = global.AssetManager.asset(global.AssetManager["randomFrom" + assetOrCategory](objScript.getSceneObject().seed));
        }    
    } else {
        asset = global.AssetManager.asset(assetOrCategory);
    }
 
    if (asset == null)
        return;
    
    if (parent == null) {
        
    } else if (typeof parent == 'string') {
        parent = sortTarget(objScript,parent);
    } else if (typeof parent == 'boolean' && parent == true) {
        parent = objScript.getSceneObject();
    }

    var instance = asset.instantiate(null);
    
    if (instance.seed == null) {
        instance.seed = objScript.getSceneObject().seed;
    }
    
    if (entryState) {
        if (objScript["pass"] == null) {
            objScript["pass"] = {};
        }
        objScript["pass"]["ENTRY_STATE"] = entryState;
    }

    _pass(objScript,instance);
    
    if (parent) {
        instance.setParentPreserveWorldTransform(parent);
        instance.getTransform().setLocalPosition(vec3.zero());
        instance.getTransform().setLocalRotation(quat.quatIdentity());
    } else {
        var T = objScript.getTransform();
        instance.getTransform().setWorldPosition(T.getWorldPosition());
        instance.getTransform().setWorldRotation(T.getWorldRotation());
        parent = global.Objects["SPAWN_CATCHER"];
        instance.setParentPreserveWorldTransform(parent);
    }
    
    if (parent && parent.stateMachine) {
        refresh(parent.stateMachine);
    }

    return instance;
}

var _pass = function (objScript,otherObj) {
    if (objScript == null || otherObj == null)
        return;

    if (objScript["pass"] == null)
        return;

    var pK = Object.keys(objScript["pass"]);
    for (var i = 0; i < pK.length;i++) {
        otherObj[pK[i]] = objScript["pass"][pK[i]];
        if (otherObj.stateMachine) otherObj.stateMachine[pK[i]] = otherObj[pK[i]];
    }
    objScript["pass"] = null; 
}

var passVar = function (objScript,key,value) {
    
    if (key == null)
        return;
    
    if (value == null) {
        var variableOwner = findVar(objScript,key); if (variableOwner != null) value = variableOwner[key];
    } else if (value != null && typeof value == 'string') {
        var variableOwner = findVar(objScript,value); if (variableOwner != null) value = variableOwner[value];
    }
    
    if (value == null)
        return;
    
    if (objScript["pass"] == null) {
        objScript["pass"] = {};    
    }
    
    if (objScript.DEBUG_ENABLED) print("passing " + key + ": " + value);
    objScript["pass"][key] = value;
    
    objScript.api.subscribeOnStateChange("passVar",function () {
        objScript["pass"] = null;
    });
}

var sfx = function (objScript,sfxName,indexOrVolume,loop,parent,indestructible,fadeIn) { 

    var token = objScript.api.updateFocus();

    var pos = objScript.getTransform().getWorldPosition();
    var n = sfxName;
    var volume = indexOrVolume;

    if (typeof sfxName == 'string' && indexOrVolume != null && parseInt(indexOrVolume) != NaN && global.AudioManager["sfxFrom" + sfxName]) {
        indexOrVolume = Math.floor(indexOrVolume)
        volume = 1;
        n = global.AudioManager["sfxFrom" + sfxName](indexOrVolume).name;
    } else if (global.AudioManager.hasSFX(sfxName)) {
        n = global.AudioManager.audio(sfxName).name;
    } else if (sfxName != null && global.AudioManager["randomSfxFrom" + sfxName] != null) {
        n = (global.AudioManager["randomSfxFrom" + sfxName]()).name;
    }

    var sfx = global.spawnSFX(n,parent?objScript.getSceneObject():null,pos,loop,null,volume) 
    if (sfx == null) {
        return;
    }
    var heartbeat = sfx.createComponent("Component.ScriptComponent");global.Heartbeat.api.add(heartbeat);
    var sfxEmitter = sfx.getComponent("Component.AudioComponent");    
    
    var fadeInTime = isNaN(fadeIn) ? 0.6 : fadeIn;
    var startTime = getTime();
    var mnV = 0;
    var mxV = 1;
    var t = fadeIn == null ? 1 : 0;

    if (volume == null) {
        volume = 1;
    }

    if (token && token.focus) {
        sfxEmitter.setOnFinish(function() {
            objScript.api.updateFocus(token);
        });
    }
    
    if (parent) {
        heartbeat.api.addUpdate("sfx_spatial",function () {
            if (isNull(sfx)) {
                heartbeat.api.removeUpdate("sfx_spatial");
                return;
            }
            if (t < 1)
                t = Math.min(1,(getTime()-startTime)/fadeInTime);
            // var maxDist = 500*volume;
            // var maxVol = Math.min(1,Math.max(0,(maxDist-sfx.getTransform().getWorldPosition().distance(global.Objects.CAMERA.getTransform().getWorldPosition()))/maxDist));
            var maxVol = volume;

            sfxEmitter.volume = MathUtils.lerp(mnV*maxVol,mxV*maxVol,t);
        })

        var d = function () {
            if (!isNull(sfx))
                global.safeDestroy(sfx);
        }
        
        if (indestructible == null) {
            objScript.api.subscribeOnStateChange("sfx_spatial",function () {
                if (!isNull(sfx) && fadeIn != null) {
                    sfx.setParentPreserveWorldTransform(null);
                    startTime = getTime();
                    mnV = 1;
                    mxV = 0;
                    t = 0;
                    if (t >= 1) {
                        d();
                    }
                } else {
                    d();
                }
            })
        }
    }    
}

var music = function (objScript,musicName,fadeTime) {
    if (fadeTime == null)
        fadeTime = 1;

    if (global.MUSIC_BOX && musicName == null && global.MUSIC_BOX.currentTrack) {
        fadeOutAudio(objScript,fadeTime,global.MUSIC_BOX.audioComponents[global.MUSIC_BOX.currentTrack]);
        return;
    }

    if (!global.AudioManager.hasSFX(musicName)) {
        print("music track " + musicName + " does not exist");
        return;
    }

    if (global.MUSIC_BOX == null) {
        global.MUSIC_BOX = scene.createSceneObject("MUSIC_BOX");
        global.MUSIC_BOX.audioComponents = {};
    }

    var musicLibrary = Object.keys(global.MUSIC_BOX.audioComponents);
    if (musicLibrary.indexOf(musicName) == -1) {
        var newAudio = global.MUSIC_BOX.createComponent("Component.AudioComponent");
        newAudio.audioTrack = global.AudioManager.audio(musicName);
        global.MUSIC_BOX.audioComponents[musicName] = newAudio;
    }

    global.MUSIC_BOX.currentTrack = musicName;

    for (var i = 0; i < musicLibrary.length;i++) {
        if (musicLibrary[i] != musicName) {
            fadeOutAudio(objScript,fadeTime,global.MUSIC_BOX.audioComponents[musicLibrary[i]]);
        }
    }
    fadeInAudio(objScript,fadeTime,global.MUSIC_BOX.audioComponents[musicName]);
}

var unmusic = function (objScript,fadeTime) {
    music(objScript,null,fadeTime);
}

var storeVar = function (objScript,key,value) {

    if (value == null) {
        var variableOwner = findVar(objScript,key);
    
        if (variableOwner == null || variableOwner == undefined) {
            return;
        }
    
        value = variableOwner[key] != null ? variableOwner[key] : variableOwner.stateMachine[key];
    }
    
    if (value == null)
        return;

    print("storing " + key + " as " + value);

    if (typeof value == 'string') {
        global.persistentStorageSystem.store.putString(key,value);
    } else if (typeof value == 'number' && value % 1 === 0) {
        global.persistentStorageSystem.store.putInt(key,value);
    } else if (typeof value == 'number') {
        global.persistentStorageSystem.store.putFloat(key,value);
    } else if (typeof value == 'boolean') {
        global.persistentStorageSystem.store.putBool(key,value);
    }
}

var unstoreVar = function (objScript,key) {
    global.persistentStorageSystem.store.remove(key);
}


var unstoreAllVars = function (objScript) {
    global.persistentStorageSystem.store.clear();
}

var newVar = function (objScript,key,value) {
    if (objScript[key] == null) {
        var callback = "Var" + key.charAt(0).toUpperCase() + key.slice(1) + "Changed";
        objScript.api.createCallback(callback);
    }
    
    objScript[key] = value;
    objScript.getSceneObject()[key] = objScript[key];
}

var findVar = function (objScript,key) {
    
    var cWithVar;
    var c = objScript.getSceneObject();
    while (c != null) {
        if (c[key] != null) {
            cWithVar = c;
            break;
        } else {
            var s = c.stateMachine;
            if (s && s[key] != null) {
                cWithVar = s;
                break;
            }
        }
        c = c.getParent();  
    } 
    return cWithVar;
}

var updateVar = function (objScript,evaluatable,r1,r2) {   
    
    var regex = /([a-zA-Z_]+)\s*(\+=|-=|\*=|\/=|%=|=)\s*(-?\d+(\.\d+)?|\w+)/;
    var key;
    
    //edge case with !$var syntax
    evaluatable = evaluatable.replace("!false","true");
    evaluatable = evaluatable.replace("!true","false");

    if (regex.test(evaluatable)) {
        key = evaluatable.replace(regex, (match, variable, operator, number) => {

            var variableOwner = findVar(objScript,variable);
            var tempVar = false;
            
            if (variableOwner == null) {
                tempVar = true;
                getVar(objScript,variable,null,true); //attempt to get from storage
                variableOwner = findVar(objScript,variable);
            }

            if (variableOwner == null) {
                if (objScript.DEBUG_ENABLED) print(objScript.getSceneObject().name + " variable cannot be updated! " + variable + " does not exist in hierachy or storage");
                return null;
            } else {
                if (objScript.DEBUG_ENABLED) print("got " + variable + " from " + evaluatable + " on owner " + variableOwner.name);
            }

            if (variableOwner[variable] == null) {
                if (typeof number == 'number' || !isNaN(parseFloat(number))) {
                    variableOwner[variable] = 0;
                } else if (typeof number == 'boolean' || number == "true" || number == "false") {
                    variableOwner[variable] = false;
                } else if (typeof number == 'string') {
                    variableOwner[variable] = "";
                }
            }
          
            var statement = 'variableOwner[variable]' + operator + number;
            eval(statement);

            var minValue = r1;
            var maxValue = r2;

            if (maxValue != null && variableOwner[variable] > maxValue) {
                variableOwner[variable] = maxValue;
            }

            if (minValue != null && variableOwner[variable] < minValue) {
                variableOwner[variable] = minValue;
            }

            if (variableOwner.stateMachine)
                variableOwner.stateMachine[key] = variableOwner[key];

            if (tempVar) {
                print("was temp var, storing " + variable + " as " + variableOwner[variable]);
                storeVar(objScript,variable,variableOwner[variable]);
                variableOwner[variable] = null;
            }

            return variable;
        }); 
        
        if (key == null)
            return;
    } else {
        if (objScript.DEBUG_ENABLED) print(objScript.getSceneObject().name + " variable update " + evaluatable + " did not pass test");
        return;
    }
    
    var callback = "onVar" + key.charAt(0).toUpperCase() + key.slice(1) + "Changed";
    
    if (objScript.api[callback]) {
        objScript.api[callback](objScript[key]);
    }
}

var clearVar = function (objScript, key) {

    var variableOwner = findVar(objScript,key);

    objScript[key] = null;
    if (objScript.getSceneObject)
        objScript.getSceneObject()[key] = null;

    if (variableOwner != null) {
        variableOwner[key] = null;
        if (variableOwner.getSceneObject)
            variableOwner.getSceneObject()[key] = null;
    }
}

var getVar = function (objScript, key, defaultValue, alwaysRefresh) {

    var variableOwner = findVar(objScript,key);

    var get = function () {
        var s = global.persistentStorageSystem.store.getString(key);
        if (!isNaN(parseFloat(s))) {
            objScript[key] = parseFloat(s);
            objScript.getSceneObject()[key] = objScript[key];
            return parseFloat(s);
        } else if (s == "true" || s == "false") {
            objScript[key] = s=="true";
            objScript.getSceneObject()[key] = s=="true";
            return s=="true";
        } else {
            objScript[key] = s;
            objScript.getSceneObject()[key] = s;
            return s;
        }
    }

    var setDefaultValue = function () {
        objScript[key] = defaultValue;
        objScript.getSceneObject()[key] = defaultValue;
        return defaultValue;
    }

    if (variableOwner == null || alwaysRefresh) {
        if (global.persistentStorageSystem.store.has(key)) {
            return get();
        } else {
            return setDefaultValue();
        }
    }

    return variableOwner[key];
}

var hasVar = function (objScript, key) {
    var variableOwner = findVar(objScript,key);
    return variableOwner && variableOwner[key] != null;
}

var awaitVar = function (objScript, key) {
    objScript.api.updateFocus(true);
    
    objScript.api.addUpdate("awaitVar",function () {
        if (hasVar(objScript,key)) {
            objScript.api.updateFocus(false);
            objScript.api.removeUpdate("awaitVar");
        }
    });
    
    objScript.api.subscribeOnStateChange("awaitVar",function () {
        objScript.api.removeUpdate("awaitVar");
    });
}

var copyVar = function (objScript, key) {
    var variableOwner = findVar(objScript,key);
    
    if (variableOwner != null) {
        newVar(objScript,key,variableOwner[key]);
    }    
}

var is = function (objScript,isStatement,trueCallback,falseCallback) {
    function isTrue () { 
        var returnable = false;
        var regex = /(-?\w+|-?\d+)(==|>=|<=|<|>|!=|%=)(-?\w+|-?\d+)/;
        if (regex.test(isStatement)) {
            var returnable = false;
            isStatement.replace(regex, (match, variable, operator, number) => {

                var variableOwner = findVar(objScript,variable);
                var variableOwner2 = findVar(objScript,number);
                var isValueComparble = !isNaN(variable) || variable == "null" || variable == "true" || variable == "false";
                var isValueComparble2 = !isNaN(number) || number == "null" || number == "true" || number == "false";
                
                if (!isValueComparble && (variableOwner == undefined || variableOwner == null)) {
                    returnable = false;
                    return;
                }

                if (!isValueComparble2 && (variableOwner2 == undefined || variableOwner2 == null)) {
                    returnable = false;
                    return;
                }

                if (number != "null" && isNaN(number)) {
                    if (variableOwner2 && variableOwner2[number] != null ) {
                        
                    } else if (number == 'true') {
                        number = true;
                    } else if (number == 'false') {
                        number = false;
                    } else {
                        if (!number.includes("'"))
                            number = "'" + number + "'"
                    }
                }

                function isEmpty(value) {
                    return (value == null || (typeof value === "string" && value.trim().length === 0));
                }

                var source = (isValueComparble ? "variable" : "variableOwner[variable]");
                var source2 = (isValueComparble2 ? "number" : "variableOwner[number]");

                var operation = source + operator + source2;
                if (number == "null") {
                    operation = operation += ' && isEmpty(' + source + ')' + operator + 'true';
                }
                returnable = eval(operation);
            
            });
        }
        return returnable;
    }
    
    var token = objScript.api.updateFocus(true);
    
    var orFound = false;  

   if (trueCallback || falseCallback) {
        if (isTrue())
            objScript.api.go(objScript,trueCallback);
        else
            objScript.api.go(objScript,falseCallback ? falseCallback : objScript.api.getState());
        
        objScript.api.updateFocus(token);
        return;
    }   

    if (!isTrue()) {
        while (objScript.events.length > 0 && !orFound) {
            var isOr = objScript.events.shift();
            if (isOr.includes("global.Shortcuts.api.or"))
                orFound = true;
        }
    }
    objScript.api.updateFocus(token);
}

var or = function (objScript) {
    var token = objScript.api.updateFocus(true);
    objScript.events = [];
    objScript.api.updateFocus(token);
}
    
var r = function (objScript,p1,p2,p3,round) {
    var f = objScript.seed?objScript.seed:Math.random;    
    
    if (p1 == null) {
        return f()
    } else if (p1 != null && p2 == null) {
        return f()*p1;
    } else if (p3 != null) {
        return Math.random()>=0.5?p1:p2;
    } else if (round) {
        return Math.round(p1+f()*(p2-p1));
    } else {
        return p1+f()*(p2-p1);
    }
}

var rInt = function (objScript,p1,p2,p3) {
    return Math.floor(r(objScript,p1,p2,p3));
}

var rArray = function (objScript,array) {
    if (array == null) {
        return null;
    }
    return array[Math.floor(Math.random()*array.length)];
}

var debug = function (objScript,override) {
    
    objScript.DEBUG_ENABLED = override!=null ? override : !objScript.DEBUG_ENABLED; 
    
    if (objScript.physicsBody) {
        objScript.physicsBody.debugDrawEnabled = objScript.DEBUG_ENABLED;
    } else {
        objScript.physics_debug = objScript.DEBUG_ENABLED;
    }
}

var undebug = function (objScript) {
    debug(objScript,false);
}

var collider = function (objScript,type,scale) {
    intangible(objScript);
    undynamic(objScript);
    physics(objScript,type,scale);
}

var mass = function (objScript,mass) {
    if (objScript.physicsBody) {
        objScript.physicsBody.mass = mass;
    } else {
        objScript.MASS = mass;
    }
}

var friction = function (objScript,f1,f2) {
    if (objScript.physicsBody) {
        objScript.physicsBody.friction = f1;
        objScript.physicsBody.rollingFriction = f2 != null ? f2 : f1;
        objScript.physicsBody.spinningFriction = f2 != null ? f2 : f1;
    } else {
        objScript.FRICTION = f1;
        objScript.ANGULAR_FRICTION = f2;
    }
}

var unphysics = function (objScript) {
    if (!objScript.physicsBody)
        return;

    objScript.physicsBody.destroy();
    objScript.physicsBody = null;
}

var physics = function (objScript,type,scale) {
    
    if (type == null) {
        if (objScript.physicsBody == null) {
            type = "Box";
        } else {
            objScript.physicsBody.destroy();
            objScript.physicsBody = null;
            return;
        }
    }
    
    type = type.toLowerCase();

    if (scale == null)
        scale = 1;

    var sceneObject = objScript.getSceneObject();
    var physicsBody = sceneObject.getComponent("Physics.BodyComponent");
    if (physicsBody == null) {
        physicsBody = sceneObject.createComponent("Physics.BodyComponent");
        sceneObject.physicsBody = physicsBody;
        objScript.physicsBody = physicsBody;
    }
    
    var shape;    
    var bounds = vec3.one();
    var scaleTarget = sceneObject;
    var renderOptions = findRenderer(objScript);
    var mesh;if (objScript.meshRenderer) {
        mesh = objScript.meshRenderer.mesh;
        bounds = new vec3(
            mesh.aabbMax.x-mesh.aabbMin.x,
            mesh.aabbMax.y-mesh.aabbMin.y,
            mesh.aabbMax.z-mesh.aabbMin.z
        );
        if (objScript.meshRenderer.getSceneObject() != sceneObject) {
            scaleTarget = objScript.meshRenderer.getSceneObject();
            bounds = bounds.mult(scaleTarget.getTransform().getLocalScale()).uniformScale(scale);
        }
    }
    
    if (type == "sphere") {
        shape = Shape.createSphereShape();
        shape.radius = bounds.x/2;
        
    } else if (type == "cylinder") {
        
        shape = Shape.createCylinderShape();
        shape.radius = bounds.x/2;
        shape.length = bounds.y;
        
    } else if (type == "capsule") {
        
        shape = Shape.createCapsuleShape();
        shape.radius = bounds.x/2;
        shape.length = bounds.y/2;
    
    } else if (type == "cone") {
        
        shape = Shape.createConeShape();
        shape.radius = bounds.x/2;
        shape.length = bounds.y;
        
    } else if (type == "mesh") {    
        var objScale = scaleTarget.getTransform().getLocalScale().uniformScale(scale);
        shape = Shape.createMeshShape();
        shape.mesh = objScript.meshRenderer.mesh;
            
        var ogMeshVertices = mesh.extractVerticesForAttribute("position");
        
        var builder = new MeshBuilder([
         { name: "position", components: 3 },
        ]);
        
        builder.topology = mesh.topology;
        builder.indexType = mesh.indexType;
        
        builder.appendIndices(mesh.extractIndices());
        builder.appendVerticesInterleaved([]);
        
        for (var i = 0; i < ogMeshVertices.length; i=i+3) {
            var x = ogMeshVertices[i]*objScale.x;
            var y = ogMeshVertices[i+1]*objScale.y;
            var z = ogMeshVertices[i+2]*objScale.z;
            var v = [x,y,z];
            builder.appendVerticesInterleaved(v);
        } 
        
        if(builder.isValid()){
            shape.mesh = builder.getMesh();
            shape.convex = true;
            builder.updateMesh();
        } else {
            print("Mesh data invalid!");
        }
    } else {
        shape = Shape.createBoxShape();
        shape.size = bounds;
    }
    
    physicsBody.shape = shape;
    physicsBody.dynamic = objScript.dynamic!=null ? objScript.dynamic : true;
    physicsBody.intangible = objScript.intangible!=null ? !objScript.intangible : false;
    physicsBody.mass = objScript.MASS!=null ? objScript.MASS : 1;
    physicsBody.friction = objScript.FRICTION!=null ? objScript.FRICTION : 1;

    if (objScript.ANGULAR_FRICTION) {
        physicsBody.rollingFriction = objScript.ANGULAR_FRICTION;
        physicsBody.spinningFriction = objScript.ANGULAR_FRICTION;
    }

    if (objScript.physics_filter) {
        physicsBody.filter = objScript.physics_filter;
    }

    if (objScript.physics_worldSettings) {
        physicsBody.worldSettings = objScript.physics_worldSettings;
    }
    
    if (objScript.physics_matter) {
        physicsBody.matter = objScript.physics_matter;
    }
    physicsBody.debugDrawEnabled = objScript.physics_debug != null ? objScript.physics_debug : false;
}

var physics_settings = function (objScript,mat) {
    if (objScript.physicsBody) {
        global.PhysicsManager.api.assignMatter(objScript.physicsBody,mat);
    } else {
        objScript.api.addDelay("physicsWait",0.01,
        function () {
            physics_settings(objScript,mat)
        })
        
        objScript.api.subscribeOnStateChange("physics_settings",function () {
            objScript.api.removeDelay("physicsWait");
        })
    }
}

var color = function (objScript,r,g,b,t,a) {
    var renderOptions = findRenderer(objScript);

    if (renderOptions.renderer == null) {
        objScript.CACHE_COLOR = color;
        return;
    }

    var startColor = renderOptions.get_color();
    var color = renderOptions.rgba(r,g,b,a);

    //time is in g
    if (typeof r == 'string' && g != null) {
        t = g;
    }

    var ease = objScript.injectEase?objScript.injectEase:function (t) {
        return t;
    };
    
    if (t == null) {
        renderOptions.set_color(color);
    } else {
        var token = objScript.api.updateFocus();
        var startTime = getTime();
        objScript.api.addUpdate("color",function () {
            var time = (getTime()-startTime)/t;
            renderOptions.set_color(vec4.lerp(startColor,color,time));

            if (time >= 1) {
                renderOptions.set_color(color);
                objScript.api.removeUpdate("color");
                objScript.api.updateFocus(token);
            }
        })       
        objScript.api.subscribeOnStateChange("color",function () {
            objScript.api.removeUpdate("color");
        },true); 
    }
}

var alpha = function (objScript,a,t) {
    objScript = processScript(objScript);     

    if (a == null)
        a = 0;

    var renderOptions = findRenderer(objScript);
    if (renderOptions.renderer == null)
        return;
    var startColor = renderOptions.get_color();
    
    color(objScript,startColor.r,startColor.g,startColor.b,t,a);
}

var rainbow = function (objScript,t) {
    var renderOptions = findRenderer(objScript);

    if (renderOptions.renderer == null) {
        return;
    }

    if (t == null)
        t = 1;

    // Function to convert HSV to RGB
    function hsvToRgb(h, s, v) {
        let c = v * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = v - c;
        let rgb;

        if (h >= 0 && h < 60) rgb = [c, x, 0];
        else if (h >= 60 && h < 120) rgb = [x, c, 0];
        else if (h >= 120 && h < 180) rgb = [0, c, x];
        else if (h >= 180 && h < 240) rgb = [0, x, c];
        else if (h >= 240 && h < 300) rgb = [x, 0, c];
        else rgb = [c, 0, x];

        return [
            (rgb[0] + m),
            (rgb[1] + m),
            (rgb[2] + m)
        ];
    }

    var startTime = getTime();
    var token = objScript.api.updateFocus();
    var startColor = renderOptions.get_color();
    var offset = objScript._offset ? objScript._offset : 0;

    objScript.api.addUpdate("color", function () {
        var elapsed = (getTime() - startTime) / t;
        var hue = (offset*(180/Math.PI)+(elapsed * 360)) % 360;  // Loop through the hue values
        var rgb = hsvToRgb(hue, 1, 1);    // Convert hue to RGB with full saturation and value
        var color = renderOptions.rgba(rgb[0], rgb[1], rgb[2], startColor.a);

        renderOptions.set_color(color);

        // Reset startTime to loop indefinitely
        if (elapsed >= 1) {
            startTime = getTime();
            objScript.api.updateFocus(token);
        }
    });

    objScript.api.subscribeOnStateChange("color", function () {
        objScript.api.removeUpdate("color");
    }, true);
};

var texture = function (objScript,texName,index) {
    
    var renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.RenderMeshVisual");    
    
    if (renderers == null || renderers.length == 0) {
        renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.Image");   
    }
    
    if (renderers.length == 0 || renderers[0] == null || renderers[0].mainMaterial == null)
        return;

    if (objScript.uniqueMat == null) {
        objScript.uniqueMat = renderers[0].mainMaterial.clone();
        objScript.uniqueMat.name = renderers[0].mainMaterial.name;
        renderers[0].mainMaterial = objScript.uniqueMat;
    }    
    
    var tex;
    
    if (typeof texName == 'string' && index != null && parseInt(index) != NaN) {
        index = Math.floor(index)
        tex = global.TextureManager["textureFrom" + texName](index);
    } else if (global.TextureManager.hasTexture(texName)) {
        tex = global.TextureManager.texture(texName);
    } else if (texName != null && global.TextureManager["randomTextureFrom" + texName] != null) {
        tex = global.TextureManager["randomTextureFrom" + texName]();
    } else if (script.api.hasVar(objScript,texName)) {
        tex = script.api.getVar(objScript,texName);
    }
     
    if (tex == null)
        return;
    
    renderers[0].mainMaterial.mainPass.baseTex = tex;

    if (renderers[0].getSceneObject().keepAspectRatio) {
        renderers[0].getSceneObject().keepAspectRatio(tex.getWidth()/tex.getHeight())
    }
}

var material = function (objScript,mat,tex) {
    var renderOptions = findRenderer(objScript);
    if (objScript.uniqueMat == null || objScript.uniqueMat.name != mat) {
        var matAsset = global.MaterialManager.material(mat);
        if (matAsset) {
            objScript.uniqueMat = matAsset.clone();
            objScript.uniqueMat.name = mat.toString();
            renderOptions.renderer.mainMaterial = objScript.uniqueMat;
        }
    }
    if (tex) {
        texture(objScript,tex);
    }
}

var blendMode = function (objScript,bm) {
    
    if (bm == null) {
        bm = 16;
    } else if (typeof bm == 'string') {
        bm = bm.toLowerCase();
        var modes = {"normal":16,"add":7,"additive":7};
        bm = modes[bm];
        if (bm == null) {
            return;
        }
    } 
    var renderOptions = findRenderer(objScript);
    var material = renderOptions.renderer.mainMaterial;
    material.mainPass.blendMode = bm;
    
}

var texScale = function (objScript,x,y) {
    if (x == null)
        x = 2;

    if (y == null)
        y = x!=null ? x : 2;
    
    var renderOptions = findRenderer(objScript);
    var material = renderOptions.renderer.mainMaterial;
    material.mainPass.uv2Scale = new vec2(x,y);
}

var texPos = function (objScript,x,y) {
    if (x == null)
        x = 0;

    if (y == null)
        y = 0;
    
    var renderOptions = findRenderer(objScript);
    var material = renderOptions.renderer.mainMaterial;
    material.mainPass.uv2Offset = new vec2(x,y);
}

var texProp = function (objScript,prop,value) {
    var renderOptions = findRenderer(objScript);
    var material = renderOptions.renderer.mainMaterial;
    material.mainPass[prop] = value;
}

var ease = function (objScript,e) {
    if (e == null) {
        e = "easeLinear";
    }
    objScript.injectEase = global.Ease[e];
}

var broadcast = function (objScript,flag) {
    global.broadcastToFlag(flag,objScript["pass"]);
    objScript["pass"] = null;
}

var listen = function (objScript,flag,callback,always) {
    if (callback == null) {
        var token = objScript.api.updateFocus(true);
    }
    
    global.subscribeToFlag(flag,function (custom) {
        var pass = custom;

        if (pass != null) {
            var pK = Object.keys(pass);
            for (var i = 0; i < pK.length;i++) {
                if (objScript.DEBUG_ENABLED) print("passing " + pK[i]);
                objScript[pK[i]] = pass[pK[i]];
                if (objScript.getSceneObject) {
                    objScript.getSceneObject()[pK[i]] = pass[pK[i]];
                }
            }
        }
        if (callback) {
            callback = convertToStateCallback(objScript,callback);
            callback();
        } else {
            objScript.api.updateFocus(token);
        }
    },always==true?false:true,objScript.getSceneObject())
    
    if (always == true)
        return;

    objScript.api.subscribeOnStateChange(flag + "_listen",function () {
        global.unsubscribeFromFlag(flag,objScript.getSceneObject());
    },true);
}

var collide = function (objScript,f,callback) {
    
    if (!objScript.physicsBody) {
        objScript.physicsBody = global.getComponentInChildren(objScript.getSceneObject(),"Physics.BodyComponent")[0];  
        if (!objScript.physicsBody) {
            return;
        }
    }

    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }
        
    var gogo = function (obj) {
        if (f == null || typeof f == 'number' && obj.layer == LayerSet.fromNumber(f) || typeof f == 'string' && obj.name.includes(f) || typeof f == 'string' && obj.id == f) {
            _pass(objScript,obj);
            objScript.target = obj;
            objScript.targetId = obj.ID ? obj.ID : obj.name;
            if (callback) {
                callback();      
            } else {
                objScript.api.updateFocus(token);
            }
        }
    }

    objScript.physicsBody.overlapFilter.includeIntangible = true;
    objScript.physicsBody.overlapFilter.includeDynamic = true;
    objScript.physicsBody.overlapFilter.includeStatic = true;
    
    objScript.api.createCallback("Collision");  
    objScript.physicsBody.onCollisionEnter.add(objScript.api.onCollision);
    objScript.physicsBody.onOverlapEnter.add(objScript.api.onCollision);
    
    var check = function(e) {
        if (e.overlap) {
            var collision = e.overlap;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        } else {
            var contact = e.collision.contacts[0];  
            var collision = e.collision;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        }
    };
    
    objScript.api.subscribeOnCollision("collide",check);
    objScript.api.subscribeOnStateChange("collide",function () {
        objScript.api.unsubscribeOnCollision("collide");
    })
}

var uncollide = function (objScript,f,callback) {

    if (!objScript.physicsBody) {
        objScript.physicsBody = global.getComponentInChildren(objScript.getSceneObject(),"Physics.BodyComponent")[0];  
        if (!objScript.physicsBody) {
            return;
        }
    }
    
    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }
        
    var gogo = function (obj) {
        if (f == null || typeof f == 'number' && obj.layer == LayerSet.fromNumber(f) || typeof f == 'string' && obj.name.includes(f) || typeof f == 'string' && obj.id == f) {
            _pass(objScript,obj);
            objScript.target = obj;
            objScript.targetId = obj.ID ? obj.ID : obj.name;
            if (callback) { 
                callback();      
            } else {
                objScript.api.updateFocus(token);
            }
        }
    }

    objScript.physicsBody.overlapFilter.includeIntangible = true;
    objScript.physicsBody.overlapFilter.includeDynamic = true;
    objScript.physicsBody.overlapFilter.includeStatic = true;
    
    objScript.api.createCallback("CollisionExit");  
    objScript.physicsBody.onCollisionExit.add(objScript.api.onCollisionExit);
    objScript.physicsBody.onOverlapExit.add(objScript.api.onCollisionExit);
    
    var check = function(e) {
        if (e.overlap) {
            var collision = e.overlap;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        } else {
            var contact = e.collision.contacts[0];  
            var collision = e.collision;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        }
    };
    
    objScript.api.subscribeOnCollisionExit("uncollide",check);
    objScript.api.subscribeOnStateChange("uncollide",function () {
        objScript.api.unsubscribeOnCollisionExit("uncollide");
    });
}

var hitter = function (objScript,f,func,callback) {
    
    if (func == null)
        func = "hit";
    
    if (callback == null)
        callback = "hitted";

    if (objScript.api.hasState(callback)) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus();
        callback = null;
    }
    
    var gogo = function (obj) {
        if (f == null || typeof f == 'number' && obj.layer == f || typeof f == 'string' && obj.name.includes(f) || typeof f == 'string' && obj.id == f) {
            if (obj.stateMachine == null)
                return;
                  
            if (obj.stateMachine.api.getState && obj.stateMachine.api.getState() == func)
                return;
            
            var call = convertToStateCallback(obj.stateMachine,func);
            if (call) {
                if (obj.stateMachine) {
                    obj.stateMachine.target = objScript.getSceneObject();
                }
                _pass(objScript,obj);
                call();
                if (callback) {
                    objScript.target = obj;
                    objScript.targetId = obj.ID ? obj.ID : obj.name;
                    callback();  
                } else {       
                    objScript.api.updateFocus(token);
                }
            }

        }
    }

    if (!objScript.physicsBody) {
        objScript.physicsBody = global.getComponentInChildren(objScript.getSceneObject(),"Physics.BodyComponent")[0];  
        if (!objScript.physicsBody) {
            return;
        }
    }

    objScript.physicsBody.overlapFilter.includeIntangible = true;
    objScript.physicsBody.overlapFilter.includeDynamic = true;
    objScript.physicsBody.overlapFilter.includeStatic = true;
    
    objScript.api.createCallback("Collision");  
    objScript.physicsBody.onCollisionEnter.add(objScript.api.onCollision);
    objScript.physicsBody.onCollisionStay.add(objScript.api.onCollision);
    objScript.physicsBody.onOverlapEnter.add(objScript.api.onCollision);
    objScript.physicsBody.onOverlapStay.add(objScript.api.onCollision);
    
    var check = function(e) {
        if (e.overlap) {
            var collision = e.overlap;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        } else {
            var contact = e.collision.contacts[0];  
            var collision = e.collision;
            var obj = collision.collider.getSceneObject();
            gogo(obj);
        }
    };
    
    objScript.api.subscribeOnCollision("hitter",check);
    objScript.api.subscribeOnStateChange("hitter",function () {
        objScript.api.unsubscribeOnCollision("hitter");
    })
}

var convertToStateCallback = function (objScript,callback) {
    if (objScript == null) {
        return function () {print("missing callback")};
    }
    if (typeof callback != 'string') {
        return callback;
    }
    function startsWith(str, search, position) {
      position = position || 0;
      return str.indexOf(search, position) === position;
    }

    if (startsWith(callback,"on")) {
        return objScript.api[callback];
    } else {
        return objScript.api["on" + callback.charAt(0).toUpperCase() + callback.slice(1)];
    }
}

var processScript = function (objScript) {
    if (!objScript.createEvent) {
        objScript = (objScript.copySceneObject?objScript:objScript.getSceneObject()).createComponent("Component.ScriptComponent");
        global.Heartbeat.api.add(objScript);
    }    
    return objScript;
}

var text = function (objScript,line,p1,p2,p3,p4) {
     
    var size;
    
    if (p1 != null) {
        if (typeof p1 == 'number') {
            size = p1;
        } else if (p1 == 'string') {
            font(objScript,p1);
        }
    }
    
    if (p2 != null) {
        if (typeof p2 == 'number') {
            size = p2;
        } else if (p2 == 'string') {
            font(objScript,p2);
        }
    } 
    
    var textComponent = objScript.getSceneObject().getComponent("Component.Text");
    
    if (textComponent == null)
        textComponent = global.getComponentInChildren(objScript.getSceneObject(),"Component.Text")[0];  
    
    if (textComponent == null) {
        textComponent = objScript.getSceneObject().createComponent("Component.Text");
            
        if (objScript.CACHE_COLOR) {
            textComponent.textFill.color = objScript.CACHE_COLOR;
            objScript.CACHE_COLOR = null;
        }
    }
    
    if (textComponent == null)
        return;

    if (line == null)
        return;
    
    textComponent.text = line;
    if (size) {
        textComponent.size = size;
    }
    
    if (objScript.FONT) {
        textComponent.font = objScript.FONT;
    }
    
    if (p3 != null) {
        if (typeof p3 == 'number') {
            textComponent.horizontalAlignment = p3;
        } else {
            textComponent.horizontalAlignment = ["left","center","right"].indexOf(p3);
        }
    }
}

var font = function (objScript,fontName) {

    objScript.FONT = global.FontManager.font(fontName);    
    
    var textComponent = objScript.getSceneObject().getComponent("Component.Text");
    
    if (textComponent == null)
        textComponent = global.getComponentInChildren(objScript.getSceneObject(),"Component.Text")[0];  
    
    if (textComponent == null)
        return;
    
    textComponent.font = objScript.FONT;
}

var typewriter = function (objScript,p1,p2) {
    
    var token = objScript.api.updateFocus();
    var text = "";
    var time = p2 ? p2 : 1;
    
    if (typeof p1 == 'string') {
        text = p1;
    } else if (!isNan(p1)) {
        time = p1;
    }
    
    var textComponent = objScript.getSceneObject().getComponent("Component.Text");
    
    if (textComponent == null)
        textComponent = global.getComponentInChildren(objScript.getSceneObject(),"Component.Text")[0];  
    
    if (textComponent == null)
        return;
    
    if (text.length == 0) {
        text = textComponent.text;
    }
    
    var iter = time / text.length;
    var t = getTime();
    
    text = text.split("");
    textComponent.text = "";
    
    objScript.api.addUpdate("typewriter",function () {
        if (getTime()-t > iter) {
            var s = text.shift();
            textComponent.text += s;
            if (s != " ")
                t = getTime();
            if (text.length == 0) {
                objScript.api.removeUpdate("typewriter");
                objScript.api.updateFocus(token);
            }
        }
    });
    
    objScript.api.subscribeOnStateChange("typewriter",function () {
        objScript.api.removeUpdate("typewriter");
    });
}

var follow = function (objScript,target,speed,noY) {
    
    var T = objScript.getTransform();
    
    if (target && typeof target == 'number') {
        speed = target;
        target = sortTarget(objScript);
    } else {
        if (speed == null) {
            speed = 5;
        }    
        if (target && typeof target == 'string') {
            target = sortTarget(objScript,target);
        }
    }
    
    var startPos = T.getWorldPosition();    
    
    objScript.api.addUpdate("move",function () {
        var currPos = T.getWorldPosition();
        var targetPos = getTargetPos(target);
        
        if (objScript.isGrounded) {
            targetPos.y = startPos.y;
        }

        if (noY) {
            targetPos.y = startPos.y;
        }

        var newPos = vec3.lerp(currPos,targetPos,getDeltaTime()*speed);
        T.setWorldPosition(newPos);
    });
    
    objScript.api.subscribeOnStateChange("move",function () {
        objScript.api.removeUpdate("move");
    });
}

var onscreen = function (objScript,size,callback,off_screen) {
    var label = off_screen?"offscreen":"onscreen";
    
    if (size == null) {
        size = 0;
    }
    
    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }
    
    var camera = global.Objects["CAMERA"].getComponent("Component.Camera");
    var T = objScript.getTransform();
    var camT = global.Objects["CAMERA"].getTransform();
    
    function screenCheck () {
        objScript.api.removeUpdate(label);
        if (callback) {
            callback();
        } else {
            objScript.api.updateFocus(token);
        }
    }
    
    objScript.api.addUpdate(label,function () {
        var objectPos = T.getWorldPosition();
        var toObject = objectPos.sub(camT.getWorldPosition());
        var dot =  global.Maths.dot(toObject.normalize(),camT.back.normalize());    
        
        var screenPos = camera.worldSpaceToScreenSpace(objectPos)     
        
        if (dot > 0.95 && screenPos.x > size && screenPos.x < (1-size) && screenPos.y > size && screenPos.y < (1-size)) {
            if (!off_screen) {    
                screenCheck();
            }
        } else if (screenPos.x < -size || screenPos.x > 1+size || screenPos.y < -size || screenPos.y > 1+size) {
            if (off_screen) {
                screenCheck();
            }
        }
    });

    objScript.api.subscribeOnStateChange(label,function () {
        objScript.api.removeUpdate(label);
    });
}

var offscreen = function (objScript,size,callback) {
    onscreen(objScript,size,callback,true);
}

var goDeep = function (objScript,key,skipSelf) {
    objScript.api.gatherEmbeddedStateMachines()
    
    var upperKey = key.charAt(0).toUpperCase() + key.slice(1);
    for (var i = objScript.subMachines.length-1; i >= 0; i--) {
        
        if (isNull(objScript.subMachines[i]))
            continue;
        
        if (objScript.subMachines[i].api["on"+upperKey]) {
            objScript.subMachines[i].api["on"+upperKey]();
        }
    }
    
    if (objScript.api.getState() != key) {
        if (objScript.api["on"+upperKey]) {
            objScript.api["on"+upperKey]();
        }
    }
};


var goUp = function (objScript,state) {
    var c = objScript.getSceneObject();
    var found;
    
    //we check the whole heirarchy to find the top most
    //StateMachine with this state
    while (c.getParent()) {
        
        c = c.getParent();
        
        parentScript = c.stateMachine;
        
        if (parentScript && parentScript.api.goDeep && parentScript.api.hasState(state)) {
            found = parentScript;
        }
    }
    
    if (found) {
        _pass(objScript,found);
        found.api.go(found,state);
    }
}

var id = function (objScript,identifier) {

    if (identifier == null)
        identifier = objScript.getSceneObject().name;

    objScript.id = identifier;
    objScript.getSceneObject().id = identifier;
    objScript.getSceneObject().ID = identifier;
    if (global.Objects) {
        global.Objects[identifier] = objScript.getSceneObject();
    }
}

var orbit = function (objScript,radius,speed) {
    
    var T = objScript.getTransform();
    var centerPoint = T.getLocalPosition();
    
    if (speed == null)
        speed = 1;

    var _radius = 0;
    objScript.orbit_cancel = false;
    var offset = objScript._offset ? objScript._offset : 0;
    
    objScript.api.addUpdate("move",function () {
        if (!objScript.orbit_cancel)
            _radius = global.Maths.lerp(_radius,radius,getDeltaTime()*speed);
        else 
            _radius = global.Maths.lerp(_radius,0,getDeltaTime()*speed);

        var x = Math.cos(offset+getTime()*speed)*_radius;
        var y = Math.sin(offset+getTime()*speed)*_radius;
        T.setLocalPosition(centerPoint.add(new vec3(x,0,y)))

        if (_radius < 0.01) {
            objScript.api.removeUpdate("move");
            if (objScript.token) {
                objScript.api.updateFocus(objScript.token);
                objScript.token = null;
                objScript.orbit_cancel = null;
            }
        }
    });
    
    //stop moving on state change
    objScript.api.subscribeOnStateChange("move",function () {
        objScript.orbit_cancel = true;
    });
}

var unorbit = function (objScript) {
    if (objScript.orbit_cancel != null) {
        objScript.token = objScript.api.updateFocus(true);
        objScript.orbit_cancel = true;
    }
}

var cameraAnchor = function (objScript,distance,y,z,noY,once) {

    if (objScript.iter == null) {
        objScript.iter = 0;
    }
    objScript.iter++;
    const iter = objScript.iter;
    
    if (distance == null)
        distance = 100;
    
    if (y == null)
        y = 0;
    
    if (z == null)
        z = 0;
    
    var cameraT = global.Objects.CAMERA.getTransform();
    var anchor = global.scene.createSceneObject("anchor_" + iter);
    var anchorT = anchor.getTransform();
    objScript.target = anchor;
    
    var setPos = function () {
        var rayEnd = cameraT.getWorldPosition().add(cameraT.back.uniformScale(distance)).add(cameraT.right.uniformScale(z));
        if (noY) {
            var d = new vec3(cameraT.back.x,0,cameraT.back.z).normalize();
            d = d.uniformScale(distance);
            rayEnd = cameraT.getWorldPosition().add(d).add(cameraT.right.uniformScale(z));
            rayEnd.y = cameraT.getWorldPosition().y + y;
        } else {
            rayEnd.y += y;
        }
        anchorT.setWorldPosition(rayEnd);
        anchorT.setWorldRotation(cameraT.getWorldRotation());
    }
    
    if (once == null)
        objScript.api.addUpdate("anchor" + iter,setPos);
    
    setPos();
    //stop checking for floor on state change
    objScript.api.subscribeOnStateChange("anchor" + iter,function () {
        objScript.api.removeUpdate("anchor" + iter);
        global.safeDestroy(anchor);
    });
}

var cameraPosition = function (objScript,distance,x,z) {
    cameraAnchor(objScript,distance,y,z,null,true);
}

var forwardAnchor = function (objScript,distance,y,z) {
    cameraAnchor(objScript,distance,y,z,true);
}

var forwardPosition = function (objScript,distance,y,z) {
    cameraAnchor(objScript,distance,y,z,true,true);
}

var isSimulator = function (objScript,trueCallback,falseCallback) {
    objScript.CHECK_SIMULATOR = global.deviceInfoSystem.isEditor();
    script.api.is(objScript,"CHECK_SIMULATOR==true",trueCallback,falseCallback);
}

var proctexture = function (objScript,r,g,b,a) {
    
    if (r == null)
        r = 0;
    
    if (g == null)
        g = 0;
    
    if (b == null)
        b = 0;
    
    if (a == null)
        a = 1;
    
    var width = 2;
    var height = 2;
    var channels = 4; // RGBA
    
    var newTex = ProceduralTextureProvider.create(width, height, Colorspace.RGBA);
    var newData = new Uint8Array(width * height * channels);
    
    for (var y=0; y<height; y++) {
        for (var x=0; x<width; x++) {
            // Calculate index
            var index = (y * width + x) * channels;
    
            // Set R, G, B, A
            newData[index] = 255*r;
            newData[index+1] = 255*g;
            newData[index+2] = 255*b;
            newData[index+3] = 255*a;
        }
    }
    
    newTex.control.setPixels(0, 0, width, height, newData);
    
    objScript.IMAGE = newTex;
}

var anyTap = function (objScript,callback,downOrUp,untap) {

    if (callback) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }

    if(downOrUp == null){
        downOrUp = "down";
    }

   if(global.deviceInfoSystem.isSpectacles()) {

        var rightHand = global.HandDataProvider.getHand("right");
        var leftHand = global.HandDataProvider.getHand("left");
        var tapped = 0;

        if (untap) {
            tapped = 1;
        }

        objScript.api.addUpdate("tap",function () {

            if (downOrUp == "up") {
                if (leftHand.isPinching() || rightHand.isPinching()) {
                    tapped = 1;
                } else {
                    tapped = tapped == 0 ? 0 : 2;
                }

                if (tapped == 2) {
                    if (callback) {
                        callback();
                    } else {
                        objScript.api.updateFocus(token);
                    }
                    objScript.api.removeUpdate("tap");
                }
            }
            else if (downOrUp = "down"){
                if (leftHand.isPinching() || rightHand.isPinching()) {
                    if (callback) {
                        callback();
                    } else {
                        objScript.api.updateFocus(token);
                    }
                    objScript.api.removeUpdate("tap");
                }
            }

       });
       
       objScript.api.subscribeOnStateChange("tap",function () {
            objScript.api.removeUpdate("tap");
       });
       return;
   } else {

        var tapEvent = objScript.createEvent("TapEvent")
        tapEvent.bind(function () {
            if (callback) {
                callback();
            } else {
                objScript.api.updateFocus(token);
            }
        })

        objScript.api.subscribeOnStateChange("tap",function () {
            objScript.removeEvent(tapEvent);
        });

        return;
   }
}

var tap = function (objScript,callback) {

    var renderOptions = findRenderer(objScript);
    var tappable = renderOptions.renderer ? renderOptions.renderer.getSceneObject() : objScript.getSceneObject();    
    var interactionComponent = tappable.getComponent("Component.InteractionComponent");
    
    if (interactionComponent == null) {
        interactionComponent = tappable.createComponent("Component.InteractionComponent");
    }
    
    if (callback != null) {
        callback = convertToStateCallback(objScript,callback);
    } else {
        var token = objScript.api.updateFocus(true);
    }
    
    var tapped = false;
    
    var onTapEvent = interactionComponent.onTouchStart.add(function(tapEventArgs){
        
         if (tapped)
            return;
        
        tapped = true;        
        
        if (callback) {
            callback();
        } else {
            objScript.api.updateFocus(token);
        }
        
        objScript.api.addDelay("removeTap",0.1,function () {
            interactionComponent.onTouchStart.remove(onTapEvent);
        })
    });
    
    objScript.api.subscribeOnStateChange("tap",function () {
        tapped = true;
        objScript.api.addDelay("removeTap",0.1,function () {
            if (interactionComponent)
              interactionComponent.onTouchStart.remove(onTapEvent);
        });
    });
}

var texScroll = function (objScript,x,y) {
    
    if (x == null) {
        x = 0.2;
    }

    if (y == null) {
        y = 0.2;
    }

    var scroll = new vec2(0,0);

    objScript.api.addUpdate("texScroll",function () {
        scroll.x += x*getDeltaTime();
        scroll.y += y*getDeltaTime();
        texPos(objScript,scroll.x,scroll.y);
    });

    objScript.api.subscribeOnStateChange("texScroll",function () {
        objScript.api.removeUpdate("texScroll");
    });
}

var log = function (objScript,message) {
    
    if (message == null) {
        message = "yay";
    }
    
    print("log: " + message)
    
    if (global.Objects.DEBUG && global.Objects.DEBUG.log)
        global.Objects.DEBUG.log(message);
}

var shape = function (objScript,shape,size) {
    if (shape == null) {
        shape = "Sphere";
    }
    
    if (size == null) {
        size = 10;
    }
    
    var sceneObj = objScript.getSceneObject();
    var renderer = sceneObj.getComponent("Component.RenderMeshVisual");
    
    if (renderer == null) {
        renderer = sceneObj.createComponent("Component.RenderMeshVisual");
        material(objScript,"Default");
    }
    
    mesh(objScript,shape);
    
    if (global.Maths.magnitude(sceneObj.getTransform().getWorldScale())/3 == 1) {
        sceneObj.getTransform().setWorldScale(new vec3(size,size,size));
    } else {
        var scale = new vec3(size,size,size);
        if (sceneObj.hasParent()) {
            var relativeScale = sceneObj.getParent().getTransform().getLocalScale();
            scale = new vec3(size/relativeScale.x,size/relativeScale.y,size/relativeScale.z);
        }
        sceneObj.getTransform().setLocalScale(scale);
    }
}

var sphere = function (objScript,size) {
    shape(objScript,"Sphere",size);
}

var plane = function (objScript,size) {
    shape(objScript,"Plane",size);
}

var box = function (objScript,size) {
    shape(objScript,"Box",size);
}

var cube = function (objScript,size) {
    shape(objScript,"Box",size);
}

var cone = function (objScript,size) {
    shape(objScript,"Cone",size);
}

var capsule = function (objScript,size) {
    shape(objScript,"Capsule",size);
}

var pyramid = function (objScript,size) {
    shape(objScript,"Pyramid",size);
}

var cylinder = function (objScript,size) {
    shape(objScript,"Cylinder",size);
}

var clampVar = function (objScript,key,min,max) {

    var variableOwner = findVar(objScript,key);  
    
    if (variableOwner == null) {
        return;
    }
    
    if (min == null) {
        min = 0;
    }
    
    if (max == null) {
        max = 999999999;
    }
    
    if (variableOwner[variable] < min) {
        variableOwner[variable] = min;
    } else if (variableOwner[variable] > max) {
        variableOwner[variable] = max;
    }
}

var resumeGame = function (objScript) {
    global.Heartbeat.api.play();
}

var pauseGame = function (objScript,skipLayer) {
    global.Heartbeat.api.pause(null,skipLayer);
}

var pauseLayer = function (objScript,layer) {
    global.Heartbeat.api.pause(layer);
}

var unpauseLayer = function (objScript,layer) {
    global.Heartbeat.api.play(layer);
}

var removeEvent = function (objScript,eventName) {
    objScript.api.removeUpdate(eventName);
    objScript.api.removeDelay(eventName);
}

var destroyChildren = function (objScript) {
    var childrenCount = objScript.getSceneObject().getChildrenCount();
    for (var i = childrenCount-1; i >= 0; i--) {
        global.safeDestroy(objScript.getSceneObject().getChild(i));
    }    
}

var block = function (objScript) {
    objScript.api.updateFocus(true);
}

var twirl = function (objScript,time,rotations) {
    var T = objScript.getTransform();
    var orgRot = T.getLocalRotation().toEulerAngles()
    var r = 0;
    var startTime = getTime();

    if (time == null) {
        time = 1;
    }

    if (rotations == null) {
        rotations = 1;
    }

    var ease = objScript.injectEase?objScript.injectEase:function (t) {
        return t;
    }; 

    objScript.api.addUpdate("spin2",function () {
        r = Math.min(1,MathUtils.lerp(0,1,ease((getTime()-startTime)/time)));
        T.setWorldRotation(quat.fromEulerVec(orgRot.add(new vec3(0,(r*360*rotations)*Math.PI/180,0))));
        if (r == 1) {
            objScript.api.removeUpdate("spin2");
        }
     });
}

var fadeInAudio = function (objScript,fadeInTime,audio) {
    if (fadeInTime == null)
        fadeInTime = 1;

    if (audio == null)
        audio = objScript.getSceneObject().getComponent("Component.AudioComponent");
    if (objScript.startVolume == null)
        objScript.startVolume = audio.volume;
    audio.volume = 0;
    var startTime = getTime();

    if (fadeInTime > 0) {
        objScript.api.addUpdate("fadeAudio",function () {
            t = Math.min(1,(getTime()-startTime)/fadeInTime);
            audio.volume = objScript.startVolume*t*0.8;
            if (t == 1) {
                objScript.api.removeUpdate("fadeAudio");
            }
        })
    } else {
        audio.volume = objScript.startVolume;
    }
    audio.position = 0;
    audio.play(-1);
}

var fadeOutAudio = function (objScript,fadeInTime,audio) {
    if (fadeInTime == null)
        fadeInTime = 1;

    if (audio == null)
        audio = objScript.getSceneObject().getComponent("Component.AudioComponent");
    var startTime = getTime();
    var startAudio = audio.volume;

    if (fadeInTime > 0) {
        objScript.api.addUpdate("fadeAudio",function () {
            t = Math.max(0,1-(getTime()-startTime)/fadeInTime);
            audio.volume = startAudio*t;
            if (t == 0) {
                objScript.api.removeUpdate("fadeAudio");
                audio.stop(false);
            }
        })
    } else {
        audio.volume = 0;
        audio.stop(false);
    }
}

var fakeParent = function (objScript,targetName) {
    var target = script.api.sortTarget(objScript,targetName);    
    
    objScript.api.addUpdate("move",function () {
        
        if (target == null) {
            
            target = script.api.sortTarget(objScript,targetName);
            return;
        }
        
        var targetT = target.getTransform();
        var T = objScript.getTransform();
        
    
        T.setWorldPosition(targetT.getWorldPosition());
        T.setWorldRotation(targetT.getWorldRotation());
    });
    
    objScript.api.subscribeOnStateChange("move",function () {
        objScript.api.removeUpdate("move");
    });
}

var findRenderer = function (objScript) {
    //if we already have renderOptions
    if (objScript.renderOptions) {
        return objScript.renderOptions;
    }

    var cloneMat = function (renderer,renderers) {
        if (renderer.mainMaterial == null)
            return false;
        if (objScript.uniqueMat == null) {
            objScript.uniqueMat = renderer.mainMaterial.clone();
            objScript.uniqueMat.name = renderer.mainMaterial.name;
            renderer.mainMaterial = objScript.uniqueMat;
        }
        if (renderers) {
            for (var i = 0; i < renderers.length; i++) {
                if (renderers[i].mainMaterial.name == objScript.uniqueMat.name) {
                    renderers[i].mainMaterial = objScript.uniqueMat;
                }    
            }
        }
        return true;
    }

    var renderOptions = {};
    renderOptions["rgba"] = colorToRGB;
    renderOptions["rgb"] = function (r,g,b) {
        var c = colorToRGB(r,g,b);
        return new vec3(c.r,c.g,c.b);
    };

    var renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.RenderMeshVisual"); 
    
    if (renderers != null && renderers.length > 0) {        
        objScript.meshRenderer = renderers[0];
        cloneMat(objScript.meshRenderer, renderers);
        renderOptions["set_prop"] = function (key,value) {
            if (objScript.meshRenderer.mainMaterial.mainPass[key] != null) {
                objScript.meshRenderer.mainMaterial.mainPass[key] = value;
            }
        }
        renderOptions["get_prop"] = function (key) {
            return objScript.meshRenderer.mainMaterial.mainPass[key];
        }
        renderOptions["set_color"] = function (c) {
            var isGlbMat = objScript.meshRenderer.mainMaterial.mainPass.baseColorFactor?true:false;
            objScript.meshRenderer.mainMaterial.mainPass[isGlbMat?"baseColorFactor":"baseColor"] = c;
        }
        renderOptions["set_alpha"] = function (a) {
            var isGlbMat = objScript.meshRenderer.mainMaterial.mainPass.baseColorFactor?true:false;
            var c = objScript.meshRenderer.mainMaterial.mainPass[isGlbMat?"baseColorFactor":"baseColor"];
            objScript.meshRenderer.mainMaterial.mainPass[isGlbMat?"baseColorFactor":"baseColor"] = new vec4(c.r,c.g,c.b,a);
        }
        renderOptions["get_color"] = function () {
            var isGlbMat = objScript.meshRenderer.mainMaterial.mainPass.baseColorFactor?true:false;
            return objScript.meshRenderer.mainMaterial.mainPass[isGlbMat?"baseColorFactor":"baseColor"];
        }
        renderOptions["renderer"] = objScript.meshRenderer;
        objScript.renderOptions = renderOptions;
    }

    renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.Image"); 

    if (renderers != null && renderers.length > 0) {
        objScript.imageRenderer = renderers[0];
        cloneMat(objScript.imageRenderer);
        renderOptions["set_color"] = function (c) {
            
            objScript.imageRenderer.mainPass.baseColor = c;
        }
        renderOptions["set_alpha"] = function (c) {
            var c = objScript.imageRenderer.mainPass.baseColor;
            objScript.imageRenderer.mainPass.baseColor = new vec4(c.r,c.g,c.b,a);
        }
        renderOptions["get_color"] = function () {
            return objScript.imageRenderer.mainPass.baseColor;
        }
        renderOptions["renderer"] = objScript.imageRenderer;
        objScript.renderOptions = renderOptions;
    }

    renderers = global.getComponentInChildren(objScript.getSceneObject(),"Component.Text"); 

    if (renderers != null && renderers.length > 0) {
        objScript.textRenderer = renderers[0];
        renderOptions["set_color"] = function (c) {
            objScript.textRenderer.textFill.color = c;
        }
        renderOptions["set_alpha"] = function (c) {
            var c = objScript.textRenderer.textFill.color;
            objScript.textRenderer.textFill.color = new vec4(c.r,c.g,c.b,a);
        }
        renderOptions["get_color"] = function () {
            return objScript.textRenderer.textFill.color;
        }
        renderOptions["renderer"] = objScript.textRenderer;
        objScript.renderOptions = renderOptions;
    }
    return renderOptions;
}

var colorToRGB = function (r,g,b,a) {
    if (typeof r != 'string' && (r != null && g != null && b != null)) {
        return new vec4(r,g,b,a!=null?a:1);
    }
    var rgba = new vec4(1,1,1,a!=null?a:1);
    if (r == "red") {
        rgba = new vec4(1,0,0,rgba.a);
    } else if (r == "green") {
        rgba = new vec4(0,1,0,rgba.a);
    } else if (r == "blue") {
        rgba = new vec4(0,0,1,rgba.a);
    } else if (r == "yellow") {
        rgba = new vec4(1,1,0,rgba.a);
    } else if (r == "cyan") {
        rgba = new vec4(0,1,1,rgba.a);
    } else if (r == "magenta") {
        rgba = new vec4(1,0,1,rgba.a);
    } else if (r == "white") {
        rgba = new vec4(1,1,1,rgba.a);
    } else if (r == "black") {
        rgba = new vec4(0,0,0,rgba.a);
    } else if (r == "orange") {
        rgba = new vec4(1,0.5,0,rgba.a);
    } else if (r == "purple") {
        rgba = new vec4(0.5,0,0.5,rgba.a);
    } else if (r == "pink") {
        rgba = new vec4(1,0.75,0.8,rgba.a);
    } else if (r == "brown") {
        rgba = new vec4(0.6,0.3,0.15,rgba.a);
    } else if (r == "gray") {
        rgba = new vec4(0.5,0.5,0.5,rgba.a);
    } else if (r == "lime") {
        rgba = new vec4(0.75,1,0,rgba.a);
    } else if (r == "navy") {
        rgba = new vec4(0,0,0.5,rgba.a);
    }
    return rgba;
}

//Runtime
script.api.resumeGame = resumeGame;
script.api.pauseGame = pauseGame;
script.api.unpauseGame = resumeGame;
script.api.pauseLayer = pauseLayer;
script.api.unpauseLayer = unpauseLayer;
script.api.removeEvent = removeEvent;

//Test
script.api.yay = yay;
script.api.log = log;

//State Modifiers
script.api.goUp = goUp;
script.api.goDeep = goDeep;
script.api.delay = delay;
script.api.focus = focus;
script.api.block = block; 
script.api.is = is;
script.api.or = or;
script.api.broadcast = broadcast;
script.api.listen = listen;
script.api.isSimulator = isSimulator;

//World Awareness
script.api.touchingFloor = touchingFloor;
script.api.group = group;
script.api.ungroup = ungroup;
script.api.nearest = nearest;
script.api.proximity = proximity;
script.api.fov = fov;
script.api.onscreen = onscreen;
script.api.offscreen = offscreen;
script.api.near = near;
script.api.far = far;

//Transforms
script.api.move = move;
script.api.rotate = rotate;
script.api.scale = scale;
script.api.moveLocal = moveLocal;
script.api.moveForward = moveForward;
script.api.position = position;
script.api.rotation = rotation;
script.api.lookTowards = lookTowards;
script.api.lookAt = lookAt;
script.api.lookForward = lookForward;
script.api.lookAway = lookAway;
script.api.lookTowardsOnce = lookTowardsOnce;
script.api.lookAtOnce = lookAtOnce;
script.api.ease = ease;
script.api.hopTurn = hopTurn;
script.api.fakeFly = fakeFly;
script.api.follow = follow;
script.api.orbit = orbit;
script.api.unorbit = unorbit;
script.api.cameraAnchor = cameraAnchor;
script.api.cameraPosition = cameraPosition;
script.api.forwardAnchor = forwardAnchor;
script.api.forwardPosition = forwardPosition;
script.api.avoid = avoid;
script.api.bob = bob;

//Scene Object
script.api.enable = enable;
script.api.disable = disable;
script.api.parent = parent;
script.api.fakeParent = fakeParent;
script.api.unparent = unparent;
script.api.unparentChildren = unparentChildren;
script.api.refresh = refresh;
script.api.scaleAndDestroy = scaleAndDestroy;
script.api.destroy = destroy;
script.api.destroyChildren = destroyChildren;

//Materials
script.api.color = color;
script.api.alpha = alpha;
script.api.rainbow = rainbow;
script.api.texture = texture;
script.api.material = material;
script.api.texPos = texPos;
script.api.texScale = texScale;
script.api.tile = texScale;
script.api.texProp = texProp;
script.api.texScroll = texScroll;
script.api.blendMode = blendMode;

//Animations
script.api.anim = anim;
script.api.blendshape = blendshape;
script.api.jiggle = jiggle;
script.api.flash = flash;
script.api.wobble = wobble;
script.api.deepWobble = deepWobble;
script.api.mesh = mesh;
script.api.hide = hide;
script.api.unhide = unhide;
script.api.hitWobble = hitWobble;
script.api.hitEffect = hitEffect;
script.api.hop = hop;
script.api.pulse = pulse;
script.api.stopEffect = stopEffect;
script.api.twirl = twirl;
script.api.wind = wind;

//Gameplay
script.api.spawn = spawn;
script.api.sfx = sfx;
script.api.music = music;
script.api.unmusic = unmusic;
script.api.hitter = hitter;

//Physics
script.api.collide = collide;
script.api.uncollide = uncollide;
script.api.dynamic = dynamic;
script.api.nondynamic = undynamic;
script.api.undynamic = undynamic;
script.api.applyHit = applyHit;
script.api.force = force;
script.api.unforce = unforce;
script.api.physics = physics;
script.api.unphysics = unphysics;
script.api.collider = collider;
script.api.matter = physics_settings;
script.api.tangible = tangible;
script.api.intangible = intangible;
script.api.debug = debug;
script.api.undebug = undebug;
script.api.mass = mass;
script.api.friction = friction;

//Variables
script.api.newVar = newVar;
script.api.updateVar = updateVar;
script.api.getVar = getVar;
script.api.clearVar = clearVar;
script.api.hasVar = hasVar;
script.api.findVar = findVar;
script.api.awaitVar = awaitVar;
script.api.copyVar = copyVar;
script.api.clampVar = clampVar;
script.api.passVar = passVar;

//Store Variables
script.api.storeVar = storeVar;
script.api.unstoreVar = unstoreVar;
script.api.unstoreAllVars = unstoreAllVars;

//Math
script.api.r = r;
script.api.rInt = rInt;
script.api.rArray = rArray;
script.api.offset = offset;

//Components
script.api.text = text;
script.api.font = font;
script.api.typewriter = typewriter;
script.api.fadeInAudio  = fadeInAudio;
script.api.fadeOutAudio = fadeOutAudio;
script.api.findRenderer = findRenderer;

//Inputs
script.api.anyTap = anyTap;
script.api.tap = tap;

//Targeting
script.api.id = id;
script.api.target = target;
script.api.targetless = targetless;
script.api.sortTarget = sortTarget;
script.api.getTargetPos = getTargetPos;
script.api.getTargetRot = getTargetRot;
script.api.targetDirX = targetDirX;
script.api.targetDirZ = targetDirZ;

//Shapes
script.api.sphere = sphere;
script.api.plane = plane;
script.api.box = box;
script.apicube = cube;
script.api.cone = cone;
script.api.capsule = capsule;
script.api.pyramid = pyramid;
script.api.cylinder = cylinder;