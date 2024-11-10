// Get the collider component of the object
var collider = script.getSceneObject().getComponent("Physics.ColliderComponent");

// Flag to track if the object has started shrinking
var isShrinking = false;

// Listen for the overlap event
collider.onCollisionEnter.add(function(e) {
    
    // shrink  
    print("Collision!!!")
    if (isShrinking) {
        return; // If the object is already shrinking, don't do it again
    }

    print("Collision detected, starting shrink...");

    // Set the shrinking flag to true
    isShrinking = true;

    // Get the reference to the object's transform
    var transform = script.getSceneObject().getTransform();
    
    // Set the shrink speed (adjust the speed to control how fast the object shrinks)
    var shrinkSpeed = 0.1;  // How much the object shrinks per frame
    
    // Initial scale of the object
    var initialScale = transform.getLocalScale();
    
    // Function to shrink the object over time
    function shrinkObject() {
        // Get the current scale
        var currentScale = transform.getLocalScale();
        
        // Shrink the object by decreasing its scale along all axes (X, Y, Z)
        var newScale = new vec3(
            currentScale.x - shrinkSpeed,
            currentScale.y - shrinkSpeed,
            currentScale.z - shrinkSpeed
        );
        
        // Prevent the object from shrinking too small
        if (newScale.x > 0 && newScale.y > 0 && newScale.z > 0) {
            transform.setLocalScale(newScale);
        } else {
            // Stop shrinking when the object is too small and set it to invisible
            transform.setLocalScale(new vec3(0, 0, 0)); // Optional: Set scale to 0 (invisible)
            // Disable the object when it's fully shrunk
            script.getSceneObject().enabled = false;
        }
    }
    
    // Call the shrink function every frame
    var updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(shrinkObject);
});
