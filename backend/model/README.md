Put your trained files here:

- model.keras (or .h5 / SavedModel folder; set MODEL_PATH)
- class_names.json  -> ["archery", "..."]  (100 names, in the SAME order as your model's output)

Optional:
- model_metrics.json     -> {"accuracy": 0.95, "precision": 0.95, "recall": 0.95, "f1_score": 0.95}
- confusion_matrix.png
- training_history.json  -> {"accuracy": [...], "val_accuracy": [...], "loss": [...], "val_loss": [...]}  (Keras history.history)
