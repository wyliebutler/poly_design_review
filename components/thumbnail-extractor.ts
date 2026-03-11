"use client";

/**
 * Asynchronous 3D Thumbnail Extractor Interface
 * Instantiates a Web Worker to offload STL parsing and WebGL rendering
 * off the main UI thread to prevent UI lockups on massive STL files.
 */
export async function extractStlThumbnail(stlFile: File, width = 400, height = 300): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const worker = new Worker(new URL('./thumbnail.worker.ts', import.meta.url), { type: 'module' });
      const blobUrl = URL.createObjectURL(stlFile);
      const fileExtension = stlFile.name.split('.').pop() || 'stl';
      const baseName = stlFile.name.replace(`.${fileExtension}`, '');

      worker.onmessage = (e) => {
        URL.revokeObjectURL(blobUrl);
        worker.terminate();

        const { success, blob, fileName } = e.data;
        if (success && blob) {
          const thumbFile = new File([blob], fileName, { type: "image/png" });
          resolve(thumbFile);
        } else {
          resolve(null);
        }
      };

      worker.onerror = (err) => {
        console.error("Web worker error:", err);
        URL.revokeObjectURL(blobUrl);
        worker.terminate();
        resolve(null);
      };

      worker.postMessage({ 
        blobUrl, 
        width, 
        height, 
        fileName: baseName 
      });

    } catch (e) {
      console.error("Fatal error initiating thumbnail worker:", e);
      resolve(null);
    }
  });
}
