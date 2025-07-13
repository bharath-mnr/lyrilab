import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Upload, Play, Pause, Power, Loader2, Volume2, Download, Settings } from 'lucide-react';

// --- Enhanced Custom Hook for Advanced Bass Boosting Logic ---
const useBassBooster = () => {
    // Refs for Web Audio API nodes
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const audioBufferRef = useRef(null);

    // Core audio processing nodes
    const analyserNodeRef = useRef(null);
    const primaryBassFilterRef = useRef(null);
    const secondaryBassFilterRef = useRef(null);
    const subBassFilterRef = useRef(null);
    const compressorNodeRef = useRef(null);
    const masterGainNodeRef = useRef(null);
    const wetGainNodeRef = useRef(null);
    const dryGainNodeRef = useRef(null);
    
    // State management
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState(null);
    
    // Audio parameter state
    const [isFilterActive, setIsFilterActive] = useState(true);
    const [frequency, setFrequency] = useState(80);
    const [boost, setBoost] = useState(15);
    const [subBoost, setSubBoost] = useState(8);
    const [masterVolume, setMasterVolume] = useState(0.75);

    const setupAudioGraph = useCallback((context, source) => {
        // Primary bass filter (peaking)
        const primaryBassFilter = context.createBiquadFilter();
        primaryBassFilter.type = 'peaking';
        primaryBassFilter.frequency.value = frequency;
        primaryBassFilter.gain.value = boost;
        primaryBassFilter.Q.value = 1.2;

        // Secondary bass filter (lowshelf for warmth)
        const secondaryBassFilter = context.createBiquadFilter();
        secondaryBassFilter.type = 'lowshelf';
        secondaryBassFilter.frequency.value = 120;
        secondaryBassFilter.gain.value = boost * 0.6;

        // Sub-bass filter (highpass to clean up mud, then lowpass for sub emphasis)
        const subBassFilter = context.createBiquadFilter();
        subBassFilter.type = 'peaking';
        subBassFilter.frequency.value = 45;
        subBassFilter.gain.value = subBoost;
        subBassFilter.Q.value = 2;

        // Enhanced compressor for better dynamics
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.2;

        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        const masterGain = context.createGain();
        masterGain.gain.value = masterVolume;

        const wetGain = context.createGain();
        const dryGain = context.createGain();

        // Connect main audio graph
        source.connect(analyser);
        
        // Bass processing chain
        analyser.connect(primaryBassFilter);
        primaryBassFilter.connect(secondaryBassFilter);
        secondaryBassFilter.connect(subBassFilter);
        subBassFilter.connect(compressor);
        compressor.connect(wetGain);
        wetGain.connect(masterGain);

        // Dry signal path
        analyser.connect(dryGain);
        dryGain.connect(masterGain);

        masterGain.connect(context.destination);

        // Store references for live playback
        if (context instanceof AudioContext) {
            primaryBassFilterRef.current = primaryBassFilter;
            secondaryBassFilterRef.current = secondaryBassFilter;
            subBassFilterRef.current = subBassFilter;
            compressorNodeRef.current = compressor;
            analyserNodeRef.current = analyser;
            masterGainNodeRef.current = masterGain;
            wetGainNodeRef.current = wetGain;
            dryGainNodeRef.current = dryGain;
        }
        
        return { wetGain, dryGain };

    }, [frequency, boost, subBoost, masterVolume]);

    const loadAudioFile = useCallback(async (file) => {
        if (!file) return;
        setIsLoading(true);
        setError(null);
        
        // Stop any playing audio
        if (isPlaying) {
            sourceNodeRef.current?.stop();
            setIsPlaying(false);
        }
        setIsReady(false);

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            await audioContextRef.current.resume();

            const arrayBuffer = await file.arrayBuffer();
            
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error("Audio file is empty or could not be read.");
            }

            audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
            setIsReady(true);
        } catch (e) {
            console.error("Error decoding audio data:", e);
            let friendlyError = "Couldn't process this audio file. Please try a different file (MP3, WAV, FLAC are best).";
            if (e instanceof DOMException) {
                friendlyError = `Error decoding audio data: ${e.message}. This often happens with unsupported file types.`;
            } else if (e.message.includes("empty")) {
                friendlyError = e.message;
            }
            setError(friendlyError);
        } finally {
            setIsLoading(false);
        }
    }, [isPlaying]);

    const togglePlayback = useCallback(async () => {
        if (!isReady || isLoading) return;
        await audioContextRef.current.resume();

        if (isPlaying) {
            sourceNodeRef.current?.stop();
            setIsPlaying(false);
        } else {
            sourceNodeRef.current = audioContextRef.current.createBufferSource();
            sourceNodeRef.current.buffer = audioBufferRef.current;
            sourceNodeRef.current.loop = true;

            const { wetGain, dryGain } = setupAudioGraph(audioContextRef.current, sourceNodeRef.current);
            
            if (isFilterActive) {
                wetGain.gain.value = 1;
                dryGain.gain.value = 0;
            } else {
                wetGain.gain.value = 0;
                dryGain.gain.value = 1;
            }

            sourceNodeRef.current.start();
            sourceNodeRef.current.onended = () => setIsPlaying(false);
            setIsPlaying(true);
        }
    }, [isReady, isLoading, isPlaying, setupAudioGraph, isFilterActive]);
    
    const downloadProcessedAudio = useCallback(async () => {
        if (!audioBufferRef.current || isRendering) return;
        setIsRendering(true);
        setError(null);

        try {
            const offlineContext = new OfflineAudioContext(
                audioBufferRef.current.numberOfChannels,
                audioBufferRef.current.length,
                audioBufferRef.current.sampleRate
            );

            const offlineSource = offlineContext.createBufferSource();
            offlineSource.buffer = audioBufferRef.current;

            const { wetGain, dryGain } = setupAudioGraph(offlineContext, offlineSource);

            if (isFilterActive) {
                wetGain.gain.value = 1;
                dryGain.gain.value = 0;
            } else {
                wetGain.gain.value = 1;
                dryGain.gain.value = 1;
            }
            
            offlineSource.start();
            const renderedBuffer = await offlineContext.startRendering();
            
            const wavBlob = bufferToWave(renderedBuffer);
            
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `bass-enhanced-track.wav`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch(e) {
            console.error("Error rendering audio:", e);
            setError("Failed to render audio for download.");
        } finally {
            setIsRendering(false);
        }
    }, [audioBufferRef, isRendering, setupAudioGraph, isFilterActive]);

    function bufferToWave(abuffer) {
        let numOfChan = abuffer.numberOfChannels,
            length = abuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        setUint32(0x46464952);
        setUint32(length - 8);
        setUint32(0x45564157);

        setUint32(0x20746d66);
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);

        setUint32(0x61746164);
        setUint32(length - pos - 4);

        for(i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while(pos < length) {
            for(i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++
        }

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }

        return new Blob([buffer], {type: "audio/wav"});
    }

    // Update filter parameters in real-time
    useEffect(() => {
        if (isPlaying && wetGainNodeRef.current && dryGainNodeRef.current) {
            const context = audioContextRef.current;
            if (isFilterActive) {
                wetGainNodeRef.current.gain.setTargetAtTime(1, context.currentTime, 0.015);
                dryGainNodeRef.current.gain.setTargetAtTime(0, context.currentTime, 0.015);
            } else {
                wetGainNodeRef.current.gain.setTargetAtTime(0, context.currentTime, 0.015);
                dryGainNodeRef.current.gain.setTargetAtTime(1, context.currentTime, 0.015);
            }
        }
    }, [isFilterActive, isPlaying]);

    useEffect(() => {
        if (audioContextRef.current?.state === 'running') {
            const context = audioContextRef.current;
            if (primaryBassFilterRef.current) {
                primaryBassFilterRef.current.frequency.setTargetAtTime(frequency, context.currentTime, 0.01);
                primaryBassFilterRef.current.gain.setTargetAtTime(boost, context.currentTime, 0.01);
            }
            if (secondaryBassFilterRef.current) {
                secondaryBassFilterRef.current.gain.setTargetAtTime(boost * 0.6, context.currentTime, 0.01);
            }
            if (subBassFilterRef.current) {
                subBassFilterRef.current.gain.setTargetAtTime(subBoost, context.currentTime, 0.01);
            }
            if (masterGainNodeRef.current) {
                masterGainNodeRef.current.gain.setTargetAtTime(masterVolume, context.currentTime, 0.01);
            }
        }
    }, [frequency, boost, subBoost, masterVolume]);

    const getFrequencyData = useCallback(() => {
        if (analyserNodeRef.current && isPlaying) {
            const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
            analyserNodeRef.current.getByteFrequencyData(dataArray);
            return dataArray;
        }
        return new Uint8Array(256).fill(0);
    }, [isPlaying]);

    return {
        loadAudioFile, togglePlayback, getFrequencyData, downloadProcessedAudio,
        isReady, isPlaying, isLoading, isRendering, error,
        isFilterActive, setIsFilterActive,
        frequency, setFrequency,
        boost, setBoost,
        subBoost, setSubBoost,
        masterVolume, setMasterVolume,
    };
};

// --- Enhanced 3D Visualizer Component ---
const BassVisualizer = ({ getFrequencyData, boost, subBoost, isPlaying }) => {
    const mountRef = useRef(null);
    const animationFrameId = useRef(null);
    const orbRef = useRef(null);
    const originalPositionsRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        camera.position.z = 25;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);

        // Main orb
        const geometry = new THREE.IcosahedronGeometry(8, 6);
        originalPositionsRef.current = geometry.attributes.position.clone();
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0,
            metalness: 0.9,
            roughness: 0.1,
            wireframe: true,
        });
        orbRef.current = new THREE.Mesh(geometry, material);
        scene.add(orbRef.current);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0x00ffff, 1.5, 100);
        pointLight.position.set(15, 15, 15);
        scene.add(pointLight);

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);

            if (isPlaying && orbRef.current && originalPositionsRef.current) {
                const freqData = getFrequencyData();
                
                // Calculate bass values
                const bassBins = Math.floor(freqData.length * 0.15);
                const subBassBins = Math.floor(freqData.length * 0.08);
                
                let bassValue = 0;
                let subBassValue = 0;
                
                for (let i = 0; i < bassBins; i++) bassValue += freqData[i];
                for (let i = 0; i < subBassBins; i++) subBassValue += freqData[i];
                
                bassValue /= bassBins;
                subBassValue /= subBassBins;
                
                const normalizedBass = bassValue / 255;
                const normalizedSubBass = subBassValue / 255;
                
                // Update orb geometry
                const positions = orbRef.current.geometry.attributes.position;
                const originalPositions = originalPositionsRef.current;
                
                const bassDisplacement = THREE.MathUtils.clamp(normalizedBass * (boost / 3), 0, 8);
                const subBassDisplacement = THREE.MathUtils.clamp(normalizedSubBass * (subBoost / 4), 0, 6);
                
                for (let i = 0; i < positions.count; i++) {
                    const ox = originalPositions.getX(i);
                    const oy = originalPositions.getY(i);
                    const oz = originalPositions.getZ(i);
                    
                    const vertexVector = new THREE.Vector3(ox, oy, oz).normalize();
                    const totalDisplacement = bassDisplacement + subBassDisplacement;
                    const displacement = vertexVector.multiplyScalar(totalDisplacement);
                    
                    positions.setXYZ(i, ox + displacement.x, oy + displacement.y, oz + displacement.z);
                }
                positions.needsUpdate = true;

                // Update materials and colors
                const targetIntensity = (normalizedBass + normalizedSubBass) * 2;
                orbRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
                    orbRef.current.material.emissiveIntensity, 
                    targetIntensity, 
                    0.15
                );
                
                const hue = 0.5;
                const targetColor = new THREE.Color().setHSL(hue, 1, 0.5 + (boost / 50));
                orbRef.current.material.color.lerp(targetColor, 0.1);
                orbRef.current.material.emissive.lerp(targetColor, 0.1);
                
                pointLight.color.lerp(targetColor, 0.1);
                pointLight.intensity = 1.5 + (normalizedBass * 2);

                // Rotation
                orbRef.current.rotation.x += 0.002 + (normalizedBass * 0.01);
                orbRef.current.rotation.y += 0.002 + (normalizedSubBass * 0.01);

            } else if (orbRef.current) {
                // Rest state
                orbRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(orbRef.current.material.emissiveIntensity, 0, 0.1);
                const positions = orbRef.current.geometry.attributes.position;
                const originalPositions = originalPositionsRef.current;
                
                for (let i = 0; i < positions.count; i++) {
                    const ox = originalPositions.getX(i), oy = originalPositions.getY(i), oz = originalPositions.getZ(i);
                    const currentX = positions.getX(i), currentY = positions.getY(i), currentZ = positions.getZ(i);
                    positions.setXYZ(
                        i,
                        THREE.MathUtils.lerp(currentX, ox, 0.1),
                        THREE.MathUtils.lerp(currentY, oy, 0.1),
                        THREE.MathUtils.lerp(currentZ, oz, 0.1)
                    );
                }
                positions.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId.current);
            if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [getFrequencyData, boost, subBoost, isPlaying]);

    return <div ref={mountRef} className="w-full h-80 md:h-96 rounded-lg cursor-grab active:cursor-grabbing bg-black/20" />;
};

// --- Main Studio Component ---
export default function BassBoosterStudio() {
    const {
        loadAudioFile, togglePlayback, getFrequencyData, downloadProcessedAudio,
        isReady, isPlaying, isLoading, isRendering, error,
        isFilterActive, setIsFilterActive,
        frequency, setFrequency,
        boost, setBoost,
        subBoost, setSubBoost,
        masterVolume, setMasterVolume,
    } = useBassBooster();

    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const presets = {
        "Subtle Warmth": { frequency: 85, boost: 8, subBoost: 4 },
        "Punchy Bass": { frequency: 95, boost: 15, subBoost: 8 },
        "Deep Rumble": { frequency: 65, boost: 18, subBoost: 12 },
        "Sub Monster": { frequency: 75, boost: 20, subBoost: 16 },
        "Club Thump": { frequency: 80, boost: 16, subBoost: 10 },
        "808 Style": { frequency: 60, boost: 22, subBoost: 18 },
    };

    const applyPreset = (preset) => {
        setFrequency(preset.frequency);
        setBoost(preset.boost);
        setSubBoost(preset.subBoost);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            loadAudioFile(file);
        }
    };

    const handleUploadClick = () => fileInputRef.current.click();

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-cyan-500/10 ring-1 ring-white/10 p-6 md:p-8">
                <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
                        Bass Booster Studio
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Professional bass enhancement tool
                    </p>
                </header>

                {!isReady && !isLoading && (
                    <div className="text-center">
                        <button 
                            onClick={handleUploadClick} 
                            className="w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-600 rounded-xl hover:border-cyan-400 hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
                        >
                            <Upload size={56} className="text-cyan-400 mb-4 animate-pulse"/>
                            <span className="font-semibold text-lg">Upload Audio File</span>
                            <span className="text-sm text-gray-500 mt-1">MP3, WAV, FLAC, OGG supported</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 size={56} className="animate-spin text-cyan-400 mr-4" />
                        <span className="text-xl">Analyzing Audio...</span>
                    </div>
                )}

                {error && (
                    <div className="text-center text-red-400 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
                        {error}
                    </div>
                )}

                {isReady && (
                    <main className="flex flex-col gap-6">
                        <div className="text-center">
                            <p className="text-gray-300 truncate mb-2" title={fileName}>
                                <span className="text-cyan-400 font-bold">{fileName}</span>
                            </p>
                            <div className="flex justify-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${isFilterActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    Bass Boost {isFilterActive ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </div>

                        <BassVisualizer 
                            getFrequencyData={getFrequencyData}
                            boost={boost} 
                            subBoost={subBoost}
                            isPlaying={isPlaying}
                        />

                        {/* Main Controls */}
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <button 
                                onClick={handleUploadClick} 
                                title="Upload New File" 
                                className="p-3 bg-gray-700 rounded-full hover:bg-cyan-600 transition-colors"
                            >
                                <Upload size={20} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />

                            <button 
                                onClick={togglePlayback} 
                                className="p-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-black shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 transform hover:scale-105"
                            >
                                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                            </button>

                            <button 
                                onClick={() => setIsFilterActive(p => !p)} 
                                title={isFilterActive ? 'Disable Bass Boost' : 'Enable Bass Boost'} 
                                className={`p-3 rounded-full transition-all duration-300 ${isFilterActive ? 'bg-green-500 shadow-green-500/30' : 'bg-red-600 shadow-red-500/30'}`}
                            >
                                <Power size={20} />
                            </button>
                            
                            <button 
                                onClick={downloadProcessedAudio} 
                                disabled={isRendering} 
                                title="Download Enhanced Audio" 
                                className="p-3 bg-gray-700 rounded-full hover:bg-cyan-600 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed"
                            >
                                {isRendering ? <Loader2 size={20} className="animate-spin"/> : <Download size={20} />}
                            </button>

                            <button 
                                onClick={() => setShowAdvanced(p => !p)} 
                                title="Advanced Settings" 
                                className={`p-3 rounded-full transition-colors ${showAdvanced ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                <Settings size={20} />
                            </button>
                        </div>

                        {/* Bass Enhancement Section */}
                        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6 rounded-xl border border-cyan-500/20">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                                <Volume2 size={20} />
                                Bass Enhancement
                            </h3>
                            
                            {/* Bass Presets */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-cyan-200 mb-2">Presets</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(presets).map(([name, values]) => (
                                        <button 
                                            key={name} 
                                            onClick={() => applyPreset(values)} 
                                            className="text-xs px-3 py-2 bg-cyan-800/30 rounded-lg hover:bg-cyan-600/50 transition-colors border border-cyan-500/20"
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bass Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-cyan-200 block mb-2">
                                        Bass Frequency: {frequency} Hz
                                    </label>
                                    <input 
                                        type="range" 
                                        min="40" 
                                        max="200" 
                                        step="1" 
                                        value={frequency} 
                                        onChange={(e) => setFrequency(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-cyan-200 block mb-2">
                                        Bass Boost: +{boost.toFixed(1)} dB
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="24" 
                                        step="0.5" 
                                        value={boost} 
                                        onChange={(e) => setBoost(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-cyan-200 block mb-2">
                                        Sub-Bass Boost: +{subBoost.toFixed(1)} dB
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="20" 
                                        step="0.5" 
                                        value={subBoost} 
                                        onChange={(e) => setSubBoost(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-cyan-200 block mb-2">
                                        Master Volume: {Math.round(masterVolume * 100)}%
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1.5" 
                                        step="0.05" 
                                        value={masterVolume} 
                                        onChange={(e) => setMasterVolume(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}