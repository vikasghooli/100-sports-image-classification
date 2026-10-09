"""Train and evaluate the 100-sport classifier without modifying the dataset."""
import json
import os
import shutil
import tempfile
from pathlib import Path

import h5py
import numpy as np
import pandas as pd
import tensorflow as tf
from PIL import Image
from tensorflow.keras.preprocessing.image import ImageDataGenerator


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "data"
CSV_FILE = DATA_DIR / "sports.csv"
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "model.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
METRICS_PATH = MODEL_DIR / "model_metrics.json"
HISTORY_PATH = MODEL_DIR / "training_history.json"
CONFUSION_MATRIX_PATH = MODEL_DIR / "confusion_matrix.png"
CONFUSION_MATRIX_JSON_PATH = MODEL_DIR / "confusion_matrix.json"
SOURCE_MODEL_GLOB = "EfficientNetB0-100*.h5"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
HEAD_EPOCHS = 3
FINE_TUNE_EPOCHS = 5
SEED = 42


def get_image_path(path: str) -> str:
    """Resolve a CSV path inside the existing, read-only dataset."""
    normalized = str(path).replace("\\", "/")
    direct = DATA_DIR / normalized
    if direct.exists():
        return str(direct)
    filename = Path(normalized).name
    for folder in ("train", "valid", "test"):
        candidate = DATA_DIR / folder / filename
        if candidate.exists():
            return str(candidate)
    return str(direct)


def dataframe_for_split(df: pd.DataFrame, split: str) -> pd.DataFrame:
    names = {"valid", "validation"} if split == "valid" else {split}
    result = df[df["data set"].str.lower().isin(names)].copy()
    result["filepath"] = result["filepaths"].apply(get_image_path)
    result = result[result["filepath"].apply(os.path.exists)].copy()
    if result.empty:
        raise RuntimeError(f"No valid images were found for the {split} split.")
    return result


def load_supplied_efficientnet() -> tf.keras.Model:
    """Load the supplied Keras 2.8 H5 through a patched temporary copy only."""
    matches = list(DATA_DIR.glob(SOURCE_MODEL_GLOB))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one model matching {SOURCE_MODEL_GLOB}, found {len(matches)}.")
    with tempfile.TemporaryDirectory(prefix="sports-efficientnet-") as temporary_dir:
        patched_path = Path(temporary_dir) / matches[0].name
        shutil.copy2(matches[0], patched_path)
        with h5py.File(patched_path, "r+") as h5_file:
            raw = h5_file.attrs["model_config"]
            config = json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
            patched = 0
            for layer in config["config"]["layers"]:
                if layer.get("class_name") == "DepthwiseConv2D" and layer["config"].pop("groups", None) is not None:
                    patched += 1
            if not patched:
                raise RuntimeError("The supplied model did not contain expected legacy depthwise layers.")
            h5_file.attrs.modify("model_config", json.dumps(config))
        return tf.keras.models.load_model(patched_path, compile=False)


def make_generator(dataframe: pd.DataFrame, class_names: list[str], augment: bool, shuffle: bool):
    generator = ImageDataGenerator(
        rotation_range=12 if augment else 0,
        width_shift_range=0.10 if augment else 0,
        height_shift_range=0.10 if augment else 0,
        zoom_range=0.12 if augment else 0,
        horizontal_flip=augment,
        fill_mode="nearest",
    )
    # The supplied EfficientNet contains its own Rescaling/Normalization layers.
    return generator.flow_from_dataframe(
        dataframe, x_col="filepath", y_col="labels", target_size=IMG_SIZE,
        batch_size=BATCH_SIZE, class_mode="categorical", classes=class_names,
        shuffle=shuffle, seed=SEED,
    )


def compile_model(model: tf.keras.Model, learning_rate: float) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy", metrics=["accuracy"],
    )


def callbacks(path: Path) -> list[tf.keras.callbacks.Callback]:
    return [
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", mode="max", patience=2, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(path, monitor="val_accuracy", mode="max", save_best_only=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=1, min_lr=1e-7, verbose=1),
    ]


def evaluate(model: tf.keras.Model, data) -> tuple[float, float]:
    data.reset()
    loss, accuracy = model.evaluate(data, verbose=0)
    return float(loss), float(accuracy)


def test_metrics(model: tf.keras.Model, data, class_names: list[str]) -> tuple[dict, np.ndarray]:
    data.reset()
    predicted = np.argmax(model.predict(data, verbose=0), axis=1)
    actual = data.classes
    matrix = tf.math.confusion_matrix(actual, predicted, num_classes=len(class_names)).numpy()
    correct = np.diag(matrix).astype(np.float64)
    precision = np.divide(correct, matrix.sum(axis=0), out=np.zeros_like(correct), where=matrix.sum(axis=0) != 0)
    recall = np.divide(correct, matrix.sum(axis=1), out=np.zeros_like(correct), where=matrix.sum(axis=1) != 0)
    f1 = np.divide(2 * precision * recall, precision + recall, out=np.zeros_like(correct), where=(precision + recall) != 0)
    return {
        "test_accuracy": round(float(np.mean(actual == predicted)), 6),
        "precision_macro": round(float(np.mean(precision)), 6),
        "recall_macro": round(float(np.mean(recall)), 6),
        "f1_score_macro": round(float(np.mean(f1)), 6),
        "test_samples": int(len(actual)),
    }, matrix


def save_confusion_matrix(matrix: np.ndarray, class_names: list[str]) -> None:
    CONFUSION_MATRIX_JSON_PATH.write_text(json.dumps({"class_names": class_names, "matrix": matrix.tolist()}, indent=2), encoding="utf-8")
    pixels = np.uint8(np.clip(matrix / max(int(matrix.max()), 1) * 255, 0, 255))
    Image.fromarray(pixels, mode="L").resize((1000, 1000), Image.Resampling.NEAREST).save(CONFUSION_MATRIX_PATH)


def main() -> None:
    tf.keras.utils.set_random_seed(SEED)
    MODEL_DIR.mkdir(exist_ok=True)
    df = pd.read_csv(CSV_FILE)
    required = {"class id", "filepaths", "labels", "data set"}
    if not required.issubset(df.columns):
        raise RuntimeError(f"CSV is missing columns: {sorted(required - set(df.columns))}")
    class_names = sorted(df["labels"].dropna().unique().tolist())
    class_id_order = df[["class id", "labels"]].drop_duplicates().sort_values("class id")["labels"].tolist()
    if len(class_names) != 100 or class_id_order != class_names:
        raise RuntimeError("The CSV does not provide the expected 100-class label order.")

    train_df, valid_df, test_df = (dataframe_for_split(df, split) for split in ("train", "valid", "test"))
    if any(set(split["labels"]) != set(class_names) for split in (train_df, valid_df, test_df)):
        raise RuntimeError("Every split must contain all 100 sports classes.")
    print(f"Images found — train: {len(train_df)}, valid: {len(valid_df)}, test: {len(test_df)}")

    train_data = make_generator(train_df, class_names, augment=True, shuffle=True)
    train_eval_data = make_generator(train_df, class_names, augment=False, shuffle=False)
    valid_data = make_generator(valid_df, class_names, augment=False, shuffle=False)
    test_data = make_generator(test_df, class_names, augment=False, shuffle=False)
    model = load_supplied_efficientnet()
    if model.input_shape[1:] != (*IMG_SIZE, 3) or model.output_shape[-1] != len(class_names):
        raise RuntimeError(f"Supplied model is incompatible: input {model.input_shape}, output {model.output_shape}.")
    print(f"Loaded supplied EfficientNet with {model.count_params():,} parameters.")

    # The legacy H5 is loaded without its old optimizer state, so compile once
    # before the baseline evaluation and again for each training phase.
    compile_model(model, 1e-3)
    baseline_loss, baseline_accuracy = evaluate(model, valid_data)
    best_accuracy, best_weights = baseline_accuracy, model.get_weights()
    print(f"Baseline validation — accuracy: {baseline_accuracy:.4f}, loss: {baseline_loss:.4f}")
    history: dict[str, object] = {"baseline": {"val_accuracy": baseline_accuracy, "val_loss": baseline_loss}}

    for layer in model.layers:
        layer.trainable = layer.name in {"dense", "dropout", "dense_1"}
    compile_model(model, 1e-3)
    with tempfile.TemporaryDirectory(prefix="sports-checkpoints-") as checkpoint_dir:
        first = model.fit(train_data, validation_data=valid_data, epochs=HEAD_EPOCHS,
                          callbacks=callbacks(Path(checkpoint_dir) / "head_best.keras"), verbose=2)
        history["head_training"] = first.history
        phase_one_loss, phase_one_accuracy = evaluate(model, valid_data)
        if phase_one_accuracy > best_accuracy:
            best_accuracy, best_weights = phase_one_accuracy, model.get_weights()

        for layer in model.layers:
            layer.trainable = False
        for layer in model.layers[-40:]:
            if not isinstance(layer, tf.keras.layers.BatchNormalization):
                layer.trainable = True
        compile_model(model, 1e-5)
        second = model.fit(train_data, validation_data=valid_data, epochs=FINE_TUNE_EPOCHS,
                           callbacks=callbacks(Path(checkpoint_dir) / "fine_tune_best.keras"), verbose=2)
        history["fine_tuning"] = second.history
        phase_two_loss, phase_two_accuracy = evaluate(model, valid_data)
        if phase_two_accuracy > best_accuracy:
            best_accuracy, best_weights = phase_two_accuracy, model.get_weights()

    model.set_weights(best_weights)
    training_loss, training_accuracy = evaluate(model, train_eval_data)
    validation_loss, validation_accuracy = evaluate(model, valid_data)
    measured_test_metrics, matrix = test_metrics(model, test_data, class_names)
    metrics = {
        "training_accuracy": round(training_accuracy, 6), "training_loss": round(training_loss, 6),
        "validation_accuracy": round(validation_accuracy, 6), "validation_loss": round(validation_loss, 6),
        "baseline_validation_accuracy": round(baseline_accuracy, 6),
        "head_validation_accuracy": round(phase_one_accuracy, 6), "head_validation_loss": round(phase_one_loss, 6),
        "fine_tune_validation_accuracy": round(phase_two_accuracy, 6), "fine_tune_validation_loss": round(phase_two_loss, 6),
        **measured_test_metrics,
    }
    model.save(MODEL_PATH)
    CLASS_NAMES_PATH.write_text(json.dumps(class_names, indent=2), encoding="utf-8")
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")
    save_confusion_matrix(matrix, class_names)

    print("\n===================================")
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("===================================")
    print("Model saved at:", MODEL_PATH)
    print(json.dumps(metrics, indent=2))
    print("Confusion matrix saved at:", CONFUSION_MATRIX_JSON_PATH)


if __name__ == "__main__":
    main()
