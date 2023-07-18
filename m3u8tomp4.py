#!/usr/bin/env python3
# New Version (Java): https://github.com/vincentIsGood/M3u8Downloader

# Use Python 3
# Created by Vincent Ko
import os
import shutil
import sys
import subprocess
import socket
import urllib.request
from urllib.parse import urlparse
import threading
import time
import glob

####### User options #######
maxthreads = 1
timeout = 60 # ts files shouldn't be too large
outfolder = ""
assemble = False # assemble with ffmpeg
reconstructM3u8File = True # change remote url in m3u8 to downloaded local ts files

# Custom headers
opener = urllib.request.build_opener()
opener.addheaders = [
    ('User-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36')
]
####### End of User Options #######

# Must end in m3u8
#fullurl = "https://127.0.0.1:8080/index-v1-a1.m3u8"
fullurl = ""
totalTsFiles = 0
tsFiles = []
tsFilesBackup = []
tsFilenames = []
failedFiles = []
threads = []
done = False

## Special M3u8 stuff
keyfiles = []

def isAbsoluteUrl(url):
    return url.startswith("https://") or url.startswith("http://")

def getFilenameFromUrl(url):
    parsedurl = urlparse(url)
    if "?" in parsedurl:
        return parsedurl.path[parsedurl.path.rfind("/")+1:parsedurl.path.find("?")]
    return parsedurl.path[parsedurl.path.rfind("/")+1:]

def replaceAttribute(m3u8line, key, value):
    oldval = getAttribute(m3u8line, key)
    return m3u8line.replace(oldval, value)

def getAttribute(m3u8line, key):
    start = m3u8line.find(key + "=")
    if start == -1:
        return None
    
    end = m3u8line.find(",", start)
    result = None
    if end == -1:
        result = m3u8line[start+len(key)+1:]
    result = m3u8line[start+len(key)+1: end]
    if result.startswith("\"") and result.endswith("\""):
        return result[1:len(result)-1]
    return result

def force_exit(reason):
    print(reason)
    sys.exit(1)

# Read command line args
if len(sys.argv) >= 2:
    fullurl = sys.argv[1]
    if len(sys.argv) >= 3:
        outfolder = sys.argv[2]
else:
    force_exit("[-]ERROR: Command Usage %s <url/to/media_m3u8> [<outfolder>]" % (sys.argv[0]))

baseurl = ""
playlistfile = fullurl
if not os.path.isfile(fullurl):
    if not isAbsoluteUrl(fullurl):
        force_exit("[-]ERROR: Url provided '%s' is not a valid remote url / local file" % fullurl)
    baseurl = fullurl[:fullurl.rfind("/")+1] #str.rfind() == str.lastIndexOf()
    playlistfile = getFilenameFromUrl(fullurl)

if outfolder != "" and not outfolder.endswith("/"):
    outfolder += "/"

if outfolder != "" and not os.path.exists(outfolder):
    os.makedirs(outfolder, exist_ok=True)

# Initial settings
# Install headers to the global variable
urllib.request.install_opener(opener)

socket.setdefaulttimeout(timeout)
print("[*]INFO: Setting default timeout to %d sec(s)" % (socket.getdefaulttimeout()))
print("[*]INFO: Download all files to folder: " + outfolder)

def downloadFile(url, filename, returnfile = True):
    outfilename = outfolder + filename
    if os.path.exists(url) and url != filename:
        shutil.copy(url, outfilename)
        return open(url, "r")
    if not os.path.isfile(outfilename):
        print("[*]INFO: Downloading: '%s'" % filename)
        urllib.request.urlretrieve(url, outfilename)
    else:
        print("[*]INFO: '%s' file exists" % outfilename)
    if returnfile:
        return open(outfilename, "r")
    return None

def cleanup():
    # For other alternatives of listing files inside a directory
    # https://stackoverflow.com/questions/3207219/how-do-i-list-all-files-of-a-directory
    #
    # inline for loop: "[x for x in sth]" (return value x)
    # [None for i in range(5)] == [None] * 5
    for f in glob.glob(outfolder + "*.ts"):
        os.remove(f)
    # os.remove(outfolder + playlistfile)

def prepareFiles():
    # Prepare required files (ts filenames, concat list for ffmpeg)
    with downloadFile(fullurl, playlistfile) as m3u8file:
        lines = m3u8file.readlines()
        for line in lines:
            if line.startswith("#EXT-X-KEY"):
                uri = getAttribute(line, "URI")
                print("[*]INFO: Key file found: " + uri)
                if isAbsoluteUrl(uri):
                    downloadFile(uri, getFilenameFromUrl(uri))
                    keyfiles.append(getFilenameFromUrl(uri))
                elif not os.path.exists(uri):
                    downloadFile(baseurl + uri, uri)
                    keyfiles.append(uri)
            if ".ts" in line:
                line = line.strip()
                tsFiles.append(line)
                tsFilesBackup.append(line)
                if not isAbsoluteUrl(line):
                    tsFilenames.append(line)
                else:
                    tsFilenames.append(getFilenameFromUrl(line))
        totalTsFiles = len(tsFiles)
        print("[*]INFO: Total amount of ts files: %d" % totalTsFiles)

# Their job is to download all files
def threadJob():
    tsFilename = None
    while len(tsFiles) > 0:
        try:
            tsFilename = tsFiles[0]
            tsFiles.pop(0)
            finalurl = baseurl + tsFilename
            # We cannot pop tsFilenames. So we gotta process it again
            if isAbsoluteUrl(tsFilename):
                finalurl = tsFilename
                tsFilename = getFilenameFromUrl(tsFilename);
            downloadFile(finalurl, tsFilename, False)
        except Exception as e:
            failedFiles.append(tsFilename)
            if os.path.isfile(tsFilename):
                os.remove(tsFilename)
            print("[-]ERROR: Error received while retrieving file: '%s'; %s" % (tsFilename, str(e)))
            print("[*]INFO: Retrying...")
            try:
                downloadFile(baseurl + tsFilename, tsFilename, False)
                print("[*]INFO: Retry success")
                failedFiles.remove(tsFilename)
            except Exception as e:
                print("[-]ERROR: Failed again. Skipping file '%s'; %s" % (tsFilename, str(e)))
                if os.path.isfile(tsFilename):
                    os.remove(tsFilename)
    return

######## Start Here ########
if playlistfile[-5:] != ".m3u8":
    force_exit("[-]ERROR: '.m3u8' extension is expected in the provided url")

prepareFiles()

# Create threads
for i in range(maxthreads):
    # print("[*]INFO: Creating thread #%d" % (i))
    threads.append(threading.Thread(target=threadJob))

# Start threads
for thread in threads:
    thread.daemon = True # threads stop when main thread end
    print("[*]INFO: Starting thread " + str(thread))
    thread.start()
    time.sleep(1)

# Wait for them
while True:
    allCompleted = True
    for thread in threads:
        if thread.is_alive():
            allCompleted = False
    if allCompleted:
        break 
    time.sleep(1)

if len(failedFiles) > 0:
    force_exit("[*]WARN: Failed to download the following files, you may need to restart the script: %s" % (str(failedFiles)))
print("[*]INFO: Successfully downloaded stream files")

if reconstructM3u8File:
    newLocalPlaylistFile = "local_" + playlistfile
    print("[*]INFO: Constructing a new m3u8 file '%s' with remote ts files replaced with local ts files" % (newLocalPlaylistFile))
    currentTsFileIndex = 0
    currentKeyFileIndex = 0
    with open(outfolder + newLocalPlaylistFile, "w+") as outfile:
        with open(outfolder + playlistfile, "r") as m3u8file:
            lines = m3u8file.readlines()
            for line in lines:
                if line.startswith("#EXT-X-KEY"):
                    outfile.write(replaceAttribute(line, "URI", keyfiles[currentKeyFileIndex]))
                    currentKeyFileIndex += 1
                elif ".ts" in line:
                    outfile.write(tsFilenames[currentTsFileIndex] + "\n")
                    currentTsFileIndex += 1
                else: 
                    outfile.write(line)

if assemble:
    allTsFilename = outfolder + "all.ts"

    # print("[*]INFO: Using ffmpeg to concat everything together (Make sure you have ffmpeg installed)")
    # status = subprocess.call(["ffmpeg", "-f", "concat", "-i", "concatlist.txt", "-c", "copy", "all.ts"])
    print("[*]INFO: Using cat to concat everything together (Make sure you have 'cat' installed)")
    status = os.system("cat " + outfolder + (" " + outfolder).join(tsFilenames) + "> " + allTsFilename)
    if status != 0:
        force_exit("[-]ERROR: 'cat' failed")

    print("[*]INFO: Using ffmpeg to generate an mp4 file called %s" % (playlistfile[:-5] + ".mp4"))
    # This one is suitable for being used on Apple products (iTunes/QuickTime wants yuv420p subsampled formats). But it takes long to encode
    status = subprocess.call(["ffmpeg", "-i", allTsFilename, "-y", "-vf", "format=yuv420p", outfolder + playlistfile[:-5] + ".mp4"])
    # status = subprocess.call(["ffmpeg", "-i", allTsFilename, "-y", "-codec", "copy", outfolder + playlistfile[:-5] + ".mp4"])
    if status != 0:
        force_exit("[-]ERROR: ffmpeg mp4 transmuxing failed")

    print("[*]INFO: Cleaning up")
    cleanup()

print("[+]INFO: Done!")