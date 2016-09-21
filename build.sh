#!/bin/bash
#
# Build rpm from HEAD
#
# NOTE: this script doesn't build files un-commited to git

set -e

git archive --format=tar --prefix=inkscope/ HEAD | gzip -9 > inkscope.tar.gz
mkdir -p $HOME/rpmbuild/SOURCES
mv -v inkscope.tar.gz $HOME/rpmbuild/SOURCES/

rpmbuild -bb DISTRIBS/RPMS/inkscope.spec
