let scene, camera, renderer;
let clients = [];
let aggregator, globalServer;
let packets = [];
let accuracyHistory = [];

let simulationRunning = false;
let phaseText = "";

init();
animate();

/* ===============================
   INITIALIZE SCENE
================================= */
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera(
    60,
    document.getElementById("network").clientWidth /
      document.getElementById("network").clientHeight,
    0.1,
    1000,
  );

  camera.position.set(0, 0, 22);
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
    .addEventListener("click", runFederatedRounds);
}

/* ===============================
   CREATE SPRITES + LABELS
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

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#333333";
    ctx.font = "bold 40px Arial";
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 4;

    ctx.fillText(label, 80, 80);

    const textureLabel = new THREE.CanvasTexture(canvas);
    const materialLabel = new THREE.SpriteMaterial({ map: textureLabel });
    const labelSprite = new THREE.Sprite(materialLabel);
    labelSprite.scale.set(6, 1.5, 1);
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
   PACKET + TRAIL
================================= */
function createPacket(start, end, color) {
  const geometry = new THREE.SphereGeometry(0.3, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: color });

  const packet = new THREE.Mesh(geometry, material);
  packet.position.copy(start);

  packet.userData = {
    start: start.clone(),
    end: end.clone(),
    progress: 0,
    trail: [],
  };

  scene.add(packet);
  packets.push(packet);
}

function animatePackets() {
  packets.forEach((packet) => {
    packet.userData.progress += 0.01; // slower speed

    let t = packet.userData.progress;

    if (t >= 1) {
      scene.remove(packet);
    } else {
      const newPos = new THREE.Vector3();
      newPos.lerpVectors(packet.userData.start, packet.userData.end, t);
      packet.position.copy(newPos);

      // trail effect
      const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: packet.material.color,
        transparent: true,
        opacity: 0.5,
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.copy(newPos);
      scene.add(trail);

      setTimeout(() => scene.remove(trail), 600);
    }
  });

  packets = packets.filter((p) => p.userData.progress < 1);
}

/* ===============================
   RUN 5 ROUNDS PER CLICK
================================= */
async function runFederatedRounds() {
  if (simulationRunning) return;
  simulationRunning = true;

  document.getElementById("startBtn").disabled = true;

  for (let i = 0; i < 5; i++) {
    await fetch("http://127.0.0.1:5000/run_round", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        updateCharts(data);

        phaseText = "Uploading";
        updatePhase();
        clients.forEach((client) => {
          createPacket(client.position, aggregator.position, 0x007bff);
        });
      });

    await delay(1500);

    phaseText = "Aggregating";
    updatePhase();
    createPacket(aggregator.position, globalServer.position, 0xff6f00);

    await delay(1500);

    phaseText = "Broadcasting";
    updatePhase();
    clients.forEach((client) => {
      createPacket(globalServer.position, client.position, 0x28a745);
    });

    await delay(1800);
  }

  phaseText = "Idle";
  updatePhase();

  simulationRunning = false;
  document.getElementById("startBtn").disabled = false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ===============================
   UPDATE PHASE TEXT
================================= */
function updatePhase() {
  document.getElementById("phaseStatus").innerText = "Phase: " + phaseText;
}

/* ===============================
   UPDATE CHARTS
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
        line: { color: "#007bff" },
      },
    ],
    {
      title: {
        text: "Global Model Accuracy",
        font: { size: 18 },
      },
      xaxis: {
        title: "Federated Round",
        showgrid: true,
        zeroline: true,
      },
      yaxis: {
        title: "Accuracy",
        showgrid: true,
        zeroline: true,
      },
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
        line: { color: "#28a745" },
      },
    ],
    {
      title: {
        text: "Model Size vs Accuracy",
        font: { size: 18 },
      },
      xaxis: {
        title: "Model Size (KB)",
        showgrid: true,
        zeroline: true,
      },
      yaxis: {
        title: "Accuracy",
        showgrid: true,
        zeroline: true,
      },
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
