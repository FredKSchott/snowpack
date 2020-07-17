function f(b){var a=[];return e(b,a),a}function e(b,a){for(var c=0;c<b.length;c++){var d=b[c];Array.isArray(d)?e(d,a):a.push(d)}}export{f as flatten};
