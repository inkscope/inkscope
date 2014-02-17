#!/bin/sh

 # create  inkscope location conf and scripts

INKPATHETC='/opt/inkscope/etc'
INKPATHBIN='/opt/inkscope/bin'
mkdir -pv $INKPATHETC $INKPATHBIN

mv cephprobe.conf $INKPATHETC
mv cephprobe.py $INKPATHBIN
mv sysprobe.conf $INKPATHETC
mv sysprobe.py  $INKPATHBIN