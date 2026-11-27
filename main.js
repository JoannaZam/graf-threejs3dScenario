import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { createAbandonedHouse } from './house.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createObjects } from './objects.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createTrees } from './trees.js';



// ==========================================
// MÚSICA AMBIENTAL
// ==========================================

const ambientMusic = new Audio('./audio/ambient.mp3');

ambientMusic.loop = true;
ambientMusic.volume = 0.25;
ambientMusic.preload = 'auto';

let musicStarted = false;

function startAmbientMusic() {

    if (musicStarted) return;

    ambientMusic.play()
        .then(() => {
            musicStarted = true;
            console.log('Música ambiental iniciada');
            updateAudioControls();
        })
        .catch(error => {
            console.warn('No se pudo iniciar la música:', error);
        });
}

// ==========================================
// CONTROL DE MÚSICA
// ==========================================

function toggleAmbientMusic() {

    if (ambientMusic.paused) {

        ambientMusic.play()
            .then(() => {
                musicStarted = true;
                updateAudioControls();
            })
            .catch(error => {
                console.error('Error al reproducir música:', error);
            });

    } else {

        ambientMusic.pause();
        updateAudioControls();

    }

}

// Aumentar o disminuir volumen
function changeMusicVolume(amount) {

    ambientMusic.volume = THREE.MathUtils.clamp(
        ambientMusic.volume + amount,
        0,
        1
    );

    updateAudioControls();
}

// ==========================================
// CONECTAR CONTROLES DE MÚSICA
// ==========================================

const musicToggle = document.getElementById('musicToggle');
const volumeDown = document.getElementById('volumeDown');
const volumeUp = document.getElementById('volumeUp');
const musicVolume = document.getElementById('musicVolume');

// Botón reproducir / pausar
musicToggle.addEventListener('click', toggleAmbientMusic);

// Disminuir volumen 5%
volumeDown.addEventListener('click', () => {
    changeMusicVolume(-0.05);
});

// Aumentar volumen 5%
volumeUp.addEventListener('click', () => {
    changeMusicVolume(0.05);
});

// Actualizar interfaz
function updateAudioControls() {

    musicToggle.textContent = ambientMusic.paused
        ? '▶ REPRODUCIR'
        : 'Ⅱ PAUSAR';

    musicVolume.textContent =
        `${Math.round(ambientMusic.volume * 100)}%`;

}

// Mostrar valores iniciales
updateAudioControls();

// Iniciar música con la primera interacción,
// excepto cuando se pulsa un control de música.
window.addEventListener('pointerdown', (event) => {

    if (event.target.closest('#musicControls')) return;

    startAmbientMusic();

}, { once: true });

window.addEventListener('keydown', startAmbientMusic, { once: true });
// Iniciar música después de la primera interacción
window.addEventListener(
    'keydown',
    startAmbientMusic,
    { once: true }
);

window.addEventListener(
    'pointerdown',
    startAmbientMusic,
    { once: true }
);


console.time('TIEMPO RAPIER');
await RAPIER.init();
console.timeEnd('TIEMPO RAPIER');
console.log('Rapier está funcionando correctamente:', RAPIER);

// ==========================================
// ESCENA
// ==========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x08080e);

// ==========================================
// NIEBLA GRIS CLARA
// ==========================================

const fogColor = new THREE.Color(0xbfc1bd);

scene.fog = new THREE.Fog(
    fogColor,
    18,
    65
);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 2, -4);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild(renderer.domElement);
// ==========================================
// HDRI - BOSQUE NOCTURNO
// ==========================================

const rgbeLoader = new RGBELoader();

rgbeLoader.load(
    './models/hdr/forest_grove_4k.hdr',

    (texture) => {

        texture.mapping = THREE.EquirectangularReflectionMapping;

        // Mostrar el bosque como fondo
        scene.background = texture;

        // Oscurecer solamente el fondo
        scene.backgroundIntensity = 0.10;

        console.log('HDRI del bosque nocturno cargado');

    },

    undefined,

    (error) => {
        console.error('Error al cargar el HDRI:', error);
    }
);

// ==========================================
// CASA Y COLISIONES
// ==========================================

console.time('TIEMPO CASA');
const abandonedHouse = createAbandonedHouse(scene);
console.timeEnd('TIEMPO CASA');

// Obtener las colisiones de la casa
const houseColliders = abandonedHouse.userData.colliders || [];

console.log('Colisiones de la casa:', houseColliders.length);

    // ==========================================
    // MOTOR DE FÍSICA RAPIER
    // ==========================================

    const physicsWorld = new RAPIER.World({
        x: 0,
        y: -9.81,
        z: 0
    });

    physicsWorld.timestep = 1 / 60;

    // Suelo físico de la planta baja
    const groundBody = physicsWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
            .setTranslation(0, -0.15, 0)
    );

    physicsWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(12, 0.15, 10),
        groundBody
    );

    console.log('Mundo físico inicializado');

    // ==========================================
    // COLISIONES FÍSICAS DE LAS PAREDES
    // ==========================================

    for (const collider of houseColliders) {

        const wallBox = collider.box;

        if (!wallBox || wallBox.isEmpty()) continue;

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        wallBox.getCenter(center);
        wallBox.getSize(size);

        const wallBody = physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(
                center.x,
                center.y,
                center.z
            )
        );

        physicsWorld.createCollider(
            RAPIER.ColliderDesc.cuboid(
                Math.max(size.x / 2, 0.01),
                Math.max(size.y / 2, 0.01),
                Math.max(size.z / 2, 0.01)
            ),
            wallBody
        );
    }


    // ==========================================
    // CARGAR OBJETOS 3D CON FÍSICA
    // ==========================================

    // Los objetos se cargarán en segundo plano.
    // Así el resto del juego puede continuar sin esperarlos.

    let updatePhysicalObjects = () => {};

    updatePhysicalObjects.objects = [];

    createObjects(scene, physicsWorld, RAPIER)
        .then((updateFunction) => {
            updatePhysicalObjects = updateFunction;

            console.log('Todos los objetos están listos');
        })
        .catch((error) => {
            console.error('Error al cargar los objetos:', error);
        });

    // ==========================================
    // COLISIONES DE OBJETOS AL ARRASTRAR
    // ==========================================

    function canMoveObject(object, targetPosition) {

        const currentPosition = object.visualGroup.position.clone();

        // Obtener las dimensiones reales del objeto
        const originalBox = new THREE.Box3()
            .setFromObject(object.visualGroup);

        // Desplazamiento solicitado
        const movement = new THREE.Vector3(
            targetPosition.x - currentPosition.x,
            0,
            targetPosition.z - currentPosition.z
        );

        // Evitar atravesar paredes al mover rápidamente el mouse
        const distance = movement.length();

        const steps = Math.max(
            1,
            Math.ceil(distance / 0.12)
        );

        for (let i = 1; i <= steps; i++) {

            const progress = i / steps;

            const offset = movement.clone()
                .multiplyScalar(progress);

            const testBox = originalBox.clone()
                .translate(offset);

            // Evitar que los objetos salgan de la casa
            const insideHouse =
                testBox.min.x >= -11.8 &&
                testBox.max.x <= 11.8 &&
                testBox.min.z >= -9.8 &&
                testBox.max.z <= 9.8;

            if (!insideHouse) {
                return false;
            }

            // Comprobar colisión con las paredes reales
            for (const collider of houseColliders) {

                const wallBox = collider.box;

                if (!wallBox) continue;

                if (testBox.intersectsBox(wallBox)) {
                    return false;
                }

            }

        }

        return true;

    }

    // ==========================================
    // AGARRAR Y MOVER OBJETOS
    // ==========================================

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let grabbedObject = null;
    let dragPlane = null;

    const dragPoint = new THREE.Vector3();

    const canvas = renderer.domElement;

    // Detectar posición del mouse
    function updateMousePosition(event) {

        const rect = canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    }

    // Agarrar objeto
    canvas.addEventListener('pointerdown', (event) => {

        if (event.button !== 0 || grabbedObject) return;

        updateMousePosition(event);

        raycaster.setFromCamera(mouse, camera);

        const objectMeshes = [];

        updatePhysicalObjects.objects.forEach(object => {

            object.visualGroup.traverse(child => {

                if (child.isMesh) {
                    objectMeshes.push(child);
                }

            });

        });

        const intersections = raycaster.intersectObjects(
            objectMeshes,
            false
        );

        if (intersections.length === 0) return;

        const selectedMesh = intersections[0].object;

        grabbedObject = updatePhysicalObjects.objects.find(object => {

            let found = false;

            object.visualGroup.traverse(child => {

                if (child === selectedMesh) {
                    found = true;
                }

            });

            return found;

        });

        if (!grabbedObject) return;

        // Convertir temporalmente el objeto en cinemático
        grabbedObject.body.setBodyType(
            RAPIER.RigidBodyType.KinematicPositionBased,
            true
        );

        const currentPosition = grabbedObject.body.translation();

        dragPlane = new THREE.Plane(
            new THREE.Vector3(0, 1, 0),
            -currentPosition.y
        );

        canvas.style.cursor = 'grabbing';

        showStatus(`Moviendo: ${grabbedObject.name}`);

    });

    // Mover objeto
    canvas.addEventListener('pointermove', (event) => {

        if (!grabbedObject) return;

        updateMousePosition(event);

        raycaster.setFromCamera(mouse, camera);

        
        if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {

            const currentPosition = grabbedObject.body.translation();

            const targetPosition = {
                x: dragPoint.x,
                y: currentPosition.y,
                z: dragPoint.z
            };

            // Comprobar paredes y límites exteriores
            if (canMoveObject(grabbedObject, targetPosition)) {

                grabbedObject.body.setNextKinematicTranslation(
                    targetPosition
                );

            }

        }


    });

    // Soltar objeto
    function releaseObject() {

        if (!grabbedObject) return;

        grabbedObject.body.setBodyType(
            grabbedObject.originalType,
            true
        );

        if (grabbedObject.dynamic) {

            grabbedObject.body.setLinvel(
                { x: 0, y: 0, z: 0 },
                true
            );

            grabbedObject.body.setAngvel(
                { x: 0, y: 0, z: 0 },
                true
            );

            grabbedObject.body.wakeUp();

        }

        showStatus(`${grabbedObject.name} colocado`);

        grabbedObject = null;
        dragPlane = null;

        canvas.style.cursor = 'grab';

    }

    canvas.addEventListener('pointerup', releaseObject);
    canvas.addEventListener('pointercancel', releaseObject);

// ==========================================
// ILUMINACIÓN
// ==========================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);

mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);

scene.add(mainLight);

const purpleLight = new THREE.PointLight(0x853cff, 8, 25);

purpleLight.position.set(-4, 5, -4);
scene.add(purpleLight);

// ==========================================
// TEXTURA PROCEDURAL - TIERRA DE BOSQUE
// ==========================================

function createForestGroundTexture() {

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;

    const ctx = canvas.getContext('2d');

    // Base de tierra oscura
    ctx.fillStyle = '#35372e';
    ctx.fillRect(0, 0, 1024, 1024);

    // Manchas de humedad
    for (let i = 0; i < 180; i++) {

        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const radius = 15 + Math.random() * 65;

        const gradient = ctx.createRadialGradient(
            x, y, 1,
            x, y, radius
        );

        gradient.addColorStop(0, 'rgba(15, 20, 15, 0.65)');
        gradient.addColorStop(1, 'rgba(15, 20, 15, 0)');

        ctx.fillStyle = gradient;

        ctx.fillRect(
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
        );
    }

    // Piedras pequeñas
    for (let i = 0; i < 450; i++) {

        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const radius = 1 + Math.random() * 5;

        ctx.fillStyle = Math.random() > 0.5
            ? '#55564b'
            : '#242820';

        ctx.beginPath();
        ctx.ellipse(
            x,
            y,
            radius * 1.5,
            radius,
            Math.random() * Math.PI,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Hojas secas
    const leafColors = [
        '#62513a',
        '#756044',
        '#493b2b',
        '#83704c',
        '#393b2d'
    ];

    for (let i = 0; i < 650; i++) {

        const x = Math.random() * 1024;
        const y = Math.random() * 1024;

        const width = 3 + Math.random() * 9;
        const height = 2 + Math.random() * 5;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(Math.random() * Math.PI);

        ctx.fillStyle = leafColors[
            Math.floor(Math.random() * leafColors.length)
        ];

        ctx.beginPath();
        ctx.ellipse(
            0,
            0,
            width,
            height,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }

    // Crear textura de Three.js
    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    texture.repeat.set(60, 60);

    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    return texture;
}

// ==========================================
// SUELO EXTERIOR - PATIO NOCTURNO
// ==========================================

const forestGroundTexture = createForestGroundTexture();

const floorGeometry = new THREE.PlaneGeometry(600, 600);

const floorMaterial = new THREE.MeshStandardMaterial({
    map: forestGroundTexture,
    color: 0xffffff,
    roughness: 1,
    metalness: 0
});

const floor = new THREE.Mesh(
    floorGeometry,
    floorMaterial
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.18;

floor.receiveShadow = true;

scene.add(floor);

// ==========================================
// ÁRBOLES DEL EXTERIOR
// ==========================================

const exteriorTrees = createTrees(scene);

const treeColliders = exteriorTrees.userData.colliders || [];

console.log('Colisiones de árboles:', treeColliders.length);

// ==========================================
// CARGADOR FBX Y SELECCIÓN DEL PERSONAJE
// ==========================================

const loader = new FBXLoader();
const preloadedCharacters = {};
const characterPreloadPromises = {};

function preloadCharacter(name) {

    if (preloadedCharacters[name]) {
        return Promise.resolve(preloadedCharacters[name]);
    }

    if (!characterPreloadPromises[name]) {

        characterPreloadPromises[name] = new Promise((resolve, reject) => {

            loader.load(
                `models/characters/${name}.fbx`,

                (fbx) => {
                    preloadedCharacters[name] = fbx;
                    console.log(`Personaje ${name} precargado`);
                    resolve(fbx);
                },

                undefined,

                (error) => {
                    delete characterPreloadPromises[name];
                    reject(error);
                }
            );

        });

    }

    return characterPreloadPromises[name];
}

let selectedCharacter = 'mujer';
let playerName = 'Jugador';

const characterScreen = document.getElementById('characterScreen');
const playerNameInput = document.getElementById('playerName');
const playerTag = document.getElementById('playerTag');

// Seleccionar personaje
document.querySelectorAll('.character-option').forEach((option) => {

    option.addEventListener('click', () => {

        selectedCharacter = option.dataset.character;
        preloadCharacter(selectedCharacter);

        document.querySelectorAll('.character-option').forEach((item) => {
            item.classList.remove('selected');
        });

        option.classList.add('selected');

    });

});

preloadCharacter(selectedCharacter);

// ==========================================
// VARIABLES DEL JUGADOR
// ==========================================

let playerRoot = null;
let character = null;
let characterLoading = false;
let characterLoaded = false;

let mixer = null;

let characterHeight = 1.7;

const animations = {};

let currentAnimation = null;

let cameraMode = 'third';

let isMoving = false;
let isMovingBackward = false;

let targetRotationY = 0;

let groundY = 0;

let isRunning = false;
let isJumping = false;
let isHurt = false;

let manualAnimation = false;

let verticalVelocity = 0;

const gravity = 18;
const jumpForce = 7;

const moveSpeed = 3;
const runSpeed = 6;
const rotationSpeed = 2.5;

const keys = {};

const animationNames = [
    'Idle',
    'Walking',
    'Running',
    'Jump',
    'Slow',
    'Hurt'
];

// ==========================================
// ESTADO
// ==========================================

const status = document.getElementById('status');

function showStatus(message) {

    if (status) {
        status.textContent = message;
    }

}

// ==========================================
// CONFIGURACIÓN DE CÁMARA
// ==========================================

const cameraDistance = 1.8;
const cameraHeight = 1.25;
const cameraLookHeight = 1.05;

// ==========================================
// CÁMARA ACTUALIZADA
// ==========================================


function updateCamera() {
    if (!playerRoot || !character) return;

    const playerPosition = playerRoot.position.clone();

    const playerQuaternion = new THREE.Quaternion();
    playerRoot.getWorldQuaternion(playerQuaternion);

    if (cameraMode === 'third') {

        character.visible = true;

        const target = playerPosition.clone();
        target.y += cameraLookHeight;

        const offset = new THREE.Vector3(
            0,
            cameraHeight,
            -cameraDistance
        );

        offset.applyQuaternion(playerQuaternion);

        const desiredPosition = playerPosition.clone().add(offset);

        const direction = new THREE.Vector3()
            .subVectors(desiredPosition, target)
            .normalize();

        const desiredDistance = target.distanceTo(desiredPosition);

        const safeDistance = getCameraSafeDistance(
            target,
            direction,
            desiredDistance
        );

        const finalPosition = target.clone().addScaledVector(
            direction,
            safeDistance
        );

        camera.position.copy(finalPosition);
        camera.lookAt(target);

    } else {

        character.visible = false;

        const eyePosition = playerPosition.clone();
        eyePosition.y += characterHeight * 0.88;

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(playerQuaternion);

        camera.position.copy(eyePosition);
        camera.lookAt(
            eyePosition.clone().addScaledVector(forward, 5)
        );
    }
}


// ==========================================
// COLISIÓN DE CÁMARA
// ==========================================


function getCameraSafeDistance(origin, direction, maxDistance) {

    const ray = new THREE.Ray(origin, direction);

    let safeDistance = maxDistance;

    const cameraRadius = 0.18;
    const wallMargin = 0.12;

    for (const collider of houseColliders) {

        if (!collider.box || collider.box.isEmpty()) continue;

        const expandedBox = collider.box.clone();

        expandedBox.expandByScalar(cameraRadius + wallMargin);

        const intersection = ray.intersectBox(
            expandedBox,
            new THREE.Vector3()
        );

        if (!intersection) continue;

        const distance = origin.distanceTo(intersection);

        if (distance < safeDistance) {

            safeDistance = Math.max(0.25, distance - 0.08);

        }

    }

    return safeDistance;
}


// ==========================================
// INICIAR JUEGO
// ==========================================

const startForm = document.getElementById('startForm');

if (startForm) {

    startForm.addEventListener('submit', (event) => {

        event.preventDefault();

        playerName = playerNameInput.value.trim();

        if (!playerName) {

            playerNameInput.focus();
            return;

        }

        if (playerTag) {

            playerTag.textContent = `JUGADOR: ${playerName}`;
            playerTag.hidden = false;

        }


        loadCharacter();

        if (characterScreen) {

            characterScreen.classList.add('hidden');

            setTimeout(() => {

                characterScreen.style.display = 'none';

            }, 850);

        }

    });

}


// ==========================================
// CARGAR PERSONAJE
// ==========================================


function loadCharacter() {
    

    if (characterLoading || characterLoaded) return;

    characterLoading = true;

    showStatus('Preparando personaje...');

    console.time('TIEMPO PERSONAJE FBX');

    preloadCharacter(selectedCharacter)

        .then((fbx) => {

            character = fbx;

            console.timeEnd('TIEMPO PERSONAJE FBX');

            characterLoaded = true;
            characterLoading = false;

            character.scale.setScalar(1);

            character.updateMatrixWorld(true);

            // CALCULAR ESCALA
            const originalBox = new THREE.Box3()
                .setFromObject(character);

            const originalHeight =
                originalBox.getSize(new THREE.Vector3()).y;

            if (originalHeight > 0) {

                const desiredHeight = 1.7;

                const scaleFactor =
                    desiredHeight / originalHeight;

                character.scale.setScalar(scaleFactor);

            }

            character.updateMatrixWorld(true);

            // CONFIGURAR MATERIALES
            character.traverse((object) => {

                if (object.isMesh) {

                    object.castShadow = true;
                    object.receiveShadow = true;

                    if (object.material) {

                        const materials = Array.isArray(object.material)
                            ? object.material
                            : [object.material];

                        materials.forEach((material) => {

                            material.side = THREE.DoubleSide;
                            material.needsUpdate = true;

                        });

                    }

                }

            });

            // CENTRAR MODELO FBX
            const box = new THREE.Box3()
                .setFromObject(character);

            const center = box.getCenter(new THREE.Vector3());

            character.position.x -= center.x;
            character.position.z -= center.z;
            character.position.y -= box.min.y;

            // CREAR PIVOTE
            playerRoot = new THREE.Group();

            playerRoot.name = 'PlayerRoot';

            playerRoot.add(character);

            // POSICIÓN INICIAL
            playerRoot.position.set(0, 0, -6.8);

            scene.add(playerRoot);

            targetRotationY = playerRoot.rotation.y;

            groundY = playerRoot.position.y;

            // ALTURA REAL
            character.updateMatrixWorld(true);

            const finalBox = new THREE.Box3()
                .setFromObject(character);

            characterHeight =
                finalBox.max.y - finalBox.min.y;

            console.log('Personaje:', selectedCharacter);
            console.log('Jugador:', playerName);
            console.log('Altura:', characterHeight);
            console.log('Pivote:', playerRoot.position);

            // MEZCLADOR DE ANIMACIONES
            mixer = new THREE.AnimationMixer(character);

            mixer.addEventListener('finished', (event) => {

                if (event.action === animations.Hurt) {

                    isHurt = false;
                    updateMovementAnimation();

                }

                if (event.action === animations.Jump) {

                    if (!isJumping) {
                        updateMovementAnimation();
                    }

                }

            });

            // ACTUALIZAR CÁMARA
            updateCamera();
            console.timeEnd('TIEMPO TOTAL INICIO');

            showStatus('¡Partida iniciada!');

            // CARGAR ANIMACIONES EN SEGUNDO PLANO
           
            console.log('PERSONAJE CARGADO, INICIANDO ANIMACIONES');
            console.log('MIXER:', mixer);
            console.log('ANIMATION NAMES:', animationNames);

            loadAnimations();

        })

        .catch((error) => {

            characterLoading = false;

            console.error('Error al cargar personaje:', error);

            showStatus('Error al cargar el personaje');

            alert(
                'No se pudo cargar el personaje. ' +
                'Revisa la ruta y el nombre del archivo FBX.'
            );

        });

}


// ==========================================
// CARGAR ANIMACIONES
// ==========================================

let loadedAnimations = 0;

let animationsLoading = false;
let animationsLoaded = false;

function loadAnimations() {

    console.log('ENTRÓ A loadAnimations()');
    if (animationsLoading || animationsLoaded) return;

    animationsLoading = true;
    loadedAnimations = 0;
    

    console.time('TIEMPO ANIMACIONES');

    animationNames.forEach((name) => {

        loader.load(

            `models/animations/${name}.fbx`,

            (fbx) => {

                if (!fbx.animations || fbx.animations.length === 0) {

                console.warn(`${name}.fbx no contiene animaciones`);

                loadedAnimations++;

                if (loadedAnimations === animationNames.length) {
                    animationsLoading = false;
                    animationsLoaded = true;
                    console.timeEnd('TIEMPO ANIMACIONES');
                    showStatus('Personaje y animaciones listos');
                }

                return;
            }

                const clip = fbx.animations[0];

                // ==========================================
                // CORREGIR DESPLAZAMIENTO DE LA CADERA
                // ==========================================

                if (['Walking', 'Running', 'Slow'].includes(name)) {

                    const hipsTrack = clip.tracks.find(track =>
                        track.name === 'mixamorigHips.position'
                    );

                    if (hipsTrack) {

                        const values = hipsTrack.values;

                        const initialX = values[0];
                        const initialZ = values[2];

                        for (let i = 0; i < values.length; i += 3) {

                            values[i] = initialX;
                            values[i + 2] = initialZ;

                        }

                        console.log(
                            `Desplazamiento horizontal corregido: ${name}`
                        );

                    }

                }

                if (name === 'Walking') {

                    console.log('===== REVISIÓN WALKING =====');

                    console.log('Duración:', clip.duration);

                    console.log('Cantidad de pistas:', clip.tracks.length);

                    clip.tracks.forEach((track) => {

                        console.log(
                            'Pista:',
                            track.name,
                            '| Primer valor:',
                            track.values.slice(0, 3),
                            '| Último valor:',
                            track.values.slice(-3)
                        );

                    });

                }

                const action = mixer.clipAction(clip);

                if (name === 'Jump' || name === 'Hurt') {

                    action.setLoop(THREE.LoopOnce, 1);
                if (
                    name === 'Walking' ||
                    name === 'Running' ||
                    name === 'Slow'
                ) {
                    action.setLoop(THREE.LoopRepeat, Infinity);
                    action.clampWhenFinished = false;
                }

                    action.clampWhenFinished = true;

                } else {

                    action.setLoop(THREE.LoopRepeat);

                }

                if (name === 'Walking' || name === 'Running' || name === 'Slow') {
                    console.log(`Tracks de ${name}:`,
                        clip.tracks.map(track => track.name)
                    );
                }

                animations[name] = action;

                loadedAnimations++;

                console.log(`Animación cargada: ${name}`);

                if (name === 'Idle' && !currentAnimation) {

                    playAnimation('Idle');

                }

                showStatus(
                    `Animaciones cargadas: ${loadedAnimations}/${animationNames.length}`
                );

                if (loadedAnimations === animationNames.length) {

                animationsLoading = false;
                animationsLoaded = true;

                console.timeEnd('TIEMPO ANIMACIONES');

                showStatus('Personaje y animaciones listos');

            }

            },

            undefined,

            (error) => {
                console.error(`Error cargando animación ${name}:`, error);

                loadedAnimations++;

                if (loadedAnimations === animationNames.length) {
                    animationsLoading = false;
                    animationsLoaded = true;
                    console.timeEnd('TIEMPO ANIMACIONES');
                    showStatus('Personaje y animaciones listos');
                }
            }
        );

    });

}

// ==========================================
// REPRODUCIR ANIMACIONES CON TRANSICIONES
// ==========================================
    

function playAnimation(name) {

    const nextAction = animations[name];

    if (!nextAction) {
        return;
    }

    // Si ya está reproduciéndose, no reiniciarla.
    if (
        currentAnimation === name &&
        nextAction.isRunning()
    ) {
        return;
    }

    const previousAction = currentAnimation
        ? animations[currentAnimation]
        : null;

    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.setEffectiveTimeScale(1);

    // Reiniciar solamente cuando entramos
    // en una animación diferente.
    nextAction.reset();

    nextAction.play();

    if (previousAction && previousAction !== nextAction) {

        nextAction.crossFadeFrom(
            previousAction,
            0.35,
            true
        );

    } else {

        nextAction.fadeIn(0.35);

    }

    currentAnimation = name;
}


// ==========================================
// ANIMACIONES AUTOMÁTICAS
// ==========================================

function updateMovementAnimation() {

    if (isJumping || isHurt || manualAnimation) return;

    if (isMovingBackward) {

        playAnimation('Slow');

    } else if (isMoving && isRunning) {

        playAnimation('Running');

    } else if (isMoving) {

        playAnimation('Walking');

    } else {

        playAnimation('Idle');

    }

}

// ==========================================
// CAMBIAR CÁMARA
// ==========================================

function toggleCamera() {

    if (!playerRoot) return;

    cameraMode =
        cameraMode === 'third' ? 'first' : 'third';

    updateCamera();

    console.log('Cámara:', cameraMode);

}

const cameraButton = document.getElementById('toggleCamera');

if (cameraButton) {

    cameraButton.addEventListener('click', toggleCamera);

}

// ==========================================
// BOTONES DE ANIMACIÓN
// ==========================================

document.querySelectorAll('[data-animation]').forEach((button) => {

    button.addEventListener('click', () => {

        const animationName = button.dataset.animation;

        if (!animations[animationName]) {

            showStatus(`Animación ${animationName} no disponible`);
            return;

        }

        // DAÑO
        if (animationName === 'Hurt') {

            manualAnimation = false;

            isJumping = false;
            verticalVelocity = 0;

            isHurt = true;

            playAnimation('Hurt');

            return;

        }

        // SALTO
        if (animationName === 'Jump') {

            if (!isJumping && !isHurt) {

                manualAnimation = false;

                isJumping = true;
                verticalVelocity = jumpForce;

                playAnimation('Jump');

            }

            return;

        }

        // RESTO DE ANIMACIONES
        isHurt = false;
        isJumping = false;

        verticalVelocity = 0;

        manualAnimation = true;

        playAnimation(animationName);

        showStatus(`Animación seleccionada: ${animationName}`);

    });

});

// ==========================================
// CONTROLES DE TECLADO
// ==========================================

window.addEventListener('keydown', (event) => {

    if ([
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space'
    ].includes(event.code)) {

        event.preventDefault();

    }

    keys[event.code] = true;

    if (event.repeat) return;

    // GIRO DE 90 GRADOS
    if (event.code === 'ArrowLeft') {

        targetRotationY += Math.PI / 2;

    }

    if (event.code === 'ArrowRight') {

        targetRotationY -= Math.PI / 2;

    }

    // SALTO
    if (
        event.code === 'Space' &&
        playerRoot &&
        !isJumping &&
        !isHurt
    ) {

        manualAnimation = false;

        isJumping = true;
        verticalVelocity = jumpForce;

        playAnimation('Jump');

    }

    // CAMBIAR CÁMARA
    if (event.code === 'KeyC') {

        toggleCamera();

    }

});

window.addEventListener('keyup', (event) => {

    keys[event.code] = false;

});

window.addEventListener('blur', () => {

    Object.keys(keys).forEach((key) => {

        keys[key] = false;

    });

});

// ==========================================
// INTERACCIÓN FÍSICA CON OBJETOS
// ==========================================

const pushedObjects = new Set();

function pushObject(object, direction) {

    if (!object.dynamic || !object.body) return;

    // Evitar aplicar fuerza repetidamente
    // mientras el personaje sigue tocando el objeto.
    if (pushedObjects.has(object)) return;

    pushedObjects.add(object);

    const force = 2.5;

    object.body.applyImpulse(
        {
            x: direction.x * force,
            y: 0.4,
            z: direction.z * force
        },
        true
    );

    object.body.wakeUp();

}

// ==========================================
// COLISIONES DEL JUGADOR
// ==========================================

function checkWallCollision(position, movementDirection = null) {

    const playerRadius = 0.32;

    const playerBox = new THREE.Box3(
        new THREE.Vector3(
            position.x - playerRadius,
            position.y,
            position.z - playerRadius
        ),
        new THREE.Vector3(
            position.x + playerRadius,
            position.y + characterHeight,
            position.z + playerRadius
        )
    );

    // ======================================
    // PAREDES
    // ======================================

    for (const collider of houseColliders) {

        const wall = collider.box;

        if (!wall || wall.isEmpty()) continue;

        if (playerBox.intersectsBox(wall)) {
            return true;
        }

    }


    // ======================================
    // ÁRBOLES DEL EXTERIOR
    // ======================================

    for (const treeBox of treeColliders) {

        if (!treeBox || treeBox.isEmpty()) continue;

        if (playerBox.intersectsBox(treeBox)) {
            return true;
        }

    }

    // ======================================
    // OBJETOS
    // ======================================

    if (updatePhysicalObjects?.objects) {

        for (const object of updatePhysicalObjects.objects) {

            if (!object.visualGroup) continue;

            const objectBox = new THREE.Box3()
                .setFromObject(object.visualGroup);

            if (objectBox.isEmpty()) continue;

            if (!playerBox.intersectsBox(objectBox)) {

                pushedObjects.delete(object);
                continue;

            }

            // Permitir pasar por encima de una mesa
            // cuando los pies del personaje ya están arriba.
            const standingAbove =
                playerBox.min.y >= objectBox.max.y - 0.12;

            if (standingAbove) continue;

            // Si es dinámico, intentar empujarlo.
            if (object.dynamic && movementDirection) {

                pushObject(object, movementDirection);

            }

            // El personaje se detiene ante el objeto.
            return true;

        }

    }

    return false;

}

// ==========================================
// ESCALERAS
// ==========================================

function updateStairs(previousPosition) {
    if (!playerRoot || isJumping || !previousPosition) return false;

    const stairMinX = -1.1;
    const stairMaxX = 1.1;
    const stairStartZ = -6.325;
    const stairEndZ = 1.475;

    const stairBottomY = 0;
    const stairTopY = 4.15;

    const x = playerRoot.position.x;
    const z = playerRoot.position.z;

    const insideStairs =
        x >= stairMinX &&
        x <= stairMaxX &&
        z >= stairStartZ &&
        z <= stairEndZ;

    if (!insideStairs) return false;

    const progress = THREE.MathUtils.clamp(
        (z - stairStartZ) / (stairEndZ - stairStartZ),
        0,
        1
    );

    const stairY = THREE.MathUtils.lerp(
        stairBottomY,
        stairTopY,
        progress
    );

    // Evita subir al personaje si está caminando debajo
    // de las escaleras, lejos de la altura de los escalones.
    const heightDifference = Math.abs(
        stairY - previousPosition.y
    );

    if (heightDifference > 0.35) {
        return false;
    }

    playerRoot.position.y = stairY;
    groundY = stairY;
    verticalVelocity = 0;

    return true;
}

// ==========================================
// MOVIMIENTO DEL JUGADOR
// ==========================================

function updateMovement(delta) {

    if (!playerRoot || isHurt) return;

    const forward = keys['ArrowUp'];
    const backward = keys['ArrowDown'];

    isMoving = forward || backward;

    isMovingBackward = backward && !forward;

    isRunning = forward && (
        keys['ShiftLeft'] ||
        keys['ShiftRight']
    );

    if (isMoving) {

        manualAnimation = false;

    }

    // ======================================
    // ROTACIÓN DEL PERSONAJE
    // ======================================

    const angleDifference = Math.atan2(
        Math.sin(targetRotationY - playerRoot.rotation.y),
        Math.cos(targetRotationY - playerRoot.rotation.y)
    );

    const rotationStep = rotationSpeed * delta;

    playerRoot.rotation.y += THREE.MathUtils.clamp(
        angleDifference,
        -rotationStep,
        rotationStep
    );

    // ======================================
    // MOVIMIENTO
    // ======================================

    const previousPosition = playerRoot.position.clone();
    if (isMoving) {

        const direction = new THREE.Vector3(0, 0, 1);

        direction.applyQuaternion(playerRoot.quaternion);

        let speed = moveSpeed;

        if (isRunning) {

            speed = runSpeed;

        }

        if (isMovingBackward) {

            speed = moveSpeed * 0.7;

        }

        const movement =
            speed * delta * (isMovingBackward ? -1 : 1);

        const nextPosition = playerRoot.position.clone();

        nextPosition.addScaledVector(direction, movement);

        // COLISIÓN X
        const testX = nextPosition.clone();

        testX.z = playerRoot.position.z;

        const directionX = new THREE.Vector3(
            movement > 0 ? direction.x : -direction.x,
            0,
            0
        );

        if (!checkWallCollision(testX, directionX)) {

            playerRoot.position.x = testX.x;

        }

        // COLISIÓN Z
        const testZ = nextPosition.clone();

        testZ.x = playerRoot.position.x;

        const directionZ = new THREE.Vector3(
            0,
            0,
            movement > 0 ? direction.z : -direction.z
        );

        if (!checkWallCollision(testZ, directionZ)) {

            playerRoot.position.z = testZ.z;

        }

    }

   const onStairs = updateStairs(previousPosition);

    if (!isJumping && !onStairs) {

    const upperFloor = getUpperFloorSurface(
        playerRoot.position
    );

    const tableTop = getTableSurface(
        playerRoot.position
    );

    if (upperFloor !== null && playerRoot.position.y > 2) {

        groundY = upperFloor;
        playerRoot.position.y = upperFloor;
        verticalVelocity = 0;

    } else if (tableTop !== null && tableTop > groundY) {

        groundY = tableTop;

    } else if (groundY > 0.05) {

        isJumping = true;
        verticalVelocity = 0;
        groundY = 0;

    }

}

    updateMovementAnimation();

}

function getUpperFloorSurface(position) {

    const x = position.x;
    const z = position.z;

    // Piso izquierdo
    const leftFloor =
        x >= -12 &&
        x <= -1.5 &&
        z >= -10 &&
        z <= 10;

    // Piso derecho
    const rightFloor =
        x >= 1.5 &&
        x <= 12 &&
        z >= -10 &&
        z <= 10;

    // Piso frontal y descanso de escaleras
    const frontFloor =
        x >= -1.5 &&
        x <= 1.5 &&
        z >= 1.05 &&
        z <= 10;

    // Piso trasero
    const backFloor =
        x >= -1.5 &&
        x <= 1.5 &&
        z >= -10 &&
        z <= -7;

    if (
        leftFloor ||
        rightFloor ||
        frontFloor ||
        backFloor
    ) {
        return 4.15;
    }

    return null;
}


// ==========================================
// DETECTAR SUPERFICIES PARA SUBIR
// ==========================================

function getTableSurface(position) {

    if (!updatePhysicalObjects?.objects) return null;

    for (const object of updatePhysicalObjects.objects) {

        if (object.name !== 'Mesa') continue;

        const box = new THREE.Box3()
            .setFromObject(object.visualGroup);

        const radius = 0.32;

        const inside =
            position.x + radius > box.min.x &&
            position.x - radius < box.max.x &&
            position.z + radius > box.min.z &&
            position.z - radius < box.max.z;

        if (inside) {
            return box.max.y;
        }

    }

    return null;

}

// ==========================================
// SALTO Y ATERRIZAJE SOBRE OBJETOS
// ==========================================

function updateJump(delta) {

    if (!playerRoot || !isJumping) return;

    const previousY = playerRoot.position.y;

    verticalVelocity -= gravity * delta;

    playerRoot.position.y += verticalVelocity * delta;

    const tableTop = getTableSurface(playerRoot.position);

    // Detectar aterrizaje sobre la mesa
    if (
        tableTop !== null &&
        verticalVelocity < 0 &&
        previousY >= tableTop - 0.05 &&
        playerRoot.position.y <= tableTop
    ) {

        playerRoot.position.y = tableTop;

        groundY = tableTop;

        verticalVelocity = 0;

        isJumping = false;

        updateMovementAnimation();

        return;

    }

    // Aterrizaje en el suelo
    if (playerRoot.position.y <= groundY) {

        playerRoot.position.y = groundY;

        verticalVelocity = 0;

        isJumping = false;

        updateMovementAnimation();

    }

}

// ==========================================
// BUCLE PRINCIPAL
// ==========================================

const clock = new THREE.Clock();

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (mixer) {
        mixer.update(delta);
    }

    updateMovement(delta);

    updateDynamicFog();

    updateJump(delta);

    if (playerRoot) {
        updateCamera();
    }

    physicsWorld.step();
    updatePhysicalObjects();

    renderer.render(scene, camera);

}

animate();

// ==========================================
// ACTUALIZAR NIEBLA SEGÚN DISTANCIA DE LA CASA
// ==========================================

function updateDynamicFog() {

    if (!playerRoot || !scene.fog) return;

    const distance = Math.sqrt(
        Math.pow(playerRoot.position.x, 2) +
        Math.pow(playerRoot.position.z, 2)
    );

    const intensity = THREE.MathUtils.clamp(
        (distance - 9) / 30,
        0,
        1
    );

    scene.fog.near = THREE.MathUtils.lerp(
        18,
        5,
        intensity
    );

    scene.fog.far = THREE.MathUtils.lerp(
        65,
        22,
        intensity
    );

}

// ==========================================
// AJUSTAR VENTANA
// ==========================================

window.addEventListener('resize', () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

});
