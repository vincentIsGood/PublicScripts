import shutil
import os
import sys

if len(sys.argv) != 2:
    print("[-] Usage: %s <password>" % sys.argv[0])
    sys.exit(-1)

for file in os.listdir():
    if not os.path.isdir(file):
        continue
    print("[+] Compressing folder '%s'" % file)
    os.system("7za a -tzip -p%s -mem=AES256 %s.zip %s" % (sys.argv[1], file, file))