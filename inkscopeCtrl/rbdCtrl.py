__author__ = 'alain.dechorgnat@orange.com'

from flask import request
import subprocess
from StringIO import StringIO
import json
import Log




def list_images():
    output = subprocess.Popen(['ceph', 'osd', 'lspools', '--format=json'], stdout=subprocess.PIPE).communicate()[0]
    pools = json.load(StringIO(output))
    #print 'pools=',pools
    images = []
    for pool in pools:
        #print 'pool=',pool
        output = subprocess.Popen(['rbd', 'ls', '-l', '--pool', pool['poolname'], '--format=json'], stdout=subprocess.PIPE).communicate()[0]
        pool_images=json.load(StringIO(output))
        for pool_image in pool_images:
            image = {"pool": pool['poolname'], "image": pool_image}
            images.append(image)

    return json.dumps(images)


def image_info(pool_name, image_name):
    # get image info
    args = ['rbd',
            'info',
            pool_name+"/"+image_name,
            '--format=json']
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    image=json.load(StringIO(output))
    # add pool name
    image['pool'] = pool_name
    # get snapshots list for this image
    args = ['rbd',
            'snap',
            'ls',
            pool_name+"/"+image_name,
            '--format=json']
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    image['snaps']=json.load(StringIO(output))

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
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)


def modify_image(pool_name, image_name, action):
    if action == 'resize':
        return resize_image(pool_name, image_name)
    elif action == 'flatten':
        return flatten_image(pool_name, image_name)
    elif action == 'purge':
        return purge_image(pool_name, image_name)
    elif action == 'rename':
        return rename_image(pool_name, image_name)
    elif action == 'copy':
        return copy_image(pool_name, image_name)


def resize_image(pool_name, image_name):
    data = json.loads(request.data)
    size = data['size']
    args = ['rbd',
            'resize',
            pool_name+"/"+image_name,
            '--size',
            size]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def delete_image(pool_name, image_name):
    args = ['rbd',
            'rm',
            pool_name+"/"+image_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)


def purge_image(pool_name, image_name):
    args = ['rbd',
            'snap',
            'purge',
            pool_name+"/"+image_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def flatten_image(pool_name, image_name):
    args = ['rbd',
            'flatten',
            pool_name+"/"+image_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def rename_image(pool_name, image_name):
    # TODO
    # args = ['rbd',
    #        'rm',
    #        pool_name+"/"+image_name]
    args = []
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def copy_image(pool_name, image_name):
    copy = json.loads(request.data)
    print copy
    dest_pool_name = copy['pool']
    dest_image_name = copy['image']
    args = ['rbd',
            'copy',
            pool_name+"/"+image_name,
            dest_pool_name+"/"+dest_image_name
            ]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)


#
# Snapshots
#

def create_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd',
            'snap',
            'create',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def delete_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd',
            'snap',
            'rm',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)


def info_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd', 'children', pool_name+"/"+image_name+"@"+snap_name, '--format=json']
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    children =json.load(StringIO(output))

    args = ['rbd', 'ls', '-l', '--pool', pool_name, '--format=json']
    output = subprocess.Popen(args, stdout=subprocess.PIPE).communicate()[0]
    pool_images=json.load(StringIO(output))
    for pool_image in pool_images:
        print pool_image
        if 'image' in pool_image and  pool_image['image'] == image_name :
            print pool_image['image']
            if 'snapshot' in pool_image and  pool_image['snapshot'] == snap_name :
                pool_image['pool'] = pool_name
                pool_image['children'] = children
                return json.dumps(pool_image)
    raise subprocess.CalledProcessError(1, '', 'snap not found')


def action_on_image_snapshot(pool_name, image_name, snap_name, action):
    print "Calling  action_on_image_snapshot() method ", action
    try:
        if action == 'rollback':
            return rollback_image_snapshot(pool_name, image_name, snap_name)
        elif action == 'protect':
            return protect_image_snapshot(pool_name, image_name, snap_name)
        elif action == 'unprotect':
            return unprotect_image_snapshot(pool_name, image_name, snap_name)
        elif action == 'clone':
            return clone_image_snapshot(pool_name, image_name, snap_name)
    except subprocess.CalledProcessError, e:
        raise


def rollback_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd',
            'snap',
            'rollback',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def clone_image_snapshot(pool_name, image_name, snap_name):
    clone = json.loads(request.data)
    print clone
    dest_pool_name = clone['pool']
    dest_image_name = clone['image']
    args = ['rbd',
            'clone',
            pool_name+"/"+image_name+"@"+snap_name,
            dest_pool_name+"/"+dest_image_name
            ]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def protect_image_snapshot(pool_name, image_name, snap_name):
    print "Calling  protect_image_snapshot() method"
    args = ['rbd',
            'snap',
            'protect',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)


def unprotect_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd',
            'snap',
            'unprotect',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)

def children_image_snapshot(pool_name, image_name, snap_name):
    args = ['rbd',
            'children',
            pool_name+"/"+image_name+"@"+snap_name]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, "", error)
    return StringIO(output)
