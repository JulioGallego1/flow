var renderer, scene, camera;
var cameraControls;
var context, textCanvas;
// Monitor de fps.
const stats = new Stats();
//Reloj para deltas.
const clock = new THREE.Clock();

var estadoPartida = 'inicio'; //inicio, jugando, perdido o ganado.
var tiempoPartida = 0;
var tiempoTotal = 0;
var camaraLibre = false;

const tamTerreno = 800;
const resolucionTerreno = 200;
var terreno;

const alturaMinimaMapa = -21;
const alturaMaximaMapa = 40;
const alturaCima = 40;
const anchoCamino = 14;

// Alturas de los vertices de la malla del terrenoe.
var hm_data = null;

// Puntos del camino representados con (x, z). La coord. y la vamos incrementando.
const puntosCamino = [
  [0, 260], [40, 200], [-30, 140], [-60, 80], [10, 30], [80, -10], [60, -70],
  [-10, -100], [-80, -130], [-60, -190], [0, -220], [50, -250]
];

var longitudesTramos = []; // Longitud de segmentos del camino.
var acumuladoTramos = [];
var longitudCamino = 0;
var muestrasCamino = []; // Muestras para hacer cálculos.

// Distancia que hay que recorrer por el camino desde la salida, hasta cada zona "especial"
var distanciaPuente, distanciaInicioRocas, distanciaFinRocas;
var distanciaMuralla, distanciaPuerta;

var zonasOcupadas = []; // Para evitar colisiones.

// Plano de agua que va subiendo.
var agua;
const tamAgua = 2000;
const divisionesAgua = 200;
var nivelAgua = -4;
const nivelAguaInicial = -4;
const nivelAguaMaximo = 48;

const velocidadAguaBase = (alturaCima + 4) / 180;
const factorDificultad = { 'Fácil': 1, 'Medio': 1.25, 'Difícil': 1.55 };

// gato
var gato;

var mixer = null;
var acciones = {};
var animacionActual = null;

const velocidadGiroGato = 2.6;
var angulo = 0;
var velocidadVertical = 0;
var enSuelo = true;


const gravedad = -30;
const impulsoSalto = 10;

// colisiones
const raycaster = new THREE.Raycaster();
const raycasterSuelo = new THREE.Raycaster();
var objectsToCheck = [];
var objetosSuelo = [];

// barco final
const alturaCubierta = 1.2;

var barco, perro, capibara;

var barcoLlegando = false;
var barcoAtracado = false;
const posicionBarco = new THREE.Vector3();
const posicionBarcoLejos = new THREE.Vector3();
const posicionBarcoAtracado = new THREE.Vector3();

// rocas
var rocasRodantes = [];
var tiempoSiguienteRoca = 0;

const intervaloRocas = 5;
// Si ya se ha mostrado el aviso al llegar a la zona de las rocas
var avisoRocas = false;
const radioRoca = 2.0;
const velocidadRoca = 6;
// Metros que rueda cada roca desde el arco antes de desaparecer
const recorridoRoca = 70;

var arcos = [];

const listaModelos = [
  ['cerezos', 'modelos/cerezos.glb', 'y', [['cerezo0', 10], ['cerezo1', 8], ['cerezo2', 9]]],
  ['arboles', 'modelos/arboles.glb', 'y', [['sauce', 12], ['matorral', 2.5], ['pino', 13]]],
  ['arbolGrande', 'modelos/arbol_grande.glb', 'y', [['arbolGrande', 16]]],
  ['estatua', 'modelos/estatua.glb', 'y', 1],
  ['puente', 'modelos/puente.glb', 'x', 34],
  ['torii', 'modelos/torii.glb', 'x', 16.6],
  ['puerta', 'modelos/puerta.glb', 'x', 20],
  ['perro', 'modelos/perro.glb', 'y', 2],
  ['capibara', 'modelos/capibara.glb', 'y', 1.6]
];

var modelos = {};
var modelosCargados = 0;
var escenarioListo = false;

var luzSol, discoSol;
const direccionSol = new THREE.Vector3(-0.45, 0.34, -0.85).normalize();

var decorado = [];
// Distancia del arco grande del que salen las rocas de la ladera
var distanciaMuroRocas;

// Mensajes del HUD
var mensaje = '';
var tiempoMensaje = 0;

// Controles de teclado
const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  speed: 7
};

var controlsUI = {
  dificultad: 'Fácil',
  distanciaCamara: 6,
  alturaCamara: 2.5,
  reiniciar: function () { reiniciarPartida(); }
};

// Event listeners para controles
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': controls.moveForward = true; break;
    case 'ArrowDown': case 'KeyS': controls.moveBackward = true; break;
    case 'ArrowLeft': case 'KeyA': controls.moveLeft = true; break;
    case 'ArrowRight': case 'KeyD': controls.moveRight = true; break;
    case 'Space': event.preventDefault(); saltar(); break;
  }
});
document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp': case 'KeyW': controls.moveForward = false; break;
    case 'ArrowDown': case 'KeyS': controls.moveBackward = false; break;
    case 'ArrowLeft': case 'KeyA': controls.moveLeft = false; break;
    case 'ArrowRight': case 'KeyD': controls.moveRight = false; break;
    case 'Enter': if (estadoPartida === 'inicio' && escenarioListo) reiniciarPartida(); break;
    case 'KeyR': if (estadoPartida !== 'inicio') reiniciarPartida(); break;
    case 'KeyC':
      camaraLibre = !camaraLibre;
      cameraControls.enabled = camaraLibre;
      if (camaraLibre) { cameraControls.target.copy(gato.position); cameraControls.update(); }
      break;
  }
});


// 1-inicializa
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();


function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0xffffff));

  // Activar sombras
  renderer.shadowMap.enabled = true;
  document.getElementById('container').appendChild(renderer.domElement);

  // Configurar el canvas de texto con las mismas dimensiones que el de three.js
  textCanvas = document.getElementById('text_canvas');
  context = textCanvas.getContext('2d');
  textCanvas.width = window.innerWidth;
  textCanvas.height = window.innerHeight;

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 3000);
  camera.position.set(30, 30, 320);

  // Crear Stats
  stats.showPanel(0);
  stats.domElement.style.top = 'auto';
  stats.domElement.style.bottom = '0px';
  document.getElementById('container').appendChild(stats.domElement);

  // Para cámara libre
  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  cameraControls.enabled = false;

  // Interfaz de usuario
  var gui = new dat.GUI();
  var gui_juego = gui.addFolder('Opciones');
  gui_juego.add(controlsUI, 'dificultad', ['Fácil', 'Medio', 'Difícil']).name('Dificultad');
  gui_juego.add(controlsUI, 'distanciaCamara', 3, 15).name('Distancia cámara');
  gui_juego.add(controlsUI, 'alturaCamara', 0.5, 8).name('Altura cámara');
  gui_juego.add(controlsUI, 'reiniciar').name('Reiniciar');
  gui.close();

  window.addEventListener('resize', updateAspectRatio);
}


function loadScene() {
  var luzAmbiental = new THREE.AmbientLight(0x6c6080, 0.40);
  scene.add(luzAmbiental);

  var luzCielo = new THREE.HemisphereLight(0xa8b4d8, 0x7a5434, 0.60);
  scene.add(luzCielo);

  luzSol = new THREE.DirectionalLight(0xffa860, 1.9);
  luzSol.castShadow = true;
  luzSol.shadow.mapSize.width = 2048;
  luzSol.shadow.mapSize.height = 2048;
  // Hacer cajas de sombre grandes 
  luzSol.shadow.camera.left = -70;
  luzSol.shadow.camera.right = 70;
  luzSol.shadow.camera.top = 50;
  luzSol.shadow.camera.bottom = -50;
  luzSol.shadow.camera.near = 1;
  luzSol.shadow.camera.far = 400;
  luzSol.shadow.bias = -0.0004;
  luzSol.shadow.normalBias = 0.03;
  scene.add(luzSol);
  scene.add(luzSol.target);

  calcularLongitudesCamino();
  crearCielo();
  crearTerreno();
  crearAgua();
  crearBarco();
  crearGato();
  colocarBarcoInicio();
}

// Funciones para el camino y terreno

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calcularLongitudesCamino() {
  longitudCamino = 0;
  for (var i = 0; i < puntosCamino.length - 1; i++) {
    var deltaX = puntosCamino[i + 1][0] - puntosCamino[i][0];
    var deltaZ = puntosCamino[i + 1][1] - puntosCamino[i][1];

    // Sacamos distancias con Pitágoras.
    longitudesTramos[i] = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    acumuladoTramos[i] = longitudCamino;
    longitudCamino += longitudesTramos[i];
  }

  // Zonas del nivel
  distanciaPuente = acumuladoTramos[2] + longitudesTramos[2] / 2;
  distanciaInicioRocas = acumuladoTramos[3] + 7;
  distanciaFinRocas = acumuladoTramos[3] + longitudesTramos[3] - 5; // Al final
  distanciaMuralla = acumuladoTramos[6] + longitudesTramos[6] / 2;
  distanciaPuerta = acumuladoTramos[9] + longitudesTramos[9] / 2;
  distanciaMuroRocas = distanciaFinRocas + 2;

  calcularMuestrasCamino();
}

// Funcion para tener el camino muestreado y poder elegir posicion decorado.
function calcularMuestrasCamino() {
  for (var distancia = 0; distancia <= longitudCamino; distancia++) {
    var punto = puntoCamino(distancia);
    muestrasCamino.push({ x: punto.x, z: punto.z, distanciaRecorrida: distancia });
  }
}

// Busca el punto del camino mas cercano a posicionX, posicionZ.
function infoCamino(posicionX, posicionZ) {
  var masCercana = muestrasCamino[0];
  var distanciaMinima = Infinity;
  for (var i = 0; i < muestrasCamino.length; i++) {
    var distanciaX = posicionX - muestrasCamino[i].x;
    var distanciaZ = posicionZ - muestrasCamino[i].z;
    var distancia = Math.sqrt(distanciaX * distanciaX + distanciaZ * distanciaZ);
    if (distancia < distanciaMinima) { distanciaMinima = distancia; masCercana = muestrasCamino[i]; }
  }
  return { distanciaAlCentro: distanciaMinima, distanciaRecorrida: masCercana.distanciaRecorrida };
}

// Saber en qué punto del camino estamos solo con la distancia
function puntoCamino(distanciaRecorrida) {
  for (var i = 0; i < puntosCamino.length - 1; i++) {
    if (distanciaRecorrida <= acumuladoTramos[i] + longitudesTramos[i] || i === puntosCamino.length - 2) {
      //Interpolacion.
      var fraccionTramo = (distanciaRecorrida - acumuladoTramos[i]) / longitudesTramos[i];
      var direccionX = (puntosCamino[i + 1][0] - puntosCamino[i][0]) / longitudesTramos[i];
      var direccionZ = (puntosCamino[i + 1][1] - puntosCamino[i][1]) / longitudesTramos[i];

      var posicionX = puntosCamino[i][0] + direccionX * longitudesTramos[i] * fraccionTramo;
      var posicionZ = puntosCamino[i][1] + direccionZ * longitudesTramos[i] * fraccionTramo;

      return { x: posicionX, z: posicionZ, y: hm_altura(posicionX, posicionZ), direccionX: direccionX, direccionZ: direccionZ };
    }
  }
}

// Funcion para determinar donde colocar decorado a un lado del camino.
function puntoLateral(distanciaRecorrida, lateral) {
  var puntoCentral = puntoCamino(distanciaRecorrida);
  // desp. perpendicular.
  var posicionX = puntoCentral.x - puntoCentral.direccionZ * lateral;
  var posicionZ = puntoCentral.z + puntoCentral.direccionX * lateral;
  return { x: posicionX, z: posicionZ, y: hm_altura(posicionX, posicionZ), direccionX: puntoCentral.direccionX, direccionZ: puntoCentral.direccionZ };
}

// Altura del suelo
function hm_altura(posicionX, posicionZ) {
  if (hm_data === null) return 0;

  var verticesPorLado = resolucionTerreno;
  var paso = tamTerreno / (verticesPorLado - 1); //intervalos resta 1

  // saber en que celda cae el punto
  var celdaX = (posicionX + tamTerreno / 2) / paso;
  var celdaZ = (posicionZ + tamTerreno / 2) / paso;
  var i = clamp(Math.floor(celdaX), 0, verticesPorLado - 2);
  var j = clamp(Math.floor(celdaZ), 0, verticesPorLado - 2);

  // saber en que zonda de esa celda
  var fraccionX = clamp(celdaX - i, 0, 1);
  var fraccionZ = clamp(celdaZ - j, 0, 1);

  var alturaVertice0 = hm_data[i * verticesPorLado + j];
  var alturaVertice1 = hm_data[(i + 1) * verticesPorLado + j];
  var alturaVertice2 = hm_data[(i + 1) * verticesPorLado + j + 1];
  var alturaVertice3 = hm_data[i * verticesPorLado + j + 1];

  // Saber en que triangulo del cuadrado
  if (fraccionX >= fraccionZ) {
    return alturaVertice0 + (alturaVertice1 - alturaVertice0) * fraccionX + (alturaVertice2 - alturaVertice1) * fraccionZ;
  }
  return alturaVertice0 + (alturaVertice3 - alturaVertice0) * fraccionZ + (alturaVertice2 - alturaVertice3) * fraccionX;
}

// Leer los pixeles.
function getImagePixelData(image) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0, image.width, image.height);
  return context.getImageData(0, 0, image.width, image.height).data;
}

// Terreno desde heightmap
function crearTerreno() {
  const textureLoader = new THREE.TextureLoader();
  const texturaHierba = textureLoader.load('images/terreno_hierba.jpg');
  texturaHierba.wrapS = THREE.RepeatWrapping;
  texturaHierba.wrapT = THREE.RepeatWrapping;

  textureLoader.load('images/mapa_alturas.png', function (mapa) {
    const data = getImagePixelData(mapa.image);
    const verticesPorLado = resolucionTerreno;
    const paso = tamTerreno / (verticesPorLado - 1);
    const numVertices = verticesPorLado * verticesPorLado;

    // Crear geometría personalizada
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(numVertices * 3);
    const coords_uv = new Float32Array(numVertices * 2); // coords u,v
    const colores = new Float32Array(numVertices * 3);
    const indices = [];
    hm_data = new Float32Array(numVertices);

    // Definir triángulos
    for (let i = 0; i < verticesPorLado - 1; i++) {
      for (let j = 0; j < verticesPorLado - 1; j++) {
        const vertice0 = i * verticesPorLado + j;
        const vertice1 = (i + 1) * verticesPorLado + j;
        const vertice2 = (i + 1) * verticesPorLado + (j + 1);
        const vertice3 = i * verticesPorLado + (j + 1);
        indices.push(vertice0, vertice2, vertice1);
        indices.push(vertice0, vertice3, vertice2);
      }
    }


    for (let i = 0; i < verticesPorLado; i++) {
      for (let j = 0; j < verticesPorLado; j++) {
        const index = i * verticesPorLado + j;

        const rojo = data[index * 4];
        const verde = data[index * 4 + 1];

        const alturaVertice = alturaMinimaMapa + rojo / 255 * (alturaMaximaMapa - alturaMinimaMapa);
        hm_data[index] = alturaVertice;
        // xyz
        vertices[index * 3 + 0] = -tamTerreno / 2 + i * paso;
        vertices[index * 3 + 1] = alturaVertice;
        vertices[index * 3 + 2] = -tamTerreno / 2 + j * paso;

        coords_uv[index * 2 + 0] = i / verticesPorLado * 90;
        coords_uv[index * 2 + 1] = j / verticesPorLado * 90;

        // Color por vertice si es camino (si no textura grass)
        const camino = verde / 255;
        colores[index * 3 + 0] = 1 - 0.20 * camino;
        colores[index * 3 + 1] = 1 - 0.70 * camino;
        colores[index * 3 + 2] = 1 - 0.6 * camino;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(coords_uv, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({ map: texturaHierba, vertexColors: true, });
    terreno = new THREE.Mesh(geometry, material);
    terreno.receiveShadow = true;
    scene.add(terreno);

    crearTroncos();
    colocarGatoEn(4);
    cargarModelos();

    // Camara fija
    var inicio = puntoCamino(0);
    var adelante = puntoCamino(60);
    camera.position.set(inicio.x - inicio.direccionX * 30, inicio.y + 25, inicio.z - inicio.direccionZ * 30);
    camera.lookAt(adelante.x, adelante.y, adelante.z);
  });
}

// Crear el cielo atardecer.
function crearCielo() {
  scene.background = new THREE.Color(0xe8a07c);

  let geometriaSol = new THREE.CircleGeometry(100, 50)
  discoSol = new THREE.Mesh(geometriaSol, new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  scene.add(discoSol);
}

// Hacer que nos siga el sol
function actualizarSol() {
  discoSol.position.copy(camera.position).addScaledVector(direccionSol, 1500);
  discoSol.lookAt(camera.position);
}


// Meanejo del agua.
function crearAgua() {
  // Phong con brillos naranjas
  var materialAgua = new THREE.MeshPhongMaterial({ color: 0x2b4a58, shininess: 300, specular: 0x9a6438 });

  var geometriaAgua = new THREE.PlaneGeometry(tamAgua, tamAgua, divisionesAgua, divisionesAgua);
  geometriaAgua.rotateX(-Math.PI / 2);
  agua = new THREE.Mesh(geometriaAgua, materialAgua);

  agua.receiveShadow = true;
  scene.add(agua);
}

// funcion sinusoidal para simular las olas
function alturaOla(posicionX, posicionZ) {
  return 0.45 * Math.sin(0.25 * posicionX + tiempoTotal) + 0.7 * Math.sin(0.2 * posicionZ + 1.7 * tiempoTotal);
}

function actualizarOlas() {
  agua.position.y = nivelAgua;
  var posiciones = agua.geometry.attributes.position;
  for (var k = 0; k < posiciones.count; k++) posiciones.setY(k, alturaOla(posiciones.getX(k), posiciones.getZ(k)));
  posiciones.needsUpdate = true;
  agua.geometry.computeVertexNormals();
}


// Cargar los modelos
function cargarModelos() {
  const loader = new THREE.GLTFLoader();

  listaModelos.forEach(([nombre, archivo, escala, configuracion]) => {

    const ruta = archivo.endsWith('.glb')
      ? `models/${archivo}`
      : `models/${archivo}/scene.gltf`;

    loader.load(ruta, (gltf) => {

      if (Array.isArray(configuracion)) {
        configuracion.forEach(([nombreObjeto, ajuste]) => {
          const objeto = gltf.scene.getObjectByName(nombreObjeto);
          modelos[nombreObjeto] = prepararModelo(objeto, escala, ajuste, true);
        });
      } else {
        modelos[nombre] = prepararModelo(gltf.scene, escala, configuracion, false);
      }

      modelosCargados++;

      if (modelosCargados === listaModelos.length) {
        colocarEscenario();
      }

    }, undefined, (error) => {
      console.error("No se pudo cargar ${archivo}", error);
    });
  });
}

//Preparar bounding boxes y tamaños de los modelos
function prepararModelo(modelo, eje, tamano, origenEnBase) {
  var box = new THREE.Box3().setFromObject(modelo);
  var size = new THREE.Vector3();
  box.getSize(size);
  var center = new THREE.Vector3();
  box.getCenter(center);

  if (origenEnBase) modelo.position.set(0, 0, 0);
  else modelo.position.set(-center.x, -box.min.y, -center.z); // si el modelo no está centrado en origen (sketchfab)
  // aquí recorro el modelo y activo sombras
  modelo.traverse(function (objeto) {
    if (objeto.isMesh) {
      objeto.castShadow = true;
      objeto.receiveShadow = true;
      // el puente se ve negro pq no hay mapa de entorno
      if (objeto.material.metalness !== undefined) objeto.material.metalness = 0;
    }
  });

  var contenedor = new THREE.Object3D();
  contenedor.add(modelo);
  var escala = tamano / size[eje];
  contenedor.scale.set(escala, escala, escala);
  return contenedor;
}

function copiaModelo(nombre) {
  return modelos[nombre].clone(true);
}

// Volumen invisible para las colisiones de algunos modelos
function crearVolumen(geometria, posicionX, posicionY, posicionZ, giro) {
  var volumen = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial());
  volumen.position.set(posicionX, posicionY, posicionZ);
  volumen.rotation.y = giro;
  volumen.visible = false;
  scene.add(volumen);
  volumen.updateMatrixWorld(true);
  objectsToCheck.push(volumen);
  return volumen;
}

function colocarEscenario() {
  colocarEstatuas();
  colocarArcos();
  colocarPuente();
  // Arco de piedra grande del que salen las rocas rodantes
  colocarPuerta(distanciaMuroRocas, 1.5);
  // En la cima no se ponen arboles
  var cima = puntoCamino(longitudCamino);
  ocuparZona(cima.x, cima.z, 30);
  colocarPuerta(distanciaPuerta, 1);
  colocarAnimales();
  crearRocasRodantes();
  colocarArboles();
  escenarioListo = true;
}

// Dibujar decorado solo cercano
function agregarDecorado(objeto, distancia) {
  decorado.push({ objeto: objeto, distancia2: distancia * distancia });
}

function actualizarDecorado() {
  for (var i = 0; i < decorado.length; i++) {
    var elemento = decorado[i];
    var distanciaX = elemento.objeto.position.x - camera.position.x, distanciaZ = elemento.objeto.position.z - camera.position.z;
    elemento.objeto.visible = distanciaX * distanciaX + distanciaZ * distanciaZ < elemento.distancia2;
  }
}

// Comprueba que un sitio no invade decorado ya disponible
function sitioLibre(posicionX, posicionZ, radio) {
  for (var i = 0; i < zonasOcupadas.length; i++) {
    var distanciaX = posicionX - zonasOcupadas[i].x, distanciaZ = posicionZ - zonasOcupadas[i].z;
    if (Math.sqrt(distanciaX * distanciaX + distanciaZ * distanciaZ) < zonasOcupadas[i].radio + radio) return false;
  }
  return true;
}

function ocuparZona(posicionX, posicionZ, radio) {
  zonasOcupadas.push({ x: posicionX, z: posicionZ, radio: radio });
}

function colocarArboles() {

  for (var numeroGrupo = 0; numeroGrupo < 170; numeroGrupo++) {
    var distanciaRecorrida = Math.random() * longitudCamino;
    var lado = Math.random() < 0.5 ? -1 : 1;
    var centro = puntoLateral(distanciaRecorrida, lado * (anchoCamino / 2 + 12 + Math.random() * 5));
    var tipos = distanciaRecorrida < longitudCamino / 2 ? ['cerezo0', 'cerezo1', 'cerezo2', 'matorral'] : ['pino', 'pino', 'matorral'];
    for (var k = 0; k < 14; k++) {
      var nombre = tipos[Math.floor(Math.random() * tipos.length)];
      if (k === 0 && distanciaRecorrida < longitudCamino / 2 && Math.random() < 0.25) nombre = 'arbolGrande';
      var posicionX = centro.x + (Math.random() - 0.5) * 25;
      var posicionZ = centro.z + (Math.random() - 0.5) * 25;
      var alturaDelSuelo = hm_altura(posicionX, posicionZ);
      // Fuera del camino
      if (infoCamino(posicionX, posicionZ).distanciaAlCentro < anchoCamino / 2 + 3
        || alturaDelSuelo < -1 || !sitioLibre(posicionX, posicionZ, 2)) { continue; }

      var arbol = copiaModelo(nombre);
      arbol.scale.multiplyScalar(0.8 + Math.random() * 1);
      arbol.position.set(posicionX, alturaDelSuelo - 0.3, posicionZ);
      arbol.rotation.y = Math.random() * Math.PI * 2;
      scene.add(arbol);
      ocuparZona(posicionX, posicionZ, 2);
      // Solo se dibuja cerca de la camara y tiene un volumen en el tronco para chocar
      agregarDecorado(arbol, 200);
      crearVolumen(new THREE.CylinderGeometry(0.6, 0.6, 8, 8), posicionX, alturaDelSuelo + 4, posicionZ, 0);
    }
  }
}

// Estatuas de gato junto al camino (distancia recorrida, lado y altura)
function colocarEstatuas() {
  var listaEstatuas = [
    [24, 1, 4], [24, -1, 4],
    [110, 1, 3.5],
    [165, -1, 5],
    [245, 1, 4],
    [440, 1, 4.5],
    [705, 1, 5], [705, -1, 5]
  ];
  for (var i = 0; i < listaEstatuas.length; i++) {
    var lado = listaEstatuas[i][1], alturaEstatua = listaEstatuas[i][2];
    var distanciaCentro = listaEstatuas[i][0] === 705 ? 4.5 : anchoCamino / 2 + 1;
    var punto = puntoLateral(listaEstatuas[i][0], lado * distanciaCentro);
    colocarEstatua(punto.x, punto.z, alturaEstatua, Math.atan2(punto.direccionX, punto.direccionZ) + lado * Math.PI / 2);
  }
  //estatua final
  var puntoCima = puntoLateral(longitudCamino - 10, -6.5);
  colocarEstatua(puntoCima.x, puntoCima.z, 10, Math.atan2(puntoCima.direccionX, puntoCima.direccionZ) - Math.PI / 2);
}

function colocarEstatua(posicionX, posicionZ, altura, giro) {
  var suelo = hm_altura(posicionX, posicionZ);
  var estatua = copiaModelo('estatua');
  estatua.scale.multiplyScalar(altura);
  estatua.position.set(posicionX, suelo - 0.1, posicionZ);
  estatua.rotation.y = giro;
  scene.add(estatua);
  agregarDecorado(estatua, 260);
  crearVolumen(new THREE.BoxGeometry(altura * 0.55, altura, altura * 0.9), posicionX, suelo + altura / 2, posicionZ, giro);
  ocuparZona(posicionX, posicionZ, altura * 0.6 + 2);
}

function colocarArcos() {
  var posicionesArcos = [14, acumuladoTramos[3] - 9, acumuladoTramos[5] + 8, acumuladoTramos[7] + 25];
  for (var indiceArco = 0; indiceArco < posicionesArcos.length; indiceArco++) {
    arcos.push({ distanciaRecorrida: posicionesArcos[indiceArco] });
  }

  for (var i = 0; i < arcos.length; i++) {
    var puntoDelCamino = puntoCamino(arcos[i].distanciaRecorrida);
    //rotarlo para q el camino quede entre medias
    var giro = Math.atan2(puntoDelCamino.direccionX, puntoDelCamino.direccionZ);
    var arco = copiaModelo('torii');
    arco.position.set(puntoDelCamino.x, puntoDelCamino.y - 0.2, puntoDelCamino.z);
    ocuparZona(puntoDelCamino.x, puntoDelCamino.z, 12);
    arco.rotation.y = giro;
    scene.add(arco);

    // Volumenes de los pilares
    for (var lado = -1; lado <= 1; lado += 2) {
      var pilar = puntoLateral(arcos[i].distanciaRecorrida, lado * 4);
      crearVolumen(new THREE.CylinderGeometry(1, 1, 10, 3), pilar.x, puntoDelCamino.y + 5, pilar.z, 0);
    }
  }
}

function colocarPuente() {
  var puntoDelCamino = puntoCamino(distanciaPuente);
  ocuparZona(puntoDelCamino.x, puntoDelCamino.z, 25);
  var puente = copiaModelo('puente');
  puente.position.set(puntoDelCamino.x, puntoDelCamino.y, puntoDelCamino.z);
  //rotar para cruzr barranco
  puente.rotation.y = Math.atan2(puntoDelCamino.direccionX, puntoDelCamino.direccionZ) - Math.PI / 2;
  scene.add(puente);

  // Meter el puente como suelo con el raycaster
  var extremo = puntoCamino(distanciaPuente - 14.5);
  puente.updateMatrixWorld(true);
  raycasterSuelo.set(new THREE.Vector3(extremo.x, extremo.y + 50, extremo.z), new THREE.Vector3(0, -1, 0));
  var impactos = raycasterSuelo.intersectObject(puente, true);
  if (impactos.length > 0) puente.position.y += extremo.y - impactos[0].point.y;
  puente.updateMatrixWorld(true);

  // sus barandillas son obstaculos
  objetosSuelo.push(puente);
  puente.traverse(function (objeto) {
    if (objeto.isMesh && objeto.material.name === 'Stone_gaurd_rail_material') objectsToCheck.push(objeto);
  });
}


// Coloca la puerta de piedra a la escala pedida
function colocarPuerta(distancia, escala) {
  var puntoDelCamino = puntoCamino(distancia);
  var giro = Math.atan2(puntoDelCamino.direccionX, puntoDelCamino.direccionZ);
  ocuparZona(puntoDelCamino.x, puntoDelCamino.z, 16 * escala);
  var puerta = copiaModelo('puerta');

  puerta.scale.multiplyScalar(escala);
  puerta.position.set(puntoDelCamino.x, puntoDelCamino.y - 0.6 * escala, puntoDelCamino.z);
  puerta.rotation.y = giro;
  scene.add(puerta);
  agregarDecorado(puerta, 220);

  // Volumenes de los dos pilares
  for (var lado = -1; lado <= 1; lado += 2) {
    var pilar = puntoLateral(distancia, lado * 16 * escala);
    crearVolumen(new THREE.BoxGeometry(25 * escala, 64 * escala, 10 * escala), pilar.x, puntoDelCamino.y, pilar.z, giro);
  }
}

// Crear troncos que tapan el camino
function crearTroncos() {
  var materialTronco = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('images/wood512.jpg'), color: 0x444333 });
  var geometriaTronco = new THREE.CylinderGeometry(0.95, 0.50, anchoCamino - 3.5, 14);
  var posiciones = [38, 58, acumuladoTramos[1] + 25, acumuladoTramos[1] + 75, acumuladoTramos[5] + 30,
    acumuladoTramos[5] + 50, acumuladoTramos[7] + 50, acumuladoTramos[8] + 50, acumuladoTramos[9] + 15,
    acumuladoTramos[1] + 50, acumuladoTramos[8] + 30, distanciaMuralla];

  for (var i = 0; i < posiciones.length; i++) {
    var puntoTronco = puntoCamino(posiciones[i]);
    var tronco = new THREE.Object3D();
    var cilindro = new THREE.Mesh(geometriaTronco, materialTronco);

    var rand = Math.random() + 0.5
    if (Math.floor(rand) == 0) cilindro.rotation.z = Math.PI / 2;
    else cilindro.rotation.z = -Math.PI / 2;

    cilindro.castShadow = true;
    cilindro.receiveShadow = true;
    tronco.add(cilindro);
    tronco.position.set(puntoTronco.x, puntoTronco.y + 0.5, puntoTronco.z);
    tronco.rotation.y = Math.atan2(puntoTronco.direccionX, puntoTronco.direccionZ) + (Math.random() - 0.5) * 0.6;
    scene.add(tronco);
    // Colisiona de frente y abajo
    objectsToCheck.push(cilindro);
    objetosSuelo.push(cilindro);
  }
}

function crearRocasRodantes() {
  // Material con la textura de piedra del puente
  var materialRoca = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('images/textura_roca.jpg') });
  for (var i = 0; i < 10; i++) {
    var roca = new THREE.Object3D();
    var giro = new THREE.Mesh(new THREE.DodecahedronGeometry(radioRoca, 1), materialRoca);
    giro.castShadow = true;
    roca.add(giro);
    roca.visible = false;
    scene.add(roca);
    rocasRodantes.push({ objeto: roca, malla: giro, distanciaRecorrida: 0, activa: false });
  }
}

function lanzarRoca() {
  for (var i = 0; i < rocasRodantes.length; i++) {
    if (!rocasRodantes[i].activa) {
      rocasRodantes[i].activa = true;
      rocasRodantes[i].distanciaRecorrida = distanciaMuroRocas + 1;
      rocasRodantes[i].objeto.visible = true;
      return;
    }
  }
}

function quitarRocas() {
  for (var i = 0; i < rocasRodantes.length; i++) { rocasRodantes[i].activa = false; rocasRodantes[i].objeto.visible = false; }
  tiempoSiguienteRoca = 0;
  avisoRocas = false;
}

function actualizarRocas(delta) {
  var distanciaGato = infoCamino(gato.position.x, gato.position.z).distanciaRecorrida;
  if (estadoPartida === 'jugando' && distanciaGato > distanciaInicioRocas - 15 && distanciaGato < distanciaFinRocas + 5) {
    if (!avisoRocas) { avisoRocas = true; mostrarMensaje('¡Esquiva las rocas!', 4); }
    tiempoSiguienteRoca -= delta;
    if (tiempoSiguienteRoca <= 0) { lanzarRoca(); tiempoSiguienteRoca = intervaloRocas; }
  }

  for (var i = 0; i < rocasRodantes.length; i++) {
    var roca = rocasRodantes[i];
    if (!roca.activa) continue;
    // Baja por el camino
    roca.distanciaRecorrida -= velocidadRoca * delta;
    var puntoRoca = puntoCamino(roca.distanciaRecorrida);
    roca.objeto.position.set(puntoRoca.x, puntoRoca.y + radioRoca, puntoRoca.z);
    roca.objeto.rotation.y = Math.atan2(-puntoRoca.direccionX, -puntoRoca.direccionZ);
    roca.malla.rotation.x += velocidadRoca * delta / radioRoca;
    // Despues de recorridoRoca desaparece
    if (roca.distanciaRecorrida < distanciaMuroRocas - recorridoRoca) { roca.activa = false; roca.objeto.visible = false; continue; }

    // Choque con el gato
    var centroGato = gato.position.clone();
    centroGato.y += 0.5;
    // Si nos toca perdemos
    if (estadoPartida === 'jugando' && centroGato.distanceTo(roca.objeto.position) < radioRoca + 0.5) perderPartida();
  }
}

// Crear barco de escape
function crearBarco() {
  var texturaMadera = new THREE.TextureLoader().load('images/wood512.jpg');
  texturaMadera.wrapS = THREE.RepeatWrapping;
  texturaMadera.wrapT = THREE.RepeatWrapping;
  texturaMadera.repeat.set(3, 1);
  var materialMadera = new THREE.MeshLambertMaterial({ map: texturaMadera, color: 0x9a7452 });
  barco = new THREE.Object3D();

  var balsa = new THREE.Mesh(new THREE.BoxGeometry(14, alturaCubierta, 5), materialMadera);
  balsa.position.y = alturaCubierta / 2;
  balsa.castShadow = true;
  balsa.receiveShadow = true;
  barco.add(balsa);

  var mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 9, 10), materialMadera);
  mastil.position.set(1, alturaCubierta + 4.5, 0);
  mastil.castShadow = true;
  barco.add(mastil);

  var vela = new THREE.Mesh(new THREE.CircleGeometry(3, 3), new THREE.MeshLambertMaterial({ color: 0xeae0c8, side: THREE.DoubleSide }));
  vela.position.set(2.5, alturaCubierta + 6.2, 0);
  vela.castShadow = true;
  barco.add(vela);

  scene.add(barco);
}

// Cargar modelos de meshy de perro y capi
function colocarAnimales() {
  perro = copiaModelo('perro');

  perro.position.set(-3, alturaCubierta, 1.3);
  perro.rotation.y = Math.PI / 2;
  barco.add(perro);

  capibara = copiaModelo('capibara');

  capibara.position.set(3, alturaCubierta, 1.3);
  capibara.rotation.y = Math.PI / 2;
  barco.add(capibara);
}

function colocarBarcoInicio() {
  var finCamino = puntoCamino(longitudCamino);
  var direccionX = finCamino.direccionX, direccionZ = finCamino.direccionZ;

  posicionBarcoAtracado.set(finCamino.x + direccionX * 10, 0, finCamino.z + direccionZ * 10);
  posicionBarcoLejos.set(finCamino.x + direccionX * 110 + direccionZ * 40, 0, finCamino.z + direccionZ * 110 - direccionX * 40);
  posicionBarco.copy(posicionBarcoLejos);
  barco.rotation.set(0, Math.atan2(direccionX, direccionZ), 0);
  barco.position.set(posicionBarco.x, nivelAgua - 0.1, posicionBarco.z);
  barcoLlegando = false;
  barcoAtracado = false;
}

// El barco se acerca a la cima con TWEEN 
function acercarBarco() {
  barcoLlegando = true;
  mostrarMensaje('¡Un barco se acerca a la cima! Prepárate para subir a bordo', 6);
  new TWEEN.Tween(posicionBarco).to({ x: posicionBarcoAtracado.x, z: posicionBarcoAtracado.z }, 14000).onComplete(function () { barcoAtracado = true; mostrarMensaje('¡El barco ha llegado! Ve hasta el final del camino', 6); }).start();
}

// Escena final
function zarparBarco() {
  var destino = {
    x: posicionBarco.x + (posicionBarcoLejos.x - posicionBarcoAtracado.x) * 1.5,
    z: posicionBarco.z + (posicionBarcoLejos.z - posicionBarcoAtracado.z) * 1.5
  };
  new TWEEN.Tween(posicionBarco).to(destino, 30000).easing(TWEEN.Easing.Sinusoidal.InOut).start();
}


//Todo el código para el gato
function crearGato() {
  gato = new THREE.Object3D();
  scene.add(gato);

  var loader = new THREE.GLTFLoader();
  loader.load('models/gato/gato_realista.glb', function (gltf) {
    // bounding box
    gato.add(prepararModelo(gltf.scene, 'y', 1.2, false));

    // Animaciones
    mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach(function (clip) {
      acciones[clip.name] = mixer.clipAction(clip);
    });
    // esto hace que no cambie en el aire de postura
    acciones.SaltoAire.setLoop(THREE.LoopOnce);
    cambiarAnimacion('Quieto');
  }, undefined, function (error) {
    console.error("Error al cargar gato", error);
  });
}

function cambiarAnimacion(nombre) {
  if (mixer === null || animacionActual === nombre) return;

  if (animacionActual !== null)
    acciones[animacionActual].stop();

  acciones[nombre].reset().play();
  animacionActual = nombre;
}

function colocarGatoEn(distanciaRecorrida) {
  var puntoDelCamino = puntoCamino(distanciaRecorrida);
  angulo = Math.atan2(puntoDelCamino.direccionX, puntoDelCamino.direccionZ);
  gato.position.set(puntoDelCamino.x, puntoDelCamino.y, puntoDelCamino.z);
  gato.rotation.set(0, angulo, 0);
  velocidadVertical = 0;
  enSuelo = true;
}

function saltar() {
  if (estadoPartida !== 'jugando' || !enSuelo) return;
  velocidadVertical = impulsoSalto;
  enSuelo = false;
  cambiarAnimacion('SaltoAire');
}

//elegir la animacion segun estado o aventos
function elegirAnimacion() {
  if (!enSuelo) cambiarAnimacion('SaltoAire');
  else if (controls.moveForward) cambiarAnimacion('Galopar');
  else if (controls.moveBackward || controls.moveLeft || controls.moveRight) cambiarAnimacion('Andar');
  else cambiarAnimacion('Quieto');
  if (acciones.Andar) acciones.Andar.timeScale = controls.moveBackward ? -1.3 : 1;
}

// raycaster sobre el suelo
function alturaSuelo(posicion) {
  var altura = hm_altura(posicion.x, posicion.z);

  raycasterSuelo.set(new THREE.Vector3(posicion.x, posicion.y + 6, posicion.z), new THREE.Vector3(0, -1, 0));
  var impactos = raycasterSuelo.intersectObjects(objetosSuelo, true);
  for (var i = 0; i < impactos.length; i++) {
    if (impactos[i].point.y > posicion.y + 0.6) continue;
    if (impactos[i].point.y > altura) altura = impactos[i].point.y + 0.05;
    break;
  }
  return altura;
}

function moverGato(delta) {
  // Giro y avance a velocidad fija mientras se pulsa la tecla
  if (controls.moveLeft) angulo += velocidadGiroGato * delta;
  if (controls.moveRight) angulo -= velocidadGiroGato * delta;
  gato.rotation.y = angulo;
  var avance = 0;
  if (controls.moveForward) avance = controls.speed * delta;
  if (controls.moveBackward) avance = -1.2 * delta;

  if (avance !== 0) {
    //raycaster frontal
    var direccion = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo)).multiplyScalar(Math.sign(avance));
    raycaster.set(new THREE.Vector3(gato.position.x, gato.position.y + 0.4, gato.position.z), direccion);
    var intersects = raycaster.intersectObjects(objectsToCheck, true);
    var libre = intersects.length === 0 || intersects[0].distance > Math.abs(avance) + 0.75;
    // Suelo muy empinado
    if (hm_altura(gato.position.x + direccion.x * 0.5, gato.position.z + direccion.z * 0.5) > gato.position.y + 0.6) libre = false;
    if (libre) gato.position.addScaledVector(direccion, Math.abs(avance));
  }

  // Definir gravedad dependiente de delta si está en el aire
  var suelo = alturaSuelo(gato.position);
  if (enSuelo && suelo >= gato.position.y - 0.4) {
    gato.position.y = suelo;
    velocidadVertical = 0;
  } else {
    enSuelo = false;
    velocidadVertical += gravedad * delta;
    gato.position.y += velocidadVertical * delta;
    if (velocidadVertical <= 0 && gato.position.y <= suelo) {
      gato.position.y = suelo;
      velocidadVertical = 0;
      enSuelo = true;
    }
  }
  elegirAnimacion();
}

function updateCamera(delta) {
  var viewDir = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));
  var distancia = controlsUI.distanciaCamara;
  var objetivo = gato.position.clone().add(viewDir.multiplyScalar(-distancia));
  objetivo.y = gato.position.y + controlsUI.alturaCamara;

  objetivo.y = Math.max(objetivo.y, hm_altura(objetivo.x, objetivo.z) + 1, nivelAgua + 1);

  camera.position.lerp(objetivo, 0.1);
  camera.lookAt(gato.position.x, gato.position.y + 0.8, gato.position.z);
}

function camaraFinal() {
  // Vuelta alrededor del barco que se aleja
  camera.position.set(
    barco.position.x + Math.sin(tiempoTotal * 0.15) * 28,
    barco.position.y + 12,
    barco.position.z + Math.cos(tiempoTotal * 0.15) * 28
  );
  camera.lookAt(barco.position.x, barco.position.y + 2, barco.position.z);
}

function reiniciarPartida() {
  TWEEN.removeAll();
  scene.attach(gato);
  estadoPartida = 'jugando';
  tiempoPartida = 0;
  nivelAgua = nivelAguaInicial;
  quitarRocas();
  colocarGatoEn(4);
  colocarBarcoInicio();
  camera.position.set(gato.position.x, gato.position.y + 10, gato.position.z + 20);
  mostrarMensaje('¡El agua está subiendo! Sigue el camino hacia lo alto', 5);
}

function mostrarMensaje(texto, segundos) {
  mensaje = texto;
  tiempoMensaje = segundos;
}

// El gato sube al barco con TWEEN
function ganarPartida() {
  estadoPartida = 'ganado';
  mostrarMensaje('', 0);

  barco.attach(gato);
  gato.rotation.set(0, Math.PI / 2, 0);
  cambiarAnimacion('SaltoAire');
  new TWEEN.Tween(gato.position).to(
    {
      x: 4.5, y: alturaCubierta, z: -1.3
    },
    1500).onComplete(function () { cambiarAnimacion('Quieto'); }).start();
  zarparBarco();
}

// Choque con roca o con agua
function perderPartida() {
  estadoPartida = 'perdido';
  cambiarAnimacion('Quieto');
}

function updateAspectRatio() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  textCanvas.width = window.innerWidth;
  textCanvas.height = window.innerHeight;
}

function update() {
  var delta = Math.min(clock.getDelta(), 0.05);
  tiempoTotal += delta;
  TWEEN.update();

  if (mixer !== null) mixer.update(delta);
  if (tiempoMensaje > 0) tiempoMensaje -= delta;

  if (estadoPartida === 'jugando') {
    tiempoPartida += delta;
    nivelAgua = Math.min(nivelAguaMaximo, nivelAgua + velocidadAguaBase * factorDificultad[controlsUI.dificultad] * delta);
    moverGato(delta);

    if (!barcoLlegando && nivelAgua >= alturaCima - 9) acercarBarco();
    if (barcoAtracado && infoCamino(gato.position.x, gato.position.z).distanciaRecorrida > longitudCamino - 5) ganarPartida();
    else if (nivelAgua > gato.position.y + 0.4) perderPartida();
  }

  // Hundir si perdemos
  if (estadoPartida === 'perdido' && gato.position.y < nivelAgua + 0.5) {
    gato.position.y = Math.max(gato.position.y - delta * 0.5, nivelAgua - 1.5);
  }

  if (escenarioListo) {
    actualizarRocas(delta);
  }

  //barco se eleva con el agua
  barco.position.set(posicionBarco.x, nivelAgua - 0.2 + alturaOla(posicionBarco.x, posicionBarco.z) * 0.7, posicionBarco.z);
  barco.rotation.z = Math.sin(tiempoTotal * 0.9) * 0.025;

  var posicionGato = new THREE.Vector3();
  gato.getWorldPosition(posicionGato);
  luzSol.position.copy(posicionGato).addScaledVector(direccionSol, 150);
  luzSol.target.position.copy(posicionGato);

  if (camaraLibre) cameraControls.update();
  else if (estadoPartida === 'ganado') camaraFinal();
  else if (estadoPartida !== 'inicio') updateCamera(delta);

  actualizarOlas();
  actualizarSol();
  actualizarDecorado();

  stats.update();
}

// Creacion del hud

// Texto centrado en horizontal con una sombra debajo para que se lea bien
function textoCentrado(texto, posicionY, tam, color) {
  context.font = 'bold ' + tam + 'px Arial';
  context.textAlign = 'center';
  context.fillStyle = 'rgba(0,0,0,0.6)';
  context.fillText(texto, textCanvas.width / 2 + 2, posicionY + 2);
  context.fillStyle = color;
  context.fillText(texto, textCanvas.width / 2, posicionY);
}

// Franja de arriba con el titulo y una linea de texto (al ganar o al perder)
function panelFinal(titulo, texto) {
  context.fillStyle = 'rgba(10,20,30,0.5)';
  context.fillRect(0, 40, textCanvas.width, 140);
  textoCentrado(titulo, 100, 44, '#ffd54f');
  textoCentrado(texto, 150, 22, '#ffffff');
}

function dibujarHUD() {
  context.clearRect(0, 0, textCanvas.width, textCanvas.height);
  var mitadAltoPantalla = textCanvas.height / 2;

  // Pantalla de inicio
  if (estadoPartida === 'inicio') {
    context.fillStyle = 'rgba(10,20,30,0.45)';
    context.fillRect(0, mitadAltoPantalla - 140, textCanvas.width, 290);
    textoCentrado('FLOW', mitadAltoPantalla - 70, 64, '#f0e6c8');
    textoCentrado('Huida de la inundación', mitadAltoPantalla - 25, 28, '#d8e4ee');
    textoCentrado('El agua sube sin parar. Salta y esquiva hasta lo alto para llegar al barco.', mitadAltoPantalla + 20, 20, '#ffffff');
    textoCentrado('W/A/S/D: moverse   Espacio: saltar   C: cámara libre   R: reiniciar', mitadAltoPantalla + 55, 18, '#cfd8dc');
    textoCentrado('Dificultad: ' + controlsUI.dificultad, mitadAltoPantalla + 85, 18, '#cfd8dc');
    if (escenarioListo) textoCentrado('Pulsa ENTER para empezar', mitadAltoPantalla + 115, 26, '#ffd54f');
    else textoCentrado('Cargando modelos... ' + modelosCargados + ' / ' + listaModelos.length, mitadAltoPantalla + 115, 24, '#cfd8dc');
    return;
  }

  var segundos = Math.floor(tiempoPartida % 60);
  var tiempo = Math.floor(tiempoPartida / 60) + ':' + (segundos < 10 ? '0' : '') + segundos;

  // Al acabar la partida solo se ve la franja con el resultado
  if (estadoPartida === 'perdido') { panelFinal('¡Has perdido!', 'Pulsa R para volver a intentarlo'); return; }
  if (estadoPartida === 'ganado') { panelFinal('¡Has llegado al barco!', 'El gato ha llegado con sus amigos.  Tiempo: ' + tiempo + '   (R: jugar otra vez)'); return; }

  // Panel de informacion
  var progreso = Math.round(infoCamino(gato.position.x, gato.position.z).distanciaRecorrida / longitudCamino * 100);
  context.fillStyle = 'rgba(10,20,30,0.5)';
  context.fillRect(15, 15, 260, 62);
  context.font = '18px Arial';
  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.fillText('Tiempo: ' + tiempo + '   (' + controlsUI.dificultad + ')', 30, 42);
  context.fillText('Recorrido: ' + progreso + ' %', 30, 65);

  // Aviso cuando el agua esta a menos de 2 metros del gato y mensajes
  if (gato.position.y - nivelAgua < 2) textoCentrado('¡El agua te alcanza! ¡Sube!', 90, 30, '#ff5252');
  if (tiempoMensaje > 0) textoCentrado(mensaje, textCanvas.height - 60, 24, '#ffffff');
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
  dibujarHUD();
}
