import { ShortStack } from "./ShortStack_Declaration";
@component
export class CollidedWithPlayer extends BaseScriptComponent {
  // @input  healthData and getComponenet
  // for shortstack health data example -> state = updateHP, and in any script you can reference the shortstack like @input shortstack. then you can do shortstack.api.go("updateHP")
  @input("Component.ScriptComponent")
  shortStack: ShortStack;
  @input
  physicsBody: BodyComponent;
  onAwake() {
    this.physicsBody.onCollisionEnter.add(function (e) {
      var collision = e.collision;
      var otherCollider = collision.collider;

      print("PLAYER: Collided with " + otherCollider.getSceneObject().name);
      if (otherCollider.getSceneObject().name === "Sphere") {
        print("minus 10 helath. Ryla hit me");
        this.shortStack.go("updateHP");
      } else {
        print("Rylan hit me");
        this.shortStack.go("updateHP");
      }
    });
  }
}
