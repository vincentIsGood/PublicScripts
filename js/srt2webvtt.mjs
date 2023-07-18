// https://www.3playmedia.com/blog/how-to-create-a-webvtt-file/#:~:text=A%20%E2%80%9CWeb%20Video%20Text%20Track,support%20text%20tracks%20in%20HTML5.
class WebVTT{
    /**
     * @param {string} srtcontent 
     * @returns {string} webvtt in string
     */
    static fromSrt(srtcontent){
        let finalString = "WEBVTT\n\n";
        for(let line of srtcontent.split("\n")){
            if(line.includes("-->")){
                finalString += line.replace(",", ".").replace(",", ".") + "\n";
            }else
                finalString += line + "\n";
        }
        return finalString;
    }
}
/*Test

1
01:20:45,138 --> 01:20:48,164
You'd say anything now
to get what you want.

*/