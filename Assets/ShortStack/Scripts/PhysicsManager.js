// @input Asset.Filter[] filters
// @input Physics.Matter[] physicsMatters

var layers = {
    "DEFAULT": 0,
    "PLAYER": 1,
    "ENEMY": 2,
    "ITEM": 3,
    "LEVEL": 4,
}

global.Shortcuts.api.physicsLayer = function (objScript,layer) {
    if (!isNaN(layer)) {
        layer = "DEFAULT";
    }

    if (isNull(objScript))
        return;
    
    if (objScript.physicsBody != null) {
        objScript.physicsBody.filter = script.filters[layers[layer]];
    } else {
        objScript.physics_filter = script.filters[layers[layer]];
    }
}

global.Shortcuts.api.zeroGravity = function (objScript) {
    if (objScript.physics_worldSettings == null) {
        objScript.physics_worldSettings = Physics.WorldSettingsAsset.create();
    }
    var settings = objScript.physics_worldSettings;
    settings.gravity = new vec3(0, 0, 0);

    objScript.physics_worldSettings = settings;
    if (objScript.physicsBody) {
        objScript.physicsBody.worldSettings = settings;
    }
}

global.Shortcuts.api.bouncy = function (objScript,bounciness) {
    
    if (bounciness == null) {
        bounciness = 1;
    }    
    
    if (objScript.physics_matter == null) {
        objScript.physics_matter = script.physicsMatters[1];
    }
    
    if (objScript.physicsBody) {
        objScript.physicsBody.matter = script.physicsMatters[1];
        objScript.physicsBody.matter.dynamicBounciness = bounciness;
        objScript.physicsBody.matter.staticBounciness = bounciness;
    }
    
}
