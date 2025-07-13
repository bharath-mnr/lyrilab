import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Upload, Download, RotateCcw, Headphones, AlertCircle, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SEOHead from './SEOHead';



// Define the tool object for SEO structured data
const threeDAudioStudioTool = {
    id: '3D-audio-studio',
    name: '3D Audio Studio',
    description: 'Professional 3D audio with real-time visualization.',
    path: '/3D-audio-studio',
    categories: [
        'Audio',
        '3D Audio',
        'Spatial Sound',
        'Immersive',
        'Binaural'
    ]
};

// --- Context for managing global audio state ---
const AudioContext = createContext(null);
const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            return;
        }
        try {
            await Tone.start();
            setIsAudioGloballyReady(true);
            console.log('Tone.js context started.');
        } catch (error) {
            console.error("Error starting Tone.js context:", error);
        }
    }, []);

    useEffect(() => {
        const handleStateChange = () => setIsAudioGloballyReady(Tone.context.state === 'running');
        Tone.context.on('statechange', handleStateChange);
        handleStateChange();
        return () => Tone.context.off('statechange', handleStateChange);
    }, []);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};

// --- Constants and Presets ---
const AUDIO_3D_PRESETS = {
    'Default': { distance: 5, position: { x: 0, y: 0, z: 0 }, rolloffFactor: 1.0, cone: { innerAngle: 360, outerAngle: 360 }, movementSpeed: 0.5, movementPattern: 'static' },
    'Close Left': { distance: 2, position: { x: -3, y: 0, z: 0 }, rolloffFactor: 2.0, cone: { innerAngle: 90, outerAngle: 180 }, movementSpeed: 0, movementPattern: 'static' },
    'Above': { distance: 3, position: { x: 0, y: 3, z: 0 }, rolloffFactor: 1.5, cone: { innerAngle: 180, outerAngle: 360 }, movementSpeed: 0, movementPattern: 'static' },
    'Surround': { distance: 4, position: { x: 0, y: 0, z: 0 }, rolloffFactor: 1.0, cone: { innerAngle: 360, outerAngle: 360 }, movementSpeed: 1.0, movementPattern: 'circle' },
    'Spiral': { distance: 4, position: { x: 0, y: 0, z: 0 }, rolloffFactor: 1.2, cone: { innerAngle: 180, outerAngle: 360 }, movementSpeed: 1.5, movementPattern: 'spiral' },
    'Left-Right': { distance: 3, position: { x: 0, y: 0, z: 0 }, rolloffFactor: 1.0, cone: { innerAngle: 360, outerAngle: 360 }, movementSpeed: 0.8, movementPattern: 'leftright' },
    'Infinity': { distance: 5, position: { x: 0, y: 0, z: 0 }, rolloffFactor: 1.0, cone: { innerAngle: 360, outerAngle: 360 }, movementSpeed: 0.8, movementPattern: 'infinity' },
};

// --- Utility to convert AudioBuffer to a WAV Blob ---
function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    let pos = 0;
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
    const writeString = (s) => { for (let i = 0; i < s.length; i++) { view.setUint8(pos++, s.charCodeAt(i)); } };
    writeString('RIFF'); setUint32(length - 8); writeString('WAVE');
    writeString('fmt '); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16);
    writeString('data'); setUint32(buffer.length * numOfChan * 2);
    for (let i = 0; i < buffer.length; i++) {
        for (let chan = 0; chan < numOfChan; chan++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(chan)[i]));
            view.setInt16(pos, sample < 0 ? sample * 32768 : sample * 32767, true);
            pos += 2;
        }
    }
    return new Blob([view], { type: 'audio/wav' });
}


// --- Main Custom Hook for 3D Audio Processing ---
const use3DAudioProcessor = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const audioNodesRef = useRef({});
    const animationFrameRef = useRef(null);
    const startTimeRef = useRef(0);
    const currentAudioBufferRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioLoadError, setAudioLoadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [audioFileName, setAudioFileName] = useState('');
    const [hasAudioFile, setHasAudioFile] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Default');
    const [is3DActive, setIs3DActive] = useState(true);

    const [position, setPosition] = useState(AUDIO_3D_PRESETS.Default.position);
    const [distance, setDistance] = useState(AUDIO_3D_PRESETS.Default.distance);
    const [rolloffFactor, setRolloffFactor] = useState(AUDIO_3D_PRESETS.Default.rolloffFactor);
    const [cone, setCone] = useState(AUDIO_3D_PRESETS.Default.cone);
    const [movementSpeed, setMovementSpeed] = useState(AUDIO_3D_PRESETS.Default.movementSpeed);
    const [movementPattern, setMovementPattern] = useState(AUDIO_3D_PRESETS.Default.movementPattern);
    const [volume, setVolume] = useState(0.7);
    const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0 });

    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    const disposeAudioNodes = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        Object.values(audioNodesRef.current).forEach(node => node?.disconnect());
        if (audioNodesRef.current.source) {
            try { audioNodesRef.current.source.stop(); } catch (e) {/* ignore */}
        }
        audioNodesRef.current = {};
        animationFrameRef.current = null;
        setIsPlaying(false);
        setIsAudioReady(false);
    }, []);

    const initAudioNodes = useCallback(async (audioBuffer) => {
        setIsLoadingAudio(true);
        setAudioLoadError(null);
        disposeAudioNodes();

        try {
            const context = Tone.context.rawContext;
            currentAudioBufferRef.current = audioBuffer;

            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            const panner = context.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            const gain = context.createGain();
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;

            audioNodesRef.current = { source, panner, gain, analyser };
            source.connect(panner).connect(gain).connect(analyser).connect(context.destination);
            setIsAudioReady(true);
        } catch (error) {
            setAudioLoadError(`Failed to initialize audio: ${error.message}`);
            disposeAudioNodes();
        } finally {
            setIsLoadingAudio(false);
        }
    }, [disposeAudioNodes]);

    useEffect(() => () => disposeAudioNodes(), [disposeAudioNodes]);

    useEffect(() => {
        const { source, panner, gain } = audioNodesRef.current;
        if (!source || !panner || !gain) return;
        source.disconnect();
        panner.disconnect();
        if (is3DActive) {
            source.connect(panner).connect(gain);
        } else {
            source.connect(gain);
        }
    }, [is3DActive, isAudioReady]);

    useEffect(() => {
        const { panner } = audioNodesRef.current;
        if (!panner || !is3DActive) return;
        const now = Tone.context.currentTime;
        if (movementPattern === 'static') {
            panner.positionX.setTargetAtTime(position.x, now, 0.015);
            panner.positionY.setTargetAtTime(position.y, now, 0.015);
            panner.positionZ.setTargetAtTime(position.z, now, 0.015);
            setCurrentPosition(position);
        }
        panner.rolloffFactor = rolloffFactor;
        panner.coneInnerAngle = cone.innerAngle;
        panner.coneOuterAngle = cone.outerAngle;
    }, [position, rolloffFactor, cone, is3DActive, movementPattern, isAudioReady]);

    useEffect(() => {
        if (audioNodesRef.current.gain) {
            audioNodesRef.current.gain.gain.setTargetAtTime(volume, Tone.context.currentTime, 0.015);
        }
    }, [volume, isAudioReady]);

    const animate3DMovement = useCallback(() => {
        const { panner } = audioNodesRef.current;
        if (!panner || !isPlaying || movementPattern === 'static' || !is3DActive) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const time = (Date.now() - startTimeRef.current) / 1000;
        const speed = movementSpeed;
        let newPos = { ...position };

        switch (movementPattern) {
            case 'circle':
                newPos.x = Math.cos(time * speed) * distance;
                newPos.z = Math.sin(time * speed) * distance;
                break;
            case 'spiral':
                const radius = 2 + Math.sin(time * speed * 0.5) * 3;
                newPos.x = Math.cos(time * speed) * radius;
                newPos.y = Math.sin(time * speed * 0.7) * 2;
                newPos.z = Math.sin(time * speed) * radius;
                break;
            case 'leftright':
                newPos.x = Math.sin(time * speed) * distance;
                break;
            case 'infinity':
                newPos.x = Math.sin(time * speed) * distance;
                newPos.z = Math.sin(time * speed * 2) * distance / 2;
                break;
        }
        const now = Tone.context.currentTime;
        panner.positionX.setTargetAtTime(newPos.x, now, 0.01);
        panner.positionY.setTargetAtTime(newPos.y, now, 0.01);
        panner.positionZ.setTargetAtTime(newPos.z, now, 0.01);
        setCurrentPosition(newPos);
        animationFrameRef.current = requestAnimationFrame(animate3DMovement);
    }, [isPlaying, movementPattern, movementSpeed, distance, position, is3DActive]);

    const togglePlay = useCallback(async () => {
        if (!isAudioGloballyReady) await startGlobalAudio();
        if (!isAudioReady || isLoadingAudio) return;

        if (isPlaying) {
            audioNodesRef.current.source?.stop();
            setIsPlaying(false);
        } else {
            const source = Tone.context.rawContext.createBufferSource();
            source.buffer = currentAudioBufferRef.current;
            source.loop = true;
            const destination = is3DActive ? audioNodesRef.current.panner : audioNodesRef.current.gain;
            source.connect(destination);
            source.start();
            audioNodesRef.current.source = source;
            startTimeRef.current = Date.now();
            setIsPlaying(true);
        }
    }, [isPlaying, isAudioReady, isLoadingAudio, isAudioGloballyReady, startGlobalAudio, is3DActive]);

    useEffect(() => {
        if (isPlaying) {
            animate3DMovement();
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, animate3DMovement]);

    const handleFileUpload = useCallback(async (file) => {
        if (!file || file.size > MAX_FILE_SIZE) {
            setAudioLoadError(file ? `File too large (Max 50MB)` : 'No file selected');
            return;
        }
        setAudioFileName(file.name);
        setHasAudioFile(false);
        if (isPlaying) disposeAudioNodes();
        if (!isAudioGloballyReady) await startGlobalAudio();
        setIsLoadingAudio(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await Tone.context.rawContext.decodeAudioData(arrayBuffer);
            await initAudioNodes(audioBuffer);
            setHasAudioFile(true);
        } catch (error) {
            setAudioLoadError(`Failed to load audio: ${error.message}`);
            disposeAudioNodes();
        } finally {
            setIsLoadingAudio(false);
        }
    }, [isAudioGloballyReady, startGlobalAudio, initAudioNodes, disposeAudioNodes, isPlaying]);

    const applyPreset = useCallback((presetName) => {
        const preset = AUDIO_3D_PRESETS[presetName];
        if (preset) {
            setDistance(preset.distance);
            setPosition(preset.position);
            setRolloffFactor(preset.rolloffFactor);
            setCone(preset.cone);
            setMovementSpeed(preset.movementSpeed);
            setMovementPattern(preset.movementPattern);
            setSelectedPreset(presetName);
        }
    }, []);

    const reset3DAudio = useCallback(() => {
        applyPreset('Default');
        setIs3DActive(true);
        setVolume(0.7);
    }, [applyPreset]);

    const getFrequencyData = useCallback(() => {
        const { analyser } = audioNodesRef.current;
        if (analyser && isPlaying) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            return dataArray;
        }
        return new Uint8Array(256).fill(0);
    }, [isPlaying]);

    const downloadProcessed3DAudio = useCallback(async () => {
        if (!currentAudioBufferRef.current || isDownloading || !is3DActive) {
            if (!is3DActive) setAudioLoadError("Cannot download with 3D bypassed.");
            return;
        }
        setIsDownloading(true);
        setAudioLoadError(null);
        try {
            const originalBuffer = currentAudioBufferRef.current;
            // CRITICAL FIX: Force stereo output to capture spatialization from mono sources
            const offlineContext = new OfflineAudioContext(2, originalBuffer.length, originalBuffer.sampleRate);
            const source = offlineContext.createBufferSource();
            source.buffer = originalBuffer;
            const panner = offlineContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.rolloffFactor = rolloffFactor;
            panner.coneInnerAngle = cone.innerAngle;
            panner.coneOuterAngle = cone.outerAngle;
            const gain = offlineContext.createGain();
            gain.gain.value = volume;
            source.connect(panner).connect(gain).connect(offlineContext.destination);

            if (movementPattern !== 'static') {
                const duration = originalBuffer.duration;
                const steps = Math.floor(duration * 60);
                for (let i = 0; i <= steps; i++) {
                    const time = (i / steps) * duration;
                    const speed = movementSpeed;
                    let newPos = { ...position };
                    switch (movementPattern) {
                        case 'circle': newPos.x = Math.cos(time * speed) * distance; newPos.z = Math.sin(time * speed) * distance; break;
                        case 'spiral': const r = 2 + Math.sin(time * speed * 0.5) * 3; newPos.x = Math.cos(time * speed) * r; newPos.y = Math.sin(time * speed * 0.7) * 2; newPos.z = Math.sin(time * speed) * r; break;
                        case 'leftright': newPos.x = Math.sin(time * speed) * distance; break;
                        case 'infinity': newPos.x = Math.sin(time * speed) * distance; newPos.z = Math.sin(time * speed * 2) * distance / 2; break;
                    }
                    panner.positionX.setValueAtTime(newPos.x, time);
                    panner.positionY.setValueAtTime(newPos.y, time);
                    panner.positionZ.setValueAtTime(newPos.z, time);
                }
            } else {
                panner.positionX.value = position.x; panner.positionY.value = position.y; panner.positionZ.value = position.z;
            }
            source.start(0);
            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = audioBufferToWav(renderedBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${audioFileName.split('.').slice(0, -1).join('.') || 'audio'}-3d.wav`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
        } catch (e) {
            setAudioLoadError("Failed to render audio. See console.");
        } finally {
            setIsDownloading(false);
        }
    }, [currentAudioBufferRef, position, rolloffFactor, cone, volume, audioFileName, isDownloading, movementPattern, movementSpeed, distance, is3DActive]);

    return {
        isPlaying, togglePlay, isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadProcessed3DAudio, handleFileUpload, audioFileName, hasAudioFile,
        getFrequencyData, position, setPosition, distance, setDistance,
        rolloffFactor, setRolloffFactor, cone, setCone, movementSpeed, setMovementSpeed,
        movementPattern, setMovementPattern, is3DActive, setIs3DActive, volume, setVolume,
        currentPosition, selectedPreset, applyPreset, reset3DAudio
    };
};

// --- UI Components ---

const ParameterSlider = ({ label, value, onChange, min, max, step, unit = '', disabled = false }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return (
        <div className={`flex flex-col items-center w-full p-3 rounded-lg transition-opacity ${disabled ? 'opacity-50' : ''}`}>
            <label className="text-cyan-200 text-sm font-medium mb-2">{label}</label>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} disabled={disabled} className="w-full h-2 bg-cyan-800 rounded appearance-none cursor-pointer disabled:cursor-not-allowed" style={{ background: `linear-gradient(to right, #06b6d4 ${percentage}%, #0e7490 ${percentage}%)` }} />
            <span className="mt-2 text-sm text-cyan-300 font-mono">{value.toFixed(unit === "°" ? 0 : 2)}{unit}</span>
        </div>
    );
};

// --- NEW: Interactive 3D Visualizer Component ---
const ThreeDVisualizer = ({ position, onPositionChange, isActive, isMovementActive }) => {
    const mountRef = useRef(null);
    const threeRef = useRef({});

    // Setup the 3D scene
    useEffect(() => {
        const { current: mount } = mountRef;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        camera.position.set(0, 5, 12);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);

        const controls = new ThreeOrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.minPolarAngle = Math.PI / 4;
        controls.maxPolarAngle = 3 * Math.PI / 4;

        // Lighting
        scene.add(new THREE.AmbientLight(0xcccccc, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        // Grid helper
        const grid = new THREE.GridHelper(20, 10, 0x00ffff, 0x444444);
        grid.position.y = -2;
        scene.add(grid);

        // Sound source orb
        const orbGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const orbMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        scene.add(orb);

        // Listener representation (simple)
        const listenerGeo = new THREE.TorusGeometry(0.5, 0.2, 16, 40);
        const listenerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
        const listener = new THREE.Mesh(listenerGeo, listenerMat);
        listener.rotation.x = Math.PI / 2;
        scene.add(listener);

        // Drag-and-drop plane
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const intersectPoint = new THREE.Vector3();
        let isDragging = false;

        const onMouseDown = () => { if (isActive && !isMovementActive) isDragging = true; };
        const onMouseUp = () => { isDragging = false; };
        const onMouseMove = (event) => {
            if (!isDragging) return;
            const bounds = mount.getBoundingClientRect();
            mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
            mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
                const newX = Math.max(-10, Math.min(10, intersectPoint.x));
                const newZ = Math.max(-10, Math.min(10, intersectPoint.z));
                onPositionChange({ x: newX, y: position.y, z: newZ });
            }
        };

        mount.addEventListener('mousedown', onMouseDown);
        mount.addEventListener('mouseup', onMouseUp);
        mount.addEventListener('mouseleave', onMouseUp);
        mount.addEventListener('mousemove', onMouseMove);

        threeRef.current = { renderer, scene, camera, controls, orb };

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            mount.removeEventListener('mousedown', onMouseDown);
            mount.removeEventListener('mouseup', onMouseUp);
            mount.removeEventListener('mouseleave', onMouseUp);
            mount.removeEventListener('mousemove', onMouseMove);
            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [isActive, isMovementActive, onPositionChange, position.y]);

    // Update orb position from external state
    useEffect(() => {
        const { orb } = threeRef.current;
        if (orb) {
            orb.position.set(position.x, position.y, position.z);
        }
    }, [position]);

    return <div ref={mountRef} className={`w-full h-64 rounded-xl cursor-grab active:cursor-grabbing transition-opacity ${!isActive ? 'opacity-40' : ''}`} />;
};


const UploadSection = ({ onFileUpload, isLoading }) => {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); }, []);
    const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) onFileUpload(e.dataTransfer.files[0]); }, [onFileUpload]);
    const handleFileSelect = useCallback((e) => { if (e.target.files?.[0]) onFileUpload(e.target.files[0]); }, [onFileUpload]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-900 text-white font-sans">
            <div className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">3D Spatial Audio Processor</h1>
                <p className="text-cyan-300 text-lg sm:text-xl">Upload an audio file to experience immersive 3D sound.</p>
            </div>
            <div className={`relative w-full max-w-lg border-2 border-dashed rounded-xl p-10 sm:p-12 text-center cursor-pointer transition-colors duration-300 ${dragActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-cyan-600 hover:border-cyan-400 hover:bg-cyan-900/10'}`} onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                {isLoading ? (<><Loader2 size={48} className="mx-auto mb-4 text-cyan-400 animate-spin" /><p className="text-white text-lg">Processing Audio...</p></>) : (<><Upload size={48} className="mx-auto mb-4 text-cyan-400" /><p className="text-white text-lg">Click or Drag File Here</p><p className="text-cyan-300 text-sm">Max 50MB</p></>)}
            </div>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
        </div>
    );
};

const ThreeDAudioContent = () => {
    const processor = use3DAudioProcessor();
    const { isPlaying, isAudioReady, isLoadingAudio, audioLoadError, hasAudioFile, handleFileUpload, audioFileName, getFrequencyData, movementPattern, currentPosition, is3DActive, setPosition } = processor;
    const canvasRef = useRef(null);
    const visAnimationRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !isPlaying) {
            if (visAnimationRef.current) cancelAnimationFrame(visAnimationRef.current);
            return;
        };
        const ctx = canvasRef.current.getContext('2d');
        const draw = () => {
            const freqData = getFrequencyData();
            const width = canvasRef.current.width, height = canvasRef.current.height;
            ctx.clearRect(0, 0, width, height);
            const barWidth = width / freqData.length;
            ctx.fillStyle = '#06b6d4';
            for (let i = 0; i < freqData.length; i++) {
                ctx.fillRect(i * barWidth, height - (freqData[i] / 255) * height, barWidth, (freqData[i] / 255) * height);
            }
            visAnimationRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => { if (visAnimationRef.current) cancelAnimationFrame(visAnimationRef.current); };
    }, [isPlaying, getFrequencyData]);

    if (!hasAudioFile) {
        return <UploadSection onFileUpload={handleFileUpload} isLoading={isLoadingAudio} />;
    }

    const isMovementActive = movementPattern !== 'static';

    return (
        <>
            <SEOHead 
                pageId="3D-audio-studio" 
                tool={threeDAudioStudioTool} 
                customData={{}} 
            />

            <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-6 bg-gray-900 text-white font-sans">
                <main className="w-full max-w-5xl mx-auto">
                    <div className="text-center mb-4">
                        <h1 className="text-3xl font-bold text-white">3D Spatial Audio</h1>
                        {isAudioReady && <p className="text-cyan-300 mt-1 truncate">Now Playing: {audioFileName}</p>}
                        {audioLoadError && <p className="text-red-400 mt-2 font-medium">Error: {audioLoadError}</p>}
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-3 mb-6 p-3 bg-black/20 rounded-xl ring-1 ring-white/10 shadow-lg">
                        <button onClick={processor.togglePlay} disabled={!isAudioReady || isLoadingAudio} className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"><_components.PlayPauseIcon isPlaying={isPlaying} /><span>{isPlaying ? 'Stop' : 'Play'}</span></button>
                        <label className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-2 transition"><Upload size={16} /><span>New File</span><input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" /></label>
                        <button onClick={processor.downloadProcessed3DAudio} disabled={!isAudioReady || processor.isDownloading || !is3DActive} className="px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed">{processor.isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}<span>{processor.isDownloading ? 'Processing...' : 'Download'}</span></button>
                        <button onClick={processor.reset3DAudio} className="px-4 py-2 rounded-full bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2 transition"><RotateCcw size={16} /><span>Reset</span></button>
                    </div>

                    <div className="mb-6 p-4 bg-black/20 rounded-xl ring-1 ring-white/10 shadow-lg backdrop-blur-sm">
                        <h3 className="text-white text-lg font-semibold mb-3 text-center">Spatial Presets</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {Object.keys(AUDIO_3D_PRESETS).map(name => (<button key={name} onClick={() => processor.applyPreset(name)} className={`py-2 px-3 rounded-md text-sm transition ${processor.selectedPreset === name ? 'bg-cyan-500 text-white font-bold' : 'bg-gray-700 text-cyan-200 hover:bg-gray-600'}`}>{name}</button>))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 items-start">
                        <div className="flex flex-col gap-4 p-4 bg-black/20 rounded-xl ring-1 ring-white/10 shadow-lg backdrop-blur-sm">
                            <ThreeDVisualizer position={currentPosition} onPositionChange={setPosition} isActive={is3DActive} isMovementActive={isMovementActive} />
                            <canvas ref={canvasRef} width={512} height={100} className="w-full h-24 bg-black/30 rounded-lg border border-cyan-500/20"></canvas>
                            <button onClick={() => processor.setIs3DActive(p => !p)} className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition ${is3DActive ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>{is3DActive ? <Headphones size={20} /> : <AlertCircle size={20} />}<span>{is3DActive ? '3D Audio Active' : '3D Audio Bypassed'}</span></button>
                        </div>

                        <div className="flex flex-col gap-4 p-4 bg-black/20 rounded-xl ring-1 ring-white/10 shadow-lg backdrop-blur-sm">
                            <div className="p-3 bg-gray-900/50 rounded-lg"><ParameterSlider label="Volume" value={processor.volume} onChange={processor.setVolume} min={0} max={1} step={0.01} /></div>
                            <h3 className="text-white text-lg font-semibold text-center mt-2">3D Parameters</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Position X" value={processor.position.x} onChange={v => setPosition(p => ({ ...p, x: v }))} min={-10} max={10} step={0.1} disabled={!is3DActive || isMovementActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Position Y" value={processor.position.y} onChange={v => setPosition(p => ({ ...p, y: v }))} min={-10} max={10} step={0.1} disabled={!is3DActive || isMovementActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Position Z" value={processor.position.z} onChange={v => setPosition(p => ({ ...p, z: v }))} min={-10} max={10} step={0.1} disabled={!is3DActive || isMovementActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Rolloff" value={processor.rolloffFactor} onChange={processor.setRolloffFactor} min={0} max={4} step={0.1} disabled={!is3DActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Cone Inner" value={processor.cone.innerAngle} onChange={v => processor.setCone(c => ({ ...c, innerAngle: v }))} min={0} max={360} step={1} unit="°" disabled={!is3DActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Cone Outer" value={processor.cone.outerAngle} onChange={v => processor.setCone(c => ({ ...c, outerAngle: v }))} min={0} max={360} step={1} unit="°" disabled={!is3DActive} /></div>
                            </div>
                            <h3 className="text-white text-lg font-semibold text-center mt-2">Movement</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Distance" value={processor.distance} onChange={processor.setDistance} min={0} max={10} step={0.1} disabled={!is3DActive || !isMovementActive} /></div>
                                <div className="bg-gray-900/50 rounded-lg"><ParameterSlider label="Speed" value={processor.movementSpeed} onChange={processor.setMovementSpeed} min={0} max={5} step={0.1} disabled={!is3DActive || !isMovementActive} /></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

// Helper component to avoid prop-drilling for the play/pause icon
const _components = {
    PlayPauseIcon: ({ isPlaying }) => isPlaying ? <Pause size={16} /> : <Play size={16} />
}

export default function App() {
    return (
        <AudioContextProvider>
            <ThreeDAudioContent />
        </AudioContextProvider>
    );
}

