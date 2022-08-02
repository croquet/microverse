const { ThreeRenderManager, THREE_MESH_BVH } = require("../src/ThreeRender.js");

( function () {

	class Pass {

		constructor() {

			// if set to true, the pass is processed by the composer
			this.enabled = true; // if set to true, the pass indicates to swap read and write buffer after rendering

			this.needsSwap = true; // if set to true, the pass clears its buffer before rendering

			this.clear = false; // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.

			this.renderToScreen = false;

		}

		setSize() {}

		render() {

			console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

		}

	} // Helper for passes that need to fill the viewport with a single quad.


	const _camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 ); // https://github.com/mrdoob/three.js/pull/21358


	const _geometry = new THREE.BufferGeometry();

	_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );

	_geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );

	class FullScreenQuad {

		constructor( material ) {

			this._mesh = new THREE.Mesh( _geometry, material );

		}

		dispose() {

			this._mesh.geometry.dispose();

		}

		render( renderer ) {

			renderer.render( this._mesh, _camera );

		}

		get material() {

			return this._mesh.material;

		}

		set material( value ) {

			this._mesh.material = value;

		}

	}

	THREE.FullScreenQuad = FullScreenQuad;
	THREE.Pass = Pass;

} )();
( function () {

	/**
 * Full-screen textured quad shader
 */
	const CopyShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'opacity': {
				value: 1.0
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;

		}`
	};

	THREE.CopyShader = CopyShader;

} )();
( function () {

	const inverseProjectionMatrix = new THREE.Matrix4();

	class CSMFrustum {

		constructor( data ) {

			data = data || {};
			this.vertices = {
				near: [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ],
				far: [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ]
			};

			if ( data.projectionMatrix !== undefined ) {

				this.setFromProjectionMatrix( data.projectionMatrix, data.maxFar || 10000 );

			}

		}

		setFromProjectionMatrix( projectionMatrix, maxFar ) {

			const isOrthographic = projectionMatrix.elements[ 2 * 4 + 3 ] === 0;
			inverseProjectionMatrix.copy( projectionMatrix ).invert(); // 3 --- 0  vertices.near/far order
			// |     |
			// 2 --- 1
			// clip space spans from [-1, 1]

			this.vertices.near[ 0 ].set( 1, 1, - 1 );
			this.vertices.near[ 1 ].set( 1, - 1, - 1 );
			this.vertices.near[ 2 ].set( - 1, - 1, - 1 );
			this.vertices.near[ 3 ].set( - 1, 1, - 1 );
			this.vertices.near.forEach( function ( v ) {

				v.applyMatrix4( inverseProjectionMatrix );

			} );
			this.vertices.far[ 0 ].set( 1, 1, 1 );
			this.vertices.far[ 1 ].set( 1, - 1, 1 );
			this.vertices.far[ 2 ].set( - 1, - 1, 1 );
			this.vertices.far[ 3 ].set( - 1, 1, 1 );
			this.vertices.far.forEach( function ( v ) {

				v.applyMatrix4( inverseProjectionMatrix );
				const absZ = Math.abs( v.z );

				if ( isOrthographic ) {

					v.z *= Math.min( maxFar / absZ, 1.0 );

				} else {

					v.multiplyScalar( Math.min( maxFar / absZ, 1.0 ) );

				}

			} );
			return this.vertices;

		}

		split( breaks, target ) {

			while ( breaks.length > target.length ) {

				target.push( new CSMFrustum() );

			}

			target.length = breaks.length;

			for ( let i = 0; i < breaks.length; i ++ ) {

				const cascade = target[ i ];

				if ( i === 0 ) {

					for ( let j = 0; j < 4; j ++ ) {

						cascade.vertices.near[ j ].copy( this.vertices.near[ j ] );

					}

				} else {

					for ( let j = 0; j < 4; j ++ ) {

						cascade.vertices.near[ j ].lerpVectors( this.vertices.near[ j ], this.vertices.far[ j ], breaks[ i - 1 ] );

					}

				}

				if ( i === breaks.length - 1 ) {

					for ( let j = 0; j < 4; j ++ ) {

						cascade.vertices.far[ j ].copy( this.vertices.far[ j ] );

					}

				} else {

					for ( let j = 0; j < 4; j ++ ) {

						cascade.vertices.far[ j ].lerpVectors( this.vertices.near[ j ], this.vertices.far[ j ], breaks[ i ] );

					}

				}

			}

		}

		toSpace( cameraMatrix, target ) {

			for ( let i = 0; i < 4; i ++ ) {

				target.vertices.near[ i ].copy( this.vertices.near[ i ] ).applyMatrix4( cameraMatrix );
				target.vertices.far[ i ].copy( this.vertices.far[ i ] ).applyMatrix4( cameraMatrix );

			}

		}

	}

	THREE.CSMFrustum = CSMFrustum;

} )();
( function () {

	const CSMShader = {
		lights_fragment_begin:
  /* glsl */
  `
GeometricContext geometry;

geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

#ifdef CLEARCOAT

	geometry.clearcoatNormal = clearcoatNormal;

#endif

IncidentLight directLight;

#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

		pointLight = pointLights[ i ];

		getPointLightInfo( pointLight, geometry, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif

		RE_Direct( directLight, geometry, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

	SpotLight spotLight;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

		spotLight = spotLights[ i ];

		getSpotLightInfo( spotLight, geometry, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif

		RE_Direct( directLight, geometry, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_DIR_LIGHTS > 0) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )

	DirectionalLight directionalLight;
	float linearDepth = (vViewPosition.z) / (shadowFar - cameraNear);
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#if defined( USE_SHADOWMAP ) && defined( CSM_FADE )
	vec2 cascade;
	float cascadeCenter;
	float closestEdge;
	float margin;
	float csmx;
	float csmy;

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );

		// NOTE: Depth gets larger away from the camera.
		// cascade.x is closer, cascade.y is further
		cascade = CSM_cascades[ i ];
		cascadeCenter = ( cascade.x + cascade.y ) / 2.0;
		closestEdge = linearDepth < cascadeCenter ? cascade.x : cascade.y;
		margin = 0.25 * pow( closestEdge, 2.0 );
		csmx = cascade.x - margin / 2.0;
		csmy = cascade.y + margin / 2.0;
		if( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS && linearDepth >= csmx && ( linearDepth < csmy || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 ) ) {

			float dist = min( linearDepth - csmx, csmy - linearDepth );
			float ratio = clamp( dist / margin, 0.0, 1.0 );
			if( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS ) {

				vec3 prevColor = directLight.color;
				directionalLightShadow = directionalLightShadows[ i ];
				directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

				bool shouldFadeLastCascade = UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth > cascadeCenter;
				directLight.color = mix( prevColor, directLight.color, shouldFadeLastCascade ? ratio : 1.0 );

			}

			ReflectedLight prevLight = reflectedLight;
			RE_Direct( directLight, geometry, material, reflectedLight );

			bool shouldBlend = UNROLLED_LOOP_INDEX != CSM_CASCADES - 1 || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth < cascadeCenter;
			float blendRatio = shouldBlend ? ratio : 1.0;

			reflectedLight.directDiffuse = mix( prevLight.directDiffuse, reflectedLight.directDiffuse, blendRatio );
			reflectedLight.directSpecular = mix( prevLight.directSpecular, reflectedLight.directSpecular, blendRatio );
			reflectedLight.indirectDiffuse = mix( prevLight.indirectDiffuse, reflectedLight.indirectDiffuse, blendRatio );
			reflectedLight.indirectSpecular = mix( prevLight.indirectSpecular, reflectedLight.indirectSpecular, blendRatio );

		}

	}
	#pragma unroll_loop_end
	#else

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )

		directionalLightShadow = directionalLightShadows[ i ];
		if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y) directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

		#endif

		if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && (linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1)) RE_Direct( directLight, geometry, material, reflectedLight );

	}
	#pragma unroll_loop_end

	#endif

#endif


#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && !defined( USE_CSM ) && !defined( CSM_CASCADES )

	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		directionalLight = directionalLights[ i ];

		getDirectionalLightInfo( directionalLight, geometry, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif

		RE_Direct( directLight, geometry, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

	RectAreaLight rectAreaLight;

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if defined( RE_IndirectDiffuse )

	vec3 iblIrradiance = vec3( 0.0 );

	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

	irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );

	#if ( NUM_HEMI_LIGHTS > 0 )

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );

		}
		#pragma unroll_loop_end

	#endif

#endif

#if defined( RE_IndirectSpecular )

	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );

#endif
`,
		lights_pars_begin:
  /* glsl */
  `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif
	` + THREE.ShaderChunk.lights_pars_begin
	};

	THREE.CSMShader = CSMShader;

} )();
( function () {

	const _object_pattern = /^[og]\s*(.+)?/; // mtllib file_reference

	const _material_library_pattern = /^mtllib /; // usemtl material_name

	const _material_use_pattern = /^usemtl /; // usemap map_name

	const _map_use_pattern = /^usemap /;

	const _vA = new THREE.Vector3();

	const _vB = new THREE.Vector3();

	const _vC = new THREE.Vector3();

	const _ab = new THREE.Vector3();

	const _cb = new THREE.Vector3();

	const _color = new THREE.Color();

	function ParserState() {

		const state = {
			objects: [],
			object: {},
			vertices: [],
			normals: [],
			colors: [],
			uvs: [],
			materials: {},
			materialLibraries: [],
			startObject: function ( name, fromDeclaration ) {

				// If the current object (initial from reset) is not from a g/o declaration in the parsed
				// file. We need to use it for the first parsed g/o to keep things in sync.
				if ( this.object && this.object.fromDeclaration === false ) {

					this.object.name = name;
					this.object.fromDeclaration = fromDeclaration !== false;
					return;

				}

				const previousMaterial = this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined;

				if ( this.object && typeof this.object._finalize === 'function' ) {

					this.object._finalize( true );

				}

				this.object = {
					name: name || '',
					fromDeclaration: fromDeclaration !== false,
					geometry: {
						vertices: [],
						normals: [],
						colors: [],
						uvs: [],
						hasUVIndices: false
					},
					materials: [],
					smooth: true,
					startMaterial: function ( name, libraries ) {

						const previous = this._finalize( false ); // New usemtl declaration overwrites an inherited material, except if faces were declared
						// after the material, then it must be preserved for proper MultiMaterial continuation.


						if ( previous && ( previous.inherited || previous.groupCount <= 0 ) ) {

							this.materials.splice( previous.index, 1 );

						}

						const material = {
							index: this.materials.length,
							name: name || '',
							mtllib: Array.isArray( libraries ) && libraries.length > 0 ? libraries[ libraries.length - 1 ] : '',
							smooth: previous !== undefined ? previous.smooth : this.smooth,
							groupStart: previous !== undefined ? previous.groupEnd : 0,
							groupEnd: - 1,
							groupCount: - 1,
							inherited: false,
							clone: function ( index ) {

								const cloned = {
									index: typeof index === 'number' ? index : this.index,
									name: this.name,
									mtllib: this.mtllib,
									smooth: this.smooth,
									groupStart: 0,
									groupEnd: - 1,
									groupCount: - 1,
									inherited: false
								};
								cloned.clone = this.clone.bind( cloned );
								return cloned;

							}
						};
						this.materials.push( material );
						return material;

					},
					currentMaterial: function () {

						if ( this.materials.length > 0 ) {

							return this.materials[ this.materials.length - 1 ];

						}

						return undefined;

					},
					_finalize: function ( end ) {

						const lastMultiMaterial = this.currentMaterial();

						if ( lastMultiMaterial && lastMultiMaterial.groupEnd === - 1 ) {

							lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
							lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
							lastMultiMaterial.inherited = false;

						} // Ignore objects tail materials if no face declarations followed them before a new o/g started.


						if ( end && this.materials.length > 1 ) {

							for ( let mi = this.materials.length - 1; mi >= 0; mi -- ) {

								if ( this.materials[ mi ].groupCount <= 0 ) {

									this.materials.splice( mi, 1 );

								}

							}

						} // Guarantee at least one empty material, this makes the creation later more straight forward.


						if ( end && this.materials.length === 0 ) {

							this.materials.push( {
								name: '',
								smooth: this.smooth
							} );

						}

						return lastMultiMaterial;

					}
				}; // Inherit previous objects material.
				// Spec tells us that a declared material must be set to all objects until a new material is declared.
				// If a usemtl declaration is encountered while this new object is being parsed, it will
				// overwrite the inherited material. Exception being that there was already face declarations
				// to the inherited material, then it will be preserved for proper MultiMaterial continuation.

				if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function' ) {

					const declared = previousMaterial.clone( 0 );
					declared.inherited = true;
					this.object.materials.push( declared );

				}

				this.objects.push( this.object );

			},
			finalize: function () {

				if ( this.object && typeof this.object._finalize === 'function' ) {

					this.object._finalize( true );

				}

			},
			parseVertexIndex: function ( value, len ) {

				const index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

			},
			parseNormalIndex: function ( value, len ) {

				const index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

			},
			parseUVIndex: function ( value, len ) {

				const index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 2 ) * 2;

			},
			addVertex: function ( a, b, c ) {

				const src = this.vertices;
				const dst = this.object.geometry.vertices;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );

			},
			addVertexPoint: function ( a ) {

				const src = this.vertices;
				const dst = this.object.geometry.vertices;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );

			},
			addVertexLine: function ( a ) {

				const src = this.vertices;
				const dst = this.object.geometry.vertices;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );

			},
			addNormal: function ( a, b, c ) {

				const src = this.normals;
				const dst = this.object.geometry.normals;
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );

			},
			addFaceNormal: function ( a, b, c ) {

				const src = this.vertices;
				const dst = this.object.geometry.normals;

				_vA.fromArray( src, a );

				_vB.fromArray( src, b );

				_vC.fromArray( src, c );

				_cb.subVectors( _vC, _vB );

				_ab.subVectors( _vA, _vB );

				_cb.cross( _ab );

				_cb.normalize();

				dst.push( _cb.x, _cb.y, _cb.z );
				dst.push( _cb.x, _cb.y, _cb.z );
				dst.push( _cb.x, _cb.y, _cb.z );

			},
			addColor: function ( a, b, c ) {

				const src = this.colors;
				const dst = this.object.geometry.colors;
				if ( src[ a ] !== undefined ) dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				if ( src[ b ] !== undefined ) dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				if ( src[ c ] !== undefined ) dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );

			},
			addUV: function ( a, b, c ) {

				const src = this.uvs;
				const dst = this.object.geometry.uvs;
				dst.push( src[ a + 0 ], src[ a + 1 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ] );

			},
			addDefaultUV: function () {

				const dst = this.object.geometry.uvs;
				dst.push( 0, 0 );
				dst.push( 0, 0 );
				dst.push( 0, 0 );

			},
			addUVLine: function ( a ) {

				const src = this.uvs;
				const dst = this.object.geometry.uvs;
				dst.push( src[ a + 0 ], src[ a + 1 ] );

			},
			addFace: function ( a, b, c, ua, ub, uc, na, nb, nc ) {

				const vLen = this.vertices.length;
				let ia = this.parseVertexIndex( a, vLen );
				let ib = this.parseVertexIndex( b, vLen );
				let ic = this.parseVertexIndex( c, vLen );
				this.addVertex( ia, ib, ic );
				this.addColor( ia, ib, ic ); // normals

				if ( na !== undefined && na !== '' ) {

					const nLen = this.normals.length;
					ia = this.parseNormalIndex( na, nLen );
					ib = this.parseNormalIndex( nb, nLen );
					ic = this.parseNormalIndex( nc, nLen );
					this.addNormal( ia, ib, ic );

				} else {

					this.addFaceNormal( ia, ib, ic );

				} // uvs


				if ( ua !== undefined && ua !== '' ) {

					const uvLen = this.uvs.length;
					ia = this.parseUVIndex( ua, uvLen );
					ib = this.parseUVIndex( ub, uvLen );
					ic = this.parseUVIndex( uc, uvLen );
					this.addUV( ia, ib, ic );
					this.object.geometry.hasUVIndices = true;

				} else {

					// add placeholder values (for inconsistent face definitions)
					this.addDefaultUV();

				}

			},
			addPointGeometry: function ( vertices ) {

				this.object.geometry.type = 'Points';
				const vLen = this.vertices.length;

				for ( let vi = 0, l = vertices.length; vi < l; vi ++ ) {

					const index = this.parseVertexIndex( vertices[ vi ], vLen );
					this.addVertexPoint( index );
					this.addColor( index );

				}

			},
			addLineGeometry: function ( vertices, uvs ) {

				this.object.geometry.type = 'Line';
				const vLen = this.vertices.length;
				const uvLen = this.uvs.length;

				for ( let vi = 0, l = vertices.length; vi < l; vi ++ ) {

					this.addVertexLine( this.parseVertexIndex( vertices[ vi ], vLen ) );

				}

				for ( let uvi = 0, l = uvs.length; uvi < l; uvi ++ ) {

					this.addUVLine( this.parseUVIndex( uvs[ uvi ], uvLen ) );

				}

			}
		};
		state.startObject( '', false );
		return state;

	} //


	class OBJLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );
			this.materials = null;

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( text ) {

				try {

					onLoad( scope.parse( text ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		setMaterials( materials ) {

			this.materials = materials;
			return this;

		}

		parse( text ) {

			const state = new ParserState();

			if ( text.indexOf( '\r\n' ) !== - 1 ) {

				// This is faster than String.split with regex that splits on both
				text = text.replace( /\r\n/g, '\n' );

			}

			if ( text.indexOf( '\\\n' ) !== - 1 ) {

				// join lines separated by a line continuation character (\)
				text = text.replace( /\\\n/g, '' );

			}

			const lines = text.split( '\n' );
			let line = '',
				lineFirstChar = '';
			let lineLength = 0;
			let result = []; // Faster to just trim left side of the line. Use if available.

			const trimLeft = typeof ''.trimLeft === 'function';

			for ( let i = 0, l = lines.length; i < l; i ++ ) {

				line = lines[ i ];
				line = trimLeft ? line.trimLeft() : line.trim();
				lineLength = line.length;
				if ( lineLength === 0 ) continue;
				lineFirstChar = line.charAt( 0 ); // @todo invoke passed in handler if any

				if ( lineFirstChar === '#' ) continue;

				if ( lineFirstChar === 'v' ) {

					const data = line.split( /\s+/ );

					switch ( data[ 0 ] ) {

						case 'v':
							state.vertices.push( parseFloat( data[ 1 ] ), parseFloat( data[ 2 ] ), parseFloat( data[ 3 ] ) );

							if ( data.length >= 7 ) {

								_color.setRGB( parseFloat( data[ 4 ] ), parseFloat( data[ 5 ] ), parseFloat( data[ 6 ] ) ).convertSRGBToLinear();

								state.colors.push( _color.r, _color.g, _color.b );

							} else {

								// if no colors are defined, add placeholders so color and vertex indices match
								state.colors.push( undefined, undefined, undefined );

							}

							break;

						case 'vn':
							state.normals.push( parseFloat( data[ 1 ] ), parseFloat( data[ 2 ] ), parseFloat( data[ 3 ] ) );
							break;

						case 'vt':
							state.uvs.push( parseFloat( data[ 1 ] ), parseFloat( data[ 2 ] ) );
							break;

					}

				} else if ( lineFirstChar === 'f' ) {

					const lineData = line.slice( 1 ).trim();
					const vertexData = lineData.split( /\s+/ );
					const faceVertices = []; // Parse the face vertex data into an easy to work with format

					for ( let j = 0, jl = vertexData.length; j < jl; j ++ ) {

						const vertex = vertexData[ j ];

						if ( vertex.length > 0 ) {

							const vertexParts = vertex.split( '/' );
							faceVertices.push( vertexParts );

						}

					} // Draw an edge between the first vertex and all subsequent vertices to form an n-gon


					const v1 = faceVertices[ 0 ];

					for ( let j = 1, jl = faceVertices.length - 1; j < jl; j ++ ) {

						const v2 = faceVertices[ j ];
						const v3 = faceVertices[ j + 1 ];
						state.addFace( v1[ 0 ], v2[ 0 ], v3[ 0 ], v1[ 1 ], v2[ 1 ], v3[ 1 ], v1[ 2 ], v2[ 2 ], v3[ 2 ] );

					}

				} else if ( lineFirstChar === 'l' ) {

					const lineParts = line.substring( 1 ).trim().split( ' ' );
					let lineVertices = [];
					const lineUVs = [];

					if ( line.indexOf( '/' ) === - 1 ) {

						lineVertices = lineParts;

					} else {

						for ( let li = 0, llen = lineParts.length; li < llen; li ++ ) {

							const parts = lineParts[ li ].split( '/' );
							if ( parts[ 0 ] !== '' ) lineVertices.push( parts[ 0 ] );
							if ( parts[ 1 ] !== '' ) lineUVs.push( parts[ 1 ] );

						}

					}

					state.addLineGeometry( lineVertices, lineUVs );

				} else if ( lineFirstChar === 'p' ) {

					const lineData = line.slice( 1 ).trim();
					const pointData = lineData.split( ' ' );
					state.addPointGeometry( pointData );

				} else if ( ( result = _object_pattern.exec( line ) ) !== null ) {

					// o object_name
					// or
					// g group_name
					// WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
					// let name = result[ 0 ].slice( 1 ).trim();
					const name = ( ' ' + result[ 0 ].slice( 1 ).trim() ).slice( 1 );
					state.startObject( name );

				} else if ( _material_use_pattern.test( line ) ) {

					// material
					state.object.startMaterial( line.substring( 7 ).trim(), state.materialLibraries );

				} else if ( _material_library_pattern.test( line ) ) {

					// mtl file
					state.materialLibraries.push( line.substring( 7 ).trim() );

				} else if ( _map_use_pattern.test( line ) ) {

					// the line is parsed but ignored since the loader assumes textures are defined MTL files
					// (according to https://www.okino.com/conv/imp_wave.htm, 'usemap' is the old-style Wavefront texture reference method)
					console.warn( 'THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.' );

				} else if ( lineFirstChar === 's' ) {

					result = line.split( ' ' ); // smooth shading
					// @todo Handle files that have varying smooth values for a set of faces inside one geometry,
					// but does not define a usemtl for each face set.
					// This should be detected and a dummy material created (later MultiMaterial and geometry groups).
					// This requires some care to not create extra material on each smooth value for "normal" obj files.
					// where explicit usemtl defines geometry groups.
					// Example asset: examples/models/obj/cerberus/Cerberus.obj

					/*
        	 * http://paulbourke.net/dataformats/obj/
        	 *
        	 * From chapter "Grouping" Syntax explanation "s group_number":
        	 * "group_number is the smoothing group number. To turn off smoothing groups, use a value of 0 or off.
        	 * Polygonal elements use group numbers to put elements in different smoothing groups. For free-form
        	 * surfaces, smoothing groups are either turned on or off; there is no difference between values greater
        	 * than 0."
        	 */

					if ( result.length > 1 ) {

						const value = result[ 1 ].trim().toLowerCase();
						state.object.smooth = value !== '0' && value !== 'off';

					} else {

						// ZBrush can produce "s" lines #11707
						state.object.smooth = true;

					}

					const material = state.object.currentMaterial();
					if ( material ) material.smooth = state.object.smooth;

				} else {

					// Handle null terminated files without exception
					if ( line === '\0' ) continue;
					console.warn( 'THREE.OBJLoader: Unexpected line: "' + line + '"' );

				}

			}

			state.finalize();
			const container = new THREE.Group();
			container.materialLibraries = [].concat( state.materialLibraries );
			const hasPrimitives = ! ( state.objects.length === 1 && state.objects[ 0 ].geometry.vertices.length === 0 );

			if ( hasPrimitives === true ) {

				for ( let i = 0, l = state.objects.length; i < l; i ++ ) {

					const object = state.objects[ i ];
					const geometry = object.geometry;
					const materials = object.materials;
					const isLine = geometry.type === 'Line';
					const isPoints = geometry.type === 'Points';
					let hasVertexColors = false; // Skip o/g line declarations that did not follow with any faces

					if ( geometry.vertices.length === 0 ) continue;
					const buffergeometry = new THREE.BufferGeometry();
					buffergeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( geometry.vertices, 3 ) );

					if ( geometry.normals.length > 0 ) {

						buffergeometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( geometry.normals, 3 ) );

					}

					if ( geometry.colors.length > 0 ) {

						hasVertexColors = true;
						buffergeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( geometry.colors, 3 ) );

					}

					if ( geometry.hasUVIndices === true ) {

						buffergeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( geometry.uvs, 2 ) );

					} // Create materials


					const createdMaterials = [];

					for ( let mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {

						const sourceMaterial = materials[ mi ];
						const materialHash = sourceMaterial.name + '_' + sourceMaterial.smooth + '_' + hasVertexColors;
						let material = state.materials[ materialHash ];

						if ( this.materials !== null ) {

							material = this.materials.create( sourceMaterial.name ); // mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.

							if ( isLine && material && ! ( material instanceof THREE.LineBasicMaterial ) ) {

								const materialLine = new THREE.LineBasicMaterial();
								THREE.Material.prototype.copy.call( materialLine, material );
								materialLine.color.copy( material.color );
								material = materialLine;

							} else if ( isPoints && material && ! ( material instanceof THREE.PointsMaterial ) ) {

								const materialPoints = new THREE.PointsMaterial( {
									size: 10,
									sizeAttenuation: false
								} );
								THREE.Material.prototype.copy.call( materialPoints, material );
								materialPoints.color.copy( material.color );
								materialPoints.map = material.map;
								material = materialPoints;

							}

						}

						if ( material === undefined ) {

							if ( isLine ) {

								material = new THREE.LineBasicMaterial();

							} else if ( isPoints ) {

								material = new THREE.PointsMaterial( {
									size: 1,
									sizeAttenuation: false
								} );

							} else {

								material = new THREE.MeshPhongMaterial();

							}

							material.name = sourceMaterial.name;
							material.flatShading = sourceMaterial.smooth ? false : true;
							material.vertexColors = hasVertexColors;
							state.materials[ materialHash ] = material;

						}

						createdMaterials.push( material );

					} // Create mesh


					let mesh;

					if ( createdMaterials.length > 1 ) {

						for ( let mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {

							const sourceMaterial = materials[ mi ];
							buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );

						}

						if ( isLine ) {

							mesh = new THREE.LineSegments( buffergeometry, createdMaterials );

						} else if ( isPoints ) {

							mesh = new THREE.Points( buffergeometry, createdMaterials );

						} else {

							mesh = new THREE.Mesh( buffergeometry, createdMaterials );

						}

					} else {

						if ( isLine ) {

							mesh = new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] );

						} else if ( isPoints ) {

							mesh = new THREE.Points( buffergeometry, createdMaterials[ 0 ] );

						} else {

							mesh = new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] );

						}

					}

					mesh.name = object.name;
					container.add( mesh );

				}

			} else {

				// if there is only the default parser state object with no geometry data, interpret data as point cloud
				if ( state.vertices.length > 0 ) {

					const material = new THREE.PointsMaterial( {
						size: 1,
						sizeAttenuation: false
					} );
					const buffergeometry = new THREE.BufferGeometry();
					buffergeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( state.vertices, 3 ) );

					if ( state.colors.length > 0 && state.colors[ 0 ] !== undefined ) {

						buffergeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( state.colors, 3 ) );
						material.vertexColors = true;

					}

					const points = new THREE.Points( buffergeometry, material );
					container.add( points );

				}

			}

			return container;

		}

	}

	THREE.OBJLoader = OBJLoader;

} )();
( function () {

	/**
 * Loads a Wavefront .mtl file specifying materials
 */

	class MTLLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );

		}
		/**
   * Loads and parses a MTL asset from a URL.
   *
   * @param {String} url - URL to the MTL file.
   * @param {Function} [onLoad] - Callback invoked with the loaded object.
   * @param {Function} [onProgress] - Callback for download progress.
   * @param {Function} [onError] - Callback for download errors.
   *
   * @see setPath setResourcePath
   *
   * @note In order for relative texture references to resolve correctly
   * you must call setResourcePath() explicitly prior to load.
   */


		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const path = this.path === '' ? THREE.LoaderUtils.extractUrlBase( url ) : this.path;
			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( text ) {

				try {

					onLoad( scope.parse( text, path ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		setMaterialOptions( value ) {

			this.materialOptions = value;
			return this;

		}
		/**
   * Parses a MTL file.
   *
   * @param {String} text - Content of MTL file
   * @return {MaterialCreator}
   *
   * @see setPath setResourcePath
   *
   * @note In order for relative texture references to resolve correctly
   * you must call setResourcePath() explicitly prior to parse.
   */


		parse( text, path ) {

			const lines = text.split( '\n' );
			let info = {};
			const delimiter_pattern = /\s+/;
			const materialsInfo = {};

			for ( let i = 0; i < lines.length; i ++ ) {

				let line = lines[ i ];
				line = line.trim();

				if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

					// Blank line or comment ignore
					continue;

				}

				const pos = line.indexOf( ' ' );
				let key = pos >= 0 ? line.substring( 0, pos ) : line;
				key = key.toLowerCase();
				let value = pos >= 0 ? line.substring( pos + 1 ) : '';
				value = value.trim();

				if ( key === 'newmtl' ) {

					// New material
					info = {
						name: value
					};
					materialsInfo[ value ] = info;

				} else {

					if ( key === 'ka' || key === 'kd' || key === 'ks' || key === 'ke' ) {

						const ss = value.split( delimiter_pattern, 3 );
						info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

					} else {

						info[ key ] = value;

					}

				}

			}

			const materialCreator = new MaterialCreator( this.resourcePath || path, this.materialOptions );
			materialCreator.setCrossOrigin( this.crossOrigin );
			materialCreator.setManager( this.manager );
			materialCreator.setMaterials( materialsInfo );
			return materialCreator;

		}

	}
	/**
 * Create a new MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */


	class MaterialCreator {

		constructor( baseUrl = '', options = {} ) {

			this.baseUrl = baseUrl;
			this.options = options;
			this.materialsInfo = {};
			this.materials = {};
			this.materialsArray = [];
			this.nameLookup = {};
			this.crossOrigin = 'anonymous';
			this.side = this.options.side !== undefined ? this.options.side : THREE.FrontSide;
			this.wrap = this.options.wrap !== undefined ? this.options.wrap : THREE.RepeatWrapping;

		}

		setCrossOrigin( value ) {

			this.crossOrigin = value;
			return this;

		}

		setManager( value ) {

			this.manager = value;

		}

		setMaterials( materialsInfo ) {

			this.materialsInfo = this.convert( materialsInfo );
			this.materials = {};
			this.materialsArray = [];
			this.nameLookup = {};

		}

		convert( materialsInfo ) {

			if ( ! this.options ) return materialsInfo;
			const converted = {};

			for ( const mn in materialsInfo ) {

				// Convert materials info into normalized form based on options
				const mat = materialsInfo[ mn ];
				const covmat = {};
				converted[ mn ] = covmat;

				for ( const prop in mat ) {

					let save = true;
					let value = mat[ prop ];
					const lprop = prop.toLowerCase();

					switch ( lprop ) {

						case 'kd':
						case 'ka':
						case 'ks':
							// Diffuse color (color under white light) using RGB values
							if ( this.options && this.options.normalizeRGB ) {

								value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

							}

							if ( this.options && this.options.ignoreZeroRGBs ) {

								if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 2 ] === 0 ) {

									// ignore
									save = false;

								}

							}

							break;

						default:
							break;

					}

					if ( save ) {

						covmat[ lprop ] = value;

					}

				}

			}

			return converted;

		}

		preload() {

			for ( const mn in this.materialsInfo ) {

				this.create( mn );

			}

		}

		getIndex( materialName ) {

			return this.nameLookup[ materialName ];

		}

		getAsArray() {

			let index = 0;

			for ( const mn in this.materialsInfo ) {

				this.materialsArray[ index ] = this.create( mn );
				this.nameLookup[ mn ] = index;
				index ++;

			}

			return this.materialsArray;

		}

		create( materialName ) {

			if ( this.materials[ materialName ] === undefined ) {

				this.createMaterial_( materialName );

			}

			return this.materials[ materialName ];

		}

		createMaterial_( materialName ) {

			// Create material
			const scope = this;
			const mat = this.materialsInfo[ materialName ];
			const params = {
				name: materialName,
				side: this.side
			};

			function resolveURL( baseUrl, url ) {

				if ( typeof url !== 'string' || url === '' ) return ''; // Absolute URL

				if ( /^https?:\/\//i.test( url ) ) return url;
				return baseUrl + url;

			}

			function setMapForType( mapType, value ) {

				if ( params[ mapType ] ) return; // Keep the first encountered texture

				const texParams = scope.getTextureParams( value, params );
				const map = scope.loadTexture( resolveURL( scope.baseUrl, texParams.url ) );
				map.repeat.copy( texParams.scale );
				map.offset.copy( texParams.offset );
				map.wrapS = scope.wrap;
				map.wrapT = scope.wrap;

				if ( mapType === 'map' || mapType === 'emissiveMap' ) {

					map.encoding = THREE.sRGBEncoding;

				}

				params[ mapType ] = map;

			}

			for ( const prop in mat ) {

				const value = mat[ prop ];
				let n;
				if ( value === '' ) continue;

				switch ( prop.toLowerCase() ) {

					// Ns is material specular exponent
					case 'kd':
						// Diffuse color (color under white light) using RGB values
						params.color = new THREE.Color().fromArray( value ).convertSRGBToLinear();
						break;

					case 'ks':
						// Specular color (color when light is reflected from shiny surface) using RGB values
						params.specular = new THREE.Color().fromArray( value ).convertSRGBToLinear();
						break;

					case 'ke':
						// Emissive using RGB values
						params.emissive = new THREE.Color().fromArray( value ).convertSRGBToLinear();
						break;

					case 'map_kd':
						// Diffuse texture map
						setMapForType( 'map', value );
						break;

					case 'map_ks':
						// Specular map
						setMapForType( 'specularMap', value );
						break;

					case 'map_ke':
						// Emissive map
						setMapForType( 'emissiveMap', value );
						break;

					case 'norm':
						setMapForType( 'normalMap', value );
						break;

					case 'map_bump':
					case 'bump':
						// Bump texture map
						setMapForType( 'bumpMap', value );
						break;

					case 'map_d':
						// Alpha map
						setMapForType( 'alphaMap', value );
						params.transparent = true;
						break;

					case 'ns':
						// The specular exponent (defines the focus of the specular highlight)
						// A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.
						params.shininess = parseFloat( value );
						break;

					case 'd':
						n = parseFloat( value );

						if ( n < 1 ) {

							params.opacity = n;
							params.transparent = true;

						}

						break;

					case 'tr':
						n = parseFloat( value );
						if ( this.options && this.options.invertTrProperty ) n = 1 - n;

						if ( n > 0 ) {

							params.opacity = 1 - n;
							params.transparent = true;

						}

						break;

					default:
						break;

				}

			}

			this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
			return this.materials[ materialName ];

		}

		getTextureParams( value, matParams ) {

			const texParams = {
				scale: new THREE.Vector2( 1, 1 ),
				offset: new THREE.Vector2( 0, 0 )
			};
			const items = value.split( /\s+/ );
			let pos;
			pos = items.indexOf( '-bm' );

			if ( pos >= 0 ) {

				matParams.bumpScale = parseFloat( items[ pos + 1 ] );
				items.splice( pos, 2 );

			}

			pos = items.indexOf( '-s' );

			if ( pos >= 0 ) {

				texParams.scale.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
				items.splice( pos, 4 ); // we expect 3 parameters here!

			}

			pos = items.indexOf( '-o' );

			if ( pos >= 0 ) {

				texParams.offset.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
				items.splice( pos, 4 ); // we expect 3 parameters here!

			}

			texParams.url = items.join( ' ' ).trim();
			return texParams;

		}

		loadTexture( url, mapping, onLoad, onProgress, onError ) {

			const manager = this.manager !== undefined ? this.manager : THREE.DefaultLoadingManager;
			let loader = manager.getHandler( url );

			if ( loader === null ) {

				loader = new THREE.TextureLoader( manager );

			}

			if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
			const texture = loader.load( url, onLoad, onProgress, onError );
			if ( mapping !== undefined ) texture.mapping = mapping;
			return texture;

		}

	}

	THREE.MTLLoader = MTLLoader;

} )();
( function () {

	class GLTFLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );
			this.dracoLoader = null;
			this.ktx2Loader = null;
			this.meshoptDecoder = null;
			this.pluginCallbacks = [];
			this.register( function ( parser ) {

				return new GLTFMaterialsClearcoatExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFTextureBasisUExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFTextureWebPExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsSheenExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsTransmissionExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsVolumeExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsIorExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsSpecularExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFLightsExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMeshoptCompression( parser );

			} );

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			let resourcePath;

			if ( this.resourcePath !== '' ) {

				resourcePath = this.resourcePath;

			} else if ( this.path !== '' ) {

				resourcePath = this.path;

			} else {

				resourcePath = THREE.LoaderUtils.extractUrlBase( url );

			} // Tells the LoadingManager to track an extra item, which resolves after
			// the model is fully loaded. This means the count of items loaded will
			// be incorrect, but ensures manager.onLoad() does not fire early.


			this.manager.itemStart( url );

			const _onError = function ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			};

			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( data ) {

				try {

					scope.parse( data, resourcePath, function ( gltf ) {

						onLoad( gltf );
						scope.manager.itemEnd( url );

					}, _onError );

				} catch ( e ) {

					_onError( e );

				}

			}, onProgress, _onError );

		}

		setDRACOLoader( dracoLoader ) {

			this.dracoLoader = dracoLoader;
			return this;

		}

		setDDSLoader() {

			throw new Error( 'THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".' );

		}

		setKTX2Loader( ktx2Loader ) {

			this.ktx2Loader = ktx2Loader;
			return this;

		}

		setMeshoptDecoder( meshoptDecoder ) {

			this.meshoptDecoder = meshoptDecoder;
			return this;

		}

		register( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) === - 1 ) {

				this.pluginCallbacks.push( callback );

			}

			return this;

		}

		unregister( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) !== - 1 ) {

				this.pluginCallbacks.splice( this.pluginCallbacks.indexOf( callback ), 1 );

			}

			return this;

		}

		parse( data, path, onLoad, onError ) {

			let content;
			const extensions = {};
			const plugins = {};

			if ( typeof data === 'string' ) {

				content = data;

			} else {

				const magic = THREE.LoaderUtils.decodeText( new Uint8Array( data, 0, 4 ) );

				if ( magic === BINARY_EXTENSION_HEADER_MAGIC ) {

					try {

						extensions[ EXTENSIONS.KHR_BINARY_GLTF ] = new GLTFBinaryExtension( data );

					} catch ( error ) {

						if ( onError ) onError( error );
						return;

					}

					content = extensions[ EXTENSIONS.KHR_BINARY_GLTF ].content;

				} else {

					content = THREE.LoaderUtils.decodeText( new Uint8Array( data ) );

				}

			}

			const json = JSON.parse( content );

			if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

				if ( onError ) onError( new Error( 'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.' ) );
				return;

			}

			const parser = new GLTFParser( json, {
				path: path || this.resourcePath || '',
				crossOrigin: this.crossOrigin,
				requestHeader: this.requestHeader,
				manager: this.manager,
				ktx2Loader: this.ktx2Loader,
				meshoptDecoder: this.meshoptDecoder
			} );
			parser.fileLoader.setRequestHeader( this.requestHeader );

			for ( let i = 0; i < this.pluginCallbacks.length; i ++ ) {

				const plugin = this.pluginCallbacks[ i ]( parser );
				plugins[ plugin.name ] = plugin; // Workaround to avoid determining as unknown extension
				// in addUnknownExtensionsToUserData().
				// Remove this workaround if we move all the existing
				// extension handlers to plugin system

				extensions[ plugin.name ] = true;

			}

			if ( json.extensionsUsed ) {

				for ( let i = 0; i < json.extensionsUsed.length; ++ i ) {

					const extensionName = json.extensionsUsed[ i ];
					const extensionsRequired = json.extensionsRequired || [];

					switch ( extensionName ) {

						case EXTENSIONS.KHR_MATERIALS_UNLIT:
							extensions[ extensionName ] = new GLTFMaterialsUnlitExtension();
							break;

						case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
							extensions[ extensionName ] = new GLTFMaterialsPbrSpecularGlossinessExtension();
							break;

						case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
							extensions[ extensionName ] = new GLTFDracoMeshCompressionExtension( json, this.dracoLoader );
							break;

						case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
							extensions[ extensionName ] = new GLTFTextureTransformExtension();
							break;

						case EXTENSIONS.KHR_MESH_QUANTIZATION:
							extensions[ extensionName ] = new GLTFMeshQuantizationExtension();
							break;

						default:
							if ( extensionsRequired.indexOf( extensionName ) >= 0 && plugins[ extensionName ] === undefined ) {

								console.warn( 'THREE.GLTFLoader: Unknown extension "' + extensionName + '".' );

							}

					}

				}

			}

			parser.setExtensions( extensions );
			parser.setPlugins( plugins );
			parser.parse( onLoad, onError );

		}

		parseAsync( data, path ) {

			const scope = this;
			return new Promise( function ( resolve, reject ) {

				scope.parse( data, path, resolve, reject );

			} );

		}

	}
	/* GLTFREGISTRY */


	function GLTFRegistry() {

		let objects = {};
		return {
			get: function ( key ) {

				return objects[ key ];

			},
			add: function ( key, object ) {

				objects[ key ] = object;

			},
			remove: function ( key ) {

				delete objects[ key ];

			},
			removeAll: function () {

				objects = {};

			}
		};

	}
	/*********************************/

	/********** EXTENSIONS ***********/

	/*********************************/


	const EXTENSIONS = {
		KHR_BINARY_GLTF: 'KHR_binary_glTF',
		KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
		KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
		KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
		KHR_MATERIALS_IOR: 'KHR_materials_ior',
		KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
		KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
		KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
		KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
		KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
		KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
		KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
		KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
		KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
		EXT_TEXTURE_WEBP: 'EXT_texture_webp',
		EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression'
	};
	/**
 * Punctual Lights Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
 */

	class GLTFLightsExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL; // THREE.Object3D instance caches

			this.cache = {
				refs: {},
				uses: {}
			};

		}

		_markDefs() {

			const parser = this.parser;
			const nodeDefs = this.parser.json.nodes || [];

			for ( let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

				const nodeDef = nodeDefs[ nodeIndex ];

				if ( nodeDef.extensions && nodeDef.extensions[ this.name ] && nodeDef.extensions[ this.name ].light !== undefined ) {

					parser._addNodeRef( this.cache, nodeDef.extensions[ this.name ].light );

				}

			}

		}

		_loadLight( lightIndex ) {

			const parser = this.parser;
			const cacheKey = 'light:' + lightIndex;
			let dependency = parser.cache.get( cacheKey );
			if ( dependency ) return dependency;
			const json = parser.json;
			const extensions = json.extensions && json.extensions[ this.name ] || {};
			const lightDefs = extensions.lights || [];
			const lightDef = lightDefs[ lightIndex ];
			let lightNode;
			const color = new THREE.Color( 0xffffff );
			if ( lightDef.color !== undefined ) color.fromArray( lightDef.color );
			const range = lightDef.range !== undefined ? lightDef.range : 0;

			switch ( lightDef.type ) {

				case 'directional':
					lightNode = new THREE.DirectionalLight( color );
					lightNode.target.position.set( 0, 0, - 1 );
					lightNode.add( lightNode.target );
					break;

				case 'point':
					lightNode = new THREE.PointLight( color );
					lightNode.distance = range;
					break;

				case 'spot':
					lightNode = new THREE.SpotLight( color );
					lightNode.distance = range; // Handle spotlight properties.

					lightDef.spot = lightDef.spot || {};
					lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
					lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
					lightNode.angle = lightDef.spot.outerConeAngle;
					lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
					lightNode.target.position.set( 0, 0, - 1 );
					lightNode.add( lightNode.target );
					break;

				default:
					throw new Error( 'THREE.GLTFLoader: Unexpected light type: ' + lightDef.type );

			} // Some lights (e.g. spot) default to a position other than the origin. Reset the position
			// here, because node-level parsing will only override position if explicitly specified.


			lightNode.position.set( 0, 0, 0 );
			lightNode.decay = 2;
			if ( lightDef.intensity !== undefined ) lightNode.intensity = lightDef.intensity;
			lightNode.name = parser.createUniqueName( lightDef.name || 'light_' + lightIndex );
			dependency = Promise.resolve( lightNode );
			parser.cache.add( cacheKey, dependency );
			return dependency;

		}

		createNodeAttachment( nodeIndex ) {

			const self = this;
			const parser = this.parser;
			const json = parser.json;
			const nodeDef = json.nodes[ nodeIndex ];
			const lightDef = nodeDef.extensions && nodeDef.extensions[ this.name ] || {};
			const lightIndex = lightDef.light;
			if ( lightIndex === undefined ) return null;
			return this._loadLight( lightIndex ).then( function ( light ) {

				return parser._getNodeRef( self.cache, lightIndex, light );

			} );

		}

	}
	/**
 * Unlit Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
 */


	class GLTFMaterialsUnlitExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;

		}

		getMaterialType() {

			return THREE.MeshBasicMaterial;

		}

		extendParams( materialParams, materialDef, parser ) {

			const pending = [];
			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;
			const metallicRoughness = materialDef.pbrMetallicRoughness;

			if ( metallicRoughness ) {

				if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

					const array = metallicRoughness.baseColorFactor;
					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( metallicRoughness.baseColorTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

				}

			}

			return Promise.all( pending );

		}

	}
	/**
 * Clearcoat Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat
 */


	class GLTFMaterialsClearcoatExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];

			if ( extension.clearcoatFactor !== undefined ) {

				materialParams.clearcoat = extension.clearcoatFactor;

			}

			if ( extension.clearcoatTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatMap', extension.clearcoatTexture ) );

			}

			if ( extension.clearcoatRoughnessFactor !== undefined ) {

				materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;

			}

			if ( extension.clearcoatRoughnessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatRoughnessMap', extension.clearcoatRoughnessTexture ) );

			}

			if ( extension.clearcoatNormalTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatNormalMap', extension.clearcoatNormalTexture ) );

				if ( extension.clearcoatNormalTexture.scale !== undefined ) {

					const scale = extension.clearcoatNormalTexture.scale;
					materialParams.clearcoatNormalScale = new THREE.Vector2( scale, scale );

				}

			}

			return Promise.all( pending );

		}

	}
	/**
 * Sheen Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_sheen
 */


	class GLTFMaterialsSheenExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_SHEEN;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			materialParams.sheenColor = new THREE.Color( 0, 0, 0 );
			materialParams.sheenRoughness = 0;
			materialParams.sheen = 1;
			const extension = materialDef.extensions[ this.name ];

			if ( extension.sheenColorFactor !== undefined ) {

				materialParams.sheenColor.fromArray( extension.sheenColorFactor );

			}

			if ( extension.sheenRoughnessFactor !== undefined ) {

				materialParams.sheenRoughness = extension.sheenRoughnessFactor;

			}

			if ( extension.sheenColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'sheenColorMap', extension.sheenColorTexture ) );

			}

			if ( extension.sheenRoughnessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'sheenRoughnessMap', extension.sheenRoughnessTexture ) );

			}

			return Promise.all( pending );

		}

	}
	/**
 * Transmission Materials Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
 * Draft: https://github.com/KhronosGroup/glTF/pull/1698
 */


	class GLTFMaterialsTransmissionExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];

			if ( extension.transmissionFactor !== undefined ) {

				materialParams.transmission = extension.transmissionFactor;

			}

			if ( extension.transmissionTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'transmissionMap', extension.transmissionTexture ) );

			}

			return Promise.all( pending );

		}

	}
	/**
 * Materials Volume Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_volume
 */


	class GLTFMaterialsVolumeExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_VOLUME;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];
			materialParams.thickness = extension.thicknessFactor !== undefined ? extension.thicknessFactor : 0;

			if ( extension.thicknessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'thicknessMap', extension.thicknessTexture ) );

			}

			materialParams.attenuationDistance = extension.attenuationDistance || 0;
			const colorArray = extension.attenuationColor || [ 1, 1, 1 ];
			materialParams.attenuationColor = new THREE.Color( colorArray[ 0 ], colorArray[ 1 ], colorArray[ 2 ] );
			return Promise.all( pending );

		}

	}
	/**
 * Materials ior Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_ior
 */


	class GLTFMaterialsIorExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_IOR;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const extension = materialDef.extensions[ this.name ];
			materialParams.ior = extension.ior !== undefined ? extension.ior : 1.5;
			return Promise.resolve();

		}

	}
	/**
 * Materials specular Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_specular
 */


	class GLTFMaterialsSpecularExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_SPECULAR;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];
			materialParams.specularIntensity = extension.specularFactor !== undefined ? extension.specularFactor : 1.0;

			if ( extension.specularTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'specularIntensityMap', extension.specularTexture ) );

			}

			const colorArray = extension.specularColorFactor || [ 1, 1, 1 ];
			materialParams.specularColor = new THREE.Color( colorArray[ 0 ], colorArray[ 1 ], colorArray[ 2 ] );

			if ( extension.specularColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'specularColorMap', extension.specularColorTexture ).then( function ( texture ) {

					texture.encoding = THREE.sRGBEncoding;

				} ) );

			}

			return Promise.all( pending );

		}

	}
	/**
 * BasisU THREE.Texture Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu
 */


	class GLTFTextureBasisUExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_TEXTURE_BASISU;

		}

		loadTexture( textureIndex ) {

			const parser = this.parser;
			const json = parser.json;
			const textureDef = json.textures[ textureIndex ];

			if ( ! textureDef.extensions || ! textureDef.extensions[ this.name ] ) {

				return null;

			}

			const extension = textureDef.extensions[ this.name ];
			const loader = parser.options.ktx2Loader;

			if ( ! loader ) {

				if ( json.extensionsRequired && json.extensionsRequired.indexOf( this.name ) >= 0 ) {

					throw new Error( 'THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures' );

				} else {

					// Assumes that the extension is optional and that a fallback texture is present
					return null;

				}

			}

			return parser.loadTextureImage( textureIndex, extension.source, loader );

		}

	}
	/**
 * WebP THREE.Texture Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp
 */


	class GLTFTextureWebPExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
			this.isSupported = null;

		}

		loadTexture( textureIndex ) {

			const name = this.name;
			const parser = this.parser;
			const json = parser.json;
			const textureDef = json.textures[ textureIndex ];

			if ( ! textureDef.extensions || ! textureDef.extensions[ name ] ) {

				return null;

			}

			const extension = textureDef.extensions[ name ];
			const source = json.images[ extension.source ];
			let loader = parser.textureLoader;

			if ( source.uri ) {

				const handler = parser.options.manager.getHandler( source.uri );
				if ( handler !== null ) loader = handler;

			}

			return this.detectSupport().then( function ( isSupported ) {

				if ( isSupported ) return parser.loadTextureImage( textureIndex, source, loader );

				if ( json.extensionsRequired && json.extensionsRequired.indexOf( name ) >= 0 ) {

					throw new Error( 'THREE.GLTFLoader: WebP required by asset but unsupported.' );

				} // Fall back to PNG or JPEG.


				return parser.loadTexture( textureIndex );

			} );

		}

		detectSupport() {

			if ( ! this.isSupported ) {

				this.isSupported = new Promise( function ( resolve ) {

					const image = new Image(); // Lossy test image. Support for lossy images doesn't guarantee support for all
					// WebP images, unfortunately.

					image.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

					image.onload = image.onerror = function () {

						resolve( image.height === 1 );

					};

				} );

			}

			return this.isSupported;

		}

	}
	/**
 * meshopt BufferView Compression Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_meshopt_compression
 */


	class GLTFMeshoptCompression {

		constructor( parser ) {

			this.name = EXTENSIONS.EXT_MESHOPT_COMPRESSION;
			this.parser = parser;

		}

		loadBufferView( index ) {

			const json = this.parser.json;
			const bufferView = json.bufferViews[ index ];

			if ( bufferView.extensions && bufferView.extensions[ this.name ] ) {

				const extensionDef = bufferView.extensions[ this.name ];
				const buffer = this.parser.getDependency( 'buffer', extensionDef.buffer );
				const decoder = this.parser.options.meshoptDecoder;

				if ( ! decoder || ! decoder.supported ) {

					if ( json.extensionsRequired && json.extensionsRequired.indexOf( this.name ) >= 0 ) {

						throw new Error( 'THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files' );

					} else {

						// Assumes that the extension is optional and that fallback buffer data is present
						return null;

					}

				}

				return Promise.all( [ buffer, decoder.ready ] ).then( function ( res ) {

					const byteOffset = extensionDef.byteOffset || 0;
					const byteLength = extensionDef.byteLength || 0;
					const count = extensionDef.count;
					const stride = extensionDef.byteStride;
					const result = new ArrayBuffer( count * stride );
					const source = new Uint8Array( res[ 0 ], byteOffset, byteLength );
					decoder.decodeGltfBuffer( new Uint8Array( result ), count, stride, source, extensionDef.mode, extensionDef.filter );
					return result;

				} );

			} else {

				return null;

			}

		}

	}
	/* BINARY EXTENSION */


	const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
	const BINARY_EXTENSION_HEADER_LENGTH = 12;
	const BINARY_EXTENSION_CHUNK_TYPES = {
		JSON: 0x4E4F534A,
		BIN: 0x004E4942
	};

	class GLTFBinaryExtension {

		constructor( data ) {

			this.name = EXTENSIONS.KHR_BINARY_GLTF;
			this.content = null;
			this.body = null;
			const headerView = new DataView( data, 0, BINARY_EXTENSION_HEADER_LENGTH );
			this.header = {
				magic: THREE.LoaderUtils.decodeText( new Uint8Array( data.slice( 0, 4 ) ) ),
				version: headerView.getUint32( 4, true ),
				length: headerView.getUint32( 8, true )
			};

			if ( this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC ) {

				throw new Error( 'THREE.GLTFLoader: Unsupported glTF-Binary header.' );

			} else if ( this.header.version < 2.0 ) {

				throw new Error( 'THREE.GLTFLoader: Legacy binary file detected.' );

			}

			const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
			const chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );
			let chunkIndex = 0;

			while ( chunkIndex < chunkContentsLength ) {

				const chunkLength = chunkView.getUint32( chunkIndex, true );
				chunkIndex += 4;
				const chunkType = chunkView.getUint32( chunkIndex, true );
				chunkIndex += 4;

				if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {

					const contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength );
					this.content = THREE.LoaderUtils.decodeText( contentArray );

				} else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {

					const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
					this.body = data.slice( byteOffset, byteOffset + chunkLength );

				} // Clients must ignore chunks with unknown types.


				chunkIndex += chunkLength;

			}

			if ( this.content === null ) {

				throw new Error( 'THREE.GLTFLoader: JSON content not found.' );

			}

		}

	}
	/**
 * DRACO THREE.Mesh Compression Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression
 */


	class GLTFDracoMeshCompressionExtension {

		constructor( json, dracoLoader ) {

			if ( ! dracoLoader ) {

				throw new Error( 'THREE.GLTFLoader: No DRACOLoader instance provided.' );

			}

			this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
			this.json = json;
			this.dracoLoader = dracoLoader;
			this.dracoLoader.preload();

		}

		decodePrimitive( primitive, parser ) {

			const json = this.json;
			const dracoLoader = this.dracoLoader;
			const bufferViewIndex = primitive.extensions[ this.name ].bufferView;
			const gltfAttributeMap = primitive.extensions[ this.name ].attributes;
			const threeAttributeMap = {};
			const attributeNormalizedMap = {};
			const attributeTypeMap = {};

			for ( const attributeName in gltfAttributeMap ) {

				const threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();
				threeAttributeMap[ threeAttributeName ] = gltfAttributeMap[ attributeName ];

			}

			for ( const attributeName in primitive.attributes ) {

				const threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

				if ( gltfAttributeMap[ attributeName ] !== undefined ) {

					const accessorDef = json.accessors[ primitive.attributes[ attributeName ] ];
					const componentType = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];
					attributeTypeMap[ threeAttributeName ] = componentType;
					attributeNormalizedMap[ threeAttributeName ] = accessorDef.normalized === true;

				}

			}

			return parser.getDependency( 'bufferView', bufferViewIndex ).then( function ( bufferView ) {

				return new Promise( function ( resolve ) {

					dracoLoader.decodeDracoFile( bufferView, function ( geometry ) {

						for ( const attributeName in geometry.attributes ) {

							const attribute = geometry.attributes[ attributeName ];
							const normalized = attributeNormalizedMap[ attributeName ];
							if ( normalized !== undefined ) attribute.normalized = normalized;

						}

						resolve( geometry );

					}, threeAttributeMap, attributeTypeMap );

				} );

			} );

		}

	}
	/**
 * THREE.Texture Transform Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform
 */


	class GLTFTextureTransformExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;

		}

		extendTexture( texture, transform ) {

			if ( transform.texCoord !== undefined ) {

				console.warn( 'THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.' );

			}

			if ( transform.offset === undefined && transform.rotation === undefined && transform.scale === undefined ) {

				// See https://github.com/mrdoob/three.js/issues/21819.
				return texture;

			}

			texture = texture.clone();

			if ( transform.offset !== undefined ) {

				texture.offset.fromArray( transform.offset );

			}

			if ( transform.rotation !== undefined ) {

				texture.rotation = transform.rotation;

			}

			if ( transform.scale !== undefined ) {

				texture.repeat.fromArray( transform.scale );

			}

			texture.needsUpdate = true;
			return texture;

		}

	}
	/**
 * Specular-Glossiness Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Archived/KHR_materials_pbrSpecularGlossiness
 */

	/**
 * A sub class of StandardMaterial with some of the functionality
 * changed via the `onBeforeCompile` callback
 * @pailhead
 */


	class GLTFMeshStandardSGMaterial extends THREE.MeshStandardMaterial {

		constructor( params ) {

			super();
			this.isGLTFSpecularGlossinessMaterial = true; //various chunks that need replacing

			const specularMapParsFragmentChunk = [ '#ifdef USE_SPECULARMAP', '	uniform sampler2D specularMap;', '#endif' ].join( '\n' );
			const glossinessMapParsFragmentChunk = [ '#ifdef USE_GLOSSINESSMAP', '	uniform sampler2D glossinessMap;', '#endif' ].join( '\n' );
			const specularMapFragmentChunk = [ 'vec3 specularFactor = specular;', '#ifdef USE_SPECULARMAP', '	vec4 texelSpecular = texture2D( specularMap, vUv );', '	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture', '	specularFactor *= texelSpecular.rgb;', '#endif' ].join( '\n' );
			const glossinessMapFragmentChunk = [ 'float glossinessFactor = glossiness;', '#ifdef USE_GLOSSINESSMAP', '	vec4 texelGlossiness = texture2D( glossinessMap, vUv );', '	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture', '	glossinessFactor *= texelGlossiness.a;', '#endif' ].join( '\n' );
			const lightPhysicalFragmentChunk = [ 'PhysicalMaterial material;', 'material.diffuseColor = diffuseColor.rgb * ( 1. - max( specularFactor.r, max( specularFactor.g, specularFactor.b ) ) );', 'vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );', 'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );', 'material.roughness = max( 1.0 - glossinessFactor, 0.0525 ); // 0.0525 corresponds to the base mip of a 256 cubemap.', 'material.roughness += geometryRoughness;', 'material.roughness = min( material.roughness, 1.0 );', 'material.specularColor = specularFactor;' ].join( '\n' );
			const uniforms = {
				specular: {
					value: new THREE.Color().setHex( 0xffffff )
				},
				glossiness: {
					value: 1
				},
				specularMap: {
					value: null
				},
				glossinessMap: {
					value: null
				}
			};
			this._extraUniforms = uniforms;

			this.onBeforeCompile = function ( shader ) {

				for ( const uniformName in uniforms ) {

					shader.uniforms[ uniformName ] = uniforms[ uniformName ];

				}

				shader.fragmentShader = shader.fragmentShader.replace( 'uniform float roughness;', 'uniform vec3 specular;' ).replace( 'uniform float metalness;', 'uniform float glossiness;' ).replace( '#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk ).replace( '#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk ).replace( '#include <roughnessmap_fragment>', specularMapFragmentChunk ).replace( '#include <metalnessmap_fragment>', glossinessMapFragmentChunk ).replace( '#include <lights_physical_fragment>', lightPhysicalFragmentChunk );

			};

			Object.defineProperties( this, {
				specular: {
					get: function () {

						return uniforms.specular.value;

					},
					set: function ( v ) {

						uniforms.specular.value = v;

					}
				},
				specularMap: {
					get: function () {

						return uniforms.specularMap.value;

					},
					set: function ( v ) {

						uniforms.specularMap.value = v;

						if ( v ) {

							this.defines.USE_SPECULARMAP = ''; // USE_UV is set by the renderer for specular maps

						} else {

							delete this.defines.USE_SPECULARMAP;

						}

					}
				},
				glossiness: {
					get: function () {

						return uniforms.glossiness.value;

					},
					set: function ( v ) {

						uniforms.glossiness.value = v;

					}
				},
				glossinessMap: {
					get: function () {

						return uniforms.glossinessMap.value;

					},
					set: function ( v ) {

						uniforms.glossinessMap.value = v;

						if ( v ) {

							this.defines.USE_GLOSSINESSMAP = '';
							this.defines.USE_UV = '';

						} else {

							delete this.defines.USE_GLOSSINESSMAP;
							delete this.defines.USE_UV;

						}

					}
				}
			} );
			delete this.metalness;
			delete this.roughness;
			delete this.metalnessMap;
			delete this.roughnessMap;
			this.setValues( params );

		}

		copy( source ) {

			super.copy( source );
			this.specularMap = source.specularMap;
			this.specular.copy( source.specular );
			this.glossinessMap = source.glossinessMap;
			this.glossiness = source.glossiness;
			delete this.metalness;
			delete this.roughness;
			delete this.metalnessMap;
			delete this.roughnessMap;
			return this;

		}

	}

	class GLTFMaterialsPbrSpecularGlossinessExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
			this.specularGlossinessParams = [ 'color', 'map', 'lightMap', 'lightMapIntensity', 'aoMap', 'aoMapIntensity', 'emissive', 'emissiveIntensity', 'emissiveMap', 'bumpMap', 'bumpScale', 'normalMap', 'normalMapType', 'displacementMap', 'displacementScale', 'displacementBias', 'specularMap', 'specular', 'glossinessMap', 'glossiness', 'alphaMap', 'envMap', 'envMapIntensity', 'refractionRatio' ];

		}

		getMaterialType() {

			return GLTFMeshStandardSGMaterial;

		}

		extendParams( materialParams, materialDef, parser ) {

			const pbrSpecularGlossiness = materialDef.extensions[ this.name ];
			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;
			const pending = [];

			if ( Array.isArray( pbrSpecularGlossiness.diffuseFactor ) ) {

				const array = pbrSpecularGlossiness.diffuseFactor;
				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( pbrSpecularGlossiness.diffuseTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', pbrSpecularGlossiness.diffuseTexture ) );

			}

			materialParams.emissive = new THREE.Color( 0.0, 0.0, 0.0 );
			materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
			materialParams.specular = new THREE.Color( 1.0, 1.0, 1.0 );

			if ( Array.isArray( pbrSpecularGlossiness.specularFactor ) ) {

				materialParams.specular.fromArray( pbrSpecularGlossiness.specularFactor );

			}

			if ( pbrSpecularGlossiness.specularGlossinessTexture !== undefined ) {

				const specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
				pending.push( parser.assignTexture( materialParams, 'glossinessMap', specGlossMapDef ) );
				pending.push( parser.assignTexture( materialParams, 'specularMap', specGlossMapDef ) );

			}

			return Promise.all( pending );

		}

		createMaterial( materialParams ) {

			const material = new GLTFMeshStandardSGMaterial( materialParams );
			material.fog = true;
			material.color = materialParams.color;
			material.map = materialParams.map === undefined ? null : materialParams.map;
			material.lightMap = null;
			material.lightMapIntensity = 1.0;
			material.aoMap = materialParams.aoMap === undefined ? null : materialParams.aoMap;
			material.aoMapIntensity = 1.0;
			material.emissive = materialParams.emissive;
			material.emissiveIntensity = 1.0;
			material.emissiveMap = materialParams.emissiveMap === undefined ? null : materialParams.emissiveMap;
			material.bumpMap = materialParams.bumpMap === undefined ? null : materialParams.bumpMap;
			material.bumpScale = 1;
			material.normalMap = materialParams.normalMap === undefined ? null : materialParams.normalMap;
			material.normalMapType = THREE.TangentSpaceNormalMap;
			if ( materialParams.normalScale ) material.normalScale = materialParams.normalScale;
			material.displacementMap = null;
			material.displacementScale = 1;
			material.displacementBias = 0;
			material.specularMap = materialParams.specularMap === undefined ? null : materialParams.specularMap;
			material.specular = materialParams.specular;
			material.glossinessMap = materialParams.glossinessMap === undefined ? null : materialParams.glossinessMap;
			material.glossiness = materialParams.glossiness;
			material.alphaMap = null;
			material.envMap = materialParams.envMap === undefined ? null : materialParams.envMap;
			material.envMapIntensity = 1.0;
			material.refractionRatio = 0.98;
			return material;

		}

	}
	/**
 * THREE.Mesh Quantization Extension
 *
 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
 */


	class GLTFMeshQuantizationExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;

		}

	}
	/*********************************/

	/********** INTERPOLATION ********/

	/*********************************/
	// Spline Interpolation
	// Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-c-spline-interpolation


	class GLTFCubicSplineInterpolant extends THREE.Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			super( parameterPositions, sampleValues, sampleSize, resultBuffer );

		}

		copySampleValue_( index ) {

			// Copies a sample value to the result buffer. See description of glTF
			// CUBICSPLINE values layout in interpolate_() function below.
			const result = this.resultBuffer,
				values = this.sampleValues,
				valueSize = this.valueSize,
				offset = index * valueSize * 3 + valueSize;

			for ( let i = 0; i !== valueSize; i ++ ) {

				result[ i ] = values[ offset + i ];

			}

			return result;

		}

	}

	GLTFCubicSplineInterpolant.prototype.beforeStart_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;
	GLTFCubicSplineInterpolant.prototype.afterEnd_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.interpolate_ = function ( i1, t0, t, t1 ) {

		const result = this.resultBuffer;
		const values = this.sampleValues;
		const stride = this.valueSize;
		const stride2 = stride * 2;
		const stride3 = stride * 3;
		const td = t1 - t0;
		const p = ( t - t0 ) / td;
		const pp = p * p;
		const ppp = pp * p;
		const offset1 = i1 * stride3;
		const offset0 = offset1 - stride3;
		const s2 = - 2 * ppp + 3 * pp;
		const s3 = ppp - pp;
		const s0 = 1 - s2;
		const s1 = s3 - pp + p; // Layout of keyframe output values for CUBICSPLINE animations:
		//   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]

		for ( let i = 0; i !== stride; i ++ ) {

			const p0 = values[ offset0 + i + stride ]; // splineVertex_k

			const m0 = values[ offset0 + i + stride2 ] * td; // outTangent_k * (t_k+1 - t_k)

			const p1 = values[ offset1 + i + stride ]; // splineVertex_k+1

			const m1 = values[ offset1 + i ] * td; // inTangent_k+1 * (t_k+1 - t_k)

			result[ i ] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;

		}

		return result;

	};

	const _q = new THREE.Quaternion();

	class GLTFCubicSplineQuaternionInterpolant extends GLTFCubicSplineInterpolant {

		interpolate_( i1, t0, t, t1 ) {

			const result = super.interpolate_( i1, t0, t, t1 );

			_q.fromArray( result ).normalize().toArray( result );

			return result;

		}

	}
	/*********************************/

	/********** INTERNALS ************/

	/*********************************/

	/* CONSTANTS */


	const WEBGL_CONSTANTS = {
		FLOAT: 5126,
		//FLOAT_MAT2: 35674,
		FLOAT_MAT3: 35675,
		FLOAT_MAT4: 35676,
		FLOAT_VEC2: 35664,
		FLOAT_VEC3: 35665,
		FLOAT_VEC4: 35666,
		LINEAR: 9729,
		REPEAT: 10497,
		SAMPLER_2D: 35678,
		POINTS: 0,
		LINES: 1,
		LINE_LOOP: 2,
		LINE_STRIP: 3,
		TRIANGLES: 4,
		TRIANGLE_STRIP: 5,
		TRIANGLE_FAN: 6,
		UNSIGNED_BYTE: 5121,
		UNSIGNED_SHORT: 5123
	};
	const WEBGL_COMPONENT_TYPES = {
		5120: Int8Array,
		5121: Uint8Array,
		5122: Int16Array,
		5123: Uint16Array,
		5125: Uint32Array,
		5126: Float32Array
	};
	const WEBGL_FILTERS = {
		9728: THREE.NearestFilter,
		9729: THREE.LinearFilter,
		9984: THREE.NearestMipmapNearestFilter,
		9985: THREE.LinearMipmapNearestFilter,
		9986: THREE.NearestMipmapLinearFilter,
		9987: THREE.LinearMipmapLinearFilter
	};
	const WEBGL_WRAPPINGS = {
		33071: THREE.ClampToEdgeWrapping,
		33648: THREE.MirroredRepeatWrapping,
		10497: THREE.RepeatWrapping
	};
	const WEBGL_TYPE_SIZES = {
		'SCALAR': 1,
		'VEC2': 2,
		'VEC3': 3,
		'VEC4': 4,
		'MAT2': 4,
		'MAT3': 9,
		'MAT4': 16
	};
	const ATTRIBUTES = {
		POSITION: 'position',
		NORMAL: 'normal',
		TANGENT: 'tangent',
		TEXCOORD_0: 'uv',
		TEXCOORD_1: 'uv2',
		COLOR_0: 'color',
		WEIGHTS_0: 'skinWeight',
		JOINTS_0: 'skinIndex'
	};
	const PATH_PROPERTIES = {
		scale: 'scale',
		translation: 'position',
		rotation: 'quaternion',
		weights: 'morphTargetInfluences'
	};
	const INTERPOLATION = {
		CUBICSPLINE: undefined,
		// We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
		// keyframe track will be initialized with a default interpolation type, then modified.
		LINEAR: THREE.InterpolateLinear,
		STEP: THREE.InterpolateDiscrete
	};
	const ALPHA_MODES = {
		OPAQUE: 'OPAQUE',
		MASK: 'MASK',
		BLEND: 'BLEND'
	};
	/**
 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
 */

	function createDefaultMaterial( cache ) {

		if ( cache[ 'DefaultMaterial' ] === undefined ) {

			cache[ 'DefaultMaterial' ] = new THREE.MeshStandardMaterial( {
				color: 0xFFFFFF,
				emissive: 0x000000,
				metalness: 1,
				roughness: 1,
				transparent: false,
				depthTest: true,
				side: THREE.FrontSide
			} );

		}

		return cache[ 'DefaultMaterial' ];

	}

	function addUnknownExtensionsToUserData( knownExtensions, object, objectDef ) {

		// Add unknown glTF extensions to an object's userData.
		for ( const name in objectDef.extensions ) {

			if ( knownExtensions[ name ] === undefined ) {

				object.userData.gltfExtensions = object.userData.gltfExtensions || {};
				object.userData.gltfExtensions[ name ] = objectDef.extensions[ name ];

			}

		}

	}
	/**
 * @param {Object3D|Material|BufferGeometry} object
 * @param {GLTF.definition} gltfDef
 */


	function assignExtrasToUserData( object, gltfDef ) {

		if ( gltfDef.extras !== undefined ) {

			if ( typeof gltfDef.extras === 'object' ) {

				Object.assign( object.userData, gltfDef.extras );

			} else {

				console.warn( 'THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras );

			}

		}

	}
	/**
 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets
 *
 * @param {BufferGeometry} geometry
 * @param {Array<GLTF.Target>} targets
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */


	function addMorphTargets( geometry, targets, parser ) {

		let hasMorphPosition = false;
		let hasMorphNormal = false;
		let hasMorphColor = false;

		for ( let i = 0, il = targets.length; i < il; i ++ ) {

			const target = targets[ i ];
			if ( target.POSITION !== undefined ) hasMorphPosition = true;
			if ( target.NORMAL !== undefined ) hasMorphNormal = true;
			if ( target.COLOR_0 !== undefined ) hasMorphColor = true;
			if ( hasMorphPosition && hasMorphNormal && hasMorphColor ) break;

		}

		if ( ! hasMorphPosition && ! hasMorphNormal && ! hasMorphColor ) return Promise.resolve( geometry );
		const pendingPositionAccessors = [];
		const pendingNormalAccessors = [];
		const pendingColorAccessors = [];

		for ( let i = 0, il = targets.length; i < il; i ++ ) {

			const target = targets[ i ];

			if ( hasMorphPosition ) {

				const pendingAccessor = target.POSITION !== undefined ? parser.getDependency( 'accessor', target.POSITION ) : geometry.attributes.position;
				pendingPositionAccessors.push( pendingAccessor );

			}

			if ( hasMorphNormal ) {

				const pendingAccessor = target.NORMAL !== undefined ? parser.getDependency( 'accessor', target.NORMAL ) : geometry.attributes.normal;
				pendingNormalAccessors.push( pendingAccessor );

			}

			if ( hasMorphColor ) {

				const pendingAccessor = target.COLOR_0 !== undefined ? parser.getDependency( 'accessor', target.COLOR_0 ) : geometry.attributes.color;
				pendingColorAccessors.push( pendingAccessor );

			}

		}

		return Promise.all( [ Promise.all( pendingPositionAccessors ), Promise.all( pendingNormalAccessors ), Promise.all( pendingColorAccessors ) ] ).then( function ( accessors ) {

			const morphPositions = accessors[ 0 ];
			const morphNormals = accessors[ 1 ];
			const morphColors = accessors[ 2 ];
			if ( hasMorphPosition ) geometry.morphAttributes.position = morphPositions;
			if ( hasMorphNormal ) geometry.morphAttributes.normal = morphNormals;
			if ( hasMorphColor ) geometry.morphAttributes.color = morphColors;
			geometry.morphTargetsRelative = true;
			return geometry;

		} );

	}
	/**
 * @param {Mesh} mesh
 * @param {GLTF.Mesh} meshDef
 */


	function updateMorphTargets( mesh, meshDef ) {

		mesh.updateMorphTargets();

		if ( meshDef.weights !== undefined ) {

			for ( let i = 0, il = meshDef.weights.length; i < il; i ++ ) {

				mesh.morphTargetInfluences[ i ] = meshDef.weights[ i ];

			}

		} // .extras has user-defined data, so check that .extras.targetNames is an array.


		if ( meshDef.extras && Array.isArray( meshDef.extras.targetNames ) ) {

			const targetNames = meshDef.extras.targetNames;

			if ( mesh.morphTargetInfluences.length === targetNames.length ) {

				mesh.morphTargetDictionary = {};

				for ( let i = 0, il = targetNames.length; i < il; i ++ ) {

					mesh.morphTargetDictionary[ targetNames[ i ] ] = i;

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.' );

			}

		}

	}

	function createPrimitiveKey( primitiveDef ) {

		const dracoExtension = primitiveDef.extensions && primitiveDef.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ];
		let geometryKey;

		if ( dracoExtension ) {

			geometryKey = 'draco:' + dracoExtension.bufferView + ':' + dracoExtension.indices + ':' + createAttributesKey( dracoExtension.attributes );

		} else {

			geometryKey = primitiveDef.indices + ':' + createAttributesKey( primitiveDef.attributes ) + ':' + primitiveDef.mode;

		}

		return geometryKey;

	}

	function createAttributesKey( attributes ) {

		let attributesKey = '';
		const keys = Object.keys( attributes ).sort();

		for ( let i = 0, il = keys.length; i < il; i ++ ) {

			attributesKey += keys[ i ] + ':' + attributes[ keys[ i ] ] + ';';

		}

		return attributesKey;

	}

	function getNormalizedComponentScale( constructor ) {

		// Reference:
		// https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data
		switch ( constructor ) {

			case Int8Array:
				return 1 / 127;

			case Uint8Array:
				return 1 / 255;

			case Int16Array:
				return 1 / 32767;

			case Uint16Array:
				return 1 / 65535;

			default:
				throw new Error( 'THREE.GLTFLoader: Unsupported normalized accessor component type.' );

		}

	}

	function getImageURIMimeType( uri ) {

		if ( uri.search( /\.jpe?g($|\?)/i ) > 0 || uri.search( /^data\:image\/jpeg/ ) === 0 ) return 'image/jpeg';
		if ( uri.search( /\.webp($|\?)/i ) > 0 || uri.search( /^data\:image\/webp/ ) === 0 ) return 'image/webp';
		return 'image/png';

	}
	/* GLTF PARSER */


	class GLTFParser {

		constructor( json = {}, options = {} ) {

			this.json = json;
			this.extensions = {};
			this.plugins = {};
			this.options = options; // loader object cache

			this.cache = new GLTFRegistry(); // associations between Three.js objects and glTF elements

			this.associations = new Map(); // THREE.BufferGeometry caching

			this.primitiveCache = {}; // THREE.Object3D instance caches

			this.meshCache = {
				refs: {},
				uses: {}
			};
			this.cameraCache = {
				refs: {},
				uses: {}
			};
			this.lightCache = {
				refs: {},
				uses: {}
			};
			this.sourceCache = {};
			this.textureCache = {}; // Track node names, to ensure no duplicates

			this.nodeNamesUsed = {}; // Use an THREE.ImageBitmapLoader if imageBitmaps are supported. Moves much of the
			// expensive work of uploading a texture to the GPU off the main thread.

			if ( typeof createImageBitmap !== 'undefined' && /Firefox|^((?!chrome|android).)*safari/i.test( navigator.userAgent ) === false ) {

				this.textureLoader = new THREE.ImageBitmapLoader( this.options.manager );

			} else {

				this.textureLoader = new THREE.TextureLoader( this.options.manager );

			}

			this.textureLoader.setCrossOrigin( this.options.crossOrigin );
			this.textureLoader.setRequestHeader( this.options.requestHeader );
			this.fileLoader = new THREE.FileLoader( this.options.manager );
			this.fileLoader.setResponseType( 'arraybuffer' );

			if ( this.options.crossOrigin === 'use-credentials' ) {

				this.fileLoader.setWithCredentials( true );

			}

		}

		setExtensions( extensions ) {

			this.extensions = extensions;

		}

		setPlugins( plugins ) {

			this.plugins = plugins;

		}

		parse( onLoad, onError ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions; // Clear the loader cache

			this.cache.removeAll(); // Mark the special nodes/meshes in json for efficient parse

			this._invokeAll( function ( ext ) {

				return ext._markDefs && ext._markDefs();

			} );

			Promise.all( this._invokeAll( function ( ext ) {

				return ext.beforeRoot && ext.beforeRoot();

			} ) ).then( function () {

				return Promise.all( [ parser.getDependencies( 'scene' ), parser.getDependencies( 'animation' ), parser.getDependencies( 'camera' ) ] );

			} ).then( function ( dependencies ) {

				const result = {
					scene: dependencies[ 0 ][ json.scene || 0 ],
					scenes: dependencies[ 0 ],
					animations: dependencies[ 1 ],
					cameras: dependencies[ 2 ],
					asset: json.asset,
					parser: parser,
					userData: {}
				};
				addUnknownExtensionsToUserData( extensions, result, json );
				assignExtrasToUserData( result, json );
				Promise.all( parser._invokeAll( function ( ext ) {

					return ext.afterRoot && ext.afterRoot( result );

				} ) ).then( function () {

					onLoad( result );

				} );

			} ).catch( onError );

		}
		/**
   * Marks the special nodes/meshes in json for efficient parse.
   */


		_markDefs() {

			const nodeDefs = this.json.nodes || [];
			const skinDefs = this.json.skins || [];
			const meshDefs = this.json.meshes || []; // Nothing in the node definition indicates whether it is a THREE.Bone or an
			// THREE.Object3D. Use the skins' joint references to mark bones.

			for ( let skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex ++ ) {

				const joints = skinDefs[ skinIndex ].joints;

				for ( let i = 0, il = joints.length; i < il; i ++ ) {

					nodeDefs[ joints[ i ] ].isBone = true;

				}

			} // Iterate over all nodes, marking references to shared resources,
			// as well as skeleton joints.


			for ( let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

				const nodeDef = nodeDefs[ nodeIndex ];

				if ( nodeDef.mesh !== undefined ) {

					this._addNodeRef( this.meshCache, nodeDef.mesh ); // Nothing in the mesh definition indicates whether it is
					// a THREE.SkinnedMesh or THREE.Mesh. Use the node's mesh reference
					// to mark THREE.SkinnedMesh if node has skin.


					if ( nodeDef.skin !== undefined ) {

						meshDefs[ nodeDef.mesh ].isSkinnedMesh = true;

					}

				}

				if ( nodeDef.camera !== undefined ) {

					this._addNodeRef( this.cameraCache, nodeDef.camera );

				}

			}

		}
		/**
   * Counts references to shared node / THREE.Object3D resources. These resources
   * can be reused, or "instantiated", at multiple nodes in the scene
   * hierarchy. THREE.Mesh, Camera, and Light instances are instantiated and must
   * be marked. Non-scenegraph resources (like Materials, Geometries, and
   * Textures) can be reused directly and are not marked here.
   *
   * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
   */


		_addNodeRef( cache, index ) {

			if ( index === undefined ) return;

			if ( cache.refs[ index ] === undefined ) {

				cache.refs[ index ] = cache.uses[ index ] = 0;

			}

			cache.refs[ index ] ++;

		}
		/** Returns a reference to a shared resource, cloning it if necessary. */


		_getNodeRef( cache, index, object ) {

			if ( cache.refs[ index ] <= 1 ) return object;
			const ref = object.clone(); // Propagates mappings to the cloned object, prevents mappings on the
			// original object from being lost.

			const updateMappings = ( original, clone ) => {

				const mappings = this.associations.get( original );

				if ( mappings != null ) {

					this.associations.set( clone, mappings );

				}

				for ( const [ i, child ] of original.children.entries() ) {

					updateMappings( child, clone.children[ i ] );

				}

			};

			updateMappings( object, ref );
			ref.name += '_instance_' + cache.uses[ index ] ++;
			return ref;

		}

		_invokeOne( func ) {

			const extensions = Object.values( this.plugins );
			extensions.push( this );

			for ( let i = 0; i < extensions.length; i ++ ) {

				const result = func( extensions[ i ] );
				if ( result ) return result;

			}

			return null;

		}

		_invokeAll( func ) {

			const extensions = Object.values( this.plugins );
			extensions.unshift( this );
			const pending = [];

			for ( let i = 0; i < extensions.length; i ++ ) {

				const result = func( extensions[ i ] );
				if ( result ) pending.push( result );

			}

			return pending;

		}
		/**
   * Requests the specified dependency asynchronously, with caching.
   * @param {string} type
   * @param {number} index
   * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
   */


		getDependency( type, index ) {

			const cacheKey = type + ':' + index;
			let dependency = this.cache.get( cacheKey );

			if ( ! dependency ) {

				switch ( type ) {

					case 'scene':
						dependency = this.loadScene( index );
						break;

					case 'node':
						dependency = this.loadNode( index );
						break;

					case 'mesh':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadMesh && ext.loadMesh( index );

						} );
						break;

					case 'accessor':
						dependency = this.loadAccessor( index );
						break;

					case 'bufferView':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadBufferView && ext.loadBufferView( index );

						} );
						break;

					case 'buffer':
						dependency = this.loadBuffer( index );
						break;

					case 'material':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadMaterial && ext.loadMaterial( index );

						} );
						break;

					case 'texture':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadTexture && ext.loadTexture( index );

						} );
						break;

					case 'skin':
						dependency = this.loadSkin( index );
						break;

					case 'animation':
						dependency = this.loadAnimation( index );
						break;

					case 'camera':
						dependency = this.loadCamera( index );
						break;

					default:
						throw new Error( 'Unknown type: ' + type );

				}

				this.cache.add( cacheKey, dependency );

			}

			return dependency;

		}
		/**
   * Requests all dependencies of the specified type asynchronously, with caching.
   * @param {string} type
   * @return {Promise<Array<Object>>}
   */


		getDependencies( type ) {

			let dependencies = this.cache.get( type );

			if ( ! dependencies ) {

				const parser = this;
				const defs = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || [];
				dependencies = Promise.all( defs.map( function ( def, index ) {

					return parser.getDependency( type, index );

				} ) );
				this.cache.add( type, dependencies );

			}

			return dependencies;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferIndex
   * @return {Promise<ArrayBuffer>}
   */


		loadBuffer( bufferIndex ) {

			const bufferDef = this.json.buffers[ bufferIndex ];
			const loader = this.fileLoader;

			if ( bufferDef.type && bufferDef.type !== 'arraybuffer' ) {

				throw new Error( 'THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.' );

			} // If present, GLB container is required to be the first buffer.


			if ( bufferDef.uri === undefined && bufferIndex === 0 ) {

				return Promise.resolve( this.extensions[ EXTENSIONS.KHR_BINARY_GLTF ].body );

			}

			const options = this.options;
			return new Promise( function ( resolve, reject ) {

				loader.load( THREE.LoaderUtils.resolveURL( bufferDef.uri, options.path ), resolve, undefined, function () {

					reject( new Error( 'THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".' ) );

				} );

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferViewIndex
   * @return {Promise<ArrayBuffer>}
   */


		loadBufferView( bufferViewIndex ) {

			const bufferViewDef = this.json.bufferViews[ bufferViewIndex ];
			return this.getDependency( 'buffer', bufferViewDef.buffer ).then( function ( buffer ) {

				const byteLength = bufferViewDef.byteLength || 0;
				const byteOffset = bufferViewDef.byteOffset || 0;
				return buffer.slice( byteOffset, byteOffset + byteLength );

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
   * @param {number} accessorIndex
   * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
   */


		loadAccessor( accessorIndex ) {

			const parser = this;
			const json = this.json;
			const accessorDef = this.json.accessors[ accessorIndex ];

			if ( accessorDef.bufferView === undefined && accessorDef.sparse === undefined ) {

				// Ignore empty accessors, which may be used to declare runtime
				// information about attributes coming from another source (e.g. Draco
				// compression extension).
				return Promise.resolve( null );

			}

			const pendingBufferViews = [];

			if ( accessorDef.bufferView !== undefined ) {

				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.bufferView ) );

			} else {

				pendingBufferViews.push( null );

			}

			if ( accessorDef.sparse !== undefined ) {

				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.indices.bufferView ) );
				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.values.bufferView ) );

			}

			return Promise.all( pendingBufferViews ).then( function ( bufferViews ) {

				const bufferView = bufferViews[ 0 ];
				const itemSize = WEBGL_TYPE_SIZES[ accessorDef.type ];
				const TypedArray = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ]; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.

				const elementBytes = TypedArray.BYTES_PER_ELEMENT;
				const itemBytes = elementBytes * itemSize;
				const byteOffset = accessorDef.byteOffset || 0;
				const byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[ accessorDef.bufferView ].byteStride : undefined;
				const normalized = accessorDef.normalized === true;
				let array, bufferAttribute; // The buffer is not interleaved if the stride is the item size in bytes.

				if ( byteStride && byteStride !== itemBytes ) {

					// Each "slice" of the buffer, as defined by 'count' elements of 'byteStride' bytes, gets its own THREE.InterleavedBuffer
					// This makes sure that IBA.count reflects accessor.count properly
					const ibSlice = Math.floor( byteOffset / byteStride );
					const ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
					let ib = parser.cache.get( ibCacheKey );

					if ( ! ib ) {

						array = new TypedArray( bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes ); // Integer parameters to IB/IBA are in array elements, not bytes.

						ib = new THREE.InterleavedBuffer( array, byteStride / elementBytes );
						parser.cache.add( ibCacheKey, ib );

					}

					bufferAttribute = new THREE.InterleavedBufferAttribute( ib, itemSize, byteOffset % byteStride / elementBytes, normalized );

				} else {

					if ( bufferView === null ) {

						array = new TypedArray( accessorDef.count * itemSize );

					} else {

						array = new TypedArray( bufferView, byteOffset, accessorDef.count * itemSize );

					}

					bufferAttribute = new THREE.BufferAttribute( array, itemSize, normalized );

				} // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#sparse-accessors


				if ( accessorDef.sparse !== undefined ) {

					const itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
					const TypedArrayIndices = WEBGL_COMPONENT_TYPES[ accessorDef.sparse.indices.componentType ];
					const byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
					const byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
					const sparseIndices = new TypedArrayIndices( bufferViews[ 1 ], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices );
					const sparseValues = new TypedArray( bufferViews[ 2 ], byteOffsetValues, accessorDef.sparse.count * itemSize );

					if ( bufferView !== null ) {

						// Avoid modifying the original ArrayBuffer, if the bufferView wasn't initialized with zeroes.
						bufferAttribute = new THREE.BufferAttribute( bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized );

					}

					for ( let i = 0, il = sparseIndices.length; i < il; i ++ ) {

						const index = sparseIndices[ i ];
						bufferAttribute.setX( index, sparseValues[ i * itemSize ] );
						if ( itemSize >= 2 ) bufferAttribute.setY( index, sparseValues[ i * itemSize + 1 ] );
						if ( itemSize >= 3 ) bufferAttribute.setZ( index, sparseValues[ i * itemSize + 2 ] );
						if ( itemSize >= 4 ) bufferAttribute.setW( index, sparseValues[ i * itemSize + 3 ] );
						if ( itemSize >= 5 ) throw new Error( 'THREE.GLTFLoader: Unsupported itemSize in sparse THREE.BufferAttribute.' );

					}

				}

				return bufferAttribute;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
   * @param {number} textureIndex
   * @return {Promise<THREE.Texture>}
   */


		loadTexture( textureIndex ) {

			const json = this.json;
			const options = this.options;
			const textureDef = json.textures[ textureIndex ];
			const sourceIndex = textureDef.source;
			const sourceDef = json.images[ sourceIndex ];
			let loader = this.textureLoader;

			if ( sourceDef.uri ) {

				const handler = options.manager.getHandler( sourceDef.uri );
				if ( handler !== null ) loader = handler;

			}

			return this.loadTextureImage( textureIndex, sourceIndex, loader );

		}

		loadTextureImage( textureIndex, sourceIndex, loader ) {

			const parser = this;
			const json = this.json;
			const textureDef = json.textures[ textureIndex ];
			const sourceDef = json.images[ sourceIndex ];
			const cacheKey = ( sourceDef.uri || sourceDef.bufferView ) + ':' + textureDef.sampler;

			if ( this.textureCache[ cacheKey ] ) {

				// See https://github.com/mrdoob/three.js/issues/21559.
				return this.textureCache[ cacheKey ];

			}

			const promise = this.loadImageSource( sourceIndex, loader ).then( function ( texture ) {

				texture.flipY = false;
				if ( textureDef.name ) texture.name = textureDef.name;
				const samplers = json.samplers || {};
				const sampler = samplers[ textureDef.sampler ] || {};
				texture.magFilter = WEBGL_FILTERS[ sampler.magFilter ] || THREE.LinearFilter;
				texture.minFilter = WEBGL_FILTERS[ sampler.minFilter ] || THREE.LinearMipmapLinearFilter;
				texture.wrapS = WEBGL_WRAPPINGS[ sampler.wrapS ] || THREE.RepeatWrapping;
				texture.wrapT = WEBGL_WRAPPINGS[ sampler.wrapT ] || THREE.RepeatWrapping;
				parser.associations.set( texture, {
					textures: textureIndex
				} );
				return texture;

			} ).catch( function () {

				return null;

			} );
			this.textureCache[ cacheKey ] = promise;
			return promise;

		}

		loadImageSource( sourceIndex, loader ) {

			const parser = this;
			const json = this.json;
			const options = this.options;

			if ( this.sourceCache[ sourceIndex ] !== undefined ) {

				return this.sourceCache[ sourceIndex ].then( function ( texture ) {

					return texture.clone();

				} ).catch( function ( error ) {

					throw error;

				} );

			}

			const sourceDef = json.images[ sourceIndex ];
			const URL = self.URL || self.webkitURL;
			let sourceURI = sourceDef.uri || '';
			let isObjectURL = false;

			if ( sourceDef.bufferView !== undefined ) {

				// Load binary image data from bufferView, if provided.
				sourceURI = parser.getDependency( 'bufferView', sourceDef.bufferView ).then( function ( bufferView ) {

					isObjectURL = true;
					const blob = new Blob( [ bufferView ], {
						type: sourceDef.mimeType
					} );
					sourceURI = URL.createObjectURL( blob );
					return sourceURI;

				} );

			} else if ( sourceDef.uri === undefined ) {

				throw new Error( 'THREE.GLTFLoader: Image ' + sourceIndex + ' is missing URI and bufferView' );

			}

			const promise = Promise.resolve( sourceURI ).then( function ( sourceURI ) {

				return new Promise( function ( resolve, reject ) {

					let onLoad = resolve;

					if ( loader.isImageBitmapLoader === true ) {

						onLoad = function ( imageBitmap ) {

							const texture = new THREE.Texture( imageBitmap );
							texture.needsUpdate = true;
							resolve( texture );

						};

					}

					loader.load( THREE.LoaderUtils.resolveURL( sourceURI, options.path ), onLoad, undefined, reject );

				} );

			} ).then( function ( texture ) {

				// Clean up resources and configure THREE.Texture.
				if ( isObjectURL === true ) {

					URL.revokeObjectURL( sourceURI );

				}

				texture.userData.mimeType = sourceDef.mimeType || getImageURIMimeType( sourceDef.uri );
				return texture;

			} ).catch( function ( error ) {

				console.error( 'THREE.GLTFLoader: Couldn\'t load texture', sourceURI );
				throw error;

			} );
			this.sourceCache[ sourceIndex ] = promise;
			return promise;

		}
		/**
   * Asynchronously assigns a texture to the given material parameters.
   * @param {Object} materialParams
   * @param {string} mapName
   * @param {Object} mapDef
   * @return {Promise<Texture>}
   */


		assignTexture( materialParams, mapName, mapDef ) {

			const parser = this;
			return this.getDependency( 'texture', mapDef.index ).then( function ( texture ) {

				// Materials sample aoMap from UV set 1 and other maps from UV set 0 - this can't be configured
				// However, we will copy UV set 0 to UV set 1 on demand for aoMap
				if ( mapDef.texCoord !== undefined && mapDef.texCoord != 0 && ! ( mapName === 'aoMap' && mapDef.texCoord == 1 ) ) {

					console.warn( 'THREE.GLTFLoader: Custom UV set ' + mapDef.texCoord + ' for texture ' + mapName + ' not yet supported.' );

				}

				if ( parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] ) {

					const transform = mapDef.extensions !== undefined ? mapDef.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] : undefined;

					if ( transform ) {

						const gltfReference = parser.associations.get( texture );
						texture = parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ].extendTexture( texture, transform );
						parser.associations.set( texture, gltfReference );

					}

				}

				materialParams[ mapName ] = texture;
				return texture;

			} );

		}
		/**
   * Assigns final material to a THREE.Mesh, THREE.Line, or THREE.Points instance. The instance
   * already has a material (generated from the glTF material options alone)
   * but reuse of the same glTF material may require multiple threejs materials
   * to accommodate different primitive types, defines, etc. New materials will
   * be created if necessary, and reused from a cache.
   * @param  {Object3D} mesh THREE.Mesh, THREE.Line, or THREE.Points instance.
   */


		assignFinalMaterial( mesh ) {

			const geometry = mesh.geometry;
			let material = mesh.material;
			const useDerivativeTangents = geometry.attributes.tangent === undefined;
			const useVertexColors = geometry.attributes.color !== undefined;
			const useFlatShading = geometry.attributes.normal === undefined;

			if ( mesh.isPoints ) {

				const cacheKey = 'PointsMaterial:' + material.uuid;
				let pointsMaterial = this.cache.get( cacheKey );

				if ( ! pointsMaterial ) {

					pointsMaterial = new THREE.PointsMaterial();
					THREE.Material.prototype.copy.call( pointsMaterial, material );
					pointsMaterial.color.copy( material.color );
					pointsMaterial.map = material.map;
					pointsMaterial.sizeAttenuation = false; // glTF spec says points should be 1px

					this.cache.add( cacheKey, pointsMaterial );

				}

				material = pointsMaterial;

			} else if ( mesh.isLine ) {

				const cacheKey = 'LineBasicMaterial:' + material.uuid;
				let lineMaterial = this.cache.get( cacheKey );

				if ( ! lineMaterial ) {

					lineMaterial = new THREE.LineBasicMaterial();
					THREE.Material.prototype.copy.call( lineMaterial, material );
					lineMaterial.color.copy( material.color );
					this.cache.add( cacheKey, lineMaterial );

				}

				material = lineMaterial;

			} // Clone the material if it will be modified


			if ( useDerivativeTangents || useVertexColors || useFlatShading ) {

				let cacheKey = 'ClonedMaterial:' + material.uuid + ':';
				if ( material.isGLTFSpecularGlossinessMaterial ) cacheKey += 'specular-glossiness:';
				if ( useDerivativeTangents ) cacheKey += 'derivative-tangents:';
				if ( useVertexColors ) cacheKey += 'vertex-colors:';
				if ( useFlatShading ) cacheKey += 'flat-shading:';
				let cachedMaterial = this.cache.get( cacheKey );

				if ( ! cachedMaterial ) {

					cachedMaterial = material.clone();
					if ( useVertexColors ) cachedMaterial.vertexColors = true;
					if ( useFlatShading ) cachedMaterial.flatShading = true;

					if ( useDerivativeTangents ) {

						// https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
						if ( cachedMaterial.normalScale ) cachedMaterial.normalScale.y *= - 1;
						if ( cachedMaterial.clearcoatNormalScale ) cachedMaterial.clearcoatNormalScale.y *= - 1;

					}

					this.cache.add( cacheKey, cachedMaterial );
					this.associations.set( cachedMaterial, this.associations.get( material ) );

				}

				material = cachedMaterial;

			} // workarounds for mesh and geometry


			if ( material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined ) {

				geometry.setAttribute( 'uv2', geometry.attributes.uv );

			}

			mesh.material = material;

		}

		getMaterialType() {

			return THREE.MeshStandardMaterial;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
   * @param {number} materialIndex
   * @return {Promise<Material>}
   */


		loadMaterial( materialIndex ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions;
			const materialDef = json.materials[ materialIndex ];
			let materialType;
			const materialParams = {};
			const materialExtensions = materialDef.extensions || {};
			const pending = [];

			if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ] ) {

				const sgExtension = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ];
				materialType = sgExtension.getMaterialType();
				pending.push( sgExtension.extendParams( materialParams, materialDef, parser ) );

			} else if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ] ) {

				const kmuExtension = extensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ];
				materialType = kmuExtension.getMaterialType();
				pending.push( kmuExtension.extendParams( materialParams, materialDef, parser ) );

			} else {

				// Specification:
				// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#metallic-roughness-material
				const metallicRoughness = materialDef.pbrMetallicRoughness || {};
				materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
				materialParams.opacity = 1.0;

				if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

					const array = metallicRoughness.baseColorFactor;
					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( metallicRoughness.baseColorTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

				}

				materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
				materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;

				if ( metallicRoughness.metallicRoughnessTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture ) );
					pending.push( parser.assignTexture( materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture ) );

				}

				materialType = this._invokeOne( function ( ext ) {

					return ext.getMaterialType && ext.getMaterialType( materialIndex );

				} );
				pending.push( Promise.all( this._invokeAll( function ( ext ) {

					return ext.extendMaterialParams && ext.extendMaterialParams( materialIndex, materialParams );

				} ) ) );

			}

			if ( materialDef.doubleSided === true ) {

				materialParams.side = THREE.DoubleSide;

			}

			const alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;

			if ( alphaMode === ALPHA_MODES.BLEND ) {

				materialParams.transparent = true; // See: https://github.com/mrdoob/three.js/issues/17706

				materialParams.depthWrite = false;

			} else {

				materialParams.transparent = false;

				if ( alphaMode === ALPHA_MODES.MASK ) {

					materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;

				}

			}

			if ( materialDef.normalTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'normalMap', materialDef.normalTexture ) );
				materialParams.normalScale = new THREE.Vector2( 1, 1 );

				if ( materialDef.normalTexture.scale !== undefined ) {

					const scale = materialDef.normalTexture.scale;
					materialParams.normalScale.set( scale, scale );

				}

			}

			if ( materialDef.occlusionTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'aoMap', materialDef.occlusionTexture ) );

				if ( materialDef.occlusionTexture.strength !== undefined ) {

					materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;

				}

			}

			if ( materialDef.emissiveFactor !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				materialParams.emissive = new THREE.Color().fromArray( materialDef.emissiveFactor );

			}

			if ( materialDef.emissiveTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'emissiveMap', materialDef.emissiveTexture ) );

			}

			return Promise.all( pending ).then( function () {

				let material;

				if ( materialType === GLTFMeshStandardSGMaterial ) {

					material = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].createMaterial( materialParams );

				} else {

					material = new materialType( materialParams );

				}

				if ( materialDef.name ) material.name = materialDef.name; // baseColorTexture, emissiveTexture, and specularGlossinessTexture use sRGB encoding.

				if ( material.map ) material.map.encoding = THREE.sRGBEncoding;
				if ( material.emissiveMap ) material.emissiveMap.encoding = THREE.sRGBEncoding;
				assignExtrasToUserData( material, materialDef );
				parser.associations.set( material, {
					materials: materialIndex
				} );
				if ( materialDef.extensions ) addUnknownExtensionsToUserData( extensions, material, materialDef );
				return material;

			} );

		}
		/** When THREE.Object3D instances are targeted by animation, they need unique names. */


		createUniqueName( originalName ) {

			const sanitizedName = THREE.PropertyBinding.sanitizeNodeName( originalName || '' );
			let name = sanitizedName;

			for ( let i = 1; this.nodeNamesUsed[ name ]; ++ i ) {

				name = sanitizedName + '_' + i;

			}

			this.nodeNamesUsed[ name ] = true;
			return name;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
   *
   * Creates BufferGeometries from primitives.
   *
   * @param {Array<GLTF.Primitive>} primitives
   * @return {Promise<Array<BufferGeometry>>}
   */


		loadGeometries( primitives ) {

			const parser = this;
			const extensions = this.extensions;
			const cache = this.primitiveCache;

			function createDracoPrimitive( primitive ) {

				return extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ].decodePrimitive( primitive, parser ).then( function ( geometry ) {

					return addPrimitiveAttributes( geometry, primitive, parser );

				} );

			}

			const pending = [];

			for ( let i = 0, il = primitives.length; i < il; i ++ ) {

				const primitive = primitives[ i ];
				const cacheKey = createPrimitiveKey( primitive ); // See if we've already created this geometry

				const cached = cache[ cacheKey ];

				if ( cached ) {

					// Use the cached geometry if it exists
					pending.push( cached.promise );

				} else {

					let geometryPromise;

					if ( primitive.extensions && primitive.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ] ) {

						// Use DRACO geometry if available
						geometryPromise = createDracoPrimitive( primitive );

					} else {

						// Otherwise create a new geometry
						geometryPromise = addPrimitiveAttributes( new THREE.BufferGeometry(), primitive, parser );

					} // Cache this geometry


					cache[ cacheKey ] = {
						primitive: primitive,
						promise: geometryPromise
					};
					pending.push( geometryPromise );

				}

			}

			return Promise.all( pending );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
   * @param {number} meshIndex
   * @return {Promise<Group|Mesh|SkinnedMesh>}
   */


		loadMesh( meshIndex ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions;
			const meshDef = json.meshes[ meshIndex ];
			const primitives = meshDef.primitives;
			const pending = [];

			for ( let i = 0, il = primitives.length; i < il; i ++ ) {

				const material = primitives[ i ].material === undefined ? createDefaultMaterial( this.cache ) : this.getDependency( 'material', primitives[ i ].material );
				pending.push( material );

			}

			pending.push( parser.loadGeometries( primitives ) );
			return Promise.all( pending ).then( function ( results ) {

				const materials = results.slice( 0, results.length - 1 );
				const geometries = results[ results.length - 1 ];
				const meshes = [];

				for ( let i = 0, il = geometries.length; i < il; i ++ ) {

					const geometry = geometries[ i ];
					const primitive = primitives[ i ]; // 1. create THREE.Mesh

					let mesh;
					const material = materials[ i ];

					if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLES || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN || primitive.mode === undefined ) {

						// .isSkinnedMesh isn't in glTF spec. See ._markDefs()
						mesh = meshDef.isSkinnedMesh === true ? new THREE.SkinnedMesh( geometry, material ) : new THREE.Mesh( geometry, material );

						if ( mesh.isSkinnedMesh === true && ! mesh.geometry.attributes.skinWeight.normalized ) {

							// we normalize floating point skin weight array to fix malformed assets (see #15319)
							// it's important to skip this for non-float32 data since normalizeSkinWeights assumes non-normalized inputs
							mesh.normalizeSkinWeights();

						}

						if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ) {

							mesh.geometry = toTrianglesDrawMode( mesh.geometry, THREE.TriangleStripDrawMode );

						} else if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ) {

							mesh.geometry = toTrianglesDrawMode( mesh.geometry, THREE.TriangleFanDrawMode );

						}

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINES ) {

						mesh = new THREE.LineSegments( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_STRIP ) {

						mesh = new THREE.Line( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_LOOP ) {

						mesh = new THREE.LineLoop( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.POINTS ) {

						mesh = new THREE.Points( geometry, material );

					} else {

						throw new Error( 'THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode );

					}

					if ( Object.keys( mesh.geometry.morphAttributes ).length > 0 ) {

						updateMorphTargets( mesh, meshDef );

					}

					mesh.name = parser.createUniqueName( meshDef.name || 'mesh_' + meshIndex );
					assignExtrasToUserData( mesh, meshDef );
					if ( primitive.extensions ) addUnknownExtensionsToUserData( extensions, mesh, primitive );
					parser.assignFinalMaterial( mesh );
					meshes.push( mesh );

				}

				for ( let i = 0, il = meshes.length; i < il; i ++ ) {

					parser.associations.set( meshes[ i ], {
						meshes: meshIndex,
						primitives: i
					} );

				}

				if ( meshes.length === 1 ) {

					return meshes[ 0 ];

				}

				const group = new THREE.Group();
				parser.associations.set( group, {
					meshes: meshIndex
				} );

				for ( let i = 0, il = meshes.length; i < il; i ++ ) {

					group.add( meshes[ i ] );

				}

				return group;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
   * @param {number} cameraIndex
   * @return {Promise<THREE.Camera>}
   */


		loadCamera( cameraIndex ) {

			let camera;
			const cameraDef = this.json.cameras[ cameraIndex ];
			const params = cameraDef[ cameraDef.type ];

			if ( ! params ) {

				console.warn( 'THREE.GLTFLoader: Missing camera parameters.' );
				return;

			}

			if ( cameraDef.type === 'perspective' ) {

				camera = new THREE.PerspectiveCamera( THREE.MathUtils.radToDeg( params.yfov ), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6 );

			} else if ( cameraDef.type === 'orthographic' ) {

				camera = new THREE.OrthographicCamera( - params.xmag, params.xmag, params.ymag, - params.ymag, params.znear, params.zfar );

			}

			if ( cameraDef.name ) camera.name = this.createUniqueName( cameraDef.name );
			assignExtrasToUserData( camera, cameraDef );
			return Promise.resolve( camera );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
   * @param {number} skinIndex
   * @return {Promise<Object>}
   */


		loadSkin( skinIndex ) {

			const skinDef = this.json.skins[ skinIndex ];
			const skinEntry = {
				joints: skinDef.joints
			};

			if ( skinDef.inverseBindMatrices === undefined ) {

				return Promise.resolve( skinEntry );

			}

			return this.getDependency( 'accessor', skinDef.inverseBindMatrices ).then( function ( accessor ) {

				skinEntry.inverseBindMatrices = accessor;
				return skinEntry;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
   * @param {number} animationIndex
   * @return {Promise<AnimationClip>}
   */


		loadAnimation( animationIndex ) {

			const json = this.json;
			const animationDef = json.animations[ animationIndex ];
			const pendingNodes = [];
			const pendingInputAccessors = [];
			const pendingOutputAccessors = [];
			const pendingSamplers = [];
			const pendingTargets = [];

			for ( let i = 0, il = animationDef.channels.length; i < il; i ++ ) {

				const channel = animationDef.channels[ i ];
				const sampler = animationDef.samplers[ channel.sampler ];
				const target = channel.target;
				const name = target.node !== undefined ? target.node : target.id; // NOTE: target.id is deprecated.

				const input = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.input ] : sampler.input;
				const output = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.output ] : sampler.output;
				pendingNodes.push( this.getDependency( 'node', name ) );
				pendingInputAccessors.push( this.getDependency( 'accessor', input ) );
				pendingOutputAccessors.push( this.getDependency( 'accessor', output ) );
				pendingSamplers.push( sampler );
				pendingTargets.push( target );

			}

			return Promise.all( [ Promise.all( pendingNodes ), Promise.all( pendingInputAccessors ), Promise.all( pendingOutputAccessors ), Promise.all( pendingSamplers ), Promise.all( pendingTargets ) ] ).then( function ( dependencies ) {

				const nodes = dependencies[ 0 ];
				const inputAccessors = dependencies[ 1 ];
				const outputAccessors = dependencies[ 2 ];
				const samplers = dependencies[ 3 ];
				const targets = dependencies[ 4 ];
				const tracks = [];

				for ( let i = 0, il = nodes.length; i < il; i ++ ) {

					const node = nodes[ i ];
					const inputAccessor = inputAccessors[ i ];
					const outputAccessor = outputAccessors[ i ];
					const sampler = samplers[ i ];
					const target = targets[ i ];
					if ( node === undefined ) continue;
					node.updateMatrix();
					node.matrixAutoUpdate = true;
					let TypedKeyframeTrack;

					switch ( PATH_PROPERTIES[ target.path ] ) {

						case PATH_PROPERTIES.weights:
							TypedKeyframeTrack = THREE.NumberKeyframeTrack;
							break;

						case PATH_PROPERTIES.rotation:
							TypedKeyframeTrack = THREE.QuaternionKeyframeTrack;
							break;

						case PATH_PROPERTIES.position:
						case PATH_PROPERTIES.scale:
						default:
							TypedKeyframeTrack = THREE.VectorKeyframeTrack;
							break;

					}

					const targetName = node.name ? node.name : node.uuid;
					const interpolation = sampler.interpolation !== undefined ? INTERPOLATION[ sampler.interpolation ] : THREE.InterpolateLinear;
					const targetNames = [];

					if ( PATH_PROPERTIES[ target.path ] === PATH_PROPERTIES.weights ) {

						node.traverse( function ( object ) {

							if ( object.morphTargetInfluences ) {

								targetNames.push( object.name ? object.name : object.uuid );

							}

						} );

					} else {

						targetNames.push( targetName );

					}

					let outputArray = outputAccessor.array;

					if ( outputAccessor.normalized ) {

						const scale = getNormalizedComponentScale( outputArray.constructor );
						const scaled = new Float32Array( outputArray.length );

						for ( let j = 0, jl = outputArray.length; j < jl; j ++ ) {

							scaled[ j ] = outputArray[ j ] * scale;

						}

						outputArray = scaled;

					}

					for ( let j = 0, jl = targetNames.length; j < jl; j ++ ) {

						const track = new TypedKeyframeTrack( targetNames[ j ] + '.' + PATH_PROPERTIES[ target.path ], inputAccessor.array, outputArray, interpolation ); // Override interpolation with custom factory method.

						if ( sampler.interpolation === 'CUBICSPLINE' ) {

							track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline( result ) {

								// A CUBICSPLINE keyframe in glTF has three output values for each input value,
								// representing inTangent, splineVertex, and outTangent. As a result, track.getValueSize()
								// must be divided by three to get the interpolant's sampleSize argument.
								const interpolantType = this instanceof THREE.QuaternionKeyframeTrack ? GLTFCubicSplineQuaternionInterpolant : GLTFCubicSplineInterpolant;
								return new interpolantType( this.times, this.values, this.getValueSize() / 3, result );

							}; // Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.


							track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;

						}

						tracks.push( track );

					}

				}

				const name = animationDef.name ? animationDef.name : 'animation_' + animationIndex;
				return new THREE.AnimationClip( name, undefined, tracks );

			} );

		}

		createNodeMesh( nodeIndex ) {

			const json = this.json;
			const parser = this;
			const nodeDef = json.nodes[ nodeIndex ];
			if ( nodeDef.mesh === undefined ) return null;
			return parser.getDependency( 'mesh', nodeDef.mesh ).then( function ( mesh ) {

				const node = parser._getNodeRef( parser.meshCache, nodeDef.mesh, mesh ); // if weights are provided on the node, override weights on the mesh.


				if ( nodeDef.weights !== undefined ) {

					node.traverse( function ( o ) {

						if ( ! o.isMesh ) return;

						for ( let i = 0, il = nodeDef.weights.length; i < il; i ++ ) {

							o.morphTargetInfluences[ i ] = nodeDef.weights[ i ];

						}

					} );

				}

				return node;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
   * @param {number} nodeIndex
   * @return {Promise<Object3D>}
   */


		loadNode( nodeIndex ) {

			const json = this.json;
			const extensions = this.extensions;
			const parser = this;
			const nodeDef = json.nodes[ nodeIndex ]; // reserve node's name before its dependencies, so the root has the intended name.

			const nodeName = nodeDef.name ? parser.createUniqueName( nodeDef.name ) : '';
			return function () {

				const pending = [];

				const meshPromise = parser._invokeOne( function ( ext ) {

					return ext.createNodeMesh && ext.createNodeMesh( nodeIndex );

				} );

				if ( meshPromise ) {

					pending.push( meshPromise );

				}

				if ( nodeDef.camera !== undefined ) {

					pending.push( parser.getDependency( 'camera', nodeDef.camera ).then( function ( camera ) {

						return parser._getNodeRef( parser.cameraCache, nodeDef.camera, camera );

					} ) );

				}

				parser._invokeAll( function ( ext ) {

					return ext.createNodeAttachment && ext.createNodeAttachment( nodeIndex );

				} ).forEach( function ( promise ) {

					pending.push( promise );

				} );

				return Promise.all( pending );

			}().then( function ( objects ) {

				let node; // .isBone isn't in glTF spec. See ._markDefs

				if ( nodeDef.isBone === true ) {

					node = new THREE.Bone();

				} else if ( objects.length > 1 ) {

					node = new THREE.Group();

				} else if ( objects.length === 1 ) {

					node = objects[ 0 ];

				} else {

					node = new THREE.Object3D();

				}

				if ( node !== objects[ 0 ] ) {

					for ( let i = 0, il = objects.length; i < il; i ++ ) {

						node.add( objects[ i ] );

					}

				}

				if ( nodeDef.name ) {

					node.userData.name = nodeDef.name;
					node.name = nodeName;

				}

				assignExtrasToUserData( node, nodeDef );
				if ( nodeDef.extensions ) addUnknownExtensionsToUserData( extensions, node, nodeDef );

				if ( nodeDef.matrix !== undefined ) {

					const matrix = new THREE.Matrix4();
					matrix.fromArray( nodeDef.matrix );
					node.applyMatrix4( matrix );

				} else {

					if ( nodeDef.translation !== undefined ) {

						node.position.fromArray( nodeDef.translation );

					}

					if ( nodeDef.rotation !== undefined ) {

						node.quaternion.fromArray( nodeDef.rotation );

					}

					if ( nodeDef.scale !== undefined ) {

						node.scale.fromArray( nodeDef.scale );

					}

				}

				if ( ! parser.associations.has( node ) ) {

					parser.associations.set( node, {} );

				}

				parser.associations.get( node ).nodes = nodeIndex;
				return node;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
   * @param {number} sceneIndex
   * @return {Promise<Group>}
   */


		loadScene( sceneIndex ) {

			const json = this.json;
			const extensions = this.extensions;
			const sceneDef = this.json.scenes[ sceneIndex ];
			const parser = this; // THREE.Loader returns THREE.Group, not Scene.
			// See: https://github.com/mrdoob/three.js/issues/18342#issuecomment-578981172

			const scene = new THREE.Group();
			if ( sceneDef.name ) scene.name = parser.createUniqueName( sceneDef.name );
			assignExtrasToUserData( scene, sceneDef );
			if ( sceneDef.extensions ) addUnknownExtensionsToUserData( extensions, scene, sceneDef );
			const nodeIds = sceneDef.nodes || [];
			const pending = [];

			for ( let i = 0, il = nodeIds.length; i < il; i ++ ) {

				pending.push( buildNodeHierarchy( nodeIds[ i ], scene, json, parser ) );

			}

			return Promise.all( pending ).then( function () {

				// Removes dangling associations, associations that reference a node that
				// didn't make it into the scene.
				const reduceAssociations = node => {

					const reducedAssociations = new Map();

					for ( const [ key, value ] of parser.associations ) {

						if ( key instanceof THREE.Material || key instanceof THREE.Texture ) {

							reducedAssociations.set( key, value );

						}

					}

					node.traverse( node => {

						const mappings = parser.associations.get( node );

						if ( mappings != null ) {

							reducedAssociations.set( node, mappings );

						}

					} );
					return reducedAssociations;

				};

				parser.associations = reduceAssociations( scene );
				return scene;

			} );

		}

	}

	function buildNodeHierarchy( nodeId, parentObject, json, parser ) {

		const nodeDef = json.nodes[ nodeId ];
		return parser.getDependency( 'node', nodeId ).then( function ( node ) {

			if ( nodeDef.skin === undefined ) return node; // build skeleton here as well

			let skinEntry;
			return parser.getDependency( 'skin', nodeDef.skin ).then( function ( skin ) {

				skinEntry = skin;
				const pendingJoints = [];

				for ( let i = 0, il = skinEntry.joints.length; i < il; i ++ ) {

					pendingJoints.push( parser.getDependency( 'node', skinEntry.joints[ i ] ) );

				}

				return Promise.all( pendingJoints );

			} ).then( function ( jointNodes ) {

				node.traverse( function ( mesh ) {

					if ( ! mesh.isMesh ) return;
					const bones = [];
					const boneInverses = [];

					for ( let j = 0, jl = jointNodes.length; j < jl; j ++ ) {

						const jointNode = jointNodes[ j ];

						if ( jointNode ) {

							bones.push( jointNode );
							const mat = new THREE.Matrix4();

							if ( skinEntry.inverseBindMatrices !== undefined ) {

								mat.fromArray( skinEntry.inverseBindMatrices.array, j * 16 );

							}

							boneInverses.push( mat );

						} else {

							console.warn( 'THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[ j ] );

						}

					}

					mesh.bind( new THREE.Skeleton( bones, boneInverses ), mesh.matrixWorld );

				} );
				return node;

			} );

		} ).then( function ( node ) {

			// build node hierachy
			parentObject.add( node );
			const pending = [];

			if ( nodeDef.children ) {

				const children = nodeDef.children;

				for ( let i = 0, il = children.length; i < il; i ++ ) {

					const child = children[ i ];
					pending.push( buildNodeHierarchy( child, node, json, parser ) );

				}

			}

			return Promise.all( pending );

		} );

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 */


	function computeBounds( geometry, primitiveDef, parser ) {

		const attributes = primitiveDef.attributes;
		const box = new THREE.Box3();

		if ( attributes.POSITION !== undefined ) {

			const accessor = parser.json.accessors[ attributes.POSITION ];
			const min = accessor.min;
			const max = accessor.max; // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

			if ( min !== undefined && max !== undefined ) {

				box.set( new THREE.Vector3( min[ 0 ], min[ 1 ], min[ 2 ] ), new THREE.Vector3( max[ 0 ], max[ 1 ], max[ 2 ] ) );

				if ( accessor.normalized ) {

					const boxScale = getNormalizedComponentScale( WEBGL_COMPONENT_TYPES[ accessor.componentType ] );
					box.min.multiplyScalar( boxScale );
					box.max.multiplyScalar( boxScale );

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );
				return;

			}

		} else {

			return;

		}

		const targets = primitiveDef.targets;

		if ( targets !== undefined ) {

			const maxDisplacement = new THREE.Vector3();
			const vector = new THREE.Vector3();

			for ( let i = 0, il = targets.length; i < il; i ++ ) {

				const target = targets[ i ];

				if ( target.POSITION !== undefined ) {

					const accessor = parser.json.accessors[ target.POSITION ];
					const min = accessor.min;
					const max = accessor.max; // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

					if ( min !== undefined && max !== undefined ) {

						// we need to get max of absolute components because target weight is [-1,1]
						vector.setX( Math.max( Math.abs( min[ 0 ] ), Math.abs( max[ 0 ] ) ) );
						vector.setY( Math.max( Math.abs( min[ 1 ] ), Math.abs( max[ 1 ] ) ) );
						vector.setZ( Math.max( Math.abs( min[ 2 ] ), Math.abs( max[ 2 ] ) ) );

						if ( accessor.normalized ) {

							const boxScale = getNormalizedComponentScale( WEBGL_COMPONENT_TYPES[ accessor.componentType ] );
							vector.multiplyScalar( boxScale );

						} // Note: this assumes that the sum of all weights is at most 1. This isn't quite correct - it's more conservative
						// to assume that each target can have a max weight of 1. However, for some use cases - notably, when morph targets
						// are used to implement key-frame animations and as such only two are active at a time - this results in very large
						// boxes. So for now we make a box that's sometimes a touch too small but is hopefully mostly of reasonable size.


						maxDisplacement.max( vector );

					} else {

						console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );

					}

				}

			} // As per comment above this box isn't conservative, but has a reasonable size for a very large number of morph targets.


			box.expandByVector( maxDisplacement );

		}

		geometry.boundingBox = box;
		const sphere = new THREE.Sphere();
		box.getCenter( sphere.center );
		sphere.radius = box.min.distanceTo( box.max ) / 2;
		geometry.boundingSphere = sphere;

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */


	function addPrimitiveAttributes( geometry, primitiveDef, parser ) {

		const attributes = primitiveDef.attributes;
		const pending = [];

		function assignAttributeAccessor( accessorIndex, attributeName ) {

			return parser.getDependency( 'accessor', accessorIndex ).then( function ( accessor ) {

				geometry.setAttribute( attributeName, accessor );

			} );

		}

		for ( const gltfAttributeName in attributes ) {

			const threeAttributeName = ATTRIBUTES[ gltfAttributeName ] || gltfAttributeName.toLowerCase(); // Skip attributes already provided by e.g. Draco extension.

			if ( threeAttributeName in geometry.attributes ) continue;
			pending.push( assignAttributeAccessor( attributes[ gltfAttributeName ], threeAttributeName ) );

		}

		if ( primitiveDef.indices !== undefined && ! geometry.index ) {

			const accessor = parser.getDependency( 'accessor', primitiveDef.indices ).then( function ( accessor ) {

				geometry.setIndex( accessor );

			} );
			pending.push( accessor );

		}

		assignExtrasToUserData( geometry, primitiveDef );
		computeBounds( geometry, primitiveDef, parser );
		return Promise.all( pending ).then( function () {

			return primitiveDef.targets !== undefined ? addMorphTargets( geometry, primitiveDef.targets, parser ) : geometry;

		} );

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {Number} drawMode
 * @return {BufferGeometry}
 */


	function toTrianglesDrawMode( geometry, drawMode ) {

		let index = geometry.getIndex(); // generate index if not present

		if ( index === null ) {

			const indices = [];
			const position = geometry.getAttribute( 'position' );

			if ( position !== undefined ) {

				for ( let i = 0; i < position.count; i ++ ) {

					indices.push( i );

				}

				geometry.setIndex( indices );
				index = geometry.getIndex();

			} else {

				console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
				return geometry;

			}

		} //


		const numberOfTriangles = index.count - 2;
		const newIndices = [];

		if ( drawMode === THREE.TriangleFanDrawMode ) {

			// gl.TRIANGLE_FAN
			for ( let i = 1; i <= numberOfTriangles; i ++ ) {

				newIndices.push( index.getX( 0 ) );
				newIndices.push( index.getX( i ) );
				newIndices.push( index.getX( i + 1 ) );

			}

		} else {

			// gl.TRIANGLE_STRIP
			for ( let i = 0; i < numberOfTriangles; i ++ ) {

				if ( i % 2 === 0 ) {

					newIndices.push( index.getX( i ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i + 2 ) );

				} else {

					newIndices.push( index.getX( i + 2 ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i ) );

				}

			}

		}

		if ( newIndices.length / 3 !== numberOfTriangles ) {

			console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

		} // build final geometry


		const newGeometry = geometry.clone();
		newGeometry.setIndex( newIndices );
		return newGeometry;

	}

	THREE.GLTFLoader = GLTFLoader;

} )();
( function () {

	/**
 * THREE.Loader loads FBX file and generates THREE.Group representing FBX scene.
 * Requires FBX file to be >= 7.0 and in ASCII or >= 6400 in Binary format
 * Versions lower than this may load but will probably have errors
 *
 * Needs Support:
 *  Morph normals / blend shape normals
 *
 * FBX format references:
 * 	https://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_index_html (C++ SDK reference)
 *
 * Binary format specification:
 *	https://code.blender.org/2013/08/fbx-binary-file-format-specification/
 */

	let fbxTree;
	let connections;
	let sceneGraph;

	class FBXLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const path = scope.path === '' ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;
			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( scope.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( scope.requestHeader );
			loader.setWithCredentials( scope.withCredentials );
			loader.load( url, function ( buffer ) {

				try {

					onLoad( scope.parse( buffer, path ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		parse( FBXBuffer, path ) {

			if ( isFbxFormatBinary( FBXBuffer ) ) {

				fbxTree = new BinaryParser().parse( FBXBuffer );

			} else {

				const FBXText = convertArrayBufferToString( FBXBuffer );

				if ( ! isFbxFormatASCII( FBXText ) ) {

					throw new Error( 'THREE.FBXLoader: Unknown format.' );

				}

				if ( getFbxVersion( FBXText ) < 7000 ) {

					throw new Error( 'THREE.FBXLoader: FBX version not supported, FileVersion: ' + getFbxVersion( FBXText ) );

				}

				fbxTree = new TextParser().parse( FBXText );

			} // console.log( fbxTree );


			const textureLoader = new THREE.TextureLoader( this.manager ).setPath( this.resourcePath || path ).setCrossOrigin( this.crossOrigin );
			return new FBXTreeParser( textureLoader, this.manager ).parse( fbxTree );

		}

	} // Parse the FBXTree object returned by the BinaryParser or TextParser and return a THREE.Group


	class FBXTreeParser {

		constructor( textureLoader, manager ) {

			this.textureLoader = textureLoader;
			this.manager = manager;

		}

		parse() {

			connections = this.parseConnections();
			const images = this.parseImages();
			const textures = this.parseTextures( images );
			const materials = this.parseMaterials( textures );
			const deformers = this.parseDeformers();
			const geometryMap = new GeometryParser().parse( deformers );
			this.parseScene( deformers, geometryMap, materials );
			return sceneGraph;

		} // Parses FBXTree.Connections which holds parent-child connections between objects (e.g. material -> texture, model->geometry )
		// and details the connection type


		parseConnections() {

			const connectionMap = new Map();

			if ( 'Connections' in fbxTree ) {

				const rawConnections = fbxTree.Connections.connections;
				rawConnections.forEach( function ( rawConnection ) {

					const fromID = rawConnection[ 0 ];
					const toID = rawConnection[ 1 ];
					const relationship = rawConnection[ 2 ];

					if ( ! connectionMap.has( fromID ) ) {

						connectionMap.set( fromID, {
							parents: [],
							children: []
						} );

					}

					const parentRelationship = {
						ID: toID,
						relationship: relationship
					};
					connectionMap.get( fromID ).parents.push( parentRelationship );

					if ( ! connectionMap.has( toID ) ) {

						connectionMap.set( toID, {
							parents: [],
							children: []
						} );

					}

					const childRelationship = {
						ID: fromID,
						relationship: relationship
					};
					connectionMap.get( toID ).children.push( childRelationship );

				} );

			}

			return connectionMap;

		} // Parse FBXTree.Objects.Video for embedded image data
		// These images are connected to textures in FBXTree.Objects.Textures
		// via FBXTree.Connections.


		parseImages() {

			const images = {};
			const blobs = {};

			if ( 'Video' in fbxTree.Objects ) {

				const videoNodes = fbxTree.Objects.Video;

				for ( const nodeID in videoNodes ) {

					const videoNode = videoNodes[ nodeID ];
					const id = parseInt( nodeID );
					images[ id ] = videoNode.RelativeFilename || videoNode.Filename; // raw image data is in videoNode.Content

					if ( 'Content' in videoNode ) {

						const arrayBufferContent = videoNode.Content instanceof ArrayBuffer && videoNode.Content.byteLength > 0;
						const base64Content = typeof videoNode.Content === 'string' && videoNode.Content !== '';

						if ( arrayBufferContent || base64Content ) {

							const image = this.parseImage( videoNodes[ nodeID ] );
							blobs[ videoNode.RelativeFilename || videoNode.Filename ] = image;

						}

					}

				}

			}

			for ( const id in images ) {

				const filename = images[ id ];
				if ( blobs[ filename ] !== undefined ) images[ id ] = blobs[ filename ]; else images[ id ] = images[ id ].split( '\\' ).pop();

			}

			return images;

		} // Parse embedded image data in FBXTree.Video.Content


		parseImage( videoNode ) {

			const content = videoNode.Content;
			const fileName = videoNode.RelativeFilename || videoNode.Filename;
			const extension = fileName.slice( fileName.lastIndexOf( '.' ) + 1 ).toLowerCase();
			let type;

			switch ( extension ) {

				case 'bmp':
					type = 'image/bmp';
					break;

				case 'jpg':
				case 'jpeg':
					type = 'image/jpeg';
					break;

				case 'png':
					type = 'image/png';
					break;

				case 'tif':
					type = 'image/tiff';
					break;

				case 'tga':
					if ( this.manager.getHandler( '.tga' ) === null ) {

						console.warn( 'FBXLoader: TGA loader not found, skipping ', fileName );

					}

					type = 'image/tga';
					break;

				default:
					console.warn( 'FBXLoader: Image type "' + extension + '" is not supported.' );
					return;

			}

			if ( typeof content === 'string' ) {

				// ASCII format
				return 'data:' + type + ';base64,' + content;

			} else {

				// Binary Format
				const array = new Uint8Array( content );
				return window.URL.createObjectURL( new Blob( [ array ], {
					type: type
				} ) );

			}

		} // Parse nodes in FBXTree.Objects.Texture
		// These contain details such as UV scaling, cropping, rotation etc and are connected
		// to images in FBXTree.Objects.Video


		parseTextures( images ) {

			const textureMap = new Map();

			if ( 'Texture' in fbxTree.Objects ) {

				const textureNodes = fbxTree.Objects.Texture;

				for ( const nodeID in textureNodes ) {

					const texture = this.parseTexture( textureNodes[ nodeID ], images );
					textureMap.set( parseInt( nodeID ), texture );

				}

			}

			return textureMap;

		} // Parse individual node in FBXTree.Objects.Texture


		parseTexture( textureNode, images ) {

			const texture = this.loadTexture( textureNode, images );
			texture.ID = textureNode.id;
			texture.name = textureNode.attrName;
			const wrapModeU = textureNode.WrapModeU;
			const wrapModeV = textureNode.WrapModeV;
			const valueU = wrapModeU !== undefined ? wrapModeU.value : 0;
			const valueV = wrapModeV !== undefined ? wrapModeV.value : 0; // http://download.autodesk.com/us/fbx/SDKdocs/FBX_SDK_Help/files/fbxsdkref/class_k_fbx_texture.html#889640e63e2e681259ea81061b85143a
			// 0: repeat(default), 1: clamp

			texture.wrapS = valueU === 0 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
			texture.wrapT = valueV === 0 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

			if ( 'Scaling' in textureNode ) {

				const values = textureNode.Scaling.value;
				texture.repeat.x = values[ 0 ];
				texture.repeat.y = values[ 1 ];

			}

			return texture;

		} // load a texture specified as a blob or data URI, or via an external URL using THREE.TextureLoader


		loadTexture( textureNode, images ) {

			let fileName;
			const currentPath = this.textureLoader.path;
			const children = connections.get( textureNode.id ).children;

			if ( children !== undefined && children.length > 0 && images[ children[ 0 ].ID ] !== undefined ) {

				fileName = images[ children[ 0 ].ID ];

				if ( fileName.indexOf( 'blob:' ) === 0 || fileName.indexOf( 'data:' ) === 0 ) {

					this.textureLoader.setPath( undefined );

				}

			}

			let texture;
			const extension = textureNode.FileName.slice( - 3 ).toLowerCase();

			if ( extension === 'tga' ) {

				const loader = this.manager.getHandler( '.tga' );

				if ( loader === null ) {

					console.warn( 'FBXLoader: TGA loader not found, creating placeholder texture for', textureNode.RelativeFilename );
					texture = new THREE.Texture();

				} else {

					loader.setPath( this.textureLoader.path );
					texture = loader.load( fileName );

				}

			} else if ( extension === 'psd' ) {

				console.warn( 'FBXLoader: PSD textures are not supported, creating placeholder texture for', textureNode.RelativeFilename );
				texture = new THREE.Texture();

			} else {

				texture = this.textureLoader.load( fileName );

			}

			this.textureLoader.setPath( currentPath );
			return texture;

		} // Parse nodes in FBXTree.Objects.Material


		parseMaterials( textureMap ) {

			const materialMap = new Map();

			if ( 'Material' in fbxTree.Objects ) {

				const materialNodes = fbxTree.Objects.Material;

				for ( const nodeID in materialNodes ) {

					const material = this.parseMaterial( materialNodes[ nodeID ], textureMap );
					if ( material !== null ) materialMap.set( parseInt( nodeID ), material );

				}

			}

			return materialMap;

		} // Parse single node in FBXTree.Objects.Material
		// Materials are connected to texture maps in FBXTree.Objects.Textures
		// FBX format currently only supports Lambert and Phong shading models


		parseMaterial( materialNode, textureMap ) {

			const ID = materialNode.id;
			const name = materialNode.attrName;
			let type = materialNode.ShadingModel; // Case where FBX wraps shading model in property object.

			if ( typeof type === 'object' ) {

				type = type.value;

			} // Ignore unused materials which don't have any connections.


			if ( ! connections.has( ID ) ) return null;
			const parameters = this.parseParameters( materialNode, textureMap, ID );
			let material;

			switch ( type.toLowerCase() ) {

				case 'phong':
					material = new THREE.MeshPhongMaterial();
					break;

				case 'lambert':
					material = new THREE.MeshLambertMaterial();
					break;

				default:
					console.warn( 'THREE.FBXLoader: unknown material type "%s". Defaulting to THREE.MeshPhongMaterial.', type );
					material = new THREE.MeshPhongMaterial();
					break;

			}

			material.setValues( parameters );
			material.name = name;
			return material;

		} // Parse FBX material and return parameters suitable for a three.js material
		// Also parse the texture map and return any textures associated with the material


		parseParameters( materialNode, textureMap, ID ) {

			const parameters = {};

			if ( materialNode.BumpFactor ) {

				parameters.bumpScale = materialNode.BumpFactor.value;

			}

			if ( materialNode.Diffuse ) {

				parameters.color = new THREE.Color().fromArray( materialNode.Diffuse.value );

			} else if ( materialNode.DiffuseColor && ( materialNode.DiffuseColor.type === 'Color' || materialNode.DiffuseColor.type === 'ColorRGB' ) ) {

				// The blender exporter exports diffuse here instead of in materialNode.Diffuse
				parameters.color = new THREE.Color().fromArray( materialNode.DiffuseColor.value );

			}

			if ( materialNode.DisplacementFactor ) {

				parameters.displacementScale = materialNode.DisplacementFactor.value;

			}

			if ( materialNode.Emissive ) {

				parameters.emissive = new THREE.Color().fromArray( materialNode.Emissive.value );

			} else if ( materialNode.EmissiveColor && ( materialNode.EmissiveColor.type === 'Color' || materialNode.EmissiveColor.type === 'ColorRGB' ) ) {

				// The blender exporter exports emissive color here instead of in materialNode.Emissive
				parameters.emissive = new THREE.Color().fromArray( materialNode.EmissiveColor.value );

			}

			if ( materialNode.EmissiveFactor ) {

				parameters.emissiveIntensity = parseFloat( materialNode.EmissiveFactor.value );

			}

			if ( materialNode.Opacity ) {

				parameters.opacity = parseFloat( materialNode.Opacity.value );

			}

			if ( parameters.opacity < 1.0 ) {

				parameters.transparent = true;

			}

			if ( materialNode.ReflectionFactor ) {

				parameters.reflectivity = materialNode.ReflectionFactor.value;

			}

			if ( materialNode.Shininess ) {

				parameters.shininess = materialNode.Shininess.value;

			}

			if ( materialNode.Specular ) {

				parameters.specular = new THREE.Color().fromArray( materialNode.Specular.value );

			} else if ( materialNode.SpecularColor && materialNode.SpecularColor.type === 'Color' ) {

				// The blender exporter exports specular color here instead of in materialNode.Specular
				parameters.specular = new THREE.Color().fromArray( materialNode.SpecularColor.value );

			}

			const scope = this;
			connections.get( ID ).children.forEach( function ( child ) {

				const type = child.relationship;

				switch ( type ) {

					case 'Bump':
						parameters.bumpMap = scope.getTexture( textureMap, child.ID );
						break;

					case 'Maya|TEX_ao_map':
						parameters.aoMap = scope.getTexture( textureMap, child.ID );
						break;

					case 'DiffuseColor':
					case 'Maya|TEX_color_map':
						parameters.map = scope.getTexture( textureMap, child.ID );

						if ( parameters.map !== undefined ) {

							parameters.map.encoding = THREE.sRGBEncoding;

						}

						break;

					case 'DisplacementColor':
						parameters.displacementMap = scope.getTexture( textureMap, child.ID );
						break;

					case 'EmissiveColor':
						parameters.emissiveMap = scope.getTexture( textureMap, child.ID );

						if ( parameters.emissiveMap !== undefined ) {

							parameters.emissiveMap.encoding = THREE.sRGBEncoding;

						}

						break;

					case 'NormalMap':
					case 'Maya|TEX_normal_map':
						parameters.normalMap = scope.getTexture( textureMap, child.ID );
						break;

					case 'ReflectionColor':
						parameters.envMap = scope.getTexture( textureMap, child.ID );

						if ( parameters.envMap !== undefined ) {

							parameters.envMap.mapping = THREE.EquirectangularReflectionMapping;
							parameters.envMap.encoding = THREE.sRGBEncoding;

						}

						break;

					case 'SpecularColor':
						parameters.specularMap = scope.getTexture( textureMap, child.ID );

						if ( parameters.specularMap !== undefined ) {

							parameters.specularMap.encoding = THREE.sRGBEncoding;

						}

						break;

					case 'TransparentColor':
					case 'TransparencyFactor':
						parameters.alphaMap = scope.getTexture( textureMap, child.ID );
						parameters.transparent = true;
						break;

					case 'AmbientColor':
					case 'ShininessExponent': // AKA glossiness map

					case 'SpecularFactor': // AKA specularLevel

					case 'VectorDisplacementColor': // NOTE: Seems to be a copy of DisplacementColor

					default:
						console.warn( 'THREE.FBXLoader: %s map is not supported in three.js, skipping texture.', type );
						break;

				}

			} );
			return parameters;

		} // get a texture from the textureMap for use by a material.


		getTexture( textureMap, id ) {

			// if the texture is a layered texture, just use the first layer and issue a warning
			if ( 'LayeredTexture' in fbxTree.Objects && id in fbxTree.Objects.LayeredTexture ) {

				console.warn( 'THREE.FBXLoader: layered textures are not supported in three.js. Discarding all but first layer.' );
				id = connections.get( id ).children[ 0 ].ID;

			}

			return textureMap.get( id );

		} // Parse nodes in FBXTree.Objects.Deformer
		// Deformer node can contain skinning or Vertex Cache animation data, however only skinning is supported here
		// Generates map of THREE.Skeleton-like objects for use later when generating and binding skeletons.


		parseDeformers() {

			const skeletons = {};
			const morphTargets = {};

			if ( 'Deformer' in fbxTree.Objects ) {

				const DeformerNodes = fbxTree.Objects.Deformer;

				for ( const nodeID in DeformerNodes ) {

					const deformerNode = DeformerNodes[ nodeID ];
					const relationships = connections.get( parseInt( nodeID ) );

					if ( deformerNode.attrType === 'Skin' ) {

						const skeleton = this.parseSkeleton( relationships, DeformerNodes );
						skeleton.ID = nodeID;
						if ( relationships.parents.length > 1 ) console.warn( 'THREE.FBXLoader: skeleton attached to more than one geometry is not supported.' );
						skeleton.geometryID = relationships.parents[ 0 ].ID;
						skeletons[ nodeID ] = skeleton;

					} else if ( deformerNode.attrType === 'BlendShape' ) {

						const morphTarget = {
							id: nodeID
						};
						morphTarget.rawTargets = this.parseMorphTargets( relationships, DeformerNodes );
						morphTarget.id = nodeID;
						if ( relationships.parents.length > 1 ) console.warn( 'THREE.FBXLoader: morph target attached to more than one geometry is not supported.' );
						morphTargets[ nodeID ] = morphTarget;

					}

				}

			}

			return {
				skeletons: skeletons,
				morphTargets: morphTargets
			};

		} // Parse single nodes in FBXTree.Objects.Deformer
		// The top level skeleton node has type 'Skin' and sub nodes have type 'Cluster'
		// Each skin node represents a skeleton and each cluster node represents a bone


		parseSkeleton( relationships, deformerNodes ) {

			const rawBones = [];
			relationships.children.forEach( function ( child ) {

				const boneNode = deformerNodes[ child.ID ];
				if ( boneNode.attrType !== 'Cluster' ) return;
				const rawBone = {
					ID: child.ID,
					indices: [],
					weights: [],
					transformLink: new THREE.Matrix4().fromArray( boneNode.TransformLink.a ) // transform: new THREE.Matrix4().fromArray( boneNode.Transform.a ),
					// linkMode: boneNode.Mode,

				};

				if ( 'Indexes' in boneNode ) {

					rawBone.indices = boneNode.Indexes.a;
					rawBone.weights = boneNode.Weights.a;

				}

				rawBones.push( rawBone );

			} );
			return {
				rawBones: rawBones,
				bones: []
			};

		} // The top level morph deformer node has type "BlendShape" and sub nodes have type "BlendShapeChannel"


		parseMorphTargets( relationships, deformerNodes ) {

			const rawMorphTargets = [];

			for ( let i = 0; i < relationships.children.length; i ++ ) {

				const child = relationships.children[ i ];
				const morphTargetNode = deformerNodes[ child.ID ];
				const rawMorphTarget = {
					name: morphTargetNode.attrName,
					initialWeight: morphTargetNode.DeformPercent,
					id: morphTargetNode.id,
					fullWeights: morphTargetNode.FullWeights.a
				};
				if ( morphTargetNode.attrType !== 'BlendShapeChannel' ) return;
				rawMorphTarget.geoID = connections.get( parseInt( child.ID ) ).children.filter( function ( child ) {

					return child.relationship === undefined;

				} )[ 0 ].ID;
				rawMorphTargets.push( rawMorphTarget );

			}

			return rawMorphTargets;

		} // create the main THREE.Group() to be returned by the loader


		parseScene( deformers, geometryMap, materialMap ) {

			sceneGraph = new THREE.Group();
			const modelMap = this.parseModels( deformers.skeletons, geometryMap, materialMap );
			const modelNodes = fbxTree.Objects.Model;
			const scope = this;
			modelMap.forEach( function ( model ) {

				const modelNode = modelNodes[ model.ID ];
				scope.setLookAtProperties( model, modelNode );
				const parentConnections = connections.get( model.ID ).parents;
				parentConnections.forEach( function ( connection ) {

					const parent = modelMap.get( connection.ID );
					if ( parent !== undefined ) parent.add( model );

				} );

				if ( model.parent === null ) {

					sceneGraph.add( model );

				}

			} );
			this.bindSkeleton( deformers.skeletons, geometryMap, modelMap );
			this.createAmbientLight();
			sceneGraph.traverse( function ( node ) {

				if ( node.userData.transformData ) {

					if ( node.parent ) {

						node.userData.transformData.parentMatrix = node.parent.matrix;
						node.userData.transformData.parentMatrixWorld = node.parent.matrixWorld;

					}

					const transform = generateTransform( node.userData.transformData );
					node.applyMatrix4( transform );
					node.updateWorldMatrix();

				}

			} );
			const animations = new AnimationParser().parse(); // if all the models where already combined in a single group, just return that

			if ( sceneGraph.children.length === 1 && sceneGraph.children[ 0 ].isGroup ) {

				sceneGraph.children[ 0 ].animations = animations;
				sceneGraph = sceneGraph.children[ 0 ];

			}

			sceneGraph.animations = animations;

		} // parse nodes in FBXTree.Objects.Model


		parseModels( skeletons, geometryMap, materialMap ) {

			const modelMap = new Map();
			const modelNodes = fbxTree.Objects.Model;

			for ( const nodeID in modelNodes ) {

				const id = parseInt( nodeID );
				const node = modelNodes[ nodeID ];
				const relationships = connections.get( id );
				let model = this.buildSkeleton( relationships, skeletons, id, node.attrName );

				if ( ! model ) {

					switch ( node.attrType ) {

						case 'Camera':
							model = this.createCamera( relationships );
							break;

						case 'Light':
							model = this.createLight( relationships );
							break;

						case 'Mesh':
							model = this.createMesh( relationships, geometryMap, materialMap );
							break;

						case 'NurbsCurve':
							model = this.createCurve( relationships, geometryMap );
							break;

						case 'LimbNode':
						case 'Root':
							model = new THREE.Bone();
							break;

						case 'Null':
						default:
							model = new THREE.Group();
							break;

					}

					model.name = node.attrName ? THREE.PropertyBinding.sanitizeNodeName( node.attrName ) : '';
					model.ID = id;

				}

				this.getTransformData( model, node );
				modelMap.set( id, model );

			}

			return modelMap;

		}

		buildSkeleton( relationships, skeletons, id, name ) {

			let bone = null;
			relationships.parents.forEach( function ( parent ) {

				for ( const ID in skeletons ) {

					const skeleton = skeletons[ ID ];
					skeleton.rawBones.forEach( function ( rawBone, i ) {

						if ( rawBone.ID === parent.ID ) {

							const subBone = bone;
							bone = new THREE.Bone();
							bone.matrixWorld.copy( rawBone.transformLink ); // set name and id here - otherwise in cases where "subBone" is created it will not have a name / id

							bone.name = name ? THREE.PropertyBinding.sanitizeNodeName( name ) : '';
							bone.ID = id;
							skeleton.bones[ i ] = bone; // In cases where a bone is shared between multiple meshes
							// duplicate the bone here and and it as a child of the first bone

							if ( subBone !== null ) {

								bone.add( subBone );

							}

						}

					} );

				}

			} );
			return bone;

		} // create a THREE.PerspectiveCamera or THREE.OrthographicCamera


		createCamera( relationships ) {

			let model;
			let cameraAttribute;
			relationships.children.forEach( function ( child ) {

				const attr = fbxTree.Objects.NodeAttribute[ child.ID ];

				if ( attr !== undefined ) {

					cameraAttribute = attr;

				}

			} );

			if ( cameraAttribute === undefined ) {

				model = new THREE.Object3D();

			} else {

				let type = 0;

				if ( cameraAttribute.CameraProjectionType !== undefined && cameraAttribute.CameraProjectionType.value === 1 ) {

					type = 1;

				}

				let nearClippingPlane = 1;

				if ( cameraAttribute.NearPlane !== undefined ) {

					nearClippingPlane = cameraAttribute.NearPlane.value / 1000;

				}

				let farClippingPlane = 1000;

				if ( cameraAttribute.FarPlane !== undefined ) {

					farClippingPlane = cameraAttribute.FarPlane.value / 1000;

				}

				let width = window.innerWidth;
				let height = window.innerHeight;

				if ( cameraAttribute.AspectWidth !== undefined && cameraAttribute.AspectHeight !== undefined ) {

					width = cameraAttribute.AspectWidth.value;
					height = cameraAttribute.AspectHeight.value;

				}

				const aspect = width / height;
				let fov = 45;

				if ( cameraAttribute.FieldOfView !== undefined ) {

					fov = cameraAttribute.FieldOfView.value;

				}

				const focalLength = cameraAttribute.FocalLength ? cameraAttribute.FocalLength.value : null;

				switch ( type ) {

					case 0:
						// Perspective
						model = new THREE.PerspectiveCamera( fov, aspect, nearClippingPlane, farClippingPlane );
						if ( focalLength !== null ) model.setFocalLength( focalLength );
						break;

					case 1:
						// Orthographic
						model = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, nearClippingPlane, farClippingPlane );
						break;

					default:
						console.warn( 'THREE.FBXLoader: Unknown camera type ' + type + '.' );
						model = new THREE.Object3D();
						break;

				}

			}

			return model;

		} // Create a THREE.DirectionalLight, THREE.PointLight or THREE.SpotLight


		createLight( relationships ) {

			let model;
			let lightAttribute;
			relationships.children.forEach( function ( child ) {

				const attr = fbxTree.Objects.NodeAttribute[ child.ID ];

				if ( attr !== undefined ) {

					lightAttribute = attr;

				}

			} );

			if ( lightAttribute === undefined ) {

				model = new THREE.Object3D();

			} else {

				let type; // LightType can be undefined for Point lights

				if ( lightAttribute.LightType === undefined ) {

					type = 0;

				} else {

					type = lightAttribute.LightType.value;

				}

				let color = 0xffffff;

				if ( lightAttribute.Color !== undefined ) {

					color = new THREE.Color().fromArray( lightAttribute.Color.value );

				}

				let intensity = lightAttribute.Intensity === undefined ? 1 : lightAttribute.Intensity.value / 100; // light disabled

				if ( lightAttribute.CastLightOnObject !== undefined && lightAttribute.CastLightOnObject.value === 0 ) {

					intensity = 0;

				}

				let distance = 0;

				if ( lightAttribute.FarAttenuationEnd !== undefined ) {

					if ( lightAttribute.EnableFarAttenuation !== undefined && lightAttribute.EnableFarAttenuation.value === 0 ) {

						distance = 0;

					} else {

						distance = lightAttribute.FarAttenuationEnd.value;

					}

				} // TODO: could this be calculated linearly from FarAttenuationStart to FarAttenuationEnd?


				const decay = 1;

				switch ( type ) {

					case 0:
						// Point
						model = new THREE.PointLight( color, intensity, distance, decay );
						break;

					case 1:
						// Directional
						model = new THREE.DirectionalLight( color, intensity );
						break;

					case 2:
						// Spot
						let angle = Math.PI / 3;

						if ( lightAttribute.InnerAngle !== undefined ) {

							angle = THREE.MathUtils.degToRad( lightAttribute.InnerAngle.value );

						}

						let penumbra = 0;

						if ( lightAttribute.OuterAngle !== undefined ) {

							// TODO: this is not correct - FBX calculates outer and inner angle in degrees
							// with OuterAngle > InnerAngle && OuterAngle <= Math.PI
							// while three.js uses a penumbra between (0, 1) to attenuate the inner angle
							penumbra = THREE.MathUtils.degToRad( lightAttribute.OuterAngle.value );
							penumbra = Math.max( penumbra, 1 );

						}

						model = new THREE.SpotLight( color, intensity, distance, angle, penumbra, decay );
						break;

					default:
						console.warn( 'THREE.FBXLoader: Unknown light type ' + lightAttribute.LightType.value + ', defaulting to a THREE.PointLight.' );
						model = new THREE.PointLight( color, intensity );
						break;

				}

				if ( lightAttribute.CastShadows !== undefined && lightAttribute.CastShadows.value === 1 ) {

					model.castShadow = true;

				}

			}

			return model;

		}

		createMesh( relationships, geometryMap, materialMap ) {

			let model;
			let geometry = null;
			let material = null;
			const materials = []; // get geometry and materials(s) from connections

			relationships.children.forEach( function ( child ) {

				if ( geometryMap.has( child.ID ) ) {

					geometry = geometryMap.get( child.ID );

				}

				if ( materialMap.has( child.ID ) ) {

					materials.push( materialMap.get( child.ID ) );

				}

			} );

			if ( materials.length > 1 ) {

				material = materials;

			} else if ( materials.length > 0 ) {

				material = materials[ 0 ];

			} else {

				material = new THREE.MeshPhongMaterial( {
					color: 0xcccccc
				} );
				materials.push( material );

			}

			if ( 'color' in geometry.attributes ) {

				materials.forEach( function ( material ) {

					material.vertexColors = true;

				} );

			}

			if ( geometry.FBX_Deformer ) {

				model = new THREE.SkinnedMesh( geometry, material );
				model.normalizeSkinWeights();

			} else {

				model = new THREE.Mesh( geometry, material );

			}

			return model;

		}

		createCurve( relationships, geometryMap ) {

			const geometry = relationships.children.reduce( function ( geo, child ) {

				if ( geometryMap.has( child.ID ) ) geo = geometryMap.get( child.ID );
				return geo;

			}, null ); // FBX does not list materials for Nurbs lines, so we'll just put our own in here.

			const material = new THREE.LineBasicMaterial( {
				color: 0x3300ff,
				linewidth: 1
			} );
			return new THREE.Line( geometry, material );

		} // parse the model node for transform data


		getTransformData( model, modelNode ) {

			const transformData = {};
			if ( 'InheritType' in modelNode ) transformData.inheritType = parseInt( modelNode.InheritType.value );
			if ( 'RotationOrder' in modelNode ) transformData.eulerOrder = getEulerOrder( modelNode.RotationOrder.value ); else transformData.eulerOrder = 'ZYX';
			if ( 'Lcl_Translation' in modelNode ) transformData.translation = modelNode.Lcl_Translation.value;
			if ( 'PreRotation' in modelNode ) transformData.preRotation = modelNode.PreRotation.value;
			if ( 'Lcl_Rotation' in modelNode ) transformData.rotation = modelNode.Lcl_Rotation.value;
			if ( 'PostRotation' in modelNode ) transformData.postRotation = modelNode.PostRotation.value;
			if ( 'Lcl_Scaling' in modelNode ) transformData.scale = modelNode.Lcl_Scaling.value;
			if ( 'ScalingOffset' in modelNode ) transformData.scalingOffset = modelNode.ScalingOffset.value;
			if ( 'ScalingPivot' in modelNode ) transformData.scalingPivot = modelNode.ScalingPivot.value;
			if ( 'RotationOffset' in modelNode ) transformData.rotationOffset = modelNode.RotationOffset.value;
			if ( 'RotationPivot' in modelNode ) transformData.rotationPivot = modelNode.RotationPivot.value;
			model.userData.transformData = transformData;

		}

		setLookAtProperties( model, modelNode ) {

			if ( 'LookAtProperty' in modelNode ) {

				const children = connections.get( model.ID ).children;
				children.forEach( function ( child ) {

					if ( child.relationship === 'LookAtProperty' ) {

						const lookAtTarget = fbxTree.Objects.Model[ child.ID ];

						if ( 'Lcl_Translation' in lookAtTarget ) {

							const pos = lookAtTarget.Lcl_Translation.value; // THREE.DirectionalLight, THREE.SpotLight

							if ( model.target !== undefined ) {

								model.target.position.fromArray( pos );
								sceneGraph.add( model.target );

							} else {

								// Cameras and other Object3Ds
								model.lookAt( new THREE.Vector3().fromArray( pos ) );

							}

						}

					}

				} );

			}

		}

		bindSkeleton( skeletons, geometryMap, modelMap ) {

			const bindMatrices = this.parsePoseNodes();

			for ( const ID in skeletons ) {

				const skeleton = skeletons[ ID ];
				const parents = connections.get( parseInt( skeleton.ID ) ).parents;
				parents.forEach( function ( parent ) {

					if ( geometryMap.has( parent.ID ) ) {

						const geoID = parent.ID;
						const geoRelationships = connections.get( geoID );
						geoRelationships.parents.forEach( function ( geoConnParent ) {

							if ( modelMap.has( geoConnParent.ID ) ) {

								const model = modelMap.get( geoConnParent.ID );
								model.bind( new THREE.Skeleton( skeleton.bones ), bindMatrices[ geoConnParent.ID ] );

							}

						} );

					}

				} );

			}

		}

		parsePoseNodes() {

			const bindMatrices = {};

			if ( 'Pose' in fbxTree.Objects ) {

				const BindPoseNode = fbxTree.Objects.Pose;

				for ( const nodeID in BindPoseNode ) {

					if ( BindPoseNode[ nodeID ].attrType === 'BindPose' && BindPoseNode[ nodeID ].NbPoseNodes > 0 ) {

						const poseNodes = BindPoseNode[ nodeID ].PoseNode;

						if ( Array.isArray( poseNodes ) ) {

							poseNodes.forEach( function ( poseNode ) {

								bindMatrices[ poseNode.Node ] = new THREE.Matrix4().fromArray( poseNode.Matrix.a );

							} );

						} else {

							bindMatrices[ poseNodes.Node ] = new THREE.Matrix4().fromArray( poseNodes.Matrix.a );

						}

					}

				}

			}

			return bindMatrices;

		} // Parse ambient color in FBXTree.GlobalSettings - if it's not set to black (default), create an ambient light


		createAmbientLight() {

			if ( 'GlobalSettings' in fbxTree && 'AmbientColor' in fbxTree.GlobalSettings ) {

				const ambientColor = fbxTree.GlobalSettings.AmbientColor.value;
				const r = ambientColor[ 0 ];
				const g = ambientColor[ 1 ];
				const b = ambientColor[ 2 ];

				if ( r !== 0 || g !== 0 || b !== 0 ) {

					const color = new THREE.Color( r, g, b );
					sceneGraph.add( new THREE.AmbientLight( color, 1 ) );

				}

			}

		}

	} // parse Geometry data from FBXTree and return map of BufferGeometries


	class GeometryParser {

		// Parse nodes in FBXTree.Objects.Geometry
		parse( deformers ) {

			const geometryMap = new Map();

			if ( 'Geometry' in fbxTree.Objects ) {

				const geoNodes = fbxTree.Objects.Geometry;

				for ( const nodeID in geoNodes ) {

					const relationships = connections.get( parseInt( nodeID ) );
					const geo = this.parseGeometry( relationships, geoNodes[ nodeID ], deformers );
					geometryMap.set( parseInt( nodeID ), geo );

				}

			}

			return geometryMap;

		} // Parse single node in FBXTree.Objects.Geometry


		parseGeometry( relationships, geoNode, deformers ) {

			switch ( geoNode.attrType ) {

				case 'Mesh':
					return this.parseMeshGeometry( relationships, geoNode, deformers );
					break;

				case 'NurbsCurve':
					return this.parseNurbsGeometry( geoNode );
					break;

			}

		} // Parse single node mesh geometry in FBXTree.Objects.Geometry


		parseMeshGeometry( relationships, geoNode, deformers ) {

			const skeletons = deformers.skeletons;
			const morphTargets = [];
			const modelNodes = relationships.parents.map( function ( parent ) {

				return fbxTree.Objects.Model[ parent.ID ];

			} ); // don't create geometry if it is not associated with any models

			if ( modelNodes.length === 0 ) return;
			const skeleton = relationships.children.reduce( function ( skeleton, child ) {

				if ( skeletons[ child.ID ] !== undefined ) skeleton = skeletons[ child.ID ];
				return skeleton;

			}, null );
			relationships.children.forEach( function ( child ) {

				if ( deformers.morphTargets[ child.ID ] !== undefined ) {

					morphTargets.push( deformers.morphTargets[ child.ID ] );

				}

			} ); // Assume one model and get the preRotation from that
			// if there is more than one model associated with the geometry this may cause problems

			const modelNode = modelNodes[ 0 ];
			const transformData = {};
			if ( 'RotationOrder' in modelNode ) transformData.eulerOrder = getEulerOrder( modelNode.RotationOrder.value );
			if ( 'InheritType' in modelNode ) transformData.inheritType = parseInt( modelNode.InheritType.value );
			if ( 'GeometricTranslation' in modelNode ) transformData.translation = modelNode.GeometricTranslation.value;
			if ( 'GeometricRotation' in modelNode ) transformData.rotation = modelNode.GeometricRotation.value;
			if ( 'GeometricScaling' in modelNode ) transformData.scale = modelNode.GeometricScaling.value;
			const transform = generateTransform( transformData );
			return this.genGeometry( geoNode, skeleton, morphTargets, transform );

		} // Generate a THREE.BufferGeometry from a node in FBXTree.Objects.Geometry


		genGeometry( geoNode, skeleton, morphTargets, preTransform ) {

			const geo = new THREE.BufferGeometry();
			if ( geoNode.attrName ) geo.name = geoNode.attrName;
			const geoInfo = this.parseGeoNode( geoNode, skeleton );
			const buffers = this.genBuffers( geoInfo );
			const positionAttribute = new THREE.Float32BufferAttribute( buffers.vertex, 3 );
			positionAttribute.applyMatrix4( preTransform );
			geo.setAttribute( 'position', positionAttribute );

			if ( buffers.colors.length > 0 ) {

				geo.setAttribute( 'color', new THREE.Float32BufferAttribute( buffers.colors, 3 ) );

			}

			if ( skeleton ) {

				geo.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( buffers.weightsIndices, 4 ) );
				geo.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( buffers.vertexWeights, 4 ) ); // used later to bind the skeleton to the model

				geo.FBX_Deformer = skeleton;

			}

			if ( buffers.normal.length > 0 ) {

				const normalMatrix = new THREE.Matrix3().getNormalMatrix( preTransform );
				const normalAttribute = new THREE.Float32BufferAttribute( buffers.normal, 3 );
				normalAttribute.applyNormalMatrix( normalMatrix );
				geo.setAttribute( 'normal', normalAttribute );

			}

			buffers.uvs.forEach( function ( uvBuffer, i ) {

				// subsequent uv buffers are called 'uv1', 'uv2', ...
				let name = 'uv' + ( i + 1 ).toString(); // the first uv buffer is just called 'uv'

				if ( i === 0 ) {

					name = 'uv';

				}

				geo.setAttribute( name, new THREE.Float32BufferAttribute( buffers.uvs[ i ], 2 ) );

			} );

			if ( geoInfo.material && geoInfo.material.mappingType !== 'AllSame' ) {

				// Convert the material indices of each vertex into rendering groups on the geometry.
				let prevMaterialIndex = buffers.materialIndex[ 0 ];
				let startIndex = 0;
				buffers.materialIndex.forEach( function ( currentIndex, i ) {

					if ( currentIndex !== prevMaterialIndex ) {

						geo.addGroup( startIndex, i - startIndex, prevMaterialIndex );
						prevMaterialIndex = currentIndex;
						startIndex = i;

					}

				} ); // the loop above doesn't add the last group, do that here.

				if ( geo.groups.length > 0 ) {

					const lastGroup = geo.groups[ geo.groups.length - 1 ];
					const lastIndex = lastGroup.start + lastGroup.count;

					if ( lastIndex !== buffers.materialIndex.length ) {

						geo.addGroup( lastIndex, buffers.materialIndex.length - lastIndex, prevMaterialIndex );

					}

				} // case where there are multiple materials but the whole geometry is only
				// using one of them


				if ( geo.groups.length === 0 ) {

					geo.addGroup( 0, buffers.materialIndex.length, buffers.materialIndex[ 0 ] );

				}

			}

			this.addMorphTargets( geo, geoNode, morphTargets, preTransform );
			return geo;

		}

		parseGeoNode( geoNode, skeleton ) {

			const geoInfo = {};
			geoInfo.vertexPositions = geoNode.Vertices !== undefined ? geoNode.Vertices.a : [];
			geoInfo.vertexIndices = geoNode.PolygonVertexIndex !== undefined ? geoNode.PolygonVertexIndex.a : [];

			if ( geoNode.LayerElementColor ) {

				geoInfo.color = this.parseVertexColors( geoNode.LayerElementColor[ 0 ] );

			}

			if ( geoNode.LayerElementMaterial ) {

				geoInfo.material = this.parseMaterialIndices( geoNode.LayerElementMaterial[ 0 ] );

			}

			if ( geoNode.LayerElementNormal ) {

				geoInfo.normal = this.parseNormals( geoNode.LayerElementNormal[ 0 ] );

			}

			if ( geoNode.LayerElementUV ) {

				geoInfo.uv = [];
				let i = 0;

				while ( geoNode.LayerElementUV[ i ] ) {

					if ( geoNode.LayerElementUV[ i ].UV ) {

						geoInfo.uv.push( this.parseUVs( geoNode.LayerElementUV[ i ] ) );

					}

					i ++;

				}

			}

			geoInfo.weightTable = {};

			if ( skeleton !== null ) {

				geoInfo.skeleton = skeleton;
				skeleton.rawBones.forEach( function ( rawBone, i ) {

					// loop over the bone's vertex indices and weights
					rawBone.indices.forEach( function ( index, j ) {

						if ( geoInfo.weightTable[ index ] === undefined ) geoInfo.weightTable[ index ] = [];
						geoInfo.weightTable[ index ].push( {
							id: i,
							weight: rawBone.weights[ j ]
						} );

					} );

				} );

			}

			return geoInfo;

		}

		genBuffers( geoInfo ) {

			const buffers = {
				vertex: [],
				normal: [],
				colors: [],
				uvs: [],
				materialIndex: [],
				vertexWeights: [],
				weightsIndices: []
			};
			let polygonIndex = 0;
			let faceLength = 0;
			let displayedWeightsWarning = false; // these will hold data for a single face

			let facePositionIndexes = [];
			let faceNormals = [];
			let faceColors = [];
			let faceUVs = [];
			let faceWeights = [];
			let faceWeightIndices = [];
			const scope = this;
			geoInfo.vertexIndices.forEach( function ( vertexIndex, polygonVertexIndex ) {

				let materialIndex;
				let endOfFace = false; // Face index and vertex index arrays are combined in a single array
				// A cube with quad faces looks like this:
				// PolygonVertexIndex: *24 {
				//  a: 0, 1, 3, -3, 2, 3, 5, -5, 4, 5, 7, -7, 6, 7, 1, -1, 1, 7, 5, -4, 6, 0, 2, -5
				//  }
				// Negative numbers mark the end of a face - first face here is 0, 1, 3, -3
				// to find index of last vertex bit shift the index: ^ - 1

				if ( vertexIndex < 0 ) {

					vertexIndex = vertexIndex ^ - 1; // equivalent to ( x * -1 ) - 1

					endOfFace = true;

				}

				let weightIndices = [];
				let weights = [];
				facePositionIndexes.push( vertexIndex * 3, vertexIndex * 3 + 1, vertexIndex * 3 + 2 );

				if ( geoInfo.color ) {

					const data = getData( polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.color );
					faceColors.push( data[ 0 ], data[ 1 ], data[ 2 ] );

				}

				if ( geoInfo.skeleton ) {

					if ( geoInfo.weightTable[ vertexIndex ] !== undefined ) {

						geoInfo.weightTable[ vertexIndex ].forEach( function ( wt ) {

							weights.push( wt.weight );
							weightIndices.push( wt.id );

						} );

					}

					if ( weights.length > 4 ) {

						if ( ! displayedWeightsWarning ) {

							console.warn( 'THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights.' );
							displayedWeightsWarning = true;

						}

						const wIndex = [ 0, 0, 0, 0 ];
						const Weight = [ 0, 0, 0, 0 ];
						weights.forEach( function ( weight, weightIndex ) {

							let currentWeight = weight;
							let currentIndex = weightIndices[ weightIndex ];
							Weight.forEach( function ( comparedWeight, comparedWeightIndex, comparedWeightArray ) {

								if ( currentWeight > comparedWeight ) {

									comparedWeightArray[ comparedWeightIndex ] = currentWeight;
									currentWeight = comparedWeight;
									const tmp = wIndex[ comparedWeightIndex ];
									wIndex[ comparedWeightIndex ] = currentIndex;
									currentIndex = tmp;

								}

							} );

						} );
						weightIndices = wIndex;
						weights = Weight;

					} // if the weight array is shorter than 4 pad with 0s


					while ( weights.length < 4 ) {

						weights.push( 0 );
						weightIndices.push( 0 );

					}

					for ( let i = 0; i < 4; ++ i ) {

						faceWeights.push( weights[ i ] );
						faceWeightIndices.push( weightIndices[ i ] );

					}

				}

				if ( geoInfo.normal ) {

					const data = getData( polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.normal );
					faceNormals.push( data[ 0 ], data[ 1 ], data[ 2 ] );

				}

				if ( geoInfo.material && geoInfo.material.mappingType !== 'AllSame' ) {

					materialIndex = getData( polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.material )[ 0 ];

				}

				if ( geoInfo.uv ) {

					geoInfo.uv.forEach( function ( uv, i ) {

						const data = getData( polygonVertexIndex, polygonIndex, vertexIndex, uv );

						if ( faceUVs[ i ] === undefined ) {

							faceUVs[ i ] = [];

						}

						faceUVs[ i ].push( data[ 0 ] );
						faceUVs[ i ].push( data[ 1 ] );

					} );

				}

				faceLength ++;

				if ( endOfFace ) {

					scope.genFace( buffers, geoInfo, facePositionIndexes, materialIndex, faceNormals, faceColors, faceUVs, faceWeights, faceWeightIndices, faceLength );
					polygonIndex ++;
					faceLength = 0; // reset arrays for the next face

					facePositionIndexes = [];
					faceNormals = [];
					faceColors = [];
					faceUVs = [];
					faceWeights = [];
					faceWeightIndices = [];

				}

			} );
			return buffers;

		} // Generate data for a single face in a geometry. If the face is a quad then split it into 2 tris


		genFace( buffers, geoInfo, facePositionIndexes, materialIndex, faceNormals, faceColors, faceUVs, faceWeights, faceWeightIndices, faceLength ) {

			for ( let i = 2; i < faceLength; i ++ ) {

				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ 0 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ 1 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ 2 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ ( i - 1 ) * 3 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ ( i - 1 ) * 3 + 1 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ ( i - 1 ) * 3 + 2 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ i * 3 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ i * 3 + 1 ] ] );
				buffers.vertex.push( geoInfo.vertexPositions[ facePositionIndexes[ i * 3 + 2 ] ] );

				if ( geoInfo.skeleton ) {

					buffers.vertexWeights.push( faceWeights[ 0 ] );
					buffers.vertexWeights.push( faceWeights[ 1 ] );
					buffers.vertexWeights.push( faceWeights[ 2 ] );
					buffers.vertexWeights.push( faceWeights[ 3 ] );
					buffers.vertexWeights.push( faceWeights[ ( i - 1 ) * 4 ] );
					buffers.vertexWeights.push( faceWeights[ ( i - 1 ) * 4 + 1 ] );
					buffers.vertexWeights.push( faceWeights[ ( i - 1 ) * 4 + 2 ] );
					buffers.vertexWeights.push( faceWeights[ ( i - 1 ) * 4 + 3 ] );
					buffers.vertexWeights.push( faceWeights[ i * 4 ] );
					buffers.vertexWeights.push( faceWeights[ i * 4 + 1 ] );
					buffers.vertexWeights.push( faceWeights[ i * 4 + 2 ] );
					buffers.vertexWeights.push( faceWeights[ i * 4 + 3 ] );
					buffers.weightsIndices.push( faceWeightIndices[ 0 ] );
					buffers.weightsIndices.push( faceWeightIndices[ 1 ] );
					buffers.weightsIndices.push( faceWeightIndices[ 2 ] );
					buffers.weightsIndices.push( faceWeightIndices[ 3 ] );
					buffers.weightsIndices.push( faceWeightIndices[ ( i - 1 ) * 4 ] );
					buffers.weightsIndices.push( faceWeightIndices[ ( i - 1 ) * 4 + 1 ] );
					buffers.weightsIndices.push( faceWeightIndices[ ( i - 1 ) * 4 + 2 ] );
					buffers.weightsIndices.push( faceWeightIndices[ ( i - 1 ) * 4 + 3 ] );
					buffers.weightsIndices.push( faceWeightIndices[ i * 4 ] );
					buffers.weightsIndices.push( faceWeightIndices[ i * 4 + 1 ] );
					buffers.weightsIndices.push( faceWeightIndices[ i * 4 + 2 ] );
					buffers.weightsIndices.push( faceWeightIndices[ i * 4 + 3 ] );

				}

				if ( geoInfo.color ) {

					buffers.colors.push( faceColors[ 0 ] );
					buffers.colors.push( faceColors[ 1 ] );
					buffers.colors.push( faceColors[ 2 ] );
					buffers.colors.push( faceColors[ ( i - 1 ) * 3 ] );
					buffers.colors.push( faceColors[ ( i - 1 ) * 3 + 1 ] );
					buffers.colors.push( faceColors[ ( i - 1 ) * 3 + 2 ] );
					buffers.colors.push( faceColors[ i * 3 ] );
					buffers.colors.push( faceColors[ i * 3 + 1 ] );
					buffers.colors.push( faceColors[ i * 3 + 2 ] );

				}

				if ( geoInfo.material && geoInfo.material.mappingType !== 'AllSame' ) {

					buffers.materialIndex.push( materialIndex );
					buffers.materialIndex.push( materialIndex );
					buffers.materialIndex.push( materialIndex );

				}

				if ( geoInfo.normal ) {

					buffers.normal.push( faceNormals[ 0 ] );
					buffers.normal.push( faceNormals[ 1 ] );
					buffers.normal.push( faceNormals[ 2 ] );
					buffers.normal.push( faceNormals[ ( i - 1 ) * 3 ] );
					buffers.normal.push( faceNormals[ ( i - 1 ) * 3 + 1 ] );
					buffers.normal.push( faceNormals[ ( i - 1 ) * 3 + 2 ] );
					buffers.normal.push( faceNormals[ i * 3 ] );
					buffers.normal.push( faceNormals[ i * 3 + 1 ] );
					buffers.normal.push( faceNormals[ i * 3 + 2 ] );

				}

				if ( geoInfo.uv ) {

					geoInfo.uv.forEach( function ( uv, j ) {

						if ( buffers.uvs[ j ] === undefined ) buffers.uvs[ j ] = [];
						buffers.uvs[ j ].push( faceUVs[ j ][ 0 ] );
						buffers.uvs[ j ].push( faceUVs[ j ][ 1 ] );
						buffers.uvs[ j ].push( faceUVs[ j ][ ( i - 1 ) * 2 ] );
						buffers.uvs[ j ].push( faceUVs[ j ][ ( i - 1 ) * 2 + 1 ] );
						buffers.uvs[ j ].push( faceUVs[ j ][ i * 2 ] );
						buffers.uvs[ j ].push( faceUVs[ j ][ i * 2 + 1 ] );

					} );

				}

			}

		}

		addMorphTargets( parentGeo, parentGeoNode, morphTargets, preTransform ) {

			if ( morphTargets.length === 0 ) return;
			parentGeo.morphTargetsRelative = true;
			parentGeo.morphAttributes.position = []; // parentGeo.morphAttributes.normal = []; // not implemented

			const scope = this;
			morphTargets.forEach( function ( morphTarget ) {

				morphTarget.rawTargets.forEach( function ( rawTarget ) {

					const morphGeoNode = fbxTree.Objects.Geometry[ rawTarget.geoID ];

					if ( morphGeoNode !== undefined ) {

						scope.genMorphGeometry( parentGeo, parentGeoNode, morphGeoNode, preTransform, rawTarget.name );

					}

				} );

			} );

		} // a morph geometry node is similar to a standard  node, and the node is also contained
		// in FBXTree.Objects.Geometry, however it can only have attributes for position, normal
		// and a special attribute Index defining which vertices of the original geometry are affected
		// Normal and position attributes only have data for the vertices that are affected by the morph


		genMorphGeometry( parentGeo, parentGeoNode, morphGeoNode, preTransform, name ) {

			const vertexIndices = parentGeoNode.PolygonVertexIndex !== undefined ? parentGeoNode.PolygonVertexIndex.a : [];
			const morphPositionsSparse = morphGeoNode.Vertices !== undefined ? morphGeoNode.Vertices.a : [];
			const indices = morphGeoNode.Indexes !== undefined ? morphGeoNode.Indexes.a : [];
			const length = parentGeo.attributes.position.count * 3;
			const morphPositions = new Float32Array( length );

			for ( let i = 0; i < indices.length; i ++ ) {

				const morphIndex = indices[ i ] * 3;
				morphPositions[ morphIndex ] = morphPositionsSparse[ i * 3 ];
				morphPositions[ morphIndex + 1 ] = morphPositionsSparse[ i * 3 + 1 ];
				morphPositions[ morphIndex + 2 ] = morphPositionsSparse[ i * 3 + 2 ];

			} // TODO: add morph normal support


			const morphGeoInfo = {
				vertexIndices: vertexIndices,
				vertexPositions: morphPositions
			};
			const morphBuffers = this.genBuffers( morphGeoInfo );
			const positionAttribute = new THREE.Float32BufferAttribute( morphBuffers.vertex, 3 );
			positionAttribute.name = name || morphGeoNode.attrName;
			positionAttribute.applyMatrix4( preTransform );
			parentGeo.morphAttributes.position.push( positionAttribute );

		} // Parse normal from FBXTree.Objects.Geometry.LayerElementNormal if it exists


		parseNormals( NormalNode ) {

			const mappingType = NormalNode.MappingInformationType;
			const referenceType = NormalNode.ReferenceInformationType;
			const buffer = NormalNode.Normals.a;
			let indexBuffer = [];

			if ( referenceType === 'IndexToDirect' ) {

				if ( 'NormalIndex' in NormalNode ) {

					indexBuffer = NormalNode.NormalIndex.a;

				} else if ( 'NormalsIndex' in NormalNode ) {

					indexBuffer = NormalNode.NormalsIndex.a;

				}

			}

			return {
				dataSize: 3,
				buffer: buffer,
				indices: indexBuffer,
				mappingType: mappingType,
				referenceType: referenceType
			};

		} // Parse UVs from FBXTree.Objects.Geometry.LayerElementUV if it exists


		parseUVs( UVNode ) {

			const mappingType = UVNode.MappingInformationType;
			const referenceType = UVNode.ReferenceInformationType;
			const buffer = UVNode.UV.a;
			let indexBuffer = [];

			if ( referenceType === 'IndexToDirect' ) {

				indexBuffer = UVNode.UVIndex.a;

			}

			return {
				dataSize: 2,
				buffer: buffer,
				indices: indexBuffer,
				mappingType: mappingType,
				referenceType: referenceType
			};

		} // Parse Vertex Colors from FBXTree.Objects.Geometry.LayerElementColor if it exists


		parseVertexColors( ColorNode ) {

			const mappingType = ColorNode.MappingInformationType;
			const referenceType = ColorNode.ReferenceInformationType;
			const buffer = ColorNode.Colors.a;
			let indexBuffer = [];

			if ( referenceType === 'IndexToDirect' ) {

				indexBuffer = ColorNode.ColorIndex.a;

			}

			return {
				dataSize: 4,
				buffer: buffer,
				indices: indexBuffer,
				mappingType: mappingType,
				referenceType: referenceType
			};

		} // Parse mapping and material data in FBXTree.Objects.Geometry.LayerElementMaterial if it exists


		parseMaterialIndices( MaterialNode ) {

			const mappingType = MaterialNode.MappingInformationType;
			const referenceType = MaterialNode.ReferenceInformationType;

			if ( mappingType === 'NoMappingInformation' ) {

				return {
					dataSize: 1,
					buffer: [ 0 ],
					indices: [ 0 ],
					mappingType: 'AllSame',
					referenceType: referenceType
				};

			}

			const materialIndexBuffer = MaterialNode.Materials.a; // Since materials are stored as indices, there's a bit of a mismatch between FBX and what
			// we expect.So we create an intermediate buffer that points to the index in the buffer,
			// for conforming with the other functions we've written for other data.

			const materialIndices = [];

			for ( let i = 0; i < materialIndexBuffer.length; ++ i ) {

				materialIndices.push( i );

			}

			return {
				dataSize: 1,
				buffer: materialIndexBuffer,
				indices: materialIndices,
				mappingType: mappingType,
				referenceType: referenceType
			};

		} // Generate a NurbGeometry from a node in FBXTree.Objects.Geometry


		parseNurbsGeometry( geoNode ) {

			if ( THREE.NURBSCurve === undefined ) {

				console.error( 'THREE.FBXLoader: The loader relies on THREE.NURBSCurve for any nurbs present in the model. Nurbs will show up as empty geometry.' );
				return new THREE.BufferGeometry();

			}

			const order = parseInt( geoNode.Order );

			if ( isNaN( order ) ) {

				console.error( 'THREE.FBXLoader: Invalid Order %s given for geometry ID: %s', geoNode.Order, geoNode.id );
				return new THREE.BufferGeometry();

			}

			const degree = order - 1;
			const knots = geoNode.KnotVector.a;
			const controlPoints = [];
			const pointsValues = geoNode.Points.a;

			for ( let i = 0, l = pointsValues.length; i < l; i += 4 ) {

				controlPoints.push( new THREE.Vector4().fromArray( pointsValues, i ) );

			}

			let startKnot, endKnot;

			if ( geoNode.Form === 'Closed' ) {

				controlPoints.push( controlPoints[ 0 ] );

			} else if ( geoNode.Form === 'Periodic' ) {

				startKnot = degree;
				endKnot = knots.length - 1 - startKnot;

				for ( let i = 0; i < degree; ++ i ) {

					controlPoints.push( controlPoints[ i ] );

				}

			}

			const curve = new THREE.NURBSCurve( degree, knots, controlPoints, startKnot, endKnot );
			const points = curve.getPoints( controlPoints.length * 12 );
			return new THREE.BufferGeometry().setFromPoints( points );

		}

	} // parse animation data from FBXTree


	class AnimationParser {

		// take raw animation clips and turn them into three.js animation clips
		parse() {

			const animationClips = [];
			const rawClips = this.parseClips();

			if ( rawClips !== undefined ) {

				for ( const key in rawClips ) {

					const rawClip = rawClips[ key ];
					const clip = this.addClip( rawClip );
					animationClips.push( clip );

				}

			}

			return animationClips;

		}

		parseClips() {

			// since the actual transformation data is stored in FBXTree.Objects.AnimationCurve,
			// if this is undefined we can safely assume there are no animations
			if ( fbxTree.Objects.AnimationCurve === undefined ) return undefined;
			const curveNodesMap = this.parseAnimationCurveNodes();
			this.parseAnimationCurves( curveNodesMap );
			const layersMap = this.parseAnimationLayers( curveNodesMap );
			const rawClips = this.parseAnimStacks( layersMap );
			return rawClips;

		} // parse nodes in FBXTree.Objects.AnimationCurveNode
		// each AnimationCurveNode holds data for an animation transform for a model (e.g. left arm rotation )
		// and is referenced by an AnimationLayer


		parseAnimationCurveNodes() {

			const rawCurveNodes = fbxTree.Objects.AnimationCurveNode;
			const curveNodesMap = new Map();

			for ( const nodeID in rawCurveNodes ) {

				const rawCurveNode = rawCurveNodes[ nodeID ];

				if ( rawCurveNode.attrName.match( /S|R|T|DeformPercent/ ) !== null ) {

					const curveNode = {
						id: rawCurveNode.id,
						attr: rawCurveNode.attrName,
						curves: {}
					};
					curveNodesMap.set( curveNode.id, curveNode );

				}

			}

			return curveNodesMap;

		} // parse nodes in FBXTree.Objects.AnimationCurve and connect them up to
		// previously parsed AnimationCurveNodes. Each AnimationCurve holds data for a single animated
		// axis ( e.g. times and values of x rotation)


		parseAnimationCurves( curveNodesMap ) {

			const rawCurves = fbxTree.Objects.AnimationCurve; // TODO: Many values are identical up to roundoff error, but won't be optimised
			// e.g. position times: [0, 0.4, 0. 8]
			// position values: [7.23538335023477e-7, 93.67518615722656, -0.9982695579528809, 7.23538335023477e-7, 93.67518615722656, -0.9982695579528809, 7.235384487103147e-7, 93.67520904541016, -0.9982695579528809]
			// clearly, this should be optimised to
			// times: [0], positions [7.23538335023477e-7, 93.67518615722656, -0.9982695579528809]
			// this shows up in nearly every FBX file, and generally time array is length > 100

			for ( const nodeID in rawCurves ) {

				const animationCurve = {
					id: rawCurves[ nodeID ].id,
					times: rawCurves[ nodeID ].KeyTime.a.map( convertFBXTimeToSeconds ),
					values: rawCurves[ nodeID ].KeyValueFloat.a
				};
				const relationships = connections.get( animationCurve.id );

				if ( relationships !== undefined ) {

					const animationCurveID = relationships.parents[ 0 ].ID;
					const animationCurveRelationship = relationships.parents[ 0 ].relationship;

					if ( animationCurveRelationship.match( /X/ ) ) {

						curveNodesMap.get( animationCurveID ).curves[ 'x' ] = animationCurve;

					} else if ( animationCurveRelationship.match( /Y/ ) ) {

						curveNodesMap.get( animationCurveID ).curves[ 'y' ] = animationCurve;

					} else if ( animationCurveRelationship.match( /Z/ ) ) {

						curveNodesMap.get( animationCurveID ).curves[ 'z' ] = animationCurve;

					} else if ( animationCurveRelationship.match( /d|DeformPercent/ ) && curveNodesMap.has( animationCurveID ) ) {

						curveNodesMap.get( animationCurveID ).curves[ 'morph' ] = animationCurve;

					}

				}

			}

		} // parse nodes in FBXTree.Objects.AnimationLayer. Each layers holds references
		// to various AnimationCurveNodes and is referenced by an AnimationStack node
		// note: theoretically a stack can have multiple layers, however in practice there always seems to be one per stack


		parseAnimationLayers( curveNodesMap ) {

			const rawLayers = fbxTree.Objects.AnimationLayer;
			const layersMap = new Map();

			for ( const nodeID in rawLayers ) {

				const layerCurveNodes = [];
				const connection = connections.get( parseInt( nodeID ) );

				if ( connection !== undefined ) {

					// all the animationCurveNodes used in the layer
					const children = connection.children;
					children.forEach( function ( child, i ) {

						if ( curveNodesMap.has( child.ID ) ) {

							const curveNode = curveNodesMap.get( child.ID ); // check that the curves are defined for at least one axis, otherwise ignore the curveNode

							if ( curveNode.curves.x !== undefined || curveNode.curves.y !== undefined || curveNode.curves.z !== undefined ) {

								if ( layerCurveNodes[ i ] === undefined ) {

									const modelID = connections.get( child.ID ).parents.filter( function ( parent ) {

										return parent.relationship !== undefined;

									} )[ 0 ].ID;

									if ( modelID !== undefined ) {

										const rawModel = fbxTree.Objects.Model[ modelID.toString() ];

										if ( rawModel === undefined ) {

											console.warn( 'THREE.FBXLoader: Encountered a unused curve.', child );
											return;

										}

										const node = {
											modelName: rawModel.attrName ? THREE.PropertyBinding.sanitizeNodeName( rawModel.attrName ) : '',
											ID: rawModel.id,
											initialPosition: [ 0, 0, 0 ],
											initialRotation: [ 0, 0, 0 ],
											initialScale: [ 1, 1, 1 ]
										};
										sceneGraph.traverse( function ( child ) {

											if ( child.ID === rawModel.id ) {

												node.transform = child.matrix;
												if ( child.userData.transformData ) node.eulerOrder = child.userData.transformData.eulerOrder;

											}

										} );
										if ( ! node.transform ) node.transform = new THREE.Matrix4(); // if the animated model is pre rotated, we'll have to apply the pre rotations to every
										// animation value as well

										if ( 'PreRotation' in rawModel ) node.preRotation = rawModel.PreRotation.value;
										if ( 'PostRotation' in rawModel ) node.postRotation = rawModel.PostRotation.value;
										layerCurveNodes[ i ] = node;

									}

								}

								if ( layerCurveNodes[ i ] ) layerCurveNodes[ i ][ curveNode.attr ] = curveNode;

							} else if ( curveNode.curves.morph !== undefined ) {

								if ( layerCurveNodes[ i ] === undefined ) {

									const deformerID = connections.get( child.ID ).parents.filter( function ( parent ) {

										return parent.relationship !== undefined;

									} )[ 0 ].ID;
									const morpherID = connections.get( deformerID ).parents[ 0 ].ID;
									const geoID = connections.get( morpherID ).parents[ 0 ].ID; // assuming geometry is not used in more than one model

									const modelID = connections.get( geoID ).parents[ 0 ].ID;
									const rawModel = fbxTree.Objects.Model[ modelID ];
									const node = {
										modelName: rawModel.attrName ? THREE.PropertyBinding.sanitizeNodeName( rawModel.attrName ) : '',
										morphName: fbxTree.Objects.Deformer[ deformerID ].attrName
									};
									layerCurveNodes[ i ] = node;

								}

								layerCurveNodes[ i ][ curveNode.attr ] = curveNode;

							}

						}

					} );
					layersMap.set( parseInt( nodeID ), layerCurveNodes );

				}

			}

			return layersMap;

		} // parse nodes in FBXTree.Objects.AnimationStack. These are the top level node in the animation
		// hierarchy. Each Stack node will be used to create a THREE.AnimationClip


		parseAnimStacks( layersMap ) {

			const rawStacks = fbxTree.Objects.AnimationStack; // connect the stacks (clips) up to the layers

			const rawClips = {};

			for ( const nodeID in rawStacks ) {

				const children = connections.get( parseInt( nodeID ) ).children;

				if ( children.length > 1 ) {

					// it seems like stacks will always be associated with a single layer. But just in case there are files
					// where there are multiple layers per stack, we'll display a warning
					console.warn( 'THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.' );

				}

				const layer = layersMap.get( children[ 0 ].ID );
				rawClips[ nodeID ] = {
					name: rawStacks[ nodeID ].attrName,
					layer: layer
				};

			}

			return rawClips;

		}

		addClip( rawClip ) {

			let tracks = [];
			const scope = this;
			rawClip.layer.forEach( function ( rawTracks ) {

				tracks = tracks.concat( scope.generateTracks( rawTracks ) );

			} );
			return new THREE.AnimationClip( rawClip.name, - 1, tracks );

		}

		generateTracks( rawTracks ) {

			const tracks = [];
			let initialPosition = new THREE.Vector3();
			let initialRotation = new THREE.Quaternion();
			let initialScale = new THREE.Vector3();
			if ( rawTracks.transform ) rawTracks.transform.decompose( initialPosition, initialRotation, initialScale );
			initialPosition = initialPosition.toArray();
			initialRotation = new THREE.Euler().setFromQuaternion( initialRotation, rawTracks.eulerOrder ).toArray();
			initialScale = initialScale.toArray();

			if ( rawTracks.T !== undefined && Object.keys( rawTracks.T.curves ).length > 0 ) {

				const positionTrack = this.generateVectorTrack( rawTracks.modelName, rawTracks.T.curves, initialPosition, 'position' );
				if ( positionTrack !== undefined ) tracks.push( positionTrack );

			}

			if ( rawTracks.R !== undefined && Object.keys( rawTracks.R.curves ).length > 0 ) {

				const rotationTrack = this.generateRotationTrack( rawTracks.modelName, rawTracks.R.curves, initialRotation, rawTracks.preRotation, rawTracks.postRotation, rawTracks.eulerOrder );
				if ( rotationTrack !== undefined ) tracks.push( rotationTrack );

			}

			if ( rawTracks.S !== undefined && Object.keys( rawTracks.S.curves ).length > 0 ) {

				const scaleTrack = this.generateVectorTrack( rawTracks.modelName, rawTracks.S.curves, initialScale, 'scale' );
				if ( scaleTrack !== undefined ) tracks.push( scaleTrack );

			}

			if ( rawTracks.DeformPercent !== undefined ) {

				const morphTrack = this.generateMorphTrack( rawTracks );
				if ( morphTrack !== undefined ) tracks.push( morphTrack );

			}

			return tracks;

		}

		generateVectorTrack( modelName, curves, initialValue, type ) {

			const times = this.getTimesForAllAxes( curves );
			const values = this.getKeyframeTrackValues( times, curves, initialValue );
			return new THREE.VectorKeyframeTrack( modelName + '.' + type, times, values );

		}

		generateRotationTrack( modelName, curves, initialValue, preRotation, postRotation, eulerOrder ) {

			if ( curves.x !== undefined ) {

				this.interpolateRotations( curves.x );
				curves.x.values = curves.x.values.map( THREE.MathUtils.degToRad );

			}

			if ( curves.y !== undefined ) {

				this.interpolateRotations( curves.y );
				curves.y.values = curves.y.values.map( THREE.MathUtils.degToRad );

			}

			if ( curves.z !== undefined ) {

				this.interpolateRotations( curves.z );
				curves.z.values = curves.z.values.map( THREE.MathUtils.degToRad );

			}

			const times = this.getTimesForAllAxes( curves );
			const values = this.getKeyframeTrackValues( times, curves, initialValue );

			if ( preRotation !== undefined ) {

				preRotation = preRotation.map( THREE.MathUtils.degToRad );
				preRotation.push( eulerOrder );
				preRotation = new THREE.Euler().fromArray( preRotation );
				preRotation = new THREE.Quaternion().setFromEuler( preRotation );

			}

			if ( postRotation !== undefined ) {

				postRotation = postRotation.map( THREE.MathUtils.degToRad );
				postRotation.push( eulerOrder );
				postRotation = new THREE.Euler().fromArray( postRotation );
				postRotation = new THREE.Quaternion().setFromEuler( postRotation ).invert();

			}

			const quaternion = new THREE.Quaternion();
			const euler = new THREE.Euler();
			const quaternionValues = [];

			for ( let i = 0; i < values.length; i += 3 ) {

				euler.set( values[ i ], values[ i + 1 ], values[ i + 2 ], eulerOrder );
				quaternion.setFromEuler( euler );
				if ( preRotation !== undefined ) quaternion.premultiply( preRotation );
				if ( postRotation !== undefined ) quaternion.multiply( postRotation );
				quaternion.toArray( quaternionValues, i / 3 * 4 );

			}

			return new THREE.QuaternionKeyframeTrack( modelName + '.quaternion', times, quaternionValues );

		}

		generateMorphTrack( rawTracks ) {

			const curves = rawTracks.DeformPercent.curves.morph;
			const values = curves.values.map( function ( val ) {

				return val / 100;

			} );
			const morphNum = sceneGraph.getObjectByName( rawTracks.modelName ).morphTargetDictionary[ rawTracks.morphName ];
			return new THREE.NumberKeyframeTrack( rawTracks.modelName + '.morphTargetInfluences[' + morphNum + ']', curves.times, values );

		} // For all animated objects, times are defined separately for each axis
		// Here we'll combine the times into one sorted array without duplicates


		getTimesForAllAxes( curves ) {

			let times = []; // first join together the times for each axis, if defined

			if ( curves.x !== undefined ) times = times.concat( curves.x.times );
			if ( curves.y !== undefined ) times = times.concat( curves.y.times );
			if ( curves.z !== undefined ) times = times.concat( curves.z.times ); // then sort them

			times = times.sort( function ( a, b ) {

				return a - b;

			} ); // and remove duplicates

			if ( times.length > 1 ) {

				let targetIndex = 1;
				let lastValue = times[ 0 ];

				for ( let i = 1; i < times.length; i ++ ) {

					const currentValue = times[ i ];

					if ( currentValue !== lastValue ) {

						times[ targetIndex ] = currentValue;
						lastValue = currentValue;
						targetIndex ++;

					}

				}

				times = times.slice( 0, targetIndex );

			}

			return times;

		}

		getKeyframeTrackValues( times, curves, initialValue ) {

			const prevValue = initialValue;
			const values = [];
			let xIndex = - 1;
			let yIndex = - 1;
			let zIndex = - 1;
			times.forEach( function ( time ) {

				if ( curves.x ) xIndex = curves.x.times.indexOf( time );
				if ( curves.y ) yIndex = curves.y.times.indexOf( time );
				if ( curves.z ) zIndex = curves.z.times.indexOf( time ); // if there is an x value defined for this frame, use that

				if ( xIndex !== - 1 ) {

					const xValue = curves.x.values[ xIndex ];
					values.push( xValue );
					prevValue[ 0 ] = xValue;

				} else {

					// otherwise use the x value from the previous frame
					values.push( prevValue[ 0 ] );

				}

				if ( yIndex !== - 1 ) {

					const yValue = curves.y.values[ yIndex ];
					values.push( yValue );
					prevValue[ 1 ] = yValue;

				} else {

					values.push( prevValue[ 1 ] );

				}

				if ( zIndex !== - 1 ) {

					const zValue = curves.z.values[ zIndex ];
					values.push( zValue );
					prevValue[ 2 ] = zValue;

				} else {

					values.push( prevValue[ 2 ] );

				}

			} );
			return values;

		} // Rotations are defined as THREE.Euler angles which can have values  of any size
		// These will be converted to quaternions which don't support values greater than
		// PI, so we'll interpolate large rotations


		interpolateRotations( curve ) {

			for ( let i = 1; i < curve.values.length; i ++ ) {

				const initialValue = curve.values[ i - 1 ];
				const valuesSpan = curve.values[ i ] - initialValue;
				const absoluteSpan = Math.abs( valuesSpan );

				if ( absoluteSpan >= 180 ) {

					const numSubIntervals = absoluteSpan / 180;
					const step = valuesSpan / numSubIntervals;
					let nextValue = initialValue + step;
					const initialTime = curve.times[ i - 1 ];
					const timeSpan = curve.times[ i ] - initialTime;
					const interval = timeSpan / numSubIntervals;
					let nextTime = initialTime + interval;
					const interpolatedTimes = [];
					const interpolatedValues = [];

					while ( nextTime < curve.times[ i ] ) {

						interpolatedTimes.push( nextTime );
						nextTime += interval;
						interpolatedValues.push( nextValue );
						nextValue += step;

					}

					curve.times = inject( curve.times, i, interpolatedTimes );
					curve.values = inject( curve.values, i, interpolatedValues );

				}

			}

		}

	} // parse an FBX file in ASCII format


	class TextParser {

		getPrevNode() {

			return this.nodeStack[ this.currentIndent - 2 ];

		}

		getCurrentNode() {

			return this.nodeStack[ this.currentIndent - 1 ];

		}

		getCurrentProp() {

			return this.currentProp;

		}

		pushStack( node ) {

			this.nodeStack.push( node );
			this.currentIndent += 1;

		}

		popStack() {

			this.nodeStack.pop();
			this.currentIndent -= 1;

		}

		setCurrentProp( val, name ) {

			this.currentProp = val;
			this.currentPropName = name;

		}

		parse( text ) {

			this.currentIndent = 0;
			this.allNodes = new FBXTree();
			this.nodeStack = [];
			this.currentProp = [];
			this.currentPropName = '';
			const scope = this;
			const split = text.split( /[\r\n]+/ );
			split.forEach( function ( line, i ) {

				const matchComment = line.match( /^[\s\t]*;/ );
				const matchEmpty = line.match( /^[\s\t]*$/ );
				if ( matchComment || matchEmpty ) return;
				const matchBeginning = line.match( '^\\t{' + scope.currentIndent + '}(\\w+):(.*){', '' );
				const matchProperty = line.match( '^\\t{' + scope.currentIndent + '}(\\w+):[\\s\\t\\r\\n](.*)' );
				const matchEnd = line.match( '^\\t{' + ( scope.currentIndent - 1 ) + '}}' );

				if ( matchBeginning ) {

					scope.parseNodeBegin( line, matchBeginning );

				} else if ( matchProperty ) {

					scope.parseNodeProperty( line, matchProperty, split[ ++ i ] );

				} else if ( matchEnd ) {

					scope.popStack();

				} else if ( line.match( /^[^\s\t}]/ ) ) {

					// large arrays are split over multiple lines terminated with a ',' character
					// if this is encountered the line needs to be joined to the previous line
					scope.parseNodePropertyContinued( line );

				}

			} );
			return this.allNodes;

		}

		parseNodeBegin( line, property ) {

			const nodeName = property[ 1 ].trim().replace( /^"/, '' ).replace( /"$/, '' );
			const nodeAttrs = property[ 2 ].split( ',' ).map( function ( attr ) {

				return attr.trim().replace( /^"/, '' ).replace( /"$/, '' );

			} );
			const node = {
				name: nodeName
			};
			const attrs = this.parseNodeAttr( nodeAttrs );
			const currentNode = this.getCurrentNode(); // a top node

			if ( this.currentIndent === 0 ) {

				this.allNodes.add( nodeName, node );

			} else {

				// a subnode
				// if the subnode already exists, append it
				if ( nodeName in currentNode ) {

					// special case Pose needs PoseNodes as an array
					if ( nodeName === 'PoseNode' ) {

						currentNode.PoseNode.push( node );

					} else if ( currentNode[ nodeName ].id !== undefined ) {

						currentNode[ nodeName ] = {};
						currentNode[ nodeName ][ currentNode[ nodeName ].id ] = currentNode[ nodeName ];

					}

					if ( attrs.id !== '' ) currentNode[ nodeName ][ attrs.id ] = node;

				} else if ( typeof attrs.id === 'number' ) {

					currentNode[ nodeName ] = {};
					currentNode[ nodeName ][ attrs.id ] = node;

				} else if ( nodeName !== 'Properties70' ) {

					if ( nodeName === 'PoseNode' ) currentNode[ nodeName ] = [ node ]; else currentNode[ nodeName ] = node;

				}

			}

			if ( typeof attrs.id === 'number' ) node.id = attrs.id;
			if ( attrs.name !== '' ) node.attrName = attrs.name;
			if ( attrs.type !== '' ) node.attrType = attrs.type;
			this.pushStack( node );

		}

		parseNodeAttr( attrs ) {

			let id = attrs[ 0 ];

			if ( attrs[ 0 ] !== '' ) {

				id = parseInt( attrs[ 0 ] );

				if ( isNaN( id ) ) {

					id = attrs[ 0 ];

				}

			}

			let name = '',
				type = '';

			if ( attrs.length > 1 ) {

				name = attrs[ 1 ].replace( /^(\w+)::/, '' );
				type = attrs[ 2 ];

			}

			return {
				id: id,
				name: name,
				type: type
			};

		}

		parseNodeProperty( line, property, contentLine ) {

			let propName = property[ 1 ].replace( /^"/, '' ).replace( /"$/, '' ).trim();
			let propValue = property[ 2 ].replace( /^"/, '' ).replace( /"$/, '' ).trim(); // for special case: base64 image data follows "Content: ," line
			//	Content: ,
			//	 "/9j/4RDaRXhpZgAATU0A..."

			if ( propName === 'Content' && propValue === ',' ) {

				propValue = contentLine.replace( /"/g, '' ).replace( /,$/, '' ).trim();

			}

			const currentNode = this.getCurrentNode();
			const parentName = currentNode.name;

			if ( parentName === 'Properties70' ) {

				this.parseNodeSpecialProperty( line, propName, propValue );
				return;

			} // Connections


			if ( propName === 'C' ) {

				const connProps = propValue.split( ',' ).slice( 1 );
				const from = parseInt( connProps[ 0 ] );
				const to = parseInt( connProps[ 1 ] );
				let rest = propValue.split( ',' ).slice( 3 );
				rest = rest.map( function ( elem ) {

					return elem.trim().replace( /^"/, '' );

				} );
				propName = 'connections';
				propValue = [ from, to ];
				append( propValue, rest );

				if ( currentNode[ propName ] === undefined ) {

					currentNode[ propName ] = [];

				}

			} // Node


			if ( propName === 'Node' ) currentNode.id = propValue; // connections

			if ( propName in currentNode && Array.isArray( currentNode[ propName ] ) ) {

				currentNode[ propName ].push( propValue );

			} else {

				if ( propName !== 'a' ) currentNode[ propName ] = propValue; else currentNode.a = propValue;

			}

			this.setCurrentProp( currentNode, propName ); // convert string to array, unless it ends in ',' in which case more will be added to it

			if ( propName === 'a' && propValue.slice( - 1 ) !== ',' ) {

				currentNode.a = parseNumberArray( propValue );

			}

		}

		parseNodePropertyContinued( line ) {

			const currentNode = this.getCurrentNode();
			currentNode.a += line; // if the line doesn't end in ',' we have reached the end of the property value
			// so convert the string to an array

			if ( line.slice( - 1 ) !== ',' ) {

				currentNode.a = parseNumberArray( currentNode.a );

			}

		} // parse "Property70"


		parseNodeSpecialProperty( line, propName, propValue ) {

			// split this
			// P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
			// into array like below
			// ["Lcl Scaling", "Lcl Scaling", "", "A", "1,1,1" ]
			const props = propValue.split( '",' ).map( function ( prop ) {

				return prop.trim().replace( /^\"/, '' ).replace( /\s/, '_' );

			} );
			const innerPropName = props[ 0 ];
			const innerPropType1 = props[ 1 ];
			const innerPropType2 = props[ 2 ];
			const innerPropFlag = props[ 3 ];
			let innerPropValue = props[ 4 ]; // cast values where needed, otherwise leave as strings

			switch ( innerPropType1 ) {

				case 'int':
				case 'enum':
				case 'bool':
				case 'ULongLong':
				case 'double':
				case 'Number':
				case 'FieldOfView':
					innerPropValue = parseFloat( innerPropValue );
					break;

				case 'Color':
				case 'ColorRGB':
				case 'Vector3D':
				case 'Lcl_Translation':
				case 'Lcl_Rotation':
				case 'Lcl_Scaling':
					innerPropValue = parseNumberArray( innerPropValue );
					break;

			} // CAUTION: these props must append to parent's parent


			this.getPrevNode()[ innerPropName ] = {
				'type': innerPropType1,
				'type2': innerPropType2,
				'flag': innerPropFlag,
				'value': innerPropValue
			};
			this.setCurrentProp( this.getPrevNode(), innerPropName );

		}

	} // Parse an FBX file in Binary format


	class BinaryParser {

		parse( buffer ) {

			const reader = new BinaryReader( buffer );
			reader.skip( 23 ); // skip magic 23 bytes

			const version = reader.getUint32();

			if ( version < 6400 ) {

				throw new Error( 'THREE.FBXLoader: FBX version not supported, FileVersion: ' + version );

			}

			const allNodes = new FBXTree();

			while ( ! this.endOfContent( reader ) ) {

				const node = this.parseNode( reader, version );
				if ( node !== null ) allNodes.add( node.name, node );

			}

			return allNodes;

		} // Check if reader has reached the end of content.


		endOfContent( reader ) {

			// footer size: 160bytes + 16-byte alignment padding
			// - 16bytes: magic
			// - padding til 16-byte alignment (at least 1byte?)
			//	(seems like some exporters embed fixed 15 or 16bytes?)
			// - 4bytes: magic
			// - 4bytes: version
			// - 120bytes: zero
			// - 16bytes: magic
			if ( reader.size() % 16 === 0 ) {

				return ( reader.getOffset() + 160 + 16 & ~ 0xf ) >= reader.size();

			} else {

				return reader.getOffset() + 160 + 16 >= reader.size();

			}

		} // recursively parse nodes until the end of the file is reached


		parseNode( reader, version ) {

			const node = {}; // The first three data sizes depends on version.

			const endOffset = version >= 7500 ? reader.getUint64() : reader.getUint32();
			const numProperties = version >= 7500 ? reader.getUint64() : reader.getUint32();
			version >= 7500 ? reader.getUint64() : reader.getUint32(); // the returned propertyListLen is not used

			const nameLen = reader.getUint8();
			const name = reader.getString( nameLen ); // Regards this node as NULL-record if endOffset is zero

			if ( endOffset === 0 ) return null;
			const propertyList = [];

			for ( let i = 0; i < numProperties; i ++ ) {

				propertyList.push( this.parseProperty( reader ) );

			} // Regards the first three elements in propertyList as id, attrName, and attrType


			const id = propertyList.length > 0 ? propertyList[ 0 ] : '';
			const attrName = propertyList.length > 1 ? propertyList[ 1 ] : '';
			const attrType = propertyList.length > 2 ? propertyList[ 2 ] : ''; // check if this node represents just a single property
			// like (name, 0) set or (name2, [0, 1, 2]) set of {name: 0, name2: [0, 1, 2]}

			node.singleProperty = numProperties === 1 && reader.getOffset() === endOffset ? true : false;

			while ( endOffset > reader.getOffset() ) {

				const subNode = this.parseNode( reader, version );
				if ( subNode !== null ) this.parseSubNode( name, node, subNode );

			}

			node.propertyList = propertyList; // raw property list used by parent

			if ( typeof id === 'number' ) node.id = id;
			if ( attrName !== '' ) node.attrName = attrName;
			if ( attrType !== '' ) node.attrType = attrType;
			if ( name !== '' ) node.name = name;
			return node;

		}

		parseSubNode( name, node, subNode ) {

			// special case: child node is single property
			if ( subNode.singleProperty === true ) {

				const value = subNode.propertyList[ 0 ];

				if ( Array.isArray( value ) ) {

					node[ subNode.name ] = subNode;
					subNode.a = value;

				} else {

					node[ subNode.name ] = value;

				}

			} else if ( name === 'Connections' && subNode.name === 'C' ) {

				const array = [];
				subNode.propertyList.forEach( function ( property, i ) {

					// first Connection is FBX type (OO, OP, etc.). We'll discard these
					if ( i !== 0 ) array.push( property );

				} );

				if ( node.connections === undefined ) {

					node.connections = [];

				}

				node.connections.push( array );

			} else if ( subNode.name === 'Properties70' ) {

				const keys = Object.keys( subNode );
				keys.forEach( function ( key ) {

					node[ key ] = subNode[ key ];

				} );

			} else if ( name === 'Properties70' && subNode.name === 'P' ) {

				let innerPropName = subNode.propertyList[ 0 ];
				let innerPropType1 = subNode.propertyList[ 1 ];
				const innerPropType2 = subNode.propertyList[ 2 ];
				const innerPropFlag = subNode.propertyList[ 3 ];
				let innerPropValue;
				if ( innerPropName.indexOf( 'Lcl ' ) === 0 ) innerPropName = innerPropName.replace( 'Lcl ', 'Lcl_' );
				if ( innerPropType1.indexOf( 'Lcl ' ) === 0 ) innerPropType1 = innerPropType1.replace( 'Lcl ', 'Lcl_' );

				if ( innerPropType1 === 'Color' || innerPropType1 === 'ColorRGB' || innerPropType1 === 'Vector' || innerPropType1 === 'Vector3D' || innerPropType1.indexOf( 'Lcl_' ) === 0 ) {

					innerPropValue = [ subNode.propertyList[ 4 ], subNode.propertyList[ 5 ], subNode.propertyList[ 6 ] ];

				} else {

					innerPropValue = subNode.propertyList[ 4 ];

				} // this will be copied to parent, see above


				node[ innerPropName ] = {
					'type': innerPropType1,
					'type2': innerPropType2,
					'flag': innerPropFlag,
					'value': innerPropValue
				};

			} else if ( node[ subNode.name ] === undefined ) {

				if ( typeof subNode.id === 'number' ) {

					node[ subNode.name ] = {};
					node[ subNode.name ][ subNode.id ] = subNode;

				} else {

					node[ subNode.name ] = subNode;

				}

			} else {

				if ( subNode.name === 'PoseNode' ) {

					if ( ! Array.isArray( node[ subNode.name ] ) ) {

						node[ subNode.name ] = [ node[ subNode.name ] ];

					}

					node[ subNode.name ].push( subNode );

				} else if ( node[ subNode.name ][ subNode.id ] === undefined ) {

					node[ subNode.name ][ subNode.id ] = subNode;

				}

			}

		}

		parseProperty( reader ) {

			const type = reader.getString( 1 );
			let length;

			switch ( type ) {

				case 'C':
					return reader.getBoolean();

				case 'D':
					return reader.getFloat64();

				case 'F':
					return reader.getFloat32();

				case 'I':
					return reader.getInt32();

				case 'L':
					return reader.getInt64();

				case 'R':
					length = reader.getUint32();
					return reader.getArrayBuffer( length );

				case 'S':
					length = reader.getUint32();
					return reader.getString( length );

				case 'Y':
					return reader.getInt16();

				case 'b':
				case 'c':
				case 'd':
				case 'f':
				case 'i':
				case 'l':
					const arrayLength = reader.getUint32();
					const encoding = reader.getUint32(); // 0: non-compressed, 1: compressed

					const compressedLength = reader.getUint32();

					if ( encoding === 0 ) {

						switch ( type ) {

							case 'b':
							case 'c':
								return reader.getBooleanArray( arrayLength );

							case 'd':
								return reader.getFloat64Array( arrayLength );

							case 'f':
								return reader.getFloat32Array( arrayLength );

							case 'i':
								return reader.getInt32Array( arrayLength );

							case 'l':
								return reader.getInt64Array( arrayLength );

						}

					}

					if ( typeof fflate === 'undefined' ) {

						console.error( 'THREE.FBXLoader: External library fflate.min.js required.' );

					}

					const data = fflate.unzlibSync( new Uint8Array( reader.getArrayBuffer( compressedLength ) ) ); // eslint-disable-line no-undef

					const reader2 = new BinaryReader( data.buffer );

					switch ( type ) {

						case 'b':
						case 'c':
							return reader2.getBooleanArray( arrayLength );

						case 'd':
							return reader2.getFloat64Array( arrayLength );

						case 'f':
							return reader2.getFloat32Array( arrayLength );

						case 'i':
							return reader2.getInt32Array( arrayLength );

						case 'l':
							return reader2.getInt64Array( arrayLength );

					}

				default:
					throw new Error( 'THREE.FBXLoader: Unknown property type ' + type );

			}

		}

	}

	class BinaryReader {

		constructor( buffer, littleEndian ) {

			this.dv = new DataView( buffer );
			this.offset = 0;
			this.littleEndian = littleEndian !== undefined ? littleEndian : true;

		}

		getOffset() {

			return this.offset;

		}

		size() {

			return this.dv.buffer.byteLength;

		}

		skip( length ) {

			this.offset += length;

		} // seems like true/false representation depends on exporter.
		// true: 1 or 'Y'(=0x59), false: 0 or 'T'(=0x54)
		// then sees LSB.


		getBoolean() {

			return ( this.getUint8() & 1 ) === 1;

		}

		getBooleanArray( size ) {

			const a = [];

			for ( let i = 0; i < size; i ++ ) {

				a.push( this.getBoolean() );

			}

			return a;

		}

		getUint8() {

			const value = this.dv.getUint8( this.offset );
			this.offset += 1;
			return value;

		}

		getInt16() {

			const value = this.dv.getInt16( this.offset, this.littleEndian );
			this.offset += 2;
			return value;

		}

		getInt32() {

			const value = this.dv.getInt32( this.offset, this.littleEndian );
			this.offset += 4;
			return value;

		}

		getInt32Array( size ) {

			const a = [];

			for ( let i = 0; i < size; i ++ ) {

				a.push( this.getInt32() );

			}

			return a;

		}

		getUint32() {

			const value = this.dv.getUint32( this.offset, this.littleEndian );
			this.offset += 4;
			return value;

		} // JavaScript doesn't support 64-bit integer so calculate this here
		// 1 << 32 will return 1 so using multiply operation instead here.
		// There's a possibility that this method returns wrong value if the value
		// is out of the range between Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER.
		// TODO: safely handle 64-bit integer


		getInt64() {

			let low, high;

			if ( this.littleEndian ) {

				low = this.getUint32();
				high = this.getUint32();

			} else {

				high = this.getUint32();
				low = this.getUint32();

			} // calculate negative value


			if ( high & 0x80000000 ) {

				high = ~ high & 0xFFFFFFFF;
				low = ~ low & 0xFFFFFFFF;
				if ( low === 0xFFFFFFFF ) high = high + 1 & 0xFFFFFFFF;
				low = low + 1 & 0xFFFFFFFF;
				return - ( high * 0x100000000 + low );

			}

			return high * 0x100000000 + low;

		}

		getInt64Array( size ) {

			const a = [];

			for ( let i = 0; i < size; i ++ ) {

				a.push( this.getInt64() );

			}

			return a;

		} // Note: see getInt64() comment


		getUint64() {

			let low, high;

			if ( this.littleEndian ) {

				low = this.getUint32();
				high = this.getUint32();

			} else {

				high = this.getUint32();
				low = this.getUint32();

			}

			return high * 0x100000000 + low;

		}

		getFloat32() {

			const value = this.dv.getFloat32( this.offset, this.littleEndian );
			this.offset += 4;
			return value;

		}

		getFloat32Array( size ) {

			const a = [];

			for ( let i = 0; i < size; i ++ ) {

				a.push( this.getFloat32() );

			}

			return a;

		}

		getFloat64() {

			const value = this.dv.getFloat64( this.offset, this.littleEndian );
			this.offset += 8;
			return value;

		}

		getFloat64Array( size ) {

			const a = [];

			for ( let i = 0; i < size; i ++ ) {

				a.push( this.getFloat64() );

			}

			return a;

		}

		getArrayBuffer( size ) {

			const value = this.dv.buffer.slice( this.offset, this.offset + size );
			this.offset += size;
			return value;

		}

		getString( size ) {

			// note: safari 9 doesn't support Uint8Array.indexOf; create intermediate array instead
			let a = [];

			for ( let i = 0; i < size; i ++ ) {

				a[ i ] = this.getUint8();

			}

			const nullByte = a.indexOf( 0 );
			if ( nullByte >= 0 ) a = a.slice( 0, nullByte );
			return THREE.LoaderUtils.decodeText( new Uint8Array( a ) );

		}

	} // FBXTree holds a representation of the FBX data, returned by the TextParser ( FBX ASCII format)
	// and BinaryParser( FBX Binary format)


	class FBXTree {

		add( key, val ) {

			this[ key ] = val;

		}

	} // ************** UTILITY FUNCTIONS **************


	function isFbxFormatBinary( buffer ) {

		const CORRECT = 'Kaydara\u0020FBX\u0020Binary\u0020\u0020\0';
		return buffer.byteLength >= CORRECT.length && CORRECT === convertArrayBufferToString( buffer, 0, CORRECT.length );

	}

	function isFbxFormatASCII( text ) {

		const CORRECT = [ 'K', 'a', 'y', 'd', 'a', 'r', 'a', '\\', 'F', 'B', 'X', '\\', 'B', 'i', 'n', 'a', 'r', 'y', '\\', '\\' ];
		let cursor = 0;

		function read( offset ) {

			const result = text[ offset - 1 ];
			text = text.slice( cursor + offset );
			cursor ++;
			return result;

		}

		for ( let i = 0; i < CORRECT.length; ++ i ) {

			const num = read( 1 );

			if ( num === CORRECT[ i ] ) {

				return false;

			}

		}

		return true;

	}

	function getFbxVersion( text ) {

		const versionRegExp = /FBXVersion: (\d+)/;
		const match = text.match( versionRegExp );

		if ( match ) {

			const version = parseInt( match[ 1 ] );
			return version;

		}

		throw new Error( 'THREE.FBXLoader: Cannot find the version number for the file given.' );

	} // Converts FBX ticks into real time seconds.


	function convertFBXTimeToSeconds( time ) {

		return time / 46186158000;

	}

	const dataArray = []; // extracts the data from the correct position in the FBX array based on indexing type

	function getData( polygonVertexIndex, polygonIndex, vertexIndex, infoObject ) {

		let index;

		switch ( infoObject.mappingType ) {

			case 'ByPolygonVertex':
				index = polygonVertexIndex;
				break;

			case 'ByPolygon':
				index = polygonIndex;
				break;

			case 'ByVertice':
				index = vertexIndex;
				break;

			case 'AllSame':
				index = infoObject.indices[ 0 ];
				break;

			default:
				console.warn( 'THREE.FBXLoader: unknown attribute mapping type ' + infoObject.mappingType );

		}

		if ( infoObject.referenceType === 'IndexToDirect' ) index = infoObject.indices[ index ];
		const from = index * infoObject.dataSize;
		const to = from + infoObject.dataSize;
		return slice( dataArray, infoObject.buffer, from, to );

	}

	const tempEuler = new THREE.Euler();
	const tempVec = new THREE.Vector3(); // generate transformation from FBX transform data
	// ref: https://help.autodesk.com/view/FBX/2017/ENU/?guid=__files_GUID_10CDD63C_79C1_4F2D_BB28_AD2BE65A02ED_htm
	// ref: http://docs.autodesk.com/FBX/2014/ENU/FBX-SDK-Documentation/index.html?url=cpp_ref/_transformations_2main_8cxx-example.html,topicNumber=cpp_ref__transformations_2main_8cxx_example_htmlfc10a1e1-b18d-4e72-9dc0-70d0f1959f5e

	function generateTransform( transformData ) {

		const lTranslationM = new THREE.Matrix4();
		const lPreRotationM = new THREE.Matrix4();
		const lRotationM = new THREE.Matrix4();
		const lPostRotationM = new THREE.Matrix4();
		const lScalingM = new THREE.Matrix4();
		const lScalingPivotM = new THREE.Matrix4();
		const lScalingOffsetM = new THREE.Matrix4();
		const lRotationOffsetM = new THREE.Matrix4();
		const lRotationPivotM = new THREE.Matrix4();
		const lParentGX = new THREE.Matrix4();
		const lParentLX = new THREE.Matrix4();
		const lGlobalT = new THREE.Matrix4();
		const inheritType = transformData.inheritType ? transformData.inheritType : 0;
		if ( transformData.translation ) lTranslationM.setPosition( tempVec.fromArray( transformData.translation ) );

		if ( transformData.preRotation ) {

			const array = transformData.preRotation.map( THREE.MathUtils.degToRad );
			array.push( transformData.eulerOrder );
			lPreRotationM.makeRotationFromEuler( tempEuler.fromArray( array ) );

		}

		if ( transformData.rotation ) {

			const array = transformData.rotation.map( THREE.MathUtils.degToRad );
			array.push( transformData.eulerOrder );
			lRotationM.makeRotationFromEuler( tempEuler.fromArray( array ) );

		}

		if ( transformData.postRotation ) {

			const array = transformData.postRotation.map( THREE.MathUtils.degToRad );
			array.push( transformData.eulerOrder );
			lPostRotationM.makeRotationFromEuler( tempEuler.fromArray( array ) );
			lPostRotationM.invert();

		}

		if ( transformData.scale ) lScalingM.scale( tempVec.fromArray( transformData.scale ) ); // Pivots and offsets

		if ( transformData.scalingOffset ) lScalingOffsetM.setPosition( tempVec.fromArray( transformData.scalingOffset ) );
		if ( transformData.scalingPivot ) lScalingPivotM.setPosition( tempVec.fromArray( transformData.scalingPivot ) );
		if ( transformData.rotationOffset ) lRotationOffsetM.setPosition( tempVec.fromArray( transformData.rotationOffset ) );
		if ( transformData.rotationPivot ) lRotationPivotM.setPosition( tempVec.fromArray( transformData.rotationPivot ) ); // parent transform

		if ( transformData.parentMatrixWorld ) {

			lParentLX.copy( transformData.parentMatrix );
			lParentGX.copy( transformData.parentMatrixWorld );

		}

		const lLRM = lPreRotationM.clone().multiply( lRotationM ).multiply( lPostRotationM ); // Global Rotation

		const lParentGRM = new THREE.Matrix4();
		lParentGRM.extractRotation( lParentGX ); // Global Shear*Scaling

		const lParentTM = new THREE.Matrix4();
		lParentTM.copyPosition( lParentGX );
		const lParentGRSM = lParentTM.clone().invert().multiply( lParentGX );
		const lParentGSM = lParentGRM.clone().invert().multiply( lParentGRSM );
		const lLSM = lScalingM;
		const lGlobalRS = new THREE.Matrix4();

		if ( inheritType === 0 ) {

			lGlobalRS.copy( lParentGRM ).multiply( lLRM ).multiply( lParentGSM ).multiply( lLSM );

		} else if ( inheritType === 1 ) {

			lGlobalRS.copy( lParentGRM ).multiply( lParentGSM ).multiply( lLRM ).multiply( lLSM );

		} else {

			const lParentLSM = new THREE.Matrix4().scale( new THREE.Vector3().setFromMatrixScale( lParentLX ) );
			const lParentLSM_inv = lParentLSM.clone().invert();
			const lParentGSM_noLocal = lParentGSM.clone().multiply( lParentLSM_inv );
			lGlobalRS.copy( lParentGRM ).multiply( lLRM ).multiply( lParentGSM_noLocal ).multiply( lLSM );

		}

		const lRotationPivotM_inv = lRotationPivotM.clone().invert();
		const lScalingPivotM_inv = lScalingPivotM.clone().invert(); // Calculate the local transform matrix

		let lTransform = lTranslationM.clone().multiply( lRotationOffsetM ).multiply( lRotationPivotM ).multiply( lPreRotationM ).multiply( lRotationM ).multiply( lPostRotationM ).multiply( lRotationPivotM_inv ).multiply( lScalingOffsetM ).multiply( lScalingPivotM ).multiply( lScalingM ).multiply( lScalingPivotM_inv );
		const lLocalTWithAllPivotAndOffsetInfo = new THREE.Matrix4().copyPosition( lTransform );
		const lGlobalTranslation = lParentGX.clone().multiply( lLocalTWithAllPivotAndOffsetInfo );
		lGlobalT.copyPosition( lGlobalTranslation );
		lTransform = lGlobalT.clone().multiply( lGlobalRS ); // from global to local

		lTransform.premultiply( lParentGX.invert() );
		return lTransform;

	} // Returns the three.js intrinsic THREE.Euler order corresponding to FBX extrinsic THREE.Euler order
	// ref: http://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_class_fbx_euler_html


	function getEulerOrder( order ) {

		order = order || 0;
		const enums = [ 'ZYX', // -> XYZ extrinsic
			'YZX', // -> XZY extrinsic
			'XZY', // -> YZX extrinsic
			'ZXY', // -> YXZ extrinsic
			'YXZ', // -> ZXY extrinsic
			'XYZ' // -> ZYX extrinsic
			//'SphericXYZ', // not possible to support
		];

		if ( order === 6 ) {

			console.warn( 'THREE.FBXLoader: unsupported THREE.Euler Order: Spherical XYZ. Animations and rotations may be incorrect.' );
			return enums[ 0 ];

		}

		return enums[ order ];

	} // Parses comma separated list of numbers and returns them an array.
	// Used internally by the TextParser


	function parseNumberArray( value ) {

		const array = value.split( ',' ).map( function ( val ) {

			return parseFloat( val );

		} );
		return array;

	}

	function convertArrayBufferToString( buffer, from, to ) {

		if ( from === undefined ) from = 0;
		if ( to === undefined ) to = buffer.byteLength;
		return THREE.LoaderUtils.decodeText( new Uint8Array( buffer, from, to ) );

	}

	function append( a, b ) {

		for ( let i = 0, j = a.length, l = b.length; i < l; i ++, j ++ ) {

			a[ j ] = b[ i ];

		}

	}

	function slice( a, b, from, to ) {

		for ( let i = from, j = 0; i < to; i ++, j ++ ) {

			a[ j ] = b[ i ];

		}

		return a;

	} // inject array a2 into array a1 at index


	function inject( a1, index, a2 ) {

		return a1.slice( 0, index ).concat( a2 ).concat( a1.slice( index ) );

	}

	THREE.FBXLoader = FBXLoader;

} )();
( function () {

	const _taskCache = new WeakMap();

	class DRACOLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );
			this.decoderPath = '';
			this.decoderConfig = {};
			this.decoderBinary = null;
			this.decoderPending = null;
			this.workerLimit = 4;
			this.workerPool = [];
			this.workerNextTaskID = 1;
			this.workerSourceURL = '';
			this.defaultAttributeIDs = {
				position: 'POSITION',
				normal: 'NORMAL',
				color: 'COLOR',
				uv: 'TEX_COORD'
			};
			this.defaultAttributeTypes = {
				position: 'Float32Array',
				normal: 'Float32Array',
				color: 'Float32Array',
				uv: 'Float32Array'
			};

		}

		setDecoderPath( path ) {

			this.decoderPath = path;
			return this;

		}

		setDecoderConfig( config ) {

			this.decoderConfig = config;
			return this;

		}

		setWorkerLimit( workerLimit ) {

			this.workerLimit = workerLimit;
			return this;

		}

		load( url, onLoad, onProgress, onError ) {

			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, buffer => {

				const taskConfig = {
					attributeIDs: this.defaultAttributeIDs,
					attributeTypes: this.defaultAttributeTypes,
					useUniqueIDs: false
				};
				this.decodeGeometry( buffer, taskConfig ).then( onLoad ).catch( onError );

			}, onProgress, onError );

		}
		/** @deprecated Kept for backward-compatibility with previous DRACOLoader versions. */


		decodeDracoFile( buffer, callback, attributeIDs, attributeTypes ) {

			const taskConfig = {
				attributeIDs: attributeIDs || this.defaultAttributeIDs,
				attributeTypes: attributeTypes || this.defaultAttributeTypes,
				useUniqueIDs: !! attributeIDs
			};
			this.decodeGeometry( buffer, taskConfig ).then( callback );

		}

		decodeGeometry( buffer, taskConfig ) {

			// TODO: For backward-compatibility, support 'attributeTypes' objects containing
			// references (rather than names) to typed array constructors. These must be
			// serialized before sending them to the worker.
			for ( const attribute in taskConfig.attributeTypes ) {

				const type = taskConfig.attributeTypes[ attribute ];

				if ( type.BYTES_PER_ELEMENT !== undefined ) {

					taskConfig.attributeTypes[ attribute ] = type.name;

				}

			} //


			const taskKey = JSON.stringify( taskConfig ); // Check for an existing task using this buffer. A transferred buffer cannot be transferred
			// again from this thread.

			if ( _taskCache.has( buffer ) ) {

				const cachedTask = _taskCache.get( buffer );

				if ( cachedTask.key === taskKey ) {

					return cachedTask.promise;

				} else if ( buffer.byteLength === 0 ) {

					// Technically, it would be possible to wait for the previous task to complete,
					// transfer the buffer back, and decode again with the second configuration. That
					// is complex, and I don't know of any reason to decode a Draco buffer twice in
					// different ways, so this is left unimplemented.
					throw new Error( 'THREE.DRACOLoader: Unable to re-decode a buffer with different ' + 'settings. Buffer has already been transferred.' );

				}

			} //


			let worker;
			const taskID = this.workerNextTaskID ++;
			const taskCost = buffer.byteLength; // Obtain a worker and assign a task, and construct a geometry instance
			// when the task completes.

			const geometryPending = this._getWorker( taskID, taskCost ).then( _worker => {

				worker = _worker;
				return new Promise( ( resolve, reject ) => {

					worker._callbacks[ taskID ] = {
						resolve,
						reject
					};
					worker.postMessage( {
						type: 'decode',
						id: taskID,
						taskConfig,
						buffer
					}, [ buffer ] ); // this.debug();

				} );

			} ).then( message => this._createGeometry( message.geometry ) ); // Remove task from the task list.
			// Note: replaced '.finally()' with '.catch().then()' block - iOS 11 support (#19416)


			geometryPending.catch( () => true ).then( () => {

				if ( worker && taskID ) {

					this._releaseTask( worker, taskID ); // this.debug();

				}

			} ); // Cache the task result.

			_taskCache.set( buffer, {
				key: taskKey,
				promise: geometryPending
			} );

			return geometryPending;

		}

		_createGeometry( geometryData ) {

			const geometry = new THREE.BufferGeometry();

			if ( geometryData.index ) {

				geometry.setIndex( new THREE.BufferAttribute( geometryData.index.array, 1 ) );

			}

			for ( let i = 0; i < geometryData.attributes.length; i ++ ) {

				const attribute = geometryData.attributes[ i ];
				const name = attribute.name;
				const array = attribute.array;
				const itemSize = attribute.itemSize;
				geometry.setAttribute( name, new THREE.BufferAttribute( array, itemSize ) );

			}

			return geometry;

		}

		_loadLibrary( url, responseType ) {

			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.decoderPath );
			loader.setResponseType( responseType );
			loader.setWithCredentials( this.withCredentials );
			return new Promise( ( resolve, reject ) => {

				loader.load( url, resolve, undefined, reject );

			} );

		}

		preload() {

			this._initDecoder();

			return this;

		}

		_initDecoder() {

			if ( this.decoderPending ) return this.decoderPending;
			const useJS = typeof WebAssembly !== 'object' || this.decoderConfig.type === 'js';
			const librariesPending = [];

			if ( useJS ) {

				librariesPending.push( this._loadLibrary( 'draco_decoder.js', 'text' ) );

			} else {

				librariesPending.push( this._loadLibrary( 'draco_wasm_wrapper.js', 'text' ) );
				librariesPending.push( this._loadLibrary( 'draco_decoder.wasm', 'arraybuffer' ) );

			}

			this.decoderPending = Promise.all( librariesPending ).then( libraries => {

				const jsContent = libraries[ 0 ];

				if ( ! useJS ) {

					this.decoderConfig.wasmBinary = libraries[ 1 ];

				}

				const fn = DRACOWorker.toString();
				const body = [ '/* draco decoder */', jsContent, '', '/* worker */', fn.substring( fn.indexOf( '{' ) + 1, fn.lastIndexOf( '}' ) ) ].join( '\n' );
				this.workerSourceURL = URL.createObjectURL( new Blob( [ body ] ) );

			} );
			return this.decoderPending;

		}

		_getWorker( taskID, taskCost ) {

			return this._initDecoder().then( () => {

				if ( this.workerPool.length < this.workerLimit ) {

					const worker = new Worker( this.workerSourceURL );
					worker._callbacks = {};
					worker._taskCosts = {};
					worker._taskLoad = 0;
					worker.postMessage( {
						type: 'init',
						decoderConfig: this.decoderConfig
					} );

					worker.onmessage = function ( e ) {

						const message = e.data;

						switch ( message.type ) {

							case 'decode':
								worker._callbacks[ message.id ].resolve( message );

								break;

							case 'error':
								worker._callbacks[ message.id ].reject( message );

								break;

							default:
								console.error( 'THREE.DRACOLoader: Unexpected message, "' + message.type + '"' );

						}

					};

					this.workerPool.push( worker );

				} else {

					this.workerPool.sort( function ( a, b ) {

						return a._taskLoad > b._taskLoad ? - 1 : 1;

					} );

				}

				const worker = this.workerPool[ this.workerPool.length - 1 ];
				worker._taskCosts[ taskID ] = taskCost;
				worker._taskLoad += taskCost;
				return worker;

			} );

		}

		_releaseTask( worker, taskID ) {

			worker._taskLoad -= worker._taskCosts[ taskID ];
			delete worker._callbacks[ taskID ];
			delete worker._taskCosts[ taskID ];

		}

		debug() {

			console.log( 'Task load: ', this.workerPool.map( worker => worker._taskLoad ) );

		}

		dispose() {

			for ( let i = 0; i < this.workerPool.length; ++ i ) {

				this.workerPool[ i ].terminate();

			}

			this.workerPool.length = 0;
			return this;

		}

	}
	/* WEB WORKER */


	function DRACOWorker() {

		let decoderConfig;
		let decoderPending;

		onmessage = function ( e ) {

			const message = e.data;

			switch ( message.type ) {

				case 'init':
					decoderConfig = message.decoderConfig;
					decoderPending = new Promise( function ( resolve
						/*, reject*/
					) {

						decoderConfig.onModuleLoaded = function ( draco ) {

							// Module is Promise-like. Wrap before resolving to avoid loop.
							resolve( {
								draco: draco
							} );

						};

						DracoDecoderModule( decoderConfig ); // eslint-disable-line no-undef

					} );
					break;

				case 'decode':
					const buffer = message.buffer;
					const taskConfig = message.taskConfig;
					decoderPending.then( module => {

						const draco = module.draco;
						const decoder = new draco.Decoder();
						const decoderBuffer = new draco.DecoderBuffer();
						decoderBuffer.Init( new Int8Array( buffer ), buffer.byteLength );

						try {

							const geometry = decodeGeometry( draco, decoder, decoderBuffer, taskConfig );
							const buffers = geometry.attributes.map( attr => attr.array.buffer );
							if ( geometry.index ) buffers.push( geometry.index.array.buffer );
							self.postMessage( {
								type: 'decode',
								id: message.id,
								geometry
							}, buffers );

						} catch ( error ) {

							console.error( error );
							self.postMessage( {
								type: 'error',
								id: message.id,
								error: error.message
							} );

						} finally {

							draco.destroy( decoderBuffer );
							draco.destroy( decoder );

						}

					} );
					break;

			}

		};

		function decodeGeometry( draco, decoder, decoderBuffer, taskConfig ) {

			const attributeIDs = taskConfig.attributeIDs;
			const attributeTypes = taskConfig.attributeTypes;
			let dracoGeometry;
			let decodingStatus;
			const geometryType = decoder.GetEncodedGeometryType( decoderBuffer );

			if ( geometryType === draco.TRIANGULAR_MESH ) {

				dracoGeometry = new draco.Mesh();
				decodingStatus = decoder.DecodeBufferToMesh( decoderBuffer, dracoGeometry );

			} else if ( geometryType === draco.POINT_CLOUD ) {

				dracoGeometry = new draco.PointCloud();
				decodingStatus = decoder.DecodeBufferToPointCloud( decoderBuffer, dracoGeometry );

			} else {

				throw new Error( 'THREE.DRACOLoader: Unexpected geometry type.' );

			}

			if ( ! decodingStatus.ok() || dracoGeometry.ptr === 0 ) {

				throw new Error( 'THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg() );

			}

			const geometry = {
				index: null,
				attributes: []
			}; // Gather all vertex attributes.

			for ( const attributeName in attributeIDs ) {

				const attributeType = self[ attributeTypes[ attributeName ] ];
				let attribute;
				let attributeID; // A Draco file may be created with default vertex attributes, whose attribute IDs
				// are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
				// a Draco file may contain a custom set of attributes, identified by known unique
				// IDs. glTF files always do the latter, and `.drc` files typically do the former.

				if ( taskConfig.useUniqueIDs ) {

					attributeID = attributeIDs[ attributeName ];
					attribute = decoder.GetAttributeByUniqueId( dracoGeometry, attributeID );

				} else {

					attributeID = decoder.GetAttributeId( dracoGeometry, draco[ attributeIDs[ attributeName ] ] );
					if ( attributeID === - 1 ) continue;
					attribute = decoder.GetAttribute( dracoGeometry, attributeID );

				}

				geometry.attributes.push( decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) );

			} // Add index.


			if ( geometryType === draco.TRIANGULAR_MESH ) {

				geometry.index = decodeIndex( draco, decoder, dracoGeometry );

			}

			draco.destroy( dracoGeometry );
			return geometry;

		}

		function decodeIndex( draco, decoder, dracoGeometry ) {

			const numFaces = dracoGeometry.num_faces();
			const numIndices = numFaces * 3;
			const byteLength = numIndices * 4;

			const ptr = draco._malloc( byteLength );

			decoder.GetTrianglesUInt32Array( dracoGeometry, byteLength, ptr );
			const index = new Uint32Array( draco.HEAPF32.buffer, ptr, numIndices ).slice();

			draco._free( ptr );

			return {
				array: index,
				itemSize: 1
			};

		}

		function decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) {

			const numComponents = attribute.num_components();
			const numPoints = dracoGeometry.num_points();
			const numValues = numPoints * numComponents;
			const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
			const dataType = getDracoDataType( draco, attributeType );

			const ptr = draco._malloc( byteLength );

			decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, dataType, byteLength, ptr );
			const array = new attributeType( draco.HEAPF32.buffer, ptr, numValues ).slice();

			draco._free( ptr );

			return {
				name: attributeName,
				array: array,
				itemSize: numComponents
			};

		}

		function getDracoDataType( draco, attributeType ) {

			switch ( attributeType ) {

				case Float32Array:
					return draco.DT_FLOAT32;

				case Int8Array:
					return draco.DT_INT8;

				case Int16Array:
					return draco.DT_INT16;

				case Int32Array:
					return draco.DT_INT32;

				case Uint8Array:
					return draco.DT_UINT8;

				case Uint16Array:
					return draco.DT_UINT16;

				case Uint32Array:
					return draco.DT_UINT32;

			}

		}

	}

	THREE.DRACOLoader = DRACOLoader;

} )();
( function () {

	class SVGLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager ); // Default dots per inch

			this.defaultDPI = 90; // Accepted units: 'mm', 'cm', 'in', 'pt', 'pc', 'px'

			this.defaultUnit = 'px';

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const loader = new THREE.FileLoader( scope.manager );
			loader.setPath( scope.path );
			loader.setRequestHeader( scope.requestHeader );
			loader.setWithCredentials( scope.withCredentials );
			loader.load( url, function ( text ) {

				try {

					onLoad( scope.parse( text ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		parse( text ) {

			const scope = this;

			function parseNode( node, style ) {

				if ( node.nodeType !== 1 ) return;
				const transform = getNodeTransform( node );
				let isDefsNode = false;
				let path = null;

				switch ( node.nodeName ) {

					case 'svg':
						break;

					case 'style':
						parseCSSStylesheet( node );
						break;

					case 'g':
						style = parseStyle( node, style );
						break;

					case 'path':
						style = parseStyle( node, style );
						if ( node.hasAttribute( 'd' ) ) path = parsePathNode( node );
						break;

					case 'rect':
						style = parseStyle( node, style );
						path = parseRectNode( node );
						break;

					case 'polygon':
						style = parseStyle( node, style );
						path = parsePolygonNode( node );
						break;

					case 'polyline':
						style = parseStyle( node, style );
						path = parsePolylineNode( node );
						break;

					case 'circle':
						style = parseStyle( node, style );
						path = parseCircleNode( node );
						break;

					case 'ellipse':
						style = parseStyle( node, style );
						path = parseEllipseNode( node );
						break;

					case 'line':
						style = parseStyle( node, style );
						path = parseLineNode( node );
						break;

					case 'defs':
						isDefsNode = true;
						break;

					case 'use':
						style = parseStyle( node, style );
						const href = node.getAttributeNS( 'http://www.w3.org/1999/xlink', 'href' ) || '';
						const usedNodeId = href.substring( 1 );
						const usedNode = node.viewportElement.getElementById( usedNodeId );

						if ( usedNode ) {

							parseNode( usedNode, style );

						} else {

							console.warn( 'SVGLoader: \'use node\' references non-existent node id: ' + usedNodeId );

						}

						break;

					default: // console.log( node );

				}

				if ( path ) {

					if ( style.fill !== undefined && style.fill !== 'none' ) {

						path.color.setStyle( style.fill );

					}

					transformPath( path, currentTransform );
					paths.push( path );
					path.userData = {
						node: node,
						style: style
					};

				}

				const childNodes = node.childNodes;

				for ( let i = 0; i < childNodes.length; i ++ ) {

					const node = childNodes[ i ];

					if ( isDefsNode && node.nodeName !== 'style' && node.nodeName !== 'defs' ) {

						// Ignore everything in defs except CSS style definitions
						// and nested defs, because it is OK by the standard to have
						// <style/> there.
						continue;

					}

					parseNode( node, style );

				}

				if ( transform ) {

					transformStack.pop();

					if ( transformStack.length > 0 ) {

						currentTransform.copy( transformStack[ transformStack.length - 1 ] );

					} else {

						currentTransform.identity();

					}

				}

			}

			function parsePathNode( node ) {

				const path = new THREE.ShapePath();
				const point = new THREE.Vector2();
				const control = new THREE.Vector2();
				const firstPoint = new THREE.Vector2();
				let isFirstPoint = true;
				let doSetFirstPoint = false;
				const d = node.getAttribute( 'd' ); // console.log( d );

				const commands = d.match( /[a-df-z][^a-df-z]*/ig );

				for ( let i = 0, l = commands.length; i < l; i ++ ) {

					const command = commands[ i ];
					const type = command.charAt( 0 );
					const data = command.slice( 1 ).trim();

					if ( isFirstPoint === true ) {

						doSetFirstPoint = true;
						isFirstPoint = false;

					}

					let numbers;

					switch ( type ) {

						case 'M':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								point.x = numbers[ j + 0 ];
								point.y = numbers[ j + 1 ];
								control.x = point.x;
								control.y = point.y;

								if ( j === 0 ) {

									path.moveTo( point.x, point.y );

								} else {

									path.lineTo( point.x, point.y );

								}

								if ( j === 0 ) firstPoint.copy( point );

							}

							break;

						case 'H':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j ++ ) {

								point.x = numbers[ j ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'V':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j ++ ) {

								point.y = numbers[ j ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'L':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								point.x = numbers[ j + 0 ];
								point.y = numbers[ j + 1 ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'C':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 6 ) {

								path.bezierCurveTo( numbers[ j + 0 ], numbers[ j + 1 ], numbers[ j + 2 ], numbers[ j + 3 ], numbers[ j + 4 ], numbers[ j + 5 ] );
								control.x = numbers[ j + 2 ];
								control.y = numbers[ j + 3 ];
								point.x = numbers[ j + 4 ];
								point.y = numbers[ j + 5 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'S':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 4 ) {

								path.bezierCurveTo( getReflection( point.x, control.x ), getReflection( point.y, control.y ), numbers[ j + 0 ], numbers[ j + 1 ], numbers[ j + 2 ], numbers[ j + 3 ] );
								control.x = numbers[ j + 0 ];
								control.y = numbers[ j + 1 ];
								point.x = numbers[ j + 2 ];
								point.y = numbers[ j + 3 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'Q':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 4 ) {

								path.quadraticCurveTo( numbers[ j + 0 ], numbers[ j + 1 ], numbers[ j + 2 ], numbers[ j + 3 ] );
								control.x = numbers[ j + 0 ];
								control.y = numbers[ j + 1 ];
								point.x = numbers[ j + 2 ];
								point.y = numbers[ j + 3 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'T':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								const rx = getReflection( point.x, control.x );
								const ry = getReflection( point.y, control.y );
								path.quadraticCurveTo( rx, ry, numbers[ j + 0 ], numbers[ j + 1 ] );
								control.x = rx;
								control.y = ry;
								point.x = numbers[ j + 0 ];
								point.y = numbers[ j + 1 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'A':
							numbers = parseFloats( data, [ 3, 4 ], 7 );

							for ( let j = 0, jl = numbers.length; j < jl; j += 7 ) {

								// skip command if start point == end point
								if ( numbers[ j + 5 ] == point.x && numbers[ j + 6 ] == point.y ) continue;
								const start = point.clone();
								point.x = numbers[ j + 5 ];
								point.y = numbers[ j + 6 ];
								control.x = point.x;
								control.y = point.y;
								parseArcCommand( path, numbers[ j ], numbers[ j + 1 ], numbers[ j + 2 ], numbers[ j + 3 ], numbers[ j + 4 ], start, point );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'm':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								point.x += numbers[ j + 0 ];
								point.y += numbers[ j + 1 ];
								control.x = point.x;
								control.y = point.y;

								if ( j === 0 ) {

									path.moveTo( point.x, point.y );

								} else {

									path.lineTo( point.x, point.y );

								}

								if ( j === 0 ) firstPoint.copy( point );

							}

							break;

						case 'h':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j ++ ) {

								point.x += numbers[ j ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'v':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j ++ ) {

								point.y += numbers[ j ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'l':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								point.x += numbers[ j + 0 ];
								point.y += numbers[ j + 1 ];
								control.x = point.x;
								control.y = point.y;
								path.lineTo( point.x, point.y );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'c':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 6 ) {

								path.bezierCurveTo( point.x + numbers[ j + 0 ], point.y + numbers[ j + 1 ], point.x + numbers[ j + 2 ], point.y + numbers[ j + 3 ], point.x + numbers[ j + 4 ], point.y + numbers[ j + 5 ] );
								control.x = point.x + numbers[ j + 2 ];
								control.y = point.y + numbers[ j + 3 ];
								point.x += numbers[ j + 4 ];
								point.y += numbers[ j + 5 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 's':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 4 ) {

								path.bezierCurveTo( getReflection( point.x, control.x ), getReflection( point.y, control.y ), point.x + numbers[ j + 0 ], point.y + numbers[ j + 1 ], point.x + numbers[ j + 2 ], point.y + numbers[ j + 3 ] );
								control.x = point.x + numbers[ j + 0 ];
								control.y = point.y + numbers[ j + 1 ];
								point.x += numbers[ j + 2 ];
								point.y += numbers[ j + 3 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'q':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 4 ) {

								path.quadraticCurveTo( point.x + numbers[ j + 0 ], point.y + numbers[ j + 1 ], point.x + numbers[ j + 2 ], point.y + numbers[ j + 3 ] );
								control.x = point.x + numbers[ j + 0 ];
								control.y = point.y + numbers[ j + 1 ];
								point.x += numbers[ j + 2 ];
								point.y += numbers[ j + 3 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 't':
							numbers = parseFloats( data );

							for ( let j = 0, jl = numbers.length; j < jl; j += 2 ) {

								const rx = getReflection( point.x, control.x );
								const ry = getReflection( point.y, control.y );
								path.quadraticCurveTo( rx, ry, point.x + numbers[ j + 0 ], point.y + numbers[ j + 1 ] );
								control.x = rx;
								control.y = ry;
								point.x = point.x + numbers[ j + 0 ];
								point.y = point.y + numbers[ j + 1 ];
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'a':
							numbers = parseFloats( data, [ 3, 4 ], 7 );

							for ( let j = 0, jl = numbers.length; j < jl; j += 7 ) {

								// skip command if no displacement
								if ( numbers[ j + 5 ] == 0 && numbers[ j + 6 ] == 0 ) continue;
								const start = point.clone();
								point.x += numbers[ j + 5 ];
								point.y += numbers[ j + 6 ];
								control.x = point.x;
								control.y = point.y;
								parseArcCommand( path, numbers[ j ], numbers[ j + 1 ], numbers[ j + 2 ], numbers[ j + 3 ], numbers[ j + 4 ], start, point );
								if ( j === 0 && doSetFirstPoint === true ) firstPoint.copy( point );

							}

							break;

						case 'Z':
						case 'z':
							path.currentPath.autoClose = true;

							if ( path.currentPath.curves.length > 0 ) {

								// Reset point to beginning of THREE.Path
								point.copy( firstPoint );
								path.currentPath.currentPoint.copy( point );
								isFirstPoint = true;

							}

							break;

						default:
							console.warn( command );

					} // console.log( type, parseFloats( data ), parseFloats( data ).length  )


					doSetFirstPoint = false;

				}

				return path;

			}

			function parseCSSStylesheet( node ) {

				if ( ! node.sheet || ! node.sheet.cssRules || ! node.sheet.cssRules.length ) return;

				for ( let i = 0; i < node.sheet.cssRules.length; i ++ ) {

					const stylesheet = node.sheet.cssRules[ i ];
					if ( stylesheet.type !== 1 ) continue;
					const selectorList = stylesheet.selectorText.split( /,/gm ).filter( Boolean ).map( i => i.trim() );

					for ( let j = 0; j < selectorList.length; j ++ ) {

						// Remove empty rules
						const definitions = Object.fromEntries( Object.entries( stylesheet.style ).filter( ( [ , v ] ) => v !== '' ) );
						stylesheets[ selectorList[ j ] ] = Object.assign( stylesheets[ selectorList[ j ] ] || {}, definitions );

					}

				}

			}
			/**
     * https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
     * https://mortoray.com/2017/02/16/rendering-an-svg-elliptical-arc-as-bezier-curves/ Appendix: Endpoint to center arc conversion
     * From
     * rx ry x-axis-rotation large-arc-flag sweep-flag x y
     * To
     * aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation
     */


			function parseArcCommand( path, rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, start, end ) {

				if ( rx == 0 || ry == 0 ) {

					// draw a line if either of the radii == 0
					path.lineTo( end.x, end.y );
					return;

				}

				x_axis_rotation = x_axis_rotation * Math.PI / 180; // Ensure radii are positive

				rx = Math.abs( rx );
				ry = Math.abs( ry ); // Compute (x1', y1')

				const dx2 = ( start.x - end.x ) / 2.0;
				const dy2 = ( start.y - end.y ) / 2.0;
				const x1p = Math.cos( x_axis_rotation ) * dx2 + Math.sin( x_axis_rotation ) * dy2;
				const y1p = - Math.sin( x_axis_rotation ) * dx2 + Math.cos( x_axis_rotation ) * dy2; // Compute (cx', cy')

				let rxs = rx * rx;
				let rys = ry * ry;
				const x1ps = x1p * x1p;
				const y1ps = y1p * y1p; // Ensure radii are large enough

				const cr = x1ps / rxs + y1ps / rys;

				if ( cr > 1 ) {

					// scale up rx,ry equally so cr == 1
					const s = Math.sqrt( cr );
					rx = s * rx;
					ry = s * ry;
					rxs = rx * rx;
					rys = ry * ry;

				}

				const dq = rxs * y1ps + rys * x1ps;
				const pq = ( rxs * rys - dq ) / dq;
				let q = Math.sqrt( Math.max( 0, pq ) );
				if ( large_arc_flag === sweep_flag ) q = - q;
				const cxp = q * rx * y1p / ry;
				const cyp = - q * ry * x1p / rx; // Step 3: Compute (cx, cy) from (cx', cy')

				const cx = Math.cos( x_axis_rotation ) * cxp - Math.sin( x_axis_rotation ) * cyp + ( start.x + end.x ) / 2;
				const cy = Math.sin( x_axis_rotation ) * cxp + Math.cos( x_axis_rotation ) * cyp + ( start.y + end.y ) / 2; // Step 4: Compute θ1 and Δθ

				const theta = svgAngle( 1, 0, ( x1p - cxp ) / rx, ( y1p - cyp ) / ry );
				const delta = svgAngle( ( x1p - cxp ) / rx, ( y1p - cyp ) / ry, ( - x1p - cxp ) / rx, ( - y1p - cyp ) / ry ) % ( Math.PI * 2 );
				path.currentPath.absellipse( cx, cy, rx, ry, theta, theta + delta, sweep_flag === 0, x_axis_rotation );

			}

			function svgAngle( ux, uy, vx, vy ) {

				const dot = ux * vx + uy * vy;
				const len = Math.sqrt( ux * ux + uy * uy ) * Math.sqrt( vx * vx + vy * vy );
				let ang = Math.acos( Math.max( - 1, Math.min( 1, dot / len ) ) ); // floating point precision, slightly over values appear

				if ( ux * vy - uy * vx < 0 ) ang = - ang;
				return ang;

			}
			/*
    * According to https://www.w3.org/TR/SVG/shapes.html#RectElementRXAttribute
    * rounded corner should be rendered to elliptical arc, but bezier curve does the job well enough
    */


			function parseRectNode( node ) {

				const x = parseFloatWithUnits( node.getAttribute( 'x' ) || 0 );
				const y = parseFloatWithUnits( node.getAttribute( 'y' ) || 0 );
				const rx = parseFloatWithUnits( node.getAttribute( 'rx' ) || node.getAttribute( 'ry' ) || 0 );
				const ry = parseFloatWithUnits( node.getAttribute( 'ry' ) || node.getAttribute( 'rx' ) || 0 );
				const w = parseFloatWithUnits( node.getAttribute( 'width' ) );
				const h = parseFloatWithUnits( node.getAttribute( 'height' ) ); // Ellipse arc to Bezier approximation Coefficient (Inversed). See:
				// https://spencermortensen.com/articles/bezier-circle/

				const bci = 1 - 0.551915024494;
				const path = new THREE.ShapePath(); // top left

				path.moveTo( x + rx, y ); // top right

				path.lineTo( x + w - rx, y );

				if ( rx !== 0 || ry !== 0 ) {

					path.bezierCurveTo( x + w - rx * bci, y, x + w, y + ry * bci, x + w, y + ry );

				} // bottom right


				path.lineTo( x + w, y + h - ry );

				if ( rx !== 0 || ry !== 0 ) {

					path.bezierCurveTo( x + w, y + h - ry * bci, x + w - rx * bci, y + h, x + w - rx, y + h );

				} // bottom left


				path.lineTo( x + rx, y + h );

				if ( rx !== 0 || ry !== 0 ) {

					path.bezierCurveTo( x + rx * bci, y + h, x, y + h - ry * bci, x, y + h - ry );

				} // back to top left


				path.lineTo( x, y + ry );

				if ( rx !== 0 || ry !== 0 ) {

					path.bezierCurveTo( x, y + ry * bci, x + rx * bci, y, x + rx, y );

				}

				return path;

			}

			function parsePolygonNode( node ) {

				function iterator( match, a, b ) {

					const x = parseFloatWithUnits( a );
					const y = parseFloatWithUnits( b );

					if ( index === 0 ) {

						path.moveTo( x, y );

					} else {

						path.lineTo( x, y );

					}

					index ++;

				}

				const regex = /(-?[\d\.?]+)[,|\s](-?[\d\.?]+)/g;
				const path = new THREE.ShapePath();
				let index = 0;
				node.getAttribute( 'points' ).replace( regex, iterator );
				path.currentPath.autoClose = true;
				return path;

			}

			function parsePolylineNode( node ) {

				function iterator( match, a, b ) {

					const x = parseFloatWithUnits( a );
					const y = parseFloatWithUnits( b );

					if ( index === 0 ) {

						path.moveTo( x, y );

					} else {

						path.lineTo( x, y );

					}

					index ++;

				}

				const regex = /(-?[\d\.?]+)[,|\s](-?[\d\.?]+)/g;
				const path = new THREE.ShapePath();
				let index = 0;
				node.getAttribute( 'points' ).replace( regex, iterator );
				path.currentPath.autoClose = false;
				return path;

			}

			function parseCircleNode( node ) {

				const x = parseFloatWithUnits( node.getAttribute( 'cx' ) || 0 );
				const y = parseFloatWithUnits( node.getAttribute( 'cy' ) || 0 );
				const r = parseFloatWithUnits( node.getAttribute( 'r' ) || 0 );
				const subpath = new THREE.Path();
				subpath.absarc( x, y, r, 0, Math.PI * 2 );
				const path = new THREE.ShapePath();
				path.subPaths.push( subpath );
				return path;

			}

			function parseEllipseNode( node ) {

				const x = parseFloatWithUnits( node.getAttribute( 'cx' ) || 0 );
				const y = parseFloatWithUnits( node.getAttribute( 'cy' ) || 0 );
				const rx = parseFloatWithUnits( node.getAttribute( 'rx' ) || 0 );
				const ry = parseFloatWithUnits( node.getAttribute( 'ry' ) || 0 );
				const subpath = new THREE.Path();
				subpath.absellipse( x, y, rx, ry, 0, Math.PI * 2 );
				const path = new THREE.ShapePath();
				path.subPaths.push( subpath );
				return path;

			}

			function parseLineNode( node ) {

				const x1 = parseFloatWithUnits( node.getAttribute( 'x1' ) || 0 );
				const y1 = parseFloatWithUnits( node.getAttribute( 'y1' ) || 0 );
				const x2 = parseFloatWithUnits( node.getAttribute( 'x2' ) || 0 );
				const y2 = parseFloatWithUnits( node.getAttribute( 'y2' ) || 0 );
				const path = new THREE.ShapePath();
				path.moveTo( x1, y1 );
				path.lineTo( x2, y2 );
				path.currentPath.autoClose = false;
				return path;

			} //


			function parseStyle( node, style ) {

				style = Object.assign( {}, style ); // clone style

				let stylesheetStyles = {};

				if ( node.hasAttribute( 'class' ) ) {

					const classSelectors = node.getAttribute( 'class' ).split( /\s/ ).filter( Boolean ).map( i => i.trim() );

					for ( let i = 0; i < classSelectors.length; i ++ ) {

						stylesheetStyles = Object.assign( stylesheetStyles, stylesheets[ '.' + classSelectors[ i ] ] );

					}

				}

				if ( node.hasAttribute( 'id' ) ) {

					stylesheetStyles = Object.assign( stylesheetStyles, stylesheets[ '#' + node.getAttribute( 'id' ) ] );

				}

				function addStyle( svgName, jsName, adjustFunction ) {

					if ( adjustFunction === undefined ) adjustFunction = function copy( v ) {

						if ( v.startsWith( 'url' ) ) console.warn( 'SVGLoader: url access in attributes is not implemented.' );
						return v;

					};

					if ( node.hasAttribute( svgName ) ) style[ jsName ] = adjustFunction( node.getAttribute( svgName ) );
					if ( stylesheetStyles[ svgName ] ) style[ jsName ] = adjustFunction( stylesheetStyles[ svgName ] );
					if ( node.style && node.style[ svgName ] !== '' ) style[ jsName ] = adjustFunction( node.style[ svgName ] );

				}

				function clamp( v ) {

					return Math.max( 0, Math.min( 1, parseFloatWithUnits( v ) ) );

				}

				function positive( v ) {

					return Math.max( 0, parseFloatWithUnits( v ) );

				}

				addStyle( 'fill', 'fill' );
				addStyle( 'fill-opacity', 'fillOpacity', clamp );
				addStyle( 'fill-rule', 'fillRule' );
				addStyle( 'opacity', 'opacity', clamp );
				addStyle( 'stroke', 'stroke' );
				addStyle( 'stroke-opacity', 'strokeOpacity', clamp );
				addStyle( 'stroke-width', 'strokeWidth', positive );
				addStyle( 'stroke-linejoin', 'strokeLineJoin' );
				addStyle( 'stroke-linecap', 'strokeLineCap' );
				addStyle( 'stroke-miterlimit', 'strokeMiterLimit', positive );
				addStyle( 'visibility', 'visibility' );
				return style;

			} // http://www.w3.org/TR/SVG11/implnote.html#PathElementImplementationNotes


			function getReflection( a, b ) {

				return a - ( b - a );

			} // from https://github.com/ppvg/svg-numbers (MIT License)


			function parseFloats( input, flags, stride ) {

				if ( typeof input !== 'string' ) {

					throw new TypeError( 'Invalid input: ' + typeof input );

				} // Character groups


				const RE = {
					SEPARATOR: /[ \t\r\n\,.\-+]/,
					WHITESPACE: /[ \t\r\n]/,
					DIGIT: /[\d]/,
					SIGN: /[-+]/,
					POINT: /\./,
					COMMA: /,/,
					EXP: /e/i,
					FLAGS: /[01]/
				}; // States

				const SEP = 0;
				const INT = 1;
				const FLOAT = 2;
				const EXP = 3;
				let state = SEP;
				let seenComma = true;
				let number = '',
					exponent = '';
				const result = [];

				function throwSyntaxError( current, i, partial ) {

					const error = new SyntaxError( 'Unexpected character "' + current + '" at index ' + i + '.' );
					error.partial = partial;
					throw error;

				}

				function newNumber() {

					if ( number !== '' ) {

						if ( exponent === '' ) result.push( Number( number ) ); else result.push( Number( number ) * Math.pow( 10, Number( exponent ) ) );

					}

					number = '';
					exponent = '';

				}

				let current;
				const length = input.length;

				for ( let i = 0; i < length; i ++ ) {

					current = input[ i ]; // check for flags

					if ( Array.isArray( flags ) && flags.includes( result.length % stride ) && RE.FLAGS.test( current ) ) {

						state = INT;
						number = current;
						newNumber();
						continue;

					} // parse until next number


					if ( state === SEP ) {

						// eat whitespace
						if ( RE.WHITESPACE.test( current ) ) {

							continue;

						} // start new number


						if ( RE.DIGIT.test( current ) || RE.SIGN.test( current ) ) {

							state = INT;
							number = current;
							continue;

						}

						if ( RE.POINT.test( current ) ) {

							state = FLOAT;
							number = current;
							continue;

						} // throw on double commas (e.g. "1, , 2")


						if ( RE.COMMA.test( current ) ) {

							if ( seenComma ) {

								throwSyntaxError( current, i, result );

							}

							seenComma = true;

						}

					} // parse integer part


					if ( state === INT ) {

						if ( RE.DIGIT.test( current ) ) {

							number += current;
							continue;

						}

						if ( RE.POINT.test( current ) ) {

							number += current;
							state = FLOAT;
							continue;

						}

						if ( RE.EXP.test( current ) ) {

							state = EXP;
							continue;

						} // throw on double signs ("-+1"), but not on sign as separator ("-1-2")


						if ( RE.SIGN.test( current ) && number.length === 1 && RE.SIGN.test( number[ 0 ] ) ) {

							throwSyntaxError( current, i, result );

						}

					} // parse decimal part


					if ( state === FLOAT ) {

						if ( RE.DIGIT.test( current ) ) {

							number += current;
							continue;

						}

						if ( RE.EXP.test( current ) ) {

							state = EXP;
							continue;

						} // throw on double decimal points (e.g. "1..2")


						if ( RE.POINT.test( current ) && number[ number.length - 1 ] === '.' ) {

							throwSyntaxError( current, i, result );

						}

					} // parse exponent part


					if ( state === EXP ) {

						if ( RE.DIGIT.test( current ) ) {

							exponent += current;
							continue;

						}

						if ( RE.SIGN.test( current ) ) {

							if ( exponent === '' ) {

								exponent += current;
								continue;

							}

							if ( exponent.length === 1 && RE.SIGN.test( exponent ) ) {

								throwSyntaxError( current, i, result );

							}

						}

					} // end of number


					if ( RE.WHITESPACE.test( current ) ) {

						newNumber();
						state = SEP;
						seenComma = false;

					} else if ( RE.COMMA.test( current ) ) {

						newNumber();
						state = SEP;
						seenComma = true;

					} else if ( RE.SIGN.test( current ) ) {

						newNumber();
						state = INT;
						number = current;

					} else if ( RE.POINT.test( current ) ) {

						newNumber();
						state = FLOAT;
						number = current;

					} else {

						throwSyntaxError( current, i, result );

					}

				} // add the last number found (if any)


				newNumber();
				return result;

			} // Units


			const units = [ 'mm', 'cm', 'in', 'pt', 'pc', 'px' ]; // Conversion: [ fromUnit ][ toUnit ] (-1 means dpi dependent)

			const unitConversion = {
				'mm': {
					'mm': 1,
					'cm': 0.1,
					'in': 1 / 25.4,
					'pt': 72 / 25.4,
					'pc': 6 / 25.4,
					'px': - 1
				},
				'cm': {
					'mm': 10,
					'cm': 1,
					'in': 1 / 2.54,
					'pt': 72 / 2.54,
					'pc': 6 / 2.54,
					'px': - 1
				},
				'in': {
					'mm': 25.4,
					'cm': 2.54,
					'in': 1,
					'pt': 72,
					'pc': 6,
					'px': - 1
				},
				'pt': {
					'mm': 25.4 / 72,
					'cm': 2.54 / 72,
					'in': 1 / 72,
					'pt': 1,
					'pc': 6 / 72,
					'px': - 1
				},
				'pc': {
					'mm': 25.4 / 6,
					'cm': 2.54 / 6,
					'in': 1 / 6,
					'pt': 72 / 6,
					'pc': 1,
					'px': - 1
				},
				'px': {
					'px': 1
				}
			};

			function parseFloatWithUnits( string ) {

				let theUnit = 'px';

				if ( typeof string === 'string' || string instanceof String ) {

					for ( let i = 0, n = units.length; i < n; i ++ ) {

						const u = units[ i ];

						if ( string.endsWith( u ) ) {

							theUnit = u;
							string = string.substring( 0, string.length - u.length );
							break;

						}

					}

				}

				let scale = undefined;

				if ( theUnit === 'px' && scope.defaultUnit !== 'px' ) {

					// Conversion scale from  pixels to inches, then to default units
					scale = unitConversion[ 'in' ][ scope.defaultUnit ] / scope.defaultDPI;

				} else {

					scale = unitConversion[ theUnit ][ scope.defaultUnit ];

					if ( scale < 0 ) {

						// Conversion scale to pixels
						scale = unitConversion[ theUnit ][ 'in' ] * scope.defaultDPI;

					}

				}

				return scale * parseFloat( string );

			} // Transforms


			function getNodeTransform( node ) {

				if ( ! ( node.hasAttribute( 'transform' ) || node.nodeName === 'use' && ( node.hasAttribute( 'x' ) || node.hasAttribute( 'y' ) ) ) ) {

					return null;

				}

				const transform = parseNodeTransform( node );

				if ( transformStack.length > 0 ) {

					transform.premultiply( transformStack[ transformStack.length - 1 ] );

				}

				currentTransform.copy( transform );
				transformStack.push( transform );
				return transform;

			}

			function parseNodeTransform( node ) {

				const transform = new THREE.Matrix3();
				const currentTransform = tempTransform0;

				if ( node.nodeName === 'use' && ( node.hasAttribute( 'x' ) || node.hasAttribute( 'y' ) ) ) {

					const tx = parseFloatWithUnits( node.getAttribute( 'x' ) );
					const ty = parseFloatWithUnits( node.getAttribute( 'y' ) );
					transform.translate( tx, ty );

				}

				if ( node.hasAttribute( 'transform' ) ) {

					const transformsTexts = node.getAttribute( 'transform' ).split( ')' );

					for ( let tIndex = transformsTexts.length - 1; tIndex >= 0; tIndex -- ) {

						const transformText = transformsTexts[ tIndex ].trim();
						if ( transformText === '' ) continue;
						const openParPos = transformText.indexOf( '(' );
						const closeParPos = transformText.length;

						if ( openParPos > 0 && openParPos < closeParPos ) {

							const transformType = transformText.slice( 0, openParPos );
							const array = parseFloats( transformText.slice( openParPos + 1 ) );
							currentTransform.identity();

							switch ( transformType ) {

								case 'translate':
									if ( array.length >= 1 ) {

										const tx = array[ 0 ];
										let ty = tx;

										if ( array.length >= 2 ) {

											ty = array[ 1 ];

										}

										currentTransform.translate( tx, ty );

									}

									break;

								case 'rotate':
									if ( array.length >= 1 ) {

										let angle = 0;
										let cx = 0;
										let cy = 0; // Angle

										angle = - array[ 0 ] * Math.PI / 180;

										if ( array.length >= 3 ) {

											// Center x, y
											cx = array[ 1 ];
											cy = array[ 2 ];

										} // Rotate around center (cx, cy)


										tempTransform1.identity().translate( - cx, - cy );
										tempTransform2.identity().rotate( angle );
										tempTransform3.multiplyMatrices( tempTransform2, tempTransform1 );
										tempTransform1.identity().translate( cx, cy );
										currentTransform.multiplyMatrices( tempTransform1, tempTransform3 );

									}

									break;

								case 'scale':
									if ( array.length >= 1 ) {

										const scaleX = array[ 0 ];
										let scaleY = scaleX;

										if ( array.length >= 2 ) {

											scaleY = array[ 1 ];

										}

										currentTransform.scale( scaleX, scaleY );

									}

									break;

								case 'skewX':
									if ( array.length === 1 ) {

										currentTransform.set( 1, Math.tan( array[ 0 ] * Math.PI / 180 ), 0, 0, 1, 0, 0, 0, 1 );

									}

									break;

								case 'skewY':
									if ( array.length === 1 ) {

										currentTransform.set( 1, 0, 0, Math.tan( array[ 0 ] * Math.PI / 180 ), 1, 0, 0, 0, 1 );

									}

									break;

								case 'matrix':
									if ( array.length === 6 ) {

										currentTransform.set( array[ 0 ], array[ 2 ], array[ 4 ], array[ 1 ], array[ 3 ], array[ 5 ], 0, 0, 1 );

									}

									break;

							}

						}

						transform.premultiply( currentTransform );

					}

				}

				return transform;

			}

			function transformPath( path, m ) {

				function transfVec2( v2 ) {

					tempV3.set( v2.x, v2.y, 1 ).applyMatrix3( m );
					v2.set( tempV3.x, tempV3.y );

				}

				const isRotated = isTransformRotated( m );
				const subPaths = path.subPaths;

				for ( let i = 0, n = subPaths.length; i < n; i ++ ) {

					const subPath = subPaths[ i ];
					const curves = subPath.curves;

					for ( let j = 0; j < curves.length; j ++ ) {

						const curve = curves[ j ];

						if ( curve.isLineCurve ) {

							transfVec2( curve.v1 );
							transfVec2( curve.v2 );

						} else if ( curve.isCubicBezierCurve ) {

							transfVec2( curve.v0 );
							transfVec2( curve.v1 );
							transfVec2( curve.v2 );
							transfVec2( curve.v3 );

						} else if ( curve.isQuadraticBezierCurve ) {

							transfVec2( curve.v0 );
							transfVec2( curve.v1 );
							transfVec2( curve.v2 );

						} else if ( curve.isEllipseCurve ) {

							if ( isRotated ) {

								console.warn( 'SVGLoader: Elliptic arc or ellipse rotation or skewing is not implemented.' );

							}

							tempV2.set( curve.aX, curve.aY );
							transfVec2( tempV2 );
							curve.aX = tempV2.x;
							curve.aY = tempV2.y;
							curve.xRadius *= getTransformScaleX( m );
							curve.yRadius *= getTransformScaleY( m );

						}

					}

				}

			}

			function isTransformRotated( m ) {

				return m.elements[ 1 ] !== 0 || m.elements[ 3 ] !== 0;

			}

			function getTransformScaleX( m ) {

				const te = m.elements;
				return Math.sqrt( te[ 0 ] * te[ 0 ] + te[ 1 ] * te[ 1 ] );

			}

			function getTransformScaleY( m ) {

				const te = m.elements;
				return Math.sqrt( te[ 3 ] * te[ 3 ] + te[ 4 ] * te[ 4 ] );

			} //


			const paths = [];
			const stylesheets = {};
			const transformStack = [];
			const tempTransform0 = new THREE.Matrix3();
			const tempTransform1 = new THREE.Matrix3();
			const tempTransform2 = new THREE.Matrix3();
			const tempTransform3 = new THREE.Matrix3();
			const tempV2 = new THREE.Vector2();
			const tempV3 = new THREE.Vector3();
			const currentTransform = new THREE.Matrix3();
			const xml = new DOMParser().parseFromString( text, 'image/svg+xml' ); // application/xml

			parseNode( xml.documentElement, {
				fill: '#000',
				fillOpacity: 1,
				strokeOpacity: 1,
				strokeWidth: 1,
				strokeLineJoin: 'miter',
				strokeLineCap: 'butt',
				strokeMiterLimit: 4
			} );
			const data = {
				paths: paths,
				xml: xml.documentElement
			}; // console.log( paths );

			return data;

		}

		static createShapes( shapePath ) {

			// Param shapePath: a shapepath as returned by the parse function of this class
			// Returns THREE.Shape object
			const BIGNUMBER = 999999999;
			const IntersectionLocationType = {
				ORIGIN: 0,
				DESTINATION: 1,
				BETWEEN: 2,
				LEFT: 3,
				RIGHT: 4,
				BEHIND: 5,
				BEYOND: 6
			};
			const classifyResult = {
				loc: IntersectionLocationType.ORIGIN,
				t: 0
			};

			function findEdgeIntersection( a0, a1, b0, b1 ) {

				const x1 = a0.x;
				const x2 = a1.x;
				const x3 = b0.x;
				const x4 = b1.x;
				const y1 = a0.y;
				const y2 = a1.y;
				const y3 = b0.y;
				const y4 = b1.y;
				const nom1 = ( x4 - x3 ) * ( y1 - y3 ) - ( y4 - y3 ) * ( x1 - x3 );
				const nom2 = ( x2 - x1 ) * ( y1 - y3 ) - ( y2 - y1 ) * ( x1 - x3 );
				const denom = ( y4 - y3 ) * ( x2 - x1 ) - ( x4 - x3 ) * ( y2 - y1 );
				const t1 = nom1 / denom;
				const t2 = nom2 / denom;

				if ( denom === 0 && nom1 !== 0 || t1 <= 0 || t1 >= 1 || t2 < 0 || t2 > 1 ) {

					//1. lines are parallel or edges don't intersect
					return null;

				} else if ( nom1 === 0 && denom === 0 ) {

					//2. lines are colinear
					//check if endpoints of edge2 (b0-b1) lies on edge1 (a0-a1)
					for ( let i = 0; i < 2; i ++ ) {

						classifyPoint( i === 0 ? b0 : b1, a0, a1 ); //find position of this endpoints relatively to edge1

						if ( classifyResult.loc == IntersectionLocationType.ORIGIN ) {

							const point = i === 0 ? b0 : b1;
							return {
								x: point.x,
								y: point.y,
								t: classifyResult.t
							};

						} else if ( classifyResult.loc == IntersectionLocationType.BETWEEN ) {

							const x = + ( x1 + classifyResult.t * ( x2 - x1 ) ).toPrecision( 10 );
							const y = + ( y1 + classifyResult.t * ( y2 - y1 ) ).toPrecision( 10 );
							return {
								x: x,
								y: y,
								t: classifyResult.t
							};

						}

					}

					return null;

				} else {

					//3. edges intersect
					for ( let i = 0; i < 2; i ++ ) {

						classifyPoint( i === 0 ? b0 : b1, a0, a1 );

						if ( classifyResult.loc == IntersectionLocationType.ORIGIN ) {

							const point = i === 0 ? b0 : b1;
							return {
								x: point.x,
								y: point.y,
								t: classifyResult.t
							};

						}

					}

					const x = + ( x1 + t1 * ( x2 - x1 ) ).toPrecision( 10 );
					const y = + ( y1 + t1 * ( y2 - y1 ) ).toPrecision( 10 );
					return {
						x: x,
						y: y,
						t: t1
					};

				}

			}

			function classifyPoint( p, edgeStart, edgeEnd ) {

				const ax = edgeEnd.x - edgeStart.x;
				const ay = edgeEnd.y - edgeStart.y;
				const bx = p.x - edgeStart.x;
				const by = p.y - edgeStart.y;
				const sa = ax * by - bx * ay;

				if ( p.x === edgeStart.x && p.y === edgeStart.y ) {

					classifyResult.loc = IntersectionLocationType.ORIGIN;
					classifyResult.t = 0;
					return;

				}

				if ( p.x === edgeEnd.x && p.y === edgeEnd.y ) {

					classifyResult.loc = IntersectionLocationType.DESTINATION;
					classifyResult.t = 1;
					return;

				}

				if ( sa < - Number.EPSILON ) {

					classifyResult.loc = IntersectionLocationType.LEFT;
					return;

				}

				if ( sa > Number.EPSILON ) {

					classifyResult.loc = IntersectionLocationType.RIGHT;
					return;

				}

				if ( ax * bx < 0 || ay * by < 0 ) {

					classifyResult.loc = IntersectionLocationType.BEHIND;
					return;

				}

				if ( Math.sqrt( ax * ax + ay * ay ) < Math.sqrt( bx * bx + by * by ) ) {

					classifyResult.loc = IntersectionLocationType.BEYOND;
					return;

				}

				let t;

				if ( ax !== 0 ) {

					t = bx / ax;

				} else {

					t = by / ay;

				}

				classifyResult.loc = IntersectionLocationType.BETWEEN;
				classifyResult.t = t;

			}

			function getIntersections( path1, path2 ) {

				const intersectionsRaw = [];
				const intersections = [];

				for ( let index = 1; index < path1.length; index ++ ) {

					const path1EdgeStart = path1[ index - 1 ];
					const path1EdgeEnd = path1[ index ];

					for ( let index2 = 1; index2 < path2.length; index2 ++ ) {

						const path2EdgeStart = path2[ index2 - 1 ];
						const path2EdgeEnd = path2[ index2 ];
						const intersection = findEdgeIntersection( path1EdgeStart, path1EdgeEnd, path2EdgeStart, path2EdgeEnd );

						if ( intersection !== null && intersectionsRaw.find( i => i.t <= intersection.t + Number.EPSILON && i.t >= intersection.t - Number.EPSILON ) === undefined ) {

							intersectionsRaw.push( intersection );
							intersections.push( new THREE.Vector2( intersection.x, intersection.y ) );

						}

					}

				}

				return intersections;

			}

			function getScanlineIntersections( scanline, boundingBox, paths ) {

				const center = new THREE.Vector2();
				boundingBox.getCenter( center );
				const allIntersections = [];
				paths.forEach( path => {

					// check if the center of the bounding box is in the bounding box of the paths.
					// this is a pruning method to limit the search of intersections in paths that can't envelop of the current path.
					// if a path envelops another path. The center of that oter path, has to be inside the bounding box of the enveloping path.
					if ( path.boundingBox.containsPoint( center ) ) {

						const intersections = getIntersections( scanline, path.points );
						intersections.forEach( p => {

							allIntersections.push( {
								identifier: path.identifier,
								isCW: path.isCW,
								point: p
							} );

						} );

					}

				} );
				allIntersections.sort( ( i1, i2 ) => {

					return i1.point.x - i2.point.x;

				} );
				return allIntersections;

			}

			function isHoleTo( simplePath, allPaths, scanlineMinX, scanlineMaxX, _fillRule ) {

				if ( _fillRule === null || _fillRule === undefined || _fillRule === '' ) {

					_fillRule = 'nonzero';

				}

				const centerBoundingBox = new THREE.Vector2();
				simplePath.boundingBox.getCenter( centerBoundingBox );
				const scanline = [ new THREE.Vector2( scanlineMinX, centerBoundingBox.y ), new THREE.Vector2( scanlineMaxX, centerBoundingBox.y ) ];
				const scanlineIntersections = getScanlineIntersections( scanline, simplePath.boundingBox, allPaths );
				scanlineIntersections.sort( ( i1, i2 ) => {

					return i1.point.x - i2.point.x;

				} );
				const baseIntersections = [];
				const otherIntersections = [];
				scanlineIntersections.forEach( i => {

					if ( i.identifier === simplePath.identifier ) {

						baseIntersections.push( i );

					} else {

						otherIntersections.push( i );

					}

				} );
				const firstXOfPath = baseIntersections[ 0 ].point.x; // build up the path hierarchy

				const stack = [];
				let i = 0;

				while ( i < otherIntersections.length && otherIntersections[ i ].point.x < firstXOfPath ) {

					if ( stack.length > 0 && stack[ stack.length - 1 ] === otherIntersections[ i ].identifier ) {

						stack.pop();

					} else {

						stack.push( otherIntersections[ i ].identifier );

					}

					i ++;

				}

				stack.push( simplePath.identifier );

				if ( _fillRule === 'evenodd' ) {

					const isHole = stack.length % 2 === 0 ? true : false;
					const isHoleFor = stack[ stack.length - 2 ];
					return {
						identifier: simplePath.identifier,
						isHole: isHole,
						for: isHoleFor
					};

				} else if ( _fillRule === 'nonzero' ) {

					// check if path is a hole by counting the amount of paths with alternating rotations it has to cross.
					let isHole = true;
					let isHoleFor = null;
					let lastCWValue = null;

					for ( let i = 0; i < stack.length; i ++ ) {

						const identifier = stack[ i ];

						if ( isHole ) {

							lastCWValue = allPaths[ identifier ].isCW;
							isHole = false;
							isHoleFor = identifier;

						} else if ( lastCWValue !== allPaths[ identifier ].isCW ) {

							lastCWValue = allPaths[ identifier ].isCW;
							isHole = true;

						}

					}

					return {
						identifier: simplePath.identifier,
						isHole: isHole,
						for: isHoleFor
					};

				} else {

					console.warn( 'fill-rule: "' + _fillRule + '" is currently not implemented.' );

				}

			} // check for self intersecting paths
			// TODO
			// check intersecting paths
			// TODO
			// prepare paths for hole detection


			let identifier = 0;
			let scanlineMinX = BIGNUMBER;
			let scanlineMaxX = - BIGNUMBER;
			let simplePaths = shapePath.subPaths.map( p => {

				const points = p.getPoints();
				let maxY = - BIGNUMBER;
				let minY = BIGNUMBER;
				let maxX = - BIGNUMBER;
				let minX = BIGNUMBER; //points.forEach(p => p.y *= -1);

				for ( let i = 0; i < points.length; i ++ ) {

					const p = points[ i ];

					if ( p.y > maxY ) {

						maxY = p.y;

					}

					if ( p.y < minY ) {

						minY = p.y;

					}

					if ( p.x > maxX ) {

						maxX = p.x;

					}

					if ( p.x < minX ) {

						minX = p.x;

					}

				} //


				if ( scanlineMaxX <= maxX ) {

					scanlineMaxX = maxX + 1;

				}

				if ( scanlineMinX >= minX ) {

					scanlineMinX = minX - 1;

				}

				return {
					curves: p.curves,
					points: points,
					isCW: THREE.ShapeUtils.isClockWise( points ),
					identifier: identifier ++,
					boundingBox: new THREE.Box2( new THREE.Vector2( minX, minY ), new THREE.Vector2( maxX, maxY ) )
				};

			} );
			simplePaths = simplePaths.filter( sp => sp.points.length > 1 ); // check if path is solid or a hole

			const isAHole = simplePaths.map( p => isHoleTo( p, simplePaths, scanlineMinX, scanlineMaxX, shapePath.userData.style.fillRule ) );
			const shapesToReturn = [];
			simplePaths.forEach( p => {

				const amIAHole = isAHole[ p.identifier ];

				if ( ! amIAHole.isHole ) {

					const shape = new THREE.Shape();
					shape.curves = p.curves;
					const holes = isAHole.filter( h => h.isHole && h.for === p.identifier );
					holes.forEach( h => {

						const hole = simplePaths[ h.identifier ];
						const path = new THREE.Path();
						path.curves = hole.curves;
						shape.holes.push( path );

					} );
					shapesToReturn.push( shape );

				}

			} );
			return shapesToReturn;

		}

		static getStrokeStyle( width, color, lineJoin, lineCap, miterLimit ) {

			// Param width: Stroke width
			// Param color: As returned by THREE.Color.getStyle()
			// Param lineJoin: One of "round", "bevel", "miter" or "miter-limit"
			// Param lineCap: One of "round", "square" or "butt"
			// Param miterLimit: Maximum join length, in multiples of the "width" parameter (join is truncated if it exceeds that distance)
			// Returns style object
			width = width !== undefined ? width : 1;
			color = color !== undefined ? color : '#000';
			lineJoin = lineJoin !== undefined ? lineJoin : 'miter';
			lineCap = lineCap !== undefined ? lineCap : 'butt';
			miterLimit = miterLimit !== undefined ? miterLimit : 4;
			return {
				strokeColor: color,
				strokeWidth: width,
				strokeLineJoin: lineJoin,
				strokeLineCap: lineCap,
				strokeMiterLimit: miterLimit
			};

		}

		static pointsToStroke( points, style, arcDivisions, minDistance ) {

			// Generates a stroke with some witdh around the given path.
			// The path can be open or closed (last point equals to first point)
			// Param points: Array of Vector2D (the path). Minimum 2 points.
			// Param style: Object with SVG properties as returned by SVGLoader.getStrokeStyle(), or SVGLoader.parse() in the path.userData.style object
			// Params arcDivisions: Arc divisions for round joins and endcaps. (Optional)
			// Param minDistance: Points closer to this distance will be merged. (Optional)
			// Returns THREE.BufferGeometry with stroke triangles (In plane z = 0). UV coordinates are generated ('u' along path. 'v' across it, from left to right)
			const vertices = [];
			const normals = [];
			const uvs = [];

			if ( SVGLoader.pointsToStrokeWithBuffers( points, style, arcDivisions, minDistance, vertices, normals, uvs ) === 0 ) {

				return null;

			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
			geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
			geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
			return geometry;

		}

		static pointsToStrokeWithBuffers( points, style, arcDivisions, minDistance, vertices, normals, uvs, vertexOffset ) {

			// This function can be called to update existing arrays or buffers.
			// Accepts same parameters as pointsToStroke, plus the buffers and optional offset.
			// Param vertexOffset: Offset vertices to start writing in the buffers (3 elements/vertex for vertices and normals, and 2 elements/vertex for uvs)
			// Returns number of written vertices / normals / uvs pairs
			// if 'vertices' parameter is undefined no triangles will be generated, but the returned vertices count will still be valid (useful to preallocate the buffers)
			// 'normals' and 'uvs' buffers are optional
			const tempV2_1 = new THREE.Vector2();
			const tempV2_2 = new THREE.Vector2();
			const tempV2_3 = new THREE.Vector2();
			const tempV2_4 = new THREE.Vector2();
			const tempV2_5 = new THREE.Vector2();
			const tempV2_6 = new THREE.Vector2();
			const tempV2_7 = new THREE.Vector2();
			const lastPointL = new THREE.Vector2();
			const lastPointR = new THREE.Vector2();
			const point0L = new THREE.Vector2();
			const point0R = new THREE.Vector2();
			const currentPointL = new THREE.Vector2();
			const currentPointR = new THREE.Vector2();
			const nextPointL = new THREE.Vector2();
			const nextPointR = new THREE.Vector2();
			const innerPoint = new THREE.Vector2();
			const outerPoint = new THREE.Vector2();
			arcDivisions = arcDivisions !== undefined ? arcDivisions : 12;
			minDistance = minDistance !== undefined ? minDistance : 0.001;
			vertexOffset = vertexOffset !== undefined ? vertexOffset : 0; // First ensure there are no duplicated points

			points = removeDuplicatedPoints( points );
			const numPoints = points.length;
			if ( numPoints < 2 ) return 0;
			const isClosed = points[ 0 ].equals( points[ numPoints - 1 ] );
			let currentPoint;
			let previousPoint = points[ 0 ];
			let nextPoint;
			const strokeWidth2 = style.strokeWidth / 2;
			const deltaU = 1 / ( numPoints - 1 );
			let u0 = 0,
				u1;
			let innerSideModified;
			let joinIsOnLeftSide;
			let isMiter;
			let initialJoinIsOnLeftSide = false;
			let numVertices = 0;
			let currentCoordinate = vertexOffset * 3;
			let currentCoordinateUV = vertexOffset * 2; // Get initial left and right stroke points

			getNormal( points[ 0 ], points[ 1 ], tempV2_1 ).multiplyScalar( strokeWidth2 );
			lastPointL.copy( points[ 0 ] ).sub( tempV2_1 );
			lastPointR.copy( points[ 0 ] ).add( tempV2_1 );
			point0L.copy( lastPointL );
			point0R.copy( lastPointR );

			for ( let iPoint = 1; iPoint < numPoints; iPoint ++ ) {

				currentPoint = points[ iPoint ]; // Get next point

				if ( iPoint === numPoints - 1 ) {

					if ( isClosed ) {

						// Skip duplicated initial point
						nextPoint = points[ 1 ];

					} else nextPoint = undefined;

				} else {

					nextPoint = points[ iPoint + 1 ];

				} // Normal of previous segment in tempV2_1


				const normal1 = tempV2_1;
				getNormal( previousPoint, currentPoint, normal1 );
				tempV2_3.copy( normal1 ).multiplyScalar( strokeWidth2 );
				currentPointL.copy( currentPoint ).sub( tempV2_3 );
				currentPointR.copy( currentPoint ).add( tempV2_3 );
				u1 = u0 + deltaU;
				innerSideModified = false;

				if ( nextPoint !== undefined ) {

					// Normal of next segment in tempV2_2
					getNormal( currentPoint, nextPoint, tempV2_2 );
					tempV2_3.copy( tempV2_2 ).multiplyScalar( strokeWidth2 );
					nextPointL.copy( currentPoint ).sub( tempV2_3 );
					nextPointR.copy( currentPoint ).add( tempV2_3 );
					joinIsOnLeftSide = true;
					tempV2_3.subVectors( nextPoint, previousPoint );

					if ( normal1.dot( tempV2_3 ) < 0 ) {

						joinIsOnLeftSide = false;

					}

					if ( iPoint === 1 ) initialJoinIsOnLeftSide = joinIsOnLeftSide;
					tempV2_3.subVectors( nextPoint, currentPoint );
					tempV2_3.normalize();
					const dot = Math.abs( normal1.dot( tempV2_3 ) ); // If path is straight, don't create join

					if ( dot !== 0 ) {

						// Compute inner and outer segment intersections
						const miterSide = strokeWidth2 / dot;
						tempV2_3.multiplyScalar( - miterSide );
						tempV2_4.subVectors( currentPoint, previousPoint );
						tempV2_5.copy( tempV2_4 ).setLength( miterSide ).add( tempV2_3 );
						innerPoint.copy( tempV2_5 ).negate();
						const miterLength2 = tempV2_5.length();
						const segmentLengthPrev = tempV2_4.length();
						tempV2_4.divideScalar( segmentLengthPrev );
						tempV2_6.subVectors( nextPoint, currentPoint );
						const segmentLengthNext = tempV2_6.length();
						tempV2_6.divideScalar( segmentLengthNext ); // Check that previous and next segments doesn't overlap with the innerPoint of intersection

						if ( tempV2_4.dot( innerPoint ) < segmentLengthPrev && tempV2_6.dot( innerPoint ) < segmentLengthNext ) {

							innerSideModified = true;

						}

						outerPoint.copy( tempV2_5 ).add( currentPoint );
						innerPoint.add( currentPoint );
						isMiter = false;

						if ( innerSideModified ) {

							if ( joinIsOnLeftSide ) {

								nextPointR.copy( innerPoint );
								currentPointR.copy( innerPoint );

							} else {

								nextPointL.copy( innerPoint );
								currentPointL.copy( innerPoint );

							}

						} else {

							// The segment triangles are generated here if there was overlapping
							makeSegmentTriangles();

						}

						switch ( style.strokeLineJoin ) {

							case 'bevel':
								makeSegmentWithBevelJoin( joinIsOnLeftSide, innerSideModified, u1 );
								break;

							case 'round':
								// Segment triangles
								createSegmentTrianglesWithMiddleSection( joinIsOnLeftSide, innerSideModified ); // Join triangles

								if ( joinIsOnLeftSide ) {

									makeCircularSector( currentPoint, currentPointL, nextPointL, u1, 0 );

								} else {

									makeCircularSector( currentPoint, nextPointR, currentPointR, u1, 1 );

								}

								break;

							case 'miter':
							case 'miter-clip':
							default:
								const miterFraction = strokeWidth2 * style.strokeMiterLimit / miterLength2;

								if ( miterFraction < 1 ) {

									// The join miter length exceeds the miter limit
									if ( style.strokeLineJoin !== 'miter-clip' ) {

										makeSegmentWithBevelJoin( joinIsOnLeftSide, innerSideModified, u1 );
										break;

									} else {

										// Segment triangles
										createSegmentTrianglesWithMiddleSection( joinIsOnLeftSide, innerSideModified ); // Miter-clip join triangles

										if ( joinIsOnLeftSide ) {

											tempV2_6.subVectors( outerPoint, currentPointL ).multiplyScalar( miterFraction ).add( currentPointL );
											tempV2_7.subVectors( outerPoint, nextPointL ).multiplyScalar( miterFraction ).add( nextPointL );
											addVertex( currentPointL, u1, 0 );
											addVertex( tempV2_6, u1, 0 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( tempV2_6, u1, 0 );
											addVertex( tempV2_7, u1, 0 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( tempV2_7, u1, 0 );
											addVertex( nextPointL, u1, 0 );

										} else {

											tempV2_6.subVectors( outerPoint, currentPointR ).multiplyScalar( miterFraction ).add( currentPointR );
											tempV2_7.subVectors( outerPoint, nextPointR ).multiplyScalar( miterFraction ).add( nextPointR );
											addVertex( currentPointR, u1, 1 );
											addVertex( tempV2_6, u1, 1 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( tempV2_6, u1, 1 );
											addVertex( tempV2_7, u1, 1 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( tempV2_7, u1, 1 );
											addVertex( nextPointR, u1, 1 );

										}

									}

								} else {

									// Miter join segment triangles
									if ( innerSideModified ) {

										// Optimized segment + join triangles
										if ( joinIsOnLeftSide ) {

											addVertex( lastPointR, u0, 1 );
											addVertex( lastPointL, u0, 0 );
											addVertex( outerPoint, u1, 0 );
											addVertex( lastPointR, u0, 1 );
											addVertex( outerPoint, u1, 0 );
											addVertex( innerPoint, u1, 1 );

										} else {

											addVertex( lastPointR, u0, 1 );
											addVertex( lastPointL, u0, 0 );
											addVertex( outerPoint, u1, 1 );
											addVertex( lastPointL, u0, 0 );
											addVertex( innerPoint, u1, 0 );
											addVertex( outerPoint, u1, 1 );

										}

										if ( joinIsOnLeftSide ) {

											nextPointL.copy( outerPoint );

										} else {

											nextPointR.copy( outerPoint );

										}

									} else {

										// Add extra miter join triangles
										if ( joinIsOnLeftSide ) {

											addVertex( currentPointL, u1, 0 );
											addVertex( outerPoint, u1, 0 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( outerPoint, u1, 0 );
											addVertex( nextPointL, u1, 0 );

										} else {

											addVertex( currentPointR, u1, 1 );
											addVertex( outerPoint, u1, 1 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( currentPoint, u1, 0.5 );
											addVertex( outerPoint, u1, 1 );
											addVertex( nextPointR, u1, 1 );

										}

									}

									isMiter = true;

								}

								break;

						}

					} else {

						// The segment triangles are generated here when two consecutive points are collinear
						makeSegmentTriangles();

					}

				} else {

					// The segment triangles are generated here if it is the ending segment
					makeSegmentTriangles();

				}

				if ( ! isClosed && iPoint === numPoints - 1 ) {

					// Start line endcap
					addCapGeometry( points[ 0 ], point0L, point0R, joinIsOnLeftSide, true, u0 );

				} // Increment loop variables


				u0 = u1;
				previousPoint = currentPoint;
				lastPointL.copy( nextPointL );
				lastPointR.copy( nextPointR );

			}

			if ( ! isClosed ) {

				// Ending line endcap
				addCapGeometry( currentPoint, currentPointL, currentPointR, joinIsOnLeftSide, false, u1 );

			} else if ( innerSideModified && vertices ) {

				// Modify path first segment vertices to adjust to the segments inner and outer intersections
				let lastOuter = outerPoint;
				let lastInner = innerPoint;

				if ( initialJoinIsOnLeftSide !== joinIsOnLeftSide ) {

					lastOuter = innerPoint;
					lastInner = outerPoint;

				}

				if ( joinIsOnLeftSide ) {

					if ( isMiter || initialJoinIsOnLeftSide ) {

						lastInner.toArray( vertices, 0 * 3 );
						lastInner.toArray( vertices, 3 * 3 );

						if ( isMiter ) {

							lastOuter.toArray( vertices, 1 * 3 );

						}

					}

				} else {

					if ( isMiter || ! initialJoinIsOnLeftSide ) {

						lastInner.toArray( vertices, 1 * 3 );
						lastInner.toArray( vertices, 3 * 3 );

						if ( isMiter ) {

							lastOuter.toArray( vertices, 0 * 3 );

						}

					}

				}

			}

			return numVertices; // -- End of algorithm
			// -- Functions

			function getNormal( p1, p2, result ) {

				result.subVectors( p2, p1 );
				return result.set( - result.y, result.x ).normalize();

			}

			function addVertex( position, u, v ) {

				if ( vertices ) {

					vertices[ currentCoordinate ] = position.x;
					vertices[ currentCoordinate + 1 ] = position.y;
					vertices[ currentCoordinate + 2 ] = 0;

					if ( normals ) {

						normals[ currentCoordinate ] = 0;
						normals[ currentCoordinate + 1 ] = 0;
						normals[ currentCoordinate + 2 ] = 1;

					}

					currentCoordinate += 3;

					if ( uvs ) {

						uvs[ currentCoordinateUV ] = u;
						uvs[ currentCoordinateUV + 1 ] = v;
						currentCoordinateUV += 2;

					}

				}

				numVertices += 3;

			}

			function makeCircularSector( center, p1, p2, u, v ) {

				// param p1, p2: Points in the circle arc.
				// p1 and p2 are in clockwise direction.
				tempV2_1.copy( p1 ).sub( center ).normalize();
				tempV2_2.copy( p2 ).sub( center ).normalize();
				let angle = Math.PI;
				const dot = tempV2_1.dot( tempV2_2 );
				if ( Math.abs( dot ) < 1 ) angle = Math.abs( Math.acos( dot ) );
				angle /= arcDivisions;
				tempV2_3.copy( p1 );

				for ( let i = 0, il = arcDivisions - 1; i < il; i ++ ) {

					tempV2_4.copy( tempV2_3 ).rotateAround( center, angle );
					addVertex( tempV2_3, u, v );
					addVertex( tempV2_4, u, v );
					addVertex( center, u, 0.5 );
					tempV2_3.copy( tempV2_4 );

				}

				addVertex( tempV2_4, u, v );
				addVertex( p2, u, v );
				addVertex( center, u, 0.5 );

			}

			function makeSegmentTriangles() {

				addVertex( lastPointR, u0, 1 );
				addVertex( lastPointL, u0, 0 );
				addVertex( currentPointL, u1, 0 );
				addVertex( lastPointR, u0, 1 );
				addVertex( currentPointL, u1, 1 );
				addVertex( currentPointR, u1, 0 );

			}

			function makeSegmentWithBevelJoin( joinIsOnLeftSide, innerSideModified, u ) {

				if ( innerSideModified ) {

					// Optimized segment + bevel triangles
					if ( joinIsOnLeftSide ) {

						// THREE.Path segments triangles
						addVertex( lastPointR, u0, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( currentPointL, u1, 0 );
						addVertex( lastPointR, u0, 1 );
						addVertex( currentPointL, u1, 0 );
						addVertex( innerPoint, u1, 1 ); // Bevel join triangle

						addVertex( currentPointL, u, 0 );
						addVertex( nextPointL, u, 0 );
						addVertex( innerPoint, u, 0.5 );

					} else {

						// THREE.Path segments triangles
						addVertex( lastPointR, u0, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( currentPointR, u1, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( innerPoint, u1, 0 );
						addVertex( currentPointR, u1, 1 ); // Bevel join triangle

						addVertex( currentPointR, u, 1 );
						addVertex( nextPointR, u, 0 );
						addVertex( innerPoint, u, 0.5 );

					}

				} else {

					// Bevel join triangle. The segment triangles are done in the main loop
					if ( joinIsOnLeftSide ) {

						addVertex( currentPointL, u, 0 );
						addVertex( nextPointL, u, 0 );
						addVertex( currentPoint, u, 0.5 );

					} else {

						addVertex( currentPointR, u, 1 );
						addVertex( nextPointR, u, 0 );
						addVertex( currentPoint, u, 0.5 );

					}

				}

			}

			function createSegmentTrianglesWithMiddleSection( joinIsOnLeftSide, innerSideModified ) {

				if ( innerSideModified ) {

					if ( joinIsOnLeftSide ) {

						addVertex( lastPointR, u0, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( currentPointL, u1, 0 );
						addVertex( lastPointR, u0, 1 );
						addVertex( currentPointL, u1, 0 );
						addVertex( innerPoint, u1, 1 );
						addVertex( currentPointL, u0, 0 );
						addVertex( currentPoint, u1, 0.5 );
						addVertex( innerPoint, u1, 1 );
						addVertex( currentPoint, u1, 0.5 );
						addVertex( nextPointL, u0, 0 );
						addVertex( innerPoint, u1, 1 );

					} else {

						addVertex( lastPointR, u0, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( currentPointR, u1, 1 );
						addVertex( lastPointL, u0, 0 );
						addVertex( innerPoint, u1, 0 );
						addVertex( currentPointR, u1, 1 );
						addVertex( currentPointR, u0, 1 );
						addVertex( innerPoint, u1, 0 );
						addVertex( currentPoint, u1, 0.5 );
						addVertex( currentPoint, u1, 0.5 );
						addVertex( innerPoint, u1, 0 );
						addVertex( nextPointR, u0, 1 );

					}

				}

			}

			function addCapGeometry( center, p1, p2, joinIsOnLeftSide, start, u ) {

				// param center: End point of the path
				// param p1, p2: Left and right cap points
				switch ( style.strokeLineCap ) {

					case 'round':
						if ( start ) {

							makeCircularSector( center, p2, p1, u, 0.5 );

						} else {

							makeCircularSector( center, p1, p2, u, 0.5 );

						}

						break;

					case 'square':
						if ( start ) {

							tempV2_1.subVectors( p1, center );
							tempV2_2.set( tempV2_1.y, - tempV2_1.x );
							tempV2_3.addVectors( tempV2_1, tempV2_2 ).add( center );
							tempV2_4.subVectors( tempV2_2, tempV2_1 ).add( center ); // Modify already existing vertices

							if ( joinIsOnLeftSide ) {

								tempV2_3.toArray( vertices, 1 * 3 );
								tempV2_4.toArray( vertices, 0 * 3 );
								tempV2_4.toArray( vertices, 3 * 3 );

							} else {

								tempV2_3.toArray( vertices, 1 * 3 );
								tempV2_3.toArray( vertices, 3 * 3 );
								tempV2_4.toArray( vertices, 0 * 3 );

							}

						} else {

							tempV2_1.subVectors( p2, center );
							tempV2_2.set( tempV2_1.y, - tempV2_1.x );
							tempV2_3.addVectors( tempV2_1, tempV2_2 ).add( center );
							tempV2_4.subVectors( tempV2_2, tempV2_1 ).add( center );
							const vl = vertices.length; // Modify already existing vertices

							if ( joinIsOnLeftSide ) {

								tempV2_3.toArray( vertices, vl - 1 * 3 );
								tempV2_4.toArray( vertices, vl - 2 * 3 );
								tempV2_4.toArray( vertices, vl - 4 * 3 );

							} else {

								tempV2_3.toArray( vertices, vl - 2 * 3 );
								tempV2_4.toArray( vertices, vl - 1 * 3 );
								tempV2_4.toArray( vertices, vl - 4 * 3 );

							}

						}

						break;

					case 'butt':
					default:
						// Nothing to do here
						break;

				}

			}

			function removeDuplicatedPoints( points ) {

				// Creates a new array if necessary with duplicated points removed.
				// This does not remove duplicated initial and ending points of a closed path.
				let dupPoints = false;

				for ( let i = 1, n = points.length - 1; i < n; i ++ ) {

					if ( points[ i ].distanceTo( points[ i + 1 ] ) < minDistance ) {

						dupPoints = true;
						break;

					}

				}

				if ( ! dupPoints ) return points;
				const newPoints = [];
				newPoints.push( points[ 0 ] );

				for ( let i = 1, n = points.length - 1; i < n; i ++ ) {

					if ( points[ i ].distanceTo( points[ i + 1 ] ) >= minDistance ) {

						newPoints.push( points[ i ] );

					}

				}

				newPoints.push( points[ points.length - 1 ] );
				return newPoints;

			}

		}

	}

	THREE.SVGLoader = SVGLoader;

} )();
( function () {

	/**
 * OpenEXR loader currently supports uncompressed, ZIP(S), RLE, PIZ and DWA/B compression.
 * Supports reading as UnsignedByte, HalfFloat and Float type data texture.
 *
 * Referred to the original Industrial Light & Magic OpenEXR implementation and the TinyEXR / Syoyo Fujita
 * implementation, so I have preserved their copyright notices.
 */
	// /*
	// Copyright (c) 2014 - 2017, Syoyo Fujita
	// All rights reserved.
	// Redistribution and use in source and binary forms, with or without
	// modification, are permitted provided that the following conditions are met:
	//     * Redistributions of source code must retain the above copyright
	//       notice, this list of conditions and the following disclaimer.
	//     * Redistributions in binary form must reproduce the above copyright
	//       notice, this list of conditions and the following disclaimer in the
	//       documentation and/or other materials provided with the distribution.
	//     * Neither the name of the Syoyo Fujita nor the
	//       names of its contributors may be used to endorse or promote products
	//       derived from this software without specific prior written permission.
	// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	// DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
	// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// */
	// // TinyEXR contains some OpenEXR code, which is licensed under ------------
	// ///////////////////////////////////////////////////////////////////////////
	// //
	// // Copyright (c) 2002, Industrial Light & Magic, a division of Lucas
	// // Digital Ltd. LLC
	// //
	// // All rights reserved.
	// //
	// // Redistribution and use in source and binary forms, with or without
	// // modification, are permitted provided that the following conditions are
	// // met:
	// // *       Redistributions of source code must retain the above copyright
	// // notice, this list of conditions and the following disclaimer.
	// // *       Redistributions in binary form must reproduce the above
	// // copyright notice, this list of conditions and the following disclaimer
	// // in the documentation and/or other materials provided with the
	// // distribution.
	// // *       Neither the name of Industrial Light & Magic nor the names of
	// // its contributors may be used to endorse or promote products derived
	// // from this software without specific prior written permission.
	// //
	// // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	// // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	// // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	// // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	// // OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	// // SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	// // LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	// // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	// // THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	// // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// //
	// ///////////////////////////////////////////////////////////////////////////
	// // End of OpenEXR license -------------------------------------------------

	class EXRLoader extends THREE.DataTextureLoader {

		constructor( manager ) {

			super( manager );
			this.type = THREE.HalfFloatType;

		}

		parse( buffer ) {

			const USHORT_RANGE = 1 << 16;
			const BITMAP_SIZE = USHORT_RANGE >> 3;
			const HUF_ENCBITS = 16; // literal (value) bit length

			const HUF_DECBITS = 14; // decoding bit size (>= 8)

			const HUF_ENCSIZE = ( 1 << HUF_ENCBITS ) + 1; // encoding table size

			const HUF_DECSIZE = 1 << HUF_DECBITS; // decoding table size

			const HUF_DECMASK = HUF_DECSIZE - 1;
			const NBITS = 16;
			const A_OFFSET = 1 << NBITS - 1;
			const MOD_MASK = ( 1 << NBITS ) - 1;
			const SHORT_ZEROCODE_RUN = 59;
			const LONG_ZEROCODE_RUN = 63;
			const SHORTEST_LONG_RUN = 2 + LONG_ZEROCODE_RUN - SHORT_ZEROCODE_RUN;
			const ULONG_SIZE = 8;
			const FLOAT32_SIZE = 4;
			const INT32_SIZE = 4;
			const INT16_SIZE = 2;
			const INT8_SIZE = 1;
			const STATIC_HUFFMAN = 0;
			const DEFLATE = 1;
			const UNKNOWN = 0;
			const LOSSY_DCT = 1;
			const RLE = 2;
			const logBase = Math.pow( 2.7182818, 2.2 );

			function reverseLutFromBitmap( bitmap, lut ) {

				let k = 0;

				for ( let i = 0; i < USHORT_RANGE; ++ i ) {

					if ( i == 0 || bitmap[ i >> 3 ] & 1 << ( i & 7 ) ) {

						lut[ k ++ ] = i;

					}

				}

				const n = k - 1;

				while ( k < USHORT_RANGE ) lut[ k ++ ] = 0;

				return n;

			}

			function hufClearDecTable( hdec ) {

				for ( let i = 0; i < HUF_DECSIZE; i ++ ) {

					hdec[ i ] = {};
					hdec[ i ].len = 0;
					hdec[ i ].lit = 0;
					hdec[ i ].p = null;

				}

			}

			const getBitsReturn = {
				l: 0,
				c: 0,
				lc: 0
			};

			function getBits( nBits, c, lc, uInt8Array, inOffset ) {

				while ( lc < nBits ) {

					c = c << 8 | parseUint8Array( uInt8Array, inOffset );
					lc += 8;

				}

				lc -= nBits;
				getBitsReturn.l = c >> lc & ( 1 << nBits ) - 1;
				getBitsReturn.c = c;
				getBitsReturn.lc = lc;

			}

			const hufTableBuffer = new Array( 59 );

			function hufCanonicalCodeTable( hcode ) {

				for ( let i = 0; i <= 58; ++ i ) hufTableBuffer[ i ] = 0;

				for ( let i = 0; i < HUF_ENCSIZE; ++ i ) hufTableBuffer[ hcode[ i ] ] += 1;

				let c = 0;

				for ( let i = 58; i > 0; -- i ) {

					const nc = c + hufTableBuffer[ i ] >> 1;
					hufTableBuffer[ i ] = c;
					c = nc;

				}

				for ( let i = 0; i < HUF_ENCSIZE; ++ i ) {

					const l = hcode[ i ];
					if ( l > 0 ) hcode[ i ] = l | hufTableBuffer[ l ] ++ << 6;

				}

			}

			function hufUnpackEncTable( uInt8Array, inOffset, ni, im, iM, hcode ) {

				const p = inOffset;
				let c = 0;
				let lc = 0;

				for ( ; im <= iM; im ++ ) {

					if ( p.value - inOffset.value > ni ) return false;
					getBits( 6, c, lc, uInt8Array, p );
					const l = getBitsReturn.l;
					c = getBitsReturn.c;
					lc = getBitsReturn.lc;
					hcode[ im ] = l;

					if ( l == LONG_ZEROCODE_RUN ) {

						if ( p.value - inOffset.value > ni ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						getBits( 8, c, lc, uInt8Array, p );
						let zerun = getBitsReturn.l + SHORTEST_LONG_RUN;
						c = getBitsReturn.c;
						lc = getBitsReturn.lc;

						if ( im + zerun > iM + 1 ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;

						im --;

					} else if ( l >= SHORT_ZEROCODE_RUN ) {

						let zerun = l - SHORT_ZEROCODE_RUN + 2;

						if ( im + zerun > iM + 1 ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;

						im --;

					}

				}

				hufCanonicalCodeTable( hcode );

			}

			function hufLength( code ) {

				return code & 63;

			}

			function hufCode( code ) {

				return code >> 6;

			}

			function hufBuildDecTable( hcode, im, iM, hdecod ) {

				for ( ; im <= iM; im ++ ) {

					const c = hufCode( hcode[ im ] );
					const l = hufLength( hcode[ im ] );

					if ( c >> l ) {

						throw new Error( 'Invalid table entry' );

					}

					if ( l > HUF_DECBITS ) {

						const pl = hdecod[ c >> l - HUF_DECBITS ];

						if ( pl.len ) {

							throw new Error( 'Invalid table entry' );

						}

						pl.lit ++;

						if ( pl.p ) {

							const p = pl.p;
							pl.p = new Array( pl.lit );

							for ( let i = 0; i < pl.lit - 1; ++ i ) {

								pl.p[ i ] = p[ i ];

							}

						} else {

							pl.p = new Array( 1 );

						}

						pl.p[ pl.lit - 1 ] = im;

					} else if ( l ) {

						let plOffset = 0;

						for ( let i = 1 << HUF_DECBITS - l; i > 0; i -- ) {

							const pl = hdecod[ ( c << HUF_DECBITS - l ) + plOffset ];

							if ( pl.len || pl.p ) {

								throw new Error( 'Invalid table entry' );

							}

							pl.len = l;
							pl.lit = im;
							plOffset ++;

						}

					}

				}

				return true;

			}

			const getCharReturn = {
				c: 0,
				lc: 0
			};

			function getChar( c, lc, uInt8Array, inOffset ) {

				c = c << 8 | parseUint8Array( uInt8Array, inOffset );
				lc += 8;
				getCharReturn.c = c;
				getCharReturn.lc = lc;

			}

			const getCodeReturn = {
				c: 0,
				lc: 0
			};

			function getCode( po, rlc, c, lc, uInt8Array, inOffset, outBuffer, outBufferOffset, outBufferEndOffset ) {

				if ( po == rlc ) {

					if ( lc < 8 ) {

						getChar( c, lc, uInt8Array, inOffset );
						c = getCharReturn.c;
						lc = getCharReturn.lc;

					}

					lc -= 8;
					let cs = c >> lc;
					cs = new Uint8Array( [ cs ] )[ 0 ];

					if ( outBufferOffset.value + cs > outBufferEndOffset ) {

						return false;

					}

					const s = outBuffer[ outBufferOffset.value - 1 ];

					while ( cs -- > 0 ) {

						outBuffer[ outBufferOffset.value ++ ] = s;

					}

				} else if ( outBufferOffset.value < outBufferEndOffset ) {

					outBuffer[ outBufferOffset.value ++ ] = po;

				} else {

					return false;

				}

				getCodeReturn.c = c;
				getCodeReturn.lc = lc;

			}

			function UInt16( value ) {

				return value & 0xFFFF;

			}

			function Int16( value ) {

				const ref = UInt16( value );
				return ref > 0x7FFF ? ref - 0x10000 : ref;

			}

			const wdec14Return = {
				a: 0,
				b: 0
			};

			function wdec14( l, h ) {

				const ls = Int16( l );
				const hs = Int16( h );
				const hi = hs;
				const ai = ls + ( hi & 1 ) + ( hi >> 1 );
				const as = ai;
				const bs = ai - hi;
				wdec14Return.a = as;
				wdec14Return.b = bs;

			}

			function wdec16( l, h ) {

				const m = UInt16( l );
				const d = UInt16( h );
				const bb = m - ( d >> 1 ) & MOD_MASK;
				const aa = d + bb - A_OFFSET & MOD_MASK;
				wdec14Return.a = aa;
				wdec14Return.b = bb;

			}

			function wav2Decode( buffer, j, nx, ox, ny, oy, mx ) {

				const w14 = mx < 1 << 14;
				const n = nx > ny ? ny : nx;
				let p = 1;
				let p2;
				let py;

				while ( p <= n ) p <<= 1;

				p >>= 1;
				p2 = p;
				p >>= 1;

				while ( p >= 1 ) {

					py = 0;
					const ey = py + oy * ( ny - p2 );
					const oy1 = oy * p;
					const oy2 = oy * p2;
					const ox1 = ox * p;
					const ox2 = ox * p2;
					let i00, i01, i10, i11;

					for ( ; py <= ey; py += oy2 ) {

						let px = py;
						const ex = py + ox * ( nx - p2 );

						for ( ; px <= ex; px += ox2 ) {

							const p01 = px + ox1;
							const p10 = px + oy1;
							const p11 = p10 + ox1;

							if ( w14 ) {

								wdec14( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec14( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec14( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec14( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							} else {

								wdec16( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec16( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec16( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec16( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							}

						}

						if ( nx & p ) {

							const p10 = px + oy1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p10 + j ] ); else wdec16( buffer[ px + j ], buffer[ p10 + j ] );
							i00 = wdec14Return.a;
							buffer[ p10 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					if ( ny & p ) {

						let px = py;
						const ex = py + ox * ( nx - p2 );

						for ( ; px <= ex; px += ox2 ) {

							const p01 = px + ox1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p01 + j ] ); else wdec16( buffer[ px + j ], buffer[ p01 + j ] );
							i00 = wdec14Return.a;
							buffer[ p01 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					p2 = p;
					p >>= 1;

				}

				return py;

			}

			function hufDecode( encodingTable, decodingTable, uInt8Array, inOffset, ni, rlc, no, outBuffer, outOffset ) {

				let c = 0;
				let lc = 0;
				const outBufferEndOffset = no;
				const inOffsetEnd = Math.trunc( inOffset.value + ( ni + 7 ) / 8 );

				while ( inOffset.value < inOffsetEnd ) {

					getChar( c, lc, uInt8Array, inOffset );
					c = getCharReturn.c;
					lc = getCharReturn.lc;

					while ( lc >= HUF_DECBITS ) {

						const index = c >> lc - HUF_DECBITS & HUF_DECMASK;
						const pl = decodingTable[ index ];

						if ( pl.len ) {

							lc -= pl.len;
							getCode( pl.lit, rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
							c = getCodeReturn.c;
							lc = getCodeReturn.lc;

						} else {

							if ( ! pl.p ) {

								throw new Error( 'hufDecode issues' );

							}

							let j;

							for ( j = 0; j < pl.lit; j ++ ) {

								const l = hufLength( encodingTable[ pl.p[ j ] ] );

								while ( lc < l && inOffset.value < inOffsetEnd ) {

									getChar( c, lc, uInt8Array, inOffset );
									c = getCharReturn.c;
									lc = getCharReturn.lc;

								}

								if ( lc >= l ) {

									if ( hufCode( encodingTable[ pl.p[ j ] ] ) == ( c >> lc - l & ( 1 << l ) - 1 ) ) {

										lc -= l;
										getCode( pl.p[ j ], rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
										c = getCodeReturn.c;
										lc = getCodeReturn.lc;
										break;

									}

								}

							}

							if ( j == pl.lit ) {

								throw new Error( 'hufDecode issues' );

							}

						}

					}

				}

				const i = 8 - ni & 7;
				c >>= i;
				lc -= i;

				while ( lc > 0 ) {

					const pl = decodingTable[ c << HUF_DECBITS - lc & HUF_DECMASK ];

					if ( pl.len ) {

						lc -= pl.len;
						getCode( pl.lit, rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
						c = getCodeReturn.c;
						lc = getCodeReturn.lc;

					} else {

						throw new Error( 'hufDecode issues' );

					}

				}

				return true;

			}

			function hufUncompress( uInt8Array, inDataView, inOffset, nCompressed, outBuffer, nRaw ) {

				const outOffset = {
					value: 0
				};
				const initialInOffset = inOffset.value;
				const im = parseUint32( inDataView, inOffset );
				const iM = parseUint32( inDataView, inOffset );
				inOffset.value += 4;
				const nBits = parseUint32( inDataView, inOffset );
				inOffset.value += 4;

				if ( im < 0 || im >= HUF_ENCSIZE || iM < 0 || iM >= HUF_ENCSIZE ) {

					throw new Error( 'Something wrong with HUF_ENCSIZE' );

				}

				const freq = new Array( HUF_ENCSIZE );
				const hdec = new Array( HUF_DECSIZE );
				hufClearDecTable( hdec );
				const ni = nCompressed - ( inOffset.value - initialInOffset );
				hufUnpackEncTable( uInt8Array, inOffset, ni, im, iM, freq );

				if ( nBits > 8 * ( nCompressed - ( inOffset.value - initialInOffset ) ) ) {

					throw new Error( 'Something wrong with hufUncompress' );

				}

				hufBuildDecTable( freq, im, iM, hdec );
				hufDecode( freq, hdec, uInt8Array, inOffset, nBits, iM, nRaw, outBuffer, outOffset );

			}

			function applyLut( lut, data, nData ) {

				for ( let i = 0; i < nData; ++ i ) {

					data[ i ] = lut[ data[ i ] ];

				}

			}

			function predictor( source ) {

				for ( let t = 1; t < source.length; t ++ ) {

					const d = source[ t - 1 ] + source[ t ] - 128;
					source[ t ] = d;

				}

			}

			function interleaveScalar( source, out ) {

				let t1 = 0;
				let t2 = Math.floor( ( source.length + 1 ) / 2 );
				let s = 0;
				const stop = source.length - 1;

				while ( true ) {

					if ( s > stop ) break;
					out[ s ++ ] = source[ t1 ++ ];
					if ( s > stop ) break;
					out[ s ++ ] = source[ t2 ++ ];

				}

			}

			function decodeRunLength( source ) {

				let size = source.byteLength;
				const out = new Array();
				let p = 0;
				const reader = new DataView( source );

				while ( size > 0 ) {

					const l = reader.getInt8( p ++ );

					if ( l < 0 ) {

						const count = - l;
						size -= count + 1;

						for ( let i = 0; i < count; i ++ ) {

							out.push( reader.getUint8( p ++ ) );

						}

					} else {

						const count = l;
						size -= 2;
						const value = reader.getUint8( p ++ );

						for ( let i = 0; i < count + 1; i ++ ) {

							out.push( value );

						}

					}

				}

				return out;

			}

			function lossyDctDecode( cscSet, rowPtrs, channelData, acBuffer, dcBuffer, outBuffer ) {

				let dataView = new DataView( outBuffer.buffer );
				const width = channelData[ cscSet.idx[ 0 ] ].width;
				const height = channelData[ cscSet.idx[ 0 ] ].height;
				const numComp = 3;
				const numFullBlocksX = Math.floor( width / 8.0 );
				const numBlocksX = Math.ceil( width / 8.0 );
				const numBlocksY = Math.ceil( height / 8.0 );
				const leftoverX = width - ( numBlocksX - 1 ) * 8;
				const leftoverY = height - ( numBlocksY - 1 ) * 8;
				const currAcComp = {
					value: 0
				};
				const currDcComp = new Array( numComp );
				const dctData = new Array( numComp );
				const halfZigBlock = new Array( numComp );
				const rowBlock = new Array( numComp );
				const rowOffsets = new Array( numComp );

				for ( let comp = 0; comp < numComp; ++ comp ) {

					rowOffsets[ comp ] = rowPtrs[ cscSet.idx[ comp ] ];
					currDcComp[ comp ] = comp < 1 ? 0 : currDcComp[ comp - 1 ] + numBlocksX * numBlocksY;
					dctData[ comp ] = new Float32Array( 64 );
					halfZigBlock[ comp ] = new Uint16Array( 64 );
					rowBlock[ comp ] = new Uint16Array( numBlocksX * 64 );

				}

				for ( let blocky = 0; blocky < numBlocksY; ++ blocky ) {

					let maxY = 8;
					if ( blocky == numBlocksY - 1 ) maxY = leftoverY;
					let maxX = 8;

					for ( let blockx = 0; blockx < numBlocksX; ++ blockx ) {

						if ( blockx == numBlocksX - 1 ) maxX = leftoverX;

						for ( let comp = 0; comp < numComp; ++ comp ) {

							halfZigBlock[ comp ].fill( 0 ); // set block DC component

							halfZigBlock[ comp ][ 0 ] = dcBuffer[ currDcComp[ comp ] ++ ]; // set block AC components

							unRleAC( currAcComp, acBuffer, halfZigBlock[ comp ] ); // UnZigZag block to float

							unZigZag( halfZigBlock[ comp ], dctData[ comp ] ); // decode float dct

							dctInverse( dctData[ comp ] );

						}

						if ( numComp == 3 ) {

							csc709Inverse( dctData );

						}

						for ( let comp = 0; comp < numComp; ++ comp ) {

							convertToHalf( dctData[ comp ], rowBlock[ comp ], blockx * 64 );

						}

					} // blockx


					let offset = 0;

					for ( let comp = 0; comp < numComp; ++ comp ) {

						const type = channelData[ cscSet.idx[ comp ] ].type;

						for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

							offset = rowOffsets[ comp ][ y ];

							for ( let blockx = 0; blockx < numFullBlocksX; ++ blockx ) {

								const src = blockx * 64 + ( y & 0x7 ) * 8;
								dataView.setUint16( offset + 0 * INT16_SIZE * type, rowBlock[ comp ][ src + 0 ], true );
								dataView.setUint16( offset + 1 * INT16_SIZE * type, rowBlock[ comp ][ src + 1 ], true );
								dataView.setUint16( offset + 2 * INT16_SIZE * type, rowBlock[ comp ][ src + 2 ], true );
								dataView.setUint16( offset + 3 * INT16_SIZE * type, rowBlock[ comp ][ src + 3 ], true );
								dataView.setUint16( offset + 4 * INT16_SIZE * type, rowBlock[ comp ][ src + 4 ], true );
								dataView.setUint16( offset + 5 * INT16_SIZE * type, rowBlock[ comp ][ src + 5 ], true );
								dataView.setUint16( offset + 6 * INT16_SIZE * type, rowBlock[ comp ][ src + 6 ], true );
								dataView.setUint16( offset + 7 * INT16_SIZE * type, rowBlock[ comp ][ src + 7 ], true );
								offset += 8 * INT16_SIZE * type;

							}

						} // handle partial X blocks


						if ( numFullBlocksX != numBlocksX ) {

							for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

								const offset = rowOffsets[ comp ][ y ] + 8 * numFullBlocksX * INT16_SIZE * type;
								const src = numFullBlocksX * 64 + ( y & 0x7 ) * 8;

								for ( let x = 0; x < maxX; ++ x ) {

									dataView.setUint16( offset + x * INT16_SIZE * type, rowBlock[ comp ][ src + x ], true );

								}

							}

						}

					} // comp

				} // blocky


				const halfRow = new Uint16Array( width );
				dataView = new DataView( outBuffer.buffer ); // convert channels back to float, if needed

				for ( let comp = 0; comp < numComp; ++ comp ) {

					channelData[ cscSet.idx[ comp ] ].decoded = true;
					const type = channelData[ cscSet.idx[ comp ] ].type;
					if ( channelData[ comp ].type != 2 ) continue;

					for ( let y = 0; y < height; ++ y ) {

						const offset = rowOffsets[ comp ][ y ];

						for ( let x = 0; x < width; ++ x ) {

							halfRow[ x ] = dataView.getUint16( offset + x * INT16_SIZE * type, true );

						}

						for ( let x = 0; x < width; ++ x ) {

							dataView.setFloat32( offset + x * INT16_SIZE * type, decodeFloat16( halfRow[ x ] ), true );

						}

					}

				}

			}

			function unRleAC( currAcComp, acBuffer, halfZigBlock ) {

				let acValue;
				let dctComp = 1;

				while ( dctComp < 64 ) {

					acValue = acBuffer[ currAcComp.value ];

					if ( acValue == 0xff00 ) {

						dctComp = 64;

					} else if ( acValue >> 8 == 0xff ) {

						dctComp += acValue & 0xff;

					} else {

						halfZigBlock[ dctComp ] = acValue;
						dctComp ++;

					}

					currAcComp.value ++;

				}

			}

			function unZigZag( src, dst ) {

				dst[ 0 ] = decodeFloat16( src[ 0 ] );
				dst[ 1 ] = decodeFloat16( src[ 1 ] );
				dst[ 2 ] = decodeFloat16( src[ 5 ] );
				dst[ 3 ] = decodeFloat16( src[ 6 ] );
				dst[ 4 ] = decodeFloat16( src[ 14 ] );
				dst[ 5 ] = decodeFloat16( src[ 15 ] );
				dst[ 6 ] = decodeFloat16( src[ 27 ] );
				dst[ 7 ] = decodeFloat16( src[ 28 ] );
				dst[ 8 ] = decodeFloat16( src[ 2 ] );
				dst[ 9 ] = decodeFloat16( src[ 4 ] );
				dst[ 10 ] = decodeFloat16( src[ 7 ] );
				dst[ 11 ] = decodeFloat16( src[ 13 ] );
				dst[ 12 ] = decodeFloat16( src[ 16 ] );
				dst[ 13 ] = decodeFloat16( src[ 26 ] );
				dst[ 14 ] = decodeFloat16( src[ 29 ] );
				dst[ 15 ] = decodeFloat16( src[ 42 ] );
				dst[ 16 ] = decodeFloat16( src[ 3 ] );
				dst[ 17 ] = decodeFloat16( src[ 8 ] );
				dst[ 18 ] = decodeFloat16( src[ 12 ] );
				dst[ 19 ] = decodeFloat16( src[ 17 ] );
				dst[ 20 ] = decodeFloat16( src[ 25 ] );
				dst[ 21 ] = decodeFloat16( src[ 30 ] );
				dst[ 22 ] = decodeFloat16( src[ 41 ] );
				dst[ 23 ] = decodeFloat16( src[ 43 ] );
				dst[ 24 ] = decodeFloat16( src[ 9 ] );
				dst[ 25 ] = decodeFloat16( src[ 11 ] );
				dst[ 26 ] = decodeFloat16( src[ 18 ] );
				dst[ 27 ] = decodeFloat16( src[ 24 ] );
				dst[ 28 ] = decodeFloat16( src[ 31 ] );
				dst[ 29 ] = decodeFloat16( src[ 40 ] );
				dst[ 30 ] = decodeFloat16( src[ 44 ] );
				dst[ 31 ] = decodeFloat16( src[ 53 ] );
				dst[ 32 ] = decodeFloat16( src[ 10 ] );
				dst[ 33 ] = decodeFloat16( src[ 19 ] );
				dst[ 34 ] = decodeFloat16( src[ 23 ] );
				dst[ 35 ] = decodeFloat16( src[ 32 ] );
				dst[ 36 ] = decodeFloat16( src[ 39 ] );
				dst[ 37 ] = decodeFloat16( src[ 45 ] );
				dst[ 38 ] = decodeFloat16( src[ 52 ] );
				dst[ 39 ] = decodeFloat16( src[ 54 ] );
				dst[ 40 ] = decodeFloat16( src[ 20 ] );
				dst[ 41 ] = decodeFloat16( src[ 22 ] );
				dst[ 42 ] = decodeFloat16( src[ 33 ] );
				dst[ 43 ] = decodeFloat16( src[ 38 ] );
				dst[ 44 ] = decodeFloat16( src[ 46 ] );
				dst[ 45 ] = decodeFloat16( src[ 51 ] );
				dst[ 46 ] = decodeFloat16( src[ 55 ] );
				dst[ 47 ] = decodeFloat16( src[ 60 ] );
				dst[ 48 ] = decodeFloat16( src[ 21 ] );
				dst[ 49 ] = decodeFloat16( src[ 34 ] );
				dst[ 50 ] = decodeFloat16( src[ 37 ] );
				dst[ 51 ] = decodeFloat16( src[ 47 ] );
				dst[ 52 ] = decodeFloat16( src[ 50 ] );
				dst[ 53 ] = decodeFloat16( src[ 56 ] );
				dst[ 54 ] = decodeFloat16( src[ 59 ] );
				dst[ 55 ] = decodeFloat16( src[ 61 ] );
				dst[ 56 ] = decodeFloat16( src[ 35 ] );
				dst[ 57 ] = decodeFloat16( src[ 36 ] );
				dst[ 58 ] = decodeFloat16( src[ 48 ] );
				dst[ 59 ] = decodeFloat16( src[ 49 ] );
				dst[ 60 ] = decodeFloat16( src[ 57 ] );
				dst[ 61 ] = decodeFloat16( src[ 58 ] );
				dst[ 62 ] = decodeFloat16( src[ 62 ] );
				dst[ 63 ] = decodeFloat16( src[ 63 ] );

			}

			function dctInverse( data ) {

				const a = 0.5 * Math.cos( 3.14159 / 4.0 );
				const b = 0.5 * Math.cos( 3.14159 / 16.0 );
				const c = 0.5 * Math.cos( 3.14159 / 8.0 );
				const d = 0.5 * Math.cos( 3.0 * 3.14159 / 16.0 );
				const e = 0.5 * Math.cos( 5.0 * 3.14159 / 16.0 );
				const f = 0.5 * Math.cos( 3.0 * 3.14159 / 8.0 );
				const g = 0.5 * Math.cos( 7.0 * 3.14159 / 16.0 );
				const alpha = new Array( 4 );
				const beta = new Array( 4 );
				const theta = new Array( 4 );
				const gamma = new Array( 4 );

				for ( let row = 0; row < 8; ++ row ) {

					const rowPtr = row * 8;
					alpha[ 0 ] = c * data[ rowPtr + 2 ];
					alpha[ 1 ] = f * data[ rowPtr + 2 ];
					alpha[ 2 ] = c * data[ rowPtr + 6 ];
					alpha[ 3 ] = f * data[ rowPtr + 6 ];
					beta[ 0 ] = b * data[ rowPtr + 1 ] + d * data[ rowPtr + 3 ] + e * data[ rowPtr + 5 ] + g * data[ rowPtr + 7 ];
					beta[ 1 ] = d * data[ rowPtr + 1 ] - g * data[ rowPtr + 3 ] - b * data[ rowPtr + 5 ] - e * data[ rowPtr + 7 ];
					beta[ 2 ] = e * data[ rowPtr + 1 ] - b * data[ rowPtr + 3 ] + g * data[ rowPtr + 5 ] + d * data[ rowPtr + 7 ];
					beta[ 3 ] = g * data[ rowPtr + 1 ] - e * data[ rowPtr + 3 ] + d * data[ rowPtr + 5 ] - b * data[ rowPtr + 7 ];
					theta[ 0 ] = a * ( data[ rowPtr + 0 ] + data[ rowPtr + 4 ] );
					theta[ 3 ] = a * ( data[ rowPtr + 0 ] - data[ rowPtr + 4 ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ rowPtr + 0 ] = gamma[ 0 ] + beta[ 0 ];
					data[ rowPtr + 1 ] = gamma[ 1 ] + beta[ 1 ];
					data[ rowPtr + 2 ] = gamma[ 2 ] + beta[ 2 ];
					data[ rowPtr + 3 ] = gamma[ 3 ] + beta[ 3 ];
					data[ rowPtr + 4 ] = gamma[ 3 ] - beta[ 3 ];
					data[ rowPtr + 5 ] = gamma[ 2 ] - beta[ 2 ];
					data[ rowPtr + 6 ] = gamma[ 1 ] - beta[ 1 ];
					data[ rowPtr + 7 ] = gamma[ 0 ] - beta[ 0 ];

				}

				for ( let column = 0; column < 8; ++ column ) {

					alpha[ 0 ] = c * data[ 16 + column ];
					alpha[ 1 ] = f * data[ 16 + column ];
					alpha[ 2 ] = c * data[ 48 + column ];
					alpha[ 3 ] = f * data[ 48 + column ];
					beta[ 0 ] = b * data[ 8 + column ] + d * data[ 24 + column ] + e * data[ 40 + column ] + g * data[ 56 + column ];
					beta[ 1 ] = d * data[ 8 + column ] - g * data[ 24 + column ] - b * data[ 40 + column ] - e * data[ 56 + column ];
					beta[ 2 ] = e * data[ 8 + column ] - b * data[ 24 + column ] + g * data[ 40 + column ] + d * data[ 56 + column ];
					beta[ 3 ] = g * data[ 8 + column ] - e * data[ 24 + column ] + d * data[ 40 + column ] - b * data[ 56 + column ];
					theta[ 0 ] = a * ( data[ column ] + data[ 32 + column ] );
					theta[ 3 ] = a * ( data[ column ] - data[ 32 + column ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ 0 + column ] = gamma[ 0 ] + beta[ 0 ];
					data[ 8 + column ] = gamma[ 1 ] + beta[ 1 ];
					data[ 16 + column ] = gamma[ 2 ] + beta[ 2 ];
					data[ 24 + column ] = gamma[ 3 ] + beta[ 3 ];
					data[ 32 + column ] = gamma[ 3 ] - beta[ 3 ];
					data[ 40 + column ] = gamma[ 2 ] - beta[ 2 ];
					data[ 48 + column ] = gamma[ 1 ] - beta[ 1 ];
					data[ 56 + column ] = gamma[ 0 ] - beta[ 0 ];

				}

			}

			function csc709Inverse( data ) {

				for ( let i = 0; i < 64; ++ i ) {

					const y = data[ 0 ][ i ];
					const cb = data[ 1 ][ i ];
					const cr = data[ 2 ][ i ];
					data[ 0 ][ i ] = y + 1.5747 * cr;
					data[ 1 ][ i ] = y - 0.1873 * cb - 0.4682 * cr;
					data[ 2 ][ i ] = y + 1.8556 * cb;

				}

			}

			function convertToHalf( src, dst, idx ) {

				for ( let i = 0; i < 64; ++ i ) {

					dst[ idx + i ] = THREE.DataUtils.toHalfFloat( toLinear( src[ i ] ) );

				}

			}

			function toLinear( float ) {

				if ( float <= 1 ) {

					return Math.sign( float ) * Math.pow( Math.abs( float ), 2.2 );

				} else {

					return Math.sign( float ) * Math.pow( logBase, Math.abs( float ) - 1.0 );

				}

			}

			function uncompressRAW( info ) {

				return new DataView( info.array.buffer, info.offset.value, info.size );

			}

			function uncompressRLE( info ) {

				const compressed = info.viewer.buffer.slice( info.offset.value, info.offset.value + info.size );
				const rawBuffer = new Uint8Array( decodeRunLength( compressed ) );
				const tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressZIP( info ) {

				const compressed = info.array.slice( info.offset.value, info.offset.value + info.size );

				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				const rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

				const tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPIZ( info ) {

				const inDataView = info.viewer;
				const inOffset = {
					value: info.offset.value
				};
				const outBuffer = new Uint16Array( info.width * info.scanlineBlockSize * ( info.channels * info.type ) );
				const bitmap = new Uint8Array( BITMAP_SIZE ); // Setup channel info

				let outBufferEnd = 0;
				const pizChannelData = new Array( info.channels );

				for ( let i = 0; i < info.channels; i ++ ) {

					pizChannelData[ i ] = {};
					pizChannelData[ i ][ 'start' ] = outBufferEnd;
					pizChannelData[ i ][ 'end' ] = pizChannelData[ i ][ 'start' ];
					pizChannelData[ i ][ 'nx' ] = info.width;
					pizChannelData[ i ][ 'ny' ] = info.lines;
					pizChannelData[ i ][ 'size' ] = info.type;
					outBufferEnd += pizChannelData[ i ].nx * pizChannelData[ i ].ny * pizChannelData[ i ].size;

				} // Read range compression data


				const minNonZero = parseUint16( inDataView, inOffset );
				const maxNonZero = parseUint16( inDataView, inOffset );

				if ( maxNonZero >= BITMAP_SIZE ) {

					throw new Error( 'Something is wrong with PIZ_COMPRESSION BITMAP_SIZE' );

				}

				if ( minNonZero <= maxNonZero ) {

					for ( let i = 0; i < maxNonZero - minNonZero + 1; i ++ ) {

						bitmap[ i + minNonZero ] = parseUint8( inDataView, inOffset );

					}

				} // Reverse LUT


				const lut = new Uint16Array( USHORT_RANGE );
				const maxValue = reverseLutFromBitmap( bitmap, lut );
				const length = parseUint32( inDataView, inOffset ); // Huffman decoding

				hufUncompress( info.array, inDataView, inOffset, length, outBuffer, outBufferEnd ); // Wavelet decoding

				for ( let i = 0; i < info.channels; ++ i ) {

					const cd = pizChannelData[ i ];

					for ( let j = 0; j < pizChannelData[ i ].size; ++ j ) {

						wav2Decode( outBuffer, cd.start + j, cd.nx, cd.size, cd.ny, cd.nx * cd.size, maxValue );

					}

				} // Expand the pixel data to their original range


				applyLut( lut, outBuffer, outBufferEnd ); // Rearrange the pixel data into the format expected by the caller.

				let tmpOffset = 0;
				const tmpBuffer = new Uint8Array( outBuffer.buffer.byteLength );

				for ( let y = 0; y < info.lines; y ++ ) {

					for ( let c = 0; c < info.channels; c ++ ) {

						const cd = pizChannelData[ c ];
						const n = cd.nx * cd.size;
						const cp = new Uint8Array( outBuffer.buffer, cd.end * INT16_SIZE, n * INT16_SIZE );
						tmpBuffer.set( cp, tmpOffset );
						tmpOffset += n * INT16_SIZE;
						cd.end += n;

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPXR( info ) {

				const compressed = info.array.slice( info.offset.value, info.offset.value + info.size );

				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				const rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

				const sz = info.lines * info.channels * info.width;
				const tmpBuffer = info.type == 1 ? new Uint16Array( sz ) : new Uint32Array( sz );
				let tmpBufferEnd = 0;
				let writePtr = 0;
				const ptr = new Array( 4 );

				for ( let y = 0; y < info.lines; y ++ ) {

					for ( let c = 0; c < info.channels; c ++ ) {

						let pixel = 0;

						switch ( info.type ) {

							case 1:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								tmpBufferEnd = ptr[ 1 ] + info.width;

								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 8 | rawBuffer[ ptr[ 1 ] ++ ];
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;

							case 2:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								ptr[ 2 ] = ptr[ 1 ] + info.width;
								tmpBufferEnd = ptr[ 2 ] + info.width;

								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 24 | rawBuffer[ ptr[ 1 ] ++ ] << 16 | rawBuffer[ ptr[ 2 ] ++ ] << 8;
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;

						}

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressDWA( info ) {

				const inDataView = info.viewer;
				const inOffset = {
					value: info.offset.value
				};
				const outBuffer = new Uint8Array( info.width * info.lines * ( info.channels * info.type * INT16_SIZE ) ); // Read compression header information

				const dwaHeader = {
					version: parseInt64( inDataView, inOffset ),
					unknownUncompressedSize: parseInt64( inDataView, inOffset ),
					unknownCompressedSize: parseInt64( inDataView, inOffset ),
					acCompressedSize: parseInt64( inDataView, inOffset ),
					dcCompressedSize: parseInt64( inDataView, inOffset ),
					rleCompressedSize: parseInt64( inDataView, inOffset ),
					rleUncompressedSize: parseInt64( inDataView, inOffset ),
					rleRawSize: parseInt64( inDataView, inOffset ),
					totalAcUncompressedCount: parseInt64( inDataView, inOffset ),
					totalDcUncompressedCount: parseInt64( inDataView, inOffset ),
					acCompression: parseInt64( inDataView, inOffset )
				};
				if ( dwaHeader.version < 2 ) throw new Error( 'EXRLoader.parse: ' + EXRHeader.compression + ' version ' + dwaHeader.version + ' is unsupported' ); // Read channel ruleset information

				const channelRules = new Array();
				let ruleSize = parseUint16( inDataView, inOffset ) - INT16_SIZE;

				while ( ruleSize > 0 ) {

					const name = parseNullTerminatedString( inDataView.buffer, inOffset );
					const value = parseUint8( inDataView, inOffset );
					const compression = value >> 2 & 3;
					const csc = ( value >> 4 ) - 1;
					const index = new Int8Array( [ csc ] )[ 0 ];
					const type = parseUint8( inDataView, inOffset );
					channelRules.push( {
						name: name,
						index: index,
						type: type,
						compression: compression
					} );
					ruleSize -= name.length + 3;

				} // Classify channels


				const channels = EXRHeader.channels;
				const channelData = new Array( info.channels );

				for ( let i = 0; i < info.channels; ++ i ) {

					const cd = channelData[ i ] = {};
					const channel = channels[ i ];
					cd.name = channel.name;
					cd.compression = UNKNOWN;
					cd.decoded = false;
					cd.type = channel.pixelType;
					cd.pLinear = channel.pLinear;
					cd.width = info.width;
					cd.height = info.lines;

				}

				const cscSet = {
					idx: new Array( 3 )
				};

				for ( let offset = 0; offset < info.channels; ++ offset ) {

					const cd = channelData[ offset ];

					for ( let i = 0; i < channelRules.length; ++ i ) {

						const rule = channelRules[ i ];

						if ( cd.name == rule.name ) {

							cd.compression = rule.compression;

							if ( rule.index >= 0 ) {

								cscSet.idx[ rule.index ] = offset;

							}

							cd.offset = offset;

						}

					}

				}

				let acBuffer, dcBuffer, rleBuffer; // Read DCT - AC component data

				if ( dwaHeader.acCompressedSize > 0 ) {

					switch ( dwaHeader.acCompression ) {

						case STATIC_HUFFMAN:
							acBuffer = new Uint16Array( dwaHeader.totalAcUncompressedCount );
							hufUncompress( info.array, inDataView, inOffset, dwaHeader.acCompressedSize, acBuffer, dwaHeader.totalAcUncompressedCount );
							break;

						case DEFLATE:
							const compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.totalAcUncompressedCount );
							const data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

							acBuffer = new Uint16Array( data.buffer );
							inOffset.value += dwaHeader.totalAcUncompressedCount;
							break;

					}

				} // Read DCT - DC component data


				if ( dwaHeader.dcCompressedSize > 0 ) {

					const zlibInfo = {
						array: info.array,
						offset: inOffset,
						size: dwaHeader.dcCompressedSize
					};
					dcBuffer = new Uint16Array( uncompressZIP( zlibInfo ).buffer );
					inOffset.value += dwaHeader.dcCompressedSize;

				} // Read RLE compressed data


				if ( dwaHeader.rleRawSize > 0 ) {

					const compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.rleCompressedSize );
					const data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

					rleBuffer = decodeRunLength( data.buffer );
					inOffset.value += dwaHeader.rleCompressedSize;

				} // Prepare outbuffer data offset


				let outBufferEnd = 0;
				const rowOffsets = new Array( channelData.length );

				for ( let i = 0; i < rowOffsets.length; ++ i ) {

					rowOffsets[ i ] = new Array();

				}

				for ( let y = 0; y < info.lines; ++ y ) {

					for ( let chan = 0; chan < channelData.length; ++ chan ) {

						rowOffsets[ chan ].push( outBufferEnd );
						outBufferEnd += channelData[ chan ].width * info.type * INT16_SIZE;

					}

				} // Lossy DCT decode RGB channels


				lossyDctDecode( cscSet, rowOffsets, channelData, acBuffer, dcBuffer, outBuffer ); // Decode other channels

				for ( let i = 0; i < channelData.length; ++ i ) {

					const cd = channelData[ i ];
					if ( cd.decoded ) continue;

					switch ( cd.compression ) {

						case RLE:
							let row = 0;
							let rleOffset = 0;

							for ( let y = 0; y < info.lines; ++ y ) {

								let rowOffsetBytes = rowOffsets[ i ][ row ];

								for ( let x = 0; x < cd.width; ++ x ) {

									for ( let byte = 0; byte < INT16_SIZE * cd.type; ++ byte ) {

										outBuffer[ rowOffsetBytes ++ ] = rleBuffer[ rleOffset + byte * cd.width * cd.height ];

									}

									rleOffset ++;

								}

								row ++;

							}

							break;

						case LOSSY_DCT: // skip

						default:
							throw new Error( 'EXRLoader.parse: unsupported channel compression' );

					}

				}

				return new DataView( outBuffer.buffer );

			}

			function parseNullTerminatedString( buffer, offset ) {

				const uintBuffer = new Uint8Array( buffer );
				let endOffset = 0;

				while ( uintBuffer[ offset.value + endOffset ] != 0 ) {

					endOffset += 1;

				}

				const stringValue = new TextDecoder().decode( uintBuffer.slice( offset.value, offset.value + endOffset ) );
				offset.value = offset.value + endOffset + 1;
				return stringValue;

			}

			function parseFixedLengthString( buffer, offset, size ) {

				const stringValue = new TextDecoder().decode( new Uint8Array( buffer ).slice( offset.value, offset.value + size ) );
				offset.value = offset.value + size;
				return stringValue;

			}

			function parseRational( dataView, offset ) {

				const x = parseInt32( dataView, offset );
				const y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseTimecode( dataView, offset ) {

				const x = parseUint32( dataView, offset );
				const y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseInt32( dataView, offset ) {

				const Int32 = dataView.getInt32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Int32;

			}

			function parseUint32( dataView, offset ) {

				const Uint32 = dataView.getUint32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Uint32;

			}

			function parseUint8Array( uInt8Array, offset ) {

				const Uint8 = uInt8Array[ offset.value ];
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			function parseUint8( dataView, offset ) {

				const Uint8 = dataView.getUint8( offset.value );
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			const parseInt64 = function ( dataView, offset ) {

				let int;

				if ( 'getBigInt64' in DataView.prototype ) {

					int = Number( dataView.getBigInt64( offset.value, true ) );

				} else {

					int = dataView.getUint32( offset.value + 4, true ) + Number( dataView.getUint32( offset.value, true ) << 32 );

				}

				offset.value += ULONG_SIZE;
				return int;

			};

			function parseFloat32( dataView, offset ) {

				const float = dataView.getFloat32( offset.value, true );
				offset.value += FLOAT32_SIZE;
				return float;

			}

			function decodeFloat32( dataView, offset ) {

				return THREE.DataUtils.toHalfFloat( parseFloat32( dataView, offset ) );

			} // https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript


			function decodeFloat16( binary ) {

				const exponent = ( binary & 0x7C00 ) >> 10,
					fraction = binary & 0x03FF;
				return ( binary >> 15 ? - 1 : 1 ) * ( exponent ? exponent === 0x1F ? fraction ? NaN : Infinity : Math.pow( 2, exponent - 15 ) * ( 1 + fraction / 0x400 ) : 6.103515625e-5 * ( fraction / 0x400 ) );

			}

			function parseUint16( dataView, offset ) {

				const Uint16 = dataView.getUint16( offset.value, true );
				offset.value += INT16_SIZE;
				return Uint16;

			}

			function parseFloat16( buffer, offset ) {

				return decodeFloat16( parseUint16( buffer, offset ) );

			}

			function parseChlist( dataView, buffer, offset, size ) {

				const startOffset = offset.value;
				const channels = [];

				while ( offset.value < startOffset + size - 1 ) {

					const name = parseNullTerminatedString( buffer, offset );
					const pixelType = parseInt32( dataView, offset );
					const pLinear = parseUint8( dataView, offset );
					offset.value += 3; // reserved, three chars

					const xSampling = parseInt32( dataView, offset );
					const ySampling = parseInt32( dataView, offset );
					channels.push( {
						name: name,
						pixelType: pixelType,
						pLinear: pLinear,
						xSampling: xSampling,
						ySampling: ySampling
					} );

				}

				offset.value += 1;
				return channels;

			}

			function parseChromaticities( dataView, offset ) {

				const redX = parseFloat32( dataView, offset );
				const redY = parseFloat32( dataView, offset );
				const greenX = parseFloat32( dataView, offset );
				const greenY = parseFloat32( dataView, offset );
				const blueX = parseFloat32( dataView, offset );
				const blueY = parseFloat32( dataView, offset );
				const whiteX = parseFloat32( dataView, offset );
				const whiteY = parseFloat32( dataView, offset );
				return {
					redX: redX,
					redY: redY,
					greenX: greenX,
					greenY: greenY,
					blueX: blueX,
					blueY: blueY,
					whiteX: whiteX,
					whiteY: whiteY
				};

			}

			function parseCompression( dataView, offset ) {

				const compressionCodes = [ 'NO_COMPRESSION', 'RLE_COMPRESSION', 'ZIPS_COMPRESSION', 'ZIP_COMPRESSION', 'PIZ_COMPRESSION', 'PXR24_COMPRESSION', 'B44_COMPRESSION', 'B44A_COMPRESSION', 'DWAA_COMPRESSION', 'DWAB_COMPRESSION' ];
				const compression = parseUint8( dataView, offset );
				return compressionCodes[ compression ];

			}

			function parseBox2i( dataView, offset ) {

				const xMin = parseUint32( dataView, offset );
				const yMin = parseUint32( dataView, offset );
				const xMax = parseUint32( dataView, offset );
				const yMax = parseUint32( dataView, offset );
				return {
					xMin: xMin,
					yMin: yMin,
					xMax: xMax,
					yMax: yMax
				};

			}

			function parseLineOrder( dataView, offset ) {

				const lineOrders = [ 'INCREASING_Y' ];
				const lineOrder = parseUint8( dataView, offset );
				return lineOrders[ lineOrder ];

			}

			function parseV2f( dataView, offset ) {

				const x = parseFloat32( dataView, offset );
				const y = parseFloat32( dataView, offset );
				return [ x, y ];

			}

			function parseV3f( dataView, offset ) {

				const x = parseFloat32( dataView, offset );
				const y = parseFloat32( dataView, offset );
				const z = parseFloat32( dataView, offset );
				return [ x, y, z ];

			}

			function parseValue( dataView, buffer, offset, type, size ) {

				if ( type === 'string' || type === 'stringvector' || type === 'iccProfile' ) {

					return parseFixedLengthString( buffer, offset, size );

				} else if ( type === 'chlist' ) {

					return parseChlist( dataView, buffer, offset, size );

				} else if ( type === 'chromaticities' ) {

					return parseChromaticities( dataView, offset );

				} else if ( type === 'compression' ) {

					return parseCompression( dataView, offset );

				} else if ( type === 'box2i' ) {

					return parseBox2i( dataView, offset );

				} else if ( type === 'lineOrder' ) {

					return parseLineOrder( dataView, offset );

				} else if ( type === 'float' ) {

					return parseFloat32( dataView, offset );

				} else if ( type === 'v2f' ) {

					return parseV2f( dataView, offset );

				} else if ( type === 'v3f' ) {

					return parseV3f( dataView, offset );

				} else if ( type === 'int' ) {

					return parseInt32( dataView, offset );

				} else if ( type === 'rational' ) {

					return parseRational( dataView, offset );

				} else if ( type === 'timecode' ) {

					return parseTimecode( dataView, offset );

				} else if ( type === 'preview' ) {

					offset.value += size;
					return 'skipped';

				} else {

					offset.value += size;
					return undefined;

				}

			}

			function parseHeader( dataView, buffer, offset ) {

				const EXRHeader = {};

				if ( dataView.getUint32( 0, true ) != 20000630 ) {

					// magic
					throw new Error( 'THREE.EXRLoader: provided file doesn\'t appear to be in OpenEXR format.' );

				}

				EXRHeader.version = dataView.getUint8( 4 );
				const spec = dataView.getUint8( 5 ); // fullMask

				EXRHeader.spec = {
					singleTile: !! ( spec & 2 ),
					longName: !! ( spec & 4 ),
					deepFormat: !! ( spec & 8 ),
					multiPart: !! ( spec & 16 )
				}; // start of header

				offset.value = 8; // start at 8 - after pre-amble

				let keepReading = true;

				while ( keepReading ) {

					const attributeName = parseNullTerminatedString( buffer, offset );

					if ( attributeName == 0 ) {

						keepReading = false;

					} else {

						const attributeType = parseNullTerminatedString( buffer, offset );
						const attributeSize = parseUint32( dataView, offset );
						const attributeValue = parseValue( dataView, buffer, offset, attributeType, attributeSize );

						if ( attributeValue === undefined ) {

							console.warn( `EXRLoader.parse: skipped unknown header attribute type \'${attributeType}\'.` );

						} else {

							EXRHeader[ attributeName ] = attributeValue;

						}

					}

				}

				if ( spec != 0 ) {

					console.error( 'EXRHeader:', EXRHeader );
					throw new Error( 'THREE.EXRLoader: provided file is currently unsupported.' );

				}

				return EXRHeader;

			}

			function setupDecoder( EXRHeader, dataView, uInt8Array, offset, outputType ) {

				const EXRDecoder = {
					size: 0,
					viewer: dataView,
					array: uInt8Array,
					offset: offset,
					width: EXRHeader.dataWindow.xMax - EXRHeader.dataWindow.xMin + 1,
					height: EXRHeader.dataWindow.yMax - EXRHeader.dataWindow.yMin + 1,
					channels: EXRHeader.channels.length,
					bytesPerLine: null,
					lines: null,
					inputSize: null,
					type: EXRHeader.channels[ 0 ].pixelType,
					uncompress: null,
					getter: null,
					format: null,
					encoding: null
				};

				switch ( EXRHeader.compression ) {

					case 'NO_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressRAW;
						break;

					case 'RLE_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressRLE;
						break;

					case 'ZIPS_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressZIP;
						break;

					case 'ZIP_COMPRESSION':
						EXRDecoder.lines = 16;
						EXRDecoder.uncompress = uncompressZIP;
						break;

					case 'PIZ_COMPRESSION':
						EXRDecoder.lines = 32;
						EXRDecoder.uncompress = uncompressPIZ;
						break;

					case 'PXR24_COMPRESSION':
						EXRDecoder.lines = 16;
						EXRDecoder.uncompress = uncompressPXR;
						break;

					case 'DWAA_COMPRESSION':
						EXRDecoder.lines = 32;
						EXRDecoder.uncompress = uncompressDWA;
						break;

					case 'DWAB_COMPRESSION':
						EXRDecoder.lines = 256;
						EXRDecoder.uncompress = uncompressDWA;
						break;

					default:
						throw new Error( 'EXRLoader.parse: ' + EXRHeader.compression + ' is unsupported' );

				}

				EXRDecoder.scanlineBlockSize = EXRDecoder.lines;

				if ( EXRDecoder.type == 1 ) {

					// half
					switch ( outputType ) {

						case THREE.FloatType:
							EXRDecoder.getter = parseFloat16;
							EXRDecoder.inputSize = INT16_SIZE;
							break;

						case THREE.HalfFloatType:
							EXRDecoder.getter = parseUint16;
							EXRDecoder.inputSize = INT16_SIZE;
							break;

					}

				} else if ( EXRDecoder.type == 2 ) {

					// float
					switch ( outputType ) {

						case THREE.FloatType:
							EXRDecoder.getter = parseFloat32;
							EXRDecoder.inputSize = FLOAT32_SIZE;
							break;

						case THREE.HalfFloatType:
							EXRDecoder.getter = decodeFloat32;
							EXRDecoder.inputSize = FLOAT32_SIZE;

					}

				} else {

					throw new Error( 'EXRLoader.parse: unsupported pixelType ' + EXRDecoder.type + ' for ' + EXRHeader.compression + '.' );

				}

				EXRDecoder.blockCount = ( EXRHeader.dataWindow.yMax + 1 ) / EXRDecoder.scanlineBlockSize;

				for ( let i = 0; i < EXRDecoder.blockCount; i ++ ) parseInt64( dataView, offset ); // scanlineOffset
				// we should be passed the scanline offset table, ready to start reading pixel data.
				// RGB images will be converted to RGBA format, preventing software emulation in select devices.


				EXRDecoder.outputChannels = EXRDecoder.channels == 3 ? 4 : EXRDecoder.channels;
				const size = EXRDecoder.width * EXRDecoder.height * EXRDecoder.outputChannels;

				switch ( outputType ) {

					case THREE.FloatType:
						EXRDecoder.byteArray = new Float32Array( size ); // Fill initially with 1s for the alpha value if the texture is not RGBA, RGB values will be overwritten

						if ( EXRDecoder.channels < EXRDecoder.outputChannels ) EXRDecoder.byteArray.fill( 1, 0, size );
						break;

					case THREE.HalfFloatType:
						EXRDecoder.byteArray = new Uint16Array( size );
						if ( EXRDecoder.channels < EXRDecoder.outputChannels ) EXRDecoder.byteArray.fill( 0x3C00, 0, size ); // Uint16Array holds half float data, 0x3C00 is 1

						break;

					default:
						console.error( 'THREE.EXRLoader: unsupported type: ', outputType );
						break;

				}

				EXRDecoder.bytesPerLine = EXRDecoder.width * EXRDecoder.inputSize * EXRDecoder.channels;

				if ( EXRDecoder.outputChannels == 4 ) {

					EXRDecoder.format = THREE.RGBAFormat;
					EXRDecoder.encoding = THREE.LinearEncoding;

				} else {

					EXRDecoder.format = THREE.RedFormat;
					EXRDecoder.encoding = THREE.LinearEncoding;

				}

				return EXRDecoder;

			} // start parsing file [START]


			const bufferDataView = new DataView( buffer );
			const uInt8Array = new Uint8Array( buffer );
			const offset = {
				value: 0
			}; // get header information and validate format.

			const EXRHeader = parseHeader( bufferDataView, buffer, offset ); // get input compression information and prepare decoding.

			const EXRDecoder = setupDecoder( EXRHeader, bufferDataView, uInt8Array, offset, this.type );
			const tmpOffset = {
				value: 0
			};
			const channelOffsets = {
				R: 0,
				G: 1,
				B: 2,
				A: 3,
				Y: 0
			};

			for ( let scanlineBlockIdx = 0; scanlineBlockIdx < EXRDecoder.height / EXRDecoder.scanlineBlockSize; scanlineBlockIdx ++ ) {

				const line = parseUint32( bufferDataView, offset ); // line_no

				EXRDecoder.size = parseUint32( bufferDataView, offset ); // data_len

				EXRDecoder.lines = line + EXRDecoder.scanlineBlockSize > EXRDecoder.height ? EXRDecoder.height - line : EXRDecoder.scanlineBlockSize;
				const isCompressed = EXRDecoder.size < EXRDecoder.lines * EXRDecoder.bytesPerLine;
				const viewer = isCompressed ? EXRDecoder.uncompress( EXRDecoder ) : uncompressRAW( EXRDecoder );
				offset.value += EXRDecoder.size;

				for ( let line_y = 0; line_y < EXRDecoder.scanlineBlockSize; line_y ++ ) {

					const true_y = line_y + scanlineBlockIdx * EXRDecoder.scanlineBlockSize;
					if ( true_y >= EXRDecoder.height ) break;

					for ( let channelID = 0; channelID < EXRDecoder.channels; channelID ++ ) {

						const cOff = channelOffsets[ EXRHeader.channels[ channelID ].name ];

						for ( let x = 0; x < EXRDecoder.width; x ++ ) {

							tmpOffset.value = ( line_y * ( EXRDecoder.channels * EXRDecoder.width ) + channelID * EXRDecoder.width + x ) * EXRDecoder.inputSize;
							const outIndex = ( EXRDecoder.height - 1 - true_y ) * ( EXRDecoder.width * EXRDecoder.outputChannels ) + x * EXRDecoder.outputChannels + cOff;
							EXRDecoder.byteArray[ outIndex ] = EXRDecoder.getter( viewer, tmpOffset );

						}

					}

				}

			}

			return {
				header: EXRHeader,
				width: EXRDecoder.width,
				height: EXRDecoder.height,
				data: EXRDecoder.byteArray,
				format: EXRDecoder.format,
				encoding: EXRDecoder.encoding,
				type: this.type
			};

		}

		setDataType( value ) {

			this.type = value;
			return this;

		}

		load( url, onLoad, onProgress, onError ) {

			function onLoadCallback( texture, texData ) {

				texture.encoding = texData.encoding;
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.generateMipmaps = false;
				texture.flipY = false;
				if ( onLoad ) onLoad( texture, texData );

			}

			return super.load( url, onLoadCallback, onProgress, onError );

		}

	}

	THREE.EXRLoader = EXRLoader;

} )();
( function () {

	function computeTangents( geometry ) {

		geometry.computeTangents();
		console.warn( 'THREE.BufferGeometryUtils: .computeTangents() has been removed. Use THREE.BufferGeometry.computeTangents() instead.' );

	}
	/**
	 * @param  {Array<BufferGeometry>} geometries
	 * @param  {Boolean} useGroups
	 * @return {BufferGeometry}
	 */


	function mergeBufferGeometries( geometries, useGroups = false ) {

		const isIndexed = geometries[ 0 ].index !== null;
		const attributesUsed = new Set( Object.keys( geometries[ 0 ].attributes ) );
		const morphAttributesUsed = new Set( Object.keys( geometries[ 0 ].morphAttributes ) );
		const attributes = {};
		const morphAttributes = {};
		const morphTargetsRelative = geometries[ 0 ].morphTargetsRelative;
		const mergedGeometry = new THREE.BufferGeometry();
		let offset = 0;

		for ( let i = 0; i < geometries.length; ++ i ) {

			const geometry = geometries[ i ];
			let attributesCount = 0; // ensure that all geometries are indexed, or none

			if ( isIndexed !== ( geometry.index !== null ) ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.' );
				return null;

			} // gather attributes, exit early if they're different


			for ( const name in geometry.attributes ) {

				if ( ! attributesUsed.has( name ) ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure "' + name + '" attribute exists among all geometries, or in none of them.' );
					return null;

				}

				if ( attributes[ name ] === undefined ) attributes[ name ] = [];
				attributes[ name ].push( geometry.attributes[ name ] );
				attributesCount ++;

			} // ensure geometries have the same number of attributes


			if ( attributesCount !== attributesUsed.size ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. Make sure all geometries have the same number of attributes.' );
				return null;

			} // gather morph attributes, exit early if they're different


			if ( morphTargetsRelative !== geometry.morphTargetsRelative ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. .morphTargetsRelative must be consistent throughout all geometries.' );
				return null;

			}

			for ( const name in geometry.morphAttributes ) {

				if ( ! morphAttributesUsed.has( name ) ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '.  .morphAttributes must be consistent throughout all geometries.' );
					return null;

				}

				if ( morphAttributes[ name ] === undefined ) morphAttributes[ name ] = [];
				morphAttributes[ name ].push( geometry.morphAttributes[ name ] );

			} // gather .userData


			mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || [];
			mergedGeometry.userData.mergedUserData.push( geometry.userData );

			if ( useGroups ) {

				let count;

				if ( isIndexed ) {

					count = geometry.index.count;

				} else if ( geometry.attributes.position !== undefined ) {

					count = geometry.attributes.position.count;

				} else {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. The geometry must have either an index or a position attribute' );
					return null;

				}

				mergedGeometry.addGroup( offset, count, i );
				offset += count;

			}

		} // merge indices


		if ( isIndexed ) {

			let indexOffset = 0;
			const mergedIndex = [];

			for ( let i = 0; i < geometries.length; ++ i ) {

				const index = geometries[ i ].index;

				for ( let j = 0; j < index.count; ++ j ) {

					mergedIndex.push( index.getX( j ) + indexOffset );

				}

				indexOffset += geometries[ i ].attributes.position.count;

			}

			mergedGeometry.setIndex( mergedIndex );

		} // merge attributes


		for ( const name in attributes ) {

			const mergedAttribute = mergeBufferAttributes( attributes[ name ] );

			if ( ! mergedAttribute ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed while trying to merge the ' + name + ' attribute.' );
				return null;

			}

			mergedGeometry.setAttribute( name, mergedAttribute );

		} // merge morph attributes


		for ( const name in morphAttributes ) {

			const numMorphTargets = morphAttributes[ name ][ 0 ].length;
			if ( numMorphTargets === 0 ) break;
			mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
			mergedGeometry.morphAttributes[ name ] = [];

			for ( let i = 0; i < numMorphTargets; ++ i ) {

				const morphAttributesToMerge = [];

				for ( let j = 0; j < morphAttributes[ name ].length; ++ j ) {

					morphAttributesToMerge.push( morphAttributes[ name ][ j ][ i ] );

				}

				const mergedMorphAttribute = mergeBufferAttributes( morphAttributesToMerge );

				if ( ! mergedMorphAttribute ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed while trying to merge the ' + name + ' morphAttribute.' );
					return null;

				}

				mergedGeometry.morphAttributes[ name ].push( mergedMorphAttribute );

			}

		}

		return mergedGeometry;

	}
	/**
 * @param {Array<BufferAttribute>} attributes
 * @return {BufferAttribute}
 */


	function mergeBufferAttributes( attributes ) {

		let TypedArray;
		let itemSize;
		let normalized;
		let arrayLength = 0;

		for ( let i = 0; i < attributes.length; ++ i ) {

			const attribute = attributes[ i ];

			if ( attribute.isInterleavedBufferAttribute ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. InterleavedBufferAttributes are not supported.' );
				return null;

			}

			if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;

			if ( TypedArray !== attribute.array.constructor ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.array must be of consistent array types across matching attributes.' );
				return null;

			}

			if ( itemSize === undefined ) itemSize = attribute.itemSize;

			if ( itemSize !== attribute.itemSize ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.itemSize must be consistent across matching attributes.' );
				return null;

			}

			if ( normalized === undefined ) normalized = attribute.normalized;

			if ( normalized !== attribute.normalized ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.normalized must be consistent across matching attributes.' );
				return null;

			}

			arrayLength += attribute.array.length;

		}

		const array = new TypedArray( arrayLength );
		let offset = 0;

		for ( let i = 0; i < attributes.length; ++ i ) {

			array.set( attributes[ i ].array, offset );
			offset += attributes[ i ].array.length;

		}

		return new THREE.BufferAttribute( array, itemSize, normalized );

	}
	/**
 * @param {Array<BufferAttribute>} attributes
 * @return {Array<InterleavedBufferAttribute>}
 */


	function interleaveAttributes( attributes ) {

		// Interleaves the provided attributes into an THREE.InterleavedBuffer and returns
		// a set of InterleavedBufferAttributes for each attribute
		let TypedArray;
		let arrayLength = 0;
		let stride = 0; // calculate the the length and type of the interleavedBuffer

		for ( let i = 0, l = attributes.length; i < l; ++ i ) {

			const attribute = attributes[ i ];
			if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;

			if ( TypedArray !== attribute.array.constructor ) {

				console.error( 'AttributeBuffers of different types cannot be interleaved' );
				return null;

			}

			arrayLength += attribute.array.length;
			stride += attribute.itemSize;

		} // Create the set of buffer attributes


		const interleavedBuffer = new THREE.InterleavedBuffer( new TypedArray( arrayLength ), stride );
		let offset = 0;
		const res = [];
		const getters = [ 'getX', 'getY', 'getZ', 'getW' ];
		const setters = [ 'setX', 'setY', 'setZ', 'setW' ];

		for ( let j = 0, l = attributes.length; j < l; j ++ ) {

			const attribute = attributes[ j ];
			const itemSize = attribute.itemSize;
			const count = attribute.count;
			const iba = new THREE.InterleavedBufferAttribute( interleavedBuffer, itemSize, offset, attribute.normalized );
			res.push( iba );
			offset += itemSize; // Move the data for each attribute into the new interleavedBuffer
			// at the appropriate offset

			for ( let c = 0; c < count; c ++ ) {

				for ( let k = 0; k < itemSize; k ++ ) {

					iba[ setters[ k ] ]( c, attribute[ getters[ k ] ]( c ) );

				}

			}

		}

		return res;

	}
	/**
 * @param {Array<BufferGeometry>} geometry
 * @return {number}
 */


	function estimateBytesUsed( geometry ) {

		// Return the estimated memory used by this geometry in bytes
		// Calculate using itemSize, count, and BYTES_PER_ELEMENT to account
		// for InterleavedBufferAttributes.
		let mem = 0;

		for ( const name in geometry.attributes ) {

			const attr = geometry.getAttribute( name );
			mem += attr.count * attr.itemSize * attr.array.BYTES_PER_ELEMENT;

		}

		const indices = geometry.getIndex();
		mem += indices ? indices.count * indices.itemSize * indices.array.BYTES_PER_ELEMENT : 0;
		return mem;

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {number} tolerance
 * @return {BufferGeometry>}
 */


	function mergeVertices( geometry, tolerance = 1e-4 ) {

		tolerance = Math.max( tolerance, Number.EPSILON ); // Generate an index buffer if the geometry doesn't have one, or optimize it
		// if it's already available.

		const hashToIndex = {};
		const indices = geometry.getIndex();
		const positions = geometry.getAttribute( 'position' );
		const vertexCount = indices ? indices.count : positions.count; // next value for triangle indices

		let nextIndex = 0; // attributes and new attribute arrays

		const attributeNames = Object.keys( geometry.attributes );
		const attrArrays = {};
		const morphAttrsArrays = {};
		const newIndices = [];
		const getters = [ 'getX', 'getY', 'getZ', 'getW' ]; // initialize the arrays

		for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

			const name = attributeNames[ i ];
			attrArrays[ name ] = [];
			const morphAttr = geometry.morphAttributes[ name ];

			if ( morphAttr ) {

				morphAttrsArrays[ name ] = new Array( morphAttr.length ).fill().map( () => [] );

			}

		} // convert the error tolerance to an amount of decimal places to truncate to


		const decimalShift = Math.log10( 1 / tolerance );
		const shiftMultiplier = Math.pow( 10, decimalShift );

		for ( let i = 0; i < vertexCount; i ++ ) {

			const index = indices ? indices.getX( i ) : i; // Generate a hash for the vertex attributes at the current index 'i'

			let hash = '';

			for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

				const name = attributeNames[ j ];
				const attribute = geometry.getAttribute( name );
				const itemSize = attribute.itemSize;

				for ( let k = 0; k < itemSize; k ++ ) {

					// double tilde truncates the decimal value
					hash += `${~ ~ ( attribute[ getters[ k ] ]( index ) * shiftMultiplier )},`;

				}

			} // Add another reference to the vertex if it's already
			// used by another index


			if ( hash in hashToIndex ) {

				newIndices.push( hashToIndex[ hash ] );

			} else {

				// copy data to the new index in the attribute arrays
				for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

					const name = attributeNames[ j ];
					const attribute = geometry.getAttribute( name );
					const morphAttr = geometry.morphAttributes[ name ];
					const itemSize = attribute.itemSize;
					const newarray = attrArrays[ name ];
					const newMorphArrays = morphAttrsArrays[ name ];

					for ( let k = 0; k < itemSize; k ++ ) {

						const getterFunc = getters[ k ];
						newarray.push( attribute[ getterFunc ]( index ) );

						if ( morphAttr ) {

							for ( let m = 0, ml = morphAttr.length; m < ml; m ++ ) {

								newMorphArrays[ m ].push( morphAttr[ m ][ getterFunc ]( index ) );

							}

						}

					}

				}

				hashToIndex[ hash ] = nextIndex;
				newIndices.push( nextIndex );
				nextIndex ++;

			}

		} // Generate typed arrays from new attribute arrays and update
		// the attributeBuffers


		const result = geometry.clone();

		for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

			const name = attributeNames[ i ];
			const oldAttribute = geometry.getAttribute( name );
			const buffer = new oldAttribute.array.constructor( attrArrays[ name ] );
			const attribute = new THREE.BufferAttribute( buffer, oldAttribute.itemSize, oldAttribute.normalized );
			result.setAttribute( name, attribute ); // Update the attribute arrays

			if ( name in morphAttrsArrays ) {

				for ( let j = 0; j < morphAttrsArrays[ name ].length; j ++ ) {

					const oldMorphAttribute = geometry.morphAttributes[ name ][ j ];
					const buffer = new oldMorphAttribute.array.constructor( morphAttrsArrays[ name ][ j ] );
					const morphAttribute = new THREE.BufferAttribute( buffer, oldMorphAttribute.itemSize, oldMorphAttribute.normalized );
					result.morphAttributes[ name ][ j ] = morphAttribute;

				}

			}

		} // indices


		result.setIndex( newIndices );
		return result;

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {number} drawMode
 * @return {BufferGeometry>}
 */


	function toTrianglesDrawMode( geometry, drawMode ) {

		if ( drawMode === THREE.TrianglesDrawMode ) {

			console.warn( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.' );
			return geometry;

		}

		if ( drawMode === THREE.TriangleFanDrawMode || drawMode === THREE.TriangleStripDrawMode ) {

			let index = geometry.getIndex(); // generate index if not present

			if ( index === null ) {

				const indices = [];
				const position = geometry.getAttribute( 'position' );

				if ( position !== undefined ) {

					for ( let i = 0; i < position.count; i ++ ) {

						indices.push( i );

					}

					geometry.setIndex( indices );
					index = geometry.getIndex();

				} else {

					console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
					return geometry;

				}

			} //


			const numberOfTriangles = index.count - 2;
			const newIndices = [];

			if ( drawMode === THREE.TriangleFanDrawMode ) {

				// gl.TRIANGLE_FAN
				for ( let i = 1; i <= numberOfTriangles; i ++ ) {

					newIndices.push( index.getX( 0 ) );
					newIndices.push( index.getX( i ) );
					newIndices.push( index.getX( i + 1 ) );

				}

			} else {

				// gl.TRIANGLE_STRIP
				for ( let i = 0; i < numberOfTriangles; i ++ ) {

					if ( i % 2 === 0 ) {

						newIndices.push( index.getX( i ) );
						newIndices.push( index.getX( i + 1 ) );
						newIndices.push( index.getX( i + 2 ) );

					} else {

						newIndices.push( index.getX( i + 2 ) );
						newIndices.push( index.getX( i + 1 ) );
						newIndices.push( index.getX( i ) );

					}

				}

			}

			if ( newIndices.length / 3 !== numberOfTriangles ) {

				console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

			} // build final geometry


			const newGeometry = geometry.clone();
			newGeometry.setIndex( newIndices );
			newGeometry.clearGroups();
			return newGeometry;

		} else {

			console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:', drawMode );
			return geometry;

		}

	}
	/**
 * Calculates the morphed attributes of a morphed/skinned THREE.BufferGeometry.
 * Helpful for Raytracing or Decals.
 * @param {Mesh | Line | Points} object An instance of Mesh, Line or Points.
 * @return {Object} An Object with original position/normal attributes and morphed ones.
 */


	function computeMorphedAttributes( object ) {

		if ( object.geometry.isBufferGeometry !== true ) {

			console.error( 'THREE.BufferGeometryUtils: Geometry is not of type THREE.BufferGeometry.' );
			return null;

		}

		const _vA = new THREE.Vector3();

		const _vB = new THREE.Vector3();

		const _vC = new THREE.Vector3();

		const _tempA = new THREE.Vector3();

		const _tempB = new THREE.Vector3();

		const _tempC = new THREE.Vector3();

		const _morphA = new THREE.Vector3();

		const _morphB = new THREE.Vector3();

		const _morphC = new THREE.Vector3();

		function _calculateMorphedAttributeData( object, material, attribute, morphAttribute, morphTargetsRelative, a, b, c, modifiedAttributeArray ) {

			_vA.fromBufferAttribute( attribute, a );

			_vB.fromBufferAttribute( attribute, b );

			_vC.fromBufferAttribute( attribute, c );

			const morphInfluences = object.morphTargetInfluences;

			if ( material.morphTargets && morphAttribute && morphInfluences ) {

				_morphA.set( 0, 0, 0 );

				_morphB.set( 0, 0, 0 );

				_morphC.set( 0, 0, 0 );

				for ( let i = 0, il = morphAttribute.length; i < il; i ++ ) {

					const influence = morphInfluences[ i ];
					const morph = morphAttribute[ i ];
					if ( influence === 0 ) continue;

					_tempA.fromBufferAttribute( morph, a );

					_tempB.fromBufferAttribute( morph, b );

					_tempC.fromBufferAttribute( morph, c );

					if ( morphTargetsRelative ) {

						_morphA.addScaledVector( _tempA, influence );

						_morphB.addScaledVector( _tempB, influence );

						_morphC.addScaledVector( _tempC, influence );

					} else {

						_morphA.addScaledVector( _tempA.sub( _vA ), influence );

						_morphB.addScaledVector( _tempB.sub( _vB ), influence );

						_morphC.addScaledVector( _tempC.sub( _vC ), influence );

					}

				}

				_vA.add( _morphA );

				_vB.add( _morphB );

				_vC.add( _morphC );

			}

			if ( object.isSkinnedMesh ) {

				object.boneTransform( a, _vA );
				object.boneTransform( b, _vB );
				object.boneTransform( c, _vC );

			}

			modifiedAttributeArray[ a * 3 + 0 ] = _vA.x;
			modifiedAttributeArray[ a * 3 + 1 ] = _vA.y;
			modifiedAttributeArray[ a * 3 + 2 ] = _vA.z;
			modifiedAttributeArray[ b * 3 + 0 ] = _vB.x;
			modifiedAttributeArray[ b * 3 + 1 ] = _vB.y;
			modifiedAttributeArray[ b * 3 + 2 ] = _vB.z;
			modifiedAttributeArray[ c * 3 + 0 ] = _vC.x;
			modifiedAttributeArray[ c * 3 + 1 ] = _vC.y;
			modifiedAttributeArray[ c * 3 + 2 ] = _vC.z;

		}

		const geometry = object.geometry;
		const material = object.material;
		let a, b, c;
		const index = geometry.index;
		const positionAttribute = geometry.attributes.position;
		const morphPosition = geometry.morphAttributes.position;
		const morphTargetsRelative = geometry.morphTargetsRelative;
		const normalAttribute = geometry.attributes.normal;
		const morphNormal = geometry.morphAttributes.position;
		const groups = geometry.groups;
		const drawRange = geometry.drawRange;
		let i, j, il, jl;
		let group, groupMaterial;
		let start, end;
		const modifiedPosition = new Float32Array( positionAttribute.count * positionAttribute.itemSize );
		const modifiedNormal = new Float32Array( normalAttribute.count * normalAttribute.itemSize );

		if ( index !== null ) {

			// indexed buffer geometry
			if ( Array.isArray( material ) ) {

				for ( i = 0, il = groups.length; i < il; i ++ ) {

					group = groups[ i ];
					groupMaterial = material[ group.materialIndex ];
					start = Math.max( group.start, drawRange.start );
					end = Math.min( group.start + group.count, drawRange.start + drawRange.count );

					for ( j = start, jl = end; j < jl; j += 3 ) {

						a = index.getX( j );
						b = index.getX( j + 1 );
						c = index.getX( j + 2 );

						_calculateMorphedAttributeData( object, groupMaterial, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

						_calculateMorphedAttributeData( object, groupMaterial, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

					}

				}

			} else {

				start = Math.max( 0, drawRange.start );
				end = Math.min( index.count, drawRange.start + drawRange.count );

				for ( i = start, il = end; i < il; i += 3 ) {

					a = index.getX( i );
					b = index.getX( i + 1 );
					c = index.getX( i + 2 );

					_calculateMorphedAttributeData( object, material, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

					_calculateMorphedAttributeData( object, material, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

				}

			}

		} else {

			// non-indexed buffer geometry
			if ( Array.isArray( material ) ) {

				for ( i = 0, il = groups.length; i < il; i ++ ) {

					group = groups[ i ];
					groupMaterial = material[ group.materialIndex ];
					start = Math.max( group.start, drawRange.start );
					end = Math.min( group.start + group.count, drawRange.start + drawRange.count );

					for ( j = start, jl = end; j < jl; j += 3 ) {

						a = j;
						b = j + 1;
						c = j + 2;

						_calculateMorphedAttributeData( object, groupMaterial, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

						_calculateMorphedAttributeData( object, groupMaterial, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

					}

				}

			} else {

				start = Math.max( 0, drawRange.start );
				end = Math.min( positionAttribute.count, drawRange.start + drawRange.count );

				for ( i = start, il = end; i < il; i += 3 ) {

					a = i;
					b = i + 1;
					c = i + 2;

					_calculateMorphedAttributeData( object, material, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

					_calculateMorphedAttributeData( object, material, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

				}

			}

		}

		const morphedPositionAttribute = new THREE.Float32BufferAttribute( modifiedPosition, 3 );
		const morphedNormalAttribute = new THREE.Float32BufferAttribute( modifiedNormal, 3 );
		return {
			positionAttribute: positionAttribute,
			normalAttribute: normalAttribute,
			morphedPositionAttribute: morphedPositionAttribute,
			morphedNormalAttribute: morphedNormalAttribute
		};

	}

	THREE.BufferGeometryUtils = {};
	THREE.BufferGeometryUtils.computeMorphedAttributes = computeMorphedAttributes;
	THREE.BufferGeometryUtils.computeTangents = computeTangents;
	THREE.BufferGeometryUtils.estimateBytesUsed = estimateBytesUsed;
	THREE.BufferGeometryUtils.interleaveAttributes = interleaveAttributes;
	THREE.BufferGeometryUtils.mergeBufferAttributes = mergeBufferAttributes;
	THREE.BufferGeometryUtils.mergeBufferGeometries = mergeBufferGeometries;
	THREE.BufferGeometryUtils.mergeVertices = mergeVertices;
	THREE.BufferGeometryUtils.toTrianglesDrawMode = toTrianglesDrawMode;

} )();
( function () {

	const _cameraToLightMatrix = new THREE.Matrix4();

	const _lightSpaceFrustum = new THREE.CSMFrustum();

	const _center = new THREE.Vector3();

	const _bbox = new THREE.Box3();

	const _uniformArray = [];
	const _logArray = [];
	class CSM {

		constructor( data ) {

			data = data || {};
			this.camera = data.camera;
			this.parent = data.parent;
			this.cascades = data.cascades || 3;
			this.maxFar = data.maxFar || 100000;
			this.mode = data.mode || 'practical';
			this.shadowMapSize = data.shadowMapSize || 2048;
			this.shadowBias = data.shadowBias || 0.000001;
			this.lightDirection = data.lightDirection || new THREE.Vector3( 1, - 1, 1 ).normalize();
			this.lightIntensity = data.lightIntensity || 1;
			this.lightNear = data.lightNear || 1;
			this.lightFar = data.lightFar || 2000;
			this.lightMargin = data.lightMargin || 200;
			this.customSplitsCallback = data.customSplitsCallback;
			this.fade = false;
			this.mainFrustum = new THREE.CSMFrustum();
			this.frustums = [];
			this.breaks = [];
			this.lights = [];
			this.shaders = new Map();
			this.createLights();
			this.updateFrustums();
			this.injectInclude();

		}

		createLights() {

			for ( let i = 0; i < this.cascades; i ++ ) {

				const light = new THREE.DirectionalLight( 0xffffff, this.lightIntensity );
				light.castShadow = true;
				light.shadow.mapSize.width = this.shadowMapSize;
				light.shadow.mapSize.height = this.shadowMapSize;
				light.shadow.camera.near = this.lightNear;
				light.shadow.camera.far = this.lightFar;
				light.shadow.bias = this.shadowBias;
				this.parent.add( light );
				this.parent.add( light.target );
				this.lights.push( light );

			}

		}

		initCascades() {

			const camera = this.camera;
			camera.updateProjectionMatrix();
			this.mainFrustum.setFromProjectionMatrix( camera.projectionMatrix, this.maxFar );
			this.mainFrustum.split( this.breaks, this.frustums );

		}

		updateShadowBounds() {

			const frustums = this.frustums;

			for ( let i = 0; i < frustums.length; i ++ ) {

				const light = this.lights[ i ];
				const shadowCam = light.shadow.camera;
				const frustum = this.frustums[ i ]; // Get the two points that represent that furthest points on the frustum assuming
				// that's either the diagonal across the far plane or the diagonal across the whole
				// frustum itself.

				const nearVerts = frustum.vertices.near;
				const farVerts = frustum.vertices.far;
				const point1 = farVerts[ 0 ];
				let point2;

				if ( point1.distanceTo( farVerts[ 2 ] ) > point1.distanceTo( nearVerts[ 2 ] ) ) {

					point2 = farVerts[ 2 ];

				} else {

					point2 = nearVerts[ 2 ];

				}

				let squaredBBWidth = point1.distanceTo( point2 );

				if ( this.fade ) {

					// expand the shadow extents by the fade margin if fade is enabled.
					const camera = this.camera;
					const far = Math.max( camera.far, this.maxFar );
					const linearDepth = frustum.vertices.far[ 0 ].z / ( far - camera.near );
					const margin = 0.25 * Math.pow( linearDepth, 2.0 ) * ( far - camera.near );
					squaredBBWidth += margin;

				}

				shadowCam.left = - squaredBBWidth / 2;
				shadowCam.right = squaredBBWidth / 2;
				shadowCam.top = squaredBBWidth / 2;
				shadowCam.bottom = - squaredBBWidth / 2;
				shadowCam.updateProjectionMatrix();

			}

		}

		getBreaks() {

			const camera = this.camera;
			const far = Math.min( camera.far, this.maxFar );
			this.breaks.length = 0;

			switch ( this.mode ) {

				case 'uniform':
					uniformSplit( this.cascades, camera.near, far, this.breaks );
					break;

				case 'logarithmic':
					logarithmicSplit( this.cascades, camera.near, far, this.breaks );
					break;

				case 'practical':
					practicalSplit( this.cascades, camera.near, far, 0.5, this.breaks );
					break;

				case 'custom':
					if ( this.customSplitsCallback === undefined ) console.error( 'CSM: Custom split scheme callback not defined.' );
					this.customSplitsCallback( this.cascades, camera.near, far, this.breaks );
					break;

			}

			function uniformSplit( amount, near, far, target ) {

				for ( let i = 1; i < amount; i ++ ) {

					target.push( ( near + ( far - near ) * i / amount ) / far );

				}

				target.push( 1 );

			}

			function logarithmicSplit( amount, near, far, target ) {

				for ( let i = 1; i < amount; i ++ ) {

					target.push( near * ( far / near ) ** ( i / amount ) / far );

				}

				target.push( 1 );

			}

			function practicalSplit( amount, near, far, lambda, target ) {

				_uniformArray.length = 0;
				_logArray.length = 0;
				logarithmicSplit( amount, near, far, _logArray );
				uniformSplit( amount, near, far, _uniformArray );

				for ( let i = 1; i < amount; i ++ ) {

					target.push( THREE.MathUtils.lerp( _uniformArray[ i - 1 ], _logArray[ i - 1 ], lambda ) );

				}

				target.push( 1 );

			}

		}

		update() {

			const camera = this.camera;
			const frustums = this.frustums;

			for ( let i = 0; i < frustums.length; i ++ ) {

				const light = this.lights[ i ];
				const shadowCam = light.shadow.camera;
				const texelWidth = ( shadowCam.right - shadowCam.left ) / this.shadowMapSize;
				const texelHeight = ( shadowCam.top - shadowCam.bottom ) / this.shadowMapSize;
				light.shadow.camera.updateMatrixWorld( true );

				_cameraToLightMatrix.multiplyMatrices( light.shadow.camera.matrixWorldInverse, camera.matrixWorld );

				frustums[ i ].toSpace( _cameraToLightMatrix, _lightSpaceFrustum );
				const nearVerts = _lightSpaceFrustum.vertices.near;
				const farVerts = _lightSpaceFrustum.vertices.far;

				_bbox.makeEmpty();

				for ( let j = 0; j < 4; j ++ ) {

					_bbox.expandByPoint( nearVerts[ j ] );

					_bbox.expandByPoint( farVerts[ j ] );

				}

				_bbox.getCenter( _center );

				_center.z = _bbox.max.z + this.lightMargin;
				_center.x = Math.floor( _center.x / texelWidth ) * texelWidth;
				_center.y = Math.floor( _center.y / texelHeight ) * texelHeight;

				_center.applyMatrix4( light.shadow.camera.matrixWorld );

				light.position.copy( _center );
				light.target.position.copy( _center );
				light.target.position.x += this.lightDirection.x;
				light.target.position.y += this.lightDirection.y;
				light.target.position.z += this.lightDirection.z;

			}

		}

		injectInclude() {

			THREE.ShaderChunk.lights_fragment_begin = THREE.CSMShader.lights_fragment_begin;
			THREE.ShaderChunk.lights_pars_begin = THREE.CSMShader.lights_pars_begin;

		}

		setupMaterial( material ) {

			material.defines = material.defines || {};
			material.defines.USE_CSM = 1;
			material.defines.CSM_CASCADES = this.cascades;

			if ( this.fade ) {

				material.defines.CSM_FADE = '';

			}

			const breaksVec2 = [];
			const scope = this;
			const shaders = this.shaders;

			material.onBeforeCompile = function ( shader ) {

				const far = Math.min( scope.camera.far, scope.maxFar );
				scope.getExtendedBreaks( breaksVec2 );
				shader.uniforms.CSM_cascades = {
					value: breaksVec2
				};
				shader.uniforms.cameraNear = {
					value: scope.camera.near
				};
				shader.uniforms.shadowFar = {
					value: far
				};
				shaders.set( material, shader );

			};

			shaders.set( material, null );

		}

		updateUniforms() {

			const far = Math.min( this.camera.far, this.maxFar );
			const shaders = this.shaders;
			shaders.forEach( function ( shader, material ) {

				if ( shader !== null ) {

					const uniforms = shader.uniforms;
					this.getExtendedBreaks( uniforms.CSM_cascades.value );
					uniforms.cameraNear.value = this.camera.near;
					uniforms.shadowFar.value = far;

				}

				if ( ! this.fade && 'CSM_FADE' in material.defines ) {

					delete material.defines.CSM_FADE;
					material.needsUpdate = true;

				} else if ( this.fade && ! ( 'CSM_FADE' in material.defines ) ) {

					material.defines.CSM_FADE = '';
					material.needsUpdate = true;

				}

			}, this );

		}

		getExtendedBreaks( target ) {

			while ( target.length < this.breaks.length ) {

				target.push( new THREE.Vector2() );

			}

			target.length = this.breaks.length;

			for ( let i = 0; i < this.cascades; i ++ ) {

				const amount = this.breaks[ i ];
				const prev = this.breaks[ i - 1 ] || 0;
				target[ i ].x = prev;
				target[ i ].y = amount;

			}

		}

		updateFrustums() {

			this.getBreaks();
			this.initCascades();
			this.updateShadowBounds();
			this.updateUniforms();

		}

		remove() {

			for ( let i = 0; i < this.lights.length; i ++ ) {

				this.parent.remove( this.lights[ i ] );

			}

		}

		dispose() {

			const shaders = this.shaders;
			shaders.forEach( function ( shader, material ) {

				delete material.onBeforeCompile;
				delete material.defines.USE_CSM;
				delete material.defines.CSM_CASCADES;
				delete material.defines.CSM_FADE;

				if ( shader !== null ) {

					delete shader.uniforms.CSM_cascades;
					delete shader.uniforms.cameraNear;
					delete shader.uniforms.shadowFar;

				}

				material.needsUpdate = true;

			} );
			shaders.clear();

		}

	}

	THREE.CSM = CSM;

} )();
//--------------------------------------
// Fontloader.js

( function () {
	//import {
	//	FileLoader,
	//	Loader,
	//	ShapePath
	//} from 'three';

	let FileLoader = THREE.FileLoader;
	let Loader = THREE.Loader;
	let ShapePath = THREE.ShapePath;

	class FontLoader extends Loader {
	
		constructor( manager ) {
	
			super( manager );
	
		}
	
		load( url, onLoad, onProgress, onError ) {
	
			const scope = this;
	
			const loader = new FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( scope.withCredentials );
			loader.load( url, function ( text ) {
	
				let json;
	
				try {
	
					json = JSON.parse( text );
	
				} catch ( e ) {
	
					console.warn( 'THREE.FontLoader: typeface.js support is being deprecated. Use typeface.json instead.' );
					json = JSON.parse( text.substring( 65, text.length - 2 ) );
	
				}
	
				const font = scope.parse( json );
	
				if ( onLoad ) onLoad( font );
	
			}, onProgress, onError );
	
		}
	
		parse( json ) {
	
			return new Font( json );
	
		}
	
	}
	
	//
	
	class Font {
	
		constructor( data ) {
	
			this.type = 'Font';
	
			this.data = data;
	
		}
	
		generateShapes( text, size = 100 ) {
	
			const shapes = [];
			const paths = createPaths( text, size, this.data );
	
			for ( let p = 0, pl = paths.length; p < pl; p ++ ) {
	
				Array.prototype.push.apply( shapes, paths[ p ].toShapes() );
	
			}
	
			return shapes;
	
		}
	
	}
	
	function createPaths( text, size, data ) {
	
		const chars = Array.from( text );
		const scale = size / data.resolution;
		const line_height = ( data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness ) * scale;
	
		const paths = [];
	
		let offsetX = 0, offsetY = 0;
	
		for ( let i = 0; i < chars.length; i ++ ) {
	
			const char = chars[ i ];
	
			if ( char === '\n' ) {
	
				offsetX = 0;
				offsetY -= line_height;
	
			} else {
	
				const ret = createPath( char, scale, offsetX, offsetY, data );
				offsetX += ret.offsetX;
				paths.push( ret.path );
	
			}
	
		}
	
		return paths;
	
	}
	
	function createPath( char, scale, offsetX, offsetY, data ) {
	
		const glyph = data.glyphs[ char ] || data.glyphs[ '?' ];
	
		if ( ! glyph ) {
	
			console.error( 'THREE.Font: character "' + char + '" does not exists in font family ' + data.familyName + '.' );
	
			return;
	
		}
	
		const path = new ShapePath();
	
		let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;
	
		if ( glyph.o ) {
	
			const outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );
	
			for ( let i = 0, l = outline.length; i < l; ) {
	
				const action = outline[ i ++ ];
	
				switch ( action ) {
	
					case 'm': // moveTo
	
						x = outline[ i ++ ] * scale + offsetX;
						y = outline[ i ++ ] * scale + offsetY;
	
						path.moveTo( x, y );
	
						break;
	
					case 'l': // lineTo
	
						x = outline[ i ++ ] * scale + offsetX;
						y = outline[ i ++ ] * scale + offsetY;
	
						path.lineTo( x, y );
	
						break;
	
					case 'q': // quadraticCurveTo
	
						cpx = outline[ i ++ ] * scale + offsetX;
						cpy = outline[ i ++ ] * scale + offsetY;
						cpx1 = outline[ i ++ ] * scale + offsetX;
						cpy1 = outline[ i ++ ] * scale + offsetY;
	
						path.quadraticCurveTo( cpx1, cpy1, cpx, cpy );
	
						break;
	
					case 'b': // bezierCurveTo
	
						cpx = outline[ i ++ ] * scale + offsetX;
						cpy = outline[ i ++ ] * scale + offsetY;
						cpx1 = outline[ i ++ ] * scale + offsetX;
						cpy1 = outline[ i ++ ] * scale + offsetY;
						cpx2 = outline[ i ++ ] * scale + offsetX;
						cpy2 = outline[ i ++ ] * scale + offsetY;
	
						path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy );
	
						break;
	
				}
	
			}
	
		}
	
		return { offsetX: glyph.ha * scale, path: path };
	
	}
	
	Font.prototype.isFont = true;
	THREE._FontLoader = FontLoader;
	THREE._Font = Font;
	//export { FontLoader, Font };
} )();

//--------------------------------------
// TextGeometry.js
( function () {

/**
 * Text = 3D Text
 *
 * parameters = {
 *  font: <THREE.Font>, // font
 *
 *  size: <float>, // size of the text
 *  height: <float>, // thickness to extrude text
 *  curveSegments: <int>, // number of points on the curves
 *
 *  bevelEnabled: <bool>, // turn on bevel
 *  bevelThickness: <float>, // how deep into text bevel goes
 *  bevelSize: <float>, // how far from text outline (including bevelOffset) is bevel
 *  bevelOffset: <float> // how far from text outline does bevel start
 * }
 */

//import {
//	ExtrudeGeometry
//} from 'three';
let ExtrudeGeometry = THREE.ExtrudeGeometry;

class TextGeometry extends ExtrudeGeometry {

	constructor( text, parameters = {} ) {

		const font = parameters.font;

		if ( font === undefined ) {

			super(); // generate default extrude geometry

		} else {

			const shapes = font.generateShapes( text, parameters.size );

			// translate parameters to ExtrudeGeometry API

			parameters.depth = parameters.height !== undefined ? parameters.height : 50;

			// defaults

			if ( parameters.bevelThickness === undefined ) parameters.bevelThickness = 10;
			if ( parameters.bevelSize === undefined ) parameters.bevelSize = 8;
			if ( parameters.bevelEnabled === undefined ) parameters.bevelEnabled = false;

			super( shapes, parameters );

		}

		this.type = 'TextGeometry';

	}

}

// export { TextGeometry };
THREE._TextGeometry = TextGeometry;
} )();
