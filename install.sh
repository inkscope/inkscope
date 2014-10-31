#!/bin/sh
# create  inkscope location conf and scripts

INKPATHETC='/opt/inkscope/etc'
INKPATHBIN='/opt/inkscope/bin'

mkdir -pv $INKPATHETC $INKPATHBIN

mv inkscope.conf $INKPATHETC
mv inkscopeProbe/cephprobe.py $INKPATHBIN
mv inkscopeProbe/sysprobe.py  $INKPATHBIN
mv inkscopeProbe/daemon.py  $INKPATHBIN

