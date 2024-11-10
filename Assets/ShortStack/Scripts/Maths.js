global.Maths = script;

script.magnitude = function (v) {
    return Math.abs(v.x)+Math.abs(v.y)+Math.abs(v.z); 
}

script.normalize = function (v) {
    var magnitude = script.magnitude(v);
    return new vec3(v.x/magnitude,v.y/magnitude,v.z/magnitude);
}

script.dot = function (vector1, vector2) {
  var result = 0;
  result += vector1.x * vector2.x;
  result += vector1.y * vector2.y;
  result += vector1.z * vector2.z;
  return result;
}

script.bezier = function (p0, p1, p2, p3, t)
{
    var u = 1 - t;
    var t2 = t * t;
    var u2 = u * u;
    var u3 = u2 * u;
    var t3 = t2 * t;

    var tt = (3 * u2 * t);  
    var ttt = (3 * u * t2);
    
    var result = p0.mult(new vec3(u3,u3,u3)).add(p1.mult(new vec3(tt,tt,tt))).add(p2.mult(new vec3(ttt,ttt,ttt))).add(p3.mult(new vec3(t3,t3,t3)));

    return result;
}

script.lerp = function(a,b,f) {
    return a * (1 - f) + (b * f);
}

script.negPos = function () {
    return Math.random()>0.5?-1:1;
}

script.cross = function(v1,v2) {
  var x = v1.x;
  var y = v1.y;
  var z = v1.z;
  var vx = v2.x;
  var vy = v2.y;
  var vz = v2.z;
  return new vec3(y * vz - z * vy, z * vx - x * vz, x * vy - y * vx);
};

script.angleDir = function(fwd,targetDir,bool) {
    var perp = script.cross(fwd, targetDir);
    var dir = script.dot(perp, vec3.up());

    if (!bool)
        return dir;

    if (dir > 0.0) {
        return 1.0;
    } else if (dir < 0.0) {
        return -1.0;
    } else {
        return 0.0;
    }
} 

// Assuming you have a quaternion represented as [x, y, z, w]
// Normalize the quaternion
function normalizeQuaternion(quat) {
    const magnitude = Math.sqrt(quat[0] * quat[0] + quat[1] * quat[1] + quat[2] * quat[2] + quat[3] * quat[3]);
    return [quat[0] / magnitude, quat[1] / magnitude, quat[2] / magnitude, quat[3] / magnitude];
}

// Convert a quaternion into a direction vector
function quaternionToDirectionVector(quat) {
    
    quat = [quat.x,quat.y,quat.z,quat.w];    
    
    // Ensure the quaternion is normalized
    quat = normalizeQuaternion(quat);

    // Create a reference direction vector [0, 0, 1]
    const refDirection = [0, 0, 1];

    // Quaternion rotation
    const x = quat[0];
    const y = quat[1];
    const z = quat[2];
    const w = quat[3];

    // Calculate the rotated direction vector
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const wx2 = w * x2;
    const wy2 = w * y2;
    const wz2 = w * z2;
    const xx2 = x * x2;
    const xy2 = x * y2;
    const xz2 = x * z2;
    const yy2 = y * y2;
    const yz2 = y * z2;
    const zz2 = z * z2;

    const resultDirection = [
        (1 - (yy2 + zz2)) * refDirection[0] + (xy2 - wz2) * refDirection[1] + (xz2 + wy2) * refDirection[2],
        (xy2 + wz2) * refDirection[0] + (1 - (xx2 + zz2)) * refDirection[1] + (yz2 - wx2) * refDirection[2],
        (xz2 - wy2) * refDirection[0] + (yz2 + wx2) * refDirection[1] + (1 - (xx2 + yy2)) * refDirection[2]
    ];

    return new vec3(resultDirection[0],resultDirection[1],resultDirection[2]);
}

script.quatToVec = quaternionToDirectionVector;