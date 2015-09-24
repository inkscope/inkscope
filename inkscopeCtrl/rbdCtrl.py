__author__ = 'alain.dechorgnat@orange.com'

from flask import request
import subprocess
from StringIO import StringIO
import json


def list_images():
    output = subprocess.Popen(['ceph', 'osd', 'lspools', '--format=json'], stdout=subprocess.PIPE).communicate()[0]
    pools = json.load(StringIO(output))
    #print 'pools=',pools
    images = []
    for pool in pools:
        #print 'pool=',pool
        output = subprocess.Popen(['rbd', 'ls', '--pool', pool['poolname'], '--format=json'], stdout=subprocess.PIPE).communicate()[0]
        pool_images=json.load(StringIO(output))
        for pool_image in pool_images:
            image = {"pool": pool['poolname'], "image": pool_image}
            images.append(image)

    return json.dumps(images)


def image_info(pool_name, image_name):
    args = ['rbd',
            'info',
            pool_name+"/"+image_name,
            '--format=json']
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    image=json.load(StringIO(output))
    image['pool'] = pool_name
    return json.dumps(image)


def create_image(pool_name, image_name):
    size = request.form['size']
    format = request.form['format']
    args = ['rbd',
            'create',
            pool_name+"/"+image_name,
            '--size',
            size,
            "--image-format",
            format]
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    output_io = StringIO(output)
    return output_io


def modify_image(pool_name, image_name):
    size = request.form['size']
    args = ['rbd',
            'resize',
            pool_name+"/"+image_name,
            '--size',
            size]
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    output_io = StringIO(output)
    return output_io


def delete_image(pool_name, image_name):
    args = ['rbd',
            'rm',
            pool_name+"/"+image_name]
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    output_io = StringIO(output)
    return output_io
