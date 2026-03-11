"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Stage, Center } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

function Model({ url }: { url: string }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const geometry = useLoader(STLLoader, url);

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial color="#5CB892" roughness={0.4} metalness={0.5} />
        </mesh>
    );
}

export default function Thumbnail({ url }: { url: string }) {
    if (!url) return null;

    return (
        <div className="w-full h-full bg-transparent overflow-hidden">
            <Canvas
                shadows
                camera={{ position: [0, 0, 5], fov: 40 }}
                gl={{ antialias: true, alpha: false }}
            >
                <color attach="background" args={['#f0fdf4']} />
                <Suspense fallback={null}>
                    <Stage
                        intensity={0.5}
                        environment="city"
                        adjustCamera={1.5}
                        shadows={false}
                    >
                        <Center>
                            <Model url={url} />
                        </Center>
                    </Stage>
                </Suspense>
            </Canvas>
        </div>
    );
}
