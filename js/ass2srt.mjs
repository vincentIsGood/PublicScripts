// Original: 0_JavaScript/0_OwnProject/AssToSrt

///@ts-check
import fs from "fs";
import { SrtEntry, Timestamp } from "./srtutils.mjs";

// [node, ass2srt.js, <file>, <selector>]
if(process.argv.length < 3){
    console.log("Command usage: node ass2srt.js <file> <name_selector_regex>");
    process.exit();
}

const NAME_SELECTOR_STR = process.argv[3].toLowerCase();
const NAMES_SELECTOR = new RegExp(NAME_SELECTOR_STR || ".*", "g");

const raw = await fs.readFileSync(process.argv[2]);
const decoder = new TextDecoder();
let assContent = decoder.decode(raw);

assContent = assContent.substring(assContent.indexOf("[Events]") + "[Events]".length);
const format = assContent.substring(assContent.indexOf("Format: ") + "Format: ".length, assContent.indexOf("\n", "Format: ".length))
    .split(",")
    .map(str => str.trim());

console.log(format);
const START_TIME_INDEX = format.indexOf("Start");
const END_TIME_INDEX = format.indexOf("End");
const NAME_INDEX = format.indexOf("Style");   // original: Name
const TEXT_INDEX = format.indexOf("Text");

class Dialogue{
    startTime;
    endTime;

    /**
     * @type {string}
     */
    name;
    
    /**
     * @type {string}
     */
    text;

    constructor(startTime, endTime, name, text){
        this.startTime = startTime;
        this.endTime = endTime;
        this.name = name;
        this.text = text;
    }

    /**
     * @param {string} line 
     */
    static fromRawAss(line){
        line = line.trim();
        const splited = line.split(",");
        return new Dialogue(splited[START_TIME_INDEX].replace(".", ","), splited[END_TIME_INDEX].replace(".", ","), splited[NAME_INDEX], splited[TEXT_INDEX]);
    }

    toSrt(sequenceNum = 1){
        let srtEntry = new SrtEntry();
        srtEntry.seq = sequenceNum++;
        srtEntry.from = Timestamp.from(this.startTime);
        srtEntry.to = Timestamp.from(this.endTime);
        srtEntry.subtitle = this.text;
        return srtEntry;
    }
}

/**
 * @type {Dialogue[]}
 */
const allDialogue = [];
let lines = assContent.split("\n");
for(let line of lines){
    if(line.startsWith("Dialogue:")){
        allDialogue.push(Dialogue.fromRawAss(line.substring("Dialogue:".length+1).trim()));
    }
}
console.log("Total dialogues: " + allDialogue.length);
console.log("Sample: ", allDialogue[2]);
console.log("Sample: ", allDialogue[3]);

let finalContent = "";
let sequenceNum = 1;
for(let dialogue of allDialogue){
    if(NAMES_SELECTOR.test(dialogue.name.toLowerCase()) || NAME_SELECTOR_STR == dialogue.name.toLowerCase()){
        finalContent += dialogue.toSrt(sequenceNum++).toString();
    }
}

fs.writeFileSync(process.argv[2] + ".srt", finalContent);
