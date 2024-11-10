global.Ease = script;

var b = 0;
var c = 1;
var d = 1;

// Linear
script.easeLinear = function(t) {
    return c * t / d + b;
}

// easeOut
script.easeOut = function(t) {
    return c * (1 - Math.pow(1 - t / d, 3)) + b;
}

// easeIn
script.easeIn = function(t) {
    return c * Math.pow(t / d, 3) + b;
}

// easeInOut
script.easeInOut = function(t) {
    t /= d / 2;
    if (t < 1) {
        return c / 2 * t * t * t + b;
    }
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
}

// Exponential
script.easeInExpo = function(t) {
    return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
}

script.easeOutExpo = function(t) {
    return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
}

script.easeInOutExpo = function(t) {
    if (t == 0) return b;
    if (t == d) return b + c;
    if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
    return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
}

// Quintic
script.easeInQuint = function(t) {
    return c * (t /= d) * t * t * t * t + b;
}

script.easeOutQuint = function(t) {
    return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
}

script.easeInOutQuint = function(t) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
}

// Cubic
script.easeInCubic = function(t) {
    return c * (t /= d) * t * t + b;
}

script.easeOutCubic = function(t) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
}

script.easeInOutCubic = function(t) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t + 2) + b;
}

// Back
script.easeOutBack = function(t) {
    var s = 1.70158;
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
}

script.easeInBack = function(t) {
    var s = 1.70158;
    return c * (t /= d) * t * ((s + 1) * t - s) + b;
}

script.easeInOutBack = function(t) {
    var s = 1.70158;
    if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
    return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
}

// Quartic
script.easeInQuart = function(t) {
    return c * (t /= d) * t * t * t + b;
}

script.easeOutQuart = function(t) {
    return -c * ((t = t / d - 1) * t * t * t - 1) + b;
}

script.easeInOutQuart = function(t) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
    return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
}

// Sine
script.easeInSine = function(t) {
    return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
}

script.easeOutSine = function(t) {
    return c * Math.sin(t / d * (Math.PI / 2)) + b;
}

script.easeInOutSine = function(t) {
    return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
}

// Elastic
script.easeInElastic = function(t) {
    var s = 1.70158; 
    var p = 0;
    var a = c;
    if (t == 0) return b;  
    if ((t /= d) == 1) return b + c;  
    if (!p) p = d * 0.3;
    if (a < Math.abs(c)) { a = c; var s = p / 4; }
    else var s = p / (2 * Math.PI) * Math.asin(c / a);
    return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
}

script.easeOutElastic = function(t) {
    var s = 1.70158; 
    var p = 0;
    var a = c;
    if (t == 0) return b;  
    if ((t /= d) == 1) return b + c;  
    if (!p) p = d * 0.3;
    if (a < Math.abs(c)) { a = c; var s = p / 4; }
    else var s = p / (2 * Math.PI) * Math.asin(c / a);
    return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
}

script.easeInOutElastic = function(t) {
    var s = 1.70158; 
    var p = 0;
    var a = c;
    if (t == 0) return b;  
    if ((t /= d / 2) == 2) return b + c;  
    if (!p) p = d * (0.3 * 1.5);
    if (a < Math.abs(c)) { a = c; var s = p / 4; }
    else var s = p / (2 * Math.PI) * Math.asin(c / a);
    if (t < 1) return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
}

// Bounce to completion
script.easeOutBounce = function( t ) {

    const scaledTime = t / 1;

    if( scaledTime < ( 1 / 2.75 ) ) {

        return 7.5625 * scaledTime * scaledTime;

    } else if( scaledTime < ( 2 / 2.75 ) ) {

        const scaledTime2 = scaledTime - ( 1.5 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.75;

    } else if( scaledTime < ( 2.5 / 2.75 ) ) {

        const scaledTime2 = scaledTime - ( 2.25 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.9375;

    } else {

        const scaledTime2 = scaledTime - ( 2.625 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.984375;

    }

}

// Bounce increasing in velocity until completion
script.easeInBounce = function( t ) {
    return 1 - script.easeOutBounce( 1 - t );
}

// Bounce in and bounce out
script.easeInOutBounce = function( t ) {
    if( t < 0.5 ) {
        return script.easeInBounce( t * 2 ) * 0.5;
    }
    return ( script.easeOutBounce( ( t * 2 ) - 1 ) * 0.5 ) + 0.5;
}