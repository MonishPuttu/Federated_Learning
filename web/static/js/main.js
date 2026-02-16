let scene, camera, renderer;
let clients = [];
let aggregator, globalServer;
let packets = [];
let lines = [];

let accuracyHistory = [];
let simulationRunning = false;

init();
animate();

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
    1000,
  );

  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    document.getElementById("network").clientWidth,
    document.getElementById("network").clientHeight,
  );

  document.getElementById("network").appendChild(renderer.domElement);

  createNodes();

  document
    .getElementById("startBtn")
    .addEventListener("click", runFederatedRound);
}

/* ===============================
   CREATE PNG SPRITES + LABELS
================================= */
function createNodes() {
  const loader = new THREE.TextureLoader();

  function createSprite(path, x, y, label) {
    const texture = loader.load("/static/assets/" + path);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 3, 1);
    sprite.position.set(x, y, 0);
    scene.add(sprite);

    // Add label below icon
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = "Bold 40px Arial";
    context.fillStyle = "white";
    context.fillText(label, 20, 50);

    const textureLabel = new THREE.CanvasTexture(canvas);
    const materialLabel = new THREE.SpriteMaterial({ map: textureLabel });
    const labelSprite = new THREE.Sprite(materialLabel);
    labelSprite.scale.set(5, 1.5, 1);
    labelSprite.position.set(x, y - 3, 0);
    scene.add(labelSprite);

    return sprite;
  }

  clients.push(createSprite("edge.png", -8, 4, "Edge Device"));
  clients.push(createSprite("edge.png", -8, 0, "Edge Device"));
  clients.push(createSprite("edge.png", -8, -4, "Edge Device"));

  aggregator = createSprite("aggregator.png", 0, 0, "Aggregator");
  globalServer = createSprite("server.png", 8, 0, "Global Server");
}

/* ===============================
   CONNECTION LINES
================================= */

/* ===============================
   PACKET
================================= */
function createPacket(start, end, color) {
  const geometry = new THREE.SphereGeometry(0.25, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: color });

  const packet = new THREE.Mesh(geometry, material);
  packet.position.copy(start);

  packet.userData = {
    start: start.clone(),
    end: end.clone(),
    progress: 0,
  };

  scene.add(packet);
  packets.push(packet);
}

function animatePackets() {
  packets.forEach((packet) => {
    packet.userData.progress += 0.02;

    let t = packet.userData.progress;

    if (t >= 1) {
      scene.remove(packet);
    } else {
      packet.position.lerpVectors(
        packet.userData.start,
        packet.userData.end,
        t,
      );
    }
  });

  packets = packets.filter((p) => p.userData.progress < 1);
}

/* ===============================
   FEDERATED ROUND (PHASED)
================================= */
function runFederatedRound() {
  if (simulationRunning) return;
  simulationRunning = true;

  fetch("http://127.0.0.1:5000/run_round", {
    method: "POST",
  })
    .then((res) => res.json())
    .then((data) => {
      updateCharts(data);

      // PHASE 1: Clients upload
      clients.forEach((client) => {
        createPacket(client.position, aggregator.position, 0x00ffff);
      });

      setTimeout(() => {
        // PHASE 2: Aggregator → Global
        createPacket(aggregator.position, globalServer.position, 0xffaa00);

        setTimeout(() => {
          // PHASE 3: Global → Clients
          clients.forEach((client) => {
            createPacket(globalServer.position, client.position, 0x00ff00);
          });

          simulationRunning = false;
        }, 1000);
      }, 1000);
    });
}

/* ===============================
   CHARTS
================================= */
function updateCharts(data) {
  if (data.accuracy.length > 0) {
    accuracyHistory = data.accuracy;
  }

  Plotly.newPlot(
    "accuracyChart",
    [
      {
        y: accuracyHistory,
        mode: "lines+markers",
        line: { color: "cyan" },
      },
    ],
    {
      title: "Global Accuracy",
      paper_bgcolor: "#0b0f1a",
      plot_bgcolor: "#0b0f1a",
      font: { color: "white" },
    },
  );

  let modelSizes = accuracyHistory.map((_, i) => 10 + i * 5);

  Plotly.newPlot(
    "sizeChart",
    [
      {
        x: modelSizes,
        y: accuracyHistory,
        mode: "lines+markers",
        line: { color: "lime" },
      },
    ],
    {
      title: "Model Size vs Accuracy",
      paper_bgcolor: "#0b0f1a",
      plot_bgcolor: "#0b0f1a",
      font: { color: "white" },
    },
  );

  document.getElementById("metrics").innerHTML =
    "Round: " +
    data.round +
    "<br>Accuracy: " +
    (data.accuracy.length > 0 ? data.accuracy.slice(-1)[0].toFixed(4) : "N/A");
}

/* ===============================
   ANIMATE LOOP
================================= */
function animate() {
  requestAnimationFrame(animate);
  animatePackets();
  renderer.render(scene, camera);
}
