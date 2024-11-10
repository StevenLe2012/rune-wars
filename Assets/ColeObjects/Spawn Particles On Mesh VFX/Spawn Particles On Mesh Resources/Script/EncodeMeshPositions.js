// EncodeMeshPositions.js
// Version: 0.0.2
// Event: Lens Initialized
// Description: The script gets render mesh visuals from an object and converts all the mesh data into textures to be used in VFX
//
// ---- LOCAL API USAGE ----
// Get the array of scene objects containing the cloned Render Mesh Visuals.
//  encodeMeshPositionsScript.api.clonedRenderMeshVisuals;

// @input Component.RenderMeshVisual[] MeshVisualsToEncode
// @input Component.VFXComponent[] vfx {"label": "VFX"}
// @ui {"widget":"label", "label":""}
// @ui {"widget":"label", "label":"Please set the required materials"}
// @ui {"widget":"label", "label":"You can find the materials in the Materials folder."}
// @ui {"widget":"label", "label":""}
// @input Asset.Material meshDataMaterial
// @input Asset.Material feedbackMaterial
// @ui {"widget":"label", "label":""}
// @ui {"widget":"separator"}
// @input bool advanced = false
// @input int encodeResolution = 64 {"widget":"combobox", "values":[{"label":"64 x 64", "value":64}, {"label":"128 x 128", "value":128}], "label": "Resolution", "showIf": "advanced"}
// @input vec3 objectBoundsMin = {-500,-500,-500} {"showIf": "advanced"}
// @input vec3 objectBoundsMax = {500,500,500} {"showIf": "advanced"}


for(var i = 0; i<script.MeshVisualsToEncode.length; i++) {
    if (!script.MeshVisualsToEncode[i]) {
        print("ERROR: Please set the mesh visuals of the object you want to encode.");
        return;
    }
}

if (script.vfx.length == 0) {
    print("ERROR: Please add at least one VFX component to the script.");
    return;
}

for (var i = 0; i < script.vfx.length; i++) {
    if (!script.vfx[i]) {
        print("ERROR: Please make sure the VFX exist and set in the script.");
        return;
    } else {
        if (!script.vfx[i].asset) {
            print("ERROR: Please make sure VFX component contains VFX asset.");
            return;
        }
    }
}

if (!script.meshDataMaterial) {
    print("ERROR: Please make sure meshdata_mat exist in the Resources panel and set it to the script.");
    return;
}

if (!script.feedbackMaterial) {
    print("ERROR: Please make sure feedback_mat exist in the Resources panel and set it to the script.");
    return;
}


var res = new vec2(script.encodeResolution, script.encodeResolution);
var clonedMeshDataMat = script.meshDataMaterial.clone();
var clonedFeedbackMat = script.feedbackMaterial.clone();
var clonedRenderMeshVisuals = [];

// the list of cloned render mesh visuals
script.api.clonedRenderMeshVisuals = clonedRenderMeshVisuals;

var encoderProperties = encodeMeshPosition(
    {
        encodeMat: clonedMeshDataMat,
        feedbackMat: clonedFeedbackMat,
        VfxObjects: script.vfx,
        boundMin: script.objectBoundsMin,
        boundMax: script.objectBoundsMax,
        resolution: res
    }
);


function encodeMeshPosition(option) {
    var encodeMesh = renderPassEncodeMesh(option.encodeObject, option.encodeMat, option.resolution, 4);
    var velocityFeedback = renderPassFeedback(option.feedbackMat, encodeMesh.rt, encodeMesh.camera);

    option.encodeMat.mainPass.objectBoundsMin = option.boundMin;
    option.encodeMat.mainPass.objectBoundsMax = option.boundMax;
    option.encodeMat.mainPass.meshData0 = velocityFeedback.rt[0];
    option.encodeMat.mainPass.meshData1 = velocityFeedback.rt[1];

    setFilteringMode(option.encodeMat.mainPass.samplers.meshData0, FilteringMode.Nearest);
    setFilteringMode(option.encodeMat.mainPass.samplers.meshData1, FilteringMode.Nearest);
    setWrapMode(option.encodeMat.mainPass.samplers.meshData0, WrapMode.ClampToEdge);
    setWrapMode(option.encodeMat.mainPass.samplers.meshData1, WrapMode.ClampToEdge);

    for (var i = 0; i < option.VfxObjects.length; i++) {
        var vfxAsset = option.VfxObjects[i].asset;
        if (vfxAsset) {
            vfxAsset.properties.meshData0 = encodeMesh.rt[0];
            vfxAsset.properties.meshData1 = encodeMesh.rt[1];
            vfxAsset.properties.meshData2 = encodeMesh.rt[2];
            vfxAsset.properties.meshData3 = encodeMesh.rt[3];
            setFilteringMode(vfxAsset.simulations.allPasses[0].samplers.meshData0, FilteringMode.Nearest);
            setFilteringMode(vfxAsset.simulations.allPasses[0].samplers.meshData1, FilteringMode.Nearest);
            setFilteringMode(vfxAsset.simulations.allPasses[0].samplers.meshData2, FilteringMode.Nearest);
            setFilteringMode(vfxAsset.simulations.allPasses[0].samplers.meshData3, FilteringMode.Nearest);
            vfxAsset.properties.objectBoundsMin = option.boundMin;
            vfxAsset.properties.objectBoundsMax = option.boundMax;
        }
    }
    
    return option;
}

function setFilteringMode(sampler, filteringMode) {
    if (sampler) {
        sampler.filtering = filteringMode;
    }
}

function setWrapMode(sampler, wrapMode) {
    if (sampler) {
        sampler.wrap = wrapMode;
    }
}

function renderPassEncodeMesh(targetObject, material, resolution, numberOfRenderTargets) {
    var renderTargets = [];

    for (var i = 0; i < numberOfRenderTargets; i++) {
        renderTargets.push(createRenderTarget(resolution));
    }

    // Update 0.0.2: Instead of cloning the whole heirarchy, only clone mesh visuals
    var clonedObject;
    var layer = LayerSet.makeUnique();

    for (var i = 0; i < script.MeshVisualsToEncode.length; i++) {
        var mv = script.MeshVisualsToEncode[i];
        var so = mv.getSceneObject();
        var newSo = so.copySceneObject(so);
        clonedObject = newSo;
        
        var newMV = newSo.getComponent("Component.RenderMeshVisual");
        newMV.mainMaterial = material;
        newSo.layer = layer;
        
        // reset local transform
        clonedObject.getTransform().setLocalPosition(new vec3(0, 0, 0));
        clonedObject.getTransform().setLocalRotation(quat.quatIdentity());
        clonedObject.getTransform().setLocalScale(new vec3(1, 1, 1));

        clonedRenderMeshVisuals.push(clonedObject);
    }
     
    var camera = createCameraMRT(renderTargets, layer);
    return {
        rt: renderTargets,
        camera: camera,
        baseObject: clonedObject,
        material: material
    };
}


function renderPassFeedback(feedbackMat, sourceRenderTargets, sourceCamera) {
    var renderTargets = [];
    for (var i = 0; i < 2; i++) {
        renderTargets.push(createRenderTarget(sourceRenderTargets[0].control.resolution));
    }

    var layer = LayerSet.makeUnique();
    var camera = createCameraMRT(renderTargets, layer);
    camera.getComponent("Component.Camera").renderOrder = sourceCamera.getComponent("Component.Camera").renderOrder + 1;

    feedbackMat.mainPass.meshData0 = sourceRenderTargets[0];
    feedbackMat.mainPass.meshData1 = sourceRenderTargets[1];

    setFilteringMode(feedbackMat.mainPass.samplers.meshData0, FilteringMode.Nearest);
    setFilteringMode(feedbackMat.mainPass.samplers.meshData1, FilteringMode.Nearest);
    setWrapMode(feedbackMat.mainPass.samplers.meshData0, WrapMode.ClampToEdge);
    setWrapMode(feedbackMat.mainPass.samplers.meshData1, WrapMode.ClampToEdge);

    var postEffect = createPostEffect(camera, feedbackMat, layer);

    return {
        rt: renderTargets,
        camera: camera,
        baseObject: postEffect,
        material: feedbackMat
    };
}

function createRenderTarget(resolution) {
    var renderTarget = global.scene.createRenderTargetTexture();
    renderTarget.control.useScreenResolution = false;
    renderTarget.control.resolution = resolution;
    renderTarget.control.clearColorEnabled = true;
    renderTarget.control.clearDepthEnabled = false;
    renderTarget.control.fxaa = false;
    renderTarget.control.msaa = false;
    return renderTarget;
}

function createCameraMRT(renderTargets, layer) {
    var objectBase = global.scene.createSceneObject("");
    var cameraComponent = objectBase.createComponent("Component.Camera");
    cameraComponent.enabled = true;
    cameraComponent.renderLayer = layer;
    cameraComponent.renderTarget = renderTargets[0];
    cameraComponent.renderOrder = -100;
    cameraComponent.enableClearColor = true;
    cameraComponent.type = Camera.Type.Orthographic;
    cameraComponent.aspect = 1.0;
    cameraComponent.size = 2.0;
    cameraComponent.enabled = true;
    cameraComponent.devicePropertyUsage = Camera.DeviceProperty.None;
    cameraComponent.near = 0.5;
    cameraComponent.far = 100.0;

    var colorRenderTargets = cameraComponent.colorRenderTargets;

    for (var i = 0; i < renderTargets.length; i++) {
        if (renderTargets[i]) {
            checkOrAddColorRenderTarget(colorRenderTargets, i);
            colorRenderTargets[i].targetTexture = renderTargets[i];
            colorRenderTargets[i].clearColor = new vec4(0, 0, 0, 0);
        }
    }
    cameraComponent.colorRenderTargets = colorRenderTargets;
    return objectBase;
}

function checkOrAddColorRenderTarget(colorRenderTargetsArray, colorAttachmentIndex) {
    if (colorAttachmentIndex >= colorRenderTargetsArray.length) {
        for (var i = colorRenderTargetsArray.length; i <= colorAttachmentIndex; i++) {
            colorRenderTargetsArray.push(Camera.createColorRenderTarget());
        }
    }
}


function createPostEffect(baseCamera, material, layer) {
    var postEffectObject = global.scene.createSceneObject("");
    postEffectObject.setParent(baseCamera);
    var postEffectComponent = postEffectObject.createComponent("Component.PostEffectVisual");
    postEffectComponent.mainMaterial = material;
    postEffectObject.layer = layer;
    return postEffectComponent;
}