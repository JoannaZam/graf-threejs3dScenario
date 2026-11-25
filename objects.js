import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            path,
            resolve,
            undefined,
            reject
        );
    });
}

// ==========================================
// CONFIGURACIÓN DE OBJETOS
// ==========================================

const objectConfigs = [
    {
        name: 'Armario',
        folder: 'armario',
        file: 'armario.fbx',
        position: [-9, 0, -7],
        targetSize: 3,
        dynamic: false
    },
    {
        name: 'Banco',
        folder: 'banco',
        file: 'banco.fbx',
        position: [8, 0, -7],
        targetSize: 1.5,
        dynamic: true
    },
    {
        name: 'Bota',
        folder: 'bota',
        file: 'bota.fbx',
        position: [-10, 0, 6],
        targetSize: 0.8,
        dynamic: true
    },
    {
        name: 'Cajón',
        folder: 'cajon',
        file: 'cajon.fbx',
        position: [8, 0, 6],
        targetSize: 1.5,
        dynamic: true
    },
    {
        name: 'Juguete',
        folder: 'juguete',
        file: 'juguete.FBX',
        position: [-8, 0, 6],
        targetSize: 0.9,
        dynamic: true
    },
    {
        name: 'Lámpara',
        folder: 'lampara',
        file: 'lampara.fbx',
        position: [10, 0, -7],
        targetSize: 1.3,
        dynamic: true
    },
    {
        name: 'Mesa',
        folder: 'mesa',
        file: 'mesa.fbx',
        position: [-7, 0, -7],
        targetSize: 1.8,
        dynamic: false
    },
    {
        name: 'Silla',
        folder: 'silla',
        file: 'silla.fbx',
        position: [10, 0, 6],
        targetSize: 1.5,
        dynamic: true
    },
    {
        name: 'Sillón',
        folder: 'sillon',
        file: 'sillon.fbx',
        position: [-8, 0, 0],
        targetSize: 2.3,
        dynamic: false
    },
    {
        name: 'Televisión',
        folder: 'tv',
        file: 'tv.fbx',
        position: [8, 0, 0],
        targetSize: 1.5,
        dynamic: false
    }
];

// ==========================================
// CARGAR Y CONFIGURAR OBJETOS
// ==========================================

export async function createObjects(scene, physicsWorld, RAPIER) {

    const physicalObjects = [];

    async function loadObject(config) {

        return new Promise((resolve, reject) => {

            const loader = new FBXLoader();
            const modelPath = `./models/objects/${config.folder}/`;
            loader.setPath(modelPath);
            loader.setResourcePath(`${modelPath}textures/`);

            loader.load(
                config.file,

                async (model) => {

                    // Escala automática
                    let box = new THREE.Box3().setFromObject(model);
                    const originalSize = new THREE.Vector3();

                    box.getSize(originalSize);

                    const maxDimension = Math.max(
                        originalSize.x,
                        originalSize.y,
                        originalSize.z
                    );

                    if (maxDimension === 0) {
                        reject(new Error(`El modelo ${config.name} no tiene dimensiones válidas.`));
                        return;
                    }

                    const scale = config.targetSize / maxDimension;
                    model.scale.setScalar(scale);

                    // Calcular dimensiones después de escalar
                    box.setFromObject(model);

                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();

                    box.getSize(size);
                    box.getCenter(center);

                    // Centrar el modelo respecto a su origen
                    model.position.set(
                        -center.x,
                        -center.y,
                        -center.z
                    );
                    
                    
                    // ======================================
                    // TEXTURAS PERSONALIZADAS DEL SILLÓN
                    // ======================================

                    if (config.folder === 'sillon') {

                        const sofaTexture = await loadTexture(
                            './models/objects/sillon/textures/sofa_texture.png'
                        );

                        const seatTexture = await loadTexture(
                            './models/objects/sillon/textures/sedushka_texture.png'
                        );

                        const woodTexture = await loadTexture(
                            './models/objects/sillon/textures/imgonline-com-ua-Resize-Y2GXf8BaEz6iUT8D_(.jpg'
                        );

                        const grayTexture = await loadTexture(
                            './models/objects/sillon/textures/749358a3d69d.jpg'
                        );
                        

                        // Configuración de las texturas
                        [sofaTexture, seatTexture, woodTexture, grayTexture].forEach(texture => {
                            texture.colorSpace = THREE.SRGBColorSpace;
                            texture.needsUpdate = true;

                        // Textura exclusiva para los brazos laterales
                        const sideTexture = sofaTexture.clone();

                        sideTexture.wrapS = THREE.RepeatWrapping;
                        sideTexture.wrapT = THREE.RepeatWrapping;
                        sideTexture.repeat.set(2, 2);
                        sideTexture.needsUpdate = true;

                        });

                        // Aplicar texturas según el material original
                        model.traverse((child) => {
                            

                            if (!child.isMesh) return;

                            // Clonar materiales para evitar modificaciones compartidas
                            const isArray = Array.isArray(child.material);

                            const materials = isArray
                                ? child.material.map(material => material ? material.clone() : material)
                                : [child.material ? child.material.clone() : child.material];

                            child.material = isArray ? materials : materials[0];

                            materials.forEach(material => {

                                if (!material) return;

                                switch (material.name) {

                                    // ASIENTO DEL SILLÓN
                                    case 'Material #70':
                                        material.map = seatTexture;
                                        material.color.set(0xffffff);
                                        break;

                                    // RESPALDO Y LATERALES
                                    case 'Material #71':
                                        material.map = sofaTexture;
                                        material.color.set(0xffffff);
                                        break;

                                    // MADERA TRASERA
                                    case 'Walnut Matte':
                                        material.map = woodTexture;
                                        material.color.set(0xffffff);
                                        break;

                                    // ESTRUCTURA GRIS
                                    case 'Iron Rough Rusty':
                                        material.map = grayTexture;
                                        material.color.set(0xffffff);
                                        break;
                                }

                                material.needsUpdate = true;

                            });

                            child.castShadow = true;
                            child.receiveShadow = true;

                            console.log(
                                'SILLÓN:',
                                child.name,
                                '| MATERIAL:',
                                materials.map(m => m?.name).join(', '),
                                '| TEXTURA:',
                                materials.map(m => m?.map ? 'APLICADA' : 'SIN TEXTURA').join(', ')
                            );

                        });

                        console.log('Texturas del sillón configuradas correctamente');

                    }


                    // ==========================================
                    // TEXTURAS Y SOMBRAS
                    // ==========================================

                    // TEXTURAS DEL ARMARIO Y DEL BANCO

                    model.traverse((child) => {

                        if (child.isMesh && config.folder === 'sillon') {

                            console.log(
                                'MALLA:', child.name,
                                '| MATERIAL:',
                                child.material?.name,
                                '| UV:',
                                child.geometry.attributes.uv ? 'SÍ TIENE' : 'NO TIENE'
                            );

                        }

                        if (child.isMesh) {

                            child.castShadow = true;
                            child.receiveShadow = true;

                            const materials = Array.isArray(child.material)
                                ? child.material
                                : [child.material];

                            materials.forEach((material) => {

                                if (!material) return;


                                // TEXTURA DE LA BOTA
                                if (config.folder === 'bota') {

                                    textureLoader.load(
                                        './models/objects/bota/textures/Shoe_alb_8K.jpeg',

                                        (texture) => {
                                            texture.colorSpace = THREE.SRGBColorSpace;
                                            material.map = texture;
                                            material.needsUpdate = true;

                                            console.log('Textura aplicada a la bota');
                                        },

                                        undefined,

                                        (error) => {
                                            console.error('Error en textura de la bota:', error);
                                        }
                                    );

                                }

                                // TEXTURA DEL JUGUETE
                                if (config.folder === 'juguete') {

                                    textureLoader.load(
                                        './models/objects/juguete/textures/New_Graph_basecolor.png',

                                        (texture) => {
                                            texture.colorSpace = THREE.SRGBColorSpace;
                                            material.map = texture;
                                            material.needsUpdate = true;

                                            console.log('Textura aplicada al juguete');
                                        },

                                        undefined,

                                        (error) => {
                                            console.error('Error en textura del juguete:', error);
                                        }
                                    );
                                }

                                // TEXTURAS DE LA LÁMPARA
                                if (config.folder === 'lampara') {

                                    let texturePath = null;

                                    if (material.name === 'lambert1') {
                                        texturePath = './models/objects/lampara/textures/Lamp_low_lambert1_BaseColor.png';
                                    }

                                    if (material.name === 'lambert2') {
                                        texturePath = './models/objects/lampara/textures/Lamp_low_lambert2_BaseColor.png';
                                    }

                                    if (texturePath) {

                                        textureLoader.load(
                                            texturePath,

                                            (texture) => {
                                                texture.colorSpace = THREE.SRGBColorSpace;
                                                material.map = texture;
                                                material.needsUpdate = true;

                                                console.log('Textura aplicada a lámpara:', material.name);
                                            },

                                            undefined,

                                            (error) => {
                                                console.error('Error en textura de lámpara:', error);
                                            }
                                        );

                                    }
                                }

                                // TEXTURAS DE LA MESA
                                if (config.folder === 'mesa') {

                                    let texturePath = null;

                                    if (material.name === 'Old wood') {
                                        texturePath = './models/objects/mesa/textures/Table_Old wood_BaseColor.png';
                                    }

                                    if (material.name === 'Old wood2') {
                                        texturePath = './models/objects/mesa/textures/Table_Old wood2_BaseColor.png';
                                    }

                                    if (texturePath) {

                                        textureLoader.load(
                                            texturePath,

                                            (texture) => {
                                                texture.colorSpace = THREE.SRGBColorSpace;
                                                material.map = texture;
                                                material.needsUpdate = true;

                                                console.log('Textura aplicada a mesa:', material.name);
                                            },

                                            undefined,

                                            (error) => {
                                                console.error('Error en textura de mesa:', error);
                                            }
                                        );

                                    }
                                }


                                // TEXTURAS DE LA TELEVISIÓN

                                if (config.folder === 'tv' && material.name === 'M_Television') {

                                    textureLoader.load(
                                        './models/objects/tv/textures/M_Television_Base_color.png',

                                        (texture) => {

                                            texture.colorSpace = THREE.SRGBColorSpace;

                                            material.map = texture;
                                            material.color.set(0xffffff);
                                            material.needsUpdate = true;

                                            console.log(
                                                'Textura aplicada a televisión:',
                                                child.name
                                            );

                                        },

                                        undefined,

                                        (error) => {
                                            console.error('Error en textura de televisión:', error);
                                        }
                                    );

                                }


                                // TEXTURA DEL ARMARIO
                                if (config.folder === 'armario') {

                                    textureLoader.load(
                                        './models/objects/armario/textures/DefaultMaterial_albedo.jpg',

                                        (texture) => {
                                            texture.colorSpace = THREE.SRGBColorSpace;
                                            material.map = texture;
                                            material.needsUpdate = true;
                                        },

                                        undefined,

                                        (error) => {
                                            console.error('Error en textura del armario:', error);
                                        }
                                    );

                                }

                                // TEXTURAS DEL BANCO
                                if (config.folder === 'banco') {

                                    let texturePath = null;

                                    if (material.name === 'BlackShamrock_stool') {
                                        texturePath = './models/objects/banco/textures/BlackShamrock_stool_albedo.jpg';
                                    }

                                    if (material.name === 'BlackShamrock_floor') {
                                        texturePath = './models/objects/banco/textures/BlackShamrock_floor_albedo.jpg';
                                    }

                                    if (texturePath) {

                                        textureLoader.load(
                                            texturePath,

                                            (texture) => {
                                                texture.colorSpace = THREE.SRGBColorSpace;
                                                material.map = texture;
                                                material.needsUpdate = true;

                                                console.log('Textura aplicada:', material.name);
                                            },

                                            undefined,

                                            (error) => {
                                                console.error('Error en textura del banco:', error);
                                            }
                                        );

                                    }

                                }

                            });

                            console.log(
                                `OBJETO: ${config.name}`,
                                'MESH:', child.name,
                                'MATERIAL:', child.material?.name
                            );

                        }

                    });


                    // Grupo visual
                    const visualGroup = new THREE.Group();
                    visualGroup.name = config.name;

                    visualGroup.add(model);

                    // Posición inicial
                    const halfHeight = Math.max(size.y / 2, 0.05);

                    const [x, , z] = config.position;

                    const bodyY = halfHeight + 0.03;

                    // Crear cuerpo físico
                    let bodyDesc;

                    if (config.dynamic) {

                        bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                            .setTranslation(x, bodyY, z)
                            .setLinearDamping(0.35)
                            .setAngularDamping(0.8);

                    } else {

                        bodyDesc = RAPIER.RigidBodyDesc.fixed()
                            .setTranslation(x, bodyY, z);

                    }

                    const body = physicsWorld.createRigidBody(bodyDesc);

                    // Colisión aproximada mediante una caja
                    const colliderDesc = RAPIER.ColliderDesc.cuboid(
                        Math.max(size.x / 2, 0.05),
                        Math.max(size.y / 2, 0.05),
                        Math.max(size.z / 2, 0.05)
                    )
                        .setFriction(0.8)
                        .setRestitution(0.05);

                    physicsWorld.createCollider(colliderDesc, body);

                    visualGroup.position.set(x, bodyY, z);

                    scene.add(visualGroup);

                   physicalObjects.push({
                        body,
                        visualGroup,
                        name: config.name,
                        dynamic: config.dynamic,
                        originalType: config.dynamic
                            ? RAPIER.RigidBodyType.Dynamic
                            : RAPIER.RigidBodyType.Fixed
                    });

                    console.log(
                        `Objeto cargado: ${config.name} | Física: ${config.dynamic ? 'Dinámica' : 'Fija'}`
                    );

                    resolve();

                },

                undefined,

                (error) => {
                    console.error(`Error al cargar ${config.name}:`, error);
                    reject(error);
                }
            );

        });
    }

    // Cargar todos los modelos sin detener los demás si uno falla
    const results = await Promise.allSettled(
        objectConfigs.map(config => loadObject(config))
    );

    const loaded = results.filter(result => result.status === 'fulfilled').length;

    console.log(`Objetos cargados correctamente: ${loaded}/${objectConfigs.length}`);

        // ======================================
        // ACTUALIZAR MODELOS SEGÚN LA FÍSICA
        // ======================================

        function updateObjects() {

            for (const object of physicalObjects) {

                const position = object.body.translation();
                const rotation = object.body.rotation();

                object.visualGroup.position.set(
                    position.x,
                    position.y,
                    position.z
                );

                object.visualGroup.quaternion.set(
                    rotation.x,
                    rotation.y,
                    rotation.z,
                    rotation.w
                );

            }

        }

        // Permitir que main.js acceda a los objetos
        updateObjects.objects = physicalObjects;

        return updateObjects;
    }