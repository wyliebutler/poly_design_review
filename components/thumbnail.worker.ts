import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// Handle incoming messages from the main thread
self.onmessage = async (e: MessageEvent) => {
  const { blobUrl, width, height, fileName } = e.data;
  
  if (!blobUrl || !width || !height) return;

  try {
    // 1. Create offscreen canvas
    const canvas = new OffscreenCanvas(width, height);

    // 2. Setup WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setClearColor("#f0fdf4");

    // 3. Setup Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    
    // 4. Setup Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. Load the STL from the blobUrl
    const loader = new STLLoader();

    loader.load(
      blobUrl,
      async (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        
        if (!geometry.boundingBox || !geometry.boundingSphere) {
           self.postMessage({ success: false });
           return;
        }

        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        const radius = geometry.boundingSphere.radius;
        const scale = 1.5 / radius;
        geometry.scale(scale, scale, scale);

        const material = new THREE.MeshStandardMaterial({ 
          color: "#5CB892", 
          roughness: 0.4, 
          metalness: 0.5 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 4;
        mesh.rotation.z = Math.PI / 6;
        
        scene.add(mesh);

        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);

        // 6. Render
        renderer.render(scene, camera);

        // 7. Extract Blob
        const blob = await canvas.convertToBlob({ type: "image/png", quality: 0.9 });
        
        renderer.dispose();
        geometry.dispose();
        material.dispose();

        self.postMessage({ success: true, blob, fileName: `${fileName}_thumb.png` });
      },
      undefined,
      (error) => {
        console.error("Worker extraction failed:", error);
        renderer.dispose();
        self.postMessage({ success: false });
      }
    );
  } catch (err) {
    console.error("Worker fatal error:", err);
    self.postMessage({ success: false });
  }
};
