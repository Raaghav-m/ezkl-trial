import * as ezkl from "@ezkljs/engine";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClamped(filePath: string): Uint8ClampedArray {
  const buffer = fs.readFileSync(filePath);
  return new Uint8ClampedArray(new Uint8Array(buffer).buffer);
}

function saveUint8(filePath: string, data: Uint8Array) {
  fs.writeFileSync(filePath, Buffer.from(data));
}

async function main() {
  console.log("hello");
  ezkl.init_panic_hook();

  try {
    const compiled = loadClamped(path.join(__dirname, "model.compiled"));
    console.log("Model loaded, size:", compiled.length);

    const isValidCircuit = ezkl.compiledCircuitValidation(compiled);
    console.log("Is valid circuit:", isValidCircuit);

    const settings = loadClamped(path.join(__dirname, "settings.json"));
    console.log("Settings loaded, size:", settings.length);

    const isValidSettings = ezkl.settingsValidation(settings);
    console.log("Is valid settings:", isValidSettings);

    const srs = loadClamped(path.join(__dirname, "kzg"));
    console.log("KZG loaded, size:", srs.length);

    const isValidSrs = ezkl.srsValidation(srs);
    console.log("Is valid SRS:", isValidSrs);

    const vk = await ezkl.genVk(compiled, srs, false);
    saveUint8(path.join(__dirname, "vk.key"), vk);
    console.log("Verification key saved to vk.key");

    // Generate proving key
    const pk = await ezkl.genPk(
      new Uint8ClampedArray(vk.buffer),
      compiled,
      srs
    );
    saveUint8(path.join(__dirname, "pk.key"), pk);
    console.log("Proving key saved to pk.key");

    // 🔥 Witness generation step
    const input = loadClamped(path.join(__dirname, "input.json"));
    console.log("Input loaded, size:", input.length);

    // Validate input
    const isValidInput = ezkl.inputValidation(input);
    console.log("Is valid input:", isValidInput);

    if (!isValidInput) {
      throw new Error("Invalid input format");
    }

    const witness = ezkl.genWitness(compiled, input);
    saveUint8(path.join(__dirname, "witness.json"), witness);
    console.log("Witness generated and saved to witness.json");
    console.log("Deserialized Witness:", ezkl.deserialize(witness));

    // Load witness and pk from files
    const loadedWitness = loadClamped(path.join(__dirname, "witness.json"));
    const loadedPk = loadClamped(path.join(__dirname, "pk.key"));
    console.log("Loaded witness and pk from files");

    console.log("Witness size:", loadedWitness.length);
    console.log("PK size:", loadedPk.length);
    console.log("Compiled size:", compiled.length);
    console.log("SRS size:", srs.length);

    // Generate proof using loaded files
    try {
      const proof = await ezkl.prove(loadedWitness, loadedPk, compiled, srs);
      saveUint8(path.join(__dirname, "proof.json"), proof);
      console.log("Proof generated and saved to proof.json");
      console.log("Deserialized Proof:", ezkl.deserialize(proof));

      // Verify proof
      const proofClamped = new Uint8ClampedArray(proof.buffer);
      const vkClamped = new Uint8ClampedArray(vk.buffer);
      const isValidProof = await ezkl.verify(
        proofClamped,
        vkClamped,
        settings,
        srs
      );
      console.log("Proof verification result:", isValidProof);

      if (!isValidProof) {
        throw new Error("Proof verification failed");
      }
    } catch (error) {
      console.error("Error during proof generation or verification:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error details:", error);
  }
}

main();
export {};
