@component
export class MoveRune extends BaseScriptComponent {
    // @input SceneObject sceneObject
// @input float magnitude = 1.0

@input camera: Camera;
    
public shouldMove = false;

onAwake() {
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
}

onUpdate() {
    if (this.shouldMove) {
        var forward = this.camera.getTransform().forward; // Get the forward direction of the camera
        var newPosition = this.sceneObject.getTransform().getWorldPosition().add(forward.uniformScale(-1000));
        this.sceneObject.getTransform().setWorldPosition(newPosition);
    }
}

}
