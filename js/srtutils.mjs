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
        let newEntry = new Timestamp();
        let colonIndex = 0;
        let hours = parseInt(str.substring(0, colonIndex = str.indexOf(':', colonIndex)));
        let mins = parseInt(str.substring(colonIndex+1, colonIndex = str.indexOf(':', colonIndex+1)));
        let secs = parseInt(str.substring(colonIndex+1, colonIndex = str.indexOf(',', colonIndex+1)));
        let milsecs = parseInt(str.substring(colonIndex+1));
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
}

export {SrtEntry, Timestamp, SrtParser};