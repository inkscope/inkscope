Summary: inkscopeprobe
Name: inkscopeprobe
%define inkscope_version 1.0.0
Version: %{inkscope_version} 
Release: 0
License: Apache License
Packager: Eric Mourgaya <eric.mourgaya@arkea.com>
Distribution: Red hat
Vendor: mourgaya
AutoReqProv: no
Source0: inkscope-master.zip
BuildRoot: %{_tmppath}/%{name}-root
BuildArch: noarch

Requires: python-pip
Requires: lshw
Summary: install ceph probe and monitor clusters

%description
install  sysprobe scripts

%package cephprobe
Summary: monitoring  of ceph cluster
Requires: %{name} = %{version}
Requires: lshw
%description
install ceph prob only

%package cephrestapi
Summary: allow ceph
Requires: %{name} = %{version}
Requires: lshw
Requires: ceph
%description
install a ceph-rest-api start script



%prep

%build
mkdir -p tmp/
cd tmp/
unzip  ${RPM_SOURCE_DIR}/inkscope-master.zip
pip install psutil
pip install pymongo

%install
mkdir -p %{buildroot}/opt/inkscope/etc
mkdir -p %{buildroot}/opt/inkscope/bin
mkdir -p %{buildroot}/etc/init.d/
mkdir -p %{buildroot}/etc/logrotate.d/
cd tmp/inkscope
install -m 600 inkscopeProbe/sysprobe.py %{buildroot}/opt/inkscope/bin/
install -m 600 inkscope.conf %{buildroot}/opt/inkscope/etc/
install -m 600 inkscopeProbe/cephprobe.py %{buildroot}/opt/inkscope/bin/
install -m 600 inkscopeProbe/daemon.py %{buildroot}/opt/inkscope/bin/
install -m 700 DISTRIBS/confs/init.d/sysprobe %{buildroot}/etc/init.d/
install -m 700 DISTRIBS/confs/init.d/cephprobe %{buildroot}/etc/init.d/
install -m 700 DISTRIBS/confs/init.d/ceph-rest-api %{buildroot}/etc/init.d/
install -m 644 DISTRIBS/confs/logrotate/inkscope  %{buildroot}/etc/logrotate.d/
install -m 644 DISTRIBS/confs/logrotate/cephrestapi  %{buildroot}/etc/logrotate.d/

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
/opt/inkscope/bin/daemon.py
/opt/inkscope/bin/sysprobe.py
/opt/inkscope/etc/inkscope.conf
/etc/init.d/sysprobe
/etc/logrotate.d/inkscope

%files cephprobe
/opt/inkscope/bin/cephprobe.py
/etc/init.d/cephprobe

%files cephrestapi
/etc/logrotate.d/cephrestapi
/etc/init.d/ceph-rest-api
