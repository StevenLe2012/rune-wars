global.Heartbeat.api.add(script,"SYSTEM");

global.getComponentInChildren = function (obj,component) {
    
    //print("component searching " + component);
    
    var components = [];
    var children = [obj];
    var first = true;
    var last = true;
    
    while (first || totalChildren(children) > 0 || last) {
        
        first = false;        
        
        for (var i = children.length-1; i >= 0;i--) {
            var c = children[i];
            children.splice(i,1);
            
            var childComponent;
            if (c != null) {
                childComponent = c.getComponent(component);
            
                if (!isNull(childComponent)) {
                    components.push(childComponent);           
                }
                
                for (var x = 0; x < c.getChildrenCount();x++) {
                    children.push(c.getChild(x));
                }
            }
            
            if (children.length == 0)
                last = false;
        }        
    }
    return components;
}

global.getComponentInParent = function (obj, component) {

    var components = [];
    var currentParent = obj.getParent();
    
    while (currentParent !== null) {
        
        var parentComponent = currentParent.getComponent(component);
        
        if (parentComponent !== null) {
            components.push(parentComponent);
        }
        
        currentParent = currentParent.getParent();
    }
    
    return components;
}

var totalChildren = function (a) {
    var c = 0;
    for (var i = 0; i < a.length;i++) {
        if (!isNull(a[i]))
            c += a[i].getChildrenCount();
    }
    return c;
}

global.pickRandom = function (a,seed) {
    if (seed) {
        return a[Math.floor(seed()*a.length)]
    }
    return a[Math.floor(Math.random()*a.length)];
}

global.pickRandom2 = function (a,seed) {
    if (seed) {
        return a[Math.floor(seed()*a.length)]
    }
    
    return a[Math.floor(Math.random()*a.length)];
}

var safeDestroyArray = [];

global.safeDestroy = function (sceneObject) {  
    
    if (sceneObject == null || safeDestroyArray.indexOf(sceneObject.uniqueIdentifier) != -1)
        return;
    
    safeDestroyArray.push(sceneObject.uniqueIdentifier);
    
    
    var tweenScripts = global.getComponentInChildren(sceneObject,"Component.ScriptComponent");
    for (var i = 0; i < tweenScripts.length;i++) {
        if (tweenScripts[i]) {
            if (tweenScripts[i].tweenName)
                global.tweenManager.stopTween(tweenScripts[i].getSceneObject(), tweenScripts[i].tweenName);
            
            tweenScripts[i].enabled = false;
        }
    }
    if (global.Groups != null && sceneObject.GROUP_ID != null) {
        var groupId = sceneObject.GROUP_ID;
        print(sceneObject.name + " HAS GROUP!");
        var i = global.Groups[groupId].indexOf(sceneObject);
        if (i > -1) {
            print(sceneObject.name + " HAS GROUP and exists!");
            global.Groups[groupId].splice(i,1);
        }
    }

    sceneObject.destroying = true;
    
    var sceneObjectScript = sceneObject.getComponent("Component.ScriptComponent");
    if (sceneObjectScript)    
        sceneObjectScript.enabled = false;
    
    var sceneObjectBody = sceneObject.getComponent("Physics.BodyComponent");
    if (sceneObjectBody)    
        sceneObjectBody.enabled = false;
    
    var sceneObjectAudio = sceneObject.getComponent("Component.AudioComponent");
    if (sceneObjectAudio)
        sceneObjectAudio.enabled = false;
    
    sceneObject.getTransform().setWorldScale(vec3.zero());
    sceneObject.setParent(null);
    
    sceneObject.getTransform().setWorldScale(vec3.zero());
    sceneObject.getTransform().setWorldPosition(new vec3(1000000000,1000000000,1000000000));  
    
    script.api.addDelay("delete_" + sceneObject.uniqueIdentifier,0.1, function () {
        if (!isNull(sceneObject))
            sceneObject.destroy();
    })
}

global.changeLayer = function (obj,layer) {
    
    if (typeof layer == 'number')
        layer = LayerSet.fromNumber(layer);
    
    var children = [obj];
    var first = true;
    var last = true;
    
    while (first || totalChildren(children) > 0 || last) {
        
        first = false;        
        
        for (var i = children.length-1; i >= 0;i--) {
            var c = children[i];
            children.splice(i,1);
            
            c.layer = layer;
            
            for (var i = 0; i < c.getChildrenCount();i++) {
                children.push(c.getChild(i));
            }
            
            if (children.length == 0)
                last = false;
        }        
    }
}

global.findChildByName = function (obj,n) {
    
    var children = [obj];
    var first = true;
    var last = true;
    var found = false;
    
    while (!found && (first || totalChildren(children) > 0 || last)) {
        
        first = false;        
        
        for (var i = children.length-1; i >= 0;i--) {
            var c = children[i];
            children.splice(i,1);
            
            if (c.name == n) {
                found = true;
                return c;
            }
            
            for (var i = 0; i < c.getChildrenCount();i++) {
                children.push(c.getChild(i));
            }
            
            if (children.length == 0)
                last = false;
        }        
    }
}


global.getBounds = function (src) {
    
    if (src == null)
        return vec3.zero()
    
    var physicsBody;
    var renderer;
    
    if (src.getComponent) {
        physicsBody = src.getComponent("Physics.BodyComponent");
        renderer = src.getComponent("Component.RenderMeshVisual");
    } else {
        physicsBody = src;
        renderer = src.getSceneObject().getComponent("Component.RenderMeshVisual");
    }
    
    var getSize = function () {
        if (physicsBody) {   
            if (!physicsBody.shape)
                return vec3.zero();
            
            if (physicsBody.shape.size) {
                return physicsBody.shape.size;
            } else if (physicsBody.shape.radius) {
                if (physicsBody.shape.length) {
                    return new vec3(physicsBody.shape.radius*2,physicsBody.shape.length,physicsBody.shape.radius*2);
                } else {
                    return new vec3(physicsBody.shape.radius*2,physicsBody.shape.radius*2,physicsBody.shape.radius*2);
                }
            } else if (physicsBody.shape.mesh) {
                return vec3.one().uniformScale(physicsBody.shape.mesh.aabbMax.x);
            }
        } else {
            if (renderer && renderer.mesh) {  
                return renderer.localAabbMax();
            }
        }
        return vec3.zero();
    }
    
    return getSize().uniformScale(renderer ? renderer.getTransform().getWorldScale().x : 1);
}

global.getMeshRenderer = function (obj) {
    
    if (obj.api)
        obj = obj.getSceneObject();
    
    var renderers = global.getComponentInChildren(obj,"Component.RenderMeshVisual");
    return renderers.length>0?renderers[0]:null;
}

global.arrayIncludes = function(array, searchValue) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === searchValue) {
      return true;
    }
  }
  return false;
}

global.extractPosition = function (data) {
    if (data.x != null) {
        return data;
    } else if (data.name != null || data.api != null) {
        return data.getTransform().getWorldPosition();
    } else if (data.getWorldPosition != null) {
        return data.getWorldPosition();
    }
    return vec3.zero();
}

global.parseStringToDataType = function (str) {
    if (str == null)
        return str;
    // Try parsing as a number
    
    if (!isNaN(parseFloat(str))) {
      return parseFloat(str);
    }
    
    if (!isNaN(parseInt(str))) {
      return parseInt(str);
    }
    
    // Try parsing as a boolean
    if (str.toLowerCase() === 'true') {
      return true;
    }
    if (str.toLowerCase() === 'false') {
      return false;
    }
    // Default to returning the input as a string
    return str;
}

global.sumChars = function(s) {
    s = s.replace(/[^0-9a-z]/gi, '')
  var i, n = s.length, acc = 0;
  for (i = 0; i < n; i++) {
    acc += parseInt(s[i], 36) - 9;
  }
  return acc;
}



global.createRNG = function (inputString) {
    
    var seed = 0;
    
    for (var i = 0; i < inputString.length; i++) {
        var charCode = inputString.charCodeAt(i);
        seed += charCode;
    }
  
    var seedFunc = function () {
        var x = (Math.sin(seed++) * 10000);
        x -= Math.floor(x);
        return x;
    }
    
//    var seedFunc2 = function (a) {
//         var r = Math.floor(seedFunc()*a.length);
//        return a[r];
//    }    
    
    return seedFunc;
}


global.degToRad = function (degrees) {
  return degrees * Math.PI / 180;
}

global.radToDeg = function (radians) {
  return radians * 180 / Math.PI;
}