//@ui {"widget":"label", "label":"\nCreating Shortcuts enables you to easily add your own custom functionality to ShortStack\n\nIn this example, we create global.Shortcuts.api.drizzleSyrup (or drizzleSyrup for short) that generates a syrupy particle effect from scratch"}

var drizzleSyrup = function (shortStack) {
    //PARAMS
    //::shortStack:: ShortStack calling drizzleSyrup    
    //++ Add additional parameters as you need
    
    shortStack.api.addUpdate("drizzleSyrup",function () {
        
        //we create a syrup drop
        var drip = global.scene.createSceneObject("drop");
        drip.getTransform().setWorldPosition(shortStack.getTransform().getWorldPosition());
        drip.getTransform().setWorldRotation(shortStack.getTransform().getWorldRotation());
       
        //using the 🟤 emoji
        var dripText = drip.createComponent("Component.Text");
        dripText.text = "🟤";
        dripText.size = 512;
        
        //with physics
        drip.createComponent("Physics.BodyComponent");        
            
        //set to destroy 
        var dripScript = drip.createComponent("Component.ScriptComponent");
        global.Heartbeat.api.add(dripScript);
        dripScript.api.addDelay("drip",0.4,function () {
           drip.destroy(); 
        });
        
    });
    
    shortStack.api.subscribeOnStateChange("drizzleSyrup",function () {
        shortStack.api.removeUpdate("drizzleSyrup");
    });   
}

global.Shortcuts.api.drizzleSyrup = drizzleSyrup;
    
//CHEAT SHEET    
    //shortStack.focus = true -> holds up State until set false
    //shortStack.api.addUpdate(tag,func)
    //shortStack.api.addDelay(tag,time,func)
    //shortStack.api.removeUpdate(tag)
    //shortStack.api.removeDelay(tag)
    //shortStack.api.subscribeOnStateChange(tag,func) 
//