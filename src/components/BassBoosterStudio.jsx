import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Upload, Play, Pause, Power, Loader2 } from 'lucide-react';

// --- Custom Hook for Bass Boosting Logic ---
const useBassBooster = () => {
    // AudioContext instance, created on first user interaction.
    // This is crucial for browser autoplay policies and ensuring the context is active.
    const audioContextRef = useRef(null);
    // Current audio source node (BufferSourceNode). Needs to be recreated for each playback
    // because an AudioBufferSourceNode can only be started once.
    const sourceNodeRef = useRef(null);
    // BiquadFilter node for bass boosting.
    const filterNodeRef = useRef(null);
    // Analyser node for frequency data visualization.
    const analyserNodeRef = useRef(null);
    // Gain node for overall volume control (though not exposed in UI yet).
    const gainNodeRef = useRef(null);
    // Stores the decoded audio buffer.
    const audioBufferRef = useRef(null);

    // State variables for UI feedback and control.
    const [isReady, setIsReady] = useState(false); // True when an audio file is loaded and decoded.
    const [isPlaying, setIsPlaying] = useState(false); // True when audio is actively playing.
    const [isLoading, setIsLoading] = useState(false); // True when an audio file is being loaded/decoded.
    const [error, setError] = useState(null); // Stores any error messages for user feedback.
    const [isFilterActive, setIsFilterActive] = useState(true); // Controls whether the bass filter is applied.
    const [frequency, setFrequency] = useState(120); // Frequency cutoff for the bass filter (Hz), typical bass range.
    const [boost, setBoost] = useState(8); // Q factor for the bass filter (resonance/boost).

    /**
     * Sets up the core audio graph (filter, analyser, gain nodes and their connections).
     * This function ensures the main audio processing chain is correctly configured.
     * It does NOT create the source node, as that is handled just before playback starts.
     */
    const setupAudioGraph = useCallback(() => {
        // Initialize AudioContext if it doesn't exist. This is typically triggered by a user gesture.
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const context = audioContextRef.current;

        // Create or reconfigure the BiquadFilter node.
        if (!filterNodeRef.current) {
            filterNodeRef.current = context.createBiquadFilter();
        }
        filterNodeRef.current.type = 'lowpass'; // Emphasizes lower frequencies.
        filterNodeRef.current.frequency.value = frequency; // Set cutoff dynamically.
        filterNodeRef.current.Q.value = boost; // Set Q factor dynamically for resonance.

        // Create or reconfigure the Analyser node.
        if (!analyserNodeRef.current) {
            analyserNodeRef.current = context.createAnalyser();
            analyserNodeRef.current.fftSize = 256; // Defines the number of frequency bins for visualization.
        }

        // Create or reconfigure the Gain node.
        if (!gainNodeRef.current) {
            gainNodeRef.current = context.createGain();
            gainNodeRef.current.gain.value = 1; // Default volume.
        }

        // Disconnect any existing connections from these nodes to prevent multiple connections
        // when `setupAudioGraph` might be called multiple times (e.g., on filter toggle).
        filterNodeRef.current.disconnect();
        analyserNodeRef.current.disconnect();
        gainNodeRef.current.disconnect();

        // Connect the graph: Filter -> Analyser -> Gain -> Output.
        // The source node will connect to either the filter or the analyser directly, depending on `isFilterActive`.
        if (isFilterActive) {
            filterNodeRef.current.connect(analyserNodeRef.current);
        }
        analyserNodeRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(context.destination);

    }, [frequency, boost, isFilterActive]); // Dependencies ensure graph updates when these parameters change.

    /**
     * Loads and decodes an audio file. Includes error handling and loading state management.
     * @param {File} file - The audio file to load.
     */
    const loadAudioFile = useCallback(async (file) => {
        if (!file) return; // Quality control: Exit if no file is provided.
        setIsLoading(true); // Set loading state for UI feedback.
        setError(null); // Clear previous errors.
        setIsPlaying(false); // Stop any current playback before loading new audio.
        setIsReady(false); // Mark as not ready until new audio is decoded.

        // Ensure AudioContext is initialized and resumed. Browsers require user gestures
        // to start or resume an AudioContext to prevent unwanted autoplay.
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume().catch(e => {
                console.error("Failed to resume AudioContext:", e);
                setError("Browser prevented audio playback. Please interact with the page to enable audio.");
            });
        }

        try {
            const arrayBuffer = await file.arrayBuffer(); // Read file content as an ArrayBuffer.
            // Decode the audio data into an AudioBuffer. This is an asynchronous operation.
            audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
            setIsReady(true); // Mark as ready for playback.
        } catch (e) {
            console.error("Error decoding audio data:", e); // Log detailed error for debugging.
            setError("Couldn't process this audio file. Please try another one (e.g., MP3 or WAV)."); // User-friendly error message.
        } finally {
            setIsLoading(false); // Always reset loading state.
        }
    }, []);

    /**
     * Toggles audio playback (play/pause). Handles creating new source nodes and connecting them.
     */
    const togglePlayback = useCallback(async () => {
        // Quality control: Prevent actions if not ready or still loading.
        if (!isReady || isLoading) return;

        // Ensure AudioContext is initialized and resumed before attempting playback.
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume().catch(e => {
                console.error("Failed to resume AudioContext:", e);
                setError("Browser prevented audio playback. Please interact with the page to enable audio.");
            });
            // If context remains suspended, prevent playback
            if (audioContextRef.current.state !== 'running') return;
        }

        if (isPlaying) {
            // If currently playing, stop the source node.
            sourceNodeRef.current?.stop();
            sourceNodeRef.current?.disconnect(); // Disconnect to clean up the graph.
            sourceNodeRef.current = null; // Clear reference to allow garbage collection and new creation.
            setIsPlaying(false); // Update UI state.
        } else {
            // If not playing, prepare and start playback.
            if (!audioBufferRef.current) {
                setError("No audio buffer loaded. Please upload an audio file.");
                return; // Quality control: Exit if no audio data is available.
            }

            // Create a NEW AudioBufferSourceNode each time playback starts.
            // This is a fundamental requirement of the Web Audio API.
            sourceNodeRef.current = audioContextRef.current.createBufferSource();
            sourceNodeRef.current.buffer = audioBufferRef.current; // Assign the loaded audio buffer.
            sourceNodeRef.current.loop = true; // Loop the audio for continuous playback.

            // Set up the audio graph connections (filter, analyser, gain).
            setupAudioGraph();

            // Connect the source node to the appropriate starting point in the graph
            // based on whether the filter is active.
            if (isFilterActive) {
                sourceNodeRef.current.connect(filterNodeRef.current);
            } else {
                sourceNodeRef.current.connect(analyserNodeRef.current);
            }

            // Start playback.
            sourceNodeRef.current.start();
            setIsPlaying(true); // Update UI state.
        }
    }, [isReady, isLoading, isPlaying, isFilterActive, setupAudioGraph]);

    // Effect to update filter settings dynamically when frequency or boost changes.
    // `setTargetAtTime` is used for smooth parameter transitions, improving audio quality.
    useEffect(() => {
        if (filterNodeRef.current && audioContextRef.current && audioContextRef.current.state === 'running') {
            filterNodeRef.current.frequency.setTargetAtTime(frequency, audioContextRef.current.currentTime, 0.01);
            filterNodeRef.current.Q.setTargetAtTime(boost, audioContextRef.current.currentTime, 0.01);
        }
    }, [frequency, boost]);

    // Effect to handle filter bypass toggle.
    // When the filter state changes while playing, we stop and restart playback
    // to correctly re-route the audio graph. A small timeout ensures proper disconnection.
    useEffect(() => {
        if (isPlaying) {
            togglePlayback(); // Stop current playback.
            setTimeout(() => togglePlayback(), 50); // Restart with new graph connections after a slight delay.
        }
    }, [isFilterActive]); // eslint-disable-line react-hooks/exhaustive-deps -- togglePlayback dependency would cause infinite loop if included here.

    /**
     * Retrieves frequency data from the analyser node for visualization.
     * @returns {Uint8Array} - An array of frequency data (0-255 values).
     */
    const getFrequencyData = useCallback(() => {
        if (analyserNodeRef.current && isPlaying) {
            const bufferLength = analyserNodeRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserNodeRef.current.getByteFrequencyData(dataArray); // Populates dataArray with frequency data.
            return dataArray;
        }
        // Return a silent array if not playing or analyser not ready, ensuring visualizer doesn't break.
        return new Uint8Array(128).fill(0);
    }, [isPlaying]);

    return {
        loadAudioFile,
        togglePlayback,
        getFrequencyData,
        isReady,
        isPlaying,
        isLoading,
        error,
        isFilterActive,
        setIsFilterActive,
        frequency,
        setFrequency,
        boost,
        setBoost,
    };
};

// --- 3D Visualizer Component ---
const BassVisualizer = ({ getFrequencyData, boost, isPlaying }) => {
    const mountRef = useRef(null); // Ref for the DOM element where Three.js canvas will be mounted.
    const animationFrameId = useRef(null); // Stores the requestAnimationFrame ID for cleanup.
    const orbRef = useRef(null); // Ref for the main 3D orb object.

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return; // Quality control: Ensure mount ref is available before proceeding.

        // Scene, Camera, Renderer setup for Three.js.
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        camera.position.z = 25; // Position camera back to see the orb.

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Antialiasing for smooth edges, alpha for transparent background.
        renderer.setSize(mount.clientWidth, mount.clientHeight); // Set renderer size to match parent container.
        renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-DPI screens for better visual quality.
        mount.appendChild(renderer.domElement); // Add canvas to DOM.

        // OrbitControls allow user to rotate the camera with mouse/touch gestures.
        // This enhances interactivity and responsiveness.
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth camera movement.
        controls.enablePan = false; // Disable panning.
        controls.enableZoom = false; // Disable zooming.

        // The Core "Bass Orb" - an Icosahedron (a 20-sided polygon).
        const geometry = new THREE.IcosahedronGeometry(5, 3); // Radius 5, detail 3 for more vertices for a smoother shape.
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff, // Cyan base color.
            emissive: 0x00ffff, // Emissive color for glow effect.
            emissiveIntensity: 0, // Initial glow intensity (starts off).
            metalness: 0.8, // High metalness for a reflective look.
            roughness: 0.2, // Low roughness for a shiny appearance.
            wireframe: true, // Display as a wireframe.
        });
        orbRef.current = new THREE.Mesh(geometry, material);
        scene.add(orbRef.current);

        // Ambient Light to illuminate the scene generally.
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // Soft white light.
        scene.add(ambientLight);

        // Point Light for reflections and dynamic lighting effects.
        const pointLight = new THREE.PointLight(0x00ffff, 1, 100); // Cyan light, intensity 1, distance 100.
        pointLight.position.set(10, 10, 10); // Position the light.
        scene.add(pointLight);

        // Animation loop for the 3D visualizer.
        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate); // Request next frame for smooth animation.

            if (isPlaying && orbRef.current) {
                const freqData = getFrequencyData(); // Get current frequency data from the audio hook.
                // Calculate an average "bass" value from the lowest frequency bins.
                const bassBins = Math.floor(freqData.length * 0.1); // Consider lowest 10% of bins as bass frequencies.
                let bassValue = 0;
                for (let i = 0; i < bassBins; i++) {
                    bassValue += freqData[i];
                }
                bassValue /= bassBins;
                const normalizedBass = bassValue / 255; // Normalize to 0-1 range for easier scaling.

                // --- Visual Reactions based on bass and boost ---
                // 1. Scale pulsation: Orb expands and contracts with bass intensity, influenced by boost.
                const targetScale = 1 + normalizedBass * (boost / 10);
                orbRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1); // Lerp for smooth transitions.

                // 2. Glow (emissive intensity): Orb glows brighter with stronger bass.
                orbRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
                    orbRef.current.material.emissiveIntensity,
                    normalizedBass * 1.5, // Max glow intensity.
                    0.1
                );

                // 3. Color shift: Orb color shifts based on boost amount (more boost, more vibrant cyan).
                const targetColor = new THREE.Color().setHSL(0.5, 1, 0.5 + (boost / 30)); // Hue 0.5 is cyan.
                orbRef.current.material.color.lerp(targetColor, 0.1);
                orbRef.current.material.emissive.lerp(targetColor, 0.1);
                pointLight.color.lerp(targetColor, 0.1);


                // 4. Continuous Rotation for dynamic visual appeal.
                orbRef.current.rotation.x += 0.001;
                orbRef.current.rotation.y += 0.001;
            } else if (orbRef.current) {
                // If not playing, smoothly return orb to its idle state.
                orbRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); // Return to original scale.
                orbRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(orbRef.current.material.emissiveIntensity, 0, 0.1); // Fade out glow.
            }

            controls.update(); // Update OrbitControls for smooth camera interaction.
            renderer.render(scene, camera); // Render the scene.
        };

        animate(); // Start the animation loop.

        // Handle window resizing to make the visualizer fully responsive.
        const handleResize = () => {
            camera.aspect = mount.clientWidth / mount.clientHeight; // Adjust camera aspect ratio.
            camera.updateProjectionMatrix(); // Update camera projection matrix after aspect ratio change.
            renderer.setSize(mount.clientWidth, mount.clientHeight); // Resize renderer to fill the parent.
        };
        window.addEventListener('resize', handleResize);

        // Cleanup function for useEffect. This is crucial for preventing memory leaks
        // when the component unmounts or dependencies change.
        return () => {
            window.removeEventListener('resize', handleResize); // Remove resize listener.
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current); // Cancel the animation loop.
            }
            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement); // Remove canvas from DOM.
            }
            // Dispose of Three.js resources to free up GPU memory.
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            controls.dispose();
        };
    }, [getFrequencyData, boost, isPlaying]); // Dependencies ensure effect re-runs when these props change.

    // The visualizer container div. Tailwind classes ensure it's responsive.
    return <div ref={mountRef} className="w-full h-80 md:h-96 rounded-lg cursor-grab active:cursor-grabbing bg-black/20" />;
};


// --- Main Studio Component ---
function BassBoosterStudio() {
    // Destructure values and functions from the custom bass booster hook.
    const {
        loadAudioFile, togglePlayback, getFrequencyData,
        isReady, isPlaying, isLoading, error,
        isFilterActive, setIsFilterActive,
        frequency, setFrequency,
        boost, setBoost
    } = useBassBooster();

    const fileInputRef = useRef(null); // Ref for the hidden file input element.
    const [fileName, setFileName] = useState(''); // State to display the loaded file name.

    // Handler for when a file is selected.
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name); // Set the file name for display.
            loadAudioFile(file); // Load the audio file using the hook's function.
        }
    };

    // Handler to programmatically trigger the hidden file input click.
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    return (
        // Main container with responsive padding and centering.
        <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4">
            {/* Content card with responsive max-width, padding, and styling. */}
            <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-cyan-500/10 ring-1 ring-white/10 p-6 md:p-8">

                {/* Header section with responsive text sizing. */}
                <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-300">Bass Booster Studio</h1>
                    <p className="text-gray-400 mt-1">Upload audio and feel the bass.</p>
                </header>

                {/* Initial upload state: shown when no audio is loaded/loading. */}
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

                {/* Loading state: shown while audio is being processed. */}
                {isLoading && (
                    <div className="flex items-center justify-center p-10">
                        <Loader2 size={48} className="animate-spin text-cyan-400 mr-4" />
                        <span className="text-lg">Analyzing Audio...</span>
                    </div>
                )}

                {/* Error display: provides user feedback on issues. */}
                {error && <p className="text-center text-red-400 p-4">{error}</p>}

                {/* Main studio controls and visualizer: shown when audio is ready. */}
                {isReady && (
                    <main className="flex flex-col gap-6">
                        {/* Displays the loaded file name, truncated for long names. */}
                        <p className="text-center text-gray-300 truncate" title={fileName}>
                            Now Loaded: <span className="font-bold text-cyan-400">{fileName}</span>
                        </p>

                        {/* 3D Bass Visualizer component, which is responsive. */}
                        <BassVisualizer getFrequencyData={getFrequencyData} boost={boost} isPlaying={isPlaying} />

                        {/* Control sliders for Frequency and Boost. Uses responsive grid layout. */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-black/20 p-4 rounded-lg">
                            {/* Frequency Slider */}
                            <div className="flex flex-col">
                                <label htmlFor="frequency" className="text-sm font-medium text-cyan-200">Bass Frequency Cutoff</label>
                                <input id="frequency" type="range" min="40" max="250" step="1" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
                                <span className="text-xs text-right text-gray-400">{frequency} Hz</span>
                            </div>
                            {/* Boost Slider */}
                            <div className="flex flex-col">
                                <label htmlFor="boost" className="text-sm font-medium text-cyan-200">Boost / Resonance</label>
                                <input id="boost" type="range" min="0" max="20" step="0.5" value={boost} onChange={(e) => setBoost(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
                                <span className="text-xs text-right text-gray-400">{boost.toFixed(1)}</span>
                            </div>
                        </div>

                        {/* Playback and control buttons. Uses flexbox for alignment. */}
                        <div className="flex items-center justify-center gap-4">
                           {/* Upload New File Button */}
                           <button onClick={handleUploadClick} title="Upload New File" className="p-3 bg-gray-700 rounded-full hover:bg-cyan-600 transition-colors">
                                <Upload size={20} />
                           </button>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />

                            {/* Play/Pause Button */}
                            <button onClick={togglePlayback} className="p-4 bg-cyan-500 rounded-full text-black shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-transform hover:scale-105">
                                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                            </button>

                            {/* Toggle Bass Booster On/Off */}
                           <button onClick={() => setIsFilterActive(p => !p)} title={isFilterActive ? 'Disable Booster' : 'Enable Booster'} className={`p-3 rounded-full transition-colors ${isFilterActive ? 'bg-green-600' : 'bg-red-600'}`}>
                                <Power size={20} />
                           </button>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}

// Export the main component as default.
export default BassBoosterStudio;
