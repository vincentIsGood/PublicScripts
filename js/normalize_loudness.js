#!/usr/bin/env node

// https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
const { spawnSync, spawn } = require('child_process');
const { TextDecoder } = require("util");
const fs = require("fs");

// shift the args
    console.log(process.argv);
if(process.argv[0].endsWith("node") || process.argv[0].endsWith("node.exe")){
    process.argv[0] = process.argv[1];
    process.argv[1] = process.argv[2];
}

if(process.argv.length < 1 || !fs.existsSync(process.argv[1])){
    console.log("[*] Usage: " + process.argv[0] + " <file>");
    return;
}

const IN_FILE = process.argv[1];

const FILE_NAME_ONLY = process.argv[1].substring(0, process.argv[1].lastIndexOf("."));
const FILE_EXTENSION = process.argv[1].substring(process.argv[1].lastIndexOf(".")+1);
const OUT_FILE = FILE_NAME_ONLY + "_louder." + FILE_EXTENSION;

console.log("[+] Converting " + IN_FILE);

const audioFilterOptions = "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json";

const child = spawnSync(
    "ffmpeg", 
    ["-i", IN_FILE, "-af", audioFilterOptions, "-to", "0:1:0", "-f", "null", "-"]);

let decoder = new TextDecoder();
const stderrContent = decoder.decode(child.stderr);
const jsonStartingIndex = stderrContent.indexOf("]", stderrContent.indexOf("Parsed_loudnorm_0"))+1;

const info = JSON.parse(stderrContent.substring(jsonStartingIndex));
console.log(info);

const finalAudioFilterOptions = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${info.input_i}:measured_TP=${info.input_tp}:measured_LRA=${info.input_lra}:measured_thresh=${info.input_thresh}:offset=${info.target_offset}:linear=true`;

const child2 = spawn(
    "ffmpeg", 
    ["-y", "-i", IN_FILE, "-af", finalAudioFilterOptions, "-write_xing", "0", OUT_FILE]);
child2.stderr.pipe(process.stderr);
// console.log(decoder.decode(child.stderr));