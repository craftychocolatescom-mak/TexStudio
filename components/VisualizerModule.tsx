
import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { geminiService } from '../services/geminiService.ts';
import { supabase } from '../services/supabaseClient';
import { ModelSettings } from '../types.ts';
import { generatePDF } from '../utils/pdfHelper';

interface CalloutMetadata {
  buttonSize?: string;
  buttonType?: string;
  spi?: string;
  threadWeight?: string;
  stitchClass?: string;
  placementDistance?: string;
  applicationMethod?: string;
}

interface Callout {
  id: string;
  label: string;
  value: string;
  type: 'seam' | 'stitch' | 'dart' | 'trim' | 'button' | 'stitch_detail' | 'trim_placement' | 'generic';
  position: { top: string; left: string };
  metadata?: CalloutMetadata;
}

interface VisualizerModuleProps {
  onComplete: (data: any) => void;
  onConfirmBuild?: (data: any) => void;
  initialData?: any;
  activeProjectId?: string;
  userId?: string;
}

type HubView = 'side-by-side' | 'technical' | 'overlay-tech';
type TechFocus = 'front' | 'back' | 'full';

interface AlignmentState {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

const LOADING_STEPS = [
  { main: "Syncing Industrial Blueprint", sub: "Mapping structural Front, Back, and Side vectors" },
  { main: "Hard-Masking Sketch Chroma", sub: "Stripping color noise for structural transparency" },
  { main: "Synthesizing Surface Grain", sub: "Applying Swatch texture to synthesized mesh" },
  { main: "Parallel Synthesis Loop", sub: "Generating Technical and Model builds simultaneously" },
  { main: "High-Compute Pro Engine", sub: "Awaiting High-Resolution Synthesis from Pro Engine" },
  { main: "Verification Hub Export", sub: "Finalizing industrial quality check assets" }
];

const FIBER_OPTIONS = [
  "100% Cotton", "100% Organic Cotton", "100% Pima Cotton", "100% Giza Cotton",
  "100% Polyester", "100% Recycled Polyester (rPET)", "100% Nylon (Polyamide)",
  "100% Recycled Nylon (Econyl)", "100% Silk (Mulberry)", "100% Silk (Tussah / Raw)",
  "100% Wool (Merino)", "100% Wool (Lambswool)", "100% Cashmere", "100% Alpaca Wool",
  "100% Mohair", "100% Linen", "100% Hemp", "100% Ramie", "100% Bamboo Rayon",
  "100% Tencel (Lyocell)", "100% Modal", "100% Viscose / Rayon", "100% Cupro (Bemberg)",
  "100% Acetate", "100% Triacetate", "100% Acrylic", "65% Polyester / 35% Cotton (T/C)",
  "60% Cotton / 40% Polyester (CVC)", "50% Cotton / 50% Polyester",
  "95% Cotton / 5% Elastane (Lycra)", "98% Cotton / 2% Elastane", "95% Polyester / 5% Spandex",
  "80% Wool / 20% Nylon (Coating)", "70% Viscose / 30% Linen", "55% Linen / 45% Cotton",
  "50% Wool / 50% Acrylic", "100% Polyurethane (PU / Faux Leather)", "100% PVC (Vinyl)",
  "Cordura Performance Nylon", "Kevlar Para-Aramid Fiber", "Gore-Tex / Technical Membrane",
  "Lurex / Metallic Blend"
];

const GSM_OPTIONS = [
  { val: 15, label: "15 GSM (Ultra-Fine Mesh)" },
  { val: 25, label: "25 GSM (Non-Woven Interfacing)" },
  { val: 40, label: "40 GSM (Lightweight Lining)" },
  { val: 50, label: "50 GSM (Chiffon / Sheer)" },
  { val: 70, label: "70 GSM (Habutai Silk)" },
  { val: 80, label: "80 GSM (Voile / Batiste)" },
  { val: 90, label: "90 GSM (Fine Poplin / Lawn)" },
  { val: 100, label: "100 GSM (Standard Poplin)" },
  { val: 115, label: "115 GSM (Lightweight Shirting)" },
  { val: 130, label: "130 GSM (Medium Shirting)" },
  { val: 150, label: "150 GSM (Standard Jersey)" },
  { val: 165, label: "165 GSM (Premium Jersey)" },
  { val: 180, label: "180 GSM (Mid-Weight / Interlock)" },
  { val: 200, label: "200 GSM (Heavy Jersey / Polo)" },
  { val: 220, label: "220 GSM (Heavy Piqué)" },
  { val: 240, label: "240 GSM (French Terry)" },
  { val: 260, label: "260 GSM (Lightweight Fleece)" },
  { val: 280, label: "280 GSM (Standard Fleece)" },
  { val: 300, label: "300 GSM (Heavy Fleece)" },
  { val: 320, label: "320 GSM (Ultra-Heavy Fleece)" },
  { val: 350, label: "350 GSM (Mid-Weight Denim)" },
  { val: 380, label: "380 GSM (Heavy Denim / Canvas)" },
  { val: 410, label: "410 GSM (12oz Denim)" },
  { val: 450, label: "450 GSM (Heavy Duck Canvas)" },
  { val: 500, label: "500 GSM (Wool Coating)" },
  { val: 600, label: "600 GSM (Heavy Winter Wool)" },
  { val: 800, label: "800 GSM (Industrial Felt)" }
];

const FABRIC_TYPE_OPTIONS = ["Woven", "Knitted"];
const FABRIC_MATERIAL_OPTIONS = ["Jersey", "Poplin", "Denim", "Corduroy", "Fleece", "Velvet", "Leather", "Canvas", "Chiffon", "Satin", "Tweed"];

const DEFAULT_ALIGN: AlignmentState = { x: 0, y: 0, scale: 100, opacity: 50 };

const TYPE_CONFIG = {
  seam: { color: '#6366f1', icon: 'fa-layer-group', label: 'Seam' },
  stitch: { color: '#10b981', icon: 'fa-braid', label: 'Stitch' },
  dart: { color: '#84cc16', icon: 'fa-draw-polygon', label: 'Dart' },
  trim: { color: '#ef4444', icon: 'fa-ring', label: 'Trim' },
  button: { color: '#f59e0b', icon: 'fa-circle-dot', label: 'Button' },
  stitch_detail: { color: '#0ea5e9', icon: 'fa-ellipsis', label: 'Stitching' },
  trim_placement: { color: '#d946ef', icon: 'fa-crosshairs', label: 'Placement' },
  generic: { color: '#94a3b8', icon: 'fa-tag', label: 'Point' }
};

const FabricDrapeSimulator: React.FC<{ gsm: number, fiber: string, materialType: string, swatchUrl?: string | null }> = ({ gsm, fiber, materialType, swatchUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const isSilkLike = fiber.toLowerCase().includes('silk') || materialType === 'Satin' || materialType === 'Velvet';
    const isLeather = materialType === 'Leather';
    const isRough = materialType === 'Denim' || materialType === 'Corduroy' || materialType === 'Canvas' || materialType === 'Tweed';
    const isSoft = materialType === 'Fleece' || materialType === 'Jersey';

    // Performance Tweak: Lower Plane Resolution (from 50 to 24)
    const planeRes = 24;
    const geometry = new THREE.PlaneGeometry(3, 3, planeRes, planeRes);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1,
      side: THREE.DoubleSide,
      roughness: isSilkLike ? 0.15 : isRough ? 0.95 : isLeather ? 0.35 : 0.7,
      metalness: isSilkLike ? 0.1 : isLeather ? 0.05 : 0,
      clearcoat: isLeather ? 0.4 : isSilkLike ? 0.2 : 0,
      clearcoatRoughness: 0.1,
      sheen: isSoft || materialType === 'Velvet' ? 1.0 : 0,
      sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.5,
      map: swatchUrl ? new THREE.TextureLoader().load(swatchUrl) : null,
    });

    const cloth = new THREE.Mesh(geometry, material);
    scene.add(cloth);

    const clock = new THREE.Clock();

    function animate() {
      const frameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      const baseStiffness = Math.max(0.1, gsm / 800);
      const materialStiffnessMult = isLeather ? 3.0 : isRough ? 1.5 : 1.0;
      const stiffness = baseStiffness * materialStiffnessMult;

      const amplitude = 0.5 / (stiffness * 4 + 1);

      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = Math.sin(x * 1.5 + time) * Math.cos(y * 1.5 + time) * amplitude;
        position.setZ(i, z);
      }
      position.needsUpdate = true;
      cloth.rotation.y = time * 0.15;

      renderer.render(scene, camera);
      return frameId;
    }
    const frameId = animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [gsm, fiber, materialType, swatchUrl]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export const VisualizerModule: React.FC<VisualizerModuleProps> = ({ onComplete, onConfirmBuild, initialData, activeProjectId, userId }) => {
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sketchFront, setSketchFront] = useState<string | null>(null);
  const [sketchBack, setSketchBack] = useState<string | null>(null);
  const [sketchSide, setSketchSide] = useState<string | null>(null);
  const [swatch, setSwatch] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string>("");
  const [croppedSwatch, setCroppedSwatch] = useState<string | null>(null);

  const [fabricWeight, setFabricWeight] = useState<number>(180);
  const [fiberComposition, setFiberComposition] = useState<string>("100% Cotton");
  const [fabricType, setFabricType] = useState<string>("Woven");
  const [fabricMaterial, setFabricMaterial] = useState<string>("Jersey");

  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    gender: 'Female',
    ageGroup: 'Adult',
    pose: 'Standing'
  });

  const [detectingSettings, setDetectingSettings] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [estTime, setEstTime] = useState(0);

  const [sliderPos, setSliderPos] = useState(50);
  const [hubView, setHubView] = useState<HubView>('side-by-side');
  const [techFocus, setTechFocus] = useState<TechFocus>('full');

  const [align, setAlign] = useState<AlignmentState>(DEFAULT_ALIGN);

  const [isCropping, setIsCropping] = useState(false);
  const [tempSwatch, setTempSwatch] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropZoneRef = useRef<HTMLDivElement>(null);

  const [editableCallouts, setEditableCallouts] = useState<Callout[]>([]);
  const [selectedCalloutIndex, setSelectedCalloutIndex] = useState<number | null>(null);
  const technicalContainerRef = useRef<HTMLDivElement>(null);

  const fileInputFront = useRef<HTMLInputElement>(null);
  const fileInputBack = useRef<HTMLInputElement>(null);
  const fileInputSide = useRef<HTMLInputElement>(null);
  const fileInputSwatch = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setResult(initialData);
      if (initialData.callouts) setEditableCallouts(initialData.callouts);
      if (initialData.inputs) {
        setSketchFront(initialData.inputs.sketchFront || null);
        setSketchBack(initialData.inputs.sketchBack || null);
        setSketchSide(initialData.inputs.sketchSide || null);
        setSwatch(initialData.inputs.swatch || null);
        setCroppedSwatch(initialData.inputs.swatch || null);
        setInstructions(initialData.inputs.instructions || "");
        if (initialData.inputs.modelSettings) setModelSettings(initialData.inputs.modelSettings);
        if (initialData.inputs.fabricWeight) setFabricWeight(initialData.inputs.fabricWeight);
        if (initialData.inputs.fiberComposition) setFiberComposition(initialData.inputs.fiberComposition);
        if (initialData.inputs.fabricType) setFabricType(initialData.inputs.fabricType);
        if (initialData.inputs.fabricMaterial) setFabricMaterial(initialData.inputs.fabricMaterial);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const triggerScan = async () => {
      if (sketchFront && !result) {
        setDetectingSettings(true);
        try {
          const detected = await geminiService.detectModelSettings(sketchFront);
          setModelSettings(detected);
        } catch (e) {
          console.error("AI Scan Error", e);
        } finally {
          setDetectingSettings(false);
        }
      }
    };
    triggerScan();
  }, [sketchFront]);

  useEffect(() => {
    let interval: number;
    if (loading || refining) {
      setProgress(0);
      setStepIndex(0);
      setEstTime(refining ? 12 : 30);

      interval = window.setInterval(() => {
        setProgress((prev) => {
          // Slow down progress significantly near the end to handle high-compute Pro calls
          const increment = prev < 50 ? 1.5 : prev < 85 ? 0.4 : 0.05;
          const next = prev + increment;
          if (next >= 99.2) return 99.2;

          const stepSize = 100 / LOADING_STEPS.length;
          const calculatedStep = Math.min(Math.floor(next / stepSize), LOADING_STEPS.length - 1);
          setStepIndex(calculatedStep);

          return next;
        });

        setEstTime(prev => (prev > 1.5 ? prev - 0.2 : 1.5));
      }, 200);
    } else {
      setProgress(100);
      setEstTime(0);
    }
    return () => clearInterval(interval);
  }, [loading, refining]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'side' | 'swatch') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (type === 'front') setSketchFront(res);
        else if (type === 'back') setSketchBack(res);
        else if (type === 'side') setSketchSide(res);
        else { setTempSwatch(res); setIsCropping(true); }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSketch = (e: React.MouseEvent, type: 'front' | 'back' | 'side' | 'swatch') => {
    e.stopPropagation();
    if (type === 'front') setSketchFront(null);
    else if (type === 'back') setSketchBack(null);
    else if (type === 'side') setSketchSide(null);
    else if (type === 'swatch') { setSwatch(null); setCroppedSwatch(null); }
  };

  const resetWorkspace = () => {
    setSketchFront(null); setSketchBack(null); setSketchSide(null);
    setSwatch(null); setCroppedSwatch(null); setInstructions("");
    setFabricWeight(180); setFiberComposition("100% Cotton"); setFabricType("Woven"); setFabricMaterial("Jersey");
    setResult(null); setEditableCallouts([]); setError(null);
    setModelSettings({ gender: 'Female', ageGroup: 'Adult', pose: 'Standing' });
  };

  const finalizeCrop = () => {
    if (!tempSwatch || !cropZoneRef.current) return;
    const img = new Image();
    img.src = tempSwatch;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 1024;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const zoneRect = cropZoneRef.current!.getBoundingClientRect();
      const scale = img.width / (zoneRect.width * cropZoom);

      const sourceX = (-cropOffset.x) * scale;
      const sourceY = (-cropOffset.y) * scale;
      const sourceSize = zoneRect.width * scale;

      ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      setCroppedSwatch(canvas.toDataURL('image/jpeg', 0.9));
      setSwatch(tempSwatch);
      setIsCropping(false);
      setCropOffset({ x: 0, y: 0 });
      setCropZoom(1);
    };
  };

  const startCropDrag = (e: React.MouseEvent) => {
    const startX = e.clientX - cropOffset.x;
    const startY = e.clientY - cropOffset.y;

    const onMove = (moveEvent: MouseEvent) => {
      setCropOffset({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleGenerate = async () => {
    if (!sketchFront || !croppedSwatch) {
      alert("Required: Front Sketch and Fabric Swatch.");
      return;
    }
    setLoading(true);
    setError(null);

    const materialPrompt = `FABRIC: ${fabricMaterial} (${fabricType}) ${fiberComposition}, ${fabricWeight} GSM. Drape characteristics: ${fabricWeight < 100 ? 'Fluid/Sheer' : fabricWeight > 300 ? 'Stiff/Structural' : 'Mid-weight'}.`;
    const enrichedInstructions = instructions ? `${materialPrompt}\n${instructions}` : materialPrompt;

    try {
      const fabricData = { type: fabricType, material: fabricMaterial, fiber: fiberComposition, weight: fabricWeight };
      const [techResult, modelResult] = await Promise.all([
        geminiService.generateMockup(
          { front: sketchFront, back: sketchBack || undefined, side: sketchSide || undefined },
          croppedSwatch,
          enrichedInstructions,
          'technical',
          modelSettings,
          fabricData
        ),
        geminiService.generateMockup(
          { front: sketchFront, back: sketchBack || undefined, side: sketchSide || undefined },
          croppedSwatch,
          enrichedInstructions,
          'model',
          modelSettings,
          fabricData
        )
      ]);

      const fullResult = {
        garmentName: techResult.json?.garmentName || `BUILD-${Date.now().toString().slice(-4)}`,
        technicalImageUrl: techResult.imageUrl,
        modelImageUrl: modelResult.imageUrl,
        analysis: techResult.analysis,
        inputs: {
          sketchFront, sketchBack, sketchSide, swatch: croppedSwatch,
          instructions, modelSettings, fabricWeight, fiberComposition, fabricType, fabricMaterial
        },
        callouts: [],
        industrialMeta: {
          stitchType: "ISO 4915: 406",
          machine: "Industrial Flatbed",
          composition: fiberComposition,
          weightGsm: fabricWeight,
          fabricType: fabricType,
          fabricMaterial: fabricMaterial
        }
      };

      setResult(fullResult);
      setResult(fullResult);

      // Auto-save to Supabase if project context exists
      if (activeProjectId && userId) {
        saveToSupabase(fullResult, techResult.imageUrl);
      }

      onComplete(fullResult);
    } catch (err: any) {
      setError(err.message || "Synthesis failure.");
    } finally {
      setLoading(false);
    }
  };



  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 100));
    await generatePDF('tech-pack-content', `TechPack-${result?.garmentName || 'Draft'}`);
    setGeneratingPDF(false);
  };

  const saveToSupabase = async (data: any, imageUrl: string) => {
    if (!activeProjectId || !userId) return;

    try {
      // 1. Upload Image to Storage
      // Convert base64 to blob
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const filename = `${Date.now()}_technical.png`;
      const filePath = `${userId}/${activeProjectId}/visualizer/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('project-assets')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-assets')
        .getPublicUrl(filePath);

      // 2. Save Artifact Record
      const { error: dbError } = await supabase
        .from('artifacts')
        .insert({
          project_id: activeProjectId,
          user_id: userId,
          type: 'visualizer',
          title: data.garmentName,
          data: data,
          image_url: publicUrl
        });

      if (dbError) throw dbError;
      console.log("Saved to project successfully");

    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleCalloutChange = (index: number, field: keyof Callout, value: any) => {
    const updated = [...editableCallouts];
    updated[index] = { ...updated[index], [field]: value };
    setEditableCallouts(updated);
    if (result) setResult({ ...result, callouts: updated });
  };

  const deleteCallout = (index: number) => {
    const updated = editableCallouts.filter((_, i) => i !== index);
    setEditableCallouts(updated);
    setSelectedCalloutIndex(null);
    if (result) setResult({ ...result, callouts: updated });
  };

  const addNewCallout = (type: Callout['type'] = 'generic') => {
    const nextId = `TR${(editableCallouts.length + 1).toString().padStart(4, '0')}`;
    const newCallout: Callout = {
      id: nextId,
      label: type === 'generic' ? "New Point" : TYPE_CONFIG[type].label,
      value: "Spec detail",
      type: type,
      position: { top: '50%', left: '50%' }
    };
    const updated = [...editableCallouts, newCallout];
    setEditableCallouts(updated);
    setSelectedCalloutIndex(updated.length - 1);
  };

  const onHotspotMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedCalloutIndex(index);

    const container = technicalContainerRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      handleCalloutChange(index, 'position', {
        top: `${clampedY}%`,
        left: `${clampedX}%`
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const getFocusStyle = (): React.CSSProperties => {
    if (techFocus === 'full') return { transform: 'scale(1)', transformOrigin: 'center' };
    if (techFocus === 'front') return { transform: 'scale(1.8) translateX(25%)', transformOrigin: 'center' };
    if (techFocus === 'back') return { transform: 'scale(1.8) translateX(-25%)', transformOrigin: 'center' };
    return {};
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <style>{`
        .ghost-viewport { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff; border-radius: 40px; }
        .ghost-layer { position: absolute; max-width: 100%; max-height: 100%; object-fit: contain; transition: all 0.2s ease-out; }
        .hotspot-tr { position: absolute; width: 26px; height: 26px; border: 2px solid #fff; border-radius: 50%; cursor: grab; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); z-index: 200; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); }
        .hotspot-tr.selected { transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 0 20px currentColor; z-index: 205; animation: hotspot-pulse 1.5s infinite; }
        @keyframes hotspot-pulse { 0% { box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.4); } 100% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); } }
        .label-detail { position: absolute; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 900; color: #1e293b; white-space: nowrap; pointer-events: none; z-index: 201; transform: translate(-50%, -150%); display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .toolkit-floating { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 12px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(16px); padding: 16px; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 300; }
        .inspector-floating { position: absolute; right: 24px; top: 24px; width: 280px; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(20px); border-radius: 28px; border: 1px solid #e2e8f0; padding: 24px; z-index: 300; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        .remove-icon-btn { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: #ef4444; color: white; border-radius: 50%; border: 1.5px solid #020617; display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer; z-index: 40; }
        .progress-indicator { width: 100%; max-width: 300px; height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 99px; overflow: hidden; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.05); }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); transition: width 0.4s ease-out; box-shadow: 0 0 10px rgba(99, 102, 241, 0.5); }
        .pulse-text { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>

      {isCropping && tempSwatch && (
        <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-slate-300 tracking-widest">Swatch Calibration</h3>
              <button onClick={() => setIsCropping(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 bg-black relative flex items-center justify-center p-4 overflow-hidden">
              <div ref={cropZoneRef} onMouseDown={startCropDrag} className="relative aspect-square w-full max-w-[450px] bg-slate-950 rounded-xl overflow-hidden cursor-move border border-slate-800 shadow-inner">
                <img src={tempSwatch} className="absolute pointer-events-none select-none" style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: 'top left', width: '100%' }} alt="Crop target" />
              </div>
            </div>
            <div className="p-8 space-y-4 bg-slate-900 border-t border-slate-800">
              <div className="flex items-center gap-4">
                <i className="fas fa-magnifying-glass-plus text-slate-500"></i>
                <input type="range" min="1" max="6" step="0.01" value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} className="w-full h-1.5 appearance-none bg-slate-800 rounded-full accent-indigo-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsCropping(false)} className="px-5 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                <button onClick={finalizeCrop} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-500">Confirm Synthesis Base</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-fadeIn">
        <div className="lg:col-span-1 space-y-8 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 space-y-6 shadow-xl">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">Blueprint Intake</h2>
              <button onClick={resetWorkspace} className="text-[8px] font-black uppercase text-red-500 hover:opacity-70">Reset Studio</button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {['front', 'back', 'side'].map(t => {
                  const src = t === 'front' ? sketchFront : t === 'back' ? sketchBack : sketchSide;
                  const ref = t === 'front' ? fileInputFront : t === 'back' ? fileInputBack : fileInputSide;
                  return (
                    <div key={t} className={`aspect-[3/4] border border-dashed rounded-xl flex items-center justify-center cursor-pointer relative transition-all ${src ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-slate-800 hover:border-slate-600'}`}>
                      {src ? (
                        <>
                          <img src={src} className="w-full h-full object-contain p-1 rounded-lg" alt={t} />
                          <div className="remove-icon-btn" onClick={(e) => clearSketch(e, t as any)}><i className="fas fa-times"></i></div>
                        </>
                      ) : <div onClick={() => ref.current?.click()} className="text-center group"><i className="fas fa-plus text-slate-700 text-xs mb-1 group-hover:text-slate-500"></i><p className="text-[6px] font-black text-slate-600 uppercase tracking-widest">{t}</p></div>}
                      <input type="file" ref={ref} onChange={(e) => handleFile(e, t as any)} hidden accept="image/*" />
                    </div>
                  );
                })}
              </div>

              <div className={`h-20 border border-dashed rounded-[20px] flex items-center justify-center cursor-pointer relative transition-all ${croppedSwatch ? 'border-emerald-500 bg-emerald-500/5 shadow-inner' : 'border-slate-800 hover:border-slate-600'}`}>
                {croppedSwatch ? (
                  <>
                    <img src={croppedSwatch} className="h-full object-cover p-1 rounded-lg" alt="Swatch" />
                    <div className="remove-icon-btn" onClick={(e) => clearSketch(e, 'swatch')}><i className="fas fa-times"></i></div>
                  </>
                ) : <div onClick={() => fileInputSwatch.current?.click()} className="w-full h-full flex items-center justify-center group"><i className="fas fa-swatchbook text-slate-700 mr-2 text-xs group-hover:text-slate-500"></i><span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Upload Swatch</span></div>}
                <input type="file" ref={fileInputSwatch} onChange={(e) => handleFile(e, 'swatch')} hidden accept="image/*" />
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800/50">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                    <select value={fabricType} onChange={(e) => setFabricType(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm">
                      {FABRIC_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <select value={fabricMaterial} onChange={(e) => setFabricMaterial(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm">
                      {FABRIC_MATERIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <select value={fiberComposition} onChange={(e) => setFiberComposition(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm">
                    {FIBER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <select value={fabricWeight} onChange={(e) => setFabricWeight(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm">
                    {GSM_OPTIONS.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                  </select>
                </div>

                {/* Drape Simulator Preview */}
                <div className="pt-4 border-t border-slate-800/50">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3">Live Drape Analysis</p>
                  <div className="h-40 w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner">
                    <FabricDrapeSimulator gsm={fabricWeight} fiber={fiberComposition} materialType={fabricMaterial} swatchUrl={croppedSwatch} />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[7px] font-black uppercase rounded border border-indigo-500/20">Real-time Shaders</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/50">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 flex justify-between items-center">
                    Model Persona
                    {detectingSettings && <span className="text-indigo-400 animate-pulse flex items-center gap-1"><i className="fas fa-circle-notch animate-spin text-[8px]"></i> Scanning</span>}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={modelSettings.gender}
                      onChange={(e) => setModelSettings({ ...modelSettings, gender: e.target.value as any })}
                      className={`w-full bg-slate-800 border ${detectingSettings ? 'border-indigo-500/50' : 'border-slate-700'} p-2.5 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm transition-all`}
                    >
                      {['Female', 'Male', 'Unisex'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select
                      value={modelSettings.ageGroup}
                      onChange={(e) => setModelSettings({ ...modelSettings, ageGroup: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm"
                    >
                      {['Kids', 'Teen', 'Adult', 'Senior'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select
                      value={modelSettings.pose}
                      onChange={(e) => setModelSettings({ ...modelSettings, pose: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500 shadow-sm"
                    >
                      {['Standing', 'Sitting', 'Walking', 'Dynamic'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!sketchFront || !croppedSwatch || loading || refining || detectingSettings}
                  className="w-full mt-4 py-5 bg-indigo-600 rounded-[24px] font-black uppercase text-[10px] text-white shadow-xl hover:bg-indigo-500 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {(loading || refining) ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-bolt"></i>}
                  {result ? 'Regenerate Studio' : 'Synthesize Build'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-10">
          {!result ? (
            <div className="bg-slate-900/20 rounded-[48px] border-4 border-dashed border-slate-800/40 flex flex-col items-center justify-center min-h-[600px] text-center p-12 relative overflow-hidden">
              {loading ? (
                <div className="space-y-6 flex flex-col items-center animate-fadeIn z-10">
                  <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mx-auto flex items-center justify-center shadow-lg">
                    <span className="text-xs font-black text-indigo-400">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-indigo-400 font-black uppercase text-xl tracking-widest pulse-text">
                      {progress > 90 ? "Awaiting Pro Synthesis Engine" : LOADING_STEPS[stepIndex].main}
                    </p>
                    <div className="flex items-center gap-4 justify-center">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">{progress.toFixed(0)}% Transmitting</p>
                      <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">EST: ~{estTime.toFixed(0)}s Remaining</p>
                    </div>
                    <p className="text-slate-600 text-[10px] font-bold mt-2 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                      {progress > 90 ? "Pro-tier synthesis requires high GPU compute. Finalizing texture mapping..." : LOADING_STEPS[stepIndex].sub}
                    </p>
                  </div>
                  <div className="progress-indicator h-2">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 opacity-40">
                  <i className="fas fa-drafting-compass text-6xl text-slate-800"></i>
                  <div>
                    <h3 className="text-slate-700 font-black uppercase text-xl tracking-widest">Studio Engine Idle</h3>
                    <p className="text-slate-800 max-w-sm text-[10px] font-black mt-3 mx-auto uppercase tracking-[0.2em] leading-relaxed">Awaiting blueprint and material intake for industrial pre-production synthesis.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-fadeIn space-y-8">
              <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800 no-print shadow-xl">
                {(['side-by-side', 'technical', 'overlay-tech'] as HubView[]).map(tab => (
                  <button key={tab} onClick={() => setHubView(tab)} className={`flex-1 px-5 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${hubView === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tab.replace('-', ' ')}</button>
                ))}
              </div>

              <div className="relative aspect-[3/4] bg-white rounded-[40px] overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
                {hubView === 'side-by-side' ? (
                  <div className="relative w-full h-full flex flex-col">
                    <div className="flex-1 relative bg-slate-50">
                      <img src={result.modelImageUrl} className="absolute inset-0 w-full h-full object-contain" alt="Model render" />
                      <div className="absolute inset-0 bg-white overflow-hidden border-r-2 border-indigo-500/50 shadow-2xl" style={{ width: `${sliderPos}%` }}>
                        <img src={result.technicalImageUrl} className="w-full h-full object-contain" style={{ width: `${100 * (100 / sliderPos)}%`, maxWidth: 'none' }} alt="Technical render" />
                      </div>
                      <div className="absolute inset-x-0 bottom-12 flex justify-center z-40 no-print">
                        <input type="range" min="2" max="98" value={sliderPos} onChange={(e) => setSliderPos(parseInt(e.target.value))} className="w-[90%] h-1 appearance-none bg-black/10 rounded-full accent-indigo-500 hover:bg-black/20 transition-all" />
                      </div>
                    </div>
                  </div>
                ) : hubView === 'technical' ? (
                  <div className="relative w-full h-full flex flex-col" onClick={() => setSelectedCalloutIndex(null)}>
                    <div className="bg-white border-b-2 border-slate-100 px-10 py-7 flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Industrial Build Specification</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight">{result.garmentName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} disabled={generatingPDF} className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg flex items-center gap-2">
                          {generatingPDF ? <i className="fas fa-circle-notch animate-spin text-red-500"></i> : <i className="fas fa-file-pdf text-red-500"></i>}
                          {generatingPDF ? 'Rendering...' : 'Download PDF'}
                        </button>
                        {(['full', 'front', 'back'] as TechFocus[]).map(f => (
                          <button key={f} onClick={(e) => { e.stopPropagation(); setTechFocus(f); }} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${techFocus === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-500'}`}>{f}</button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden relative bg-white">
                      {/* Annotation Toolbar */}
                      <div className="toolkit-floating no-print">
                        {(['seam', 'stitch', 'stitch_detail', 'button', 'trim_placement', 'dart', 'trim'] as Callout['type'][]).map(t => (
                          <button
                            key={t}
                            onClick={(e) => { e.stopPropagation(); addNewCallout(t); }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                            style={{ backgroundColor: TYPE_CONFIG[t].color }}
                            title={`Add ${TYPE_CONFIG[t].label}`}
                          >
                            <i className={`fas ${TYPE_CONFIG[t].icon}`}></i>
                          </button>
                        ))}
                      </div>

                      {/* Selected Callout Inspector */}
                      {selectedCalloutIndex !== null && (
                        <div className="inspector-floating no-print animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Spec Inspector</h4>
                            <button onClick={() => deleteCallout(selectedCalloutIndex!)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash-alt text-xs"></i></button>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Component Label</label>
                              <input
                                type="text"
                                value={editableCallouts[selectedCalloutIndex].label}
                                onChange={(e) => handleCalloutChange(selectedCalloutIndex!, 'label', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Detail Specification</label>
                              <textarea
                                value={editableCallouts[selectedCalloutIndex].value}
                                onChange={(e) => handleCalloutChange(selectedCalloutIndex!, 'value', e.target.value)}
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Category Type</label>
                              <select
                                value={editableCallouts[selectedCalloutIndex].type}
                                onChange={(e) => handleCalloutChange(selectedCalloutIndex!, 'type', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                              >
                                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                                  <option key={key} value={key}>{cfg.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button onClick={() => setSelectedCalloutIndex(null)} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Close Inspector</button>
                        </div>
                      )}

                      <div ref={technicalContainerRef} className="flex-1 relative h-full flex items-center justify-center p-12 overflow-hidden">
                        <div className="w-full h-full transition-all duration-700 ease-out" style={getFocusStyle()}>
                          <img src={result.technicalImageUrl} className="w-full h-full object-contain select-none" alt="Technical Layout" />
                          {editableCallouts.map((callout, idx) => (
                            <React.Fragment key={callout.id}>
                              <div
                                className={`hotspot-tr shadow-lg ${selectedCalloutIndex === idx ? 'selected' : ''}`}
                                style={{ top: callout.position.top, left: callout.position.left, backgroundColor: TYPE_CONFIG[callout.type].color }}
                                onMouseDown={(e) => onHotspotMouseDown(e, idx)}
                              >
                                <i className={`fas ${TYPE_CONFIG[callout.type].icon} text-[8px] text-white`}></i>
                                {(selectedCalloutIndex === idx || hubView === 'technical') && (
                                  <div className="label-detail">
                                    <span className="opacity-40">{callout.id}</span>
                                    <span>{callout.label}</span>
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ghost-viewport">
                    <img src={sketchFront!} className="ghost-layer opacity-40 grayscale blur-[1px]" alt="Background" />
                    <img src={result.technicalImageUrl} className="ghost-layer mix-blend-multiply transition-opacity duration-300" style={{ transform: `translate(${align.x}px, ${align.y}px) scale(${align.scale / 100})`, opacity: align.opacity / 100 }} alt="Overlaid spec" />
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-6 shadow-2xl no-print">
                <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                  <h3 className="text-base font-black uppercase text-white tracking-widest flex items-center gap-4"><i className="fas fa-microchip text-indigo-400"></i> AI Synthesis Verification</h3>
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Build Hash: {Date.now().toString().slice(-8)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-950 rounded-[28px] border border-slate-800 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-4 flex items-center gap-2"><i className="fas fa-brain text-[10px]"></i> Engineering Digest</h4>
                    <p className="text-[13px] text-slate-400 font-medium leading-relaxed italic line-clamp-5">{result.analysis}</p>
                  </div>
                  {onConfirmBuild && (
                    <div className="flex flex-col justify-center gap-4">
                      <button onClick={() => onConfirmBuild(result)} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95 group"><i className="fas fa-check-double text-base group-hover:scale-110 transition-transform"></i> Finalize Spec & Proceed</button>
                      <p className="text-[9px] text-slate-500 text-center font-black uppercase tracking-widest opacity-60">Proceeding locks silhouette geometry for patterns.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
