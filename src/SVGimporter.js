import { THREE } from "@croquet/worldcore";
import { SVGLoader } from './three/examples/jsm/loaders/SVGLoader.js';

export function loadSVG( url, group ) {
				const loader = new SVGLoader();
				loader.load( url, function ( data ) {
                    console.log(data)
					const paths = data.paths;
					for ( let i = 0; i < paths.length; i ++ ) {
						const path = paths[ i ];
						const fillColor = path.userData.style.fill;
						if ( fillColor !== undefined && fillColor !== 'none' ) {

							const material = new THREE.MeshBasicMaterial( {
								color: new THREE.Color().setStyle( fillColor ),
								opacity: path.userData.style.fillOpacity,
								transparent: true,
								side: THREE.DoubleSide,
								depthWrite: false,
							} );
							const shapes = SVGLoader.createShapes( path );
							for ( let j = 0; j < shapes.length; j ++ ) {
								const shape = shapes[ j ];
								const geometry = new THREE.ShapeGeometry( shape );
								const mesh = new THREE.Mesh( geometry, material );
								group.add( mesh );
							}
						}
						const strokeColor = path.userData.style.stroke;
						if ( strokeColor !== undefined && strokeColor !== 'none' ) {
							const material = new THREE.MeshBasicMaterial( {
								color: new THREE.Color().setStyle( strokeColor ),
								opacity: path.userData.style.strokeOpacity,
								transparent: true,
								side: THREE.DoubleSide,
								depthWrite: false,
							} );

							for ( let j = 0, jl = path.subPaths.length; j < jl; j ++ ) {
								const subPath = path.subPaths[ j ];
								const geometry = SVGLoader.pointsToStroke( subPath.getPoints(), path.userData.style );
								if ( geometry ) {
									const mesh = new THREE.Mesh( geometry, material );
									group.add( mesh );
								}
							}
						}
					}
				} );
			}
