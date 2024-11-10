@component
export class KillAfterDelay extends BaseScriptComponent {
  onAwake() {
    this.startCountdown();
  }

  startCountdown() {
    let countdown = this.createEvent("UpdateEvent");
    let maxTime = 25;
    let timer = 0;
    countdown.bind(() => {
      timer += getDeltaTime();
      if (timer >= maxTime) {
        // Do action here
        this.sceneObject.enabled = false;
      }
    });
  }
}