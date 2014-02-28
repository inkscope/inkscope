Summary: inkscopeprobe
Name: inkscopeprobe
%define inkscope_version 1.0.0
Version: %{inkscope_version} 
Release: 4
License: Apache License
Packager: Eric Mourgaya <eric.mourgaya@arkea.com>
Distribution: Scientific Linux
Vendor: Arkea
AutoReqProv: no
Source0: inkscope-master.zip
BuildRoot: %{_tmppath}/%{name}-root
BuildArch: noarch

Requires: python-pip
%description
install  sysprobe scripts

%package cephprobe
Summary: monitoring  of ceph cluster
Requires: %{name} = %{version}
Requires: lshw
%description cephprobe
install cephprobe scripts

%prep

%build
mkdir -p tmp/
cd tmp/
unzip  ${RPM_SOURCE_DIR}/inkscope-master.zip


%install
mkdir -p %{buildroot}/opt/inkscope/etc
mkdir -p %{buildroot}/opt/inkscope/bin
mkdir -p %{buildroot}/etc/init.d/
cd tmp/inkscope
install -m 600  inkscopeProbe/sysprobe.conf %{buildroot}/opt/inkscope/etc/
install  -m 600 inkscopeProbe/sysprobe.py %{buildroot}/opt/inkscope/bin/
install -m 600  inkscopeProbe/cephprobe.conf %{buildroot}/opt/inkscope/etc/
install  -m 600 inkscopeProbe/cephprobe.py %{buildroot}/opt/inkscope/bin/
install -m 600  inkscopeProbe/daemon.py %{buildroot}/opt/inkscope/bin/
install -m 700  init.d/sysprobe %{buildroot}/etc/init.d/
install -m 700  init.d/cephprobe %{buildroot}/etc/init.d/

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
/opt/inkscope/bin/daemon.py
/opt/inkscope/bin/sysprobe.py
/opt/inkscope/etc/sysprobe.conf
/etc/init.d/sysprobe

%files cephprobe
/opt/inkscope/etc/cephprobe.conf
/opt/inkscope/bin/cephprobe.py
/etc/init.d/cephprobe
