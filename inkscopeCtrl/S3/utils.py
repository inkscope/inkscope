"""Misc. S3-related utilities."""

import time
import hashlib
import datetime
import mimetypes
from base64 import b64encode
from urllib import quote
from calendar import timegm

def _amz_canonicalize(headers):
    r"""Canonicalize AMZ headers in that certain AWS way.

    >>> _amz_canonicalize({"x-amz-test": "test"})
    'x-amz-test:test\n'
    >>> _amz_canonicalize({"x-amz-first": "test",
    ...                    "x-amz-second": "hello"})
    'x-amz-first:test\nx-amz-second:hello\n'
    >>> _amz_canonicalize({})
    ''
    """
    rv = {}
    for header, value in headers.iteritems():
        header = header.lower()
        if header.startswith("x-amz-"):
            rv.setdefault(header, []).append(value)
    parts = []
    for key in sorted(rv):
        parts.append("%s:%s\n" % (key, ",".join(rv[key])))
    return "".join(parts)

def metadata_headers(metadata):
    return dict(("X-AMZ-Meta-" + h, v) for h, v in metadata.iteritems())

def headers_metadata(headers):
    return dict((h[11:], v) for h, v in headers.iteritems()
                            if h.lower().startswith("x-amz-meta-"))

iso8601_fmt = '%Y-%m-%dT%H:%M:%S.000Z'

def _iso8601_dt(v): return datetime.datetime.strptime(v, iso8601_fmt)
def rfc822_fmtdate(t=None):
    from email.utils import formatdate
    if t is None:
        t = datetime.datetime.utcnow()
    return formatdate(timegm(t.timetuple()), usegmt=False)
def rfc822_parsedate(v):
    from email.utils import parsedate
    return datetime.datetime.fromtimestamp(time.mktime(parsedate(v)))

def expire2datetime(expire, base=None):
    """Force *expire* into a datetime relative to *base*.

    If expire is a relatively small integer, it is assumed to be a delta in
    seconds. This is possible for deltas up to 10 years.

    If expire is a delta, it is added to *base* to yield the expire date.

    If base isn't given, the current time is assumed.

    >>> base = datetime.datetime(1990, 1, 31, 1, 2, 3)
    >>> expire2datetime(base) == base
    True
    >>> expire2datetime(3600 * 24, base=base) - base
    datetime.timedelta(1)
    >>> import time
    >>> expire2datetime(time.mktime(base.timetuple())) == base
    True
    """
    if hasattr(expire, "timetuple"):
        return expire
    if base is None:
        base = datetime.datetime.now()
    # *expire* is not a datetime object; try interpreting it
    # as a timedelta, a UNIX timestamp or offsets in seconds.
    try:
        return base + expire
    except TypeError:
        # Since the operands could not be added, reinterpret
        # *expire* as a UNIX timestamp or a delta in seconds.
        # This is rather arbitrary: 10 years are allowed.
        unix_eighties = 315529200
        if expire < unix_eighties:
            return base + datetime.timedelta(seconds=expire)
        else:
            return datetime.datetime.fromtimestamp(expire)

def aws_md5(data):
    """Make an AWS-style MD5 hash (digest in base64)."""
    hasher = hashlib.new("md5")
    if hasattr(data, "read"):
        data.seek(0)
        while True:
            chunk = data.read(8192)
            if not chunk:
                break
            hasher.update(chunk)
        data.seek(0)
    else:
        hasher.update(data)
    return b64encode(hasher.digest()).decode("ascii")

def aws_urlquote(value):
    r"""AWS-style quote a URL part.

    >>> aws_urlquote("/bucket/a key")
    '/bucket/a%20key'
    """
    if isinstance(value, unicode):
        value = value.encode("utf-8")
    return quote(value, "/")

def guess_mimetype(fn, default="application/octet-stream"):
    """Guess a mimetype from filename *fn*.

    >>> guess_mimetype("foo.txt")
    'text/plain'
    >>> guess_mimetype("foo")
    'application/octet-stream'
    """
    if "." not in fn:
        return default
    bfn, ext = fn.lower().rsplit(".", 1)
    if ext == "jpg": ext = "jpeg"
    return mimetypes.guess_type(bfn + "." + ext)[0] or default

def info_dict(headers):
    rv = {"headers": headers, "metadata": headers_metadata(headers)}
    if "content-length" in headers:
        rv["size"] = int(headers["content-length"])
    if "content-type" in headers:
        rv["mimetype"] = headers["content-type"]
    if "date" in headers:
        rv["date"] = rfc822_parsedate(headers["date"])
    if "last-modified" in headers:
        rv["modify"] = rfc822_parsedate(headers["last-modified"])
    return rv

def name(o):
    """Find the name of *o*.

    Functions:
    >>> name(name)
    'simples3.utils.name'
    >>> def my_fun(): pass
    >>> name(my_fun)
    'simples3.utils.my_fun'

    Classes:
    >>> class MyKlass(object): pass
    >>> name(MyKlass)
    'simples3.utils.MyKlass'

    Instances:
    >>> name(MyKlass())
    'simples3.utils.MyKlass'

    Types:
    >>> name(str), name(object), name(int)
    ('str', 'object', 'int')

    Type instances:
    >>> name("Hello"), name(True), name(None), name(Ellipsis)
    ('str', 'bool', 'NoneType', 'ellipsis')
    """
    if hasattr(o, "__name__"):
        rv = o.__name__
        modname = getattr(o, "__module__", None)
        # This work-around because Python does it itself,
        # see typeobject.c, type_repr.
        # Note that Python only checks for __builtin__.
        if modname not in (None, "", "__builtin__", "builtins"):
            rv = o.__module__ + "." + rv
    else:
        for o in getattr(o, "__mro__", o.__class__.__mro__):
            rv = name(o)
            # If there is no name for the this baseclass, this ensures we check
            # the next rather than say the object has no name (i.e., return
            # None)
            if rv is not None:
                break
    return rv
