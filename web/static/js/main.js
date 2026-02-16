let scene, camera, renderer;
let clients = [];
let aggregator, globalServer;
let packets = [];
let accuracyHistory = [];

init();
animate();
startFLLoop();

/* ===============================
   INITIALIZE SCENE
================================= */
function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        60,
        document.getElementById("network").clientWidth /
        document.getElementById("network").clientHeight,
        0.1,
        1000
    );

    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
        document.getElementById("network").clientWidth,
        document.getElementById("network").clientHeight
    );

    document.getElementById("network").appendChild(renderer.domElement);

    const light = new THREE.PointLight(0xffffff, 1.5);
    light.position.set(10, 10, 10);
    scene.add(light);

    createNodes();
}

/* ===============================
   CREATE PNG SPRITE NODES
================================= */
function createNodes() {

    const loader = new THREE.TextureLoader();

    function createSprite(path, x, y) {
        const texture = loader.load("/static/assets/" + path);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 3, 1);
        sprite.position.set(x, y, 0);
        scene.add(sprite);
        return sprite;
    }

    // Clients
    clients.push(createSprite("edge.png", -8, 4));
    clients.push(createSprite("edge.png", -8, 0));
    clients.push(createSprite("edge.png", -8, -4));

    // Aggregator
    aggregator = createSprite("aggregator.png", 0, 0);

    // Global server
    globalServer = createSprite("server.png", 8, 0);
}

/* ===============================
   PACKET CREATION
================================= */
function createPacket(start, end, color = 0x00ffff) {

    const geometry = new THREE.SphereGeometry(0.25, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: color });

    const packet = new THREE.Mesh(geometry, material);
    packet.position.copy(start);

    packet.userData = {
        start: start.clone(),
        end: end.clone(),
        progress: 0
    };

    scene.add(packet);
    packets.push(packet);
}

/* ===============================
   PACKET ANIMATION
================================= */
function animatePackets() {

    packets.forEach(packet => {

        packet.userData.progress += 0.02;

        let t = packet.userData.progress;

        if (t >= 1) {
            scene.remove(packet);
        } else {
            packet.position.lerpVectors(
                packet.userData.start,
                packet.userData.end,
                t
            );
        }
    });

    packets = packets.filter(p => p.userData.progress < 1);
}

/* ===============================
   ANIMATION LOOP
================================= */
function animate() {
    requestAnimationFrame(animate);
    animatePackets();
    renderer.render(scene, camera);
}

/* ===============================
   FEDERATED LOOP (BACKEND POLLING)
================================= */
function startFLLoop() {

    setInterval(() => {

        fetch("/api/status")
            .then(res => res.json())
            .then(data => {

                document.getElementById("metrics").innerHTML =
                    "Round: " + data.round +
                    "<br>Accuracy: " +
                    (data.accuracy.length > 0 ?
                        data.accuracy.slice(-1)[0].toFixed(4) : "N/A");

                if (data.accuracy.length > 0) {
                    accuracyHistory = data.accuracy;
                }

                updateCharts();

                // Simulate Upload Phase
                clients.forEach(client => {
                    createPacket(client.position, aggregator.position);
                });

                // Simulate Broadcast Phase
                setTimeout(() => {
                    clients.forEach(client => {
                        createPacket(aggregator.position, client.position, 0x00ff00);
                    });
                }, 800);
            });

    }, 2500);
}

/* ===============================
   UPDATE RIGHT SIDE CHARTS
================================= */
function updateCharts() {

    Plotly.newPlot("accuracyChart", [{
        y: accuracyHistory,
        mode: "lines+markers",
        line: { color: "cyan" }
    }], {
        title: "Global Accuracy",
        paper_bgcolor: "#0b0f1a",
        plot_bgcolor: "#0b0f1a",
        font: { color: "white" }
    });

    let modelSizes = accuracyHistory.map((_, i) => 10 + i * 5);

    Plotly.newPlot("sizeChart", [{
        x: modelSizes,
        y: accuracyHistory,
        mode: "lines+markers",
        line: { color: "lime" }
    }], {
        title: "Model Size vs Accuracy",
        paper_bgcolor: "#0b0f1a",
        plot_bgcolor: "#0b0f1a",
        font: { color: "white" },
        xaxis: { title: "Model Size (KB)" },
        yaxis: { title: "Accuracy" }
    });
}
