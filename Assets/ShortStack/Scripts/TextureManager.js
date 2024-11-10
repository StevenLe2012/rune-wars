// @input string textureCategory
// @input Asset.Texture[] textures

if (script.textures == null)
    return;
        

script.nameList = [];

    
script.api.pushTextures = function (category) {
    var arr = global.TextureManager.textures.concat(script.textures);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    
    global.TextureManager.textures = uniqueArr;
    global.TextureManager.refreshNameList(category);
} 

if (global.TextureManager == null) {
    global.TextureManager = script;

    global.TextureManager.texture = function (n, fallback, category) {
        return script.textures[find(n,fallback, category)];
    }
    
    global.TextureManager.hasTexture = function (n) {
        return find(n)>0;
    }
    
    global.TextureManager.pushTexture = function (texture) {
        script.textures.push(texture);
        global.TextureManager.refreshNameList();
    }
    
    var find = function (n,fallback) {     
        
        if (typeof n == 'number') {
            return n;
        }
        
        var fallbackIndex = 0;
        for (i = 0; i < script.textures.length; i++) {
            if (script.nameList[i] == n) {
                return i;
            }
            if (fallback && script.nameList[i].includes(fallback)) {
                fallbackIndex = i;
            }
        }
        
        if (fallbackIndex == 0) {
            print("couldn't find " + n);
        }        
        
        return fallbackIndex; //error texture
    }
    
    global.TextureManager.refreshNameList = function (category) {
        script.nameList = [];
        for (var i = 0; i < script.textures.length;i++) {
            
            if (script.textures[i] == null) {
                print("WARNING: you have an texture Manager with a missing texture");
                continue;
            }
            
            var filename = script.textures[i].name.split('/').pop().split('#')[0].split('?')[0];
            script.nameList.push(filename.replace(".png","").replace(".gif","").replace(".jpg","").replace(".jpeg",""));
        } 
        
        //print("nameList # " + nameList.length);
    }    
    
    global.TextureManager.refreshNameList();
    
    global.TextureManager.find = find;
    
}

var refresh = function () {
    if (script.textureCategory) {
        var nameList = [];
        for (var i = 0; i < script.textures.length;i++) {
            
            if (script.textures[i] == null) {
                print("WARNING: you have an texture Manager with a missing texture");
                continue;
            }
            
            var filename = script.textures[i].name.split('/').pop().split('#')[0].split('?')[0];
            nameList.push(filename.replace(".png","").replace(".gif","").replace(".jpg","").replace(".jpeg",""));
            global.TextureManager[script.textureCategory.toLowerCase() + "List"] = nameList;
            script.nameList = nameList;
        } 
    }
}

global.TextureManager["textureFrom" + script.textureCategory] = function (index) {
    return script.textures[index];
}
    
global.TextureManager["randomTextureFrom" + script.textureCategory] = function (seed) {
    return global.TextureManager.texture(global.pickRandom2(script.nameList,seed));
}

global.TextureManager["randomFrom" + script.textureCategory] = function (seed) {
    return global.pickRandom(script.nameList,seed);
}

global.TextureManager["pushTo" + script.textureCategory] = function(texAsset) {
   script.texture.push(texAsset);
   refresh(); 
   script.api.pushTextures(script.textureCategory);
}

script.api.pushTextures(script.textureCategory);

refresh();