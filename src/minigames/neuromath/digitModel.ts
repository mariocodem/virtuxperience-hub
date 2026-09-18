import * as tf from "@tensorflow/tfjs";
import { loadMnistData } from "./mnistData";

const MODEL_STORAGE_KEY = "indexeddb://virtuxperience-neuromath-digit-model";

let modelPromise: Promise<tf.LayersModel> | null = null;

function buildModel(): tf.LayersModel {
  const model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: "relu",
      kernelInitializer: "varianceScaling",
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: "relu",
      kernelInitializer: "varianceScaling",
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 10, kernelInitializer: "varianceScaling", activation: "softmax" }));

  model.compile({ optimizer: tf.train.adam(), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
  return model;
}

async function trainAndPersistModel(): Promise<tf.LayersModel> {
  const model = buildModel();
  const { train, test } = await loadMnistData();

  await model.fit(train.xs, train.labels, {
    batchSize: 256,
    epochs: 6,
    validationData: [test.xs, test.labels],
    shuffle: true,
  });

  train.xs.dispose();
  train.labels.dispose();
  test.xs.dispose();
  test.labels.dispose();

  await model.save(MODEL_STORAGE_KEY);
  return model;
}

/** Devuelve el modelo listo para usar; entrena una sola vez y lo cachea en IndexedDB para futuras visitas. */
export function getDigitModel(): Promise<tf.LayersModel> {
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel(MODEL_STORAGE_KEY).catch(() => trainAndPersistModel());
  }
  return modelPromise;
}
