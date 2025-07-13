import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Upload, Play, Pause, Power, Loader2, Volume2, Download } from 'lucide-react';

// --- Custom Hook for Advanced Bass Boosting Logic ---
const useBassBooster = () => {
    // Refs for Web Audio API nodes
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const audioBufferRef = useRef(null);

    // Core audio processing nodes
    const analyserNodeRef = useRef(null);
    const filterNodeRef = useRef(null);
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
    const [boost, setBoost] = useState(12);
    const [masterVolume, setMasterVolume] = useState(0.8);

    const setupAudioGraph = useCallback((context, source) => {
        // This function sets up the graph for a given context (online or offline)
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.gain.value = boost;
        filter.Q.value = 1;

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -30;
        compressor.knee.value = 30;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.01;
        compressor.release.value = 0.25;

        const analyser = context.createAnalyser();
        analyser.fftSize = 256;

        const masterGain = context.createGain();
        masterGain.gain.value = masterVolume;

        const wetGain = context.createGain();
        const dryGain = context.createGain();

        // Connect graph
        source.connect(analyser);
        
        analyser.connect(filter);
        filter.connect(compressor);
        compressor.connect(wetGain);
        wetGain.connect(masterGain);

        analyser.connect(dryGain);
        dryGain.connect(masterGain);

        masterGain.connect(context.destination);

        // For live playback, store references to the nodes
        if (context instanceof AudioContext) {
            filterNodeRef.current = filter;
            compressorNodeRef.current = compressor;
            analyserNodeRef.current = analyser;
            masterGainNodeRef.current = masterGain;
            wetGainNodeRef.current = wetGain;
            dryGainNodeRef.current = dryGain;
        }
        
        // Return gains for bypass control
        return { wetGain, dryGain };

    }, [frequency, boost, masterVolume]);

    const loadAudioFile = useCallback(async (file) => {
        if (!file) return;
        setIsLoading(true);
        setError(null);
        if (isPlaying) {
            sourceNodeRef.current?.stop();
            setIsPlaying(false);
        }
        setIsReady(false);

        try {
            // Ensure AudioContext is initialized and running
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            await audioContextRef.current.resume();

            const arrayBuffer = await file.arrayBuffer();
            
            // Add a check for an empty buffer before attempting to decode
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error("Audio file is empty or could not be read.");
            }

            audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
            setIsReady(true);
        } catch (e) {
            console.error("Error decoding audio data:", e);
            // Provide a more detailed error message to the user
            let friendlyError = "Couldn't process this audio file. Please try a different file (MP3, WAV, FLAC are best). The file might be corrupted or in an unsupported format.";
            if (e instanceof DOMException) {
                friendlyError = `Error decoding audio data: ${e.message}. This often happens with unsupported file types or corrupted files.`;
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
    
    // --- DOWNLOAD LOGIC ---
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
                wetGain.gain.value = 1; // When bypassed, render the original
                dryGain.gain.value = 1;
            }
            
            offlineSource.start();
            const renderedBuffer = await offlineContext.startRendering();
            
            // Convert AudioBuffer to WAV blob
            const wavBlob = bufferToWave(renderedBuffer);
            
            // Trigger download
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'bass-boosted-track.wav';
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

    // Helper to convert AudioBuffer to a WAV file (Blob)
    function bufferToWave(abuffer) {
        let numOfChan = abuffer.numberOfChannels,
            length = abuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit audio

        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length

        // write interleaved data
        for(i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while(pos < length) {
            for(i = 0; i < numOfChan; i++) {             // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                view.setInt16(pos, sample, true);          // write 16-bit sample
                pos += 2;
            }
            offset++                                     // next source sample
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
            if (filterNodeRef.current) {
                filterNodeRef.current.frequency.setTargetAtTime(frequency, context.currentTime, 0.01);
                filterNodeRef.current.gain.setTargetAtTime(boost, context.currentTime, 0.01);
            }
            if (masterGainNodeRef.current) {
                masterGainNodeRef.current.gain.setTargetAtTime(masterVolume, context.currentTime, 0.01);
            }
        }
    }, [frequency, boost, masterVolume]);

    const getFrequencyData = useCallback(() => {
        if (analyserNodeRef.current && isPlaying) {
            const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
            analyserNodeRef.current.getByteFrequencyData(dataArray);
            return dataArray;
        }
        return new Uint8Array(128).fill(0);
    }, [isPlaying]);

    return {
        loadAudioFile, togglePlayback, getFrequencyData, downloadProcessedAudio,
        isReady, isPlaying, isLoading, isRendering, error,
        isFilterActive, setIsFilterActive,
        frequency, setFrequency,
        boost, setBoost,
        masterVolume, setMasterVolume,
    };
};

// --- 3D Visualizer Component ---
const BassVisualizer = ({ getFrequencyData, boost, isPlaying }) => {
    const mountRef = useRef(null);
    const animationFrameId = useRef(null);
    const orbRef = useRef(null);
    const originalPositionsRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        camera.position.z = 20;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableZoom = false;

        const geometry = new THREE.IcosahedronGeometry(7, 5);
        originalPositionsRef.current = geometry.attributes.position.clone();
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0,
            metalness: 0.8, roughness: 0.2, wireframe: true,
        });
        orbRef.current = new THREE.Mesh(geometry, material);
        scene.add(orbRef.current);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);

            if (isPlaying && orbRef.current && originalPositionsRef.current) {
                const freqData = getFrequencyData();
                const bassBins = Math.floor(freqData.length * 0.1);
                let bassValue = 0;
                for (let i = 0; i < bassBins; i++) bassValue += freqData[i];
                bassValue /= bassBins;
                const normalizedBass = bassValue / 255;

                const positions = orbRef.current.geometry.attributes.position;
                const originalPositions = originalPositionsRef.current;
                
                // Clamp displacement to prevent visual artifacts from going "out of the park"
                const displacementStrength = THREE.MathUtils.clamp(normalizedBass * (boost / 2), 0, 5);
                
                for (let i = 0; i < positions.count; i++) {
                    const ox = originalPositions.getX(i);
                    const oy = originalPositions.getY(i);
                    const oz = originalPositions.getZ(i);
                    const vertexVector = new THREE.Vector3(ox, oy, oz).normalize();
                    const displacement = vertexVector.multiplyScalar(displacementStrength);
                    positions.setXYZ(i, ox + displacement.x, oy + displacement.y, oz + displacement.z);
                }
                positions.needsUpdate = true;

                orbRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(orbRef.current.material.emissiveIntensity, normalizedBass * 1.5, 0.1);
                const targetColor = new THREE.Color().setHSL(0.5, 1, 0.5 + (boost / 40));
                orbRef.current.material.color.lerp(targetColor, 0.1);
                orbRef.current.material.emissive.lerp(targetColor, 0.1);
                pointLight.color.lerp(targetColor, 0.1);
                orbRef.current.rotation.x += 0.001;
                orbRef.current.rotation.y += 0.001;

            } else if (orbRef.current) {
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

            controls.update();
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
            geometry.dispose(); material.dispose(); renderer.dispose(); controls.dispose();
        };
    }, [getFrequencyData, boost, isPlaying]);

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
        masterVolume, setMasterVolume,
    } = useBassBooster();

    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('');

    const presets = {
        "Subtle Warmth": { frequency: 80, boost: 6 },
        "Punchy Kick": { frequency: 100, boost: 12 },
        "Deep Rumble": { frequency: 60, boost: 15 },
        "Max Rumble": { frequency: 70, boost: 20 },
    };

    const applyPreset = (preset) => {
        setFrequency(preset.frequency);
        setBoost(preset.boost);
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
            <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-cyan-500/10 ring-1 ring-white/10 p-6 md:p-8">
                <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-300">Bass Booster Studio</h1>
                    <p className="text-gray-400 mt-1">Upload, tweak, and download your perfect bass sound.</p>
                </header>

                {!isReady && !isLoading && (
                    <div className="text-center">
                        <button onClick={handleUploadClick} className="w-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-600 rounded-xl hover:border-cyan-400 hover:bg-gray-800 transition-colors">
                            <Upload size={48} className="text-cyan-400 mb-2"/>
                            <span className="font-semibold">Upload Audio File</span>
                            <span className="text-sm text-gray-500">MP3, WAV, etc.</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center p-10">
                        <Loader2 size={48} className="animate-spin text-cyan-400 mr-4" />
                        <span className="text-lg">Analyzing Audio...</span>
                    </div>
                )}

                {error && <p className="text-center text-red-400 p-4 bg-red-900/50 rounded-md">{error}</p>}

                {isReady && (
                    <main className="flex flex-col gap-6">
                        <p className="text-center text-gray-300 truncate" title={fileName}>
                            Now Loaded: <span className="font-bold text-cyan-400">{fileName}</span>
                        </p>

                        <BassVisualizer getFrequencyData={getFrequencyData} boost={boost} isPlaying={isPlaying} />

                        {/* Presets */}
                        <div className="bg-black/20 p-3 rounded-lg">
                            <h3 className="text-sm font-medium text-cyan-200 text-center mb-2">Presets</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(presets).map(([name, values]) => (
                                    <button key={name} onClick={() => applyPreset(values)} className="text-xs px-2 py-1.5 bg-gray-700 rounded-md hover:bg-cyan-600 transition-colors">
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-4 bg-black/20 p-4 rounded-lg">
                            <div className="flex flex-col">
                                <label htmlFor="frequency" className="text-sm font-medium text-cyan-200">Bass Frequency</label>
                                <input id="frequency" type="range" min="40" max="250" step="1" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
                                <span className="text-xs text-right text-gray-400">{frequency} Hz</span>
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="boost" className="text-sm font-medium text-cyan-200">Bass Boost</label>
                                <input id="boost" type="range" min="0" max="24" step="0.5" value={boost} onChange={(e) => setBoost(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
                                <span className="text-xs text-right text-gray-400">+{boost.toFixed(1)} dB</span>
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="volume" className="text-sm font-medium text-cyan-200 flex items-center gap-2"><Volume2 size={16}/> Master Volume</label>
                                <input id="volume" type="range" min="0" max="1.5" step="0.05" value={masterVolume} onChange={(e) => setMasterVolume(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
                                <span className="text-xs text-right text-gray-400">{Math.round(masterVolume * 100)}%</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4">
                           <button onClick={handleUploadClick} title="Upload New File" className="p-3 bg-gray-700 rounded-full hover:bg-cyan-600 transition-colors">
                                <Upload size={20} />
                           </button>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />

                            <button onClick={togglePlayback} className="p-4 bg-cyan-500 rounded-full text-black shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-transform hover:scale-105">
                                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                            </button>

                           <button onClick={() => setIsFilterActive(p => !p)} title={isFilterActive ? 'Disable Booster' : 'Enable Booster'} className={`p-3 rounded-full transition-colors ${isFilterActive ? 'bg-green-500 shadow-green-500/20' : 'bg-red-600 shadow-red-500/20'}`}>
                                <Power size={20} />
                           </button>
                           
                           <button onClick={downloadProcessedAudio} disabled={isRendering} title="Download as WAV" className="p-3 bg-gray-700 rounded-full hover:bg-cyan-600 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed">
                                {isRendering ? <Loader2 size={20} className="animate-spin"/> : <Download size={20} />}
                           </button>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}
