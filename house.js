import * as THREE from 'three';

export function createAbandonedHouse(scene) {

    const house = new THREE.Group();
    house.name = 'AbandonedHouse';


// =====================================
// TEXTURAS PROCEDURALES
// =====================================

function createWoodTexture() {

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#493d32';
    ctx.fillRect(0, 0, 512, 512);

    const plankHeight = 64;

    for (let y = 0; y < 512; y += plankHeight) {

        const tones = [
            '#504338',
            '#473a30',
            '#55473a',
            '#40352c'
        ];

        const tone = tones[
            Math.floor(Math.random() * tones.length)
        ];

        ctx.fillStyle = tone;
        ctx.fillRect(0, y, 512, plankHeight - 3);

        ctx.fillStyle = 'rgba(20, 16, 12, 0.65)';
        ctx.fillRect(0, y + plankHeight - 3, 512, 4);

        for (let i = 0; i < 25; i++) {

            const x = Math.random() * 512;
            const lineY = y + Math.random() * plankHeight;
            const length = 20 + Math.random() * 110;

            ctx.strokeStyle = Math.random() > 0.5
                ? 'rgba(20, 15, 11, 0.24)'
                : 'rgba(190, 170, 145, 0.09)';

            ctx.lineWidth = 1 + Math.random();

            ctx.beginPath();
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + length, lineY + Math.random() * 2);
            ctx.stroke();
        }

        for (let i = 0; i < 12; i++) {

            const x = Math.random() * 512;
            const lineY = y + Math.random() * plankHeight;

            ctx.fillStyle = 'rgba(15, 12, 10, 0.12)';

            ctx.fillRect(
                x,
                lineY,
                15 + Math.random() * 35,
                1 + Math.random() * 3
            );
        }
    }

    for (let i = 0; i < 8; i++) {

        const x = Math.random() * 512;
        const y = Math.random() * 512;

        ctx.strokeStyle = 'rgba(20, 15, 11, 0.3)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
}


function createDirtyWallTexture() {

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    // Gris verdoso suave
    ctx.fillStyle = '#77796f';
    ctx.fillRect(0, 0, 512, 512);

    // Manchas pequeñas y difuminadas
    for (let i = 0; i < 85; i++) {

        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = 12 + Math.random() * 35;

        const gradient = ctx.createRadialGradient(
            x, y, 1,
            x, y, radius
        );

        gradient.addColorStop(
            0,
            'rgba(45, 53, 43, 0.20)'
        );

        gradient.addColorStop(
            1,
            'rgba(45, 53, 43, 0)'
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
        );
    }

    // Escurrimientos muy discretos
    for (let i = 0; i < 16; i++) {

        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const height = 20 + Math.random() * 65;

        ctx.strokeStyle = 'rgba(35, 45, 37, 0.12)';
        ctx.lineWidth = 1 + Math.random() * 3;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + Math.random() * 4 - 2,
            y + height
        );

        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    texture.repeat.set(3, 2);

    return texture;
}



// Creamos las texturas una sola vez
const woodTexture = createWoodTexture();
const wallTexture = createDirtyWallTexture();



    // =====================================
    // MATERIALES
    // =====================================
   
    const materials = {

        // MADERA VIEJA DEL PISO
        
        floor: new THREE.MeshStandardMaterial({
            map: woodTexture,
            color: 0xb0a090,
            roughness: 1,
            metalness: 0
        }),

        upperFloor: new THREE.MeshStandardMaterial({
            map: woodTexture,
            color: 0x999080,
            roughness: 1,
            metalness: 0
        }),

       wall: new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
    }),

        stairs: new THREE.MeshStandardMaterial({
            map: woodTexture,
            color: 0x807568,
            roughness: 1,
            metalness: 0
        })

    };

    // =====================================
    // SISTEMA DE COLISIONES
    // =====================================

    const colliders = [];

    // =====================================
    // FUNCIONES AUXILIARES
    // =====================================

    function addBox(
        name,
        x,
        y,
        z,
        width,
        height,
        depth,
        material
    ) {

        const geometry = new THREE.BoxGeometry(
            width,
            height,
            depth
        );

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = name;
        mesh.position.set(x, y, z);

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        house.add(mesh);

        return mesh;
    }

    

function addWall(
    name,
    x,
    y,
    z,
    width,
    height,
    depth
) {

    const wallMaterial = materials.wall.clone();

    wallMaterial.side = THREE.DoubleSide;
    wallMaterial.depthWrite = true;
    wallMaterial.depthTest = true;

    const wall = addBox(
        name,
        x,
        y,
        z,
        width,
        height,
        depth,
        wallMaterial
    );

    // No forzar renderOrder.
    // Three.js gestionará la profundidad normalmente.

    const box = new THREE.Box3().setFromObject(wall);

    colliders.push({
        box: box
    });

    return wall;
}


// =====================================
// FUNCIÓN PARA CREAR VENTANAS
// =====================================

function addWindow(x, y, z, width, height, rotation = 0) {

    const windowGroup = new THREE.Group();

    const glass = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.08),
        new THREE.MeshStandardMaterial({
            color: 0x252b30,
            roughness: 0.3,
            metalness: 0.2
        })
    );

    windowGroup.add(glass);

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x382b20,
        roughness: 1
    });

    const frameThickness = 0.12;

    const left = new THREE.Mesh(
        new THREE.BoxGeometry(
            frameThickness,
            height + 0.15,
            0.15
        ),
        frameMaterial
    );

    left.position.x = -width / 2;
    windowGroup.add(left);

    const right = left.clone();
    right.position.x = width / 2;
    windowGroup.add(right);

    const top = new THREE.Mesh(
        new THREE.BoxGeometry(
            width + 0.15,
            frameThickness,
            0.15
        ),
        frameMaterial
    );

    top.position.y = height / 2;
    windowGroup.add(top);

    const bottom = top.clone();
    bottom.position.y = -height / 2;
    windowGroup.add(bottom);

    windowGroup.position.set(x, y, z);
    windowGroup.rotation.y = rotation;

    house.add(windowGroup);
}

    // =====================================
    // DIMENSIONES GENERALES
    // =====================================

    const houseWidth = 24;
    const houseDepth = 20;

    const wallHeight = 4;
    const wallThickness = 0.25;

    const groundY = 0;
    const upperY = 4;

    // =====================================
    // SUELO
    // =====================================

    addBox(
        'GroundFloor',
        0,
        -0.15,
        0,
        houseWidth,
        0.3,
        houseDepth,
        materials.floor
    );

    // =====================================
    // SEGUNDO PISO
    // =====================================

    addBox(
        'UpperFloor_Left',
        -6.75,
        upperY,
        0,
        10.5,
        0.3,
        20,
        materials.upperFloor
    );

    addBox(
        'UpperFloor_Right',
        6.75,
        upperY,
        0,
        10.5,
        0.3,
        20,
        materials.upperFloor
    );

    addBox(
        'UpperFloor_Front',
        0,
        upperY,
        6,
        3,
        0.3,
        8,
        materials.upperFloor
    );

    addBox(
        'UpperFloor_Back',
        0,
        upperY,
        -8.5,
        3,
        0.3,
        3,
        materials.upperFloor
    );

    // =====================================
    // PAREDES EXTERIORES - PLANTA BAJA
    // =====================================

    addWall(
        'BackWall_Ground',
        0,
        2,
        -houseDepth / 2,
        houseWidth,
        wallHeight,
        wallThickness
    );

    addWall(
        'LeftWall_Ground',
        -houseWidth / 2,
        2,
        0,
        wallThickness,
        wallHeight,
        houseDepth
    );

    addWall(
        'RightWall_Ground',
        houseWidth / 2,
        2,
        0,
        wallThickness,
        wallHeight,
        houseDepth
    );

    addWall(
        'FrontWall_Left',
        -8,
        2,
        houseDepth / 2,
        8,
        wallHeight,
        wallThickness
    );

    addWall(
        'FrontWall_Right',
        8,
        2,
        houseDepth / 2,
        8,
        wallHeight,
        wallThickness
    );

    addWall(
        'EntranceTop',
        0,
        3.1,
        houseDepth / 2,
        2.5,
        1.8,
        wallThickness
    );

    // =====================================
    // PAREDES EXTERIORES - PLANTA ALTA
    // =====================================

    const secondWallY = upperY + wallHeight / 2;

    addWall(
        'BackWall_Upper',
        0,
        secondWallY,
        -houseDepth / 2,
        houseWidth,
        wallHeight,
        wallThickness
    );

    addWall(
        'LeftWall_Upper',
        -houseWidth / 2,
        secondWallY,
        0,
        wallThickness,
        wallHeight,
        houseDepth
    );

    addWall(
        'RightWall_Upper',
        houseWidth / 2,
        secondWallY,
        0,
        wallThickness,
        wallHeight,
        houseDepth
    );

    addWall(
        'FrontWall_Upper_Left',
        -8,
        secondWallY,
        houseDepth / 2,
        8,
        wallHeight,
        wallThickness
    );

    addWall(
        'FrontWall_Upper_Right',
        8,
        secondWallY,
        houseDepth / 2,
        8,
        wallHeight,
        wallThickness
    );

    addWall(
        'FrontWall_Upper_Center',
        0,
        secondWallY,
        houseDepth / 2,
        2.5,
        wallHeight,
        wallThickness
    );

    // =====================================
    // DISTRIBUCIÓN INTERIOR - PLANTA BAJA
    // =====================================
    
    
    // =====================================
    // PASILLO CON ENTRADAS A LAS HABITACIONES
    // =====================================

    // Pared izquierda: entrada central
    addWall('GroundHall_Left_Back', -2, 2, -5, 0.2, 4, 6);
    addWall('GroundHall_Left_Front', -2, 2, 5, 0.2, 4, 6);

    // Pared derecha: entrada central
    addWall('GroundHall_Right_Back', 2, 2, -5, 0.2, 4, 6);
    addWall('GroundHall_Right_Front', 2, 2, 5, 0.2, 4, 6);


    addWall(
        'LeftRoom_Divider1',
        -7,
        2,
        -4,
        10,
        4,
        0.2
    );

    addWall(
        'LeftRoom_Divider2',
        -7,
        2,
        3,
        10,
        4,
        0.2
    );

    addWall(
        'RightRoom_Divider1',
        7,
        2,
        -4,
        10,
        4,
        0.2
    );

    addWall(
        'RightRoom_Divider2',
        7,
        2,
        3,
        10,
        4,
        0.2
    );

    // =====================================
    // DISTRIBUCIÓN INTERIOR - PLANTA ALTA
    // =====================================

    addWall(
        'UpperHall_Left',
        -2,
        6,
        0,
        0.2,
        4,
        16
    );

    addWall(
        'UpperHall_Right',
        2,
        6,
        0,
        0.2,
        4,
        16
    );

    addWall(
        'UpperRoom_Divider1',
        -7,
        6,
        -4,
        10,
        4,
        0.2
    );

    addWall(
        'UpperRoom_Divider2',
        7,
        6,
        -4,
        10,
        4,
        0.2
    );

    // =====================================
    // VENTANAS
    // =====================================

    addWindow(-12.15, 2.2, -5, 2.5, 1.6, Math.PI / 2);
    addWindow(-12.15, 2.2, 5, 2.5, 1.6, Math.PI / 2);

    addWindow(12.15, 2.2, -5, 2.5, 1.6, Math.PI / 2);
    addWindow(12.15, 2.2, 5, 2.5, 1.6, Math.PI / 2);

    addWindow(-12.15, 6.2, -5, 2.5, 1.6, Math.PI / 2);
    addWindow(12.15, 6.2, -5, 2.5, 1.6, Math.PI / 2);

    // =====================================
    // ESCALERAS
    // =====================================

    const stairCount = 12;
    const stairWidth = 2.2;
    const stairHeight = 0.35;
    const stairDepth = 0.65;

    for (let i = 0; i < stairCount; i++) {

        const step = new THREE.Mesh(
            new THREE.BoxGeometry(
                stairWidth,
                stairHeight,
                stairDepth
            ),
            materials.stairs
        );

        step.name = `Stair_${i + 1}`;

        step.position.set(
            0,
            0.16 + i * stairHeight,
            -6 + i * stairDepth
        );

        step.castShadow = true;
        step.receiveShadow = true;

        house.add(step);
    }

    // =====================================
    // DESCANSO PARA CONECTAR CON EL SEGUNDO PISO
    // =====================================

    addBox(
        'StairLanding',
        0,
        4,
        1.8,
        2.2,
        0.3,
        1.4,
        materials.upperFloor
    );

    // =====================================
    // PUERTA PRINCIPAL
    // =====================================

    addBox(
        'MainDoor',
        0,
        1.1,
        9.9,
        2.2,
        2.2,
        0.15,
        materials.stairs
    );

    // =====================================
    // GUARDAR COLISIONES
    // =====================================

    house.userData.colliders = colliders;

    // =====================================
    // AGREGAR CASA A LA ESCENA
    // =====================================

    scene.add(house);

    return house;
}
