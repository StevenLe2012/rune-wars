// @input string materialCategory
// @input Asset.Material[] _materials {"label":"materials"};

script.nameList = [];

if (global.MaterialManager == null)
    global.MaterialManager = script;

if (script.materialCategory)
    global.MaterialManager[script.materialCategory] = script;

script.api.refreshNameList = function () {
    script.nameList = [];
    
    for (var i = 0; i < script.materials.length;i++) {
        var filename = (script.materials[i].name.indexOf('/')>-1)?script.materials[i].name.split('/').pop().split('#')[0].split('?')[0]:script.materials[i].name;
        script.nameList.push(filename.split(".")[0]);
    }
    return script.nameList;
}

var pushMaterials = function () {
    var arr = global.MaterialManager.materials.concat(script.materials);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    global.MaterialManager.materials = uniqueArr;
    global.MaterialManager.api.refreshNameList();
} 

if (global.MaterialManager == script || script.materialCategory) {
    
    script.material = function (n,fallback) {
        var x = find(n,fallback);
        return script.materials[x];
    }
    
    script.materialName = function (n,fallback) {
        return script.nameList[find(n,fallback)];
    }
    
    script.hasMaterial = function (n) {
        return find(n)>-1;
    }
    
    var find = function (n,fallback) {

        if (typeof n == 'number') {
            return n;
        }
        
        if (n == null)
            return Math.floor(Math.random()*script.nameList.length);
        
        var fallbackIndex = -1;
        for (i = 0; i < script.nameList.length; i++) {
            if (script.nameList[i] == n) {
                return i;
            }
            if (fallback && script.nameList[i].includes(fallback)) {
                fallbackIndex = i;
            }
        }
        return fallbackIndex; //error asset
    }
}

script.materials = script._materials;
script.nameList = script.api.refreshNameList();

if (global.MaterialManager != script)
    pushMaterials();