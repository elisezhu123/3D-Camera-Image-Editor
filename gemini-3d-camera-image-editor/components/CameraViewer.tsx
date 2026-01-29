
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { CameraSettings } from '../types';

// Fix: Defining Three.js elements as PascalCase components to bypass JSX intrinsic element errors
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const DirectionalLight = 'directionalLight' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const RingGeometry = 'ringGeometry' as any;
const SphereGeometry = 'sphereGeometry' as any;
const Color = 'color' as any;

interface CameraViewerProps {
  settings: CameraSettings;
  onSettingsChange: (settings: CameraSettings) => void;
  inputImage: string | null;
}

const VISUAL_SCALE = 2.5;

const CameraHandle = ({ position, quaternion, isDragging, onPointerDown }: any) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered || isDragging);

  return (
    <Group 
      position={position} 
      quaternion={quaternion} 
      onPointerOver={() => setHover(true)} 
      onPointerOut={() => setHover(false)}
      onPointerDown={onPointerDown}
    >
      {/* 摄像机主体 */}
      <Mesh castShadow>
        <BoxGeometry args={[0.28, 0.28, 0.48]} />
        <MeshStandardMaterial 
          color="#ffffff" 
          metalness={0.1}
          roughness={0.2}
          emissive={isDragging ? "#6366f1" : hovered ? "#f1f5f9" : "#ffffff"}
          emissiveIntensity={isDragging ? 0.2 : 0}
        />
      </Mesh>
      
      {/* 侧面装饰 */}
      <Mesh position={[0.15, 0, 0]}>
        <BoxGeometry args={[0.02, 0.12, 0.25]} />
        <MeshStandardMaterial color="#e2e8f0" />
      </Mesh>
      <Mesh position={[-0.15, 0, 0]}>
        <BoxGeometry args={[0.02, 0.12, 0.25]} />
        <MeshStandardMaterial color="#e2e8f0" />
      </Mesh>

      {/* 镜头筒 - 指向 Z 轴负方向 */}
      <Mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <CylinderGeometry args={[0.1, 0.13, 0.12, 32]} />
        <MeshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </Mesh>
      
      {/* 镜头光圈发光 */}
      <Mesh position={[0, 0, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <CylinderGeometry args={[0.09, 0.09, 0.01, 32]} />
        <MeshStandardMaterial 
          color="#4f46e5" 
          emissive="#4f46e5" 
          emissiveIntensity={1.5} 
          transparent 
          opacity={0.8} 
        />
      </Mesh>
    </Group>
  );
};

const InteractiveScene = ({ settings, onSettingsChange, inputImage }: CameraViewerProps) => {
  const { azimuth, elevation, distance } = settings;
  const { camera, raycaster, mouse } = useThree();
  const [dragMode, setDragMode] = useState<'none' | 'orbit' | 'distance'>('none');

  const phi = (90 - elevation) * (Math.PI / 180);
  const theta = (azimuth) * (Math.PI / 180);
  const radius = distance * VISUAL_SCALE;

  // 计算摄像机在球面上的位置
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);

  const cameraPos = new THREE.Vector3(x, y, z);
  
  // 使用 lookAt 矩阵计算旋转四元数，确保摄像机模型始终精准对准原点 [0,0,0]
  const cameraQuat = useMemo(() => {
    const m = new THREE.Matrix4();
    // 摄像机位于 cameraPos，看向 [0,0,0]，上方向为 [0,1,0]
    m.lookAt(cameraPos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [x, y, z]);

  const handlePointerMove = (e: any) => {
    if (dragMode === 'none') return;
    e.stopPropagation();

    if (dragMode === 'orbit') {
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius);
      const target = new THREE.Vector3();
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectSphere(sphere, target);

      if (target.length() > 0) {
        const r = target.length();
        const newPhi = Math.acos(THREE.MathUtils.clamp(target.y / r, -1, 1));
        const newTheta = Math.atan2(target.x, target.z);

        let newElev = 90 - (newPhi * 180 / Math.PI);
        let newAzim = (newTheta * 180 / Math.PI);
        if (newAzim < 0) newAzim += 360;

        onSettingsChange({
          ...settings,
          azimuth: Math.round(newAzim) % 360,
          elevation: THREE.MathUtils.clamp(Math.round(newElev), -30, 60)
        });
      }
    } else if (dragMode === 'distance') {
      raycaster.setFromCamera(mouse, camera);
      const currentDir = cameraPos.clone().normalize();
      const rayDir = raycaster.ray.direction;
      const rayOrigin = raycaster.ray.origin;
      const dot = rayDir.dot(currentDir);
      const t = rayOrigin.clone().negate().dot(currentDir.clone().sub(rayDir.clone().multiplyScalar(dot))) / (1 - dot * dot);
      const newRadius = THREE.MathUtils.clamp(cameraPos.clone().add(currentDir.multiplyScalar(t)).length() / VISUAL_SCALE, 0.6, 1.4);
      onSettingsChange({ ...settings, distance: newRadius });
    }
  };

  const texture = useMemo(() => {
    if (!inputImage) return null;
    return new THREE.TextureLoader().load(inputImage);
  }, [inputImage]);

  return (
    <Group onPointerMove={handlePointerMove} onPointerUp={() => setDragMode('none')} onPointerLeave={() => setDragMode('none')}>
      <AmbientLight intensity={1.5} />
      <PointLight position={[10, 10, 10]} intensity={2} />
      <DirectionalLight position={[-5, 5, 5]} intensity={0.8} />
      
      {/* 灰色中心画布 */}
      <Mesh>
        <PlaneGeometry args={[2.5, 2.5]} />
        <MeshBasicMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </Mesh>

      <Mesh>
        <PlaneGeometry args={[2.5, 2.5]} />
        {texture ? (
          <MeshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
        ) : (
          <MeshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.5} />
        )}
      </Mesh>

      {/* 偏航轨道 - 蓝色 */}
      <Mesh rotation={[Math.PI / 2, 0, 0]}>
        <RingGeometry args={[radius - 0.015, radius + 0.015, 128]} />
        <MeshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
      </Mesh>
      
      {/* 俯仰轨道 - 保持粉色做交互引导 */}
      <Group rotation={[0, theta, 0]}>
        <Mesh rotation={[0, -Math.PI / 2, 0]}>
          <RingGeometry args={[radius - 0.015, radius + 0.015, 64, 1, -Math.PI/6, Math.PI/2]} />
          <MeshBasicMaterial color="#ec4899" transparent opacity={0.3} side={THREE.DoubleSide} />
        </Mesh>
      </Group>

      <CameraHandle 
        position={cameraPos.toArray()} 
        quaternion={cameraQuat} 
        isDragging={dragMode === 'orbit'}
        onPointerDown={(e: any) => { e.stopPropagation(); setDragMode('orbit'); }}
      />

      <Mesh 
        position={cameraPos.clone().multiplyScalar(0.7)}
        onPointerDown={(e: any) => { e.stopPropagation(); setDragMode('distance'); }}
      >
        <SphereGeometry args={[0.08, 32, 32]} />
        <MeshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={1.5} />
      </Mesh>

      <Grid infiniteGrid fadeDistance={40} sectionColor="#f1f5f9" cellColor="#f8fafc" sectionThickness={1} cellThickness={0.5} />
      <OrbitControls makeDefault enabled={dragMode === 'none'} minDistance={2} maxDistance={15} target={[0,0,0]} />
    </Group>
  );
};

const CameraViewer: React.FC<CameraViewerProps> = (props) => {
  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 35 }}>
        <Color attach="background" args={['#ffffff']} />
        <InteractiveScene {...props} />
      </Canvas>
      
      {/* 视角轨道与焦点按钮 - 往下移动（从 top-8 改为 top-14） */}
      <div className="absolute top-14 left-8 flex flex-col gap-3 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-blue-100 text-[9px] font-black text-blue-500 flex items-center gap-3 shadow-sm uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div> 视角轨道
        </div>
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 text-[9px] font-black text-indigo-500 flex items-center gap-3 shadow-sm uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div> 焦点同步
        </div>
      </div>
    </div>
  );
};

export const generatePrompt = (settings: CameraSettings): string => {
  const { azimuth, elevation, distance, shotType } = settings;
  const yaw = azimuth;
  const pitch = elevation;
  
  let horizontalDesc = "";
  if (yaw >= 337.5 || yaw < 22.5) horizontalDesc = "Front view (0°)";
  else if (yaw >= 22.5 && yaw < 67.5) horizontalDesc = "Front-right 45° angle";
  else if (yaw >= 67.5 && yaw < 112.5) horizontalDesc = "Right side 90° profile";
  else if (yaw >= 112.5 && yaw < 157.5) horizontalDesc = "Rear-right 135° angle";
  else if (yaw >= 157.5 && yaw < 202.5) horizontalDesc = "Back view 180°";
  else if (yaw >= 202.5 && yaw < 247.5) horizontalDesc = "Rear-left 225° angle";
  else if (yaw >= 247.5 && yaw < 292.5) horizontalDesc = "Left side 270° profile";
  else horizontalDesc = "Front-left 315° angle";

  let verticalDesc = "";
  if (pitch > 45) verticalDesc = "Bird's eye view (High overhead)";
  else if (pitch > 15) verticalDesc = "High angle shot looking down";
  else if (pitch < -15) verticalDesc = "Low angle hero shot looking up";
  else verticalDesc = "Eye-level horizontal view";

  let shotDesc = "";
  switch(shotType) {
    case 'long': shotDesc = "Wide shot showing more context"; break;
    case 'medium': shotDesc = "Medium shot, standard framing"; break;
    case 'close': shotDesc = "Close-up shot focusing on detail"; break;
    case 'extreme': shotDesc = "Extreme close-up macro detail"; break;
  }

  return `Product photography, Camera Yaw: ${yaw} degrees, Camera Pitch: ${pitch} degrees. ${horizontalDesc}, ${verticalDesc}, ${shotDesc}. Pure white solid background, high-end studio lighting, sharp focus, volumetric lighting, spatial consistency.`;
};

export default CameraViewer;
