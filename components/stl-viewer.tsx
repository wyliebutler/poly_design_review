"use client";

import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stage, Html, Line, PerspectiveCamera, Bounds, Grid, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { Suspense, useState, useMemo, useRef, useEffect, memo } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Ruler, MapPin, MousePointer2, Scissors, HelpCircle, Loader2, Box, Layers, Home } from "lucide-react";
import * as THREE from "three";
import type { Comment } from "@prisma/client";
import { ErrorBoundary } from "./error-boundary";

function Model({ 
  url, 
  onLoad, 
  pinMode, 
  pinModeSetter,
  showMeasurements,
  showSlice,
  sliceAmount,
  sliceAxis,
  isDiffMode,
  diffColor,
  modelColor,
  onPointSelected,
  onMeasurePointAdded,
  onSnapPointChange
}: { 
  url: string, 
  onLoad: (dimensions: THREE.Vector3, volume: number, surfaceArea: number, center: THREE.Vector3) => void,
  pinMode: boolean,
  pinModeSetter?: (mode: boolean) => void,
  showMeasurements: boolean,
  showSlice: boolean,
  sliceAmount: number,
  sliceAxis: 'x' | 'y' | 'z',
  isDiffMode?: boolean,
  diffColor?: string,
  modelColor?: string,
  onPointSelected?: (point: THREE.Vector3) => void,
  onMeasurePointAdded?: (point: THREE.Vector3) => void,
  onSnapPointChange?: (point: { position: THREE.Vector3, normal: THREE.Vector3, distance: number } | null) => void
}) {
  const geom = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Isolate onLoad referential changes to purely prevent infinite compute bounding loops.
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useMemo(() => {
    // Forcefully center the geometry to [0,0,0] ignoring original CAD origin
    geom.center();
    geom.computeBoundingBox();
    
    if (geom.boundingBox) {
      const dimensions = new THREE.Vector3();
      geom.boundingBox.getSize(dimensions);
      const center = new THREE.Vector3();
      geom.boundingBox.getCenter(center);

      let vol = 0;
      let area = 0;
      const posAttr = geom.attributes.position;
      
      if (posAttr) {
          const vA = new THREE.Vector3();
          const vB = new THREE.Vector3();
          const vC = new THREE.Vector3();
          const cb = new THREE.Vector3();
          const ab = new THREE.Vector3();
          
          for (let i = 0; i < posAttr.count; i += 3) {
              vA.fromBufferAttribute(posAttr, i);
              vB.fromBufferAttribute(posAttr, i + 1);
              vC.fromBufferAttribute(posAttr, i + 2);
              
              // Surface Area
              cb.subVectors(vC, vB);
              ab.subVectors(vA, vB);
              cb.cross(ab);
              area += cb.length() * 0.5;
              
              // Signed Volume of tetrahedron (origin to triangle)
              vol += vA.dot(new THREE.Vector3().crossVectors(vB, vC)) / 6.0;
          }
      }
      
      const finalVolume = Math.abs(vol);
      const finalArea = area;

      setTimeout(() => {
        if (onLoadRef.current) onLoadRef.current(dimensions, finalVolume, finalArea, center);
      }, 0);
    }
  }, [geom]);

  const clipPlaneObj = useMemo(() => new THREE.Plane(), []);
  const clipPlanes = useMemo(() => [clipPlaneObj], [clipPlaneObj]);

  useFrame(() => {
    if (!geom.boundingBox || !showSlice || !meshRef.current) return;
    
    if (sliceAxis === 'x') {
        const xMax = geom.boundingBox.max.x;
        const xMin = geom.boundingBox.min.x;
        const xRange = xMax - xMin;
        const clipX = xMin + (xRange * (sliceAmount / 100));
        clipPlaneObj.set(new THREE.Vector3(-1, 0, 0), clipX);
    } else if (sliceAxis === 'z') {
        const zMax = geom.boundingBox.max.z;
        const zMin = geom.boundingBox.min.z;
        const zRange = zMax - zMin;
        const clipZ = zMin + (zRange * (sliceAmount / 100));
        clipPlaneObj.set(new THREE.Vector3(0, 0, -1), clipZ);
    } else {
        const yMax = geom.boundingBox.max.y;
        const yMin = geom.boundingBox.min.y;
        const yRange = yMax - yMin;
        const clipY = yMin + (yRange * (sliceAmount / 100));
        clipPlaneObj.set(new THREE.Vector3(0, -1, 0), clipY);
    }
    clipPlaneObj.applyMatrix4(meshRef.current.matrixWorld);
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!showMeasurements) {
      if (onSnapPointChange) onSnapPointChange(null);
      return;
    }

    // Only process if intersecting the mesh
    if (e.intersections.length > 0 && meshRef.current && e.object === meshRef.current) {
      const intersection = e.intersections[0];
      const face = intersection.face;
      const point = intersection.point;

      if (face && geom.attributes.position) {
        // Get vertices of the intersected face
        const posAttr = geom.attributes.position;
        const vA = new THREE.Vector3().fromBufferAttribute(posAttr, face.a);
        const vB = new THREE.Vector3().fromBufferAttribute(posAttr, face.b);
        const vC = new THREE.Vector3().fromBufferAttribute(posAttr, face.c);

        // Transform vertices to world space to compare with intersection point
        vA.applyMatrix4(meshRef.current.matrixWorld);
        vB.applyMatrix4(meshRef.current.matrixWorld);
        vC.applyMatrix4(meshRef.current.matrixWorld);

        // Find the closest vertex
        const distA = point.distanceTo(vA);
        const distB = point.distanceTo(vB);
        const distC = point.distanceTo(vC);

        let closestVertex = vA;
        let minDist = distA;

        if (distB < minDist) {
          closestVertex = vB;
          minDist = distB;
        }
        if (distC < minDist) {
          closestVertex = vC;
          minDist = distC;
        }

        // Snap threshold (adjust as needed, e.g., 1.5 units)
        const snapThreshold = 1.5;

        if (minDist <= snapThreshold) {
           // Convert snapped world point back to local space for consistency with existing logic
           const localSnapPoint = meshRef.current.worldToLocal(closestVertex.clone());
           // Instead of just passing a point, we now pass an object with more info (e.g., normal)
           if (onSnapPointChange) {
             const faceNormal = face.normal.clone().transformDirection(meshRef.current.matrixWorld).normalize();
             onSnapPointChange({
               position: localSnapPoint,
               normal: faceNormal,
               distance: minDist
             });
           }
        } else {
           if (onSnapPointChange) onSnapPointChange(null);
        }
      }
    } else {
      if (onSnapPointChange) onSnapPointChange(null);
    }
  };

  const handlePointerLeave = () => {
    if (onSnapPointChange) onSnapPointChange(null);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!pinMode && !showMeasurements) return;
    
    // Don't register a pin/measure point if they were dragging the camera
    if (e.intersections.length > 0 && meshRef.current && e.object === meshRef.current) {
      e.stopPropagation();

      if (pinMode && onPointSelected) {
        const localPoint = meshRef.current.worldToLocal(e.point.clone());
        onPointSelected(localPoint);
        if (pinModeSetter) pinModeSetter(false);
      } else if (showMeasurements && onMeasurePointAdded) {
        // IF snap is enabled, use it, otherwise fall back to raw point
        // NOTE: we re-calculate snap here briefly to guarantee precision on click
        let finalPoint = meshRef.current.worldToLocal(e.point.clone());
        const intersection = e.intersections[0];
        const face = intersection.face;

        if (face && geom.attributes.position) {
            const posAttr = geom.attributes.position;
            const vA = new THREE.Vector3().fromBufferAttribute(posAttr, face.a);
            const vB = new THREE.Vector3().fromBufferAttribute(posAttr, face.b);
            const vC = new THREE.Vector3().fromBufferAttribute(posAttr, face.c);
            
            vA.applyMatrix4(meshRef.current.matrixWorld);
            vB.applyMatrix4(meshRef.current.matrixWorld);
            vC.applyMatrix4(meshRef.current.matrixWorld);

            const point = intersection.point;
            const distA = point.distanceTo(vA);
            const distB = point.distanceTo(vB);
            const distC = point.distanceTo(vC);

            let closestVertex = vA;
            let minDist = distA;

            if (distB < minDist) { closestVertex = vB; minDist = distB; }
            if (distC < minDist) { closestVertex = vC; minDist = distC; }

            if (minDist <= 1.5) {
                finalPoint = meshRef.current.worldToLocal(closestVertex.clone());
            }
        }
        onMeasurePointAdded(finalPoint);
      }
    }
  };

  return (
    <mesh 
      ref={meshRef}
      geometry={geom} 
      castShadow 
      receiveShadow 
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onPointerDown={(e) => {
        if (pinMode || showMeasurements) e.stopPropagation();
      }}
    >
      <meshStandardMaterial 
        color={isDiffMode ? diffColor : (modelColor || "#5CB892")} 
        roughness={0.4} 
        metalness={0.5} 
        clippingPlanes={showSlice ? clipPlanes : []}
        clipShadows={true}
        side={showSlice ? THREE.DoubleSide : THREE.FrontSide}
        transparent={isDiffMode}
        opacity={isDiffMode ? (diffColor === "#00ff00" ? 0.8 : 0.8) : 1}
        depthWrite={!isDiffMode}
        blending={isDiffMode ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

function CameraAnimator({ target }: { target: { x: number, y: number, z: number } | null }) {
  const { camera, controls } = useThree() as any;
  useEffect(() => {
    if (target && controls) {
      controls.target.set(target.x, target.y, target.z);
      
      const targetVec = new THREE.Vector3(target.x, target.y, target.z);
      const currentPos = camera.position.clone();
      let dir = currentPos.sub(targetVec).normalize();
      
      if (dir.lengthSq() < 0.001) dir.set(1, 1, 1).normalize();
      
      camera.position.copy(targetVec.clone().add(dir.multiplyScalar(6)));
      controls.update();
    }
  }, [target, camera, controls]);
  return null;
}

function AutoFitCamera({ dimensions, center, resetCounter }: { dimensions: THREE.Vector3 | null, center: THREE.Vector3 | null, resetCounter: number }) {
  const { camera, controls } = useThree() as any;
  
  useEffect(() => {
    if (dimensions && center && controls && camera) {
      // Calculate the radius of the bounding sphere (diagonal length / 2)
      const radius = dimensions.length() / 2;
      
      // Calculate required camera distance based on FOV to fit the entire sphere
      const fov = (camera.fov * Math.PI) / 180;
      let cameraZ = Math.abs(radius / Math.sin(fov / 2));
      
      // Accommodate portrait screens by adjusting required distance by aspect ratio
      if (camera.aspect < 1) {
        cameraZ = cameraZ / camera.aspect;
      }
      
      // Add a 1.25x margin so the model doesn't touch the edges of the canvas
      cameraZ *= 1.25; 

      // Set camera to an isometric angle relative to the center origin, preserving exact distance cameraZ
      // Since it's at a 45 degree diagonal across all 3 axes, we divide the hypotenuse by sqrt(3)
      const offset = cameraZ / Math.sqrt(3);
      camera.position.set(center.x + offset, center.y + offset, center.z + offset);
      camera.near = 0.1;
      camera.far = cameraZ * 10;
      
      // Center the orbit controls on the true geometric origin
      controls.target.copy(center);
      
      camera.updateProjectionMatrix();
      controls.update();
    }
  }, [dimensions, camera, controls, resetCounter]);
  
  return null;
}

function FallbackLoader() {
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center justify-center bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-poly-teal-dark animate-spin mb-3" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-800">Loading Revision</span>
        <span className="text-[10px] font-bold text-slate-500 mt-1">Parsing 3D Geometry...</span>
      </div>
    </Html>
  );
}

const StlViewerComponent = ({ 
  url, 
  diffUrl,
  preloadUrls = [],
  comments = [], 
  onPointSelected,
  selectedPoint = null,
  cameraTarget = null,
  modelColor,
  onDeleteComment
}: { 
  url: string,
  diffUrl?: string,
  preloadUrls?: string[],
  comments?: Comment[],
  onPointSelected?: (point: { x: number, y: number, z: number } | null) => void,
  selectedPoint?: { x: number, y: number, z: number } | null,
  cameraTarget?: { x: number, y: number, z: number } | null,
  modelColor?: string,
  onDeleteComment?: (id: string) => Promise<void>
}) => {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showSlice, setShowSlice] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [sliceAmount, setSliceAmount] = useState(100);
  const [sliceAxis, setSliceAxis] = useState<'x' | 'y' | 'z'>('y');
  const [showHelp, setShowHelp] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [dimensions, setDimensions] = useState<THREE.Vector3 | null>(null);
  const [modelCenter, setModelCenter] = useState<THREE.Vector3 | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [surfaceArea, setSurfaceArea] = useState<number | null>(null);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [snapInfo, setSnapInfo] = useState<{ position: THREE.Vector3, normal: THREE.Vector3, distance: number } | null>(null);
  const [resetCameraCount, setResetCameraCount] = useState(0);

  useEffect(() => {
    // 1. Preload new adjacent URLs
    const urlsToPreload = [...preloadUrls];
    if (diffUrl && !urlsToPreload.includes(diffUrl)) {
      urlsToPreload.push(diffUrl);
    }

    urlsToPreload.forEach((preloadUrl) => {
      useLoader.preload(STLLoader, preloadUrl);
    });

    // 2. Clear out old geometries from the cache that are no longer adjacent
    // This prevents Out of Memory (OOM) crashes on devices when viewing many revisions
    if (THREE.Cache.files) {
         Object.keys(THREE.Cache.files).forEach((cachedUrl) => {
             // Don't evict the currently active URL, and don't evict the adjacent ones
             if (cachedUrl !== url && !urlsToPreload.includes(cachedUrl)) {
                 THREE.Cache.remove(cachedUrl);
             }
         });
    }

  }, [preloadUrls, url, diffUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // If they are in a text input (e.g., commenting), do not intercept
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        if (activePin && onDeleteComment) {
          e.preventDefault();
          onDeleteComment(activePin);
          setActivePin(null);
        } else if (showMeasurements && measurePoints.length > 0) {
          e.preventDefault();
          setMeasurePoints(prev => prev.slice(0, -1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePin, onDeleteComment, showMeasurements, measurePoints.length]);

  const handleMeasurePointAdded = (point: THREE.Vector3) => {
    setMeasurePoints((prev) => {
      // If we already have 2 points, reset and start a new measurement with this point
      if (prev.length >= 2) return [point];
      return [...prev, point];
    });
  };

  const measureDistance = measurePoints.length === 2 
    ? measurePoints[0].distanceTo(measurePoints[1]) 
    : 0;
  
  const measureMidpoint = measurePoints.length === 2
    ? new THREE.Vector3().addVectors(measurePoints[0], measurePoints[1]).multiplyScalar(0.5)
    : null;

  if (!url) return null;

  const bgStyle = diffMode ? 'bg-slate-900' : 'bg-slate-100';

  return (
    <div className={`w-full h-full ${bgStyle} relative group ${pinMode || showMeasurements ? 'cursor-crosshair' : ''} transition-colors duration-500`}>
      <ErrorBoundary>
        <Canvas shadows gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }} camera={{ fov: 35 }}>
          <ambientLight intensity={diffMode ? 0.8 : 0.5} />
        <pointLight position={[10, 10, 10]} intensity={diffMode ? 1.5 : 1} castShadow />
        <Suspense fallback={<FallbackLoader />}>
          <Stage environment={diffMode ? "city" : "city"} intensity={0.5} shadows={{ type: "contact", opacity: 0.5, blur: 2 }} adjustCamera={false}>
              <Model 
              url={url} 
              onLoad={(dim, vol, area, center) => {
                setDimensions(dim);
                setVolume(vol);
                setSurfaceArea(area);
                setModelCenter(center);
              }} 
              pinMode={pinMode}
              pinModeSetter={setPinMode}
              showMeasurements={showMeasurements}
              showSlice={showSlice}
              sliceAmount={sliceAmount}
              sliceAxis={sliceAxis}
              isDiffMode={diffMode}
              diffColor="#00ff00" // Green for additions (new model)
              modelColor={modelColor}
              onPointSelected={(p) => onPointSelected?.({ x: p.x, y: p.y, z: p.z })}
              onMeasurePointAdded={handleMeasurePointAdded}
              onSnapPointChange={setSnapInfo}
            />

            {diffMode && diffUrl && (
              <Model 
                url={diffUrl}
                onLoad={() => {}} // Dimensions handled by primary model
                pinMode={false}
                showMeasurements={false}
                showSlice={showSlice}
                sliceAmount={sliceAmount}
                sliceAxis={sliceAxis}
                isDiffMode={true}
                diffColor="#ff0000" // Red for deletions (old model)
              />
            )}
            
            {/* Render Existing Pins */}
            {comments.filter(c => c.x !== null && c.y !== null && c.z !== null).map((comment, idx) => (
              <Html key={comment.id} position={[comment.x as number, comment.y as number, comment.z as number]} center zIndexRange={[100, 0]}>
                <div className="relative group/pin flex items-center justify-center">
                  <div 
                    onClick={(e) => { e.stopPropagation(); setActivePin(activePin === comment.id ? null : comment.id); }}
                    className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform ${activePin === comment.id ? 'bg-poly-teal-dark scale-110' : 'bg-poly-indigo'}`} 
                  >
                    {idx + 1}
                  </div>

                  {activePin === comment.id && (
                    <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 bg-white/95 backdrop-blur rounded-xl p-3 shadow-2xl border border-slate-200 pointer-events-auto z-50 animate-in fade-in slide-in-from-left-2 text-left">
                       <div className="text-[10px] font-black uppercase tracking-widest text-poly-indigo mb-2 flex justify-between items-center border-b border-slate-100 pb-1">
                         {comment.authorName}
                         <button onClick={(e) => { e.stopPropagation(); setActivePin(null); }} className="text-slate-400 hover:text-red-500">×</button>
                       </div>
                       <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{comment.content}</div>
                       <div className="absolute top-1/2 -left-2 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[8px] border-r-white border-opacity-95" />
                    </div>
                  )}
                </div>
              </Html>
            ))}

            {/* Render Selected/Pending Pin */}
            {selectedPoint && (
              <Html position={[selectedPoint.x, selectedPoint.y, selectedPoint.z]} center zIndexRange={[100, 0]}>
                <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
                  <MapPin className="h-5 w-5" />
                </div>
              </Html>
            )}

            {/* Render Measurement Points & Line */}
            {showMeasurements && measurePoints.map((pt, idx) => (
              <Html key={`mp-${idx}`} position={pt} center zIndexRange={[100, 0]}>
                <div className="w-3.5 h-3.5 bg-yellow-500 rounded-full border-2 border-white shadow-sm" />
              </Html>
            ))}

            {/* Render Snap Point Hover Indicator */}
            {showMeasurements && snapInfo && measurePoints.length < 2 && (
              <group position={snapInfo.position}>
                {/* Visual Vertex Highlight - pulse effect based on how close you are to the snap point */}
                <mesh>
                  <sphereGeometry args={[snapInfo.distance < 0.5 ? 0.8 : 0.6, 16, 16]} />
                  <meshBasicMaterial 
                    color="#eab308" 
                    transparent 
                    opacity={snapInfo.distance < 0.5 ? 0.9 : 0.4} 
                    depthTest={false}
                  />
                </mesh>
                <Html center zIndexRange={[100, 0]}>
                  {/* Additional UI feedback showing "Snap" text when very close */}
                  <div className={`transition-all duration-200 flex flex-col items-center pointer-events-none mt-4 ${snapInfo.distance < 0.5 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                    <div className="bg-yellow-500 text-slate-900 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-xl border-2 border-white">
                      Snap Vector
                    </div>
                  </div>
                </Html>
              </group>
            )}

            {showMeasurements && measurePoints.length === 2 && measureMidpoint && (
              <>
                <Line
                  points={[measurePoints[0], measurePoints[1]]}
                  color="#eab308"
                  lineWidth={4}
                  dashed={false}
                />
                <Html position={measureMidpoint} center zIndexRange={[100, 0]}>
                  <div className="bg-yellow-500 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-black shadow-lg border-2 border-white whitespace-nowrap">
                    {measureDistance.toFixed(2)} mm
                  </div>
                </Html>
              </>
            )}

            <Grid 
              position={[0, dimensions ? -(dimensions.y / 2.01) : 0, 0]} 
              infiniteGrid
              args={[200, 200]} 
              cellSize={1} 
              cellThickness={0.5} 
              cellColor="#cbd5e1" 
              sectionSize={5} 
              sectionThickness={1.0} 
              sectionColor="#1B6378" 
              fadeDistance={100} 
              fadeStrength={5} 
            />
          </Stage>
          <OrbitControls 
            makeDefault 
            enablePan={!pinMode} 
            enableRotate={!pinMode} 
            enableZoom={true} 
          />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewcube />
          </GizmoHelper>
          <CameraAnimator target={cameraTarget} />
          {dimensions && modelCenter && <AutoFitCamera dimensions={dimensions} center={modelCenter} resetCounter={resetCameraCount} />}
        </Suspense>
      </Canvas>
    </ErrorBoundary>
    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-50 pointer-events-auto">
        <div className="flex gap-2">
            <button
                onClick={() => setResetCameraCount(c => c + 1)}
                className="p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white text-poly-indigo"
                title="Reset View"
            >
                <Home className="h-4 w-4" />
                Home
            </button>
            <button
                onClick={() => setShowHelp(true)}
                className="p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white"
                title="Help / Controls"
            >
                <HelpCircle className="h-4 w-4" />
                Help
            </button>
            {diffUrl && (
              <button
                  onClick={() => {
                    setDiffMode(!diffMode);
                    if (!diffMode) {
                      setPinMode(false);
                      setShowMeasurements(false);
                      setShowSlice(false);
                    }
                  }}
                  className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${
                    diffMode 
                    ? "bg-slate-900 text-white border-slate-700 hover:bg-slate-800" 
                    : "bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white"
                  }`}
                  title="Toggle Visual Overlap Diff"
              >
                  <Layers className="h-4 w-4" />
                  Diff
              </button>
            )}
            <button
                onClick={() => {
                  setPinMode(!pinMode);
                  if (!pinMode) {
                    setShowMeasurements(false);
                    setShowSlice(false);
                  }
                }}
                className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${
                  pinMode 
                  ? "bg-poly-indigo text-white border-poly-indigo" 
                  : "bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white"
                }`}
                title="Toggle Pin Mode"
            >
                <MapPin className="h-4 w-4" />
                Drop Pin
            </button>
            <button
                onClick={() => {
                  setShowMeasurements(!showMeasurements);
                  if (!showMeasurements) {
                    setPinMode(false);
                    setShowSlice(false);
                  } else {
                    setMeasurePoints([]); // Clear points when turning off
                  }
                }}
                className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${
                  showMeasurements 
                  ? "bg-poly-teal-dark text-white border-poly-teal-dark" 
                  : "bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white"
                }`}
                title="Toggle Measurements"
            >
                <Ruler className="h-4 w-4" />
                Measure
            </button>
            <button
                onClick={() => {
                  setShowSlice(!showSlice);
                  if (!showSlice) {
                    setPinMode(false);
                    setShowMeasurements(false);
                    // allow diff mode to stay on while slicing to see internal diffs!
                  }
                }}
                className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${
                  showSlice 
                  ? "bg-slate-800 text-white border-slate-800" 
                  : "bg-white/90 backdrop-blur border-slate-200 text-slate-500 hover:bg-white"
                }`}
                title="Toggle Slice / Cross-Section"
            >
                <Scissors className="h-4 w-4" />
                Slice
            </button>
        </div>

        <div className={`pointer-events-none transition-opacity duration-300 ${pinMode || showMeasurements ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-xl shadow-lg shadow-slate-200/50 text-[10px] uppercase font-black tracking-widest text-slate-500 flex flex-col items-end gap-2">
              {showMeasurements && (
                <div className="text-poly-teal-dark flex items-center gap-2 bg-poly-teal-light/20 px-2 py-1 rounded">
                  <Ruler className="h-3 w-3" />
                  {measurePoints.length === 0 ? "Click 1st point to measure" : measurePoints.length === 1 ? "Click 2nd point to measure" : "Click to start new measurement"}
                </div>
              )}
              {pinMode && (
                <div className="text-poly-indigo flex items-center gap-2 bg-poly-indigo/10 px-2 py-1 rounded">
                  <MapPin className="h-3 w-3" />
                  Click model to drop a pin
                </div>
              )}
              {diffMode && (
                <div className="text-white flex items-center gap-2 bg-slate-900 px-2 py-1 rounded">
                  <Layers className="h-3 w-3" />
                  <span className="text-[#00ff00] mr-1 drop-shadow-sm font-bold">Green:</span> Additions 
                  <span className="text-[#ff0000] mx-1 drop-shadow-sm font-bold">Red:</span> Deletions
                  <span className="text-yellow-500 ml-1 font-bold">Yellow:</span> Overlap
                </div>
              )}
              {showSlice && (
                <div className="text-slate-800 flex items-center gap-2 bg-slate-800/10 px-2 py-1 rounded">
                  <Scissors className="h-3 w-3" />
                  Use slider below to slice model
                </div>
              )}
              <div className="flex gap-4">
                  <span className="flex items-center gap-1"><span className="text-slate-800">LEFT CLICK</span> ROTATE</span>
                  <span className="flex items-center gap-1"><span className="text-slate-800">RIGHT CLICK</span> PAN</span>
                  <span className="flex items-center gap-1"><span className="text-slate-800">SCROLL</span> ZOOM</span>
              </div>
            </div>
        </div>
      </div>

      {showMeasurements && dimensions && (
          <div className="absolute bottom-4 right-4 pointer-events-none fade-in slide-in-from-bottom-2 animate-in z-50">
              <div className="bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-xl space-y-2">
                  <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-800 border-b border-slate-100 pb-2 mb-2">
                      Dimensions
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest uppercase mb-3">
                      <span className="text-slate-500">Width (X)</span>
                      <span className="text-poly-teal-dark text-right">{dimensions.x.toFixed(2)} mm</span>
                      
                      <span className="text-slate-500">Depth (Y)</span>
                      <span className="text-poly-teal-dark text-right">{dimensions.y.toFixed(2)} mm</span>
                      
                      <span className="text-slate-500">Height (Z)</span>
                      <span className="text-poly-teal-dark text-right">{dimensions.z.toFixed(2)} mm</span>
                  </div>
                  
                  {volume !== null && surfaceArea !== null && (
                      <>
                          <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-800 border-b border-slate-100 pb-2 mb-2">
                              Properties
                          </h3>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-bold tracking-widest uppercase">
                              <span className="text-slate-500">Volume</span>
                              <span className="text-poly-indigo text-right">{(volume / 1000).toFixed(2)} cm³</span>
                              
                              <span className="text-slate-500">Surface Area</span>
                              <span className="text-poly-indigo text-right">{(surfaceArea / 100).toFixed(2)} cm²</span>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Slice Slider Overlay */}
      {showSlice && (
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-xl space-y-4 w-72">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Cross-Section</span>
                    <span className="text-slate-800">{sliceAmount}%</span>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => setSliceAxis('x')} 
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors border ${sliceAxis === 'x' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        X Axis
                    </button>
                    <button 
                        onClick={() => setSliceAxis('y')} 
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors border ${sliceAxis === 'y' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        Y Axis
                    </button>
                    <button 
                        onClick={() => setSliceAxis('z')} 
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors border ${sliceAxis === 'z' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        Z Axis
                    </button>
                </div>

                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={sliceAmount} 
                    onChange={(e) => setSliceAmount(Number(e.target.value))}
                    className="w-full accent-slate-800"
                />
            </div>
         </div>
      )}
      {/* Help Modal */}
      {showHelp && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-auto p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                          <HelpCircle className="h-5 w-5 text-poly-teal-dark" />
                          Viewer Controls
                      </h2>
                      <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          ×
                      </button>
                  </div>
                  <div className="p-6 space-y-6 text-sm text-slate-600">
                      <p>Welcome to the 3D Design Review! Use the tools below to interact with the model:</p>
                      
                      <ul className="space-y-4">
                          <li className="flex gap-3">
                              <MousePointer2 className="h-5 w-5 text-slate-400 shrink-0" />
                              <div>
                                  <strong className="block text-slate-800 truncate">Navigation</strong>
                                  <span className="text-slate-500 flex flex-wrap gap-2 mt-2">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold">LEFT CLICK + DRAG</span> Rotate
                                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold">RIGHT CLICK + DRAG</span> Pan
                                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold">SCROLL</span> Zoom
                                  </span>
                              </div>
                          </li>
                          <li className="flex gap-3">
                              <MapPin className="h-5 w-5 text-poly-indigo shrink-0" />
                              <div>
                                  <strong className="block text-poly-indigo">Drop a Pin and Attach Files</strong>
                                  Click "Drop Pin" then click anywhere on the model to attach a localized comment or feedback. You can optionally capture snapshots or attach files (PDF, DOCX, PNG, JPG) to provide more context. Click on an attached image to zoom in, or click on a document to download/preview it.
                              </div>
                          </li>
                          <li className="flex gap-3">
                              <Ruler className="h-5 w-5 text-poly-teal-dark shrink-0" />
                              <div>
                                  <strong className="block text-poly-teal-dark">Measure</strong>
                                  Click "Measure" then select two points to calculate their exact geometric distance.
                              </div>
                          </li>
                          <li className="flex gap-3">
                              <Scissors className="h-5 w-5 text-slate-800 shrink-0" />
                              <div>
                                  <strong className="block text-slate-800">Cross-Section Slice</strong>
                                  Click "Slice" and use the X/Y/Z buttons to choose an axis, then use the slider to dynamically cut through the model and inspect its interior.
                              </div>
                          </li>
                          <li className="flex gap-3">
                              <Layers className="h-5 w-5 text-slate-900 shrink-0" />
                              <div>
                                  <strong className="block text-slate-900">Diff Viewer</strong>
                                  If a previous revision exists, click "Diff" to see a visual comparison. <strong className="text-[#00ff00]">Green</strong> indicates new geometry, <strong className="text-[#ff0000]">Red</strong> indicates deleted geometry, and <strong className="text-yellow-500">Yellow</strong> indicates unchanged, overlapping geometry.
                              </div>
                          </li>
                      </ul>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                          onClick={() => setShowHelp(false)}
                          className="bg-poly-teal-dark text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-lg transition-all"
                      >
                          Got It!
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default memo(StlViewerComponent, (prevProps, nextProps) => {
  if (prevProps.url !== nextProps.url) return false;
  
  if (prevProps.comments?.length !== nextProps.comments?.length) return false;
  
  // Custom deep equality checks for React objects
  if (prevProps.selectedPoint?.x !== nextProps.selectedPoint?.x) return false;
  if (prevProps.selectedPoint?.y !== nextProps.selectedPoint?.y) return false;
  if (prevProps.selectedPoint?.z !== nextProps.selectedPoint?.z) return false;
  
  if (prevProps.cameraTarget?.x !== nextProps.cameraTarget?.x) return false;
  if (prevProps.cameraTarget?.y !== nextProps.cameraTarget?.y) return false;
  if (prevProps.cameraTarget?.z !== nextProps.cameraTarget?.z) return false;
  
  return true;
});
