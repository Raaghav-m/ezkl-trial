ezkl gen-settings --model network.onnx --logrows 11
ezkl compile-circuit --model network.onnx --settings-path settings.json --compiled-circuit model.compiled
ezkl gen-srs --logrows 11 --srs-path kzg