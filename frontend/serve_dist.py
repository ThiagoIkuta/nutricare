#!/usr/bin/env python3
import http.server
import os
import socketserver
import sys

PORT = int(os.environ.get("PORT", "8000"))
WEBROOT = os.path.join(os.getcwd(), "dist")

if not os.path.isdir(WEBROOT):
    print("dist folder not found. Run `npm run build` in frontend first.")
    sys.exit(1)

os.chdir(WEBROOT)


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # If the requested path exists as a file, serve it. Otherwise fall back
        # to index.html so the SPA can handle routing.
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path == "/" or not os.path.exists(path.lstrip("/")):
            self.path = "/index.html"
        return http.server.SimpleHTTPRequestHandler.do_GET(self)


with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
    print(f"Serving {WEBROOT} at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
