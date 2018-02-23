__author__ = 'Alain Dechorgnat'

import subprocess
import re


def get_ceph_version():
    try:
        args = ['ceph',
                '--version']
        p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        output, error = p.communicate()
        if p.returncode != 0:
            return "not found"
        ceph_version = re.search('[0-9]*\.[0-9]*\.[0-9]*', output)
        if ceph_version:
            return ceph_version.group(0)
        return "not found"
    except:
        return '0.0.0 (could not be found on inkscope server - Please consider to install Ceph on it)'


def get_ceph_version_name(major, minor):
    if major == '14':
        return 'Nautilus'
    if major == '13':
        return 'Mimic'
    if major == '12':
        return 'Luminous'
    if major == '11':
        return 'Kraken'
    if major == '10':
        return 'Jewel'
    if major == '9':
        return 'Infernalis'
    if major == '0':
        minor = int(minor)
        if minor == 94:
            return 'Hammer'
        if minor > 87:
            return 'Hammer (pre-version)'
        if minor == 87:
            return 'Giant'
        if minor > 80:
            return 'Giant (pre-version)'
        if minor == 80:
            return 'Firefly'
        if minor > 72:
            return 'Firefly (pre-version)'
        if minor == 72:
            return 'Emperor'
        if minor > 67:
            return 'Emperor (pre-version)'
        if minor == 67:
            return 'Dumpling'
        if minor == 0:
            return 'Unavailable'
        return 'Really too old'

version = get_ceph_version()
major, minor, revision = version.split(".")
name = get_ceph_version_name(major, minor)
