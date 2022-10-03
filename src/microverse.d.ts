
type Quat = [number, number, number, number];
type Vec3 = [number, number, number];
type WorldcoreKernel = {
    v3_rotate(v: Vec3, q: Quat): Vec3,
    q_axisAngle(axis: Vec3, a: number): Quat,
    /** a is applied before b */
    q_multiply(q1: Quat, q2: Quat): Quat;
}
type THREE = typeof import("three");
type MicroverseModule = {THREE: THREE} & WorldcoreKernel;

declare var Microverse: MicroverseModule;