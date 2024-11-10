var transform = script.getSceneObject().getTransform();
var speed = 0.05;  // Rotation speed (degrees per second)

// Function to continuously rotate the object over time
function updateRotation() {
    // Calculate the rotation amount for each axis (X, Y, Z)
    var deltaRotationX = speed * Math.sin(getTime() * 0.5); // Sine wave for smooth oscillation on X
    var deltaRotationY = speed; // Constant rotation around Y-axis
    var deltaRotationZ = speed * Math.cos(getTime() * 0.5); // Cosine wave for smooth oscillation on Z

    // Get the current local rotation of the object
    var currentRotation = transform.getLocalRotation();

    // Apply the calculated rotations to each axis
    var newRotation = currentRotation
        .multiply(quat.angleAxis(deltaRotationX, vec3.right()))  // X-axis rotation
        .multiply(quat.angleAxis(deltaRotationY, vec3.up()))     // Y-axis rotation
        .multiply(quat.angleAxis(deltaRotationZ, vec3.forward())); // Z-axis rotation

    // Set the new local rotation
    transform.setLocalRotation(newRotation);
}

// Update every frame
var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(updateRotation);
