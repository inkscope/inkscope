"""Bucket manipulation"""

# original work by Ludvig Ericson (https://github.com/lericson/simples3)

# Copyright (c) 2008, Ludvig Ericson
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#  * Redistributions of source code must retain the above copyright notice, this
#    list of conditions and the following disclaimer.
#
#  * Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

from __future__ import absolute_import

import time
import hmac
import hashlib
import httplib
import urllib2
import datetime
import warnings
from xml.etree import cElementTree as ElementTree
from contextlib import contextmanager
from urllib import quote_plus
from base64 import b64encode
from cgi import escape

from S3.utils import (_amz_canonicalize, metadata_headers, rfc822_fmtdate, _iso8601_dt,
                    aws_md5, aws_urlquote, guess_mimetype, info_dict, expire2datetime)

amazon_s3_domain = "s3.amazonaws.com"  # default for amazon, could be overwritten with base_url parameter
amazon_s3_ns_url = "http://s3.amazonaws.com/doc/2006-03-01/" # do not change

class S3Error(Exception):
    fp = None

    def __init__(self, message, **kwds):
        self.args = message, kwds.copy()
        self.msg, self.extra = self.args

    def __str__(self):
        rv = self.msg
        if self.extra:
            rv += " ("
            rv += ", ".join("%s=%r" % i for i in self.extra.iteritems())
            rv += ")"
        return rv

    @classmethod
    def from_urllib(cls, e, **extra):
        """Try to read the real error from AWS."""
        self = cls("HTTP error", **extra)
        for attr in ("reason", "code", "filename"):
            if attr not in extra and hasattr(e, attr):
                self.extra[attr] = getattr(e, attr)
        self.fp = getattr(e, "fp", None)
        if self.fp:
            # The except clause is to avoid a bug in urllib2 which has it read
            # as in chunked mode, but S3 gives an empty reply.
            try:
                self.data = data = self.fp.read()
            except (httplib.HTTPException, urllib2.URLError), e:
                self.extra["read_error"] = e
            else:
                data = data.decode("utf-8")
                begin, end = data.find("<Message>"), data.find("</Message>")
                if min(begin, end) >= 0:
                    self.msg = data[begin + 9:end]
        return self

    @property
    def code(self): return self.extra.get("code")

class KeyNotFound(S3Error, KeyError):
    @property
    def key(self): return self.extra.get("key")

class StreamHTTPHandler(urllib2.HTTPHandler):
    pass

class StreamHTTPSHandler(urllib2.HTTPSHandler):
    pass

class AnyMethodRequest(urllib2.Request):
    def __init__(self, method, *args, **kwds):
        self.method = method
        urllib2.Request.__init__(self, *args, **kwds)

    def get_method(self):
        return self.method

class S3Request(object):
    urllib_request_cls = AnyMethodRequest

    def __init__(self, bucket=None, key=None, method="GET", headers={},
                 args=None, data=None, subresource=None):
        headers = headers.copy()
        if data and "Content-MD5" not in headers:
            headers["Content-MD5"] = aws_md5(data)
        if "Date" not in headers:
            #headers["x-amz-date"] = rfc822_fmtdate()
            headers["Date"] = rfc822_fmtdate()
        if hasattr(bucket, "name"):
            bucket = bucket.name
        self.bucket = bucket
        self.key = key
        self.method = method
        self.headers = headers
        self.args = args
        self.data = data
        self.subresource = subresource

    def __str__(self):
        return "<S3 %s request bucket %r key %r>" % (self.method, self.bucket, self.key)

    def descriptor(self):
        # The signature descriptor is detalied in the developer's PDF on p. 65.
        lines = (self.method,
                 self.headers.get("Content-MD5", ""),
                 self.headers.get("Content-Type", ""),
                 self.headers.get("Date", ""))
        preamb = "\n".join(str(line) for line in lines) + "\n"
        headers = _amz_canonicalize(self.headers)
        res = self.canonical_resource
        return "".join((preamb, headers, res))

    @property
    def canonical_resource(self):
        res = "/"
        if self.bucket:
            res += aws_urlquote(self.bucket)
        if self.key is not None:
            res += "/%s" % aws_urlquote(self.key)
        if self.subresource:
            res += "?%s" % aws_urlquote(self.subresource)
        return res

    def sign(self, cred):
        "Sign the request with credentials *cred*."
        desc = self.descriptor()
        key = cred.secret_key.encode("utf-8")
        hasher = hmac.new(key, desc.encode("utf-8"), hashlib.sha1)
        sign = b64encode(hasher.digest())
        self.headers["Authorization"] = "AWS %s:%s" % (cred.access_key, sign)
        return sign

    def urllib(self, bucket):
        return self.urllib_request_cls(self.method, self.url(bucket.base_url),
                                       data=self.data, headers=self.headers)

    def url(self, base_url, arg_sep="&"):
        url = base_url + "/"
        if self.key:
            url += aws_urlquote(self.key)
        if self.subresource or self.args:
            ps = []
            if self.subresource:
                ps.append(self.subresource)
            if self.args:
                args = self.args
                if hasattr(args, "iteritems"):
                    args = args.iteritems()
                args = ((quote_plus(k), quote_plus(v)) for (k, v) in args)
                args = arg_sep.join("%s=%s" % i for i in args)
                ps.append(args)
            url += "?" + "&".join(ps)
        # print url
        return url

class S3File(str):
    def __new__(cls, value, **kwds):
        return super(S3File, cls).__new__(cls, value)

    def __init__(self, value, **kwds):
        kwds["data"] = value
        self.kwds = kwds

    def put_into(self, bucket, key):
        return bucket.put(key, **self.kwds)

class S3Listing(object):
    """Representation of a single pageful of S3 bucket listing data."""

    truncated = None

    def __init__(self, etree):
        # TODO Use SAX - processes XML before downloading entire response
        root = etree.getroot()
        expect_tag = self._mktag("ListBucketResult")
        if root.tag != expect_tag:
            raise ValueError("root tag mismatch, wanted %r but got %r"
                             % (expect_tag, root.tag))
        self.etree = etree
        trunc_text = root.findtext(self._mktag("IsTruncated"))
        self.truncated = {"true": True, "false": False}[trunc_text]

    def __iter__(self):
        root = self.etree.getroot()
        for entry in root.findall(self._mktag("Contents")):
            item = self._el2item(entry)
            yield item
            self.next_marker = item[0]

    @classmethod
    def parse(cls, resp):
        return cls(ElementTree.parse(resp))

    def _mktag(self, name):
        return "{%s}%s" % (amazon_s3_ns_url, name)

    def _el2item(self, el):
        get = lambda tag: el.findtext(self._mktag(tag))
        key = get("Key")
        modify = _iso8601_dt(get("LastModified"))
        etag = get("ETag")
        size = int(get("Size"))
        return (key, modify, etag, size)

class S3Bucket(object):
    default_encoding = "utf-8"
    n_retries = 10

    def __init__(self, name=None, access_key=None, secret_key=None,
                 base_url=None, timeout=None, secure=False):
        scheme = ("http", "https")[int(bool(secure))]
        if not base_url:
            base_url = "%s://%s" % (scheme, amazon_s3_domain)
            if name:
                base_url += "/%s" % aws_urlquote(name)
        elif secure is not None:
            if not base_url.startswith(scheme + "://"):
                raise ValueError("secure=%r, url must use %s"
                                 % (secure, scheme))
        self.opener = self.build_opener()
        self.name = name
        self.access_key = access_key
        self.secret_key = secret_key
        self.base_url = base_url
        self.timeout = timeout

    def __str__(self):
        return "<%s %s at %r>" % (self.__class__.__name__, self.name, self.base_url)

    def __repr__(self):
        return self.__class__.__name__ + "(%r, access_key=%r, base_url=%r)" % (
            self.name, self.access_key, self.base_url)

    def __getitem__(self, name): return self.get(name)
    def __delitem__(self, name): return self.delete(name)
    def __setitem__(self, name, value):
        if hasattr(value, "put_into"):
            return value.put_into(self, name)
        else:
            return self.put(name, value)
    def __contains__(self, name):
        try:
            self.info(name)
        except KeyError:
            return False
        else:
            return True

    @contextmanager
    def timeout_disabled(self):
        (prev_timeout, self.timeout) = (self.timeout, None)
        try:
            yield
        finally:
            self.timeout = prev_timeout

    @classmethod
    def build_opener(cls):
        return urllib2.build_opener(StreamHTTPHandler, StreamHTTPSHandler, urllib2.ProxyHandler())

    def request(self, *a, **k):
        k.setdefault("bucket", self.name)
        return S3Request(*a, **k)

    def send(self, s3req):
        s3req.sign(self)
        for retry_no in xrange(self.n_retries):
            req = s3req.urllib(self)
            try:
                if self.timeout:
                    return self.opener.open(req, timeout=self.timeout)
                else:
                    return self.opener.open(req)
            except (urllib2.HTTPError, urllib2.URLError), e:
                # If S3 gives HTTP 500, we should try again.
                ecode = getattr(e, "code", None)
                if ecode == 500:
                    continue
                elif ecode == 404:
                    exc_cls = KeyNotFound
                else:
                    exc_cls = S3Error
                raise exc_cls.from_urllib(e, key=s3req.key)
        else:
            raise RuntimeError("ran out of retries")  # Shouldn't happen.

    def make_request(self, *a, **k):
        warnings.warn(DeprecationWarning("make_request() is deprecated, "
                                         "use request() and send()"))
        return self.send(self.request(*a, **k))

    def get(self, key):
        response = self.send(self.request(key=key))
        response.s3_info = info_dict(dict(response.info()))
        return response

    def info(self, key):
        response = self.send(self.request(method="HEAD", key=key))
        rv = info_dict(dict(response.info()))
        response.close()
        return rv

    def put(self, key, data=None, acl=None, metadata={}, mimetype=None,
            transformer=None, headers={}):
        if isinstance(data, unicode):
            data = data.encode(self.default_encoding)
        headers = headers.copy()
        if mimetype:
            headers["Content-Type"] = str(mimetype)
        elif "Content-Type" not in headers:
            headers["Content-Type"] = guess_mimetype(key)
        headers.update(metadata_headers(metadata))
        if acl: headers["X-AMZ-ACL"] = acl
        if transformer: data = transformer(headers, data)
        if "Content-Length" not in headers:
            headers["Content-Length"] = str(len(data))
        if "Content-MD5" not in headers:
            headers["Content-MD5"] = aws_md5(data)
        s3req = self.request(method="PUT", key=key, data=data, headers=headers)
        self.send(s3req).close()

    def delete(self, *keys):
        n_keys = len(keys)
        if not keys:
            raise TypeError("required one key at least")

        if n_keys == 1:
            # In <=py25, urllib2 raises an exception for HTTP 204, and later
            # does not, so treat errors and non-errors as equals.
            try:
                resp = self.send(self.request(method="DELETE", key=keys[0]))
            except KeyNotFound, e:
                e.fp.close()
                return False
            else:
                return 200 <= resp.code < 300
        else:
            if n_keys > 1000:
                raise ValueError("cannot delete more than 1000 keys at a time")
            fmt = "<Object><Key>%s</Key></Object>"
            body = "".join(fmt % escape(k) for k in keys)
            data = ('<?xml version="1.0" encoding="UTF-8"?><Delete>'
                    "<Quiet>true</Quiet>%s</Delete>") % body
            headers = {"Content-Type": "multipart/form-data"}
            resp = self.send(self.request(method="POST", data=data,
                                          headers=headers, subresource="delete"))
            return 200 <= resp.code < 300

    # TODO Expose the conditional headers, x-amz-copy-source-if-*
    # TODO Add module-level documentation and doctests.
    def copy(self, source, key, acl=None, metadata=None,
             mimetype=None, headers={}):
        """Copy S3 file *source* on format '<bucket>/<key>' to *key*.

        If metadata is not None, replaces the metadata with given metadata,
        otherwise copies the previous metadata.

        Note that *acl* is not copied, but set to *private* by S3 if not given.
        """
        headers = headers.copy()
        headers.update({"Content-Type": mimetype or guess_mimetype(key)})
        headers["X-AMZ-Copy-Source"] = source
        if acl: headers["X-AMZ-ACL"] = acl
        if metadata is not None:
            headers["X-AMZ-Metadata-Directive"] = "REPLACE"
            headers.update(metadata_headers(metadata))
        else:
            headers["X-AMZ-Metadata-Directive"] = "COPY"
        self.send(self.request(method="PUT", key=key, headers=headers)).close()

    def _get_listing(self, args):
        return S3Listing.parse(self.send(self.request(key='', args=args)))

    def listdir(self, prefix=None, marker=None, limit=None, delimiter=None):
        """List bucket contents.

        Yields tuples of (key, modified, etag, size).

        *prefix*, if given, predicates `key.startswith(prefix)`.
        *marker*, if given, predicates `key > marker`, lexicographically.
        *limit*, if given, predicates `len(keys) <= limit`.

        *key* will include the *prefix* if any is given.

        .. note:: This method can make several requests to S3 if the listing is
                  very long.
        """
        m = (("prefix", prefix),
             ("marker", marker),
             ("max-keys", limit),
             ("delimiter", delimiter))
        args = dict((str(k), str(v)) for (k, v) in m if v is not None)

        listing = self._get_listing(args)
        while listing:
            for item in listing:
                yield item

            if listing.truncated:
                args["marker"] = listing.next_marker
                listing = self._get_listing(args)
            else:
                break

    def make_url(self, key, args=None, arg_sep=";"):
        s3req = self.request(key=key, args=args)
        return s3req.url(self.base_url, arg_sep=arg_sep)

    def make_url_authed(self, key, expire=datetime.timedelta(minutes=5)):
        """Produce an authenticated URL for S3 object *key*.

        *expire* is a delta or a datetime on which the authenticated URL
        expires. It defaults to five minutes, and accepts a timedelta, an
        integer delta in seconds, or a datetime.

        To generate an unauthenticated URL for a key, see `B.make_url`.
        """
        # NOTE There is a usecase for having a headers argument to this
        # function - Amazon S3 will validate the X-AMZ-* headers of the GET
        # request, and so for the browser to send such a header, it would have
        # to be listed in the signature description.
        expire = expire2datetime(expire)
        expire = time.mktime(expire.timetuple()[:9])
        expire = str(int(expire))
        s3req = self.request(key=key, headers={"Date": expire})
        sign = s3req.sign(self)
        s3req.args = (("AWSAccessKeyId", self.access_key),
                      ("Expires", expire),
                      ("Signature", sign))
        return s3req.url(self.base_url, arg_sep="&")

    def url_for(self, key, authenticated=False,
                expire=datetime.timedelta(minutes=5)):
        msg = "use %s instead of url_for(authenticated=%r)"
        dep_cls = DeprecationWarning
        if authenticated:
            warnings.warn(dep_cls(msg % ("make_url_authed", True)))
            return self.make_url_authed(key, expire=expire)
        else:
            warnings.warn(dep_cls(msg % ("make_url", False)))
            return self.make_url(key)

    def put_bucket(self, config_xml=None, acl=None):
        if config_xml:
            if isinstance(config_xml, unicode):
                config_xml = config_xml.encode("utf-8")
            headers = {"Content-Length": len(config_xml),
                       "Content-Type": "text/xml"}
        else:
            headers = {"Content-Length": "0"}
        if acl:
            headers["X-AMZ-ACL"] = acl
        resp = self.send(self.request(method="PUT", key='',
                                      data=config_xml, headers=headers))
        resp.close()
        return resp.code == 200

    def delete_bucket(self):
        return self.delete(None)

class ReadOnlyS3Bucket(S3Bucket):
    """Read-only S3 bucket.

    Mostly useful for situations where urllib2 isn't available (e.g. Google App
    Engine), but you still want the utility functions (like generating
    authenticated URLs, and making upload HTML forms.)
    """

    def build_opener(self):
        return None
