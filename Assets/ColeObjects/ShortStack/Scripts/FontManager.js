// @input string fontCategory
// @input Asset.Font[] fonts

if (script.fonts == null)
    return;
        

script.nameList = [];

    
script.api.pushFonts = function (category) {
    var arr = global.FontManager.fonts.concat(script.fonts);
    
    var uniqueArr = [];

    // loop through array
    for(var i in arr) {
        if(uniqueArr.indexOf(arr[i]) === -1) {
            uniqueArr.push(arr[i]);
        }
    }
    
    global.FontManager.fonts = uniqueArr;
    global.FontManager.refreshNameList(category);
} 

if (global.FontManager== null) {
    global.FontManager= script;

    global.FontManager.font = function (n, fallback, category) {
        return script.fonts[find(n,fallback, category)];
    }
    
    global.FontManager.hasFont = function (n) {
        return find(n)>0;
    }
    
    global.FontManager.pushFont = function (f) {
        script.fonts.push(f);
        global.FontManager.refreshNameList();
    }
    
    var find = function (n,fallback) {     
        
        if (typeof n == 'number') {
            return n;
        }
        
        var fallbackIndex = 0;
        for (i = 0; i < script.fonts.length; i++) {
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
        
        return fallbackIndex; //error global.FontManagerture
    }
    
    global.FontManager.refreshNameList = function (category) {
        script.nameList = [];
        for (var i = 0; i < script.fonts.length;i++) {
            
            if (script.fonts[i] == null) {
                print("WARNING: you have an Font Manager with a missing font");
                continue;
            }
            
            var filename = script.fonts[i].name.split('/').pop().split('#')[0].split('?')[0];
            script.nameList.push(filename.replace(".png","").replace(".gif","").replace(".jpg","").replace(".jpeg",""));
        } 
        
        //print("nameList # " + nameList.length);
    }    
    
    global.FontManager.refreshNameList();
    
    global.FontManager.find = find;
    
}

var refresh = function () {
    if (script.fontCategory) {
        var nameList = [];
        for (var i = 0; i < script.fonts.length;i++) {
            
            if (script.fonts[i] == null) {
                print("WARNING: you have a Font Manager with a missing font");
                continue;
            }
            
            var filename = script.fonts[i].name.split('/').pop().split('#')[0].split('?')[0];
            nameList.push(filename.replace(".png","").replace(".gif","").replace(".jpg","").replace(".jpeg",""));
            global.FontManager[script.fontCategory.toLowerCase() + "List"] = nameList;
            script.nameList = nameList;
        } 
    }
}

global.FontManager["fontFrom" + script.fontCategory] = function (index) {
    return script.fonts[index];
}
    
global.FontManager["randomFontFrom" + script.fontCategory] = function (seed) {
    return global.FontManager.font(global.pickRandom2(script.nameList,seed));
}

global.FontManager["randomFrom" + script.fontCategory] = function (seed) {
    return global.pickRandom(script.nameList,seed);
}

global.FontManager["pushTo" + script.fontCategory] = function(fontAsset) {
   script.fonts.push(fontAsset);
   refresh(); 
   script.api.pushFonts(script.fontCategory);
}

script.api.pushFonts(script.fontCategory);

refresh();