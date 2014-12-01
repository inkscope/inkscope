#!/bin/sh
# create  inkscope location conf and scripts

INKPATHETC='/opt/inkscope/etc'
INKPATHBIN='/opt/inkscope/bin'

mkdir -pv $INKPATHETC $INKPATHBIN

cp inkscope.conf $INKPATHETC/inkscope-template.conf
cp inkscopeProbe/cephprobe.py $INKPATHBIN
cp inkscopeProbe/sysprobe.py  $INKPATHBIN
cp inkscopeProbe/daemon.py  $INKPATHBIN