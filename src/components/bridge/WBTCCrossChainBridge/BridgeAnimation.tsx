'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface BridgeAnimationProps {
  isActive: boolean;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  status: 'idle' | 'locking' | 'bridging' | 'completed' | 'failed';
}

export default function BridgeAnimation({
  isActive,
  fromChain,
  toChain,
  fromToken,
  toToken,
  status
}: BridgeAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!mountRef.current || isInitialized) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Create chain platforms
    const createChainPlatform = (x: number, color: number, name: string) => {
      const geometry = new THREE.BoxGeometry(2, 0.2, 1);
      const material = new THREE.MeshPhongMaterial({ color });
      const platform = new THREE.Mesh(geometry, material);
      platform.position.set(x, -1, 0);
      platform.userData = { name };
      scene.add(platform);

      // Add chain label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = '#ffffff';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(name, 128, 40);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const labelGeometry = new THREE.PlaneGeometry(1.5, 0.3);
      const labelMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true 
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(x, -0.5, 0.6);
      scene.add(label);

      return platform;
    };

    // Create token spheres
    const createTokenSphere = (x: number, y: number, color: number, symbol: string) => {
      const geometry = new THREE.SphereGeometry(0.2, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color,
        emissive: color,
        emissiveIntensity: 0.2
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, 0);
      sphere.userData = { symbol, originalY: y };
      scene.add(sphere);

      // Add token symbol
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 64;
        canvas.height = 64;
        context.fillStyle = '#ffffff';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText(symbol, 32, 40);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const labelGeometry = new THREE.PlaneGeometry(0.4, 0.4);
      const labelMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true 
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(x, y + 0.3, 0.1);
      scene.add(label);

      return sphere;
    };

    // Create HTLC lock visualization
    const createHTLCLock = (x: number, y: number) => {
      const lockGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.2);
      const lockMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b35,
        emissive: 0xff6b35,
        emissiveIntensity: 0.3
      });
      const lock = new THREE.Mesh(lockGeometry, lockMaterial);
      lock.position.set(x, y, 0);
      lock.userData = { type: 'htlc' };
      scene.add(lock);

      // Add lock icon
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 64;
        canvas.height = 64;
        context.fillStyle = '#ffffff';
        context.font = '20px Arial';
        context.textAlign = 'center';
        context.fillText('🔒', 32, 40);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const iconGeometry = new THREE.PlaneGeometry(0.2, 0.2);
      const iconMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true 
      });
      const icon = new THREE.Mesh(iconGeometry, iconMaterial);
      icon.position.set(x, y + 0.3, 0.15);
      scene.add(icon);

      return lock;
    };

    // Create bridge path
    const createBridgePath = () => {
      const points = [
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(2, 0, 0)
      ];
      const curve = new THREE.CubicBezierCurve3(...points);
      const geometry = new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x4a90e2,
        transparent: true,
        opacity: 0.6
      });
      const tube = new THREE.Mesh(geometry, material);
      scene.add(tube);
      return tube;
    };

    // Initialize scene objects
    const fromPlatform = createChainPlatform(-2, 0x627eea, fromChain);
    const toPlatform = createChainPlatform(2, 0x8247e5, toChain);
    const fromTokenSphere = createTokenSphere(-2, 0, 0x627eea, fromToken);
    const toTokenSphere = createTokenSphere(2, 0, 0x8247e5, toToken);
    const bridgePath = createBridgePath();
    const htlcLock = createHTLCLock(0, 0.5);

    // Animation variables
    let time = 0;
    let bridgeProgress = 0;
    let lockIntensity = 0;

    // Animation loop
    const animate = () => {
      time += 0.016;
      
      // Rotate platforms
      fromPlatform.rotation.y = Math.sin(time * 0.5) * 0.1;
      toPlatform.rotation.y = Math.sin(time * 0.5 + Math.PI) * 0.1;

      // Token animations based on status
      if (status === 'locking') {
        // Tokens move to center and lock
        const lockProgress = Math.min(1, (time * 2) % 2);
        fromTokenSphere.position.x = THREE.MathUtils.lerp(-2, 0, lockProgress);
        fromTokenSphere.position.y = THREE.MathUtils.lerp(0, 0.5, lockProgress);
        
        if (lockProgress > 0.5) {
          lockIntensity = Math.min(1, (lockProgress - 0.5) * 2);
          htlcLock.material.emissiveIntensity = lockIntensity * 0.5;
        }
      } else if (status === 'bridging') {
        // Tokens move along bridge path
        bridgeProgress = Math.min(1, (time * 0.5) % 2);
        const t = bridgeProgress;
        fromTokenSphere.position.x = THREE.MathUtils.lerp(0, 2, t);
        fromTokenSphere.position.y = Math.sin(t * Math.PI) * 1;
        
        // Pulse the bridge path
        bridgePath.material.opacity = 0.3 + Math.sin(time * 4) * 0.3;
      } else if (status === 'completed') {
        // Tokens settle in destination
        fromTokenSphere.position.x = 2;
        fromTokenSphere.position.y = 0;
        toTokenSphere.material.emissiveIntensity = 0.5;
        htlcLock.material.color.setHex(0x00ff00);
      } else if (status === 'failed') {
        // Tokens return to source
        fromTokenSphere.position.x = -2;
        fromTokenSphere.position.y = 0;
        htlcLock.material.color.setHex(0xff0000);
      }

      // Rotate tokens
      fromTokenSphere.rotation.y += 0.02;
      toTokenSphere.rotation.y += 0.02;
      htlcLock.rotation.y += 0.01;

      // Camera movement
      camera.position.x = Math.sin(time * 0.2) * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    setIsInitialized(true);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [isInitialized, fromChain, toChain, fromToken, toToken]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && rendererRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Bridge Animation
          </h3>
          <p className="text-sm text-gray-400">
            {status === 'locking' && 'Locking tokens in HTLC...'}
            {status === 'bridging' && 'Bridging tokens across chains...'}
            {status === 'completed' && 'Bridge completed successfully!'}
            {status === 'failed' && 'Bridge failed - tokens returned'}
          </p>
        </div>
        
        <div 
          ref={mountRef} 
          className="w-full h-64 rounded-lg overflow-hidden bg-gray-900"
        />
        
        <div className="mt-4 text-center">
          <div className="flex justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">{fromChain}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">{toChain}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 