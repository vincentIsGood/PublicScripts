/**
 * Original Source: ChromeExternsion/SeekablePictureInPicture
 */
// SRT utils
class Timestamp{
    /**
     * @type {number}
     */
    totalMs;
    originalMs = 0;

    hours(){
        return Math.floor(this.totalMs / 60 / 60 / 1000);
    }

    mins(){
        return Math.floor(this.totalMs / 60 / 1000) - this.hours()*60;
    }

    secs(){
        return Math.floor(this.totalMs / 1000) - this.mins()*60 - this.hours()*60*60;
    }

    milsecs(){
        return Math.floor(this.totalMs) - Math.floor(this.totalMs / 1000) * 1000;
    }

    total(){
        return this.totalMs;
    }

    offset(delta){
        this.totalMs += delta;
    }

    reset(){
        this.totalMs = this.originalMs;
    }
    
    /**
     * @param {string} str string of format "HH:mm:ss,millisec" 
     */
    static from(str){
        let numColons = str.split(":").length-1;

        let newEntry = new Timestamp();
        const result = str.match(/(..)?:?(..):(..),(...)/);
        if(!result) throw new Error("Bad timestamp format");
        let hours = parseInt(result[1] ?? 0);
        let mins = parseInt(result[2] ?? 0);
        let secs = parseInt(result[3] ?? 0);
        let milsecs = parseInt(result[4] ?? 0);
        newEntry.totalMs = hours * 60 * 60 * 1000 + mins * 60 * 1000 + secs * 1000 + milsecs;
        newEntry.originalMs = newEntry.totalMs;
        return newEntry;
    }

    toString(){
        return `${this.hours().toString().padStart(2, "0")}:${this.mins().toString().padStart(2, "0")}:${this.secs().toString().padStart(2, "0")},${this.milsecs().toString().padStart(3, "0")}`;
    }
}

class SrtEntry{
    /**
     * @type {number}
     */
    seq;
    /**
     * @type {Timestamp}
     */
    from;
    /**
     * @type {Timestamp}
     */
    to;
    /**
     * @type {string}
     */
    subtitle;

    offset(delta){
        this.from.offset(delta);
        this.to.offset(delta);
    }

    reset(){
        this.from.reset();
        this.to.reset();
    }

    /**
     * Takes 1 entry.
     * 
     * Takes format:
     * ```srt
     * seq
     * from --> to
     * subtitle
     * ```
     * @param {string[]} lines 
     */
    static from(lines){
        let newEntry = new SrtEntry();
        newEntry.seq = parseInt(lines[0]);

        let fromTo = lines[1].split("-->");
        newEntry.from = Timestamp.from(fromTo[0].trim());
        newEntry.to = Timestamp.from(fromTo[1].trim());
        
        let subtitle = "";
        for(let i = 2; i < lines.length; i++){
            subtitle += lines[i].trim() + " ";
        }
        newEntry.subtitle = subtitle.trim();
        return newEntry;
    }

    /**
     * Takes 1 entry.
     * 
     * Takes format:
     * ```vtt
     * 00:34.670 --> 00:36.290
     * <b>subtitle 1</b>
     * ```
     * @param {string[]} lines 
     * @param {number} seq 
     */
    static fromVtt(lines, seq = 1){
        let newEntry = new SrtEntry();
        newEntry.seq = seq;

        lines[0] = lines[0].replaceAll(".", ",");
        let fromTo = lines[0].split("-->");
        newEntry.from = Timestamp.from(fromTo[0].trim());
        newEntry.to = Timestamp.from(fromTo[1].trim());
        
        let subtitle = "";
        for(let i = 1; i < lines.length; i++){
            subtitle += lines[i].trim() + " ";
        }
        newEntry.subtitle = subtitle.trim();
        return newEntry;
    }

    toString(){
        return `${this.seq}
${this.from.toString()} --> ${this.to.toString()}
${this.subtitle}\n\n`;
    }
}

class SrtParser{
    /**
     * @param {string} fileContent
     * @returns {SrtEntry[]} 
     */
    static parse(fileContent){
        let result = [];
        let oneEntry = [];
        for(let line of fileContent.split("\n")){
            if(line.trim() === ""){
                if(oneEntry.length < 3) 
                    continue;
                result.push(SrtEntry.from(oneEntry));
                oneEntry = [];
                continue;
            }
            oneEntry.push(line);
        }
        if(oneEntry.length > 0)
            result.push(SrtEntry.from(oneEntry));
        return result;
    }

    /**
     * Takes format:
     * ```vtt
     * WEBVTT
     * 
     * 00:34.670 --> 00:36.290
     * <b>subtitle 1</b>

     * 00:36.290 --> 00:39.330
     * <b>subtitle 
     * 2</b>
     * ```
     * @param {string} fileContent 
     */
    static fromVtt(fileContent){
        let result = [];
        let oneEntry = [];
        let seq = 1;
        for(let line of fileContent.split("\n")){
            if(line.trim() === "WEBVTT") continue;
            if(line.trim() === ""){
                if(oneEntry.length < 2) 
                    continue;
                result.push(SrtEntry.fromVtt(oneEntry, seq++));
                oneEntry = [];
                continue;
            }
            oneEntry.push(line);
        }
        if(oneEntry.length > 0)
            result.push(SrtEntry.fromVtt(oneEntry, seq++));
        return result;
    }
}

export {SrtEntry, Timestamp, SrtParser};