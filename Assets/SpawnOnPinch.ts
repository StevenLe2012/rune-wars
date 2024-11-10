const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { SIK } from "Spectacles Sync Framework/SpectaclesInteractionKit/SIK";
import { InteractorTriggerType } from "Spectacles Sync Framework/SpectaclesInteractionKit/Core/Interactor/Interactor";
// const InteractorTriggerType =
//   require("SpectaclesInteractionKit/Core/Interactor/Interactor").InteractorTriggerType;
import { InteractorInputType } from "Spectacles Sync Framework/SpectaclesInteractionKit/Core/Interactor/Interactor";
import { MoveRune } from "MoveRune";
const EPSILON = 0.01;

@component
export class SpawnOnPinch extends BaseScriptComponent {
  @input spawnedWall: ObjectPrefab;
  @input spawnedRune: ObjectPrefab;
  @input camera: Camera;

  @input filterEnabled: boolean;

  private leftHandInteractor;
  private hitTestSession;
  private latestSpawnedRune: SceneObject;
  // @input moveRune: MoveRune;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart();
    });

    // create new hit session
    this.hitTestSession = this.createHitTestSession(this.filterEnabled);
    if (!this.sceneObject) {
      print("Please set Target Object input");
      return;
    }

    // create update event
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
  }

  onStart() {
    // Retrieve HandInputData from SIK's definitions.
    let handInputData = SIK.HandInputData;

    // Fetch the TrackedHand for left and right hands.
    let leftHand = handInputData.getHand("left");
    let rightHand = handInputData.getHand("right");

    // Add print callbacks for whenever these hands pinch.
    leftHand.onPinchDown.add(() => {
      print(
        `The left hand has pinched. The tip of the left index finger is: ${leftHand.indexTip.position}.`
      );
    });
    rightHand.onPinchDown.add(() => {
      print(`The right hand has pinched.`);
      // Instantiate a prefab under where the index finger is located.
      this.latestSpawnedRune = this.spawnedRune.instantiate(null);
      // this.moveRune = this.latestSpawnedRune.getComponent("MoveRune");
      this.latestSpawnedRune.setParentPreserveWorldTransform(
        rightHand.wrist.getAttachmentPoint()
      );
      this.latestSpawnedRune
        .getTransform()
        .setWorldPosition(rightHand.wrist.position);
    });

    rightHand.onPinchUp.add(() => {
      // UPDATE THE SPAWN POSITION ON CLOUD SUCH THAT IT IS STILL AT THE HAND AND NO LONGER 0,0 (POTENTIAL PROBLEM B/C OF UNPARRENTING)
      print(`The right hand has un-pinched.`);
      this.latestSpawnedRune.removeParent();
      // this.latestSpawnedRune
      //   .getTransform()
      //   .setWorldPosition(rightHand.wrist.position);
      let physicsComponent = this.latestSpawnedRune.getComponent(
        "Physics.BodyComponent"
      );
      // var forward = this.camera.getTransform().forward; // Get the forward direction of the camera
      // for(let i = 0; i < 10000; i++) {
      //   var newPosition = this.latestSpawnedRune.getTransform().getWorldPosition().add(forward.uniformScale(-1));
      //   this.latestSpawnedRune.getTransform().setWorldPosition(newPosition);

      //   // let currentLocation = this.sceneObject.getTransform();
      //   // currentLocation.setLocalPosition(currentLocation.x)
      // }
      physicsComponent.addForce(
        this.camera.getTransform().forward.uniformScale(-1000),
      //   // rightHand.wrist
      //   //   .getAttachmentPoint()
      //   //   .getTransform()
      //   //   .forward.uniformScale(1000),
        Physics.ForceMode.VelocityChange
      );
    });

    
  }
    

  //   rightHand.onPinchUp.add(() => {
  //     print("The right hand has un-pinched.");

  //     // Remove the parent, maintaining the current world position
  //     let runeTransform = this.latestSpawnedRune.getTransform();
  //     let currentRunePosition = runeTransform.getWorldPosition();
  //     this.latestSpawnedRune.removeParent();
  //     runeTransform.setWorldPosition(currentRunePosition); // Set to its last position

  //     // Apply force based on the camera's forward direction
  //     let physicsComponent = this.latestSpawnedRune.getComponent(
  //       "Physics.BodyComponent"
  //     );
  //     let forwardDirection = this.camera.getTransform().forward; // Get the forward direction of the camera
  //     let forceMagnitude = -1000;
  //     physicsComponent.addForce(
  //       forwardDirection.uniformScale(forceMagnitude),
  //       Physics.ForceMode.VelocityChange
  //     );
  //   });
  // }
    


  createHitTestSession(filterEnabled) {
    // create hit test session with options
    var options = HitTestSessionOptions.create();
    options.filter = filterEnabled;

    var session = WorldQueryModule.createHitTestSessionWithOptions(options);
    return session;
  }

  onHitTestResult(results) {
    if (results === null) {
      return;
    }

    // get hit information
    const hitPosition = results.position; // this is basically our cursor position
    const hitNormal = results.normal;

    //identifying the direction the object should look at based on the normal of the hit location.
    var lookDirection;
    if (1 - Math.abs(hitNormal.normalize().dot(vec3.up())) < EPSILON) {
      lookDirection = vec3.forward();
    } else {
      lookDirection = hitNormal.cross(vec3.up());
    }

    const toRotation = quat.lookAt(lookDirection, hitNormal);
    //set position and rotation
    let cursor = SIK.CursorController.getCursorByInteractor(
      this.leftHandInteractor
    );

    if (cursor === null) {
      print("Cursor not found");
      return;
    } else {
      // CURRENTLY THIS IS BROKEN WITH CURSOR NOT IN THE CORRECT ORIENTATION DESPITE TEH SPAWNING BEING GOOD.
      // THIS IS VERY CURSED. MAYBE WE HAVE TO DISABLE THIS OR SET THE ACTUAL CURSER TO THE VISUAL ONCE WE NEED TO INTERACT WITH SOMETHING.
      cursor.visual.getTransform().setWorldPosition(hitPosition);
      cursor.visual.getTransform().setWorldRotation(toRotation);

      if (
        this.leftHandInteractor.previousTrigger !==
          InteractorTriggerType.None &&
        this.leftHandInteractor.currentTrigger === InteractorTriggerType.None
      ) {
        // Called when a trigger ends
        // INSTANTIATE THE NEW OBJECT AND POSITION IT WITH ROTATION
        var newObject = this.spawnedWall.instantiate(null);
        newObject.getTransform().setWorldPosition(hitPosition);
        newObject.getTransform().setWorldRotation(toRotation);
        print("Prefab Instantiated: " + newObject.name);
      }
    }
  }

  onUpdate() {
    // Check to see if this works but also might just be better to do get left hand automatically.
    for (var interactor of SIK.InteractionManager.getTargetingInteractors()) {
      if (interactor.inputType === InteractorInputType.LeftHand) {
        this.leftHandInteractor = interactor;
      }
    }

    if (
      this.leftHandInteractor &&
      this.leftHandInteractor.isActive() &&
      this.leftHandInteractor.isTargeting()
    ) {
      const rayStartOffset = new vec3(
        this.leftHandInteractor.startPoint.x,
        this.leftHandInteractor.startPoint.y,
        this.leftHandInteractor.startPoint.z + 30
      );

      const rayStart = rayStartOffset;
      const rayEnd = this.leftHandInteractor.endPoint;

      this.hitTestSession.hitTest(
        rayStart,
        rayEnd,
        this.onHitTestResult.bind(this)
      );
    }
  }
}
