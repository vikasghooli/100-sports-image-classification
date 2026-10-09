import os
import json
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "data")

CSV_FILE = os.path.join(DATA_DIR, "sports.csv")
TRAIN_DIR = os.path.join(DATA_DIR, "train")
VALID_DIR = os.path.join(DATA_DIR, "valid")

# Settings
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10

print("Reading CSV...")
df = pd.read_csv(CSV_FILE)

print("CSV columns:", df.columns.tolist())
print("Total images:", len(df))

# Use only train and valid images
train_df = df[df["data set"].str.lower() == "train"].copy()
valid_df = df[df["data set"].str.lower().isin(["valid", "validation"])].copy()

print("Training images:", len(train_df))
print("Validation images:", len(valid_df))

# Convert file paths to absolute paths
def get_image_path(path):
    path = str(path).replace("\\", "/")

    # If CSV already contains train/valid path
    if os.path.exists(os.path.join(DATA_DIR, path)):
        return os.path.join(DATA_DIR, path)

    # Try extracting the filename and searching in folders
    filename = os.path.basename(path)

    for folder in ["train", "valid", "test"]:
        possible = os.path.join(DATA_DIR, folder, filename)
        if os.path.exists(possible):
            return possible

    return os.path.join(DATA_DIR, path)

train_df["filepath"] = train_df["filepaths"].apply(get_image_path)
valid_df["filepath"] = valid_df["filepaths"].apply(get_image_path)

# Check files
train_df = train_df[train_df["filepath"].apply(os.path.exists)]
valid_df = valid_df[valid_df["filepath"].apply(os.path.exists)]

print("Valid training files found:", len(train_df))
print("Valid validation files found:", len(valid_df))

# Number of classes
class_names = sorted(df["labels"].dropna().unique().tolist())

print("Number of sports:", len(class_names))

# Save class names
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

with open(os.path.join(MODEL_DIR, "class_names.json"), "w") as f:
    json.dump(class_names, f, indent=4)

# Data generators
train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True
)

valid_datagen = ImageDataGenerator(
    rescale=1.0 / 255
)

train_data = train_datagen.flow_from_dataframe(
    train_df,
    x_col="filepath",
    y_col="labels",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    classes=class_names,
    shuffle=True
)

valid_data = valid_datagen.flow_from_dataframe(
    valid_df,
    x_col="filepath",
    y_col="labels",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    classes=class_names,
    shuffle=False
)

# Model
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(224, 224, 3)),

    tf.keras.layers.Conv2D(32, (3, 3), activation="relu"),
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Conv2D(64, (3, 3), activation="relu"),
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Conv2D(128, (3, 3), activation="relu"),
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Flatten(),

    tf.keras.layers.Dense(256, activation="relu"),
    tf.keras.layers.Dropout(0.5),

    tf.keras.layers.Dense(len(class_names), activation="softmax")
])

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# Train
print("\nStarting training...\n")

history = model.fit(
    train_data,
    validation_data=valid_data,
    epochs=EPOCHS
)

# Save model
MODEL_PATH = os.path.join(MODEL_DIR, "sports_model.keras")

model.save(MODEL_PATH)

print("\n===================================")
print("TRAINING COMPLETED SUCCESSFULLY!")
print("===================================")
print("Model saved at:", MODEL_PATH)
print("Classes:", len(class_names))