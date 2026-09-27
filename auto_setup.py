import pexpect
import sys
import time

child = pexpect.spawn('npm run setup', cwd='/home/prasanth/Prasanth/DevNexus', encoding='utf-8')
child.logfile = sys.stdout

while True:
    time.sleep(0.5)
    index = child.expect([
        r'MongoDB URI',
        r'Database name',
        r'Admin email',
        r'Admin password',
        r'Confirm password',
        r'Re-create .env.local',
        r'Continue without connecting',
        r'regenerate \.env\.local',
        r'regenerate keys',
        pexpect.EOF,
        pexpect.TIMEOUT
    ], timeout=5)
    
    if index == 0:
        child.sendline('mongodb://localhost:27017')
    elif index == 1:
        child.sendline('dev_nexus')
    elif index == 2:
        child.sendline('admin@example.com')
    elif index == 3:
        child.sendline('password123')
    elif index == 4:
        child.sendline('password123')
    elif index in [5, 7, 8]:
        child.sendline('Y') 
    elif index == 6:
        child.sendline('N')
    elif index == 9:
        print("Done!")
        break
    elif index == 10:
        continue
