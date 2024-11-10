// @input string audioCategory
// @input Asset.AudioTrackAsset[] sfxs
// @input bool silence = false

script.api.pushAssets = function () {
    var arr = global.AudioManager.sfxs.concat(script.sfxs);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    
    global.AudioManager.sfxs = uniqueArr;
} 

if (global.AudioManager == null) {
    global.AudioManager = script;
    
    var find = function (n) {
        for (i = 0; i < script.sfxs.length; i++) {
            if (script.sfxs[i].name.includes(n)) {
                return i;
            }
        }
        return 0; //error sound
    }
    
    global.AudioManager.hasAudio = function (n) {
        return find(n)>0;
    }
    
    global.AudioManager.audio = function (n) {
        return script.sfxs[find(n)];
    }
    
    global.spawnSFX = function (n, parent, pos, loop, offset, volume) {   
        
            if (script.silence)
                return;
        
            if (typeof(n) === 'undefined')
                return;
        
            if (typeof(n) === 'string')
                n = find(n);
        
            if (n < 0)
                return;

            if (volume == null) {
                volume = 1;
            }
            
            var sfxEmitter = global.scene.createSceneObject("SFX_Emitter");
        
            var sfxEmitterScript = sfxEmitter.createComponent("Component.AudioComponent");

            //3d audio support, provided camera has audio listener
            if (global.Objects.CAMERA && global.Objects.CAMERA.getComponent("Component.AudioListenerComponent")) {
                sfxEmitterScript.spatialAudio.enabled = true;
                sfxEmitterScript.spatialAudio.directivityEffect.enabled = true;
                sfxEmitterScript.spatialAudio.distanceEffect.enabled = true;
                sfxEmitterScript.spatialAudio.positionEffect.enabled = true;
                sfxEmitterScript.spatialAudio.distanceEffect.minDistance = 1;
                sfxEmitterScript.spatialAudio.distanceEffect.maxDistance = 1000;
            }

            sfxEmitterScript.audioTrack = script.sfxs[n];
            if (offset)
                sfxEmitterScript.position = offset
            
            sfxEmitterScript.volume = volume;
            sfxEmitterScript.play(loop?-1:1);
            sfxEmitterScript.setOnFinish(function () {
                if (!isNull(sfxEmitter))
                    sfxEmitter.destroy();
            })
        
            if (parent) {
                sfxEmitter.setParent(parent)
                sfxEmitter.getTransform().setLocalPosition(vec3.zero());
            }
        
            if (pos)
                sfxEmitter.getTransform().setWorldPosition(pos);
        
        return sfxEmitter;
    }
    
    global.AudioManager.hasSFX = function (n) {
        
        if (typeof(n) === 'string')
            n = find(n);
    
        if (n <= 0)
            return false;
        
        return true;
    }
    
    script.api.pushAsset = function (asset) {
        if (asset == null) {
            return;
        }
        script.sfxs.push(asset);
        
    }    
    
} else {
    if (script.audioCategory) {
        var nameList = [];
        for (var i = 0; i < script.sfxs.length;i++) {
            
            if (script.sfxs[i] == null) {
                print("WARNING: you have an Audio Manager with a missing sfx" + script.getSceneObject().name + " category " + script.audioCategory);
                continue;
            }
            
            var filename = script.sfxs[i].name.split('/').pop().split('#')[0].split('?')[0];
            nameList.push(filename.replace(".wav","").replace(".mp3",""));
            global.AudioManager[script.audioCategory.toLowerCase() + "List"] = nameList;
            script.nameList = nameList;
        } 
    
        global.AudioManager["randomSfxFrom" + script.audioCategory] = function (seed) {
            return global.AudioManager.audio(global.pickRandom2(nameList,seed));
        }
        
        global.AudioManager["randomFrom" + script.audioCategory] = function (seed) {
            return global.pickRandom(nameList,seed);
        }

        global.AudioManager["sfxFrom" + script.audioCategory] = function (index) {
            return script.sfxs[index];
        }
    }

    script.api.pushAssets();
}