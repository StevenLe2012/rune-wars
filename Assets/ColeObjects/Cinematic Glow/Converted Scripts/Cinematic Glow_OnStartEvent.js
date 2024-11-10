//@ui {"widget":"label", "label":"Cinematic Glow"}
//@ui {"widget":"label", "label":"by GoSpooky"}
//@ui {"widget":"label", "label":""}
//@ui {"widget":"label", "label":"1. Create a new Render Target and view it in the Scene Config panel"}
//@ui {"widget":"label", "label":"2. Assign that Render Target in this script under 'Composite Target'"}
//@ui {"widget":"label", "label":"3. Assign the camera that renders your scene to 'Main Camera'"}
//@ui {"widget":"label", "label":""}
//@input bool doNotGlow {"hint":"If you want to keep the glowing setup in your scene but you do not want to have it active now, enable this checkbox. This will directly 'reroute' the Main Camera's Render Target to the Composite Target."}
//@ui {"widget":"label", "label":""}
//@input Asset.Texture compositeTarget
//@input Component.Camera mainCamera
//@input bool warnPostEffects = true {"hint":"Post Effects can cause issues and need a custom fix to work. Enable this checkbox to get a message in the console when a fix is required."}
//@ui {"widget":"label", "label":""}
//@input bool showHidden
//@input Asset.Texture glowMatteTarget {"showIf":"showHidden"}
//@input Asset.Material cinematicGlowRenderer {"showIf":"showHidden"}
//@input Asset.Material glowOccluder {"showIf":"showHidden"}
//@input Asset.Material glowExample {"showIf":"showHidden"}
//@input bool customRenderOrder {"showIf":"showHidden", "hint":"If disabled, the glow's camera render order will be -100 by default."}
//@input int glowRenderOrder = -100 {"showIf":"customRenderOrder"}
script.createEvent("OnStartEvent").bind(function() { require("Cinematic Glow_wrapped")(script)})