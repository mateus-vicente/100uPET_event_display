import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Create a cube and add it to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Position the camera
    camera.position.z = 5;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      // Rotate the cube
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      // Render the scene
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      // Cleanup
      // You may want to remove event listeners or perform other cleanup tasks here
    };
  }, []);

  return (
    <div ref={mountRef} />
  );
}

export default App;
