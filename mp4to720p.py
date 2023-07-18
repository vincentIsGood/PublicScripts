import sys
import glob
import os
import subprocess
import re


def force_exit(reason):
    print(reason)
    sys.exit(-1)

targetFiles = []
filesWithError = []
for file in glob.glob("*.mp4"):
    output = subprocess.run("ffmpeg -i " + file, shell=True, check=False, capture_output=True)
    regexResult = re.search("Stream #(.*): Video:(.*), (.*), (.*) \[(.*)\], (.*)", output.stderr.decode())
    try:
        if int(regexResult.group(4).split("x")[1]) > 720:
            targetFiles.append(file)
    except IndexError as e:
        filesWithError.append(file)
        force_exit("[-] Cannot find dimension for video " + file)

print("[+] Files to be converted: %s" % targetFiles)

filesConverted = []

# https://stackoverflow.com/questions/33496416/kill-subprocess-call-after-keyboardinterrupt
# subprocess.call() is just Popen().wait()
for file in targetFiles:
    print("[*] Executing: ffmpeg -i %s -y -vf scale=-2:720 %s" % (file, file[0:-4] + "_720p.mp4"))
    proc = subprocess.Popen("ffmpeg -i %s -y -vf scale=-2:720 %s" % (file, file[0:-4] + "_720p.mp4"), shell=True)
    try:
        proc.wait()
        if proc.returncode == 0:
            filesConverted.append(file)
        else:
            print("[-] Return code is not 0 for file: " + file)
            filesWithError.append(file)
    except KeyboardInterrupt as e:
        proc.terminate()
        force_exit("[-] CTRL-C detected, stopping")

if len(targetFiles) == len(filesConverted):
    print("[+] Conversion complete")
else:
    print("[-] Some files cannot be converted: %s" % filesWithError)