// @input string assetCategory
// @input Asset.ObjectPrefab[] assets

script.nameList = [];

    
script.api.pushAssets = function (category) {
    var arr = global.AssetManager.assets.concat(script.assets);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    
    global.AssetManager.assets = uniqueArr;
    global.AssetManager.refreshNameList(category);
} 

if (global.AssetManager == null) {
    global.AssetManager = script;

    global.AssetManager.asset = function (n, fallback, category) {
        return script.assets[find(n,fallback, category)];
    }
    
    global.AssetManager.hasAsset = function (n) {
        return find(n)>0;
    }
    
    var find = function (n,fallback) {     
        
        if (typeof n == 'number') {
            return n;
        }

        var fallbackIndex = 0;
        for (i = 0; i < script.assets.length; i++) {
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
        
        return fallbackIndex; //error asset
    }
    
    global.AssetManager.refreshNameList = function (category) {
        script.nameList = [];
        for (var i = 0; i < script.assets.length;i++) {
            
            if (script.assets[i] == null) {
                print("WARNING: you have an Asset Manager with a missing asset on " + script.getSceneObject().name);
                continue;
            }
         
            var filename = script.assets[i].name.split('/').pop().split('#')[0].split('?')[0];
            script.nameList.push(filename.replace(".oprfb",""));
        } 
        
        //print("nameList # " + nameList.length);
    }    
    
    global.AssetManager.refreshNameList();
    
    global.AssetManager.find = find;
    
} else {
    if (script.assetCategory) {
        var nameList = [];
        for (var i = 0; i < script.assets.length;i++) {
            
            if (script.assets[i] == null) {
                print("WARNING: you have an Asset Manager with a missing asset" + script.getSceneObject().name + " category " + script.assetCategory);
                continue;
            }
            
            var filename = script.assets[i].name.split('/').pop().split('#')[0].split('?')[0];
            nameList.push(filename.replace(".oprfb",""));
            global.AssetManager[script.assetCategory.toLowerCase() + "List"] = nameList;
            script.nameList = nameList;
        } 
    
        global.AssetManager["randomAssetFrom" + script.assetCategory] = function (seed) {
            return global.AssetManager.asset(global.pickRandom2(nameList,seed));
        }
        
        global.AssetManager["randomFrom" + script.assetCategory] = function (seed) {
            return global.pickRandom(nameList,seed);
        }

        global.AssetManager["from" + script.assetCategory] = function (index) {
            return script.assets[index];
        }
    }
    
    script.api.pushAssets(script.assetCategory);
}