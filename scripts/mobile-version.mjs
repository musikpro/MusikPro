#!/usr/bin/env node
/**
 * Numéros de version des applications Android et iPhone, tenus ensemble.
 *
 *   npm run mobile:version                       affiche l'état (Android, iPhone)
 *   npm run mobile:version -- bump               build +1 (même version affichée)
 *   npm run mobile:version -- bump --version 1.2 nouvelle version affichée + build +1
 *   npm run mobile:version -- check              échoue si Android et iPhone ne sont pas alignés
 *
 * Pourquoi : chaque envoi à Google Play ou à App Store Connect exige un numéro de build strictement supérieur au
 * précédent (Android `versionCode`, iPhone `CURRENT_PROJECT_VERSION`). Le build reste identique sur les deux
 * plateformes ; la version affichée (`versionName` / `MARKETING_VERSION`) aussi.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const gradlePath = resolve(root, "android/app/build.gradle");
const pbxprojPath = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");

const readAndroid = (text) => {
  const code = text.match(/versionCode\s+(\d+)/);
  const name = text.match(/versionName\s+"([^"]+)"/);
  if (!code || !name) throw new Error("versionCode / versionName introuvables dans android/app/build.gradle");
  return { build: Number(code[1]), version: name[1] };
};

const readIos = (text) => {
  const builds = [...text.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => m[1].trim());
  const versions = [...text.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1].trim());
  if (!builds.length || !versions.length) throw new Error("CURRENT_PROJECT_VERSION / MARKETING_VERSION introuvables");
  if (new Set(builds).size > 1 || new Set(versions).size > 1)
    throw new Error("Les configurations Debug et Release de l'app iPhone n'ont pas les mêmes numéros");
  return { build: Number(builds[0]), version: versions[0] };
};

const gradle = readFileSync(gradlePath, "utf8");
const pbxproj = readFileSync(pbxprojPath, "utf8");
const android = readAndroid(gradle);
const ios = readIos(pbxproj);
const aligned = android.build === ios.build && android.version === ios.version;

const [command = "show", ...rest] = process.argv.slice(2);
const versionFlag = rest.indexOf("--version");
const requestedVersion = versionFlag >= 0 ? rest[versionFlag + 1] : undefined;

const print = (label, state) => console.log(`${label.padEnd(8)} version ${state.version}  build ${state.build}`);

if (command === "show") {
  print("Android", android);
  print("iPhone", ios);
  console.log(aligned ? "Alignés." : "Désalignés : le prochain « bump » les remet au même numéro.");
} else if (command === "check") {
  if (!aligned) {
    console.error(
      `Versions désalignées : Android ${android.version} (${android.build}), iPhone ${ios.version} (${ios.build}).`,
    );
    process.exit(1);
  }
  console.log(`Versions alignées : ${android.version} (build ${android.build}).`);
} else if (command === "bump") {
  if (requestedVersion !== undefined && !/^\d+(\.\d+){1,2}$/.test(requestedVersion)) {
    console.error("Version invalide : attendu 1.2 ou 1.2.3.");
    process.exit(1);
  }
  const build = Math.max(android.build, ios.build) + 1;
  const version = requestedVersion ?? android.version;
  writeFileSync(
    gradlePath,
    gradle
      .replace(/versionCode\s+\d+/, `versionCode ${build}`)
      .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`),
  );
  writeFileSync(
    pbxprojPath,
    pbxproj
      .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`)
      .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`),
  );
  console.log(`Android et iPhone : version ${version}, build ${build}.`);
} else {
  console.error("Commande inconnue. Utiliser : show | bump [--version X.Y] | check");
  process.exit(1);
}
