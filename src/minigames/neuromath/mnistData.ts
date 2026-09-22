import * as tf from "@tensorflow/tfjs";

const IMAGE_SIZE = 784; // 28 * 28
const NUM_CLASSES = 10;
const MNIST_IMAGES_SPRITE_PATH = "https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png";
const MNIST_LABELS_PATH = "https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8";

// Usamos solo una porción del dataset completo (65000 imágenes) para que el
// entrenamiento en el navegador tome segundos y no minutos.
const NUM_TRAIN_ELEMENTS = 6000;
const NUM_TEST_ELEMENTS = 1000;
const NUM_DATASET_ELEMENTS = NUM_TRAIN_ELEMENTS + NUM_TEST_ELEMENTS;

export interface MnistBatch {
  xs: tf.Tensor4D;
  labels: tf.Tensor2D;
}

/**
 * El sprite es una imagen en escala de grises de 784px de ancho por 65000px
 * de alto: cada fila de 784 píxeles es una imagen de 28x28 aplanada. Solo
 * decodificamos las primeras NUM_DATASET_ELEMENTS filas que necesitamos.
 */
async function loadImages(): Promise<Float32Array> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar el sprite de MNIST"));
    img.src = MNIST_IMAGES_SPRITE_PATH;
  });

  const buffer = new ArrayBuffer(NUM_DATASET_ELEMENTS * IMAGE_SIZE * 4);
  const chunkSize = 1000;
  canvas.width = IMAGE_SIZE;
  canvas.height = chunkSize;

  for (let i = 0; i < NUM_DATASET_ELEMENTS / chunkSize; i++) {
    const view = new Float32Array(buffer, i * IMAGE_SIZE * chunkSize * 4, IMAGE_SIZE * chunkSize);
    ctx.drawImage(img, 0, i * chunkSize, IMAGE_SIZE, chunkSize, 0, 0, IMAGE_SIZE, chunkSize);
    const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, chunkSize);
    for (let j = 0; j < imageData.data.length / 4; j++) {
      view[j] = imageData.data[j * 4] / 255;
    }
  }

  return new Float32Array(buffer);
}

async function loadLabels(): Promise<Uint8Array> {
  const response = await fetch(MNIST_LABELS_PATH);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer, 0, NUM_DATASET_ELEMENTS * NUM_CLASSES);
}

export async function loadMnistData(): Promise<{ train: MnistBatch; test: MnistBatch }> {
  const [images, labels] = await Promise.all([loadImages(), loadLabels()]);

  const trainImages = images.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
  const testImages = images.slice(IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
  const trainLabels = labels.slice(0, NUM_CLASSES * NUM_TRAIN_ELEMENTS);
  const testLabels = labels.slice(NUM_CLASSES * NUM_TRAIN_ELEMENTS);

  return {
    train: {
      xs: tf.tensor4d(trainImages, [NUM_TRAIN_ELEMENTS, 28, 28, 1]),
      labels: tf.tensor2d(trainLabels, [NUM_TRAIN_ELEMENTS, NUM_CLASSES]),
    },
    test: {
      xs: tf.tensor4d(testImages, [NUM_TEST_ELEMENTS, 28, 28, 1]),
      labels: tf.tensor2d(testLabels, [NUM_TEST_ELEMENTS, NUM_CLASSES]),
    },
  };
}
