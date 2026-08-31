// 3D Racing Game - Main Logic
let scene, camera, renderer;
let car, track;
let gameStarted = false;
let gameState = {
    speed: 0,
    maxSpeed: 0.5,
    acceleration: 0.02,
    friction: 0.95,
    rotationSpeed: 0.08,
    lapCount: 0,
    totalTime: 0,
    checkpoints: []
};

const keys = {};
const TRACK_RADIUS = 100;
const TRACK_WIDTH = 25;

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    gameStarted = true;
    gameState.totalTime = 0;
    gameState.lapCount = 0;
    gameState.speed = 0;
}

function setupScene() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 300, 500);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 30);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -300;
    directionalLight.shadow.camera.right = 300;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    scene.add(directionalLight);
}

function createTrack() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Track outer ring
    const trackOuterGeometry = new THREE.TorusGeometry(TRACK_RADIUS + TRACK_WIDTH, TRACK_WIDTH * 2, 32, 100);
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const trackOuter = new THREE.Mesh(trackOuterGeometry, trackMaterial);
    trackOuter.rotation.x = -Math.PI / 2;
    trackOuter.position.y = 0.1;
    trackOuter.receiveShadow = true;
    scene.add(trackOuter);
    
    // Track inner ring
    const trackInnerGeometry = new THREE.TorusGeometry(TRACK_RADIUS - TRACK_WIDTH, TRACK_WIDTH * 2, 32, 100);
    const trackInner = new THREE.Mesh(trackInnerGeometry, trackMaterial);
    trackInner.rotation.x = -Math.PI / 2;
    trackInner.position.y = 0.1;
    trackInner.receiveShadow = true;
    scene.add(trackInner);
    
    // Track line markings
    const lineGeometry = new THREE.BufferGeometry();
    const linePoints = [];
    for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const x = Math.cos(angle) * TRACK_RADIUS;
        const z = Math.sin(angle) * TRACK_RADIUS;
        linePoints.push(new THREE.Vector3(x, 0.15, z));
    }
    lineGeometry.setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const trackLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(trackLine);
    
    // Starting line markers
    for (let i = -1; i <= 1; i++) {
        const markerGeometry = new THREE.BoxGeometry(2, 0.5, 20);
        const markerMaterial = new THREE.MeshLambertMaterial({ color: i === 0 ? 0xffffff : 0x000000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(TRACK_RADIUS + 20 + i * 3, 0.25, 0);
        marker.rotation.y = Math.PI / 2;
        marker.receiveShadow = true;
        scene.add(marker);
    }
    
    // Checkpoints for lap detection
    gameState.checkpoints = [];
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        gameState.checkpoints.push({
            angle: angle,
            passed: false,
            checkpoint: i
        });
    }
}

function createCar() {
    const carGroup = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(3, 2, 6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 30 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);
    
    // Car cabin
    const cabinGeometry = new THREE.BoxGeometry(2.5, 1.2, 2.5);
    const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0xcc0000, shininess: 30 });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 2.3, -0.5);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    carGroup.add(cabin);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(1, 1, 0.6, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 10 });
    
    const wheelPositions = [
        { x: -1.5, z: 1.5 },
        { x: 1.5, z: 1.5 },
        { x: -1.5, z: -1.5 },
        { x: 1.5, z: -1.5 }
    ];
    
    car.wheels = [];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 1, pos.z);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        carGroup.add(wheel);
        car.wheels.push(wheel);
    });
    
    // Car lights
    const lightGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.2);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const frontLight1 = new THREE.Mesh(lightGeometry, lightMaterial);
    frontLight1.position.set(-1.2, 1.5, 3);
    carGroup.add(frontLight1);
    const frontLight2 = new THREE.Mesh(lightGeometry, lightMaterial);
    frontLight2.position.set(1.2, 1.5, 3);
    carGroup.add(frontLight2);
    
    // Position at starting line
    carGroup.position.set(TRACK_RADIUS + 20, 0, 0);
    carGroup.castShadow = true;
    scene.add(carGroup);
    
    car = carGroup;
    car.currentLap = 0;
    car.velocity = new THREE.Vector3(0, 0, 0);
    car.rotation.y = Math.PI;
}

function updateCar() {
    if (!gameStarted) return;
    
    // Acceleration
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        gameState.speed = Math.min(gameState.speed + gameState.acceleration, gameState.maxSpeed);
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        gameState.speed = Math.max(gameState.speed - gameState.acceleration * 1.5, -gameState.maxSpeed * 0.5);
    } else {
        gameState.speed *= gameState.friction;
    }
    
    // Steering
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        car.rotation.y += gameState.rotationSpeed * (gameState.speed / gameState.maxSpeed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        car.rotation.y -= gameState.rotationSpeed * (gameState.speed / gameState.maxSpeed);
    }
    
    // Reset position
    if (keys[' ']) {
        car.position.set(TRACK_RADIUS + 20, 0, 0);
        car.rotation.y = Math.PI;
        gameState.speed = 0;
        keys[' '] = false;
    }
    
    // Move car
    car.position.x += Math.sin(car.rotation.y) * gameState.speed;
    car.position.z += Math.cos(car.rotation.y) * gameState.speed;
    
    // Rotation animation for wheels
    car.wheels.forEach(wheel => {
        wheel.rotation.x += gameState.speed * 0.3;
    });
    
    // Check track boundaries and apply friction
    const distFromCenter = Math.sqrt(car.position.x ** 2 + car.position.z ** 2);
    if (distFromCenter > TRACK_RADIUS + TRACK_WIDTH * 1.5 || distFromCenter < TRACK_RADIUS - TRACK_WIDTH * 1.5) {
        gameState.speed *= 0.9; // Slow down on grass
    }
    
    // Update camera to follow car
    const cameraDistance = 25;
    const cameraHeight = 15;
    camera.position.x = car.position.x - Math.sin(car.rotation.y) * cameraDistance;
    camera.position.y = car.position.y + cameraHeight;
    camera.position.z = car.position.z - Math.cos(car.rotation.y) * cameraDistance;
    camera.lookAt(car.position.x, car.position.y + 2, car.position.z);
}

function checkLapProgress() {
    const carAngle = Math.atan2(car.position.x, car.position.z);
    
    gameState.checkpoints.forEach((checkpoint, index) => {
        const angleDiff = Math.abs(carAngle - checkpoint.angle);
        
        if (angleDiff < 0.5 && !checkpoint.passed) {
            checkpoint.passed = true;
            if (index === 0) {
                gameState.lapCount++;
                if (gameState.lapCount > 3) {
                    endGame();
                }
            }
        } else if (angleDiff > 1.5) {
            checkpoint.passed = false;
        }
    });
}

function updateHUD() {
    document.getElementById('speed').textContent = Math.round(Math.abs(gameState.speed) * 200);
    document.getElementById('lap').textContent = Math.max(1, gameState.lapCount);
    
    const minutes = Math.floor(gameState.totalTime / 60);
    const seconds = Math.floor(gameState.totalTime % 60);
    document.getElementById('timeDisplay').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function endGame() {
    gameStarted = false;
    const minutes = Math.floor(gameState.totalTime / 60);
    const seconds = Math.floor(gameState.totalTime % 60);
    document.getElementById('finalTime').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('gameOver').style.display = 'flex';
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted) {
        gameState.totalTime += 1 / 60;
        updateCar();
        checkLapProgress();
        updateHUD();
    }
    
    renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize game
setupScene();
createTrack();
car = {};
createCar();
animate();