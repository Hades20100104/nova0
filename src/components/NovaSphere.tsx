"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial, Stars, Html, Trail, Float } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { NOVA_MODULES } from "@/lib/modules";

// energy mapping per active module (boosts bloom / autoRotate / distortion)
const ENERGY: Record<string, number> = {
  home: 1.0, conversacion: 0.85, musica: 1.7, imagenes: 1.4,
  documentos: 0.9, memoria: 1.2, automatizaciones: 1.5, calendario: 1.0,
  whatsapp: 1.0, finanzas: 1.0, ajustes: 0.8,
};

function useDeviceQuality() {
  const [q, setQ] = useState<"low" | "high">("high");
  useEffect(() => {
    const mob = window.matchMedia("(max-width: 768px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setQ(mob || reduced ? "low" : "high");
  }, []);
  return q;
}

/* ----------------------- PLASMA CORE ----------------------- */
function PlasmaCore() {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const wire1 = useRef<THREE.Mesh>(null);
  const wire2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (core.current) {
      core.current.rotation.y = t * 0.25;
      core.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    }
    if (halo.current) {
      halo.current.rotation.y = -t * 0.12;
      halo.current.rotation.z = t * 0.08;
      const s = 1 + Math.sin(t * 1.4) * 0.025;
      halo.current.scale.set(s, s, s);
    }
    if (wire1.current) wire1.current.rotation.y = t * 0.18;
    if (wire2.current) {
      wire2.current.rotation.y = -t * 0.22;
      wire2.current.rotation.x = t * 0.14;
    }
  });

  return (
    <group>
      {/* white-hot inner sun */}
      <Sphere args={[0.55, 64, 64]}>
        <meshBasicMaterial color="#ffe6ff" />
      </Sphere>
      {/* magenta plasma shell */}
      <Sphere ref={core} args={[1.05, 128, 128]}>
        <MeshDistortMaterial
          color="#b026ff"
          emissive="#ff3df0"
          emissiveIntensity={2.2}
          distort={0.62}
          speed={2.1}
          roughness={0.05}
          metalness={0.6}
        />
      </Sphere>
      {/* secondary morphing layer */}
      <Sphere ref={halo} args={[1.35, 96, 96]}>
        <MeshDistortMaterial
          color="#ff4ff0"
          emissive="#c026ff"
          emissiveIntensity={1.4}
          distort={0.48}
          speed={1.3}
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.55}
        />
      </Sphere>
      {/* electric wireframes */}
      <Sphere ref={wire1} args={[1.78, 32, 32]}>
        <meshBasicMaterial color="#ff7ef9" wireframe transparent opacity={0.22} />
      </Sphere>
      <Sphere ref={wire2} args={[2.1, 18, 18]}>
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.12} />
      </Sphere>
      {/* outer glow shell */}
      <Sphere args={[2.45, 32, 32]}>
        <meshBasicMaterial color="#ff4ff0" transparent opacity={0.05} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

/* ----------------------- SATURN RING ----------------------- */
function PlanetRing({ tilt = 0, radius = 2.7, thickness = 0.02, color = "#f0abfc", opacity = 0.5, segments = 256 }: {
  tilt?: number; radius?: number; thickness?: number; color?: string; opacity?: number; segments?: number;
}) {
  return (
    <mesh rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <torusGeometry args={[radius, thickness, 24, segments]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/* ----------------------- ORBITING DUST DISK ----------------------- */
function DustDisk({ count = 2200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.pow(Math.random(), 1.6) * 2.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.18;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
      // gradient pink → violet
      const mix = (r - 2.6) / 2.2;
      colors[i * 3] = 0.95 - mix * 0.3;
      colors[i * 3 + 1] = 0.35 + mix * 0.1;
      colors[i * 3 + 2] = 0.95;
    }
    return { positions, colors };
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.06;
  });

  return (
    <points ref={ref} rotation={[0.25, 0, 0.1]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ----------------------- COMETS ----------------------- */
function Comet({ radius, speed, tilt, color }: { radius: number; speed: number; tilt: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.7) * 0.4, Math.sin(t) * radius);
  });
  return (
    <group rotation={[tilt, 0, 0]}>
      <Trail width={0.6} length={6} color={color} attenuation={(t) => t * t}>
        <mesh ref={ref}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </Trail>
    </group>
  );
}

/* ----------------------- ORBITAL ICONS ----------------------- */
function OrbitalIcons({ onSelect, active }: { onSelect: (slug: string) => void; active: string }) {
  const items = NOVA_MODULES.filter((m) => m.slug !== "home");
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.getElapsedTime() * 0.06;
  });
  return (
    <group ref={group}>
      {items.map((m, i) => {
        const angle = (i / items.length) * Math.PI * 2;
        const radius = 3.4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(angle * 2) * 0.35;
        const Icon = m.icon;
        const isActive = active === m.slug;
        return (
          <Float key={m.slug} speed={2} rotationIntensity={0} floatIntensity={0.4}>
            <Html position={[x, y, z]} center distanceFactor={10} occlude={false}>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(m.slug); }}
                className="group flex flex-col items-center gap-1.5 pointer-events-auto select-none"
                title={m.label}
              >
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${
                    isActive
                      ? "border-fuchsia-300 bg-fuchsia-500/30 scale-110"
                      : "border-fuchsia-300/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/25 hover:scale-110"
                  }`}
                  style={{
                    boxShadow: isActive
                      ? "0 0 28px rgba(232,121,249,0.9), inset 0 0 16px rgba(232,121,249,0.4)"
                      : "0 0 14px rgba(232,121,249,0.45), inset 0 0 10px rgba(232,121,249,0.15)",
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: "white", filter: "drop-shadow(0 0 6px #ff7ef9)" }} />
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.18em] whitespace-nowrap font-display"
                  style={{ color: "rgba(255,255,255,0.92)", textShadow: "0 0 8px rgba(232,121,249,0.7)" }}
                >
                  {m.label}
                </span>
              </button>
            </Html>
          </Float>
        );
      })}
    </group>
  );
}

/* ----------------------- SCENE ----------------------- */
function SceneControls() {
  const ref = useRef<any>(null);
  return (
    <OrbitControls
      ref={ref}
      enablePan={false}
      enableZoom={false}
      enableRotate
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      autoRotate
      autoRotateSpeed={0.4}
      onStart={() => { if (ref.current) ref.current.autoRotate = false; }}
      onEnd={() => { if (ref.current) setTimeout(() => { if (ref.current) ref.current.autoRotate = true; }, 1500); }}
    />
  );
}

export function NovaSphere({ onSelect, active }: { onSelect: (slug: string) => void; active: string }) {
  const quality = useDeviceQuality();
  const energy = ENERGY[active] ?? 1.0;
  const low = quality === "low";
  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0.6, 7], fov: 50 }}
        dpr={low ? [1, 1.25] : [1, 2]}
        gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#06030f"]} />
        <fog attach="fog" args={["#06030f", 8, 22]} />

        <ambientLight intensity={0.35} />
        <pointLight position={[0, 0, 0]} intensity={3 * energy} color="#ff5ff5" distance={8} />
        <pointLight position={[6, 4, 4]} intensity={1.4} color="#e879f9" />
        <pointLight position={[-6, -3, -5]} intensity={1.1} color="#7c3aed" />

        <Stars radius={70} depth={60} count={low ? 1200 : 5000} factor={3.5} fade speed={0.5} />

        <PlasmaCore />

        <PlanetRing tilt={0}     radius={2.65} thickness={0.025} color="#ff7ef9" opacity={0.7} />
        <PlanetRing tilt={0.05}  radius={2.78} thickness={0.008} color="#ffffff" opacity={0.55} />
        <PlanetRing tilt={0.55}  radius={3.05} thickness={0.018} color="#c084fc" opacity={0.5} />
        {!low && <PlanetRing tilt={-0.42} radius={3.35} thickness={0.012} color="#f0abfc" opacity={0.4} />}
        {!low && <PlanetRing tilt={1.1}   radius={3.6}  thickness={0.006} color="#a855f7" opacity={0.3} />}

        <DustDisk count={low ? 700 : 2200} />

        {!low && <Comet radius={3.8} speed={0.6}  tilt={0.3}  color="#ff7ef9" />}
        {!low && <Comet radius={4.2} speed={-0.4} tilt={-0.5} color="#c084fc" />}

        <OrbitalIcons onSelect={onSelect} active={active} />

        <SceneControls />

        <EffectComposer multisampling={0} enabled={!low || energy > 1.2}>
          <Bloom intensity={1.0 + energy * 0.6} luminanceThreshold={0.15} luminanceSmoothing={0.85} mipmapBlur radius={0.85} />
          {!low ? (
            <ChromaticAberration offset={[0.0008, 0.0012]} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
          ) : <></>}
          {!low ? <Noise premultiply opacity={0.04} /> : <></>}
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
