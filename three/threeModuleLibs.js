import { Pass, FullScreenQuad } from "./postprocessing/Pass.js";
import { CopyShader } from "./shaders/CopyShader.js";
import { OBJLoader } from "./loaders/OBJLoader.js";
import { MTLLoader } from "./loaders/MTLLoader.js";
import { GLTFLoader } from "./loaders/GLTFLoader.js";
import { FBXLoader } from "./loaders/FBXLoader.js";
import { DRACOLoader } from "./loaders/DRACOLoader.js";
import { SVGLoader } from "./loaders/SVGLoader.js";
import { EXRLoader } from "./loaders/EXRLoader.js";
import { CSM } from"./csm/CSM.js";
import {
    computeTangents,
    mergeBufferGeometries,
    mergeBufferAttributes,
    interleaveAttributes,
    estimateBytesUsed,
    mergeVertices,
    toTrianglesDrawMode,
    computeMorphedAttributes
} from "./utils/BufferGeometryUtils.js";

export function setThreeLibs(THREE) {
    THREE.Pass = Pass;
    THREE.FullScreenQuad = FullScreenQuad;
    THREE.CopyShader = CopyShader;
    THREE.OBJLoader = OBJLoader;
    THREE.MTLLoader = MTLLoader;
    THREE.GLTFLoader = GLTFLoader;
    THREE.FBXLoader = FBXLoader;
    THREE.DRACOLoader = DRACOLoader;
    THREE.SVGLoader = SVGLoader;
    THREE.EXRLoader = EXRLoader;
    THREE.CSM = CSM;
    THREE.BufferGeometryUtils = {};
    THREE.BufferGeometryUtils.computeMorphedAttributes = computeMorphedAttributes;
    THREE.BufferGeometryUtils.computeTangents = computeTangents;
    THREE.BufferGeometryUtils.estimateBytesUsed = estimateBytesUsed;
    THREE.BufferGeometryUtils.interleaveAttributes = interleaveAttributes;
    THREE.BufferGeometryUtils.mergeBufferAttributes = mergeBufferAttributes;
    THREE.BufferGeometryUtils.mergeBufferGeometries = mergeBufferGeometries;
    THREE.BufferGeometryUtils.mergeVertices = mergeVertices;
    THREE.BufferGeometryUtils.toTrianglesDrawMode = toTrianglesDrawMode;
}
