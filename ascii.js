const videoInput = document.getElementById('videoInput');
const videoElement = document.getElementById('videoElement');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const asciiOutput = document.getElementById('asciiOutput');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const widthSlider = document.getElementById('widthSlider');
const contrastSlider = document.getElementById('contrastSlider');
const fpsSlider = document.getElementById('fpsSlider');
const charSetSelect = document.getElementById('charSet');
const colorModeSelect = document.getElementById('colorMode');
const fullscreenControls = document.getElementById('fullscreenControls');
const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
const playFsBtn = document.getElementById('playFsBtn');
const pauseFsBtn = document.getElementById('pauseFsBtn');
const fileLabel = document.getElementById('fileLabel');
const videoPlaceholder = document.getElementById('videoPlaceholder');

let isPlaying = false;
let isFullscreen = false;
let animationId = null;
let frameCount = 0;
let lastTime = 0;
let fps = 0;
let targetFps = 30;
let frameInterval = 1000 / 30;
let then = Date.now();
let currentBlobUrl = null;

const charSets = {
    standard: ' .:-=+*#%@',
    detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    blocks: ' ░▒▓█',
    binary: ' 01',
    matrix: ' ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ012345789Z'
};

// Update slider values
widthSlider.addEventListener('input', (e) => {
    document.getElementById('widthValue').textContent = e.target.value;
});

contrastSlider.addEventListener('input', (e) => {
    document.getElementById('contrastValue').textContent = e.target.value;
});

fpsSlider.addEventListener('input', (e) => {
    targetFps = parseInt(e.target.value);
    frameInterval = 1000 / targetFps;
    document.getElementById('fpsValue').textContent = e.target.value;
});

// File input handling
videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
        }
        fileLabel.textContent = file.name;
        currentBlobUrl = URL.createObjectURL(file);
        videoElement.src = currentBlobUrl;

        videoElement.addEventListener('loadedmetadata', () => {
            if (videoPlaceholder) videoPlaceholder.style.display = 'none';
            videoElement.style.display = 'block';
            playBtn.disabled = false;
            fullscreenBtn.disabled = false;
            exportBtn.disabled = false;

            const duration = videoElement.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            document.getElementById('durationDisplay').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('resolutionDisplay').textContent = 
                `${videoElement.videoWidth}×${videoElement.videoHeight}`;
            document.getElementById('totalTime').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, { once: true });

        videoElement.addEventListener('error', () => {
            asciiOutput.textContent = 'Error loading video. Please try another file or ensure the app is running on a local server.';
            playBtn.disabled = true;
            pauseBtn.disabled = true;
            fullscreenBtn.disabled = true;
            exportBtn.disabled = true;
        });

        videoElement.addEventListener('waiting', () => {
            isPlaying = false;
            if (animationId) cancelAnimationFrame(animationId);
            asciiOutput.textContent = 'Buffering video...';
        });

        videoElement.addEventListener('playing', () => {
            if (!isPlaying && !videoElement.paused) {
                isPlaying = true;
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                then = Date.now();
                animate(0);
            }
        });
    }
});

function rgbToAscii(r, g, b, chars) {
    const brightness = (r + g + b) / 3;
    const contrast = parseFloat(contrastSlider.value);
    const adjusted = Math.min(255, Math.max(0, (brightness - 128) * contrast + 128));
    const index = Math.floor((adjusted / 255) * (chars.length - 1));
    return chars[index];
}

function getColorStyle(r, g, b, mode) {
    switch(mode) {
        case 'mono': return '';
        case 'green': return `color: rgb(0, ${Math.min(255, g + 100)}, 0);`;
        case 'amber': return `color: rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 50)}, 0);`;
        case 'color': return `color: rgb(${r}, ${g}, ${b});`;
        case 'neon': 
            const avg = (r + g + b) / 3;
            if (avg > 170) return `color: #ff00ff; text-shadow: 0 0 3px #ff00ff;`;
            if (avg > 85) return `color: #00ffff; text-shadow: 0 0 3px #00ffff;`;
            return `color: #00ff00; text-shadow: 0 0 3px #00ff00;`;
        default: return '';
    }
}

function frameToAscii() {
    let width = parseInt(widthSlider.value);
    
    if (isFullscreen) {
        width = Math.min(350, width * 3);
    }
    
    const height = Math.floor((width * videoElement.videoHeight) / videoElement.videoWidth / 2);
    
    canvas.width = width;
    canvas.height = height;
    try {
        ctx.drawImage(videoElement, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const chars = charSets[charSetSelect.value];
        const colorMode = colorModeSelect.value;
        
        let output = '';
        
        if (colorMode === 'mono' || colorMode === 'green' || colorMode === 'amber') {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    output += rgbToAscii(pixels[i], pixels[i + 1], pixels[i + 2], chars);
                }
                output += '\n';
            }
            
            if (colorMode === 'green') {
                asciiOutput.style.color = '#00ff41';
                asciiOutput.style.textShadow = '0 0 2px #00ff41';
            } else if (colorMode === 'amber') {
                asciiOutput.style.color = '#ffb000';
                asciiOutput.style.textShadow = '0 0 2px #ffb000';
            } else {
                asciiOutput.style.color = '#fff';
                asciiOutput.style.textShadow = 'none';
            }
            asciiOutput.textContent = output;
        } else {
            let html = '';
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const char = rgbToAscii(pixels[i], pixels[i + 1], pixels[i + 2], chars);
                    const style = getColorStyle(pixels[i], pixels[i + 1], pixels[i + 2], colorMode);
                    if (style) {
                        html += `<span style="${style}">${char}</span>`;
                    } else {
                        html += char;
                    }
                }
                html += '\n';
            }
            asciiOutput.innerHTML = html;
        }
        
        return output;
    } catch (e) {
        asciiOutput.textContent = 'Canvas error: Unable to process video. Please run the app on a local server (e.g., http://localhost) to avoid security restrictions.';
        isPlaying = false;
        if (animationId) cancelAnimationFrame(animationId);
        return '';
    }
}

function updateTime() {
    const current = videoElement.currentTime;
    const minutes = Math.floor(current / 60);
    const seconds = Math.floor(current % 60);
    document.getElementById('currentTime').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function animate(currentTime) {
    if (!isPlaying || videoElement.paused || videoElement.ended) {
        if (animationId) cancelAnimationFrame(animationId);
        if (videoElement.ended) {
            isPlaying = false;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            playBtn.textContent = '▶ REPLAY';
            playFsBtn.style.display = 'block';
            pauseFsBtn.style.display = 'none';
        }
        return;
    }
    
    animationId = requestAnimationFrame(animate);
    
    const now = Date.now();
    const elapsed = now - then;
    
    if (elapsed > frameInterval) {
        then = now - (elapsed % frameInterval);
        
        frameCount++;
        if (currentTime - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = currentTime;
            document.getElementById('fpsDisplay').textContent = fps;
        }
        
        frameToAscii();
        
        const currentFrame = Math.floor(videoElement.currentTime * targetFps);
        document.getElementById('frameDisplay').textContent = currentFrame;
        
        const progress = (videoElement.currentTime / videoElement.duration) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        
        updateTime();
    }
}

playBtn.addEventListener('click', () => {
    if (videoElement.ended) {
        videoElement.currentTime = 0;
    }
    isPlaying = true;
    videoElement.play().catch(() => {
        asciiOutput.textContent = 'Playback error. Ensure the app is running on a local server.';
        isPlaying = false;
    });
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    playBtn.textContent = '▶ ENGAGE';
    then = Date.now();
    animate(0);
});

pauseBtn.addEventListener('click', () => {
    isPlaying = false;
    videoElement.pause();
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

// Fullscreen functionality
fullscreenBtn.addEventListener('click', () => {
    const asciiContainer = asciiOutput.parentElement; // Use parent for fullscreen
    if (asciiContainer.requestFullscreen) {
        asciiContainer.requestFullscreen().then(() => {
            isFullscreen = true;
            asciiOutput.classList.add('fullscreen');
            fullscreenControls.classList.add('active');
            document.body.style.overflow = 'hidden';

            if (!isPlaying && !videoElement.paused) {
                isPlaying = true;
                videoElement.play().catch(() => {
                    asciiOutput.textContent = 'Playback error in fullscreen. Ensure the app is running on a local server.';
                    isPlaying = false;
                });
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                playFsBtn.style.display = 'none';
                pauseFsBtn.style.display = 'block';
                then = Date.now();
                animate(0);
            }
        }).catch((err) => {
            asciiOutput.textContent = 'Failed to enter fullscreen: ' + err.message;
        });
    }
});

exitFullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
            isFullscreen = false;
            asciiOutput.classList.remove('fullscreen');
            fullscreenControls.classList.remove('active');
            document.body.style.overflow = 'auto';
        }).catch((err) => {
            asciiOutput.textContent = 'Failed to exit fullscreen: ' + err.message;
        });
    }
});

playFsBtn.addEventListener('click', () => {
    isPlaying = true;
    videoElement.play().catch(() => {
        asciiOutput.textContent = 'Playback error in fullscreen. Ensure the app is running on a local server.';
        isPlaying = false;
    });
    playFsBtn.style.display = 'none';
    pauseFsBtn.style.display = 'block';
    then = Date.now();
    animate(0);
});

pauseFsBtn.addEventListener('click', () => {
    isPlaying = false;
    videoElement.pause();
    playFsBtn.style.display = 'block';
    pauseFsBtn.style.display = 'none';
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

// Export functionality
exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span class="loading"></span> Processing...';
    
    const frames = [];
    const duration = videoElement.duration;
    const totalFrames = Math.floor(duration * targetFps);
    let currentFrame = 0;
    
    function captureFrame() {
        if (currentFrame >= totalFrames) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const metadata = `ASCII Video Export
Generated: ${new Date().toLocaleString()}
Resolution: ${widthSlider.value} chars
FPS: ${targetFps}
Total Frames: ${totalFrames}
Character Set: ${charSetSelect.value}
 ================================\n\n`;
            
            const blob = new Blob([metadata + frames.join('\n===FRAME===\n')], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ascii_video_${timestamp}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            exportBtn.disabled = false;
            exportBtn.textContent = '💾 EXPORT';
            return;
        }
        
        videoElement.currentTime = currentFrame / targetFps;
        setTimeout(() => {
            const frameData = frameToAscii();
            if (frameData) {
                frames.push(`Frame ${currentFrame + 1}:\n${frameData}`);
            }
            currentFrame++;
            const progress = Math.floor((currentFrame / totalFrames) * 100);
            exportBtn.innerHTML = `<span class="loading"></span> ${progress}%`;
            captureFrame();
        }, 50);
    }
    
    captureFrame();
});

// Reset button
resetBtn.addEventListener('click', () => {
    videoElement.pause();
    videoElement.currentTime = 0;
    isPlaying = false;
    isFullscreen = false;
    
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
    videoElement.src = '';
    if (videoPlaceholder) videoPlaceholder.style.display = 'block';
    videoElement.style.display = 'none';
    
    playBtn.disabled = true;
    pauseBtn.disabled = true;
    playBtn.textContent = '▶ ENGAGE';
    
    document.getElementById('fpsDisplay').textContent = '0';
    document.getElementById('frameDisplay').textContent = '0';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    
    widthSlider.value = 100;
    contrastSlider.value = 1.2;
    fpsSlider.value = 30;
    charSetSelect.value = 'standard';
    colorModeSelect.value = 'mono';
    
    document.getElementById('widthValue').textContent = '100';
    document.getElementById('contrastValue').textContent = '1.2';
    document.getElementById('fpsValue').textContent = '30';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
        exitFullscreenBtn.click();
    }
    if (e.key === 'f' && videoElement.src && !isFullscreen) {
        fullscreenBtn.click();
    }
    if (e.key === ' ' && videoElement.src) {
        e.preventDefault();
        if (isPlaying) {
            if (isFullscreen) pauseFsBtn.click();
            else pauseBtn.click();
        } else {
            if (isFullscreen) playFsBtn.click();
            else playBtn.click();
        }
    }
    if (e.key === 'ArrowRight' && videoElement.src) {
        videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 5);
    }
    if (e.key === 'ArrowLeft' && videoElement.src) {
        videoElement.currentTime = Math.max(0, videoElement.currentTime - 5);
    }
});

// Video scrubbing
videoElement.addEventListener('timeupdate', () => {
    if (!isPlaying) {
        frameToAscii();
        updateTime();
        const progress = (videoElement.currentTime / videoElement.duration) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
    }
});

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        isFullscreen = false;
        asciiOutput.classList.remove('fullscreen');
        fullscreenControls.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});