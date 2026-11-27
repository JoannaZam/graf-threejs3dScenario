
import * as THREE from 'three';

export function createTrees(scene) {

    const trees = new THREE.Group();
    trees.name = 'ExteriorTrees';
    trees.userData.colliders = [];

    // Materiales de los árboles secos
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x302820,
        roughness: 1
    });

    const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x211d19,
        roughness: 1
    });

    // Crear ramas entre dos puntos
    function createBranch(start, end, radius, material) {

        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();

        const geometry = new THREE.CylinderGeometry(
            radius * 0.15,
            radius,
            length,
            5
        );

        const branch = new THREE.Mesh(geometry, material);

        branch.position.copy(start).add(end).multiplyScalar(0.5);

        branch.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        branch.castShadow = true;

        return branch;
    }

    // Construir un árbol seco y retorcido
    function createDeadTree(x, z, scale = 1) {

        const tree = new THREE.Group();

        // Tronco irregular
        const trunkPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.15, 1.5, 0.05),
            new THREE.Vector3(-0.1, 3, 0.1),
            new THREE.Vector3(0.2, 4.5, -0.05),
            new THREE.Vector3(0.05, 5.8, 0)
        ];

        for (let i = 0; i < trunkPoints.length - 1; i++) {

            tree.add(createBranch(
                trunkPoints[i],
                trunkPoints[i + 1],
                0.32 - i * 0.045,
                trunkMaterial
            ));
        }

        // Ramas principales
        const branches = [
            [[0, 2.2, 0], [-1.2, 3.5, 0.2], [-2.1, 4.1, 0.1]],
            [[-1.2, 3.5, 0.2], [-1.7, 4.6, 0.3]],

            [[0, 3, 0.1], [1.1, 4.1, 0.2], [2, 4.5, 0.3]],
            [[1.1, 4.1, 0.2], [1.5, 5.2, 0.1]],

            [[0.1, 4.1, 0], [-0.9, 5, -0.3], [-1.4, 5.9, -0.2]],

            [[0.2, 4.5, -0.05], [1.2, 5.4, -0.5], [2, 5.7, -0.6]],

            [[0.05, 5.8, 0], [-0.5, 6.8, 0.2]],
            [[0.05, 5.8, 0], [0.7, 6.9, -0.2]]
        ];

        branches.forEach(points => {

            for (let i = 0; i < points.length - 1; i++) {

                const start = new THREE.Vector3(...points[i]);
                const end = new THREE.Vector3(...points[i + 1]);

                tree.add(createBranch(
                    start,
                    end,
                    i === 0 ? 0.16 : 0.09,
                    branchMaterial
                ));
            }
        });

        // Pequeñas ramas puntiagudas
        const twigs = [
            [[-2.1, 4.1, 0.1], [-2.5, 4.8, 0.2]],
            [[-1.7, 4.6, 0.3], [-2.3, 4.9, 0.5]],
            [[2, 4.5, 0.3], [2.5, 5.2, 0.4]],
            [[1.5, 5.2, 0.1], [2, 5.6, 0]],
            [[-1.4, 5.9, -0.2], [-1.8, 6.5, -0.4]],
            [[2, 5.7, -0.6], [2.5, 6.2, -0.8]]
        ];

        twigs.forEach(points => {

            tree.add(createBranch(
                new THREE.Vector3(...points[0]),
                new THREE.Vector3(...points[1]),
                0.065,
                branchMaterial
            ));
        });

        tree.position.set(x, 0, z);

        // Variaciones para que no todos se vean iguales
        const randomScale = scale * (0.85 + Math.random() * 0.35);

        tree.scale.set(
        randomScale,
        randomScale,
        randomScale
    );

    tree.rotation.y = Math.random() * Math.PI * 2;

    // ======================================
    // COLISIÓN DEL TRONCO
    // ======================================

    const trunkCollider = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(
            x,
            2.9 * randomScale,
            z
        ),
        new THREE.Vector3(
            0.8 * randomScale,
            5.8 * randomScale,
            0.8 * randomScale
        )
    );

    trees.userData.colliders.push(trunkCollider);

    trees.add(tree);
    }

    // Distribución exterior: acceso frontal despejado
    const positions = [
        [-17, -14],
        [-22, -7],
        [-18, 2],
        [-24, 10],
        [-16, 17],

        [17, -15],
        [23, -8],
        [19, 1],
        [24, 11],
        [17, 18],

        [-9, -22],
        [0, -25],
        [10, -23],

        [-10, 25],
        [2, 27],
        [12, 24]
    ];

    positions.forEach(([x, z], index) => {

        const scale = 0.85 + (index % 4) * 0.12;

        createDeadTree(x, z, scale);
    });

    scene.add(trees);

    return trees;
}
