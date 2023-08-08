import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////		   BACK STAGE			//////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats.domElement.style.cssText = 'position:absolute;top:44px;left:0px;';
document.body.appendChild(stats.dom);
var stats1 = new Stats();
stats1.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
stats1.domElement.style.cssText = 'position:absolute;top:44px;left:80px;';
document.body.appendChild(stats1.dom);
var stats2 = new Stats();
stats2.showPanel(2); // 0: fps, 1: ms, 2: mb, 3+: custom
stats2.domElement.style.cssText = 'position:absolute;top:44px;left:160px;';
document.body.appendChild(stats2.dom);

const scale_factor = 10; // to convert unit from from mm to 0.1 mm (ex. 0.1 mm pixels x 10 turns to 1 0.1 mm)
var maxValue = -Infinity;
var minValue = Infinity;

let offset;

const appParams = {
	loader: 'Instanced voxels',
	threshold: 1,
	voxels_num: '10000',
	scene_anim: true,			//TODO
	implosion_time: 2000, 		// [ms]
	explosion_time: 1000, 		// [ms]
	light1: 0.4, 		// [ms]
	light2: 0.6, 		// [ms]
	rotationEnabled: false,
	backgroundColor: 0x000000,
	remove_LOR_EPD: function(){},

	planeConstant_X: 0,
	planeConstant_Y: 0,
	planeConstant_Z: 0,
	showHelpers: false
};

const params = {
	voxel_size: '1',			// [mm]
	width_X: 100,
	width_Y: 100,
	width_Z: 100,
	x_offset: '0',
	y_offset: '0',
	z_offset: '0',
	LUT: 'viridis',
	alphaHash: true,
	//alpha: 0.5,
	taa: true,
	sampleLevel: 2,
	min_scale_factor: appParams.threshold,	
	A: 0.3,
	depth_write: true,
	color_offset: false,
	visible: true,
	wireframe_color: 0x281f23,
	wireframe_visible: false,
	explode: function () {},
	clip: true,
	clipIntersection: false,
	adjust_fps: function(){},
	bounding_box: function(){}
};

const constantValue = 55 * scale_factor;
const clipPlanes = [
	new THREE.Plane( new THREE.Vector3( 1,   0, 0 ), constantValue ),
	new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), constantValue ),
	new THREE.Plane( new THREE.Vector3( 0, 0, - 1 ), constantValue )
];

var sideOptions = {
	'BackSide': THREE.BackSide,
	'FrontSide': THREE.FrontSide,
	'DoubleSide': THREE.DoubleSide
};

///*
var scannerobj = new THREE.Object3D();
var scannerobj1= new THREE.Object3D();
var scannerobj2= new THREE.Object3D();
var scannerobj3= new THREE.Object3D();
var config_scanner_vis = {
	scaner_transparency: 0.5,
	side: sideOptions['DoubleSide'],
	wire_frame: false,
	depth_write: true,
	Visible: true,
	clip_scanner: true,
	scannerIntersection: false,
	explode: function () {},				// TODO
	toggleScaner: function () {
		scannerobj.visible = ! scannerobj.visible;
	},
	toggleScaner1: function () {
		scannerobj1.visible = ! scannerobj1.visible;
	},
	toggleScaner2: function () {
		scannerobj2.visible = ! scannerobj2.visible;
	},
	toggleScaner3: function () {
		scannerobj3.visible = ! scannerobj3.visible;
	}
};
//*/

var config_voxel = {
	voxel_transparency: 0.1,
	voxel_color: 0xff501f,
	LOR_clipping: false,
	depth_write: false,
	Visible: true
};

var voxel_material = new THREE.MeshBasicMaterial({
	//clip_voxels: true,
	clippingPlanes: clipPlanes,
	clipIntersection: false,
	color: config_voxel.voxel_color,
	transparent: true,
	depthWrite: false,
	opacity: config_voxel.voxel_transparency,
	blending: THREE.AdditiveBlending
});

var config_cylinder = {
	cylinderRadius: 20,
	cylinder_transparency: 0.2,
	cylinder_color: 0xe00ff,
	Visible: true
};

var cylinder_material = new THREE.MeshBasicMaterial({
	//clip_cylinder: true,
	clippingPlanes: clipPlanes,
	clipIntersection: false,
	color: config_cylinder.cylinder_color,
	blending: THREE.AdditiveBlending,
	depthWrite: false,
	opacity: config_cylinder.cylinder_transparency,
	transparent: true
});

function setXY() {
	const length = camera.position.length();
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = length;
	camera.up = new THREE.Vector3(0, 1, 0);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
};
function setYZ() {
	const length = camera.position.length();
	camera.position.x = -length;
	camera.position.y = 0;
	camera.position.z = 0;
	camera.up = new THREE.Vector3(0, 1, 0);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
};
function settYZ() {
	const length = camera.position.length();
	camera.position.x = length;
	camera.position.y = 0;
	camera.position.z = 0;
	camera.up = new THREE.Vector3(0, 1, 0);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
};
function setZX() {
	const length = camera.position.length();
	camera.position.x = 0;
	camera.position.y = length;
	camera.position.z = 0;
	camera.up = new THREE.Vector3(1, 0, 0);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
};
function set45() {
	camera.position.x = -580;
	camera.position.y = 580;
	camera.position.z = -580;
	camera.lookAt( scene.position );
}
function updateRendererInfo() {
	console.log(camera.position);
	var info = renderer.info;
	for (let prop in info.render) {
		console.log(prop + " " + info.render[prop]);
	}
	if (info.memory) {
		for (let prop in info.memory) {
			console.log(prop + " " + info.memory[prop]);
		}
	}
	//console.log("Voxels loaded: ", num_voxels);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////		   STAGE PREPARATION			//////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const scene = new THREE.Scene();
//var camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 0.1, 100000);
var camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 0.1, 100000 );
//var camera = new THREE.PerspectiveCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 0.1, 100000);
//var camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 0.1, 1000000 );
camera.position.set(-5000, 1000, 1000);
//camera.zoom = 0.5;
camera.updateProjectionMatrix();

/*
//const renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance" });
const highPerformanceRenderer = new THREE.WebGLRenderer({ powerPreference: "high-performance" });
const lowPowerRenderer = new THREE.WebGLRenderer({ powerPreference: "low-power" });
let renderer = highPerformanceRenderer;
function setRendererPreference(useHighPerformance) {
	if (useHighPerformance) {
		renderer = highPerformanceRenderer;
	} else {
		renderer = lowPowerRenderer;
	}
			
	// Update the scene and camera for the new renderer
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.render(scene, camera);
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio( window.devicePixelRatio );
renderer.localClippingEnabled = true;

document.body.appendChild(renderer.domElement);
*/

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(appParams.backgroundColor);
renderer.localClippingEnabled = true;
document.body.appendChild( renderer.domElement );

window.addEventListener('resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

//var controls = new OrbitControls(camera, renderer.domElement);

const light1 = new THREE.AmbientLight(0xffffff, appParams.light1); // soft white light
const light2 = new THREE.AmbientLight(0xFFFFC1, appParams.light2); // soft white light
scene.add(light1);
scene.add(light2);

///*
const parcelPath = new URL('../public/tower_w_2blocks.glb', import.meta.url);
const loader = new GLTFLoader();//setPath( 'models_and_data/' );
loader.load( parcelPath.href, function ( gltf ) {
//loader.load( 'tower_w_2blocks.glb', function ( gltf ) {
	gltf.scene.traverse(child => {
		if (child.isMesh) {
			child.name = "Scanner";
			child.material.depthWrite = config_scanner_vis.depth_write;
			child.material.transparent = true;
			child.material.opacity = config_scanner_vis.scaner_transparency;
			//child.material.format = THREE.RGBAFormat;
			child.material.side = config_scanner_vis.side;
			child.material.clippingPlanes = clipPlanes;
		}
	});
	gltf.scene.scale.setScalar(10); // Scaling is set to 1000 to go from mm to 100 µm
	gltf.scene.translateZ(-162);
	gltf.scene.translateY(201);
	gltf.scene.rotation.set(0,0.5*Math.PI,0);
	scannerobj = gltf.scene;
	scene.add(scannerobj);
	scannerobj1 = gltf.scene.clone();
	scannerobj1.translateY(-402);
	scannerobj1.translateX(-324);
	scannerobj1.rotation.set(Math.PI,0.5*Math.PI,0);
	scene.add(scannerobj1);
	scannerobj2 = gltf.scene.clone();
	scannerobj2.translateX(-363);
	scannerobj2.translateY(-39);
	scannerobj2.rotation.set(Math.PI,0.5*Math.PI,-0.5*Math.PI);
	scene.add(scannerobj2);
	scannerobj3 = scannerobj1.clone();
	scannerobj3.translateX(-363);
	scannerobj3.translateY(-39);
	scannerobj3.rotation.set(Math.PI,0.5*Math.PI,0.5*Math.PI);
	scene.add(scannerobj3);

	scene.add( gltf.scene );
} );
//*/

const helpers = new THREE.Group();
helpers.add( new THREE.PlaneHelper( clipPlanes[ 0 ], 100 * scale_factor, 0xff0000 ) );
helpers.add( new THREE.PlaneHelper( clipPlanes[ 1 ], 100 * scale_factor, 0x00ff00 ) );
helpers.add( new THREE.PlaneHelper( clipPlanes[ 2 ], 100 * scale_factor, 0x0000ff ) );
helpers.visible = false;
scene.add( helpers );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////			 GUI			//////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var gui = new GUI();

var app = gui.addFolder('App control');
app.close();

var file_loader = app.addFolder('File loader');
var thresholdControl;
var voxelsNumControl;
function updateControls() {
	//if (thresholdControl && file_loader.__ul.contains(thresholdControl.domElement)) file_loader.remove(thresholdControl);
	//if (voxelsNumControl && file_loader.__ul.contains(voxelsNumControl.domElement)) file_loader.remove(voxelsNumControl);

	//if (appParams.loader === 'Voxel threshold') thresholdControl = file_loader.add(appParams, 'threshold', 0, 100).name('Voxel threshold');
	//else if (appParams.loader === 'Num of voxels') voxelsNumControl = file_loader.add(appParams, 'voxels_num', appParams.voxels_num).name('# Voxels');
	if (appParams.loader === 'Voxel threshold') {
		threshold_control.enable(true);
		voxels_control.enable(false);
	}
	else if (appParams.loader === 'Num of voxels') {
		threshold_control.enable(false);
		voxels_control.enable(true);
	}
	else {
		threshold_control.enable(false);
		voxels_control.enable(false);
	}
}
file_loader.add(appParams, 'loader', ['Voxel threshold', 'Num of voxels', 'Instanced voxels']).name('Loader type').onChange(updateControls);
var threshold_control = file_loader.add(appParams, 'threshold', 0, 100).name('Voxel threshold');
threshold_control.enable(false);
var voxels_control = file_loader.add(appParams, 'voxels_num', appParams.voxels_num).name('# Voxels');
voxels_control.enable(false);
// Call updateControls initially to set the correct control based on the initial value of 'loader'
updateControls();

var display = app.addFolder('Display');
var appear = display.addFolder('Appearance');
//display.add({ useHighPerformance: true }, 'useHighPerformance').onChange(setRendererPreference);
appear.add( appParams, 'light1',0,1).name('light1').onChange(value => { light1.intensity = value } );
appear.add( appParams, 'light2',0,1).name('light2').onChange(value => { light2.intensity = value } );
appear.add( appParams, 'rotationEnabled').name('Rotation').onChange(value => {
	params.rotationEnabled = value;
});
appear.addColor(appParams, 'backgroundColor').name('Background color').onChange((colorValue) => {
	const backgroundColor = new THREE.Color(colorValue);
	renderer.setClearColor(backgroundColor);
	console.log(backgroundColor);
});
var anim = display.addFolder('Animation');
// TODO
anim.add( appParams, 'scene_anim', appParams.scene_anim).name('Animation');//.onChange(value => {
anim.add( appParams, 'implosion_time',).name('Implosion duration [ms]');
anim.add( appParams, 'explosion_time',).name('Explosion duration [ms]');
anim.close();

display.close();

var section = gui.addFolder('Cross-section view');
//clip.add( params, 'clip_voxels' ).name( 'clip LOR voxels' ).onChange( function ( value ) {
//	if(value)   voxels_mesh.material.clippingPlanes = clipPlanes;
//	else voxels_mesh.material.clippingPlanes = null;
//} );
//clip.add( params, 'clip_cylinder' ).name( 'clip LOR cylinder' ).onChange( function ( value ) {
//	if(value)   cylinders_mesh.material.clippingPlanes = clipPlanes;
//	else cylinders_mesh.material.clippingPlanes = null;
//} );
section.add( appParams, 'planeConstant_X', - 55 * scale_factor, 55 * scale_factor ).step( 0.05 * scale_factor ).name( 'plane constant X' ).onChange( function ( value ) {
		clipPlanes[ 0 ].constant = value;
} );
section.add( appParams, 'planeConstant_Y', - 55 * scale_factor, 55 * scale_factor ).step( 0.05 * scale_factor ).name( 'plane constant Y' ).onChange( function ( value ) {
		clipPlanes[ 1 ].constant = value;
} );
section.add( appParams, 'planeConstant_Z', - 55 * scale_factor, 55 * scale_factor ).step( 0.05 * scale_factor ).name( 'plane constant Z' ).onChange( function ( value ) {
		clipPlanes[ 2 ].constant = value;
} );
section.add( appParams, 'showHelpers' ).name( 'show helpers' ).onChange( function ( value ) {
	helpers.visible = value;
} );
section.close();

//*
var scanner = gui.addFolder('Scanner');
scanner.add(config_scanner_vis, 'scaner_transparency', 0, 1).onChange( function ( value ) {;
	scannerobj.traverse(child => {
		if (child.isMesh) child.material.opacity = config_scanner_vis.scaner_transparency;
	});
});
// TODO
scanner.add( config_scanner_vis, 'side', sideOptions ).name( 'Render side' ).onChange( function ( value ) {
	config_scanner_vis.side = value;
	scannerobj.traverse(child => {
		if (child.isMesh) {
			child.material.side = config_scanner_vis.side;
			console.log(config_scanner_vis.side);
		}
	});
});
scanner.add(config_scanner_vis, 'wire_frame').onChange(function() {
	scannerobj.traverse(function(child) {
		if (child instanceof THREE.Mesh) child.material.wireframe = config_scanner_vis.wire_frame;
	});
});
scanner.add(config_scanner_vis, 'depth_write').onChange(function() {
	scannerobj.traverse(function(child) {
		if (child instanceof THREE.Mesh) child.material.depthWrite = config_scanner_vis.depth_write;
	});
});
scanner.add( config_scanner_vis, 'clip_scanner' ).name( 'Section view' ).onChange( function ( value ) {
	scannerobj.traverse(function(obj){
		if(obj.type === 'Mesh'){
			if(value)	obj.material.clippingPlanes = clipPlanes;
			else obj.material.clippingPlanes = null;
		}
	});
} );
scanner.add( config_scanner_vis, 'scannerIntersection' ).name( 'Inverted section' ).onChange( function ( value ) {
	scannerobj.traverse(function(obj){
		if(obj.type === 'Mesh') obj.material.clipIntersection = value;
	});
} );
scanner.add(config_scanner_vis, 'Visible').onChange(function() {
	scannerobj.visible = config_scanner_vis.Visible;
	scannerobj1.visible = config_scanner_vis.Visible;
	scannerobj2.visible = config_scanner_vis.Visible;
	scannerobj3.visible = config_scanner_vis.Visible;
});
var hide = scanner.addFolder('Hide/Show');
hide.add(config_scanner_vis, 'toggleScaner').name('Top tower');
hide.add(config_scanner_vis, 'toggleScaner1').name('Bottom tower');
hide.add(config_scanner_vis, 'toggleScaner2').name('Right tower');
hide.add(config_scanner_vis, 'toggleScaner3').name('Left tower');
scanner.add( config_scanner_vis, 'explode').name('Explode').onChange( function( value ){ explode("Scanner");} );
hide.close();
scanner.close();
//*/

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////		   FILE LOADER			//////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////		   TEXTURE LOADER			//////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const voxelMeshes = [];
function loadGenericTexture_instancedMesh(fileTemplate, texture_array, histogram_array) {
	let worldcube;
	let offset;
	var color_value = new THREE.Color();

	var worldcubeGeometry = new THREE.BoxGeometry(params.width_X * params.voxel_size * scale_factor, 
												params.width_Y * params.voxel_size * scale_factor, 
												params.width_Z * params.voxel_size * scale_factor);
	worldcube = new THREE.Mesh(worldcubeGeometry, new THREE.MeshBasicMaterial({ color: params.wireframe_color }));
	worldcube.material.wireframe = true;
	worldcube.visible = false;
	worldcube.name = fileTemplate + '-wireframe';
	scene.add(worldcube);

	if(params.color_offset) offset = maxValue * appParams.threshold / 100;
	if(!params.color_offset) offset = minValue;

	const voxelGeometry = new THREE.BoxGeometry(params.voxel_size * scale_factor, params.voxel_size * scale_factor, params.voxel_size * scale_factor);
	var LUT;
	if(params.LUT == 'jet') LUT = LUT_jet_color;
	if(params.LUT == 'fire') LUT = LUT_fire_color;
	if(params.LUT == 'viridis') LUT = LUT_viridis_color;
	if(params.LUT == '5ramps') LUT = LUT_5ramps_color;
	for (let i = 0; i < histogram_array.length; i++) {
		color_value = LUT( Math.ceil( ((i - offset) / (maxValue - offset)) * 255) );
		const voxelMaterial = new THREE.MeshBasicMaterial({ clippingPlanes: clipPlanes,
															clipIntersection: params.clipIntersection, 
															//side: THREE.FrontSide,
															depthWrite: params.depth_write,
															color: color_value, 
															//transparent: true });
															alphaHash: params.alphaHash });
		voxelMaterial.opacity = opacity_weight(i, 255, minValue, params.A);
		const voxelsMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, histogram_array[i]);
		voxelsMesh.name = fileTemplate;
		voxelsMesh.userData = { color_value: i };
	
		// Add the voxelsMesh to the scene
		scene.add(voxelsMesh);
		if (i < (params.min_scale_factor / 100) * 255) {
		//if (offset + (i / 255) * (maxValue - offset) <  maxValue * params.min_scale_factor / 100) {
			voxelsMesh.visible = false;
		}
	
		voxelMeshes.push(voxelsMesh); // Store the voxelsMesh in the array
	}

	var index = 0;
	var index_value = 0;
	const index_array = new Array(256).fill(0);
	for (var entry = 0; entry < texture_array.length -1; entry = entry + 1) {
		var x = texture_array[entry].x;
		var y = texture_array[entry].y;
		var z = texture_array[entry].z;
		var value = texture_array[entry].value;

		index_value = Math.ceil( ((value - offset) / (maxValue - offset)) * 255);

		var dummy = new THREE.Object3D();
		dummy.position.set(x * ((params.voxel_size + 0.0) * scale_factor) - (params.width_X/2)*((params.voxel_size + 0.0) * scale_factor), 
			 			   y * ((params.voxel_size + 0.0) * scale_factor) - (params.width_Y/2)*((params.voxel_size + 0.0) * scale_factor), 
						   z * ((params.voxel_size + 0.0) * scale_factor) - (params.width_Z/2)*((params.voxel_size + 0.0) * scale_factor));
	 	dummy.updateMatrix();
		voxelMeshes[index_value].setMatrixAt(index_array[index_value], dummy.matrix);
	 	index_array[index_value]++;

		voxelMeshes[index_value].instanceMatrix.needsUpdate = true;
	}
}

var num_voxels = 0;
function loadGenericTexture(fileTemplate, texture_array) {
	let worldcube;
	let offset;
	var color_value = new THREE.Color();

	var worldcubeGeometry = new THREE.BoxGeometry(params.width_X * params.voxel_size * scale_factor, 
												params.width_Y * params.voxel_size * scale_factor, 
												params.width_Z * params.voxel_size * scale_factor);
	worldcube = new THREE.Mesh(worldcubeGeometry, new THREE.MeshBasicMaterial({ color: params.wireframe_color }));
	worldcube.material.wireframe = true;
	worldcube.visible = false;
	worldcube.name = fileTemplate + '-wireframe';
	scene.add(worldcube);


	if(params.color_offset) offset = maxValue * appParams.threshold / 100;
	if(!params.color_offset) offset = minValue;

	var texture_array_length;
	if (appParams.loader === 'Voxel threshold') texture_array_length = texture_array.length -1; 
	else if (appParams.loader === 'Num of voxels') texture_array_length = parseInt(appParams.voxels_num, 10);
	for (var entry = 0; entry < texture_array_length; entry = entry + 1) {
		var x = texture_array[entry].x;
		var y = texture_array[entry].y;
		var z = texture_array[entry].z;
		console.log(x,y,z);
		var value = texture_array[entry].value;
		var threshold_value; 
		if (appParams.loader === 'Voxel threshold') threshold_value = maxValue * appParams.threshold / 100; 
		else if (appParams.loader === 'Num of voxels') threshold_value = 0;
		if (value > threshold_value && value != 0) {
			if(params.LUT == 'jet') color_value = LUT_jet_color( Math.ceil( ((value - offset) / (maxValue - offset)) * 255) );
			if(params.LUT == 'fire') color_value = LUT_fire_color( Math.ceil( ((value - offset) / (maxValue - offset)) * 255) );
			if(params.LUT == 'viridis') color_value = LUT_viridis_color( Math.ceil( ((value - offset) / (maxValue - offset)) * 255) );
			if(params.LUT == '5ramps') color_value = LUT_5ramps_color( Math.ceil( ((value - offset) / (maxValue - offset)) * 255) );
			const cubeMaterial = new THREE.MeshBasicMaterial({ clippingPlanes: clipPlanes,
																clipIntersection: params.clipIntersection, 
																depthWrite: params.depth_write,
																color: color_value, 
																transparent: true });
			cubeMaterial.opacity = opacity_weight(((value - offset) / (maxValue - offset)) * 255, 255, minValue, params.A);
			var cubeGeometry = new THREE.BoxGeometry(params.voxel_size * scale_factor, params.voxel_size * scale_factor, params.voxel_size * scale_factor);
			var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
			cube.position.set(  THREE.MathUtils.randFloatSpread(1200),
								THREE.MathUtils.randFloatSpread(1200),
								THREE.MathUtils.randFloatSpread(1200));
			//var targetPosition = new THREE.Vector3();
			//cube.position.set(z * (params.voxel_size * scale_factor) - (params.width_Z/2)*(params.voxel_size * scale_factor), 
			var targetPosition = new THREE.Vector3( x * (params.voxel_size * scale_factor) - (params.width_X/2)*(params.voxel_size * scale_factor), 
													y * (params.voxel_size * scale_factor) - (params.width_Y/2)*(params.voxel_size * scale_factor), 
													z * (params.voxel_size * scale_factor) - (params.width_Z/2)*(params.voxel_size * scale_factor));
			cube.name = fileTemplate;
			cube.userData = { X: x, Y: y, Z: z, finalPosition: targetPosition, color_value: Math.ceil((value / maxValue) * 255) };
			scene.add(cube);
			var threshold_visibility = 0;
			if (appParams.loader === 'Voxel threshold') threshold_visibility = maxValue * params.min_scale_factor / 100; 
			else if (appParams.loader === 'Num of voxels') threshold_visibility = 0;
			if (value < threshold_visibility) {
				cube.visible = false;
			}
			num_voxels = num_voxels + 1;
		}
	}
	implode(fileTemplate);
	console.log("Voxels loaded: ", num_voxels);
}

function opacity_weight(x, maxValue, min, weight) {
	const N = maxValue;		// maximum value
	const x0 = min;			// offset value
	const A = weight;			// amplitude of exponential growth
	
	if (x <= x0) {
		return 0.0;
	} else if (x >= N) {
		return 1.0;
	} else {
		return 1.0 - Math.exp(-1* A * (x - x0) / (N - x0));
	}
}

function x_move(fileTemplate, value){
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.name === fileTemplate && object.position) {
			if(appParams.loader !== 'Instanced voxels') object.position.x = object.userData.finalPosition.x + parseFloat(value,10);
			else object.position.x = 0 + parseFloat(value,10);
		}
	});
}
function y_move(fileTemplate, value){
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.name === fileTemplate && object.position) {
			if(appParams.loader !== 'Instanced voxels') object.position.y = object.userData.finalPosition.y + parseFloat(value,10);
			else object.position.y = 0 + parseFloat(value,10);
		}
	});
}
function z_move(fileTemplate, value){
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.name === fileTemplate && object.position) {
			if(appParams.loader !== 'Instanced voxels') object.position.z = object.userData.finalPosition.z + parseFloat(value,10);
			else object.position.z = 0 + parseFloat(value,10);
		}
	});
}

function change_voxel_size (fileTemplate, value){
	params.voxel_size = parseFloat(value,10);
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate) {
				object.geometry.parameters.width = params.voxel_size * scale_factor;
				object.geometry.parameters.height = params.voxel_size * scale_factor;
				object.geometry.parameters.depth = params.voxel_size * scale_factor;
				object.geometry = new THREE.BoxGeometry(object.geometry.parameters.width, object.geometry.parameters.height, object.geometry.parameters.depth);
				object.geometry.computeBoundingBox();
				object.position.x = object.userData.X * (params.voxel_size * scale_factor) - (params.width_X/2)*(params.voxel_size * scale_factor);
				object.position.y = object.userData.Y * (params.voxel_size * scale_factor) - (params.width_Y/2)*(params.voxel_size * scale_factor);
				object.position.z = object.userData.Z * (params.voxel_size * scale_factor) - (params.width_Z/2)*(params.voxel_size * scale_factor);
			}
		}
	});
}

function change_LUT(fileTemplate, value) {
	params.LUT = value;
	if(params.color_offset) offset = maxValue * params.min_scale_factor / 100;
	if(!params.color_offset) offset = minValue;
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate) {
				if(params.LUT == 'jet') object.material.color = LUT_jet_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
				if(params.LUT == 'fire') object.material.color = LUT_fire_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
				if(params.LUT == 'viridis') object.material.color = LUT_viridis_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
				if(params.LUT == '5ramps') object.material.color = LUT_5ramps_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255));
			}
		}
	});
	/*
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate) {
				if(params.LUT == 'jet') object.material.color = LUT_jet_color(object.userData.color_value);
				if(params.LUT == 'fire') object.material.color = LUT_fire_color(object.userData.color_value);
				if(params.LUT == 'viridis') object.material.color = LUT_viridis_color(object.userData.color_value);
				if(params.LUT == '5ramps') object.material.color = LUT_5ramps_color(object.userData.color_value);
			}
		}
	});
	*/
}

function change_min_transp (fileTemplate, value ) {
	params.min_scale_factor = value;
	var voxels_n = 0;
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate && object.userData.color_value < maxValue * params.min_scale_factor / 100 ) {
				object.visible = false;
			}
			if (object.name == fileTemplate && object.userData.color_value > maxValue * params.min_scale_factor / 100 && params.visible) {
				object.visible = true;
				voxels_n = voxels_n + 1;
				if(params.color_offset) {
					offset = maxValue * params.min_scale_factor / 100;
					if(params.LUT == 'jet') object.material.color = LUT_jet_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
					if(params.LUT == 'fire') object.material.color = LUT_fire_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
					if(params.LUT == 'viridis') object.material.color = LUT_viridis_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
					if(params.LUT == '5ramps') object.material.color = LUT_5ramps_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255));
				}
				// TODO fix this opacity max and min range!!!
				//object.material.opacity = opacity_weight(object.userData.color_value, maxValue, minValue * params.min_scale_factor / 100, params.A);
			}
		}
	});
	//console.log(voxels_n, " Voxels visible");
}

function change_transp_scale(fileTemplate, value ) {
	params.A = value;
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate) {
				// TODO fix this opacity max and min range!!!
				object.material.opacity = opacity_weight(object.userData.color_value, maxValue, minValue * params.min_scale_factor / 100, params.A);
			}
		}
	});
} 

function change_visibility(fileTemplate, value) {
	var threshold_value;
	if (appParams.loader === 'Voxel threshold' || appParams.loader === 'Instanced voxels') threshold_value = maxValue * params.min_scale_factor / 100; 
	else if (appParams.loader === 'Num of voxels') threshold_value = 0;
	params.visible = value;
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh) {
			if (object.name == fileTemplate && object.userData.color_value > threshold_value) {
				object.visible = params.visible;
			}
		}
	});
}

let needsUpdate = false;

function change_alpha_hash(fileTemplate, value) {
	params.alphaHash = value;
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.name == fileTemplate) {
			object.material.alphaHash = params.alphaHash;
			object.material.transparent = ! params.alphaHash;
			object.material.depthWrite = params.alphaHash;

			object.material.needsUpdate = true;
			needsUpdate = true;
			console.log("HERE ", object.alphaHash);
		}
	});
}

// Define the ease-out function
function easeOut(t) {
	return 1 - Math.pow(1 - t, 2);
}

// Define the implosion animation function
function implodeObject(object, duration, callback) {
	let startTime = 0;
	let initialPosition = object.position.clone();
	
	function animateImplosion(timestamp) {
		 if (!startTime) startTime = timestamp;
		 const progress = Math.min((timestamp - startTime) / duration, 1);
		 const easedProgress = 1 - Math.pow(1 - progress, 2); // Apply the ease-out function
		
		 // Calculate the implosion distance based on eased progress
		 const implosionDistance = initialPosition.distanceTo(object.userData.finalPosition) * easedProgress;
		 const implosionDirection = object.userData.finalPosition.clone().sub(initialPosition).normalize();
		 object.position.copy(initialPosition).addScaledVector(implosionDirection, implosionDistance);
		
		 if (progress < 1) {
		 	requestAnimationFrame(animateImplosion);
		 } else {
		 	// At the end of the implosion, set position to the final target position
		 	object.position.copy(object.userData.finalPosition);
		
		 	if (typeof callback === 'function') callback();
		 }
	}

	requestAnimationFrame(animateImplosion);
}

function implode(fileTemplate) {
	// Specify the implosion parameters here
	const duration = appParams.implosion_time; // Set the duration (milliseconds) for the implosion animation

	scene.traverse((object) => {
	if (object instanceof THREE.Mesh && object.name === fileTemplate) {
		// Call the implodeObject function to perform the implosion animation
		implodeObject(object, duration, () => {
		// This callback function will be executed when the animation is finished
		// Add any additional logic here if needed
		});
	}
	});
}

function removeFolderByName(gui, folderName) {
	for (const folderKey in gui.__folders) {
	if (gui.__folders.hasOwnProperty(folderKey)) {
		const folder = gui.__folders[folderKey];
		if (folder.name === folderName) {
		// Remove the folder from the dat.GUI DOM
		folder.domElement.parentNode.removeChild(folder.domElement);
		// Remove the folder from the dat.GUI instance
		delete gui.__folders[folderKey];
		break; // Stop the loop once the folder is removed
		}
	}
	}
}

// Define the explosion animation function with ease-out effect
function explodeObject(object, distance, duration, callback) {
	let startTime = 0;
	let initialPosition = object.position.clone();
	let explosionDirection = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
	//let explosionDirection = initialPosition.clone().normalize();
	let initialOpacity = object.material.opacity; // Store the initial opacity

	//object.material.clippingPlanes = null;

	function animateExplosion(timestamp) {
	if (!startTime) startTime = timestamp;
	const progress = (timestamp - startTime) / duration;
	if (progress < 1) {
		const explosionDistance = distance * scale_factor * easeOut(progress);
		object.position.copy(initialPosition).addScaledVector(explosionDirection, explosionDistance);
		const opacity = initialOpacity * (1 - easeOut(progress)); // Gradually decrease opacity
		object.material.opacity = opacity;

		requestAnimationFrame(animateExplosion);
	} else {
		// At the end of the explosion, set position and opacity to final values
		object.position.copy(initialPosition).addScaledVector(explosionDirection, distance * scale_factor);
		object.material.opacity = 0;

		if (typeof callback === 'function') callback();
	}
	}
	requestAnimationFrame(animateExplosion);
}

function explode(fileTemplate) {
	scene.traverse((object) => {
	if (object instanceof THREE.Mesh && object.name == fileTemplate && object.visible ) {
		explodeObject(object, 80, appParams.explosion_time, () => {
		// This callback function will be executed when the animation is finished
		// Add any additional logic here if needed
			scene.remove(object);
		});
	}
	});
	removeFolderByName(gui, fileTemplate);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////			 EPD LOADER			//////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isInside(x, y, z, BX, BY, BZ) {
	if (Math.abs(x) > BX) {
		return false;
	}
	if (Math.abs(y) > BY) {
		return false;
	}
	if (Math.abs(z) > BZ) {
		return false;
	} else {
		return true;
	}
}

var index = 0;
function Bresenham3D(x1, y1, z1, x2, y2, z2, lX, lY, lZ, mesh) {
	var dummy = new THREE.Object3D();
	var BoxX, BoxY, BoxZ;
	BoxX = lX ;
	BoxY = lY ;
	BoxZ = lZ ;
	var i, dx, dy, dz, l, m, n, x_inc, y_inc, z_inc, err_1, err_2, dx2, dy2, dz2;
	var point = [-1, -1, -1];
	var step = 1;
	point[0] = x1;
	point[1] = y1;
	point[2] = z1;
	dx = x2 - x1;
	dy = y2 - y1;
	dz = z2 - z1;
	x_inc = (dx < 0) ? -step : step;
	l = Math.abs(dx);
	y_inc = (dy < 0) ? -step : step;
	m = Math.abs(dy);
	z_inc = (dz < 0) ? -step : step;
	n = Math.abs(dz);
	dx2 = l << 1;
	dy2 = m << 1;
	dz2 = n << 1;

	if ((l >= m) && (l >= n)) {
		err_1 = dy2 - l;
		err_2 = dz2 - l;
		for (i = 0; i < l; i++) {
			if (isInside(point[0], point[1], point[2], BoxX, BoxY, BoxZ) || !config_voxel.LOR_clipping) {
				dummy.position.set(point[0], point[1], point[2]);
				dummy.updateMatrix();
				mesh.setMatrixAt(index, dummy.matrix);
				++index;
		 	}

			if (err_1 > 0) {
				point[1] += y_inc;
				err_1 -= dx2;
			}
			if (err_2 > 0) {
				point[2] += z_inc;
				err_2 -= dx2;
			}
			err_1 += dy2;
			err_2 += dz2;
			point[0] += x_inc;
		}
	} else if ((m >= l) && (m >= n)) {
		err_1 = dx2 - m;
		err_2 = dz2 - m;
		for (i = 0; i < m; i++) {
			if (isInside(point[0], point[1], point[2], BoxX, BoxY, BoxZ) || !config_voxel.LOR_clipping) {
				dummy.position.set(point[0], point[1], point[2]);
				dummy.updateMatrix();
				mesh.setMatrixAt(index, dummy.matrix);
				++index;
			}
			if (err_1 > 0) {
				point[0] += x_inc;
				err_1 -= dy2;
			}
			if (err_2 > 0) {
				point[2] += z_inc;
				err_2 -= dy2;
			}
			err_1 += dx2;
			err_2 += dz2;
			point[1] += y_inc;
		}
	} else {
		err_1 = dy2 - n;
		err_2 = dx2 - n;
		for (i = 0; i < n; i++) {
			if (isInside(point[0], point[1], point[2], BoxX, BoxY, BoxZ) || !config_voxel.LOR_clipping) {
				dummy.position.set(point[0], point[1], point[2]);
				dummy.updateMatrix();
				mesh.setMatrixAt(index, dummy.matrix);
				++index;
			}
			if (err_1 > 0) {
				point[1] += y_inc;
				err_1 -= dz2;
			}
			if (err_2 > 0) {
				point[0] += x_inc;
				err_2 -= dz2;
			}
			err_1 += dy2;
			err_2 += dx2;
			point[2] += z_inc;
		}
	}
	if (isInside(point[0], point[1], point[2], BoxX, BoxY, BoxZ) || !config_voxel.LOR_clipping) {
		dummy.position.set(point[0], point[1], point[2]);
		dummy.updateMatrix();
		mesh.setMatrixAt(index, dummy.matrix);
		++index;
	}
	mesh.instanceMatrix.needsUpdate = true;
}

var index2 = 0;
function drawCylinder(x1, y1, z1, x2, y2, z2, cylinders_mesh) {
	var vstart = new THREE.Vector3(x1, y1, z1);
	var vend = new THREE.Vector3(x2, y2, z2);
	var distance = vstart.distanceTo(vend);

	const { x: ax, y: ay, z: az } = vstart;
	const { x: bx, y: by, z: bz } = vend;
	const stickAxis = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();

	const scale = new THREE.Vector3(1, distance, 1);
	const position = new THREE.Vector3((bx + ax) / 2, (by + ay) / 2, (bz + az) / 2);
	const quaternion = new THREE.Quaternion();

	const cylinderUpAxis = new THREE.Vector3(0, 1, 0);
	quaternion.setFromUnitVectors(cylinderUpAxis, stickAxis);

	const matrix = new THREE.Matrix4();
	matrix.compose(position, quaternion, scale);

	cylinders_mesh.setMatrixAt(index2, matrix);
	++index2;
	cylinders_mesh.instanceMatrix.needsUpdate = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let mesh, material, controls;
//let camera, scene, renderer, controls, stats, mesh, material;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////		   COLOR LUTS			//////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function LUT_viridis_color(value) {
	const color = new THREE.Color();
	color.setRGB(LUT_red_viridis[value] / 255, LUT_green_viridis[value] / 255, LUT_blue_viridis[value] / 255);
	return color;
}

function LUT_jet_color(value) {
	const color = new THREE.Color();
	color.setRGB(LUT_red_jet[value] / 255, LUT_green_jet[value] / 255, LUT_blue_jet[value] / 255);
	return color;
}

function LUT_fire_color(value) {
	const color = new THREE.Color();
	color.setRGB(LUT_red_fire[value] / 255, LUT_green_fire[value] / 255, LUT_blue_fire[value] / 255);
	return color;
}

function LUT_5ramps_color(value) {
	const color = new THREE.Color();
	color.setRGB(LUT_red_5ramps[value] / 255, LUT_green_5ramps[value] / 255, LUT_blue_5ramps[value] / 255);
	return color;
}

const LUT_red_jet = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	4,	8,	12,	16,	20,	24,	28,	32,	36,	40,	44,	48,	52,	56,	60,	64,	68,	72,	76,	80,	84,	88,	92,	96,	100,	104,	108,	112,	116,	120,	124,	128,	131,	135,	139,	143,	147,	151,	155,	159,	163,	167,	171,	175,	179,	183,	187,	191,	195,	199,	203,	207,	211,	215,	219,	223,	227,	231,	235,	239,	243,	247,	251,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	251,	247,	243,	239,	235,	231,	227,	223,	219,	215,	211,	207,	203,	199,	195,	191,	187,	183,	179,	175,	171,	167,	163,	159,	155,	151,	147,	143,	139,	135,	131,	128];
const LUT_red_fire = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	4,	7,	10,	13,	16,	19,	22,	25,	28,	31,	34,	37,	40,	43,	46,	49,	52,	55,	58,	61,	64,	67,	70,	73,	76,	79,	82,	85,	88,	91,	94,	98,	101,	104,	107,	110,	113,	116,	119,	122,	125,	128,	131,	134,	137,	140,	143,	146,	148,	150,	152,	154,	156,	158,	160,	162,	163,	164,	166,	167,	168,	170,	171,	173,	174,	175,	177,	178,	179,	181,	182,	184,	185,	186,	188,	189,	190,	192,	193,	195,	196,	198,	199,	201,	202,	204,	205,	207,	208,	209,	210,	212,	213,	214,	215,	217,	218,	220,	221,	223,	224,	226,	227,	229,	230,	231,	233,	234,	235,	237,	238,	240,	241,	243,	244,	246,	247,	249,	250,	252,	252,	252,	253,	253,	253,	254,	254,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255];
const LUT_red_viridis = [68,	68,	68,	69,	69,	69,	70,	70,	70,	70,	71,	71,	71,	71,	71,	71,	71,	72,	72,	72,	72,	72,	72,	72,	72,	72,	71,	71,	71,	71,	71,	71,	71,	70,	70,	70,	70,	69,	69,	69,	69,	68,	68,	67,	67,	67,	66,	66,	66,	65,	65,	64,	64,	63,	63,	62,	62,	61,	61,	61,	60,	60,	59,	59,	58,	58,	57,	57,	56,	56,	55,	55,	54,	54,	53,	53,	52,	52,	51,	51,	50,	50,	49,	49,	49,	48,	48,	47,	47,	46,	46,	46,	45,	45,	44,	44,	44,	43,	43,	42,	42,	42,	41,	41,	40,	40,	40,	39,	39,	39,	38,	38,	38,	37,	37,	36,	36,	36,	35,	35,	35,	34,	34,	34,	33,	33,	33,	32,	32,	32,	31,	31,	31,	31,	31,	30,	30,	30,	30,	30,	30,	30,	30,	30,	30,	30,	31,	31,	31,	32,	32,	33,	33,	34,	35,	35,	36,	37,	38,	39,	40,	41,	42,	43,	44,	46,	47,	48,	50,	51,	53,	54,	56,	57,	59,	61,	62,	64,	66,	68,	69,	71,	73,	75,	77,	79,	81,	83,	85,	87,	89,	91,	94,	96,	98,	100,	103,	105,	107,	109,	112,	114,	116,	119,	121,	124,	126,	129,	131,	134,	136,	139,	141,	144,	146,	149,	151,	154,	157,	159,	162,	165,	167,	170,	173,	175,	178,	181,	183,	186,	189,	191,	194,	197,	199,	202,	205,	207,	210,	212,	215,	218,	220,	223,	225,	228,	231,	233,	236,	238,	241,	243,	246,	248,	250,	253];
const LUT_green_jet = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	4,	8,	12,	16,	20,	24,	28,	32,	36,	40,	44,	48,	52,	56,	60,	64,	68,	72,	76,	80,	84,	88,	92,	96,	100,	104,	108,	112,	116,	120,	124,	128,	131,	135,	139,	143,	147,	151,	155,	159,	163,	167,	171,	175,	179,	183,	187,	191,	195,	199,	203,	207,	211,	215,	219,	223,	227,	231,	235,	239,	243,	247,	251,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	251,	247,	243,	239,	235,	231,	227,	223,	219,	215,	211,	207,	203,	199,	195,	191,	187,	183,	179,	175,	171,	167,	163,	159,	155,	151,	147,	143,	139,	135,	131,	128,	124,	120,	116,	112,	108,	104,	100,	96,	92,	88,	84,	80,	76,	72,	68,	64,	60,	56,	52,	48,	44,	40,	36,	32,	28,	24,	20,	16,	12,	8,	4,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0];
const LUT_green_fire = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	3,	5,	7,	8,	10,	12,	14,	16,	19,	21,	24,	27,	29,	32,	35,	37,	40,	43,	46,	48,	51,	54,	57,	59,	62,	65,	68,	70,	73,	76,	79,	81,	84,	87,	90,	92,	95,	98,	101,	103,	105,	107,	109,	111,	113,	115,	117,	119,	121,	123,	125,	127,	129,	131,	133,	134,	136,	138,	140,	141,	143,	145,	147,	148,	150,	152,	154,	155,	157,	159,	161,	162,	164,	166,	168,	169,	171,	173,	175,	176,	178,	180,	182,	184,	186,	188,	190,	191,	193,	195,	197,	199,	201,	203,	205,	206,	208,	210,	212,	213,	215,	217,	219,	220,	222,	224,	226,	228,	230,	232,	234,	235,	237,	239,	241,	242,	244,	246,	248,	248,	249,	250,	251,	252,	253,	254,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255];
const LUT_green_viridis = [1,	2,	3,	5,	6,	8,	9,	11,	12,	14,	15,	17,	18,	20,	21,	22,	24,	25,	26,	28,	29,	30,	32,	33,	34,	35,	37,	38,	39,	40,	42,	43,	44,	45,	47,	48,	49,	50,	52,	53,	54,	55,	57,	58,	59,	60,	61,	62,	64,	65,	66,	67,	68,	69,	71,	72,	73,	74,	75,	76,	77,	78,	80,	81,	82,	83,	84,	85,	86,	87,	88,	89,	90,	91,	92,	93,	94,	95,	96,	97,	98,	99,	100,	101,	102,	103,	104,	105,	106,	107,	108,	109,	110,	111,	112,	113,	114,	115,	116,	117,	118,	119,	120,	121,	122,	122,	123,	124,	125,	126,	127,	128,	129,	130,	131,	132,	133,	134,	135,	136,	137,	137,	138,	139,	140,	141,	142,	143,	144,	145,	146,	147,	148,	149,	150,	151,	152,	153,	153,	154,	155,	156,	157,	158,	159,	160,	161,	162,	163,	164,	165,	166,	167,	167,	168,	169,	170,	171,	172,	173,	174,	175,	176,	177,	177,	178,	179,	180,	181,	182,	183,	184,	185,	185,	186,	187,	188,	189,	190,	190,	191,	192,	193,	194,	194,	195,	196,	197,	198,	198,	199,	200,	201,	201,	202,	203,	204,	204,	205,	206,	206,	207,	208,	208,	209,	210,	210,	211,	211,	212,	213,	213,	214,	214,	215,	215,	216,	216,	217,	217,	218,	218,	219,	219,	220,	220,	221,	221,	221,	222,	222,	223,	223,	223,	224,	224,	224,	225,	225,	225,	226,	226,	226,	227,	227,	227,	228,	228,	228,	229,	229,	229,	230,	230,	230,	231];
const LUT_blue_jet = [131,	135,	139,	143,	147,	151,	155,	159,	163,	167,	171,	175,	179,	183,	187,	191,	195,	199,	203,	207,	211,	215,	219,	223,	227,	231,	235,	239,	243,	247,	251,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	255,	251,	247,	243,	239,	235,	231,	227,	223,	219,	215,	211,	207,	203,	199,	195,	191,	187,	183,	179,	175,	171,	167,	163,	159,	155,	151,	147,	143,	139,	135,	131,	128,	124,	120,	116,	112,	108,	104,	100,	96,	92,	88,	84,	80,	76,	72,	68,	64,	60,	56,	52,	48,	44,	40,	36,	32,	28,	24,	20,	16,	12,	8,	4,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0];
const LUT_blue_fire = [0,	7,	15,	22,	30,	38,	45,	53,	61,	65,	69,	74,	78,	82,	87,	91,	96,	100,	104,	108,	113,	117,	121,	125,	130,	134,	138,	143,	147,	151,	156,	160,	165,	168,	171,	175,	178,	181,	185,	188,	192,	195,	199,	202,	206,	209,	213,	216,	220,	220,	221,	222,	223,	224,	225,	226,	227,	224,	222,	220,	218,	216,	214,	212,	210,	206,	202,	199,	195,	191,	188,	184,	181,	177,	173,	169,	166,	162,	158,	154,	151,	147,	143,	140,	136,	132,	129,	125,	122,	118,	114,	111,	107,	103,	100,	96,	93,	89,	85,	82,	78,	74,	71,	67,	64,	60,	56,	53,	49,	45,	42,	38,	35,	31,	27,	23,	20,	16,	12,	8,	5,	4,	3,	3,	2,	1,	1,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	4,	8,	13,	17,	21,	26,	30,	35,	42,	50,	58,	66,	74,	82,	90,	98,	105,	113,	121,	129,	136,	144,	152,	160,	167,	175,	183,	191,	199,	207,	215,	223,	227,	231,	235,	239,	243,	247,	251,	255,	255,	255,	255,	255,	255,	255,	255];
const LUT_blue_viridis = [84,	85,	87,	88,	90,	91,	92,	94,	95,	97,	98,	99,	101,	102,	103,	105,	106,	107,	108,	110,	111,	112,	113,	114,	115,	116,	117,	118,	119,	120,	121,	122,	123,	124,	124,	125,	126,	127,	127,	128,	129,	129,	130,	131,	131,	132,	132,	133,	133,	134,	134,	135,	135,	135,	136,	136,	137,	137,	137,	137,	138,	138,	138,	138,	139,	139,	139,	139,	139,	140,	140,	140,	140,	140,	140,	140,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	142,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	141,	140,	140,	140,	140,	140,	140,	139,	139,	139,	139,	138,	138,	138,	138,	137,	137,	137,	136,	136,	136,	135,	135,	134,	134,	133,	133,	133,	132,	132,	131,	130,	130,	129,	129,	128,	127,	127,	126,	125,	125,	124,	123,	122,	122,	121,	120,	119,	118,	118,	117,	116,	115,	114,	113,	112,	111,	110,	109,	108,	107,	105,	104,	103,	102,	101,	100,	98,	97,	96,	95,	93,	92,	91,	89,	88,	86,	85,	84,	82,	81,	79,	78,	76,	75,	73,	71,	70,	68,	67,	65,	63,	62,	60,	58,	56,	55,	53,	51,	50,	48,	46,	44,	43,	41,	39,	38,	36,	34,	33,	31,	30,	29,	28,	27,	26,	25,	24,	24,	24,	24,	24,	25,	25,	26,	27,	28,	30,	31,	33,	34,	36];
const LUT_red_5ramps = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	255];
const LUT_green_5ramps = [0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	255];
const LUT_blue_5ramps = [1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	0,	1,	5,	10,	15,	20,	25,	30,	35,	40,	45,	50,	55,	60,	65,	70,	75,	80,	85,	90,	95,	100,	105,	110,	115,	120,	125,	130,	135,	140,	145,	150,	155,	160,	165,	170,	175,	180,	185,	190,	195,	200,	205,	210,	215,	220,	225,	230,	235,	240,	245,	250,	255];

function App() {
	const canvasRef = useRef(null);
	
	useEffect(() => {
		//let camera, scene, renderer, controls, stats, mesh, material;

		let composer, renderPass, taaRenderPass, outputPass;

		let needsUpdate = false;

		const amount = parseInt( window.location.search.slice( 1 ) ) || 3;
		const count = Math.pow( amount, 3 );

		const color = new THREE.Color();

		//const params = {
		//};

		init();
		animate();

		function init() {

			//camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
			//camera.position.set( amount, amount, amount );
			//camera.lookAt( 0, 0, 0 );

			//scene = new THREE.Scene();

			//const geometry = new THREE.IcosahedronGeometry( 15 * scale_factor, 3 );

			//material = new THREE.MeshStandardMaterial( {
			//	color: 0xffffff,
			//	alphaHash: params.alphaHash,
			//	opacity: params.alpha
			//} );

			/*
			mesh = new THREE.InstancedMesh( geometry, material, count );
			let i = 0;
			const offset2 = ( amount - 1 ) / 2;
			const matrix = new THREE.Matrix4();
			for ( let x = 0; x < amount; x ++ ) {
				for ( let y = 0; y < amount; y ++ ) {
					for ( let z = 0; z < amount; z ++ ) {
						matrix.setPosition( (offset2 - x) * 300, (offset2 - y) * 300, (offset2 - z) * 300 );
						mesh.setMatrixAt( i, matrix );
						mesh.setColorAt( i, color.setHex( Math.random() * 0xffffff ) );
						i ++;
					}
				}
			}
			scene.add( mesh );
			*/

			//const environment = new RoomEnvironment( renderer );
			//const pmremGenerator = new THREE.PMREMGenerator( renderer );

			//scene.environment = pmremGenerator.fromScene( environment ).texture;
			//environment.dispose();

			//

			composer = new EffectComposer( renderer );

			renderPass = new RenderPass( scene, camera );
			renderPass.enabled = false;

			taaRenderPass = new TAARenderPass( scene, camera );

			outputPass = new OutputPass();

			composer.addPass( renderPass );
			composer.addPass( taaRenderPass );
			composer.addPass( outputPass );

			//

			controls = new OrbitControls( camera, renderer.domElement );
			controls.enableDamping = true;
			//controls.enableZoom = false;
			//controls.enablePan = false;
			controls.dampingFactor = 0.5;

			controls.addEventListener( 'change', () => ( needsUpdate = true ) );

			//

			//const gui2 = new GUI();

			//var hash = app.addFolder('Alpha hash');
			//hash.add( params, 'alpha', 0, 1 ).onChange( onMaterialUpdate );
			//hash.add( params, 'alphaHash' ).onChange( onMaterialUpdate );

			const taaFolder = gui.addFolder( 'Temporal Anti-Aliasing' );

			taaFolder.add( params, 'taa' ).name( 'enabled' ).onChange( () => {

				renderPass.enabled = ! params.taa;
				taaRenderPass.enabled = params.taa;

				//renderer.setClearColor(appParams.backgroundColor);

				sampleLevelCtrl.enable( params.taa );

				needsUpdate = true;

			} );

			const sampleLevelCtrl = taaFolder.add( params, 'sampleLevel', 0, 6, 1 ).onChange( () => ( needsUpdate = true ) );

			//

			//stats = new Stats();
			//document.body.appendChild( stats.dom );

			//window.addEventListener( 'resize', onWindowResize );

		}

		function onWindowResize() {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );
			composer.setSize( window.innerWidth, window.innerHeight );

			needsUpdate = true;

		}

		function onMaterialUpdate() {

			material.opacity = params.alpha;
			material.alphaHash = params.alphaHash;
			material.transparent = ! params.alphaHash;
			material.depthWrite = params.alphaHash;

			material.needsUpdate = true;
			needsUpdate = true;

		}

		function animate() {
			requestAnimationFrame( animate );
			controls.update();
			render();
			stats.update();
		}

		function render() {
			renderer.clear();
			if ( needsUpdate ) {
				taaRenderPass.accumulate = false;
				taaRenderPass.sampleLevel = 0;
				needsUpdate = false;
			} else {
				taaRenderPass.accumulate = true;
				taaRenderPass.sampleLevel = params.sampleLevel;
			}
			composer.render();
		}

		function setXY() {
			const length = camera.position.length();
			camera.position.x = 0;
			camera.position.y = 0;
			camera.position.z = length;
			camera.up = new THREE.Vector3(0, 1, 0);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		};
		function setYZ() {
			const length = camera.position.length();
			camera.position.x = -length;
			camera.position.y = 0;
			camera.position.z = 0;
			camera.up = new THREE.Vector3(0, 1, 0);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		};
		function settYZ() {
			const length = camera.position.length();
			camera.position.x = length;
			camera.position.y = 0;
			camera.position.z = 0;
			camera.up = new THREE.Vector3(0, 1, 0);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		};
		function setZX() {
			const length = camera.position.length();
			camera.position.x = 0;
			camera.position.y = length;
			camera.position.z = 0;
			camera.up = new THREE.Vector3(1, 0, 0);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		};
		function set45() {
			camera.position.x = -580;
			camera.position.y = 580;
			camera.position.z = -580;
			camera.lookAt( scene.position );
		}
		function updateRendererInfo() {
			console.log(camera.position);
			var info = renderer.info;
			for (let prop in info.render) {
				console.log(prop + " " + info.render[prop]);
			}
			if (info.memory) {
				for (let prop in info.memory) {
					console.log(prop + " " + info.memory[prop]);
				}
			}
			//console.log("Voxels loaded: ", num_voxels);
		}


		document.getElementById('file_GEN').onchange = function () {
			var generic_allLines;
			var file_generic = this.files[0];
			var fileName = file_generic.name;
			var fileExtension = fileName.split('.').pop();
		
			var reader = new FileReader();
			if(fileExtension == "3dm"){
				const regex = /(.*?)_(\d+)x(\d+)x(\d+)_(\d+um)\./;
				const matches = fileName.match(regex);
		
				let fileTemplate;
				if (matches) {
					fileTemplate = matches[1];
					params.width_X = parseFloat(matches[2], 10);
					params.width_Y = parseFloat(matches[3], 10);
					params.width_Z = parseFloat(matches[4], 10);
					params.voxel_size = parseFloat(matches[5], 10) / 1000; // Extracted as a number
					var min_visibility_control = 0;
					if (appParams.loader === 'Num of voxels' || appParams.loader === 'Instanced voxels') {
						min_visibility_control = 0;
						params.min_scale_factor = 0;
					} else {
						min_visibility_control = appParams.threshold; 
						params.min_scale_factor = min_visibility_control;
					}
		
					var file_gui = gui.addFolder(fileTemplate);
					//var file_gui = gui.addFolder(fileTemplate + " [" + params.width_X + "x" + params.width_Y + "x" + params.width_Z + "]");
					file_gui.add( params, "voxel_size", params.voxel_size).name("Voxel size [mm]").onFinishChange( function( value ) {change_voxel_size(fileTemplate, value);});
					file_gui.add( params, 'LUT', ['jet','fire','viridis','5ramps'] ).name( fileTemplate + 'LUT' ).onChange( function( value ){change_LUT(fileTemplate, value);} );
					///*
					file_gui.add( params, 'depth_write').onChange(function( value ) {
						scene.traverse(function(child) {
							if (child instanceof THREE.Mesh && child.name == fileTemplate) child.material.depthWrite = params.depth_write;
						});
					});
					file_gui.add( params, 'color_offset').name('Color offset').onChange(value => {
						params.color_offset = value;
						if(params.color_offset) offset = maxValue * params.min_scale_factor / 100;
						if(!params.color_offset) offset = minValue;
						scene.traverse((object) => {
							if (object instanceof THREE.Mesh) {
								if (object.name == fileTemplate) {
									if(params.LUT == 'jet') object.material.color = LUT_jet_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
									if(params.LUT == 'fire') object.material.color = LUT_fire_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
									if(params.LUT == 'viridis') object.material.color = LUT_viridis_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255) );
									if(params.LUT == '5ramps') object.material.color = LUT_5ramps_color( Math.ceil(((object.userData.color_value - offset) / (maxValue - offset)) * 255));
								}
							}
						});
					} );
					//*/
					file_gui.add( params, 'alphaHash' ).name( 'Alpha hash' ).onChange( function( value ){change_alpha_hash(fileTemplate, value);} );
					file_gui.add( params, 'min_scale_factor', min_visibility_control, 100 ).step( 0.1 ).name( 'Visibility cut [%]' ).onChange( function( value ){change_min_transp(fileTemplate, value);} );
					file_gui.add( params, 'A', 0, 100 ).step( 0.01 ).name( 'weight' ).onChange( function( value ){change_transp_scale(fileTemplate, value);} );
					file_gui.add( params, 'clip' ).name( 'Section view' ).onChange( function ( value ) {
						scene.traverse((obj) => {
							if (obj instanceof THREE.Mesh && obj.name == fileTemplate){
								if(value) obj.material.clippingPlanes = clipPlanes;
								else obj.material.clippingPlanes = null;
							}
						});
					} );
					file_gui.add( params, 'clipIntersection' ).name( 'Inverted section' ).onChange( function ( value ) {
						scene.traverse(function(obj){
							if(obj.type === 'Mesh' && obj.name == fileTemplate){
								obj.material.clipIntersection = value;
							}
						});
					} );
					file_gui.add( params, 'visible').name('Visible').onChange( function( value ){ change_visibility(fileTemplate, value);} );
					file_gui.add( params, 'wireframe_visible').name('Wireframe visible').onChange(value => {
						scene.traverse((obj) => {
							if (obj instanceof THREE.Mesh && obj.name == fileTemplate + '-wireframe'){
								obj.visible = value;
							}
						});
					});
					file_gui.addColor(params, 'wireframe_color').name('Wireframe color').onChange((colorValue) => {
						scene.traverse((obj) => {
							if (obj instanceof THREE.Mesh && obj.name == fileTemplate + '-wireframe'){
								obj.material.color = new THREE.Color(colorValue);
							}
						});
					} );
					var xyz_offset = file_gui.addFolder('XYZ offset');
					xyz_offset.add( params, 'x_offset').name('X offset').onFinishChange( function( value ) { x_move(fileTemplate, value) } );
					xyz_offset.add( params, 'y_offset').name('Y offset').onFinishChange( function( value ) { y_move(fileTemplate, value) } );
					xyz_offset.add( params, 'z_offset').name('Z offset').onFinishChange( function( value ) { z_move(fileTemplate, value) } );
					//var experimental = file_gui.addFolder('Experimental');
					//experimental.add( params, 'bounding_box').name('Move').onChange( function( value ){ addBoundingBox(fileTemplate);} );
					//experimental.add( params, 'adjust_fps').name('Adjust FPS').onChange( function( value ){ checkFPS(20, appParams.threshold, 100, fileTemplate);} );
					file_gui.add( params, 'explode').name('Explode').onChange( function( value ){ explode(fileTemplate);} );
		
					console.log("Reading file " + fileName);
					reader.onload = (event) => {
						const histogram_array = new Array(256).fill(0);
						const file_generic = event.target.result;
						generic_allLines = file_generic.split(/\r\n|\n/);
		
						var x = 0;
						var y = 0;
						var z = 0;
						const texture_array = []; // Initialize an empty array to store the data
						for (let i = 0; i < generic_allLines.length; i++) {
							if (i > 0 && i % params.width_Y == 0) {
								x++;
								y = 0;
							}
							const line = generic_allLines[i];
							const values = line.split('\t'); // assuming tab-separated values
		
							for (let z = 0; z < values.length; z++) {
								const value = parseFloat(values[z]);
								if (!isNaN(value) && value > 0) {
									texture_array.push({ x, y, z, value });
								}
							}
							y++;
						}
						texture_array.sort((a, b) => b.value - a.value);
						maxValue = texture_array[0].value;
						minValue = texture_array[texture_array.length - 1].value;
						console.log('Texture maximum value:', maxValue);
						console.log('Texture minimum value:', minValue);
						if(appParams.loader != 'Instanced voxels') {
							loadGenericTexture(fileTemplate, texture_array);
							console.log('HERE');
						}
						else {
							console.log('HERE2');
							for (const entry of texture_array) {
								const normalizedValue = (entry.value - minValue) / (maxValue - minValue);
								const index = Math.ceil(normalizedValue * 255);
								histogram_array[index]++;
							}
							loadGenericTexture_instancedMesh(fileTemplate, texture_array, histogram_array);
						}
					};
				} else {
					console.log("Please, check file name template required.");
				}
			}
			if(fileExtension == "epd"){
				var x1, x2, y1, y2, z1, z2;
				const voxels_mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), voxel_material, 1000000);
				const cylinders_mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(10, 10, 1, 6, 1), cylinder_material, 1000000);
				scene.add(voxels_mesh);
				scene.add(cylinders_mesh);
		
				var LOR_EPD = gui.addFolder('LOR End-Point-Detection');
				var voxels = LOR_EPD.addFolder('Voxels');
				// TODO
				//voxels.add(config_voxel, 'LOR_clipping');
				voxels.add(config_voxel, 'voxel_transparency', 0, 1).onChange( function ( value ) {
					voxel_material.opacity = config_voxel.voxel_transparency;
				});
				voxels.addColor(config_voxel, 'voxel_color').onChange( function () {
					voxel_material.color.set(config_voxel.voxel_color);
				});
				voxels.add(config_voxel, 'depth_write').onChange( function() {
					voxels_mesh.traverse(function(child) {
						if (child instanceof THREE.Mesh) {
							child.depthWrite = config_voxel.depth_write;
						}
					});
				});
				voxels.add(config_voxel, 'Visible').onChange(function() {
					voxels_mesh.visible = config_voxel.Visible;
				});
				//voxels.open();
				var cylinders = LOR_EPD.addFolder('Cylinders');
				cylinders.add(config_cylinder, 'cylinder_transparency', 0, 1).onChange( function () {
					cylinder_material.opacity = config_cylinder.cylinder_transparency;
				});
				cylinders.add(config_cylinder, 'cylinderRadius', 1, 100 ).name('Radius').onChange( function(newValue) {
					config_cylinder.cylinderRadius = newValue;
					var cylinderGeometry = new THREE.CylinderGeometry(config_cylinder.cylinderRadius, config_cylinder.cylinderRadius, 1, 6, 1);
					cylinders_mesh.geometry.copy(cylinderGeometry);
					cylinders_mesh.geometry.attributes.position.needsUpdate = true;
				});
				cylinders.addColor(config_cylinder, 'cylinder_color').onChange( function () {
					cylinder_material.color.set(config_cylinder.cylinder_color);
				});
				cylinders.add(config_cylinder, 'Visible').onChange(function() {
					cylinders_mesh.visible = config_cylinder.Visible;
				});
				// TODO, change below to make remove_LOR_EPD outside appParams 
				LOR_EPD.add( appParams, 'remove_LOR_EPD').name('Remove LORs').onChange( function( value ){ 
					removeFolderByName(gui, 'LOR End-Point-Detection');
					scene.remove(voxels_mesh);
					scene.remove(cylinders_mesh);
				});
				//cylinders.open();
		
				reader.onload = (event) => {
					const file = event.target.result;
					const allLines = file.split(/\r\n|\n/);
		
					let n_pixelhits=0;
					for (var line = 0; line < allLines.length - 1; line = line + 1) {
						let eventline = allLines[line].toString().indexOf("#");
		
						if (n_pixelhits == 2 && eventline != -1) {
							var point1 = allLines[line - 1].split("\t");
							var point2 = allLines[line - 2].split("\t");
							x1 = Math.round(point1[1] * 10);
							y1 = Math.round(point1[2] * 10);
							z1 = Math.round(point1[3] * 10);
							x2 = Math.round(point2[1] * 10);
							y2 = Math.round(point2[2] * 10);
							z2 = Math.round(point2[3] * 10);
							
							//Bresenham3D(x1, y1, z1, x1, y2, z2, 680, 170, 170, voxels_mesh);
							Bresenham3D(-x1, y1, -z1, -x2, y2, -z2, 680, 170, 170, voxels_mesh);
							drawCylinder(-x1, y1, -z1, -x2, y2, -z2, cylinders_mesh);
						}
						
						if (eventline != -1) // quand il trouve le symbole
						{
							n_pixelhits = 0;
						}
						if (eventline == -1) // quand il trouve pas le symbole
						{
							n_pixelhits = n_pixelhits + 1;
						}
					}
				};
			}
			reader.onerror = (event) => {
				alert(event.target.error.name);
			}
			reader.readAsText(file_generic);
		};

		return () => {
			// Cleanup
			// You may want to remove event listeners or perform other cleanup tasks here
		};
	}, [appParams, params]);
	
	return (
		<div className="App">
			<header className="App-header">
				{/* Replace this part with your Three.js rendering canvas */}
				<canvas ref={canvasRef}></canvas>
	
				{/* HTML elements and buttons */}
				<div>
					<label htmlFor="file_GEN">Open file</label>
					<input type="file" name="file_GEN" id="file_GEN" label="LOR GEN file" />
					<label htmlFor="file_GEN">(Formats supported: 3dm, epd)</label>
				</div>
				<div>
					<button onClick={updateRendererInfo}>Show stats</button>
					<button onClick={setXY}>XY</button>
					<button onClick={setYZ}>YZ</button>
					<button onClick={settYZ}>-YZ</button>
					<button onClick={setZX}>ZX</button>
					<button onClick={set45}>45</button>
				</div>
			</header>
		</div>
	);
}

export default App;
