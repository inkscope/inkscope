__author__ = 'alain.dechorgnat@orange.com'

import subprocess
from StringIO import StringIO


def list_images():
    output = subprocess.Popen(['rbd', 'ls', '--format=json'], stdout=subprocess.PIPE).communicate()[0]
    output_io = StringIO(output)
    return output_io


def image_info(image_name):
    args = ['rbd',
            'info',
            '--image',
            image_name,
            '--format=json']
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    output_io = StringIO(output)
    return output_io
