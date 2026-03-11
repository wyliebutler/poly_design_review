import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/**
 * Synchronous/Main-Thread 3D Thumbnail Extractor
 * Uses OffscreenCanvas (or falls back to DOM canvas) to quickly render a 
 * thumbnail of the given STL file string without relying on Web Workers, 
 * which often have bundler and deployment issues.
 */
export async function extractStlThumbnail(stlFile: File, width = 400, height = 300): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const blobUrl = URL.createObjectURL(stlFile);
      const fileExtension = stlFile.name.split('.').pop() || 'stl';
      const baseName = stlFile.name.replace(`.${fileExtension}`, '');

      // Check if OffscreenCanvas is supported, otherwise create a hidden DOM canvas
      let canvas: HTMLCanvasElement | OffscreenCanvas;
      if (typeof OffscreenCanvas !== "undefined") {
        canvas = new OffscreenCanvas(width, height);
      } else {
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
      }

      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: false, 
        antialias: true, 
        preserveDrawingBuffer: true 
      });
      renderer.setSize(width, height);
      renderer.setClearColor("#f0fdf4");

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 20, 10);
      scene.add(dirLight);

      const loader = new STLLoader();

      loader.load(
        blobUrl,
        async (geometry) => {
          try {
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            
            if (!geometry.boundingBox || !geometry.boundingSphere) {
              URL.revokeObjectURL(blobUrl);
              resolve(null);
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

            renderer.render(scene, camera);

            let blob: Blob | null = null;
            if (canvas instanceof HTMLCanvasElement) {
              blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png", 0.9));
            } else {
              blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/png", quality: 0.9 });
            }

            renderer.dispose();
            geometry.dispose();
            material.dispose();
            URL.revokeObjectURL(blobUrl);

            if (blob) {
              const fileName = `${baseName}_thumb.png`;
              const thumbFile = new File([blob], fileName, { type: "image/png" });
              resolve(thumbFile);
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error("Error during rendering in extractor:", e);
            URL.revokeObjectURL(blobUrl);
            renderer.dispose();
            resolve(null);
          }
        },
        undefined,
        (error) => {
          console.error("Main thread extraction failed to load STL:", error);
          URL.revokeObjectURL(blobUrl);
          renderer.dispose();
          resolve(null);
        }
      );
    } catch (e) {
      console.error("Fatal error inside thumbnail extractor:", e);
      resolve(null);
    }
  });
}
