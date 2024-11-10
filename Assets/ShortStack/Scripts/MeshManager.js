// @input string meshCategory
// @input Asset.RenderMesh[] _meshes {"label":"meshes"};

script.nameList = [];

if (global.MeshManager == null)
    global.MeshManager = script;

if (script.meshCategory)
    global.MeshManager[script.meshCategory] = script;

script.api.refreshNameList = function () {
    script.nameList = [];
    
    for (var i = 0; i < script.meshes.length;i++) {
        var filename = (script.meshes[i].name.indexOf('/')>-1)?script.meshes[i].name.split('/').pop().split('#')[0].split('?')[0]:script.meshes[i].name;
        script.nameList.push(filename.replace(".mesh",""));
    }
    return script.nameList;
}

var pushMeshes = function () {
    var arr = global.MeshManager.meshes.concat(script.meshes);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    global.MeshManager.meshes = uniqueArr;
    global.MeshManager.api.refreshNameList();
} 

if (global.MeshManager == script || script.meshCategory) {
    
    script.mesh = function (n,fallback) {
        var x = find(n,fallback);
        return script.meshes[x];
    }
    
    script.meshName = function (n,fallback) {
        return script.nameList[find(n,fallback)];
    }
    
    script.hasMesh = function (n) {
        return find(n)>-1;
    }
    
    var find = function (n,fallback) {

        if (typeof n == 'number')
            return n;
        
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

    if (script.meshCategory.length > 0) {
        global.MeshManager["from" + script.meshCategory] = function (index) {
            return script.meshes[index];
        }
    }
}

script.meshes = script._meshes;
script.nameList = script.api.refreshNameList();

if (global.MeshManager != script)
    pushMeshes();