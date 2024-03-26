// Vector and matrix math
//

//--------------------------------------------------------------------------------
//-- Math Utilities --------------------------------------------------------------
//--------------------------------------------------------------------------------

export const TO_RAD = Math.PI / 180;
export const TO_DEG = 1 / TO_RAD;
export const TAU = Math.PI * 2;

export function toRad(x) { return x * TO_RAD; }
export function toDeg(x) { return x * TO_DEG; }

export function clampRad(x) {
    while (x < 0) x += TAU;
    return x % TAU;
}

export function slerp(a,b,t) {
    const cc = (1-t)*Math.cos(a) + t*Math.cos(b);
    const ss = (1-t)*Math.sin(a) + t*Math.sin(b);
    return Math.atan2(ss,cc);
}


export function gaussian(count, step = 1, standardDeviation = 1) {
    const sd = 2 * standardDeviation * standardDeviation;
    const a = 1/Math.sqrt(Math.PI * sd);
    const b = 1/sd;
    const out = [a];
    for (let i = 1; i < count; i++) {
        const x = step * i;
        out.push(a * Math.E ** -(b * x * x));
    }
    return out;
}

export function rayTriangleIntersect(start, aim, triangle) {
    const epsilon = 0.00001;
    const v0 = triangle[0];
    const v1 = triangle[1];
    const v2 = triangle[2];
    const edge1 = v3_sub(v1,v0);
    const edge2 = v3_sub(v2,v0);
    const h = v3_cross(aim, edge2);
    const a = v3_dot(edge1, h);
    if (a > -epsilon && a < epsilon) return null; // Aim is parallel to triangle
    const f = 1/a;
    const s = v3_sub(start,v0);
    const u = f * v3_dot(s,h);
    if (u < 0 || u > 1) return null;
    const q = v3_cross(s, edge1);
    const v = f * v3_dot(aim, q);
    if (v < 0 || u+v > 1) return null;
    const t = f * v3_dot(edge2, q);
    if (t < epsilon || t > 1/epsilon) return null;
    return v3_add(start, v3_scale(aim, t));
}

// returns [xyz] on surface of sphere with values -1 > p > 1
export function sphericalRandom() {
    const u = Math.random();
    const v = Math.random();
    const root = 2 * Math.sqrt(u - u * u);
    const angle = TAU * v;
    return [root * Math.cos(angle), root * Math.sin(angle), 1-2*u];
}

//--------------------------------------------------------------------------------
//-- 2 Vectors -------------------------------------------------------------------
//--------------------------------------------------------------------------------

export function v2_zero() {
    return [0,0];
}

// export function v2_unit() {
//     return [1,0];
// }

export function v2_random() {
    const a = Math.random() * 2 * Math.PI;
    return [Math.cos(a), Math.sin(a)];
}

export function v2_magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

export function v2_sqrMag(v) { // Squared magnitude
    return (v[0] * v[0] + v[1] * v[1]);
}

export function v2_normalize(v) {
    const m = 1/v2_magnitude(v);
    return [v[0]*m, v[1]*m];
}

export function v2_abs(v) {
    return [Math.abs(v[0]), Math.abs(v[1])];
}

export function v2_ceil(v) {
    return [Math.ceil(v[0]), Math.ceil(v[1])];
}

export function v2_floor(v) {
    return [Math.floor(v[0]), Math.floor(v[1])];
}

export function v2_inverse(v) {
    return [1/v[0], 1/v[1]];
}

export function v2_scale(v,s) {
    return [v[0] * s, v[1] * s];
}

export function v2_multiply(a,b) {
    return [a[0] * b[0], a[1] * b[1]];
}

export function v2_divide(a,b) {
    return [a[0] / b[0], a[1] / b[1]];
}

export function v2_rotate(v,a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [cosA*v[0] - sinA*v[1], sinA*v[0] + cosA*v[1]];
}

export function v2_add(a,b) {
    return [a[0] + b[0], a[1] + b[1]];
}

export function v2_sub(a,b) {
    return [a[0] - b[0], a[1] - b[1]];
}

export function v2_dot(a,b) {
    return a[0] * b[0] + a[1] * b[1];
}

export function v2_min(a,b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
}

export function v2_max(a,b) {
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

export function v2_angle(a,b) {
    return Math.acos(Math.min(1,(Math.max(-1, v2_dot(v2_normalize(a), v2_normalize(b))))));
}

export function v2_signedAngle(a,b) {
    return Math.atan2(a[0]* b[1]-a[1]*b[0], a[0]*b[0]+a[1]*b[1]);
}

export function v2_lerp(a,b,t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function v2_equals(a,b,e = 0) { // e is an epsilon
    if (e) return (e > Math.abs(a[0]-b[0]) && e > Math.abs(a[1]-b[1]));
    return (a[0] === b[0] && a[1] === b[1]);
}

export function v2_isZero(v) {
    return v[0] === 0 && v[1] === 0;
}

export function v2_distance(a,b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx*dx+dy*dy);
}

export function v2_distanceSqr(a,b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx*dx+dy*dy;
}

export function v2_manhattan(a, b) {
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
}

export function v2_transform(v, m) {
    const x = v[0], y = v[1];
    return ([
        m[0] * x + m[2] * y,
        m[1] * x + m[3] * y
    ]);
}

export function v2_perpendicular(v) {
    return[v[1], v[0]];
}

export function v2_closest(v,p) { // The closest point on vector v from point p, assumes v is normalized
    return v2_scale(v,v2_dot(v,p));
}

//--------------------------------------------------------------------------------
//-- 3 Vectors -------------------------------------------------------------------
//--------------------------------------------------------------------------------

export function v3_zero() {
    return [0,0,0];
}

// export function v3_unit() {
//     return [1,1,1];
// }

// export function v3_random() {
//     const a = Math.random() * 2 * Math.PI;
//     const b = Math.acos(2 * Math.random() - 1);
//     return v3_rotateZ(v3_rotateY(v3_unit(),b),a);
// }

export function v3_random() {
    const u = Math.random();
    const v = Math.random();
    const root = 2 * Math.sqrt(u - u * u);
    const angle = TAU * v;
    return [root * Math.cos(angle), root * Math.sin(angle), 1-2*u];
}

export function v3_magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function v3_sqrMag(v) { // Squared magnitude
    return (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function v3_normalize(v) {
    const m = 1/v3_magnitude(v);
    return [v[0]*m, v[1]*m, v[2]*m];
}

export function v3_inverse(v) {
    return [1/v[0], 1/v[1], 1/v[2]];
}

export function v3_abs(v) {
    return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}

export function v3_ceil(v) {
    return [Math.ceil(v[0]), Math.ceil(v[1]), Math.ceil(v[2])];
}

export function v3_floor(v) {
    return [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])];
}

export function v3_scale(v,s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

// export function v3_opposite(v) {
//     return [v[0] * -1, v[1] * -1, v[2] * -1];
// }

export function v3_multiply(a,b) {
    return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function v3_divide(a,b) {
    return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
}

// Clockwise in radians looking along axis.
export function v3_rotateX(v,a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [v[0], cosA*v[1] - sinA*v[2], sinA*v[1] + cosA*v[2]];
}

export function v3_rotateY(v,a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [sinA*v[2] + cosA*v[0], v[1], cosA*v[2] - sinA*v[0]];
}

export function v3_rotateZ(v,a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [cosA*v[0] - sinA*v[1], sinA*v[0] + cosA*v[1], v[2]];
}

export function v3_add(a,b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function v3_sub(a,b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function v3_dot(a,b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function v3_cross(a,b) {
    const a0 = a[0], a1 = a[1], a2 = a[2];
    const b0 = b[0], b1 = b[1], b2 = b[2];
    return [
        a1 * b2 - a2 * b1,
        a2 * b0 - a0 * b2,
        a0 * b1 - a1 * b0];
}

export function v3_min(a,b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
}

export function v3_max(a,b) {
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}

// Returns manhattan disances between a and b
export function v3_manhattan(a, b) {
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
}

export function v3_angle(a,b) {
    return Math.acos(Math.min(1,(Math.max(-1, v3_dot(v3_normalize(a), v3_normalize(b))))));
}

export function v3_lerp(a,b,t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function v3_transform(v, m) {
    const x = v[0], y = v[1], z = v[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    ];
}

export function v3_rotate(v, q) {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const x = v[0], y = v[1], z = v[2];
    let uvx = qy * z - qz * y, uvy = qz * x - qx * z, uvz = qx * y - qy * x;
    let uuvx = qy * uvz - qz * uvy, uuvy = qz * uvx - qx * uvz, uuvz = qx * uvy - qy * uvx;
    let w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    return [x + uvx + uuvx, y + uvy + uuvy, z + uvz + uuvz];
}

export function v3_equals(a,b,e = 0) { // e is an epsilon
    if (e) return (e > Math.abs(a[0]-b[0]) && e > Math.abs(a[1]-b[1]) && e > Math.abs(a[2]-b[2]));
    return (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
}

export function v3_isZero(v) {
    return v[0] === 0 && v[1] === 0 && v[2] === 0;
}

export function v3_distance(a,b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
}

export function v3_distanceSqr(a,b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx*dx+dy*dy+dz*dz;
}
//--------------------------------------------------------------------------------
//-- 4 Vectors -------------------------------------------------------------------
//--------------------------------------------------------------------------------

// export function v4_zero() {
//     return [0,0,0,0];
// }

// // export function v4_unit() {
// //     return [1,0,0,0];
// // }

// export function v4_magnitude(v) {
//     return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
// }

// export function v4_sqrMag(v) { // Squared magnitude
//     return (v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
// }

// export function v4_normalize(v) {
//     const m = 1/v4_magnitude(v);
//     return [v[0]*m, v[1]*m, v[2]*m, v[3]*m];
// }

// export function v4_inverse(v) {
//     return [1/v[0], 1/v[1], 1/v[2], 1/v[3]];
// }

// export function v4_ceil(v) {
//     return [Math.ceil(v[0]), Math.v3_ceil(v[1]), Math.v3_ceil(v[2]), Math.v3_ceil(v[3])];
// }

// export function v4_floor(v) {
//     return [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2]), Math.floor(v[3])];
// }

// export function v4_scale(v,s) {
//     return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
// }

// export function v4_multiply(a,b) {
//     return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
// }

// export function v4_add(a,b) {
//     return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
// }

// export function v4_sub(a,b) {
//     return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
// }

// export function v4_dot(a,b) {
//     return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]  + a[3] * b[3];
// }

// export function v4_min(a,b) {
//     return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
// }

// export function v4_max(a,b) {
//     return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
// }

// export function v4_transform(v, m) {
//         const x = v[0], y = v[1], z = v[2], w = v[3];
//         return [
//             m[0] * x + m[4] * y + m[8] * z + m[12] * w,
//             m[1] * x + m[5] * y + m[9] * z + m[13] * w,
//             m[2] * x + m[6] * y + m[10] * z + m[14] * w,
//             m[3] * x + m[7] * y + m[11] * z + m[15] * w,
//         ];
//       }

// export function v4_equals(a,b,e = 0) { // e is an epsilon
//     if (e) return (e > Math.abs(a[0]-b[0]) && e > Math.abs(a[1]-b[1]) && e > Math.abs(a[2]-b[2]) && e > Math.abs(a[3]-b[3]));
//     return (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);
// }

//--------------------------------------------------------------------------------
//-- 2x2 Matrices ----------------------------------------------------------------
//--------------------------------------------------------------------------------

export function m2_zero() {
    return [
        0,0,
        0,0
    ];
}

export function m2_identity() {
    return [
        1,0,
        0,1
    ];
}

// Clockwise in radians
export function m2_rotation(angle) {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    return [
        cosA, -sinA,
        sinA,cosA
    ];
}

//--------------------------------------------------------------------------------
//-- 3x3 Matrices ----------------------------------------------------------------
//--------------------------------------------------------------------------------

// export function m3_zero() {
//     return [
//         0,0,0,
//         0,0,0,
//         0,0,0
//     ];
// }

// export function m3_identity() {
//     return [
//         1,0,0,
//         0,1,0,
//         0,0,1
//     ];
// }

// export function m3_transpose(m) {
//     return [
//         m[0], m[3], m[6],
//         m[1], m[4], m[7],
//         m[2], m[5], m[8]
//     ];
// }

// export function m3_invert(m) {
//     const a00 = m[0], a01 = m[1], a02 = m[2];
//     const a10 = m[3], a11 = m[4], a12 = m[5];
//     const a20 = m[6], a21 = m[7], a22 = m[8];

//     const b00 = a11 * a22 - a21 * a12;
//     const b10 = a01 * a22 - a21 * a02;
//     const b20 = a01 * a12 - a11 * a02;

//     const b01 = a10 * a22 - a20 * a12;
//     const b11 = a00 * a22 - a20 * a02;
//     const b21 = a00 * a12 - a10 * a02;

//     const b02 = a10 * a21 - a20 * a11;
//     const b12 = a00 * a21 - a20 * a01;
//     const b22 = a00 * a11 - a10 * a01;

//     // // Calculate the determinant
//     const d = a00 * b00 + a01 * -b01 + a02 * b02;

//     return [
//         b00/d, -b10/d, b20/d,
//         -b01/d, b11/d, -b21/d,
//         b02/d, -b12/d, b22/d
//     ];
// }

// export function m3_multiply(a, b) {
//     const a00 = a[0], a01 = a[1], a02 = a[2];
//     const a10 = a[3], a11 = a[4], a12 = a[5];
//     const a20 = a[6], a21 = a[7], a22 = a[8];

//     const b00 = b[0], b01 = b[1], b02 = b[2];
//     const b10 = b[3], b11 = b[4], b12 = b[5];
//     const b20 = b[6], b21 = b[7], b22 = b[8];

//     return [
//         b00 * a00 + b01 * a10 + b02 * a20,
//         b00 * a01 + b01 * a11 + b02 * a21,
//         b00 * a02 + b01 * a12 + b02 * a22,

//         b10 * a00 + b11 * a10 + b12 * a20,
//         b10 * a01 + b11 * a11 + b12 * a21,
//         b10 * a02 + b11 * a12 + b12 * a22,

//         b20 * a00 + b21 * a10 + b22 * a20,
//         b20 * a01 + b21 * a11 + b22 * a21,
//         b20 * a02 + b21 * a12 + b22 * a22
//     ];
//   }



// export function m3_normalFromMat4(out, a) {
//     let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
//     let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
//     let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
//     let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

//     let b00 = a00 * a11 - a01 * a10;
//     let b01 = a00 * a12 - a02 * a10;
//     let b02 = a00 * a13 - a03 * a10;
//     let b03 = a01 * a12 - a02 * a11;
//     let b04 = a01 * a13 - a03 * a11;
//     let b05 = a02 * a13 - a03 * a12;
//     let b06 = a20 * a31 - a21 * a30;
//     let b07 = a20 * a32 - a22 * a30;
//     let b08 = a20 * a33 - a23 * a30;
//     let b09 = a21 * a32 - a22 * a31;
//     let b10 = a21 * a33 - a23 * a31;
//     let b11 = a22 * a33 - a23 * a32;

//     // Calculate the determinant
//     let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

//     if (!det) {
//       return null;
//     }
//     det = 1.0 / det;

//     out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
//     out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
//     out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

//     out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
//     out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
//     out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

//     out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
//     out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
//     out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

//     return out;
//   }


//--------------------------------------------------------------------------------
//-- 4x4 Matrices ----------------------------------------------------------------
//--------------------------------------------------------------------------------

export function m4_zero() {
    return [
        0,0,0,0,
        0,0,0,0,
        0,0,0,0,
        0,0,0,0
    ];
}

export function m4_identity() {
    return [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ];
}

export function m4_translation(v) {
    return [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        v[0],v[1],v[2],1
    ];
}

export function m4_getTranslation(m) {
    return [m[12], m[13], m[14]];
}

// export function m4_getTranslation(m) {
//     return [m[12]/m[15], m[13]/m[15], m[14]/m[15]];
// }

// Accepts a scalar or a 3 vector
export function m4_scale(s) {
    if (s instanceof Array) {
        return [
            s[0],0,0,0,
            0,s[1],0,0,
            0,0,s[2],0,
            0,0,0,1
        ];
    }
    return [
        s,0,0,0,
        0,s,0,0,
        0,0,s,0,
        0,0,0,1
    ];
}

export function m4_getScale(m) {
    return [
        v3_magnitude([m[0], m[4], m[8]]),
        v3_magnitude([m[1], m[5], m[9]]),
        v3_magnitude([m[2], m[6], m[10]])
    ];
}

// Clockwise in radians looking along axis.
export function m4_rotation(axis, angle) {
    const n = v3_normalize(axis);
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const minusCosA = 1-cosA;
    return [
        n[0] * n[0] * minusCosA + cosA,
        n[1] * n[0] * minusCosA + n[2] * sinA,
        n[2] * n[0] * minusCosA - n[1] * sinA,
        0,

        n[0] * n[1] * minusCosA - n[2] * sinA,
        n[1] * n[1] * minusCosA + cosA,
        n[2] * n[1] * minusCosA + n[0] * sinA,
        0,

        n[0] * n[2] * minusCosA + n[1] * sinA,
        n[1] * n[2] * minusCosA - n[0] * sinA,
        n[2] * n[2] * minusCosA + cosA,
        0,

        0,
        0,
        0,
        1
    ];
}

export function m4_rotationX(a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [
        1,0,0,0,
        0,cosA,sinA,0,
        0,-sinA,cosA,0,
        0,0,0,1
    ];
}

export function m4_rotationY(a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [
        cosA,0,-sinA,0,
        0,1,0,0,
        sinA,0,cosA,0,
        0,0,0,1
    ];
}

export function m4_rotationZ(a) {
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    return [
        cosA,sinA,0,0,
        -sinA,cosA,0,0,
        0,0,1,0,
        0,0,0,1
    ];
}

// Creates a rotation matrix from a quaternion
export function m4_rotationQ(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    return [
        1 - yy - zz,
        yx + wz,
        zx - wy,
        0,

        yx - wz,
        1 - xx - zz,
        zy + wx,
        0,

        zx + wy,
        zy - wx,
        1 - xx - yy,
        0,

        0,
        0,
        0,
        1
    ];
}

// Extracts the rotation component and returns it as a quaternion
// ignores scale, result is normalized

export function m4_getRotation(m) {
    const s0 = v3_magnitude([m[0], m[4], m[8]]);
    const s1 = v3_magnitude([m[1], m[5], m[9]]);
    const s2 = v3_magnitude([m[2], m[6], m[10]]);

    const m00 = m[0] / s0;
    const m01 = m[1] / s1;
    const m02 = m[2] / s2;

    const m10 = m[4] / s0;
    const m11 = m[5] / s1;
    const m12 = m[6] / s2;

    const m20 = m[8] / s0;
    const m21 = m[9] / s1;
    const m22 = m[10] / s2;

    let t;
    let x;
    let y;
    let z;
    let w;

    if (m22 < 0) {
        if (m00 > m11) {
            t = 1 + m00 - m11 - m22;
            x = t;
            y = m01+m10;
            z = m20+m02;
            w = m12-m21;
        } else {
            t = 1 - m00 + m11 - m22;
            x = m01+m10;
            y = t;
            z = m12+m21;
            w = m20-m02;
        }
    } else {
        if (m00 < -m11) {
            t = 1 - m00 - m11 + m22;
            x = m20+m02;
            y = m12+m21;
            z = t;
            w = m01-m10;
        } else {
            t = 1 + m00 + m11 + m22;
            x = m12-m21;
            y = m20-m02;
            z = m01-m10;
            w = t;
        }
    }

    const f = 0.5 / Math.sqrt(t);
    return [f*x, f*y, f*z, f*w];

}

// export function m4_getRotation(m) {
//     const trace = m[0] + m[5] + m[10];
//     let s = 0;
//     const q = [0,0,0,0];

//     if (trace > 0) {
//       s = Math.sqrt(trace + 1.0) * 2;
//       q[3] = 0.25 * s;
//       q[0] = (m[6] - m[9]) / s;
//       q[1] = (m[8] - m[2]) / s;
//       q[2] = (m[1] - m[4]) / s;
//     } else if ((m[0] > m[5]) && (m[0] > m[10])) {
//       s = Math.sqrt(1.0 + m[0] - m[5] - m[10]) * 2;
//       q[3] = (m[6] - m[9]) / s;
//       q[0] = 0.25 * s;
//       q[1] = (m[1] + m[4]) / s;
//       q[2] = (m[8] + m[2]) / s;
//     } else if (m[5] > m[10]) {
//       s = Math.sqrt(1.0 + m[5] - m[0] - m[10]) * 2;
//       q[3] = (m[8] - m[2]) / s;
//       q[0] = (m[1] + m[4]) / s;
//       q[1] = 0.25 * s;
//       q[2] = (m[6] + m[9]) / s;
//     } else {
//       s = Math.sqrt(1.0 + m[10] - m[0] - m[5]) * 2;
//       q[3] = (m[1] - m[4]) / s;
//       q[0] = (m[8] + m[2]) / s;
//       q[1] = (m[6] + m[9]) / s;
//       q[2] = 0.25 * s;
//     }

//     return q;
//   }

// Applied in that order. Scale can be either a 3-vector or a scaler. Rotation is a quaternion.
export function m4_scaleRotationTranslation(s, q, v) {

  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  let sx = 1, sy = 1, sz = 1;
  if (s instanceof Array) {
    sx = s[0]; sy = s[1]; sz = s[2];
  } else {
    sx = s; sy = s; sz = s;
  }
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,

    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,

    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,

    v[0],
    v[1],
    v[2],
    1
  ];


}

export function m4_getScaleRotationTranslation(m) {
    const s0 = v3_magnitude([m[0], m[4], m[8]]);
    const s1 = v3_magnitude([m[1], m[5], m[9]]);
    const s2 = v3_magnitude([m[2], m[6], m[10]]);

    const m00 = m[0] / s0;
    const m01 = m[1] / s1;
    const m02 = m[2] / s2;

    const m10 = m[4] / s0;
    const m11 = m[5] / s1;
    const m12 = m[6] / s2;

    const m20 = m[8] / s0;
    const m21 = m[9] / s1;
    const m22 = m[10] / s2;

    let t;
    let x;
    let y;
    let z;
    let w;

    if (m22 < 0) {
        if (m00 > m11) {
            t = 1 + m00 - m11 - m22;
            x = t;
            y = m01+m10;
            z = m20+m02;
            w = m12-m21;
        } else {
            t = 1 - m00 + m11 - m22;
            x = m01+m10;
            y = t;
            z = m12+m21;
            w = m20-m02;
        }
    } else {
        if (m00 < -m11) {
            t = 1 - m00 - m11 + m22;
            x = m20+m02;
            y = m12+m21;
            z = t;
            w = m01-m10;
        } else {
            t = 1 + m00 + m11 + m22;
            x = m12-m21;
            y = m20-m02;
            z = m01-m10;
            w = t;
        }
    }

    const f = 0.5 / Math.sqrt(t);
    return [[s0, s1, s2], [f*x, f*y, f*z, f*w], [m[12], m[13], m[14]]];
}

// FOV is vertical field of view in radians
export function m4_perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ];

  }

export function m4_transpose(m) {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    ];
}

export function m4_determinant(m) {

    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

export function m4_invert(m) {

    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    const d =  b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    return [
        (a11 * b11 - a12 * b10 + a13 * b09) / d,
        (a02 * b10 - a01 * b11 - a03 * b09) / d,
        (a31 * b05 - a32 * b04 + a33 * b03) / d,
        (a22 * b04 - a21 * b05 - a23 * b03) / d,

        (a12 * b08 - a10 * b11 - a13 * b07) / d,
        (a00 * b11 - a02 * b08 + a03 * b07) / d,
        (a32 * b02 - a30 * b05 - a33 * b01) / d,
        (a20 * b05 - a22 * b02 + a23 * b01) / d,

        (a10 * b10 - a11 * b08 + a13 * b06) / d,
        (a01 * b08 - a00 * b10 - a03 * b06) / d,
        (a30 * b04 - a31 * b02 + a33 * b00) / d,
        (a21 * b02 - a20 * b04 - a23 * b00) / d,

        (a11 * b07 - a10 * b09 - a12 * b06) / d,
        (a00 * b09 - a01 * b07 + a02 * b06) / d,
        (a31 * b01 - a30 * b03 - a32 * b00) / d,
        (a20 * b03 - a21 * b01 + a22 * b00) / d
    ];
}

// A is applied before b
export function m4_multiply(a,b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    // Cache only the current line of the second matrix

    return [
        a00*b00 + a01*b10 + a02*b20 + a03*b30,
        a00*b01 + a01*b11 + a02*b21 + a03*b31,
        a00*b02 + a01*b12 + a02*b22 + a03*b32,
        a00*b03 + a01*b13 + a02*b23 + a03*b33,

        a10*b00 + a11*b10 + a12*b20 + a13*b30,
        a10*b01 + a11*b11 + a12*b21 + a13*b31,
        a10*b02 + a11*b12 + a12*b22 + a13*b32,
        a10*b03 + a11*b13 + a12*b23 + a13*b33,

        a20*b00 + a21*b10 + a22*b20 + a23*b30,
        a20*b01 + a21*b11 + a22*b21 + a23*b31,
        a20*b02 + a21*b12 + a22*b22 + a23*b32,
        a20*b03 + a21*b13 + a22*b23 + a23*b33,

        a30*b00 + a31*b10 + a32*b20 + a33*b30,
        a30*b01 + a31*b11 + a32*b21 + a33*b31,
        a30*b02 + a31*b12 + a32*b22 + a33*b32,
        a30*b03 + a31*b13 + a32*b23 + a33*b33,

    ];
}

// Extracts the scaling/rotation components and performs an inverse/transpose operation to generate a 4x4 normal transform matrix.
export function m4_toNormal4(m) {
    let q = m4_getRotation(m);
    return m4_rotationQ(q);

    /*
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const b00 = a11 * a22 - a21 * a12;
    const b10 = a01 * a22 - a21 * a02;
    const b20 = a01 * a12 - a11 * a02;

    const b01 = a10 * a22 - a20 * a12;
    const b11 = a00 * a22 - a20 * a02;
    const b21 = a00 * a12 - a10 * a02;

    const b02 = a10 * a21 - a20 * a11;
    const b12 = a00 * a21 - a20 * a01;
    const b22 = a00 * a11 - a10 * a01;

    // // Calculate the determinant
    const d = a00 * b00 + a01 * -b01 + a02 * b02;

    return [
        b00/d, -b01/d, b02/d, 0,
        -b10/d, b11/d, -b12/d, 0,
        b20/d, -b21/d, b22/d, 0,
        0, 0, 0, 1
    ];
    */
}

// Extracts the scaling/rotation components and performs an inverse/transpose operation to generate a 3x3 normal transform matrix.
// export function m4_toNormal3(m) {
//     const a00 = m[0], a01 = m[1], a02 = m[2];
//     const a10 = m[4], a11 = m[5], a12 = m[6];
//     const a20 = m[8], a21 = m[9], a22 = m[10];

//     const b00 = a11 * a22 - a21 * a12;
//     const b10 = a01 * a22 - a21 * a02;
//     const b20 = a01 * a12 - a11 * a02;

//     const b01 = a10 * a22 - a20 * a12;
//     const b11 = a00 * a22 - a20 * a02;
//     const b21 = a00 * a12 - a10 * a02;

//     const b02 = a10 * a21 - a20 * a11;
//     const b12 = a00 * a21 - a20 * a01;
//     const b22 = a00 * a11 - a10 * a01;

//     // // Calculate the determinant
//     const d = a00 * b00 + a01 * -b01 + a02 * b02;

//     return [
//         b00/d, -b01/d, b02/d,
//         -b10/d, b11/d, -b12/d,
//         b20/d, -b21/d, b22/d
//     ];
// }

// generate ground plane matrix - no rotation out of the x/z plane
// export function m4_grounded(m) {
//     const g = [0,1,0] // the up vector
//     var x = [m[0], m[1], m[2]];
//     var z = v3_cross(x, g);
//     z[1] = 0;
//     z = v3_normalize(z);
//     x = v3_cross(g, z);
//     x[1] = 0;
//     x = v3_normalize(x)
//     return [x[0], x[1], x[2], 0,
//             0, 1, 0, 0,
//             z[0], z[1], z[2],0,
//             0, 0, 0, 1];

// }

// // this is faster if we can assume that x and z projections in y-plane are perpendicular
// export function m4_fastGrounded(m) {
//     var x = v3_normalize([m[0], 0, m[2]]);
//     var z = v3_normalize([m[8], 0, m[10]]);
//     return [x[0], x[1], x[2], 0,
//             0, 1, 0, 0,
//             z[0], z[1], z[2], 0,
//             0, 0, 0, 1];
// }
//--------------------------------------------------------------------------------
//-- Quaternions -----------------------------------------------------------------
//--------------------------------------------------------------------------------

export function q_identity() {
    return [0,0,0,1];
}

export function q_magnitude(q) {
    return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

export function q_normalize(q) {
    const m = 1/q_magnitude(q);
    return [q[0]*m, q[1]*m, q[2]*m, q[3]*m];
}

// If the quaternion is normalized, this is also its inverse.
export function q_conjugate(q) {
    return [-q[0], -q[1], -q[2], q[3]];
}

export function q_invert(q) { return q_conjugate(q) }

// Clockwise in radians looking along axis.
// Axis should be normalized
export function q_axisAngle(axis, angle) {
    const half = angle * 0.5;
    const sinH = Math.sin(half);
    const cosH = Math.cos(half);
    return [sinH * axis[0], sinH * axis[1], sinH * axis[2], cosH];
}

export function q_toAxisAngle(quat) {
    let q = q_normalize(quat);
    let angle = 2 * Math.acos(q[3]);
    let axis;
    let s = Math.sqrt( 1 - q[3] * q[3]);
    // assuming quaternion normalised then w is less than 1, so term always positive.
    if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
        // if s is close to zero then direction of axis not important
        axis = [0, 1, 0];
    } else {
        axis = [q[0] / s, q[1] / s, q[2] / s]; // normalize vector
    }
    return {axis, angle};
}

// Given a forward vector and an up vector, generates the quaternion that will rotate
// the forward vector to look at the target.
export function q_lookAt(f, u, t) {
    const epsilon = 0.00001;
    const dot = v3_dot(f,t);
    if (Math.abs(dot+1) < epsilon) return q_axisAngle(u, Math.PI);
    if (Math.abs(dot-1) < epsilon) return q_identity();
    const angle = Math.acos(dot);
    const axis = v3_normalize(v3_cross(f,t));
    return q_axisAngle(axis, angle);
}

// Creates a quaternion from the given Euler angles.
export function q_euler(x, y ,z) {
    x *= 0.5;
    y *= 0.5;
    z *= 0.5;
    const sinX = Math.sin(x);
    const cosX = Math.cos(x);
    const sinY = Math.sin(y);
    const cosY = Math.cos(y);
    const sinZ = Math.sin(z);
    const cosZ = Math.cos(z);

    return [
        sinX * cosY * cosZ - cosX * sinY * sinZ,
        cosX * sinY * cosZ + sinX * cosY * sinZ,
        cosX * cosY * sinZ - sinX * sinY * cosZ,
        cosX * cosY * cosZ + sinX * sinY * sinZ
    ];

}

export function q_eulerYXZ(x, y, z){
    const cos = Math.cos;
    const sin = Math.sin;

    const c1 = cos( x / 2 );
    const c2 = cos( y / 2 );
    const c3 = cos( z / 2 );

    const s1 = sin( x / 2 );
    const s2 = sin( y / 2 );
    const s3 = sin( z / 2 );

    return [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3,
    ];
}

// Returns the equivalent Euler angle around the x axis
export function q_pitch(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    return Math.atan2(2*x*w - 2*y*z, 1 - 2*x*x - 2*z*z);
}

// Returns the equivalent Euler angle around the y axis
export function q_yaw(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    return Math.atan2(2*y*w - 2*x*z, 1 - 2*y*y - 2*z*z);
}

// Returns the equivalent Euler angle around the z axis
export function q_roll(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    return Math.asin(2*x*y + 2*z*w);
}

// export function q_scale(q,s) {
//     return [q[0] * s, q[1] * s, q[2] * s, q[3] * s, q[4] * s];
// }

// export function q_add(a,b) {
//     return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
// }

export function q_dot(a,b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]  + a[3] * b[3];
}

// A is applied before b
export function q_multiply(a, b) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    return [
        bx * aw + by * az - bz * ay + bw * ax,
        by * aw - bx * az + bw * ay + bz * ax,
        bz * aw + bw * az + bx * ay - by * ax,
        bw * aw - bz * az - by * ay - bx * ax
    ];
}

export function q_slerp(a,b,t) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];

    let omega, cosom, sinom, scale0, scale1;

    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }

    if ( (1.0 - cosom) > 0.00001 ) {
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1.0 - t;
        scale1 = t;
    }

    const c0 = scale0 * ax + scale1 * bx;
    const c1 = scale0 * ay + scale1 * by;
    const c2 = scale0 * az + scale1 * bz;
    const c3 = scale0 * aw + scale1 * bw;

    return [c0,c1,c2,c3];
}

export function q_equals(a,b,e = 0) { // e is an epsilon
    if (e) return Math.abs(q_dot(a,b)) + e >= 1;
    return (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);
}

export function q_isZero(q) {
    return q[0] === 0 && q[1] === 0 && q[2] === 0;
}




//--------------------------------------------------------------------------------
//-- Dual Quaternions ------------------------------------------------------------
//--------------------------------------------------------------------------------

// export function q2_identity() {
//     return [0,0,0,1,0,0,0,0];
// }

// export function q2_magnitude(q) {
//     return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
// }

// export function q2_rotation(q) {
//     return [...q,0,0,0,0];
// }

// export function q2_translation(t) {
//     return [0,0,0,1,...v3_scale(t,0.5),0];
// }

// export function q2_axisAngle(axis, angle) {
//     return q2_rotation(q_axisAngle(axis,angle));
// }

// export function q2_rotationTranslation(q,t) {
//     const ax = t[0] * 0.5, ay = t[1] * 0.5, az = t[2] * 0.5;
//     const bx = q[0], by = q[1], bz = q[2], bw = q[3];
//     return [bx,by,bz,bw, ax*bw+ay*bz-az*by, ay*bw+az*bx-ax*bz, az*bw+ax*by-ay*bx, -ax*bx-ay*by-az*bz];
// }

// export function q2_axisAngleTranslation(axis, angle, t) {
//     return q2_rotationTranslation(q_axisAngle(axis,angle), t);
// }

// export function q2_normalize(q2) {
//     const m = 1/q2_magnitude(q2);
//     const a0 = q2[0] * m, a1 = q2[1] * m, a2 = q2[2] * m, a3 = q2[3] * m;
//     const b0 = q2[4],  b1 = q2[5], b2 = q2[6], b3 = q2[7];
//     const dot = (a0 * b0) + (a1 * b1) + (a2 * b2) + (a3 * b3);
//     return [a0, a1, a2, a3, (b0-(a0*dot))*m, (b1-(a1*dot))*m, (b2-(a2*dot))*m, (b3-(a3*dot))*m];

// }


// export function q2_multiply(a, b) {
//     const ax0 = a[0], ay0 = a[1], az0 = a[2], aw0 = a[3];
//     const ax1 = a[4], ay1 = a[5], az1 = a[6], aw1 = a[7];
//     const bx0 = b[0], by0 = b[1], bz0 = b[2], bw0 = b[3];
//     const bx1 = b[4], by1 = b[5], bz1 = b[6], bw1 = b[7];
//     return [
//         bx0 * aw0 + bw0 * ax0 + by0 * az0 - bz0 * ay0,
//         by0 * aw0 + bw0 * ay0 + bz0 * ax0 - bx0 * az0,
//         bz0 * aw0 + bw0 * az0 + bx0 * ay0 - by0 * ax0,
//         bw0 * aw0 - bx0 * ax0 - by0 * ay0 - bz0 * az0,

//         bx0 * aw1 + bw0 * ax1 + by0 * az1 - bz0 * ay1 + bx1 * aw0 + bw1 * ax0 + by1 * az0 - bz1 * ay0,
//         by0 * aw1 + bw0 * ay1 + bz0 * ax1 - bx0 * az1 + by1 * aw0 + bw1 * ay0 + bz1 * ax0 - bx1 * az0,
//         bz0 * aw1 + bw0 * az1 + bx0 * ay1 - by0 * ax1 + bz1 * aw0 + bw1 * az0 + bx1 * ay0 - by1 * ax0,
//         bw0 * aw1 - bx0 * ax1 - by0 * ay1 - bz0 * az1 + bw1 * aw0 - bx1 * ax0 - by1 * ay0 - bz1 * az0
//     ];
//   }
